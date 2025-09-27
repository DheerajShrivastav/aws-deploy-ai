/**
 * Core type definitions for AWS Deploy AI platform
 */

export interface DeploymentRequest {
  id: string;
  prompt: string;
  userId?: string;
  timestamp: Date;
  projectName?: string;
  customDomain?: string;
  files?: FileUpload[];
  environment?: 'development' | 'staging' | 'production';
}

export interface FileUpload {
  name: string;
  content: Buffer | string;
  contentType: string;
  size: number;
  path: string;
}

export interface ParsedDeploymentIntent {
  projectType: ProjectType;
  infrastructure: InfrastructureRequirements;
  domain?: DomainConfiguration;
  environment: Environment;
  features: string[];
  estimatedCost: CostEstimate;
}

export enum ProjectType {
  STATIC_WEBSITE = 'static-website',
  SPA = 'single-page-app',
  NODEJS_API = 'nodejs-api',
  FULLSTACK_APP = 'fullstack-app',
  ECOMMERCE = 'ecommerce',
  BLOG = 'blog',
  PORTFOLIO = 'portfolio',
  LANDING_PAGE = 'landing-page',
}

export interface InfrastructureRequirements {
  compute: ComputeRequirements;
  storage: StorageRequirements;
  networking: NetworkingRequirements;
  database?: DatabaseRequirements;
  cdn: boolean;
  ssl: boolean;
  monitoring: boolean;
}

export interface ComputeRequirements {
  type: 'static' | 'serverless' | 'container' | 'vm';
  runtime?: string;
  memory?: number;
  cpu?: number;
  autoscaling?: boolean;
}

export interface StorageRequirements {
  type: 's3' | 'efs' | 'ebs';
  size: number;
  backup: boolean;
  encryption: boolean;
}

export interface NetworkingRequirements {
  vpc: boolean;
  publicAccess: boolean;
  loadBalancer: boolean;
  apiGateway: boolean;
}

export interface DatabaseRequirements {
  type: 'dynamodb' | 'rds' | 'documentdb';
  size: 'small' | 'medium' | 'large';
  backup: boolean;
  encryption: boolean;
}

export interface DomainConfiguration {
  domain: string;
  subdomain?: string;
  ssl: boolean;
  cdn: boolean;
}

export interface Environment {
  name: string;
  region: string;
  stage: 'dev' | 'staging' | 'prod';
  variables: Record<string, string>;
}

export interface CostEstimate {
  monthly: number;
  yearly: number;
  breakdown: CostBreakdown[];
  currency: string;
}

export interface CostBreakdown {
  service: string;
  cost: number;
  unit: string;
  description: string;
}

export interface DeploymentStatus {
  id: string;
  status: DeploymentState;
  progress: number;
  currentStep: string;
  steps: DeploymentStep[];
  resources: AWSResource[];
  urls?: string[];
  error?: DeploymentError;
  startTime: Date;
  endTime?: Date;
  estimatedCompletion?: Date;
}

export enum DeploymentState {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  PROVISIONING = 'provisioning',
  DEPLOYING = 'deploying',
  CONFIGURING = 'configuring',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLING_BACK = 'rolling-back',
}

export interface DeploymentStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  output?: string;
  error?: string;
}

export interface AWSResource {
  id: string;
  type: string;
  arn: string;
  region: string;
  status: string;
  tags: Record<string, string>;
  cost?: number;
}

export interface DeploymentError {
  code: string;
  message: string;
  details: string;
  recoverable: boolean;
  suggestions: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'pro' | 'enterprise';
  deployments: string[];
  usage: UsageStats;
  preferences: UserPreferences;
}

export interface UsageStats {
  totalDeployments: number;
  monthlyDeployments: number;
  totalCost: number;
  monthlyCost: number;
  storageUsed: number;
  bandwidthUsed: number;
}

export interface UserPreferences {
  defaultRegion: string;
  defaultEnvironment: string;
  costAlerts: boolean;
  emailNotifications: boolean;
  slackIntegration?: SlackConfig;
}

export interface SlackConfig {
  webhookUrl: string;
  channel: string;
  enabled: boolean;
}

export interface DeploymentTemplate {
  id: string;
  name: string;
  description: string;
  projectType: ProjectType;
  configuration: Partial<ParsedDeploymentIntent>;
  popularity: number;
  author: string;
  tags: string[];
}
