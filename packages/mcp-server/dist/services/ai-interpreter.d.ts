import { DeploymentRequest, ParsedDeploymentIntent } from '../types/index.js';
export declare class AIPromptInterpreter {
    private bedrockClient;
    private readonly modelId;
    constructor();
    parseDeploymentIntent(request: DeploymentRequest): Promise<ParsedDeploymentIntent>;
    generateRecommendations(intent: ParsedDeploymentIntent): Promise<string[]>;
    private invokeClaudeModel;
    private buildSystemPrompt;
    private buildUserPrompt;
    private estimateCosts;
    private validateConfiguration;
}
//# sourceMappingURL=ai-interpreter.d.ts.map