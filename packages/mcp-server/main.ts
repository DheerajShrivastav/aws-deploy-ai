import { config } from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DeploymentTools } from './src/tools/deployment-tools.js';
import { AIAnalysisTools } from './src/tools/ai-analysis-tools.js';
import { RealDeploymentTools } from './src/tools/real-deployment-tools.js';
import { logger } from './src/utils/logger.js';
import path from 'path';

// Load environment variables
config();

// Initialize logger directory
import { promises as fs } from 'fs';
const logDir = path.join(process.cwd(), 'logs');
fs.mkdir(logDir, { recursive: true }).catch(console.error);

const server = new McpServer({
  name: 'AWS Deploy AI Server',
  version: '1.0.0',
});

// Initialize deployment tools
const deploymentTools = new DeploymentTools(
  process.env.AWS_REGION || 'us-east-1'
);
const toolSchemas = DeploymentTools.getToolSchemas();

logger.info('Starting AWS Deploy AI MCP Server');

// Tool: Deploy Website
server.tool(
  'deploy-website',
  'Deploy a website or application to AWS based on natural language prompt',
  toolSchemas.deployWebsite,
  async (params) => {
    try {
      logger.info('Deploy website tool called', { params });
      const result = await deploymentTools.deployWebsite(params);

      return {
        content: [
          {
            type: 'text',
            text: `🚀 **Deployment Started Successfully!**

**Deployment ID:** ${result.deploymentId}
**Status:** ${result.status}
**Message:** ${result.message}

Your AWS infrastructure is being provisioned. You can track the progress using the deployment ID.

**What's happening:**
- AI is analyzing your requirements
- AWS resources are being created
- Your application will be deployed automatically

**Next steps:**
- Use \`get-deployment-status\` to check progress
- Your website will be available at the provided URLs once complete
- Monitor the deployment through the tracking interface

${result.trackingUrl ? `**Track deployment:** ${result.trackingUrl}` : ''}`,
          },
        ],
      };
    } catch (error) {
      logger.error('Deploy website tool failed', { error, params });
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Deployment Failed**

Error: ${error instanceof Error ? error.message : 'Unknown error'}

**Possible solutions:**
- Check your AWS credentials are configured
- Verify you have necessary AWS permissions
- Ensure your deployment prompt is clear and specific
- Try again with a simpler deployment request

**Need help?** Make sure you have:
1. AWS credentials configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
2. OpenAI API key set (OPENAI_API_KEY)
3. Proper IAM permissions for S3, CloudFront, Lambda, and IAM`,
          },
        ],
      };
    }
  }
);

// Tool: Get Deployment Status
server.tool(
  'get-deployment-status',
  'Check the status of a deployment by its ID',
  toolSchemas.getDeploymentStatus,
  async ({ deploymentId }) => {
    try {
      const status = await deploymentTools.getDeploymentStatus(deploymentId);

      const stepsList = status.steps
        .map(
          (step) =>
            `${step.status === 'completed' ? '✅' : step.status === 'running' ? '🔄' : step.status === 'failed' ? '❌' : '⏳'} ${step.name} - ${step.description}`
        )
        .join('\n');

      const resourcesList = status.resources
        .map(
          (resource) =>
            `• ${resource.type}: ${resource.id} (${resource.status})`
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `📊 **Deployment Status: ${deploymentId}**

**Overall Status:** ${status.status.toUpperCase()}
**Progress:** ${status.progress}%
**Current Step:** ${status.currentStep}

**Steps:**
${stepsList}

**Resources Created:**
${resourcesList || 'No resources created yet'}

${
  status.urls && status.urls.length > 0
    ? `**Live URLs:**
${status.urls.map((url) => `🌐 ${url}`).join('\n')}`
    : ''
}

${
  status.error
    ? `**Error:**
❌ ${status.error.message}

**Suggestions:**
${status.error.suggestions.map((s) => `• ${s}`).join('\n')}`
    : ''
}

**Timeline:**
- Started: ${status.startTime.toLocaleString()}
${status.endTime ? `- Completed: ${status.endTime.toLocaleString()}` : ''}
${status.estimatedCompletion ? `- Estimated completion: ${status.estimatedCompletion.toLocaleString()}` : ''}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Error checking deployment status**

${error instanceof Error ? error.message : 'Unknown error'}

**Possible causes:**
- Invalid deployment ID
- Deployment may have been removed
- Server connectivity issues`,
          },
        ],
      };
    }
  }
);

// Tool: Analyze Deployment
server.tool(
  'analyze-deployment',
  'Analyze deployment requirements and get cost estimates without actually deploying',
  toolSchemas.analyzeDeployment,
  async ({ prompt }) => {
    try {
      const analysis = await deploymentTools.analyzeDeployment(prompt);

      const stepsList = analysis.deploymentSteps
        .map((step, i) => `${i + 1}. ${step}`)
        .join('\n');
      const featuresList = analysis.features.map((f) => `• ${f}`).join('\n');
      const recommendationsList = analysis.recommendations
        .map((r) => `💡 ${r}`)
        .join('\n');
      const costBreakdown = analysis.estimatedCost.breakdown
        .map(
          (item) =>
            `• ${item.service}: $${item.cost.toFixed(2)}/${item.unit} - ${item.description}`
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `🔍 **Deployment Analysis**

**Project Type:** ${analysis.projectType}
**Estimated Monthly Cost:** $${analysis.estimatedCost.monthly.toFixed(2)}
**Estimated Deployment Time:** ${Math.round(analysis.estimatedTime / 60000)} minutes

**Infrastructure Requirements:**
• **Compute:** ${analysis.infrastructure.compute.type}${analysis.infrastructure.compute.runtime ? ` (${analysis.infrastructure.compute.runtime})` : ''}
• **Storage:** ${analysis.infrastructure.storage.size}GB ${analysis.infrastructure.storage.type}${analysis.infrastructure.storage.encryption ? ' (encrypted)' : ''}
• **CDN:** ${analysis.infrastructure.cdn ? 'Yes' : 'No'}
• **SSL:** ${analysis.infrastructure.ssl ? 'Yes' : 'No'}
• **Database:** ${analysis.infrastructure.database ? `${analysis.infrastructure.database.type} (${analysis.infrastructure.database.size})` : 'None'}

**Features Detected:**
${featuresList}

**Cost Breakdown:**
${costBreakdown}

**Deployment Steps:**
${stepsList}

**Recommendations:**
${recommendationsList}

**Ready to deploy?** Use the \`deploy-website\` tool with the same prompt to start the actual deployment.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Analysis Failed**

${error instanceof Error ? error.message : 'Unknown error'}

**Tips for better analysis:**
- Be specific about what you want to deploy
- Mention if you need database, API, or special features
- Include any domain or performance requirements
- Example: "Deploy my React portfolio with contact form and custom domain"`,
          },
        ],
      };
    }
  }
);

