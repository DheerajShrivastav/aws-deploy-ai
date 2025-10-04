import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { logger } from '../utils/logger.js';

interface RepositoryAnalysis {
  language: string;
  framework: string;
  packageManager: string;
  hasDatabase: boolean;
  hasEnvVariables: boolean;
  buildCommand: string;
  startCommand: string;
  port: number;
  dependencies: string[];
  devDependencies: string[];
  staticAssets: boolean;
  hasDockerfile: boolean;
}

interface DeploymentPlan {
  architecture: string;
  services: {
    name: string;
    type: string;
    purpose: string;
    estimated_cost: string;
  }[];
  steps: {
    step: number;
    action: string;
    description: string;
    resources: string[];
  }[];
  estimated_monthly_cost: string;
  deployment_time: string;
  requirements: string[];
  recommendations: string[];
}

interface RepositoryData {
  name: string;
  language: string;
  files: { [key: string]: string };
  packageJson?: Record<string, unknown>;
  readme?: string;
}

export class BedrockAIService {
  private client: BedrockRuntimeClient | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      // Check if we have a Bedrock API key or AWS credentials
      const apiKey = process.env.AWS_BEDROCK_API_KEY;

      if (apiKey && apiKey !== 'your_bedrock_api_key_here') {
        logger.info('🔑 AWS Bedrock API key found');
        // For direct API key, we'll handle it in the call method
      } else {
        // Try to initialize with standard AWS credentials
        this.client = new BedrockRuntimeClient({
          region: process.env.AWS_REGION || 'us-east-1',
        });
        logger.info('🔑 AWS Bedrock client initialized with AWS credentials');
      }
    } catch (error) {
      logger.warn('⚠️ Failed to initialize Bedrock client', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async analyzeRepository(
    repoData: RepositoryData,
    userPrompt: string
  ): Promise<{ analysis: RepositoryAnalysis; deploymentPlan: DeploymentPlan }> {
    logger.info('🤖 Starting Bedrock AI analysis');

    const prompt = this.buildAnalysisPrompt(repoData, userPrompt);

    try {
      const apiKey = process.env.AWS_BEDROCK_API_KEY;

      // If we have an API key, try to use it directly
      if (apiKey && apiKey !== 'your_bedrock_api_key_here') {
        logger.info('🔗 Using Bedrock API key');
        return await this.callBedrockWithApiKey(apiKey, prompt);
      }

      // Otherwise use standard AWS SDK approach
      if (!this.client) {
        throw new Error(
          'Bedrock client not initialized. Please check AWS configuration.'
        );
      }

      logger.info('🔗 Using AWS SDK Bedrock client');
      const command = new InvokeModelCommand({
        modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      logger.info('✅ Bedrock analysis completed successfully');
      return JSON.parse(responseBody.content[0].text);
    } catch (error) {
      logger.error('❌ Bedrock AI analysis failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new Error(
        `AI analysis failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  private async callBedrockWithApiKey(apiKey: string, prompt: string) {
    try {
      // If your API key is a URL, make a direct HTTP request
      if (apiKey.includes('http')) {
        logger.info('🌐 Making HTTP request to Bedrock API endpoint');
        const response = await fetch(apiKey, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            anthropic_version: 'bedrock-2023-05-31',
            max_tokens: 4000,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const responseBody = (await response.json()) as any;
        return JSON.parse(responseBody.content[0].text);
      } else {
        // Handle other API key formats
        throw new Error(
          'API key format not supported. Please provide a valid Bedrock endpoint URL.'
        );
      }
    } catch (error) {
      logger.error('❌ Bedrock API key request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private buildAnalysisPrompt(
    repoData: RepositoryData,
    userPrompt: string
  ): string {
    // Create a detailed file analysis
    const fileAnalysis = Object.entries(repoData.files)
      .map(([filename, content]) => {
        return `### ${filename}\n\`\`\`\n${content.slice(0, 1000)}${content.length > 1000 ? '\n... (truncated)' : ''}\n\`\`\``;
      })
      .join('\n\n');

    return `You are an expert AWS cloud architect and DevOps engineer. Analyze the following repository and user requirements to create a comprehensive deployment plan.

## Repository Information:
- **Name**: ${repoData.name}
- **Primary Language**: ${repoData.language}
- **Files Found**: ${Object.keys(repoData.files).length > 0 ? Object.keys(repoData.files).join(', ') : 'No files accessed (may be private repository)'}

## Package.json Analysis:
${repoData.packageJson ? `\`\`\`json\n${JSON.stringify(repoData.packageJson, null, 2)}\n\`\`\`` : 'No package.json found or accessible'}

## README Content:
${repoData.readme ? `\`\`\`\n${repoData.readme.slice(0, 1000)}${repoData.readme.length > 1000 ? '\n... (truncated)' : ''}\n\`\`\`` : 'No README found or accessible'}

## Key Project Files:
${fileAnalysis || 'No key files accessible (this may be a private repository)'}

## User Requirements:
${userPrompt}

## Your Task:
Analyze this repository and provide a detailed deployment plan for AWS. Consider:

1. **Application Type Detection**: Based on package.json, dependencies, and file structure
2. **Framework Identification**: React, Next.js, Express, FastAPI, Django, etc.
3. **Database Requirements**: Look for database dependencies and connection patterns
4. **Environment Variables**: Check for .env files, config patterns
5. **Build Process**: Analyze scripts in package.json and build tools
6. **Port Configuration**: Default ports for the framework/technology
7. **Static Assets**: Determine if there are static files to serve
8. **Containerization**: Check for existing Dockerfile
9. **Scalability Needs**: Based on application type and user requirements
10. **Security Requirements**: Authentication, HTTPS, VPC setup
11. **Cost Optimization**: Right-size resources for the application type
12. **Performance**: CDN, caching, database optimization

## Response Format:
Provide your response as a JSON object with this exact structure:

{
  "analysis": {
    "language": "detected primary language",
    "framework": "detected framework (React, Next.js, Express, etc.)",
    "packageManager": "npm, yarn, or pnpm",
    "hasDatabase": boolean,
    "hasEnvVariables": boolean,
    "buildCommand": "detected or recommended build command",
    "startCommand": "detected or recommended start command", 
    "port": number,
    "dependencies": ["key dependencies"],
    "devDependencies": ["key dev dependencies"],
    "staticAssets": boolean,
    "hasDockerfile": boolean
  },
  "deploymentPlan": {
    "architecture": "Brief description of recommended architecture",
    "services": [
      {
        "name": "Service name",
        "type": "AWS service type (e.g., EC2, Lambda, S3, etc.)",
        "purpose": "What this service will do",
        "estimated_cost": "$X/month"
      }
    ],
    "steps": [
      {
        "step": 1,
        "action": "Action name",
        "description": "Detailed description",
        "resources": ["AWS resources to create"]
      }
    ],
    "estimated_monthly_cost": "$X - $Y",
    "deployment_time": "X minutes",
    "requirements": ["Prerequisites needed"],
    "recommendations": ["Additional suggestions"]
  }
}

**IMPORTANT**: Base your analysis on the ACTUAL file contents provided above. If files are not accessible (private repo), make intelligent recommendations based on the repository name, language, and user requirements. Provide realistic AWS cost estimates based on current pricing.`;
  }
}
