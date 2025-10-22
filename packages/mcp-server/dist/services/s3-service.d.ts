import { FileUpload, AWSResource } from '../types/index.js';
export declare class S3Service {
    private s3Client;
    private region;
    constructor(region?: string);
    createWebsiteBucket(projectName: string, environment: string): Promise<AWSResource>;
    uploadFiles(bucketName: string, files: FileUpload[]): Promise<void>;
    getWebsiteUrl(bucketName: string): Promise<string>;
    createAssetsBucket(projectName: string, environment: string): Promise<AWSResource>;
    generateDefaultIndexHtml(projectName: string): string;
    generateDefaultErrorHtml(): string;
}
//# sourceMappingURL=s3-service.d.ts.map