// Tool: Get Cost Estimate
server.tool(
  'get-cost-estimate',
  'Get detailed cost estimates for a deployment',
  toolSchemas.getCostEstimate,
  async ({ prompt }) => {
    try {
      const estimate = await deploymentTools.getCostEstimate(prompt);

      const breakdown = estimate.breakdown
        .map(
          (item) =>
            `• ${item.service}: $${item.cost.toFixed(2)}/${item.unit} - ${item.description}`
        )
        .join('\n');

      const savings = estimate.comparison;
      const tips = estimate.optimizationTips
        .map((tip) => `💰 ${tip}`)
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `💰 **Cost Estimate**

**Monthly Cost:** $${estimate.monthly.toFixed(2)} ${estimate.currency}
**Yearly Cost:** $${estimate.yearly.toFixed(2)} ${estimate.currency}

**Cost Breakdown:**
${breakdown}

**Potential Savings:**
• vs Traditional Hosting: $${savings.vs_traditional_hosting.savings.toFixed(2)}/month (${savings.vs_traditional_hosting.percentage}% savings)
• vs VPS: $${savings.vs_vps.savings.toFixed(2)}/month (${savings.vs_vps.percentage}% savings)

**Cost Optimization Tips:**
${tips}

**Note:** These are estimates based on typical usage patterns. Actual costs may vary based on traffic, storage usage, and feature utilization.

**AWS Free Tier:** Many services include free tier benefits that could reduce or eliminate costs for new AWS accounts.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Cost Estimation Failed**

${error instanceof Error ? error.message : 'Unknown error'}

**For accurate cost estimates, please:**
- Provide clear deployment requirements
- Mention expected traffic volume
- Specify any special features needed
- Include storage and compute requirements`,
          },
        ],
      };
    }
  }
);

