import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import {
  DeploymentRequest,
  ParsedDeploymentIntent,
  ProjectType,
  InfrastructureRequirements,
  CostEstimate,
  Environment,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

export class AIPromptInterpreter {
  private bedrockClient: BedrockRuntimeClient;
  private readonly modelId: string;

  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    // Using Claude 3 Sonnet as the default model
    this.modelId =
      process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
  }

  /**
   * Parse a natural language deployment request into structured infrastructure requirements
   */
  async parseDeploymentIntent(
    request: DeploymentRequest
  ): Promise<ParsedDeploymentIntent> {
    logger.info(`Parsing deployment intent for request: ${request.id}`);

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(request);

    try {
      const response = await this.invokeClaudeModel(
        systemPrompt,
        userPrompt,
        true
      );

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI failed to return valid JSON structure');
      }

      const parsedIntent = JSON.parse(jsonMatch[0]) as ParsedDeploymentIntent;

      // Enhance with cost estimation
      parsedIntent.estimatedCost = await this.estimateCosts(parsedIntent);

      logger.info(
        `Successfully parsed deployment intent: ${JSON.stringify(parsedIntent, null, 2)}`
      );
      return parsedIntent;
    } catch (error) {
      logger.error(`Failed to parse deployment intent: ${error}`);
      throw new Error(
        `AI interpretation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate deployment recommendations based on project type and requirements
   */
  async generateRecommendations(
    intent: ParsedDeploymentIntent
  ): Promise<string[]> {
    const prompt = `
    Based on the following deployment configuration, provide 3-5 specific recommendations 
    for optimization, security, and best practices:
    
    Project Type: ${intent.projectType}
    Infrastructure: ${JSON.stringify(intent.infrastructure, null, 2)}
    Estimated Cost: $${intent.estimatedCost.monthly}/month
    
    Focus on:
    1. Cost optimization opportunities
    2. Security improvements
    3. Performance enhancements
    4. Scalability considerations
    5. Best practices for this type of deployment
    
    Please provide your response as a numbered list of recommendations.
    `;

    try {
      const response = await this.invokeClaudeModel(
        'You are an expert AWS cloud architect.',
        prompt,
        false
      );

      const recommendations = response
        .split('\n')
        .filter((line: string) => line.trim().length > 0)
        .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
        .filter((line: string) => line.length > 10); // Filter out short or empty lines

      return recommendations.length > 0
        ? recommendations
        : ['Unable to generate recommendations at this time.'];
    } catch (error) {
      logger.error(`Failed to generate recommendations: ${error}`);
      return ['Unable to generate recommendations at this time.'];
    }
  }

  /**
   * Invoke Claude model through AWS Bedrock
   */
  private async invokeClaudeModel(
    systemPrompt: string,
    userPrompt: string,
    requireJson: boolean = false
  ): Promise<string> {
    const messages = [
      {
        role: 'user',
        content:
          systemPrompt +
          '\n\n' +
          userPrompt +
          (requireJson
            ? '\n\nPlease respond with valid JSON only, no additional text.'
            : ''),
      },
    ];

    const body = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4000,
      temperature: 0.1,
      messages,
    };

    try {
      const command = new InvokeModelCommand({
        modelId: this.modelId,
        body: JSON.stringify(body),
        contentType: 'application/json',
        accept: 'application/json',
      });

      const response = await this.bedrockClient.send(command);

      if (!response.body) {
        throw new Error('Empty response from Bedrock');
      }

      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      if (
        !responseBody.content ||
        !responseBody.content[0] ||
        !responseBody.content[0].text
      ) {
        throw new Error('Invalid response format from Bedrock');
      }

      return responseBody.content[0].text;
    } catch (error) {
      logger.error('Failed to invoke Bedrock model:', error);
      throw new Error(
        `Bedrock invocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private buildSystemPrompt(): string {
    return `
You are an expert AWS cloud architect and DevOps engineer specializing in automated infrastructure deployment. 
Your task is to interpret natural language deployment requests and convert them into structured infrastructure requirements.

Key principles:
1. Always choose the most cost-effective solution that meets requirements
2. Prioritize serverless and managed services when possible
3. Implement security best practices by default
4. Consider scalability and maintainability
5. Provide realistic cost estimates

You must respond with a valid JSON object that matches this exact structure:

{
  "projectType": "static-website" | "spa" | "api" | "full-stack" | "microservice",
  "infrastructure": {
    "compute": {
      "type": "static" | "serverless" | "container" | "vm",
      "runtime": "string (optional)",
      "memory": "number (optional)",
      "cpu": "number (optional)",
      "autoscaling": "boolean"
    },
    "storage": {
      "type": "s3" | "efs" | "ebs",
      "size": "number (in GB)",
      "backup": "boolean",
      "encryption": "boolean"
    },
    "networking": {
      "vpc": "boolean",
      "publicAccess": "boolean",
      "loadBalancer": "boolean",
      "apiGateway": "boolean"
    },
    "database": {
      "type": "dynamodb" | "rds" | "documentdb" | null,
      "size": "small" | "medium" | "large" (if database is used),
      "backup": "boolean" (if database is used),
      "encryption": "boolean" (if database is used)
    },
    "cdn": "boolean",
    "ssl": "boolean",
    "monitoring": "boolean"
  },
  "domain": {
    "domain": "string or null",
    "subdomain": "string or null",
    "ssl": "boolean",
    "cdn": "boolean"
  },
  "environment": {
    "name": "string",
    "region": "string (AWS region)",
    "stage": "dev" | "staging" | "prod",
    "variables": {}
  },
  "features": ["array of strings describing required features"]
}

Respond with only the JSON object, no additional text or explanation.
    `.trim();
  }

  private buildUserPrompt(request: DeploymentRequest): string {
    let prompt = `Deployment Request: "${request.prompt}"`;

    if (request.projectName) {
      prompt += `\nProject Name: ${request.projectName}`;
    }

    if (request.customDomain) {
      prompt += `\nCustom Domain: ${request.customDomain}`;
    }

    if (request.files && request.files.length > 0) {
      prompt += `\nFiles to deploy: ${request.files.length} files`;
      prompt += `\nFile types: ${request.files.map((f) => f.contentType).join(', ')}`;
    }

    if (request.environment) {
      prompt += `\nTarget Environment: ${request.environment}`;
    }

    prompt += `\n\nPlease analyze this request and provide a complete infrastructure configuration.`;

    return prompt;
  }

  private async estimateCosts(
    intent: ParsedDeploymentIntent
  ): Promise<CostEstimate> {
    // This is a simplified cost estimation. In production, you'd use AWS Pricing API
    let monthlyCost = 0;
    const breakdown: any[] = [];

    // S3 Storage (first 50GB free, then $0.023/GB)
    if (intent.infrastructure.storage.type === 's3') {
      const storageGB = intent.infrastructure.storage.size;
      const storageCost = Math.max(0, (storageGB - 50) * 0.023);
      monthlyCost += storageCost;
      breakdown.push({
        service: 'S3 Storage',
        cost: storageCost,
        unit: 'GB',
        description: `${storageGB}GB storage`,
      });
    }

    // CloudFront CDN
    if (intent.infrastructure.cdn) {
      const cdnCost = 15; // Estimated $15/month for typical usage
      monthlyCost += cdnCost;
      breakdown.push({
        service: 'CloudFront CDN',
        cost: cdnCost,
        unit: 'monthly',
        description: 'Content delivery network',
      });
    }

    // Lambda (if serverless)
    if (intent.infrastructure.compute.type === 'serverless') {
      const lambdaCost = 5; // Estimated $5/month for typical usage
      monthlyCost += lambdaCost;
      breakdown.push({
        service: 'AWS Lambda',
        cost: lambdaCost,
        unit: 'monthly',
        description: 'Serverless compute',
      });
    }

    // ECS (if container)
    if (intent.infrastructure.compute.type === 'container') {
      const ecsCost = 25; // Estimated $25/month for small instance
      monthlyCost += ecsCost;
      breakdown.push({
        service: 'ECS Fargate',
        cost: ecsCost,
        unit: 'monthly',
        description: 'Container hosting',
      });
    }

    // Database costs
    if (intent.infrastructure.database) {
      let dbCost = 0;
      if (intent.infrastructure.database.type === 'dynamodb') {
        dbCost = 10; // Pay-per-use, estimated $10/month
      } else if (intent.infrastructure.database.type === 'rds') {
        dbCost =
          intent.infrastructure.database.size === 'small'
            ? 20
            : intent.infrastructure.database.size === 'medium'
              ? 50
              : 100;
      }
      monthlyCost += dbCost;
      breakdown.push({
        service: intent.infrastructure.database.type.toUpperCase(),
        cost: dbCost,
        unit: 'monthly',
        description: `${intent.infrastructure.database.size} database`,
      });
    }

    // SSL Certificate (free with ACM)
    if (intent.infrastructure.ssl) {
      breakdown.push({
        service: 'SSL Certificate',
        cost: 0,
        unit: 'monthly',
        description: 'AWS Certificate Manager (free)',
      });
    }

    return {
      monthly: Math.round(monthlyCost * 100) / 100,
      yearly: Math.round(monthlyCost * 12 * 100) / 100,
      breakdown,
      currency: 'USD',
    };
  }

  /**
   * Validate AI-generated configuration for safety and feasibility
   */
  private validateConfiguration(intent: ParsedDeploymentIntent): boolean {
    // Add validation logic here
    // Check for reasonable resource sizes, valid configurations, etc.
    return true;
  }
}
