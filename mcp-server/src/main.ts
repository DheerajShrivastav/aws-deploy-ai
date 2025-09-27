// Set MCP server mode to disable console logging BEFORE importing logger
process.env.MCP_SERVER_MODE = 'true';

import { config } from 'dotenv';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DeploymentTools } from './tools/deployment-tools.js';
import { AIPromptInterpreter } from './services/ai-interpreter.js';
import { S3Service } from './services/s3-service.js';
import { CloudFrontService } from './services/cloudfront-service.js';
import { LambdaService } from './services/lambda-service.js';
import { GitHubService } from './services/github-service.js';
import { logger } from './utils/logger.js';
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
  async (params: any) => {
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
2. AWS Bedrock access enabled in your region
3. Proper IAM permissions for S3, CloudFront, Lambda, IAM, and Bedrock`,
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
  async ({ deploymentId }: { deploymentId: string }) => {
    try {
      const status = await deploymentTools.getDeploymentStatus(deploymentId);

      const stepsList = status.steps
        .map(
          (step: any) =>
            `${step.status === 'completed' ? '✅' : step.status === 'running' ? '🔄' : step.status === 'failed' ? '❌' : '⏳'} ${step.name} - ${step.description}`
        )
        .join('\n');

      const resourcesList = status.resources
        .map(
          (resource: any) =>
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
${status.urls.map((url: string) => `🌐 ${url}`).join('\n')}`
    : ''
}

