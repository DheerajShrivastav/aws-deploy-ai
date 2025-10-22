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
interface RepositoryData {
    name: string;
    language: string;
    files: {
        [key: string]: string;
    };
    packageJson?: Record<string, unknown>;
    readme?: string;
}
export declare class BedrockAIService {
    private client;
    constructor();
    private initialize;
    analyzeRepository(repoData: RepositoryData, userPrompt: string): Promise<{
        analysis: RepositoryAnalysis;
        deploymentPlan: DeploymentPlan;
    }>;
    private callBedrockWithApiKey;
    private buildAnalysisPrompt;
}
export {};
//# sourceMappingURL=bedrock-ai.d.ts.map