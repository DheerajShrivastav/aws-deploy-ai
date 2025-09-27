import {
  CloudFrontClient,
  CreateDistributionCommand,
  GetDistributionCommand,
  CreateDistributionResult,
  Distribution,
} from '@aws-sdk/client-cloudfront';
import { AWSResource } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { generateResourceName, createAwsTags } from '../utils/helpers.js';

export class CloudFrontService {
  private cloudFrontClient: CloudFrontClient;
  private region: string;

  constructor(region: string = 'us-east-1') {
    this.region = region;
    this.cloudFrontClient = new CloudFrontClient({ region });
  }

  /**
   * Create CloudFront distribution for S3 website
   */
  async createDistribution(
    bucketName: string,
    projectName: string,
    environment: string,
    customDomain?: string,
    certificateArn?: string
  ): Promise<AWSResource> {
    const callerReference = generateResourceName(
      projectName,
      'cdn',
      environment
    );
    const websiteUrl = this.getS3WebsiteEndpoint(bucketName, this.region);

    logger.info(`Creating CloudFront distribution for bucket: ${bucketName}`);

    try {
      const distributionConfig = {
        CallerReference: callerReference,
        Comment: `CDN for ${projectName} (${environment})`,
        DefaultCacheBehavior: {
          TargetOriginId: bucketName,
          ViewerProtocolPolicy: 'redirect-to-https' as any,
          MinTTL: 0,
          ForwardedValues: {
            QueryString: false,
            Cookies: {
              Forward: 'none' as any,
            },
          },
          TrustedSigners: {
            Enabled: false,
            Quantity: 0,
          },
        },
        Origins: {
          Quantity: 1,
          Items: [
            {
              Id: bucketName,
              DomainName: websiteUrl,
              CustomOriginConfig: {
                HTTPPort: 80,
                HTTPSPort: 443,
                OriginProtocolPolicy: 'http-only' as any,
              },
            },
          ],
        },
        Enabled: true,
        DefaultRootObject: 'index.html',
        CustomErrorResponses: {
          Quantity: 1,
          Items: [
            {
              ErrorCode: 404,
              ResponsePagePath: '/error.html',
              ResponseCode: '404',
              ErrorCachingMinTTL: 300,
            },
          ],
        },
        PriceClass: 'PriceClass_100' as any, // Use only US, Canada and Europe
        ...(customDomain && certificateArn
          ? {
              Aliases: {
                Quantity: 1,
                Items: [customDomain],
              },
              ViewerCertificate: {
                ACMCertificateArn: certificateArn,
                SSLSupportMethod: 'sni-only',
                MinimumProtocolVersion: 'TLSv1.2_2021',
              },
            }
          : {
              ViewerCertificate: {
                CloudFrontDefaultCertificate: true,
              },
            }),
      };

      const command = new CreateDistributionCommand({
        DistributionConfig: distributionConfig as any,
      });

      const result: CreateDistributionResult =
        await this.cloudFrontClient.send(command);

      if (!result.Distribution) {
        throw new Error('Failed to create CloudFront distribution');
      }

      const distribution = result.Distribution;

      const resource: AWSResource = {
        id: distribution.Id!,
        type: 'CloudFront::Distribution',
        arn: distribution.ARN!,
        region: 'global', // CloudFront is global
        status: distribution.Status!,
        tags: createAwsTags(projectName, environment, {
          ResourceType: 'cdn-distribution',
          BucketName: bucketName,
        }),
      };

      logger.info(
        `Successfully created CloudFront distribution: ${distribution.Id}`
      );
      return resource;
    } catch (error) {
      logger.error(
        `Failed to create CloudFront distribution for bucket: ${bucketName}`,
        { error }
      );
      throw new Error(
        `CloudFront distribution creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get CloudFront distribution status and URLs
   */
  async getDistributionInfo(distributionId: string): Promise<{
    status: string;
    domainName: string;
    url: string;
    lastModified: Date;
  }> {
    try {
      const command = new GetDistributionCommand({
        Id: distributionId,
      });

      const result = await this.cloudFrontClient.send(command);

      if (!result.Distribution) {
        throw new Error('Distribution not found');
      }

      const distribution = result.Distribution;

      return {
        status: distribution.Status!,
        domainName: distribution.DomainName!,
        url: `https://${distribution.DomainName}`,
        lastModified: distribution.LastModifiedTime!,
      };
    } catch (error) {
      logger.error(
        `Failed to get CloudFront distribution info: ${distributionId}`,
        { error }
      );
      throw error;
    }
  }

