import {
  LambdaClient,
  CreateFunctionCommand,
  UpdateFunctionCodeCommand,
  GetFunctionCommand,
  CreateFunctionCommandInput,
} from '@aws-sdk/client-lambda';
import {
  IAMClient,
  CreateRoleCommand,
  AttachRolePolicyCommand,
} from '@aws-sdk/client-iam';
import { AWSResource } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { generateResourceName, createAwsTags } from '../utils/helpers.js';
import archiver from 'archiver';
import { Readable } from 'stream';

export class LambdaService {
  private lambdaClient: LambdaClient;
  private iamClient: IAMClient;
  private region: string;

  constructor(region: string = 'us-east-1') {
    this.region = region;
    this.lambdaClient = new LambdaClient({ region });
    this.iamClient = new IAMClient({ region });
  }

  /**
   * Create Lambda function for API endpoints
   */
  async createFunction(
    projectName: string,
    environment: string,
    runtime: string = 'nodejs18.x',
    code?: string,
    handler: string = 'index.handler'
  ): Promise<AWSResource> {
    const functionName = generateResourceName(projectName, 'api', environment);

    logger.info(`Creating Lambda function: ${functionName}`);

    try {
      // Create IAM role for Lambda
      const roleArn = await this.createLambdaRole(projectName, environment);

      // Prepare function code
      const zipBuffer = await this.createCodeZip(
        code || this.getDefaultLambdaCode()
      );

      const functionConfig: CreateFunctionCommandInput = {
        FunctionName: functionName,
        Runtime: runtime as any,
        Role: roleArn,
        Handler: handler,
        Code: {
          ZipFile: zipBuffer,
        },
        Description: `API function for ${projectName} (${environment})`,
        Timeout: 30,
        MemorySize: 128,
        Environment: {
          Variables: {
            NODE_ENV: environment,
            PROJECT_NAME: projectName,
          },
        },
        Tags: createAwsTags(projectName, environment, {
          ResourceType: 'api-function',
        }),
      };

      const command = new CreateFunctionCommand(functionConfig);
      const result = await this.lambdaClient.send(command);

      if (!result.FunctionArn) {
        throw new Error('Failed to create Lambda function');
      }

      const resource: AWSResource = {
        id: functionName,
        type: 'Lambda::Function',
        arn: result.FunctionArn,
        region: this.region,
        status: 'active',
        tags: createAwsTags(projectName, environment, {
          ResourceType: 'lambda-function',
        }),
      };

      logger.info(`Successfully created Lambda function: ${functionName}`);
      return resource;
    } catch (error) {
      logger.error(`Failed to create Lambda function: ${functionName}`, {
        error,
      });
      throw new Error(
        `Lambda function creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Create IAM role for Lambda function
   */
  private async createLambdaRole(
    projectName: string,
    environment: string
  ): Promise<string> {
    const roleName = generateResourceName(
      projectName,
      'lambda-role',
      environment
    );

    try {
      const assumeRolePolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'lambda.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        ],
      };

      const createRoleCommand = new CreateRoleCommand({
        RoleName: roleName,
        AssumeRolePolicyDocument: JSON.stringify(assumeRolePolicy),
        Description: `Lambda execution role for ${projectName}`,
        Tags: Object.entries(
          createAwsTags(projectName, environment, {
            ResourceType: 'lambda-role',
          })
        ).map(([Key, Value]) => ({ Key, Value })),
      });

      const roleResult = await this.iamClient.send(createRoleCommand);

      // Attach basic Lambda execution policy
      const attachPolicyCommand = new AttachRolePolicyCommand({
        RoleName: roleName,
        PolicyArn:
          'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
      });

      await this.iamClient.send(attachPolicyCommand);

      // Wait a moment for role to propagate
      await this.delay(10000);

      return roleResult.Role?.Arn || '';
    } catch (error) {
      logger.error(`Failed to create Lambda IAM role: ${roleName}`, { error });
      throw error;
    }
  }

  /**
   * Create ZIP archive for Lambda code
   */
  private async createCodeZip(code: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      const chunks: Buffer[] = [];

      archive.on('data', (chunk) => {
        chunks.push(chunk);
      });

      archive.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      archive.on('error', (error) => {
        reject(error);
      });

      // Add the code as index.js
      archive.append(code, { name: 'index.js' });
      archive.finalize();
    });
  }

  /**
   * Get default Lambda function code
   */
  private getDefaultLambdaCode(): string {
    return `
const AWS = require('aws-sdk');

exports.handler = async (event, context) => {
    console.log('Event:', JSON.stringify(event, null, 2));
    
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        // Parse request
        const method = event.httpMethod;
        const path = event.path;
        const body = event.body ? JSON.parse(event.body) : null;
        const queryParams = event.queryStringParameters || {};

        // Simple routing
        if (method === 'GET' && path === '/api/health') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    project: process.env.PROJECT_NAME || 'unknown'
                })
            };
        }