// Tool: List Deployments
server.tool(
  'list-deployments',
  'List all deployments and their current status',
  {},
  async () => {
    try {
      const deployments = await deploymentTools.listDeployments();

      if (deployments.total === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `📋 **No Deployments Found**

You haven't created any deployments yet. Use the \`deploy-website\` tool to start your first deployment!

**Example:**
\`deploy-website\` with prompt: "Deploy my React portfolio website with contact form"`,
            },
          ],
        };
      }

      const deploymentsList = deployments.deployments
        .map(
          (d) =>
            `• **${d.id}** - ${d.status} (${d.progress}%) - ${d.resourceCount} resources - Started: ${d.startTime.toLocaleString()}`
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `📋 **Deployment Summary**

**Total Deployments:** ${deployments.total}
• Active: ${deployments.active}
• Completed: ${deployments.completed}  
• Failed: ${deployments.failed}

**Recent Deployments:**
${deploymentsList}

Use \`get-deployment-status\` with a specific deployment ID for detailed information.`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Failed to list deployments**

${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
);

// AI Repository Analysis Tool
server.tool(
  'analyze_repository',
  'Analyze a repository and generate AI-powered deployment recommendations',
  {
    type: 'object',
    properties: {
      repositoryData: {
        type: 'object',
        description: 'Repository data including name, language, files, etc.',
        properties: {
          name: { type: 'string' },
          language: { type: 'string' },
          files: { type: 'object' },
          readme: { type: 'string' },
        },
        required: ['name', 'language', 'files'],
      },
      userPrompt: {
        type: 'string',
        description: 'User requirements for deployment',
      },
    },
    required: ['repositoryData', 'userPrompt'],
  },
  async (params) => {
    try {
      logger.info('AI Repository Analysis tool called', {
        params: { repo: params.repositoryData.name },
      });
      const result = await AIAnalysisTools.handleToolCall(
        'analyze_repository',
        params
      );

      return {
        content: [
          {
            type: 'text',
            text: `🤖 **AI Repository Analysis Complete!**

**Repository:** ${params.repositoryData.name}
**Framework:** ${result.analysis.framework}
**Architecture:** ${result.deploymentPlan.architecture}

**Recommended Services:**
${result.deploymentPlan.services
  .map(
    (service) =>
      `• **${service.name}** (${service.type}): ${service.purpose} - ${service.estimated_cost}`
  )
  .join('\n')}

**Deployment Steps:**
${result.deploymentPlan.steps
  .map((step) => `${step.step}. **${step.action}**: ${step.description}`)
  .join('\n')}

**Estimated Monthly Cost:** ${result.deploymentPlan.estimated_monthly_cost}
**Deployment Time:** ${result.deploymentPlan.deployment_time}

**Key Recommendations:**
${result.deploymentPlan.recommendations
  .slice(0, 3)
  .map((rec) => `• ${rec}`)
  .join('\n')}

Your deployment plan is ready for implementation!`,
          },
        ],
      };
    } catch (error) {
      logger.error('AI analysis failed', { error });
      return {
        content: [
          {
            type: 'text',
            text: `❌ **AI Analysis Failed**

Error: ${error.message}

Please check the repository data format and try again.`,
          },
        ],
      };
    }
  }
);

// Real GitHub Deployment Tool
server.tool(
  'deploy_from_github',
  'Deploy a GitHub repository to AWS with real infrastructure provisioning',
  {
    type: 'object',
    properties: {
      repositoryUrl: {
        type: 'string',
        description: 'GitHub repository URL to deploy',
      },
      repositoryName: {
        type: 'string',
        description: 'Name of the repository',
      },
      deploymentPlan: {
        type: 'object',
        description: 'Deployment plan with architecture and services',
      },
      prompt: {
        type: 'string',
        description: 'User deployment requirements',
      },
      branch: {
        type: 'string',
        description: 'Git branch to deploy (default: main)',
        default: 'main',
      },
    },
    required: ['repositoryUrl', 'repositoryName', 'deploymentPlan', 'prompt'],
  },
  async (params) => {
    try {
      logger.info('Real GitHub deployment tool called', {
        repo: params.repositoryName,
        url: params.repositoryUrl,
      });

      const result = await RealDeploymentTools.handleToolCall(
        'deploy_from_github',
        params
      );

      return {
        content: [
          {
            type: 'text',
            text: `🚀 **Real Deployment Started!**

**Deployment ID:** ${result.deploymentId}
**Repository:** ${params.repositoryName}
**Status:** ${result.status}
**Region:** ${result.awsRegion}

Your application is being deployed to AWS. This includes:
1. Cloning the GitHub repository
2. Analyzing project structure
3. Provisioning AWS infrastructure
4. Building and deploying the application

Track progress with deployment ID: ${result.deploymentId}`,
          },
        ],
      };
    } catch (error) {
      logger.error('Real deployment failed', { error });
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Deployment Failed**

Error: ${error instanceof Error ? error.message : 'Unknown error'}

Please check your repository URL and deployment plan, then try again.`,
          },
        ],
      };
    }
  }
);

// Get Real Deployment Status Tool
server.tool(
  'get_deployment_status',
  'Get the status of a real deployment',
  {
    type: 'object',
    properties: {
      deploymentId: {
        type: 'string',
        description: 'Deployment ID to check status for',
      },
    },
    required: ['deploymentId'],
  },
  async (params) => {
    try {
      const result = await RealDeploymentTools.handleToolCall(
        'get_deployment_status',
        params
      );

      const stepsText = result.steps
        .map(
          (step: any) =>
            `${step.status === 'completed' ? '✅' : step.status === 'failed' ? '❌' : '⏳'} ${step.name}: ${step.message}`
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `📊 **Deployment Status**

**Deployment ID:** ${result.deploymentId}
**Status:** ${result.status}
**Repository:** ${result.repositoryUrl}
${result.publicUrl ? `**Public URL:** ${result.publicUrl}` : ''}
${result.instanceId ? `**EC2 Instance:** ${result.instanceId}` : ''}

**Progress Steps:**
${stepsText}

${result.error ? `**Error:** ${result.error}` : ''}`,
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to get deployment status', { error });
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Failed to Get Status**

Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      };
    }
  }
);

// Error handling
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Start the server
logger.info('AWS Deploy AI MCP Server is ready');
const transport = new StdioServerTransport();
server.connect(transport);
