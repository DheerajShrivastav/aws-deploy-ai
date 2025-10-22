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
    status: 'started' | 'cloning' | 'building' | 'deploying' | 'completed' | 'failed';
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
export declare class RealDeploymentService {
    private ec2;
    private s3;
    private deployments;
    private region;
    constructor(region?: string);
    deployFromGitHub(repositoryUrl: string, repositoryName: string, deploymentPlan: DeploymentPlan, prompt: string, branch?: string): Promise<DeploymentResult>;
    private executeDeployment;
    private cloneRepository;
    private analyzeProject;
    private deployToEC2;
    private generateUserData;
    private deployServerless;
    private deployContainerized;
    private updateStep;
    getDeploymentStatus(deploymentId: string): DeploymentResult | null;
    getAllDeployments(): DeploymentResult[];
}
export {};
//# sourceMappingURL=real-deployment.d.ts.map