${
  status.error
    ? `**Error:**
❌ ${status.error.message}

**Suggestions:**
${status.error.suggestions.map((s: string) => `• ${s}`).join('\n')}`
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
  async ({ prompt }: { prompt: string }) => {
    try {
      const analysis = await deploymentTools.analyzeDeployment(prompt);

      const stepsList = analysis.deploymentSteps
        .map((step: string, i: number) => `${i + 1}. ${step}`)
        .join('\n');
      const featuresList = analysis.features
        .map((f: string) => `• ${f}`)
        .join('\n');
      const recommendationsList = analysis.recommendations
        .map((r: string) => `💡 ${r}`)
        .join('\n');
      const costBreakdown = analysis.estimatedCost.breakdown
        .map(
          (item: any) =>
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
  async ({ prompt }: { prompt: string }) => {
    try {
      const estimate = await deploymentTools.getCostEstimate(prompt);

      const breakdown = estimate.breakdown
        .map(
          (item: any) =>
            `• ${item.service}: $${item.cost.toFixed(2)}/${item.unit} - ${item.description}`
        )
        .join('\n');

      const savings = estimate.comparison;
      const tips = estimate.optimizationTips
        .map((tip: string) => `💰 ${tip}`)
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
          (d: any) =>
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

// Initialize GitHub service
const githubService = new GitHubService();

// Tool: Deploy from GitHub
server.tool(
  'deploy-from-github',
  'Deploy directly from a GitHub repository to AWS',
  {
    type: 'object',
    properties: {
      repository: {
        type: 'string',
        description: 'GitHub repository in format "owner/repo"',
      },
      branch: {
        type: 'string',
        description: 'Branch to deploy (default: main)',
      },
      path: {
        type: 'string',
        description: 'Path within repository to deploy (optional)',
      },
      prompt: {
        type: 'string',
        description: 'Natural language description of deployment requirements',
      },
    },
    required: ['repository', 'prompt'],
  },
  async (params: any) => {
    try {
      const { repository, branch = 'main', path, prompt } = params;
      const [owner, repo] = repository.split('/');

      if (!owner || !repo) {
        throw new Error('Invalid repository format. Use "owner/repo"');
      }

      logger.info('Deploy from GitHub tool called', { params });

      // Analyze repository
      const repoInfo = await githubService.getRepositoryInfo(owner, repo);
      const deploymentPackage = await githubService.createDeploymentPackage({
        owner,
        repo,
        branch,
        path,
      });

      // Create enhanced prompt with repository context
      const enhancedPrompt = `${prompt}

Repository Information:
- Name: ${repoInfo.name}
- Language: ${repoInfo.language}
- Description: ${repoInfo.description}
- Project Type: ${deploymentPackage.content.projectType}
- Build Command: ${deploymentPackage.buildCommand || 'None'}
- Output Directory: ${deploymentPackage.outputDirectory || 'Root'}

Deploy this ${deploymentPackage.content.projectType} project from GitHub repository.`;

      // Convert files to expected format
      const formattedFiles = Object.entries(
        deploymentPackage.content.files
      ).map(([name, content]) => ({
        name,
        content,
        contentType: name.endsWith('.html')
          ? 'text/html'
          : name.endsWith('.css')
            ? 'text/css'
            : name.endsWith('.js')
              ? 'application/javascript'
              : name.endsWith('.json')
                ? 'application/json'
                : 'text/plain',
        path: name,
      }));

      // Deploy using existing deployment tools with GitHub context
      const result = await deploymentTools.deployWebsite({
        prompt: enhancedPrompt,
        files: formattedFiles,
      });

      return {
        content: [
          {
            type: 'text',
            text: `🚀 **GitHub Deployment Started!**

**Repository:** ${repository}
**Branch:** ${branch}
**Project Type:** ${deploymentPackage.content.projectType}
**Deployment ID:** ${result.deploymentId}

**Repository Details:**
- Language: ${repoInfo.language}
- Description: ${repoInfo.description}
- Stars: ${repoInfo.stars}

**Deployment Configuration:**
- Type: ${deploymentPackage.deploymentType}
- Build Command: ${deploymentPackage.buildCommand || 'Static files only'}
- Output Directory: ${deploymentPackage.outputDirectory || 'Root directory'}

**Status:** ${result.status}
**Message:** ${result.message}

Your GitHub repository is being deployed to AWS. Use \`get-deployment-status\` with deployment ID \`${result.deploymentId}\` to track progress.

${result.trackingUrl ? `**Track deployment:** ${result.trackingUrl}` : ''}`,
          },
        ],
      };
    } catch (error) {
      logger.error('Deploy from GitHub tool failed', { error, params });
      return {
        content: [
          {
            type: 'text',
            text: `❌ **GitHub Deployment Failed**

Error: ${error instanceof Error ? error.message : 'Unknown error'}

**Common issues:**
- Repository not found or access denied
- Invalid repository format (use "owner/repo")
- GitHub token not configured (set GITHUB_TOKEN environment variable)
- Repository is private but no access token provided

**Setup GitHub access:**
1. Get a GitHub Personal Access Token
2. Set environment variable: GITHUB_TOKEN=your_token
3. Ensure token has repo access permissions`,
          },
        ],
      };
    }
  }
);

// Tool: Analyze GitHub Repository
server.tool(
  'analyze-github-repo',
  'Analyze a GitHub repository to understand its deployment requirements',
  {
    type: 'object',
    properties: {
      repository: {
        type: 'string',
        description: 'GitHub repository in format "owner/repo"',
      },
      branch: {
        type: 'string',
        description: 'Branch to analyze (default: main)',
      },
    },
    required: ['repository'],
  },
  async (params: any) => {
    try {
      const { repository, branch = 'main' } = params;
      const [owner, repo] = repository.split('/');

      if (!owner || !repo) {
        throw new Error('Invalid repository format. Use "owner/repo"');
      }

      logger.info('Analyze GitHub repository tool called', { params });

      // Get repository info and analyze
      const repoInfo = await githubService.getRepositoryInfo(owner, repo);
      const analysis = await githubService.analyzeRepository({
        owner,
        repo,
        branch,
      });

      const filesList = Object.keys(analysis.files)
        .slice(0, 10)
        .map((name) => `• ${name}`)
        .join('\n');

      const hasMoreFiles = Object.keys(analysis.files).length > 10;

      return {
        content: [
          {
            type: 'text',
            text: `🔍 **Repository Analysis: ${repository}**

**Repository Details:**
- **Name:** ${repoInfo.name}
- **Description:** ${repoInfo.description || 'No description'}
- **Language:** ${repoInfo.language || 'Not specified'}
- **Default Branch:** ${repoInfo.defaultBranch}
- **Stars:** ${repoInfo.stars} ⭐
- **Forks:** ${repoInfo.forks}
- **Private:** ${repoInfo.isPrivate ? 'Yes' : 'No'}

**Project Analysis:**
- **Project Type:** ${analysis.projectType.toUpperCase()}
- **Files Found:** ${Object.keys(analysis.files).length}
- **Has package.json:** ${analysis.packageJson ? 'Yes' : 'No'}
- **Has README:** ${analysis.readme ? 'Yes' : 'No'}

**Key Files:**
${filesList}${hasMoreFiles ? '\n• ... and more files' : ''}

**Deployment Recommendations:**
${
  analysis.projectType === 'static'
    ? '🌐 **Static Website Deployment**\n- Deploy to S3 + CloudFront\n- No build process required\n- Fast and cost-effective'
    : analysis.projectType === 'react'
      ? '⚛️ **React SPA Deployment**\n- Build with npm run build\n- Deploy to S3 + CloudFront\n- Include build process in CI/CD'
      : analysis.projectType === 'vue'
        ? '🖖 **Vue.js SPA Deployment**\n- Build with npm run build\n- Deploy to S3 + CloudFront\n- Configure for SPA routing'
        : analysis.projectType === 'angular'
          ? '🅰️ **Angular SPA Deployment**\n- Build with ng build\n- Deploy to S3 + CloudFront\n- Configure for SPA routing'
          : analysis.projectType === 'node'
            ? '🟢 **Node.js API Deployment**\n- Deploy to AWS Lambda\n- Use serverless architecture\n- API Gateway for routing'
            : analysis.projectType === 'python'
              ? '🐍 **Python Application Deployment**\n- Deploy to AWS Lambda\n- Use serverless framework\n- Consider container deployment for complex apps'
              : '📦 **Custom Deployment**\n- Manual configuration required\n- Analyze dependencies and requirements\n- Consider containerized deployment'
}

${
  analysis.packageJson?.scripts
    ? `**Available Scripts:**
${Object.entries(analysis.packageJson.scripts)
  .map(([name, script]) => `• \`${name}\`: ${script}`)
  .join('\n')}`
    : ''
}

**Next Steps:**
1. Use \`deploy-from-github\` to deploy this repository
2. Specify deployment requirements in natural language
3. Monitor deployment progress with status tracking

**Example Deploy Command:**
\`deploy-from-github\` with repository "${repository}" and prompt "Deploy this ${analysis.projectType} project with CDN and custom domain"`,
          },
        ],
      };
    } catch (error) {
      logger.error('Analyze GitHub repository tool failed', { error, params });
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Repository Analysis Failed**

Error: ${error instanceof Error ? error.message : 'Unknown error'}

**Common issues:**
- Repository not found or is private
- Invalid repository format (use "owner/repo")
- GitHub API rate limits exceeded
- Network connectivity issues

**Solutions:**
- Check repository name and ensure it's public
- Set GITHUB_TOKEN for private repositories
- Wait a moment and try again if rate limited`,
          },
        ],
      };
    }
  }
);

// Tool: List GitHub Repositories
server.tool(
  'list-github-repos',
  'List GitHub repositories for a user',
  {
    type: 'object',
    properties: {
      username: {
        type: 'string',
        description:
          'GitHub username (optional, uses authenticated user if not provided)',
      },
      page: {
        type: 'number',
        description: 'Page number for pagination (default: 1)',
      },
      per_page: {
        type: 'number',
        description: 'Number of repositories per page (default: 10, max: 30)',
      },
    },
    required: [],
  },
  async (params: any = {}) => {
    try {
      const { username, page = 1, per_page = 10 } = params;

      logger.info('List GitHub repositories tool called', { params });

      const repositories = await githubService.listUserRepositories(
        username,
        page,
        Math.min(per_page, 30)
      );

      if (repositories.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `📭 **No repositories found**

${username ? `User "${username}" has no public repositories.` : 'No repositories found for the authenticated user.'}

**Possible reasons:**
- User has no public repositories
- Username doesn't exist
- All repositories are private (need GitHub token for access)`,
            },
          ],
        };
      }

      const reposList = repositories
        .map((repo) => {
          const stars = (repo.stars || 0) > 0 ? ` ⭐${repo.stars}` : '';
          const language = repo.language ? ` • ${repo.language}` : '';
          const description = repo.description
            ? `\n    ${repo.description}`
            : '';

          return `**${repo.name}**${stars}${language}${description}
    🔗 ${repo.htmlUrl}`;
        })
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `📚 **GitHub Repositories${username ? ` for ${username}` : ''}**

**Found ${repositories.length} repositories (Page ${page})**

${reposList}

**Quick Actions:**
- Use \`analyze-github-repo\` to analyze any repository
- Use \`deploy-from-github\` to deploy directly from GitHub
- Add more repositories by increasing page number

**Example:**
\`analyze-github-repo\` with repository "${repositories[0]?.fullName}" to get deployment insights`,
          },
        ],
      };
    } catch (error) {
      logger.error('List GitHub repositories tool failed', { error, params });
      return {
        content: [
          {
            type: 'text',
            text: `❌ **Failed to List Repositories**

Error: ${error instanceof Error ? error.message : 'Unknown error'}

**Common issues:**
- GitHub API rate limits
- Invalid username
- Network connectivity issues
- Authentication required for private repos

**Solutions:**
- Set GITHUB_TOKEN environment variable for better rate limits
- Check username spelling
- Try again in a few minutes if rate limited`,
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
