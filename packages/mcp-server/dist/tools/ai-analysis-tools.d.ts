import { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare class AIAnalysisTools {
    private static bedrockService;
    private static githubService;
    static getTools(): Tool[];
    static handleToolCall(name: string, args: any): Promise<any>;
    private static analyzeRepository;
    private static analyzeGitHubRepository;
    private static performLocalRepositoryAnalysis;
    private static generateLocalDeploymentPlan;
}
//# sourceMappingURL=ai-analysis-tools.d.ts.map