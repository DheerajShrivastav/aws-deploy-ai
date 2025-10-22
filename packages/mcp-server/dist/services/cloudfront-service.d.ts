import { AWSResource } from '../types/index.js';
export declare class CloudFrontService {
    private cloudFrontClient;
    private region;
    constructor(region?: string);
    createDistribution(bucketName: string, projectName: string, environment: string, customDomain?: string, certificateArn?: string): Promise<AWSResource>;
    getDistributionInfo(distributionId: string): Promise<{
        status: string;
        domainName: string;
        url: string;
        lastModified: Date;
    }>;
    private getS3WebsiteEndpoint;
    createInvalidation(distributionId: string, paths?: string[]): Promise<string>;
    waitForDistributionDeployed(distributionId: string, timeoutMs?: number): Promise<boolean>;
    private delay;
    getEstimatedDeploymentTime(): number;
    getSPADistributionConfig(bucketName: string, projectName: string, environment: string): {
        CallerReference: string;
        Comment: string;
        DefaultCacheBehavior: {
            TargetOriginId: string;
            ViewerProtocolPolicy: string;
            MinTTL: number;
            DefaultTTL: number;
            MaxTTL: number;
            ForwardedValues: {
                QueryString: boolean;
                Cookies: {
                    Forward: string;
                };
            };
            TrustedSigners: {
                Enabled: boolean;
                Quantity: number;
            };
        };
        CacheBehaviors: {
            Quantity: number;
            Items: {
                PathPattern: string;
                TargetOriginId: string;
                ViewerProtocolPolicy: string;
                MinTTL: number;
                DefaultTTL: number;
                MaxTTL: number;
                ForwardedValues: {
                    QueryString: boolean;
                    Headers: {
                        Quantity: number;
                        Items: string[];
                    };
                    Cookies: {
                        Forward: string;
                    };
                };
            }[];
        };
        CustomErrorResponses: {
            Quantity: number;
            Items: {
                ErrorCode: number;
                ResponsePagePath: string;
                ResponseCode: string;
                ErrorCachingMinTTL: number;
            }[];
        };
    };
}
//# sourceMappingURL=cloudfront-service.d.ts.map