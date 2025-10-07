import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';
import { RealDeploymentService } from '../services/real-deployment.js';

export class RealDeploymentTools {
  private static deploymentService = new RealDeploymentService();

  static getTools(): Tool[] {
    return [
      {
        name: 'deploy_from_github',
        description:
          'Deploy a GitHub repository to AWS with real infrastructure provisioning',
        inputSchema: {
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
          required: [
            'repositoryUrl',
            'repositoryName',
            'deploymentPlan',
            'prompt',
          ],
        },
      },
      {
        name: 'get_deployment_status',
        description: 'Get the status of a deployment',
        inputSchema: {
          type: 'object',
          properties: {
            deploymentId: {
              type: 'string',
              description: 'Deployment ID to check status for',
            },
          },
          required: ['deploymentId'],
        },
      },
      {
        name: 'list_deployments',
        description: 'List all deployments',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ];
  }

  static async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      case 'deploy_from_github':
        return await this.deployFromGitHub(
          args.repositoryUrl,
          args.repositoryName,
          args.deploymentPlan,
          args.prompt,
          args.branch
        );

      case 'get_deployment_status':
        return await this.getDeploymentStatus(args.deploymentId);

      case 'list_deployments':
        return await this.listDeployments();

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private static async deployFromGitHub(
    repositoryUrl: string,
    repositoryName: string,
    deploymentPlan: any,
    prompt: string,
    branch: string = 'main'
  ): Promise<any> {
    logger.info('🚀 Starting real GitHub deployment', {
      repositoryUrl,
      repositoryName,
      branch,
      architecture: deploymentPlan.architecture,
    });

    try {
      const deployment = await this.deploymentService.deployFromGitHub(
        repositoryUrl,
        repositoryName,
        deploymentPlan,
        prompt,
        branch
      );

      return {
        deploymentId: deployment.deploymentId,
        status: deployment.status,
        message: deployment.message,
        repositoryUrl: deployment.repositoryUrl,
        awsRegion: deployment.awsRegion,
        steps: deployment.steps,
      };
    } catch (error) {
      logger.error('Deployment failed:', error);
      throw new Error(
        `Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private static async getDeploymentStatus(deploymentId: string): Promise<any> {
    const deployment = this.deploymentService.getDeploymentStatus(deploymentId);

    if (!deployment) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    return {
      deploymentId: deployment.deploymentId,
      status: deployment.status,
      message: deployment.message,
      repositoryUrl: deployment.repositoryUrl,
      awsRegion: deployment.awsRegion,
      publicUrl: deployment.publicUrl,
      instanceId: deployment.instanceId,
      error: deployment.error,
      steps: deployment.steps,
    };
  }

  private static async listDeployments(): Promise<any> {
    const deployments = this.deploymentService.getAllDeployments();

    return {
      deployments: deployments.map((d) => ({
        deploymentId: d.deploymentId,
        status: d.status,
        message: d.message,
        repositoryUrl: d.repositoryUrl,
        publicUrl: d.publicUrl,
        steps: d.steps.length,
      })),
    };
  }
}
