import { config } from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DeploymentTools } from './src/tools/deployment-tools.js';
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
