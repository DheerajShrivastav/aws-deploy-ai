import { v4 as uuidv4 } from 'uuid';
import {
  DeploymentStatus,
  DeploymentState,
  DeploymentStep,
} from '../types/index.js';

/**
 * Generate a unique deployment ID
 */
export function generateDeploymentId(): string {
  return `deploy-${uuidv4()}`;
}

/**
 * Generate a unique resource name with project prefix
 */
export function generateResourceName(
  projectName: string,
  resourceType: string,
  suffix?: string
): string {
  const timestamp = Date.now().toString(36);
  const baseName = `${projectName}-${resourceType}-${timestamp}`;
  return suffix ? `${baseName}-${suffix}` : baseName;
}

/**
 * Sanitize project name for AWS resource naming
 */
export function sanitizeProjectName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Create initial deployment status
 */
export function createDeploymentStatus(
  id: string,
  steps: string[]
): DeploymentStatus {
  return {
    id,
    status: DeploymentState.PENDING,
    progress: 0,
    currentStep: 'Initializing',
    steps: steps.map((stepName, index) => ({
      id: `step-${index + 1}`,
      name: stepName,
      description: getStepDescription(stepName),
      status: 'pending',
    })),
    resources: [],
    startTime: new Date(),
  };
}

/**
 * Update deployment step status
 */
export function updateDeploymentStep(
  status: DeploymentStatus,
  stepName: string,
  stepStatus: 'running' | 'completed' | 'failed',
  output?: string,
  error?: string
): DeploymentStatus {
  const step = status.steps.find((s) => s.name === stepName);
  if (step) {
    step.status = stepStatus;
    if (stepStatus === 'running') {
      step.startTime = new Date();
    } else {
      step.endTime = new Date();
    }
    if (output) step.output = output;
    if (error) step.error = error;

    // Update current step and progress
    status.currentStep = stepName;
    const completedSteps = status.steps.filter(
      (s) => s.status === 'completed'
    ).length;
    status.progress = Math.round((completedSteps / status.steps.length) * 100);

    // Update overall status
    if (stepStatus === 'failed') {
      status.status = DeploymentState.FAILED;
    } else if (completedSteps === status.steps.length) {
      status.status = DeploymentState.COMPLETED;
      status.endTime = new Date();
    } else {
      status.status = DeploymentState.PROVISIONING;
    }
  }

  return status;
}

/**
 * Get human-readable description for deployment steps
 */
function getStepDescription(stepName: string): string {
  const descriptions: Record<string, string> = {
    Initialize: 'Setting up deployment environment',
    'Parse Intent': 'Analyzing deployment requirements',
    'Create S3 Bucket': 'Creating storage bucket for static assets',
    'Configure CloudFront': 'Setting up content delivery network',
    'Create Lambda': 'Deploying serverless functions',
    'Setup API Gateway': 'Configuring API endpoints',
    'Configure Domain': 'Setting up custom domain and SSL',
    'Deploy Application': 'Uploading and deploying application code',
    'Configure Monitoring': 'Setting up logging and monitoring',
    'Run Health Checks': 'Verifying deployment health',
    Cleanup: 'Cleaning up temporary resources',
  };

  return descriptions[stepName] || stepName;
}

/**
 * Calculate estimated completion time based on current progress
 */
export function calculateEstimatedCompletion(
  status: DeploymentStatus
): Date | undefined {
  if (
    status.status === DeploymentState.COMPLETED ||
    status.status === DeploymentState.FAILED
  ) {
    return status.endTime;
  }

  const completedSteps = status.steps.filter(
    (s) => s.status === 'completed'
  ).length;
  if (completedSteps === 0) {
    return undefined;
  }

  const elapsedTime = Date.now() - status.startTime.getTime();
  const timePerStep = elapsedTime / completedSteps;
  const remainingSteps = status.steps.length - completedSteps;
  const estimatedRemainingTime = timePerStep * remainingSteps;

  return new Date(Date.now() + estimatedRemainingTime);
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Validate AWS resource name
 */
export function validateAwsResourceName(
  name: string,
  resourceType: string
): boolean {
  const patterns: Record<string, RegExp> = {
    s3: /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
    lambda: /^[a-zA-Z0-9-_]+$/,
    iam: /^[a-zA-Z0-9+=,.@_-]+$/,
  };

  const pattern = patterns[resourceType];
  return pattern ? pattern.test(name) : true;
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

/**
 * Check if string is a valid domain
 */
export function isValidDomain(domain: string): boolean {
  const domainRegex =
    /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
  return domainRegex.test(domain);
}

/**
 * Convert camelCase to kebab-case
 */
export function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Create AWS tags for resources
 */
export function createAwsTags(
  projectName: string,
  environment: string,
  additionalTags: Record<string, string> = {}
): Record<string, string> {
  return {
    Project: projectName,
    Environment: environment,
    ManagedBy: 'aws-deploy-ai',
    CreatedAt: new Date().toISOString(),
    ...additionalTags,
  };
}
