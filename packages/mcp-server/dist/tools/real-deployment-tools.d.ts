import { Tool } from '@modelcontextprotocol/sdk/types.js';
export declare class RealDeploymentTools {
    private static deploymentService;
    static getTools(): Tool[];
    static handleToolCall(name: string, args: any): Promise<any>;
    private static deployFromGitHub;
    private static getDeploymentStatus;
    private static listDeployments;
}
//# sourceMappingURL=real-deployment-tools.d.ts.map