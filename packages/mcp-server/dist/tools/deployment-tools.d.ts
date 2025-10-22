import { z } from 'zod';
import { DeploymentState, ProjectType, AWSResource } from '../types/index.js';
export declare class DeploymentTools {
    private aiInterpreter;
    private s3Service;
    private cloudFrontService;
    private lambdaService;
    private deploymentStatuses;
    constructor(region?: string);
    deployWebsite(params: {
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
    }): Promise<{
        deploymentId: string;
        status: DeploymentState;
        message: string;
        trackingUrl: string;
    }>;
    getDeploymentStatus(deploymentId: string): Promise<{
        id: string;
        status: DeploymentState;
        progress: number;
        currentStep: string;
        steps: {
            name: string;
            description: string;
            status: "pending" | "completed" | "failed" | "running";
            startTime: Date | undefined;
            endTime: Date | undefined;
            output: string | undefined;
            error: string | undefined;
        }[];
        resources: AWSResource[];
        urls: string[] | undefined;
        error: import("../types/index.js").DeploymentError | undefined;
        startTime: Date;
        endTime: Date | undefined;
        estimatedCompletion: Date | undefined;
    }>;
    analyzeDeployment(prompt: string): Promise<{
        projectType: ProjectType;
        infrastructure: import("../types/index.js").InfrastructureRequirements;
        estimatedCost: import("../types/index.js").CostEstimate;
        features: string[];
        recommendations: string[];
        deploymentSteps: string[];
        estimatedTime: number;
    }>;
    listDeployments(): Promise<{
        total: number;
        active: number;
        completed: number;
        failed: number;
        deployments: {
            id: string;
            status: DeploymentState;
            progress: number;
            startTime: Date;
            endTime: Date | undefined;
            resourceCount: number;
        }[];
    }>;
    getCostEstimate(prompt: string): Promise<{
        monthly: number;
        yearly: number;
        currency: string;
        breakdown: import("../types/index.js").CostBreakdown[];
        comparison: any;
        optimizationTips: string[];
    }>;
    private executeDeployment;
    private getDeploymentSteps;
    private estimateDeploymentTime;
    private generateCostComparison;
    private getCostOptimizationTips;
    private generateDeploymentUrls;
    static getToolSchemas(): {
        deployWebsite: {
            prompt: z.ZodString;
            projectName: z.ZodOptional<z.ZodString>;
            customDomain: z.ZodOptional<z.ZodString>;
            environment: z.ZodOptional<z.ZodEnum<["development", "staging", "production"]>>;
            files: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                content: z.ZodString;
                contentType: z.ZodString;
                path: z.ZodString;
            }, "strip", z.ZodTypeAny, {
                contentType: string;
                name: string;
                path: string;
                content: string;
            }, {
                contentType: string;
                name: string;
                path: string;
                content: string;
            }>, "many">>;
        };
        getDeploymentStatus: {
            deploymentId: z.ZodString;
        };
        analyzeDeployment: {
            prompt: z.ZodString;
        };
        getCostEstimate: {
            prompt: z.ZodString;
        };
    };
}
//# sourceMappingURL=deployment-tools.d.ts.map