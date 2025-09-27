import { z } from 'zod';
import { AIPromptInterpreter } from '../services/ai-interpreter.js';
import { S3Service } from '../services/s3-service.js';
import { CloudFrontService } from '../services/cloudfront-service.js';
import { LambdaService } from '../services/lambda-service.js';
import {
  DeploymentRequest,
  DeploymentStatus,
  DeploymentState,
  ParsedDeploymentIntent,
  ProjectType,
  AWSResource,
} from '../types/index.js';
import { logger } from '../utils/logger.js';
import {
  generateDeploymentId,
  createDeploymentStatus,
  updateDeploymentStep,
  sanitizeProjectName,
} from '../utils/helpers.js';

export class DeploymentTools {
  private aiInterpreter: AIPromptInterpreter;
  private s3Service: S3Service;
  private cloudFrontService: CloudFrontService;
  private lambdaService: LambdaService;
  private deploymentStatuses: Map<string, DeploymentStatus> = new Map();

  constructor(region: string = 'us-east-1') {
    this.aiInterpreter = new AIPromptInterpreter();
    this.s3Service = new S3Service(region);
    this.cloudFrontService = new CloudFrontService(region);
    this.lambdaService = new LambdaService(region);
  }

  /**
   * MCP Tool: Deploy Website
   * Main deployment orchestration tool
   */
  async deployWebsite(params: {
    prompt: string;
    projectName?: string;
    customDomain?: string;
    environment?: 'development' | 'staging' | 'production';
    files?: Array<{
      name: string;
      content: string;
      contentType: string;
      path: string;
    }>;
  }) {
    const deploymentId = generateDeploymentId();
    logger.info(`Starting deployment: ${deploymentId}`, { params });

    try {
      // Create deployment request
      const request: DeploymentRequest = {
        id: deploymentId,
        prompt: params.prompt,
        projectName: params.projectName,
        customDomain: params.customDomain,
        environment: params.environment || 'production',
        timestamp: new Date(),
        files: params.files?.map((f) => ({
          name: f.name,
          content: f.content,
          contentType: f.contentType,
          size: Buffer.byteLength(f.content),
          path: f.path,
        })),
      };

      // Initialize deployment status
      const steps = this.getDeploymentSteps(params.prompt);
      const status = createDeploymentStatus(deploymentId, steps);
      this.deploymentStatuses.set(deploymentId, status);

      // Start deployment process
      this.executeDeployment(request).catch((error) => {
        logger.error(`Deployment failed: ${deploymentId}`, { error });
        status.status = DeploymentState.FAILED;
        status.error = {
          code: 'DEPLOYMENT_FAILED',
          message: error.message,
          details: error.stack || '',
          recoverable: true,
          suggestions: [
            'Check AWS credentials',
            'Verify resource quotas',
            'Retry deployment',
          ],
        };
      });

      return {
        deploymentId,
        status: status.status,
        message: 'Deployment started successfully',
        trackingUrl: `/deployment/${deploymentId}`,
      };
    } catch (error) {
      logger.error(`Failed to start deployment`, { error, params });
      throw new Error(
        `Deployment initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * MCP Tool: Get Deployment Status
   */
  async getDeploymentStatus(deploymentId: string) {
    const status = this.deploymentStatuses.get(deploymentId);

    if (!status) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    return {
      id: status.id,
      status: status.status,
      progress: status.progress,
      currentStep: status.currentStep,
      steps: status.steps.map((step) => ({
        name: step.name,
        description: step.description,
        status: step.status,
        startTime: step.startTime,
        endTime: step.endTime,
        output: step.output,
        error: step.error,
      })),
      resources: status.resources,
      urls: status.urls,
      error: status.error,
      startTime: status.startTime,
      endTime: status.endTime,
      estimatedCompletion: status.estimatedCompletion,
    };
  }

  /**
   * MCP Tool: Analyze Deployment Requirements
   */
  async analyzeDeployment(prompt: string) {
    try {
      logger.info('Analyzing deployment requirements', { prompt });

      const tempRequest: DeploymentRequest = {
        id: 'analysis-' + Date.now(),
        prompt,
        timestamp: new Date(),
      };

      const intent =
        await this.aiInterpreter.parseDeploymentIntent(tempRequest);
      const recommendations =
        await this.aiInterpreter.generateRecommendations(intent);

      return {
        projectType: intent.projectType,
        infrastructure: intent.infrastructure,
        estimatedCost: intent.estimatedCost,
        features: intent.features,
        recommendations,
        deploymentSteps: this.getDeploymentSteps(prompt),
        estimatedTime: this.estimateDeploymentTime(intent),
      };
    } catch (error) {
      logger.error('Failed to analyze deployment', { error, prompt });
      throw new Error(
        `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * MCP Tool: List Active Deployments
   */
  async listDeployments() {
    const deployments = Array.from(this.deploymentStatuses.values()).map(
      (status) => ({
        id: status.id,
        status: status.status,
        progress: status.progress,
        startTime: status.startTime,
        endTime: status.endTime,
        resourceCount: status.resources.length,
      })
    );

    return {
      total: deployments.length,
      active: deployments.filter(
        (d) =>
          d.status === DeploymentState.PROVISIONING ||
          d.status === DeploymentState.DEPLOYING
      ).length,
      completed: deployments.filter(
        (d) => d.status === DeploymentState.COMPLETED
      ).length,
      failed: deployments.filter((d) => d.status === DeploymentState.FAILED)
        .length,
      deployments,
    };
  }

  /**
   * MCP Tool: Get Cost Estimate
   */
  async getCostEstimate(prompt: string) {
    try {
      const tempRequest: DeploymentRequest = {
        id: 'cost-analysis-' + Date.now(),
        prompt,
        timestamp: new Date(),
      };

      const intent =
        await this.aiInterpreter.parseDeploymentIntent(tempRequest);

      return {
        monthly: intent.estimatedCost.monthly,
        yearly: intent.estimatedCost.yearly,
        currency: intent.estimatedCost.currency,
        breakdown: intent.estimatedCost.breakdown,
        comparison: this.generateCostComparison(intent.estimatedCost.monthly),
        optimizationTips: await this.getCostOptimizationTips(intent),
      };
    } catch (error) {
      logger.error('Failed to estimate costs', { error, prompt });
      throw new Error(
        `Cost estimation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Execute the actual deployment process
   */
  private async executeDeployment(request: DeploymentRequest): Promise<void> {
    const status = this.deploymentStatuses.get(request.id)!;
    const projectName = sanitizeProjectName(
      request.projectName || 'aws-deploy-ai-project'
    );

    try {
      // Step 1: Parse deployment intent
      updateDeploymentStep(status, 'Parse Intent', 'running');
      const intent = await this.aiInterpreter.parseDeploymentIntent(request);
      updateDeploymentStep(
        status,
        'Parse Intent',
        'completed',
        JSON.stringify(intent, null, 2)
      );

      // Step 2: Create S3 bucket
      updateDeploymentStep(status, 'Create S3 Bucket', 'running');
      const bucketResource = await this.s3Service.createWebsiteBucket(
        projectName,
        request.environment || 'production'
      );
      status.resources.push(bucketResource);

      // Upload files or create default content
      const files = request.files || [
        {
          name: 'index.html',
          content: this.s3Service.generateDefaultIndexHtml(projectName),
          contentType: 'text/html',
          size: 0,
          path: 'index.html',
        },
        {
          name: 'error.html',
          content: this.s3Service.generateDefaultErrorHtml(),
          contentType: 'text/html',
          size: 0,
          path: 'error.html',
        },
      ];

      await this.s3Service.uploadFiles(bucketResource.id, files);
      updateDeploymentStep(
        status,
        'Create S3 Bucket',
        'completed',
        `Bucket created: ${bucketResource.id}`
      );

      // Step 3: Create CloudFront distribution (if CDN is required)
      if (intent.infrastructure.cdn) {
        updateDeploymentStep(status, 'Configure CloudFront', 'running');
        const cdnResource = await this.cloudFrontService.createDistribution(
          bucketResource.id,
          projectName,
          request.environment || 'production',
          request.customDomain
        );
        status.resources.push(cdnResource);
        updateDeploymentStep(
          status,
          'Configure CloudFront',
          'completed',
          `Distribution created: ${cdnResource.id}`
        );
      }

      // Step 4: Create Lambda function (if serverless compute is needed)
      if (intent.infrastructure.compute.type === 'serverless') {
        updateDeploymentStep(status, 'Create Lambda', 'running');
        const lambdaResource = await this.lambdaService.createFunction(
          projectName,
          request.environment || 'production',
          intent.infrastructure.compute.runtime || 'nodejs18.x'
        );
        status.resources.push(lambdaResource);
        updateDeploymentStep(
          status,
          'Create Lambda',
          'completed',
          `Function created: ${lambdaResource.id}`
        );
      }

      // Step 5: Generate URLs
      status.urls = await this.generateDeploymentUrls(
        status.resources,
        bucketResource.id
      );

      // Final step: Mark as completed
      status.status = DeploymentState.COMPLETED;
      status.endTime = new Date();
      status.progress = 100;

      logger.info(`Deployment completed successfully: ${request.id}`);
    } catch (error) {
      logger.error(`Deployment execution failed: ${request.id}`, { error });
      status.status = DeploymentState.FAILED;
      status.error = {
        code: 'EXECUTION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack || '' : '',
        recoverable: true,
        suggestions: [
          'Check AWS permissions',
          'Verify resource limits',
          'Contact support',
        ],
      };
      throw error;
    }
  }

  private getDeploymentSteps(prompt: string): string[] {
    // Analyze prompt to determine required steps
    const baseSteps = ['Parse Intent', 'Create S3 Bucket'];

    if (
      prompt.toLowerCase().includes('cdn') ||
      prompt.toLowerCase().includes('fast')
    ) {
      baseSteps.push('Configure CloudFront');
    }

    if (
      prompt.toLowerCase().includes('api') ||
      prompt.toLowerCase().includes('serverless')
    ) {
      baseSteps.push('Create Lambda');
    }

    if (prompt.toLowerCase().includes('domain')) {
      baseSteps.push('Configure Domain');
    }

    baseSteps.push('Deploy Application');

    return baseSteps;
  }

  private estimateDeploymentTime(intent: ParsedDeploymentIntent): number {
    let timeMs = 60000; // Base 1 minute

    if (intent.infrastructure.cdn) {
      timeMs += 300000; // +5 minutes for CloudFront
    }

    if (intent.infrastructure.compute.type === 'serverless') {
      timeMs += 120000; // +2 minutes for Lambda
    }

    if (intent.domain) {
      timeMs += 180000; // +3 minutes for domain setup
    }

    return timeMs;
  }

  private generateCostComparison(monthlyCost: number): any {
    return {
      vs_traditional_hosting: {
        savings: Math.max(0, 25 - monthlyCost),
        percentage: Math.round(((25 - monthlyCost) / 25) * 100),
      },
      vs_vps: {
        savings: Math.max(0, 50 - monthlyCost),
        percentage: Math.round(((50 - monthlyCost) / 50) * 100),
      },
    };
  }

  private async getCostOptimizationTips(
    intent: ParsedDeploymentIntent
  ): Promise<string[]> {
    const tips = [];

    if (intent.infrastructure.cdn) {
      tips.push('Use CloudFront caching to reduce data transfer costs');
    }

    if (intent.infrastructure.storage.size > 1000) {
      tips.push('Consider S3 Intelligent Tiering for large storage needs');
    }

    if (intent.infrastructure.compute.type === 'serverless') {
      tips.push('Optimize Lambda memory allocation based on actual usage');
    }

    return tips;
  }

  private async generateDeploymentUrls(
    resources: AWSResource[],
    bucketName: string
  ): Promise<string[]> {
    const urls: string[] = [];

    // S3 website URL
    const s3Url = await this.s3Service.getWebsiteUrl(bucketName);
    urls.push(s3Url);

    // CloudFront URL (if exists)
    const cdnResource = resources.find(
      (r) => r.type === 'CloudFront::Distribution'
    );
    if (cdnResource) {
      const cdnInfo = await this.cloudFrontService.getDistributionInfo(
        cdnResource.id
      );
      urls.push(cdnInfo.url);
    }

    return urls;
  }

  /**
   * Get Zod schemas for MCP tool validation
   */
  static getToolSchemas() {
    return {
      deployWebsite: {
        prompt: z
          .string()
          .describe('Natural language description of what to deploy'),
        projectName: z.string().optional().describe('Name of the project'),
        customDomain: z.string().optional().describe('Custom domain name'),
        environment: z
          .enum(['development', 'staging', 'production'])
          .optional(),
        files: z
          .array(
            z.object({
              name: z.string(),
              content: z.string(),
              contentType: z.string(),
              path: z.string(),
            })
          )
          .optional(),
      },
      getDeploymentStatus: {
        deploymentId: z.string().describe('Deployment ID to check'),
      },
      analyzeDeployment: {
        prompt: z.string().describe('Deployment requirements to analyze'),
      },
      getCostEstimate: {
        prompt: z
          .string()
          .describe('Deployment requirements for cost estimation'),
      },
    };
  }
}
