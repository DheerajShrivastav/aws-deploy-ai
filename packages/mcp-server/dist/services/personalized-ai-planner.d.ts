export declare class PersonalizedAIDeploymentPlanner {
    private bedrockClient;
    private modelId;
    constructor(region?: string);
    generatePersonalizedDeploymentPlan(repositoryData: any, userPrompt: string, projectAnalysis: any): Promise<any>;
    private createPersonalizedPrompt;
    private formatFileStructure;
    private parseAIResponse;
    generateAlternativeArchitectures(repositoryData: any, userPrompt: string, projectAnalysis: any): Promise<any[]>;
}
//# sourceMappingURL=personalized-ai-planner.d.ts.map