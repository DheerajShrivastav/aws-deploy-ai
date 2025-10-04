import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime'

interface RepositoryAnalysis {
  language: string
  framework: string
  packageManager: string
  hasDatabase: boolean
  hasEnvVariables: boolean
  buildCommand: string
  startCommand: string
  port: number
  dependencies: string[]
  devDependencies: string[]
  staticAssets: boolean
  hasDockerfile: boolean
}

interface DeploymentPlan {
  architecture: string
  services: {
    name: string
    type: string
    purpose: string
    estimated_cost: string
  }[]
  steps: {
    step: number
    action: string
    description: string
    resources: string[]
  }[]
  estimated_monthly_cost: string
  deployment_time: string
  requirements: string[]
  recommendations: string[]
}

export class AWSBedrockService {
  private client: BedrockRuntimeClient | null = null

  constructor() {
    this.initialize()
  }

  initialize() {
    // Check if we have a Bedrock API key or AWS credentials
    const apiKey = process.env.AWS_BEDROCK_API_KEY
    const region = process.env.AWS_REGION || 'us-east-1'

    if (apiKey && apiKey !== 'your_bedrock_api_key_here') {
      // If we have an API key, we'll use it in the API calls directly
      console.log('Using Bedrock API key for authentication')
      // Set a flag that we're using API key
      this.client = new BedrockRuntimeClient({
        region: region,
      })
    } else {
      // Fall back to standard AWS credentials
      this.client = new BedrockRuntimeClient({
        region: region,
        // AWS SDK will automatically use environment variables:
        // AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN
      })
    }
  }

  async analyzeRepository(
    repoData: {
      name: string
      language: string
      files: { [key: string]: string }
      packageJson?: Record<string, unknown>
      readme?: string
    },
    userPrompt: string
  ): Promise<{ analysis: RepositoryAnalysis; deploymentPlan: DeploymentPlan }> {
    if (!this.client) {
      throw new Error(
        'AWS Bedrock client not initialized. Please check AWS configuration.'
      )
    }

    if (!this.client) {
      throw new Error(
        'AWS Bedrock client not initialized. Please check AWS configuration.'
      )
    }

    const prompt = this.buildAnalysisPrompt(repoData, userPrompt)

    try {
      const apiKey = process.env.AWS_BEDROCK_API_KEY

      // If we have an API key, try to use it directly
      if (apiKey && apiKey !== 'your_bedrock_api_key_here') {
        return await this.callBedrockWithApiKey(apiKey, prompt)
      }

      // Otherwise use standard AWS SDK approach
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
      })

      const response = await this.client.send(command)
      const responseBody = JSON.parse(new TextDecoder().decode(response.body))

      return JSON.parse(responseBody.content[0].text)
    } catch (error) {
      console.error('AWS Bedrock API error:', error)
      throw new Error(
        `AI analysis failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }

  private async callBedrockWithApiKey(apiKey: string, prompt: string) {
    // Handle your specific API key format
    try {
      // If your API key is a URL, make a direct HTTP request
      if (apiKey.includes('http')) {
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
        })

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`)
        }

        const responseBody = await response.json()
        return JSON.parse(responseBody.content[0].text)
      } else {
        // Handle other API key formats
        throw new Error('API key format not supported')
      }
    } catch (error) {
      console.error('Bedrock API key error:', error)
      throw error
    }
  }

  private buildAnalysisPrompt(
    repoData: {
      name: string
      language: string
      files: { [key: string]: string }
      packageJson?: Record<string, unknown>
      readme?: string
    },
    userPrompt: string
  ): string {
    // Create a detailed file analysis
    const fileAnalysis = Object.entries(repoData.files)
      .map(([filename, content]) => {
        return `### ${filename}\n\`\`\`\n${content.slice(0, 1000)}${
          content.length > 1000 ? '\n... (truncated)' : ''
        }\n\`\`\``
      })
      .join('\n\n')

    return `You are an expert AWS cloud architect and DevOps engineer. Analyze the following repository and user requirements to create a comprehensive deployment plan.

## Repository Information:
- **Name**: ${repoData.name}
- **Primary Language**: ${repoData.language}
- **Files Found**: ${
      Object.keys(repoData.files).length > 0
        ? Object.keys(repoData.files).join(', ')
        : 'No files accessed (may be private repository)'
    }

## Package.json Analysis:
${
  repoData.packageJson
    ? `\`\`\`json\n${JSON.stringify(repoData.packageJson, null, 2)}\n\`\`\``
    : 'No package.json found or accessible'
}

## README Content:
${
  repoData.readme
    ? `\`\`\`\n${repoData.readme.slice(0, 1000)}${
        repoData.readme.length > 1000 ? '\n... (truncated)' : ''
      }\n\`\`\``
    : 'No README found or accessible'
}

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

**IMPORTANT**: Base your analysis on the ACTUAL file contents provided above. If files are not accessible (private repo), make intelligent recommendations based on the repository name, language, and user requirements. Provide realistic AWS cost estimates based on current pricing.`
  }

  async generateDeploymentScript(
    plan: DeploymentPlan,
    repoData: { name: string; cloneUrl: string }
  ): Promise<string> {
    if (!this.client) {
      throw new Error('AWS Bedrock client not initialized')
    }

    const prompt = `Generate a comprehensive AWS CloudFormation template or AWS CLI script to deploy the following application:

## Repository:
- Name: ${repoData.name}
- Clone URL: ${repoData.cloneUrl}

## Deployment Plan:
${JSON.stringify(plan, null, 2)}

Generate a production-ready CloudFormation template that implements this deployment plan. Include:
1. All necessary AWS resources
2. Security groups and IAM roles
3. Environment variables configuration
4. Monitoring and logging setup
5. Auto-scaling configuration if applicable

Provide the complete CloudFormation template in YAML format.`

    try {
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
      })

      const response = await this.client.send(command)
      const responseBody = JSON.parse(new TextDecoder().decode(response.body))

      return responseBody.content[0].text
    } catch (error) {
      console.error('Bedrock script generation error:', error)
      throw new Error(
        `Script generation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      )
    }
  }
}

export default AWSBedrockService
