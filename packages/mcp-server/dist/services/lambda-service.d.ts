import { AWSResource } from '../types/index.js';
export declare class LambdaService {
    private lambdaClient;
    private iamClient;
    private region;
    constructor(region?: string);
    createFunction(projectName: string, environment: string, runtime?: string, code?: string, handler?: string): Promise<AWSResource>;
    private createLambdaRole;
    private createCodeZip;
    private getDefaultLambdaCode;
    updateFunctionCode(functionName: string, code: string): Promise<void>;
    getFunctionInfo(functionName: string): Promise<{
        arn: string;
        status: string;
        lastModified: string;
        codeSize: number;
        timeout: number;
        memorySize: number;
    }>;
    generateFunctionCode(projectType: string): string;
    private getEcommerceLambdaCode;
    private getBlogLambdaCode;
    private getAPILambdaCode;
    private delay;
}
//# sourceMappingURL=lambda-service.d.ts.map