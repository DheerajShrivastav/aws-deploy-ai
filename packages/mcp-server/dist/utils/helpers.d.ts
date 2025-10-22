import { DeploymentStatus } from '../types/index.js';
export declare function generateDeploymentId(): string;
export declare function generateResourceName(projectName: string, resourceType: string, suffix?: string): string;
export declare function sanitizeProjectName(name: string): string;
export declare function createDeploymentStatus(id: string, steps: string[]): DeploymentStatus;
export declare function updateDeploymentStep(status: DeploymentStatus, stepName: string, stepStatus: 'running' | 'completed' | 'failed', output?: string, error?: string): DeploymentStatus;
export declare function calculateEstimatedCompletion(status: DeploymentStatus): Date | undefined;
export declare function formatFileSize(bytes: number): string;
export declare function formatDuration(ms: number): string;
export declare function validateAwsResourceName(name: string, resourceType: string): boolean;
export declare function extractDomain(url: string): string;
export declare function isValidDomain(domain: string): boolean;
export declare function camelToKebab(str: string): string;
export declare function createAwsTags(projectName: string, environment: string, additionalTags?: Record<string, string>): Record<string, string>;
//# sourceMappingURL=helpers.d.ts.map