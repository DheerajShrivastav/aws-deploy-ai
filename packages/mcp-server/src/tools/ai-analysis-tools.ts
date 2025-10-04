import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../utils/logger.js';
import { BedrockAIService } from '../services/bedrock-ai.js';
import { GitHubService } from '../services/github.js';

interface RepositoryData {
  name: string;
  language: string;
  files: { [key: string]: string };
  packageJson?: any;
  readme?: string;
}

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

export class AIAnalysisTools {
  private static bedrockService = new BedrockAIService();
  private static githubService = new GitHubService();

  static getTools(): Tool[] {
    return [
      {
        name: 'analyze_repository',
        description:
          'Analyze a repository and generate AI-powered deployment recommendations using real repository data',
        inputSchema: {
          type: 'object',
          properties: {
            repositoryData: {
              type: 'object',
              description:
                'Repository data including name, language, files, etc.',
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
      },
      {
        name: 'analyze_github_repository',
        description:
          'Fetch and analyze a GitHub repository with real AI analysis',
        inputSchema: {
          type: 'object',
          properties: {
            owner: {
              type: 'string',
              description: 'GitHub repository owner/organization',
            },
            repo: {
              type: 'string',
              description: 'GitHub repository name',
            },
            userPrompt: {
              type: 'string',
              description: 'User requirements for deployment',
            },
          },
          required: ['owner', 'repo', 'userPrompt'],
        },
      },
    ];
  }

  static async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      case 'analyze_repository':
        return await this.analyzeRepository(
          args.repositoryData,
          args.userPrompt
        );
      case 'analyze_github_repository':
        return await this.analyzeGitHubRepository(
          args.owner,
          args.repo,
          args.userPrompt
        );
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private static async analyzeRepository(
    repoData: RepositoryData,
    userPrompt: string
  ): Promise<{ analysis: RepositoryAnalysis; deploymentPlan: DeploymentPlan }> {
    logger.info('🤖 Starting AI repository analysis with Bedrock', {
      repo: repoData.name,
      prompt: userPrompt.substring(0, 100) + '...',
    });

    try {
      // Try Bedrock AI first
      logger.info('🧠 Using AWS Bedrock for real AI analysis');
      const result = await this.bedrockService.analyzeRepository(
        repoData,
        userPrompt
      );

      logger.info('✅ Bedrock AI analysis completed successfully', {
        repo: repoData.name,
        architecture: result.deploymentPlan.architecture,
      });

      return result;
    } catch (bedrockError) {
      logger.warn('⚠️ Bedrock AI failed, falling back to local analysis', {
        error:
          bedrockError instanceof Error
            ? bedrockError.message
            : 'Unknown error',
      });

      // Fallback to local analysis if Bedrock fails
      const analysis = this.performLocalRepositoryAnalysis(repoData);
      const deploymentPlan = this.generateLocalDeploymentPlan(
        analysis,
        userPrompt,
        repoData
      );

      logger.info('✅ Local fallback analysis completed', {
        repo: repoData.name,
        architecture: deploymentPlan.architecture,
      });

      return {
        analysis,
        deploymentPlan,
      };
    }
  }

  private static async analyzeGitHubRepository(
    owner: string,
    repo: string,
    userPrompt: string
  ): Promise<{ analysis: RepositoryAnalysis; deploymentPlan: DeploymentPlan }> {
    logger.info('📦 Analyzing GitHub repository with real AI', {
      owner,
      repo,
      prompt: userPrompt.substring(0, 100) + '...',
    });

    try {
      // Fetch real repository data from GitHub
      const repoData = await this.githubService.fetchRepositoryData(
        owner,
        repo
      );

      // Analyze with Bedrock AI
      return await this.analyzeRepository(repoData, userPrompt);
    } catch (error) {
      logger.error('❌ GitHub repository analysis failed', {
        owner,
        repo,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  private static performLocalRepositoryAnalysis(
    repoData: RepositoryData
  ): RepositoryAnalysis {
    const files = Object.keys(repoData.files);

    // Detect framework and package manager
    const hasPackageJson = files.includes('package.json');
    const hasRequirementsTxt = files.includes('requirements.txt');
    const hasComposerJson = files.includes('composer.json');
    const hasDockerfile =
      files.includes('Dockerfile') || files.includes('dockerfile');

    let framework = 'Unknown';
    let packageManager = 'Unknown';
    let buildCommand = '';
    let startCommand = '';
    let port = 3000;
    const dependencies: string[] = [];
    const devDependencies: string[] = [];

    // Analyze package.json if it exists
    if (hasPackageJson && repoData.files['package.json']) {
      try {
        const packageJson = JSON.parse(repoData.files['package.json']);
        packageManager = 'npm';

        // Detect framework
        if (packageJson.dependencies) {
          if (packageJson.dependencies.react) framework = 'React';
          else if (packageJson.dependencies.next) framework = 'Next.js';
          else if (packageJson.dependencies.vue) framework = 'Vue.js';
          else if (packageJson.dependencies.angular) framework = 'Angular';
          else if (packageJson.dependencies.express) framework = 'Express.js';

          dependencies.push(...Object.keys(packageJson.dependencies));
        }

        if (packageJson.devDependencies) {
          devDependencies.push(...Object.keys(packageJson.devDependencies));
        }

        // Extract scripts
        if (packageJson.scripts) {
          buildCommand = packageJson.scripts.build || 'npm run build';
          startCommand = packageJson.scripts.start || 'npm start';
        }
      } catch (e) {
        logger.warn('Failed to parse package.json', {
          error: e instanceof Error ? e.message : 'Unknown parsing error',
        });
      }
    }

    // Python detection
    if (hasRequirementsTxt) {
      packageManager = 'pip';
      framework = 'Python';
      buildCommand = 'pip install -r requirements.txt';
      startCommand = 'python app.py';
      port = 5000;
    }

    // PHP detection
    if (hasComposerJson) {
      packageManager = 'composer';
      framework = 'PHP';
      buildCommand = 'composer install';
      startCommand = 'php index.php';
      port = 8000;
    }

    // Check for static assets
    const staticAssets = files.some(
      (file) =>
        file.endsWith('.css') ||
        file.endsWith('.js') ||
        file.endsWith('.html') ||
        file.includes('public/') ||
        file.includes('static/')
    );

    // Check for environment variables
    const hasEnvVariables = files.some(
      (file) => file.includes('.env') || file.includes('config')
    );

    // Simple database detection
    const hasDatabase =
      dependencies.some(
        (dep) =>
          dep.includes('mysql') ||
          dep.includes('postgres') ||
          dep.includes('mongodb') ||
          dep.includes('sqlite')
      ) ||
      (repoData.readme?.toLowerCase().includes('database') ?? false);

    return {
      language: repoData.language,
      framework,
      packageManager,
      hasDatabase,
      hasEnvVariables,
      buildCommand,
      startCommand,
      port,
      dependencies,
      devDependencies,
      staticAssets,
      hasDockerfile,
    };
  }

  private static generateLocalDeploymentPlan(
    analysis: RepositoryAnalysis,
    userPrompt: string,
    repoData: RepositoryData
  ): DeploymentPlan {
    const isStaticSite = analysis.staticAssets && !analysis.hasDatabase;
    const isServerless =
      analysis.framework === 'Next.js' ||
      userPrompt.toLowerCase().includes('serverless');
    const needsDatabase =
      analysis.hasDatabase || userPrompt.toLowerCase().includes('database');
    const needsScaling =
      userPrompt.toLowerCase().includes('scale') ||
      userPrompt.toLowerCase().includes('auto-scaling');

    let architecture = 'Basic Web Application';
    const services: any[] = [];
    const steps: any[] = [];
    let estimatedCost = '$5-15';

    if (isStaticSite) {
      architecture = 'Static Website Hosting';
      services.push({
        name: 'S3 Static Hosting',
        type: 'S3 + CloudFront',
        purpose: 'Host static files with global CDN',
        estimated_cost: '$1-5/month',
      });

      steps.push({
        step: 1,
        action: 'Setup S3 Bucket',
        description: 'Create S3 bucket for static website hosting',
        resources: [
          'S3 Bucket',
          'Bucket Policy',
          'Static Website Configuration',
        ],
      });

      steps.push({
        step: 2,
        action: 'Configure CloudFront',
        description: 'Setup CDN for global content delivery',
        resources: ['CloudFront Distribution', 'SSL Certificate'],
      });

      estimatedCost = '$1-10';
    } else if (isServerless) {
      architecture = 'Serverless Application';
      services.push({
        name: 'Lambda Functions',
        type: 'AWS Lambda',
        purpose: 'Serverless compute for API endpoints',
        estimated_cost: '$2-20/month',
      });

      services.push({
        name: 'API Gateway',
        type: 'API Gateway',
        purpose: 'HTTP API routing and management',
        estimated_cost: '$1-10/month',
      });

      estimatedCost = '$5-50';
    } else {
      architecture = 'Container-based Application';

      if (needsScaling) {
        services.push({
          name: 'ECS Fargate',
          type: 'ECS + Fargate',
          purpose: 'Managed container hosting with auto-scaling',
          estimated_cost: '$20-100/month',
        });

        services.push({
          name: 'Application Load Balancer',
          type: 'ALB',
          purpose: 'Load balancing and SSL termination',
          estimated_cost: '$15-25/month',
        });

        estimatedCost = '$50-200';
      } else {
        services.push({
          name: 'EC2 Instance',
          type: 'EC2 t3.micro',
          purpose: 'Basic application hosting',
          estimated_cost: '$8-15/month',
        });

        estimatedCost = '$10-30';
      }
    }

    if (needsDatabase) {
      if (userPrompt.toLowerCase().includes('postgres')) {
        services.push({
          name: 'PostgreSQL Database',
          type: 'RDS PostgreSQL',
          purpose: 'Managed PostgreSQL database',
          estimated_cost: '$15-50/month',
        });
      } else {
        services.push({
          name: 'MySQL Database',
          type: 'RDS MySQL',
          purpose: 'Managed MySQL database',
          estimated_cost: '$15-50/month',
        });
      }
    }

    // Generate deployment steps
    if (!isStaticSite) {
      steps.push({
        step: steps.length + 1,
        action: 'Container Setup',
        description: 'Build and configure application container',
        resources: ['Docker Image', 'ECR Repository'],
      });

      steps.push({
        step: steps.length + 1,
        action: 'Deploy Application',
        description: 'Deploy application to AWS infrastructure',
        resources: ['ECS Service', 'Task Definition'],
      });
    }

    const requirements = [
      'AWS Account with appropriate permissions',
      'Domain name (optional)',
      'SSL certificate for HTTPS',
    ];

    const recommendations = [
      'Enable CloudWatch monitoring for performance insights',
      'Set up automated backups',
      'Configure CI/CD pipeline for automated deployments',
      'Implement proper security groups and IAM roles',
    ];

    if (analysis.hasEnvVariables) {
      recommendations.push(
        'Use AWS Systems Manager Parameter Store for environment variables'
      );
    }

    return {
      architecture,
      services,
      steps,
      estimated_monthly_cost: estimatedCost,
      deployment_time: isStaticSite ? '10-20 minutes' : '20-45 minutes',
      requirements,
      recommendations,
    };
  }
}