        if (method === 'GET' && path === '/api/info') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    message: 'Welcome to your AWS Deploy AI API!',
                    version: '1.0.0',
                    environment: process.env.NODE_ENV || 'development',
                    timestamp: new Date().toISOString()
                })
            };
        }

        if (method === 'POST' && path === '/api/echo') {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    echo: body,
                    timestamp: new Date().toISOString()
                })
            };
        }

        // Default 404 response
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
                error: 'Not Found',
                message: \`Endpoint \${method} \${path} not found\`,
                availableEndpoints: [
                    'GET /api/health',
                    'GET /api/info',
                    'POST /api/echo'
                ]
            })
        };

    } catch (error) {
        console.error('Error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: 'Internal Server Error',
                message: error.message,
                timestamp: new Date().toISOString()
            })
        };
    }
};
    `.trim();
  }

  /**
   * Update Lambda function code
   */
  async updateFunctionCode(functionName: string, code: string): Promise<void> {
    logger.info(`Updating Lambda function code: ${functionName}`);

    try {
      const zipBuffer = await this.createCodeZip(code);

      const command = new UpdateFunctionCodeCommand({
        FunctionName: functionName,
        ZipFile: zipBuffer,
      });

      await this.lambdaClient.send(command);
      logger.info(`Successfully updated Lambda function code: ${functionName}`);
    } catch (error) {
      logger.error(`Failed to update Lambda function code: ${functionName}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Get Lambda function info
   */
  async getFunctionInfo(functionName: string): Promise<{
    arn: string;
    status: string;
    lastModified: string;
    codeSize: number;
    timeout: number;
    memorySize: number;
  }> {
    try {
      const command = new GetFunctionCommand({
        FunctionName: functionName,
      });

      const result = await this.lambdaClient.send(command);

      if (!result.Configuration) {
        throw new Error('Function configuration not found');
      }

      const config = result.Configuration;

      return {
        arn: config.FunctionArn!,
        status: config.State!,
        lastModified: config.LastModified!,
        codeSize: config.CodeSize!,
        timeout: config.Timeout!,
        memorySize: config.MemorySize!,
      };
    } catch (error) {
      logger.error(`Failed to get Lambda function info: ${functionName}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Generate Lambda function for different project types
   */
  generateFunctionCode(projectType: string): string {
    switch (projectType) {
      case 'ecommerce':
        return this.getEcommerceLambdaCode();
      case 'blog':
        return this.getBlogLambdaCode();
      case 'api':
        return this.getAPILambdaCode();
      default:
        return this.getDefaultLambdaCode();
    }
  }

  private getEcommerceLambdaCode(): string {
    // Add e-commerce specific endpoints
    return (
      this.getDefaultLambdaCode() +
      `
// E-commerce specific endpoints would be added here
// Example: product management, cart operations, etc.
    `
    );
  }

  private getBlogLambdaCode(): string {
    // Add blog specific endpoints
    return (
      this.getDefaultLambdaCode() +
      `
// Blog specific endpoints would be added here
// Example: post management, comments, etc.
    `
    );
  }

  private getAPILambdaCode(): string {
    // More comprehensive API functionality
    return this.getDefaultLambdaCode();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
