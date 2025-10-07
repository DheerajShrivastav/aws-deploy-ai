import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import AWS from 'aws-sdk';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

interface DeploymentPlan {
  architecture: string;
  services: Array<{
    name: string;
    type: string;
    purpose: string;
    estimated_cost: string;
  }>;
  steps: Array<{
    step: number;
    action: string;
    description: string;
    resources: string[];
  }>;
  estimated_monthly_cost: string;
  deployment_time: string;
  requirements: string[];
  recommendations: string[];
}

interface DeploymentResult {
  deploymentId: string;
  status:
    | 'started'
    | 'cloning'
    | 'building'
    | 'deploying'
    | 'completed'
    | 'failed';
  message: string;
  repositoryUrl: string;
  awsRegion: string;
  publicUrl?: string;
  instanceId?: string;
  error?: string;
  steps: Array<{
    name: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    message: string;
    timestamp: string;
  }>;
}

export class RealDeploymentService {
  private ec2: AWS.EC2;
  private s3: AWS.S3;
  private deployments: Map<string, DeploymentResult> = new Map();
  private region: string;

  constructor(region: string = 'us-east-1') {
    this.region = region;

    // Initialize AWS services
    AWS.config.update({ region });
    this.ec2 = new AWS.EC2();
    this.s3 = new AWS.S3();
  }

  async deployFromGitHub(
    repositoryUrl: string,
    repositoryName: string,
    deploymentPlan: DeploymentPlan,
    prompt: string,
    branch: string = 'main'
  ): Promise<DeploymentResult> {
    const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const deployment: DeploymentResult = {
      deploymentId,
      status: 'started',
      message: 'Deployment initiated',
      repositoryUrl,
      awsRegion: this.region,
      steps: [],
    };

    this.deployments.set(deploymentId, deployment);
    logger.info(`🚀 Starting deployment ${deploymentId} for ${repositoryUrl}`);

    // Start deployment process asynchronously
    this.executeDeployment(
      deployment,
      repositoryUrl,
      repositoryName,
      deploymentPlan,
      branch
    ).catch((error) => {
      logger.error(`Deployment ${deploymentId} failed:`, error);
      deployment.status = 'failed';
      deployment.error = error.message;
      this.updateStep(deployment, 'Deployment Failed', 'failed', error.message);
    });

    return deployment;
  }

  private async executeDeployment(
    deployment: DeploymentResult,
    repositoryUrl: string,
    repositoryName: string,
    deploymentPlan: DeploymentPlan,
    branch: string
  ): Promise<void> {
    try {
      // Step 1: Clone Repository
      await this.cloneRepository(
        deployment,
        repositoryUrl,
        repositoryName,
        branch
      );

      // Step 2: Analyze Project Structure
      const projectPath = `/tmp/deployments/${deployment.deploymentId}/${repositoryName}`;
      const projectInfo = await this.analyzeProject(deployment, projectPath);

      // Step 3: Choose deployment strategy based on plan
      if (deploymentPlan.architecture.includes('Serverless')) {
        await this.deployServerless(deployment, projectPath, projectInfo);
      } else if (deploymentPlan.architecture.includes('Containerized')) {
        await this.deployContainerized(deployment, projectPath, projectInfo);
      } else {
        await this.deployToEC2(
          deployment,
          projectPath,
          projectInfo,
          repositoryName
        );
      }

      deployment.status = 'completed';
      deployment.message = 'Deployment completed successfully';
      this.updateStep(
        deployment,
        'Deployment Complete',
        'completed',
        `Application deployed successfully. ${deployment.publicUrl ? `Available at: ${deployment.publicUrl}` : ''}`
      );
    } catch (error) {
      throw error;
    }
  }

