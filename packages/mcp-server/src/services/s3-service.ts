import {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  PutBucketWebsiteCommand,
  PutBucketPolicyCommand,
  GetBucketLocationCommand,
} from '@aws-sdk/client-s3';
import { FileUpload, AWSResource } from '../types/index.js';
import { logger } from '../utils/logger.js';
import {
  generateResourceName,
  createAwsTags,
  validateAwsResourceName,
} from '../utils/helpers.js';

export class S3Service {
  private s3Client: S3Client;
  private region: string;

  constructor(region: string = 'us-east-1') {
    this.region = region;
    this.s3Client = new S3Client({ region });
  }

  /**
   * Create an S3 bucket for website hosting
   */
  async createWebsiteBucket(
    projectName: string,
    environment: string
  ): Promise<AWSResource> {
    const bucketName = generateResourceName(
      projectName,
      'website',
      environment
    );

    if (!validateAwsResourceName(bucketName, 's3')) {
      throw new Error(`Invalid bucket name: ${bucketName}`);
    }

    logger.info(`Creating S3 bucket: ${bucketName}`);

    try {
      // Create the bucket
      await this.s3Client.send(
        new CreateBucketCommand({
          Bucket: bucketName,
          CreateBucketConfiguration:
            this.region !== 'us-east-1'
              ? {
                  LocationConstraint: this.region as any,
                }
              : undefined,
        })
      );

      // Configure for website hosting
      await this.s3Client.send(
        new PutBucketWebsiteCommand({
          Bucket: bucketName,
          WebsiteConfiguration: {
            IndexDocument: {
              Suffix: 'index.html',
            },
            ErrorDocument: {
              Key: 'error.html',
            },
          },
        })
      );

      // Set bucket policy for public read access
      const bucketPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'PublicReadGetObject',
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${bucketName}/*`,
          },
        ],
      };

      await this.s3Client.send(
        new PutBucketPolicyCommand({
          Bucket: bucketName,
          Policy: JSON.stringify(bucketPolicy),
        })
      );

      const resource: AWSResource = {
        id: bucketName,
        type: 'S3::Bucket',
        arn: `arn:aws:s3:::${bucketName}`,
        region: this.region,
        status: 'active',
        tags: createAwsTags(projectName, environment, {
          ResourceType: 'website-bucket',
        }),
      };

      logger.info(`Successfully created S3 bucket: ${bucketName}`);
      return resource;
    } catch (error) {
      logger.error(`Failed to create S3 bucket: ${bucketName}`, { error });
      throw new Error(
        `S3 bucket creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Upload files to S3 bucket
   */
  async uploadFiles(bucketName: string, files: FileUpload[]): Promise<void> {
    logger.info(`Uploading ${files.length} files to bucket: ${bucketName}`);

    const uploadPromises = files.map(async (file) => {
      try {
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: file.path,
          Body:
            typeof file.content === 'string'
              ? Buffer.from(file.content)
              : file.content,
          ContentType: file.contentType,
          Metadata: {
            'original-name': file.name,
            'upload-time': new Date().toISOString(),
          },
        });

        await this.s3Client.send(command);
        logger.info(`Successfully uploaded file: ${file.path}`);
      } catch (error) {
        logger.error(`Failed to upload file: ${file.path}`, { error });
        throw new Error(`File upload failed: ${file.path}`);
      }
    });

    await Promise.all(uploadPromises);
    logger.info(`Successfully uploaded all files to bucket: ${bucketName}`);
  }

  /**
   * Get website URL for S3 bucket
   */
  async getWebsiteUrl(bucketName: string): Promise<string> {
    try {
      // Get bucket location
      const locationResponse = await this.s3Client.send(
        new GetBucketLocationCommand({
          Bucket: bucketName,
        })
      );

      const region = locationResponse.LocationConstraint || 'us-east-1';

      if (region === 'us-east-1') {
        return `http://${bucketName}.s3-website-us-east-1.amazonaws.com`;
      } else {
        return `http://${bucketName}.s3-website.${region}.amazonaws.com`;
      }
    } catch (error) {
      logger.error(`Failed to get website URL for bucket: ${bucketName}`, {
        error,
      });
      throw error;
    }
  }

  /**
   * Create S3 bucket for application assets (with versioning)
   */
  async createAssetsBucket(
    projectName: string,
    environment: string
  ): Promise<AWSResource> {
    const bucketName = generateResourceName(projectName, 'assets', environment);

    logger.info(`Creating S3 assets bucket: ${bucketName}`);

    try {
      await this.s3Client.send(
        new CreateBucketCommand({
          Bucket: bucketName,
          CreateBucketConfiguration:
            this.region !== 'us-east-1'
              ? {
                  LocationConstraint: this.region as any,
                }
              : undefined,
        })
      );

      const resource: AWSResource = {
        id: bucketName,
        type: 'S3::Bucket',
        arn: `arn:aws:s3:::${bucketName}`,
        region: this.region,
        status: 'active',
        tags: createAwsTags(projectName, environment, {
          ResourceType: 'assets-bucket',
        }),
      };

      logger.info(`Successfully created S3 assets bucket: ${bucketName}`);
      return resource;
    } catch (error) {
      logger.error(`Failed to create S3 assets bucket: ${bucketName}`, {
        error,
      });
      throw new Error(
        `S3 assets bucket creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate default index.html if not provided
   */
  generateDefaultIndexHtml(projectName: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${projectName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        h1 {
            color: #2c3e50;
            text-align: center;
            margin-bottom: 1rem;
        }
        .success-badge {
            background: #27ae60;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 25px;
            display: inline-block;
            margin-bottom: 1rem;
        }
        .info-section {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 5px;
            margin: 1rem 0;
        }
        .next-steps {
            background: #e8f4fd;
            border-left: 4px solid #3498db;
            padding: 1rem;
            margin: 1rem 0;
        }
        .footer {
            text-align: center;
            margin-top: 2rem;
            color: #7f8c8d;
            font-size: 0.9rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-badge">🚀 Deployment Successful</div>
        <h1>Welcome to ${projectName}</h1>
        
        <div class="info-section">
            <h3>🎉 Your website is now live!</h3>
            <p>This is a default page created by AWS Deploy AI. Your infrastructure has been successfully provisioned and deployed.</p>
        </div>

        <div class="next-steps">
            <h3>📝 Next Steps:</h3>
            <ul>
                <li>Replace this page with your own content</li>
                <li>Upload your website files to update the deployment</li>
                <li>Configure your custom domain if needed</li>
                <li>Set up monitoring and analytics</li>
            </ul>
        </div>

        <div class="info-section">
            <h3>🛠 What's been deployed:</h3>
            <ul>
                <li>✅ S3 Bucket for static hosting</li>
                <li>✅ CloudFront CDN distribution</li>
                <li>✅ SSL certificate (if custom domain)</li>
                <li>✅ Basic monitoring setup</li>
            </ul>
        </div>

        <div class="footer">
            <p>Deployed with ❤️ by AWS Deploy AI</p>
            <p>Deployment completed at: ${new Date().toISOString()}</p>
        </div>
    </div>
</body>
</html>`;
  }

  /**
   * Generate default error page
   */
  generateDefaultErrorHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Page Not Found</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            text-align: center;
            padding: 2rem;
            background: #f8f9fa;
        }
        .error-container {
            max-width: 500px;
            margin: 0 auto;
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        h1 { color: #e74c3c; }
        p { color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="error-container">
        <h1>404 - Page Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/">Go back to home</a>
    </div>
</body>
</html>`;
  }
}