  /**
   * Get S3 website endpoint for region
   */
  private getS3WebsiteEndpoint(bucketName: string, region: string): string {
    if (region === 'us-east-1') {
      return `${bucketName}.s3-website-us-east-1.amazonaws.com`;
    } else {
      return `${bucketName}.s3-website.${region}.amazonaws.com`;
    }
  }

  /**
   * Create invalidation for CloudFront distribution
   */
  async createInvalidation(
    distributionId: string,
    paths: string[] = ['/*']
  ): Promise<string> {
    try {
      const { CreateInvalidationCommand } = await import(
        '@aws-sdk/client-cloudfront'
      );

      const command = new CreateInvalidationCommand({
        DistributionId: distributionId,
        InvalidationBatch: {
          CallerReference: `invalidation-${Date.now()}`,
          Paths: {
            Quantity: paths.length,
            Items: paths,
          },
        },
      });

      const result = await this.cloudFrontClient.send(command);

      logger.info(
        `Created CloudFront invalidation: ${result.Invalidation?.Id}`
      );
      return result.Invalidation?.Id || '';
    } catch (error) {
      logger.error(
        `Failed to create CloudFront invalidation: ${distributionId}`,
        { error }
      );
      throw error;
    }
  }

  /**
   * Wait for distribution to be deployed
   */
  async waitForDistributionDeployed(
    distributionId: string,
    timeoutMs: number = 900000
  ): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 30000; // 30 seconds

    logger.info(
      `Waiting for CloudFront distribution to be deployed: ${distributionId}`
    );

    while (Date.now() - startTime < timeoutMs) {
      try {
        const info = await this.getDistributionInfo(distributionId);

        if (info.status === 'Deployed') {
          logger.info(
            `CloudFront distribution deployed successfully: ${distributionId}`
          );
          return true;
        }

        logger.info(
          `CloudFront distribution status: ${info.status}, waiting...`
        );
        await this.delay(pollInterval);
      } catch (error) {
        logger.error(`Error checking CloudFront distribution status: ${error}`);
        await this.delay(pollInterval);
      }
    }

    logger.warn(
      `CloudFront distribution deployment timeout: ${distributionId}`
    );
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get estimated deployment time for CloudFront distribution
   */
  getEstimatedDeploymentTime(): number {
    // CloudFront typically takes 10-15 minutes to deploy
    return 12 * 60 * 1000; // 12 minutes in milliseconds
  }

  /**
   * Generate CloudFront distribution configuration for SPA
   */
  getSPADistributionConfig(
    bucketName: string,
    projectName: string,
    environment: string
  ) {
    return {
      CallerReference: generateResourceName(
        projectName,
        'spa-cdn',
        environment
      ),
      Comment: `SPA CDN for ${projectName} (${environment})`,
      DefaultCacheBehavior: {
        TargetOriginId: bucketName,
        ViewerProtocolPolicy: 'redirect-to-https',
        MinTTL: 0,
        DefaultTTL: 86400, // 1 day
        MaxTTL: 31536000, // 1 year
        ForwardedValues: {
          QueryString: false,
          Cookies: {
            Forward: 'none',
          },
        },
        TrustedSigners: {
          Enabled: false,
          Quantity: 0,
        },
      },
      CacheBehaviors: {
        Quantity: 1,
        Items: [
          {
            PathPattern: '/api/*',
            TargetOriginId: bucketName,
            ViewerProtocolPolicy: 'redirect-to-https',
            MinTTL: 0,
            DefaultTTL: 0,
            MaxTTL: 0,
            ForwardedValues: {
              QueryString: true,
              Headers: {
                Quantity: 1,
                Items: ['Authorization'],
              },
              Cookies: {
                Forward: 'all',
              },
            },
          },
        ],
      },
      CustomErrorResponses: {
        Quantity: 1,
        Items: [
          {
            ErrorCode: 404,
            ResponsePagePath: '/index.html',
            ResponseCode: '200',
            ErrorCachingMinTTL: 300,
          },
        ],
      },
    };
  }
}