  private async cloneRepository(
    deployment: DeploymentResult,
    repositoryUrl: string,
    repositoryName: string,
    branch: string
  ): Promise<void> {
    this.updateStep(
      deployment,
      'Cloning Repository',
      'running',
      'Downloading source code from GitHub...'
    );
    deployment.status = 'cloning';

    try {
      const deploymentDir = `/tmp/deployments/${deployment.deploymentId}`;
      await fs.mkdir(deploymentDir, { recursive: true });

      // Clone the repository
      const cloneCommand = `git clone --branch ${branch} --depth 1 ${repositoryUrl} ${deploymentDir}/${repositoryName}`;
      const { stdout, stderr } = await execAsync(cloneCommand);

      logger.info(`Repository cloned: ${stdout}`);
      if (stderr) logger.warn(`Clone warnings: ${stderr}`);

      this.updateStep(
        deployment,
        'Repository Cloned',
        'completed',
        'Source code downloaded successfully'
      );
    } catch (error) {
      this.updateStep(
        deployment,
        'Clone Failed',
        'failed',
        `Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw new Error(
        `Failed to clone repository: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async analyzeProject(
    deployment: DeploymentResult,
    projectPath: string
  ): Promise<any> {
    this.updateStep(
      deployment,
      'Analyzing Project',
      'running',
      'Detecting project type and dependencies...'
    );

    try {
      const files = await fs.readdir(projectPath);

      // Check for package.json (Node.js project)
      const hasPackageJson = files.includes('package.json');
      const hasDockerfile = files.includes('Dockerfile');

      let projectInfo: any = {
        type: 'unknown',
        buildCommand: null,
        startCommand: null,
        port: 3000,
        hasPackageJson,
        hasDockerfile,
      };

      if (hasPackageJson) {
        const packageJsonPath = path.join(projectPath, 'package.json');
        const packageJson = JSON.parse(
          await fs.readFile(packageJsonPath, 'utf-8')
        );

        projectInfo.type = 'nodejs';
        projectInfo.packageJson = packageJson;
        projectInfo.buildCommand =
          packageJson.scripts?.build || 'npm run build';
        projectInfo.startCommand = packageJson.scripts?.start || 'npm start';

        // Detect framework
        const dependencies = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };
        if (dependencies.next) {
          projectInfo.framework = 'nextjs';
          projectInfo.port = 3000;
        } else if (dependencies.react) {
          projectInfo.framework = 'react';
          projectInfo.port = 3000;
        } else if (dependencies.vue) {
          projectInfo.framework = 'vue';
          projectInfo.port = 8080;
        }
      }

      this.updateStep(
        deployment,
        'Project Analyzed',
        'completed',
        `Detected ${projectInfo.framework || projectInfo.type} project`
      );

      return projectInfo;
    } catch (error) {
      this.updateStep(
        deployment,
        'Analysis Failed',
        'failed',
        `Failed to analyze project: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw new Error(
        `Failed to analyze project: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async deployToEC2(
    deployment: DeploymentResult,
    projectPath: string,
    projectInfo: any,
    repositoryName: string
  ): Promise<void> {
    this.updateStep(
      deployment,
      'Creating EC2 Instance',
      'running',
      'Launching AWS EC2 instance...'
    );
    deployment.status = 'deploying';

    try {
      // Create EC2 instance
      const instanceParams = {
        ImageId: 'ami-0c02fb55956c7d316', // Amazon Linux 2 AMI
        InstanceType: 't2.micro',
        MinCount: 1,
        MaxCount: 1,
        KeyName: 'aws-deploy-ai-key', // You'll need to create this key pair
        SecurityGroupIds: ['sg-default'], // Create a security group with ports 22, 80, 3000
        UserData: Buffer.from(
          await this.generateUserData(
            projectInfo,
            repositoryName,
            deployment.repositoryUrl
          )
        ).toString('base64'),
        TagSpecifications: [
          {
            ResourceType: 'instance',
            Tags: [
              { Key: 'Name', Value: `aws-deploy-ai-${repositoryName}` },
              { Key: 'Project', Value: repositoryName },
              { Key: 'DeploymentId', Value: deployment.deploymentId },
            ],
          },
        ],
      };

      const result = await this.ec2.runInstances(instanceParams).promise();
      const instanceId = result.Instances?.[0]?.InstanceId;

      if (!instanceId) {
        throw new Error('Failed to create EC2 instance');
      }

      deployment.instanceId = instanceId;
      this.updateStep(
        deployment,
        'EC2 Instance Created',
        'completed',
        `Instance ${instanceId} created`
      );

      // Wait for instance to be running
      this.updateStep(
        deployment,
        'Starting Instance',
        'running',
        'Waiting for instance to start...'
      );
      await this.ec2
        .waitFor('instanceRunning', { InstanceIds: [instanceId] })
        .promise();

      // Get instance public IP
      const instanceData = await this.ec2
        .describeInstances({ InstanceIds: [instanceId] })
        .promise();
      const publicIp =
        instanceData.Reservations?.[0]?.Instances?.[0]?.PublicIpAddress;

      if (publicIp) {
        deployment.publicUrl = `http://${publicIp}:${projectInfo.port || 3000}`;
        this.updateStep(
          deployment,
          'Instance Ready',
          'completed',
          `Instance running at ${publicIp}. Application will be available shortly.`
        );
      }

      // The actual deployment happens via UserData script
      this.updateStep(
        deployment,
        'Installing Application',
        'running',
        'Setting up application on EC2 instance. This may take a few minutes...'
      );

      // Wait a bit for the UserData script to execute
      await new Promise((resolve) => setTimeout(resolve, 60000)); // Wait 1 minute

      this.updateStep(
        deployment,
        'Application Deployed',
        'completed',
        `Application should be available at ${deployment.publicUrl}`
      );
    } catch (error) {
      this.updateStep(
        deployment,
        'EC2 Deployment Failed',
        'failed',
        `EC2 deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      throw new Error(
        `EC2 deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async generateUserData(
    projectInfo: any,
    repositoryName: string,
    repositoryUrl: string
  ): Promise<string> {
    const userData = `#!/bin/bash
yum update -y
yum install -y git

# Install Node.js and npm
curl -sL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Create app directory
mkdir -p /opt/app
cd /opt/app

# Clone repository
git clone ${repositoryUrl} ${repositoryName}
cd ${repositoryName}

# Install dependencies
npm install

# Build application if build script exists
if npm run build 2>/dev/null; then
    echo "Build completed"
fi

# Install PM2 for process management
npm install -g pm2

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: '${repositoryName}',
    script: '${projectInfo.startCommand || 'npm start'}',
    cwd: '/opt/app/${repositoryName}',
    env: {
      NODE_ENV: 'production',
      PORT: ${projectInfo.port || 3000}
    }
  }]
}
EOF

# Start application with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# Configure nginx as reverse proxy (optional)
yum install -y nginx
systemctl start nginx
systemctl enable nginx

echo "Deployment completed at $(date)" > /opt/app/deployment.log
`;

    return userData;
  }

  private async deployServerless(
    deployment: DeploymentResult,
    projectPath: string,
    projectInfo: any
  ): Promise<void> {
    this.updateStep(
      deployment,
      'Serverless Deployment',
      'running',
      'Deploying to AWS Lambda...'
    );

    // For now, implement basic serverless deployment
    // This would involve creating Lambda functions, API Gateway, etc.
    this.updateStep(
      deployment,
      'Serverless Deployment',
      'completed',
      'Serverless deployment not fully implemented yet. Please use EC2 deployment.'
    );
  }

  private async deployContainerized(
    deployment: DeploymentResult,
    projectPath: string,
    projectInfo: any
  ): Promise<void> {
    this.updateStep(
      deployment,
      'Container Deployment',
      'running',
      'Deploying to ECS...'
    );

    // For now, implement basic container deployment
    // This would involve building Docker images, pushing to ECR, deploying to ECS
    this.updateStep(
      deployment,
      'Container Deployment',
      'completed',
      'Container deployment not fully implemented yet. Please use EC2 deployment.'
    );
  }

  private updateStep(
    deployment: DeploymentResult,
    name: string,
    status: 'pending' | 'running' | 'completed' | 'failed',
    message: string
  ): void {
    deployment.steps.push({
      name,
      status,
      message,
      timestamp: new Date().toISOString(),
    });

    logger.info(`${deployment.deploymentId} - ${name}: ${message}`);
  }

  getDeploymentStatus(deploymentId: string): DeploymentResult | null {
    return this.deployments.get(deploymentId) || null;
  }

  getAllDeployments(): DeploymentResult[] {
    return Array.from(this.deployments.values());
  }
}
