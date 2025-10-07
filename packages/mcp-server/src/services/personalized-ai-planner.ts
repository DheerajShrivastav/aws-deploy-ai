import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { logger } from '../utils/logger.js';

export class PersonalizedAIDeploymentPlanner {
  private bedrockClient: BedrockRuntimeClient;
  private modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';

  constructor(region: string = 'us-east-1') {
    this.bedrockClient = new BedrockRuntimeClient({ region });
  }

  async generatePersonalizedDeploymentPlan(
    repositoryData: any,
    userPrompt: string,
    projectAnalysis: any
  ): Promise<any> {
    try {
      const aiPrompt = this.createPersonalizedPrompt(
        repositoryData,
        userPrompt,
        projectAnalysis
      );

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: aiPrompt,
            },
          ],
        }),
      });

      const response = await this.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Parse the AI response into structured deployment plan
      return this.parseAIResponse(responseBody.content[0].text);
    } catch (error) {
      logger.error('AI deployment planning failed:', error);
      throw new Error(
        `AI planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private createPersonalizedPrompt(
    repositoryData: any,
    userPrompt: string,
    projectAnalysis: any
  ): string {
    return `
You are an expert AWS Solutions Architect and DevOps engineer. Analyze this specific GitHub repository and create a highly personalized AWS deployment plan.

## Repository Information:
- **Name**: ${repositoryData.name}
- **Language**: ${repositoryData.language}
- **Description**: ${repositoryData.description}
- **Stars**: ${repositoryData.stars}
- **Framework**: ${projectAnalysis.framework}
- **Package Manager**: ${projectAnalysis.packageManager}
- **Has Docker**: ${projectAnalysis.hasDockerfile}
- **Dependencies**: ${projectAnalysis.dependencies.slice(0, 10).join(', ')}
- **Build Command**: ${projectAnalysis.buildCommand}
- **Start Command**: ${projectAnalysis.startCommand}
- **Default Port**: ${projectAnalysis.port}

## Project Files Structure:
${this.formatFileStructure(repositoryData.contents)}

## Package.json Analysis:
${JSON.stringify(repositoryData.packageJson, null, 2)}

## User Requirements:
"${userPrompt}"

## Task:
Create a detailed, personalized AWS deployment plan specifically for THIS project. Consider:

1. **Project-Specific Requirements**: Analyze the actual dependencies, scripts, and file structure
2. **Performance Needs**: Based on project complexity and likely traffic patterns
3. **Cost Optimization**: Recommend the most cost-effective solution for this specific use case
4. **Scalability**: Design for the project's expected growth and usage patterns
5. **Security**: Address security needs specific to this technology stack
6. **Maintenance**: Consider long-term maintenance and updates

## Response Format:
Respond with a valid JSON object in this exact format:

{
  "analysis": {
    "projectComplexity": "simple|moderate|complex",
    "expectedTraffic": "low|medium|high",
    "resourceRequirements": {
      "cpu": "low|medium|high",
      "memory": "low|medium|high",
      "storage": "low|medium|high"
    },
    "specialRequirements": ["requirement1", "requirement2"],
    "riskFactors": ["risk1", "risk2"]
  },
  "recommendedArchitecture": {
    "primary": "serverless|containerized|vm-based|hybrid",
    "reasoning": "Detailed explanation of why this architecture suits this specific project"
  },
  "deploymentPlan": {
    "architecture": "Detailed architecture description",
    "services": [
      {
        "name": "Service name",
        "type": "AWS service type",
        "purpose": "What this service does for this specific project",
        "configuration": "Specific configuration for this project",
        "estimated_cost": "$X-Y/month"
      }
    ],
    "steps": [
      {
        "step": 1,
        "action": "Action name",
        "description": "Detailed description specific to this project",
        "resources": ["resource1", "resource2"],
        "estimatedTime": "X minutes",
        "commands": ["command1", "command2"]
      }
    ],
    "estimated_monthly_cost": "$X-Y",
    "deployment_time": "X-Y minutes",
    "requirements": ["requirement1", "requirement2"],
    "recommendations": [
      "Project-specific recommendation 1",
      "Project-specific recommendation 2"
    ]
  },
  "environmentVariables": [
    {
      "name": "ENV_VAR_NAME",
      "description": "What this variable is used for in this project",
      "required": true|false,
      "defaultValue": "if applicable"
    }
  ],
  "monitoring": {
    "metrics": ["metric1", "metric2"],
    "alerts": ["alert1", "alert2"],
    "dashboards": ["dashboard1", "dashboard2"]
  },
  "cicd": {
    "recommended": true|false,
    "pipeline": "Description of recommended CI/CD pipeline for this project",
    "tools": ["tool1", "tool2"]
  }
}

Important: Base your recommendations on the ACTUAL project characteristics, not generic templates. Consider the specific dependencies, project size, complexity, and user requirements.`;
  }

  private formatFileStructure(contents: any[]): string {
    if (!Array.isArray(contents)) return 'Unable to analyze file structure';

    return contents
      .slice(0, 20) // Limit to first 20 files to avoid token limits
      .map((file) => `- ${file.name} (${file.type || 'file'})`)
      .join('\n');
  }

  private parseAIResponse(aiResponse: string): any {
    try {
      // Extract JSON from AI response (it might have additional text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsedResponse = JSON.parse(jsonMatch[0]);

      // Validate the response structure
      if (!parsedResponse.deploymentPlan) {
        throw new Error('Invalid AI response structure');
      }

      return {
        analysis: parsedResponse.deploymentPlan,
        deploymentPlan: {
          architecture: parsedResponse.deploymentPlan.architecture,
          services: parsedResponse.deploymentPlan.services || [],
          steps: parsedResponse.deploymentPlan.steps || [],
          estimated_monthly_cost:
            parsedResponse.deploymentPlan.estimated_monthly_cost || '$20-100',
          deployment_time:
            parsedResponse.deploymentPlan.deployment_time || '30-60 minutes',
          requirements: parsedResponse.deploymentPlan.requirements || [],
          recommendations: parsedResponse.deploymentPlan.recommendations || [],
        },
        aiInsights: {
          complexity: parsedResponse.analysis?.projectComplexity || 'moderate',
          traffic: parsedResponse.analysis?.expectedTraffic || 'medium',
          specialRequirements:
            parsedResponse.analysis?.specialRequirements || [],
          environmentVariables: parsedResponse.environmentVariables || [],
          monitoring: parsedResponse.monitoring || {},
          cicd: parsedResponse.cicd || {},
        },
      };
    } catch (error) {
      logger.error('Failed to parse AI response:', error);
      throw new Error(
        `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async generateAlternativeArchitectures(
    repositoryData: any,
    userPrompt: string,
    projectAnalysis: any
  ): Promise<any[]> {
    try {
      const aiPrompt = `
Based on this project analysis:
- Project: ${repositoryData.name}
- Framework: ${projectAnalysis.framework}
- User Requirements: "${userPrompt}"

Generate 3 alternative AWS deployment architectures:
1. Cost-optimized (minimal cost)
2. Performance-optimized (maximum performance)
3. Hybrid (balanced cost and performance)

For each architecture, provide:
- Architecture type
- AWS services used
- Estimated monthly cost
- Pros and cons
- Best use case

Respond in JSON format with an array of 3 alternatives.`;

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 2000,
          messages: [{ role: 'user', content: aiPrompt }],
        }),
      });

      const response = await this.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      const jsonMatch = responseBody.content[0].text.match(/\[[\s\S]*\]/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (error) {
      logger.error('Failed to generate alternatives:', error);
      return [];
    }
  }
}
