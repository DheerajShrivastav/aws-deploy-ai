# AWS Deploy AI - API Reference

This document provides comprehensive API reference for the AWS Deploy AI MCP server tools and utilities.

## Table of Contents

- [MCP Tools](#mcp-tools)
- [Services API](#services-api)
- [Types and Interfaces](#types-and-interfaces)
- [Error Handling](#error-handling)
- [Examples](#examples)

## MCP Tools

The AWS Deploy AI MCP server exposes the following tools that can be called by MCP clients:

### 1. deploy-website

Deploy a website to AWS with natural language instructions.

#### Input Schema

```typescript
{
  prompt: string;           // Natural language deployment description
  files?: Record<string, string>; // Optional file contents (filename -> content)
}
```

#### Example Request

```json
{
  "prompt": "Deploy a simple portfolio website with a dark theme and contact form",
  "files": {
    "index.html": "<html>...</html>",
    "style.css": "body { ... }",
    "script.js": "function contact() { ... }"
  }
}
```

#### Response

```typescript
{
  deploymentId: string;     // Unique deployment identifier
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  websiteUrl?: string;      // Live website URL (when completed)
  cloudFrontUrl?: string;   // CloudFront distribution URL
  bucketName?: string;      // S3 bucket name
  estimatedCost: number;    // Estimated monthly cost in USD
  services: string[];       // List of AWS services used
  message: string;          // Human-readable status message
}
```

### 2. get-deployment-status

Check the status of a deployment.

#### Input Schema

```typescript
{
  deploymentId: string // Deployment ID from deploy-website
}
```

#### Response

```typescript
{
  deploymentId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: number;         // Completion percentage (0-100)
  currentStep: string;      // Current deployment step
  websiteUrl?: string;      // Live website URL (when available)
  cloudFrontUrl?: string;   // CloudFront distribution URL
  bucketName?: string;      // S3 bucket name
  logs: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
  }>;
  error?: string;           // Error message (if failed)
}
```

### 3. analyze-deployment

Get detailed analysis and recommendations for a deployment.

#### Input Schema

```typescript
{
  prompt: string // Natural language description to analyze
}
```

#### Response

```typescript
{
  analysis: {
    projectType: string;    // Detected project type
    complexity: 'simple' | 'moderate' | 'complex';
    recommendedServices: string[]; // AWS services to use
    estimatedSetupTime: string;    // Setup time estimate
    costBreakdown: {
      s3: number;           // S3 costs
      cloudfront: number;   // CloudFront costs
      lambda: number;       // Lambda costs (if applicable)
      total: number;        // Total estimated monthly cost
    };
  };
  recommendations: string[]; // List of recommendations
  warnings: string[];       // Potential issues or warnings
}
```

### 4. get-cost-estimate

Get detailed cost estimation for a deployment.

#### Input Schema

```typescript
{
  prompt: string;           // Natural language description
  traffic?: {
    monthlyVisitors: number;
    averagePageViews: number;
    averageFileSize: number; // In MB
  };
}
```

#### Response

```typescript
{
  breakdown: {
    s3: {
      storage: number;      // Storage costs
      requests: number;     // Request costs
      dataTransfer: number; // Data transfer costs
    };
    cloudfront: {
      requests: number;     // Request costs
      dataTransfer: number; // Data transfer costs
    };
    lambda?: {
      invocations: number;  // Invocation costs
      compute: number;      // Compute costs
    };
    route53?: {
      hostedZone: number;   // Hosted zone costs
      queries: number;      // DNS query costs
    };
  };
  total: {
    monthly: number;        // Total monthly cost
    yearly: number;         // Total yearly cost
  };
  assumptions: string[];    // Cost calculation assumptions
}
```

### 5. list-deployments

List all deployments with their current status.

#### Input Schema

```typescript
{
  limit?: number;           // Maximum number of deployments to return
  status?: 'pending' | 'in-progress' | 'completed' | 'failed'; // Filter by status
}
```

#### Response

```typescript
{
  deployments: Array<{
    deploymentId: string
    status: 'pending' | 'in-progress' | 'completed' | 'failed'
    createdAt: string // ISO 8601 timestamp
    completedAt?: string // ISO 8601 timestamp (when completed)
    prompt: string // Original deployment prompt
    websiteUrl?: string // Live website URL
    estimatedCost: number // Estimated monthly cost
    services: string[] // AWS services used
  }>
  total: number // Total number of deployments
  hasMore: boolean // Whether more results are available
}
```

## Services API

### AI Interpreter Service

Interprets natural language prompts and converts them to deployment configurations.

#### parseDeploymentIntent(prompt: string)

```typescript
interface DeploymentIntent {
  projectType: 'static-website' | 'spa' | 'api' | 'full-stack'
  features: string[]
  technology: {
    frontend?: string
    backend?: string
    database?: string
  }
  requirements: {
    customDomain?: string
    ssl: boolean
    cdn: boolean
    serverless: boolean
  }
  content: {
    hasExistingFiles: boolean
    needsGeneration: boolean
    theme?: string
    pages: string[]
  }
}
```

#### generateRecommendations(intent: DeploymentIntent)

```typescript
interface Recommendations {
  services: string[]
  architecture: string
  security: string[]
  performance: string[]
  cost: string[]
}
```

### S3 Service

Handles S3 bucket creation and file management.

#### createWebsiteBucket(bucketName: string)

```typescript
interface S3BucketResult {
  bucketName: string
  region: string
  websiteEndpoint: string
  success: boolean
  error?: string
}
```

#### uploadFiles(bucketName: string, files: Record<string, string>)

```typescript
interface UploadResult {
  uploaded: string[]
  failed: Array<{
    file: string
    error: string
  }>
  totalSize: number
}
```

### CloudFront Service

Manages CloudFront CDN distributions.

#### createDistribution(bucketName: string, customDomain?: string)

```typescript
interface CloudFrontResult {
  distributionId: string
  domainName: string
  status: string
  estimatedDeployTime: string
  success: boolean
  error?: string
}
```

### Lambda Service

Handles serverless function deployment.

#### createFunction(functionName: string, code: string, runtime: string)

```typescript
interface LambdaResult {
  functionName: string
  functionArn: string
  runtime: string
  handler: string
  status: string
  success: boolean
  error?: string
}
```

## Types and Interfaces

### Core Types

```typescript
// Deployment status enumeration
type DeploymentStatus = 'pending' | 'in-progress' | 'completed' | 'failed'

// Project type enumeration
type ProjectType = 'static-website' | 'spa' | 'api' | 'full-stack'

// Complexity levels
type ComplexityLevel = 'simple' | 'moderate' | 'complex'

// Log levels
type LogLevel = 'info' | 'warn' | 'error' | 'debug'
```

### Deployment Configuration

```typescript
interface DeploymentConfig {
  id: string
  prompt: string
  intent: DeploymentIntent
  files: Record<string, string>
  awsConfig: {
    region: string
    bucketName: string
    distributionId?: string
    functionName?: string
    customDomain?: string
  }
  status: DeploymentStatus
  createdAt: Date
  completedAt?: Date
  logs: LogEntry[]
  estimatedCost: number
  actualCost?: number
}
```

### Log Entry

```typescript
interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  details?: Record<string, any>
}
```

### Cost Breakdown

```typescript
interface CostBreakdown {
  s3: {
    storage: number
    requests: number
    dataTransfer: number
  }
  cloudfront: {
    requests: number
    dataTransfer: number
  }
  lambda?: {
    invocations: number
    compute: number
  }
  route53?: {
    hostedZone: number
    queries: number
  }
  acm?: {
    certificate: number
  }
  total: number
}
```

### Traffic Assumptions

```typescript
interface TrafficAssumptions {
  monthlyVisitors: number
  averagePageViews: number
  averageFileSize: number // In MB
  peakTrafficMultiplier: number
  cacheHitRatio: number // For CloudFront
}
```

## Error Handling

### Error Types

```typescript
class DeploymentError extends Error {
  code: string
  service: string
  details?: Record<string, any>
}

class ValidationError extends Error {
  field: string
  value: any
}

class AWSServiceError extends Error {
  service: string
  operation: string
  awsErrorCode?: string
}
```

### Common Error Codes

| Code                            | Description                           | Service          | Resolution                                   |
| ------------------------------- | ------------------------------------- | ---------------- | -------------------------------------------- |
| `INVALID_PROMPT`                | Invalid or empty prompt               | AI Interpreter   | Provide a valid deployment description       |
| `BUCKET_EXISTS`                 | S3 bucket name already exists         | S3               | Choose a different bucket name               |
| `PERMISSION_DENIED`             | Insufficient AWS permissions          | All              | Check IAM policies and permissions           |
| `QUOTA_EXCEEDED`                | AWS service quota exceeded            | All              | Request quota increase or clean up resources |
| `DISTRIBUTION_LIMIT`            | CloudFront distribution limit reached | CloudFront       | Delete unused distributions                  |
| `DOMAIN_NOT_AVAILABLE`          | Custom domain not available           | Route53          | Choose a different domain name               |
| `CERTIFICATE_VALIDATION_FAILED` | SSL certificate validation failed     | ACM              | Verify domain ownership                      |
| `BEDROCK_RATE_LIMIT`            | AWS Bedrock rate limit exceeded       | AI Interpreter   | Implement backoff or request quota increase  |
| `DEPLOYMENT_TIMEOUT`            | Deployment took too long              | Deployment Tools | Check service status and retry               |

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string
    message: string
    service: string
    details?: Record<string, any>
    timestamp: string
    requestId: string
  }
}
```

## Examples

### Basic Website Deployment

```javascript
// Deploy a simple website
const result = await mcpClient.callTool('deploy-website', {
  prompt:
    'Deploy a personal portfolio website with a modern design, about page, and contact form',
})

console.log('Deployment ID:', result.deploymentId)
console.log('Estimated Cost:', result.estimatedCost)

// Check deployment status
const status = await mcpClient.callTool('get-deployment-status', {
  deploymentId: result.deploymentId,
})

console.log('Status:', status.status)
console.log('Progress:', status.progress + '%')
```

### Custom Files Deployment

```javascript
// Deploy with custom files
const result = await mcpClient.callTool('deploy-website', {
  prompt: 'Deploy a React single-page application with routing',
  files: {
    'index.html': `
      <!DOCTYPE html>
      <html>
        <head>
          <title>My React App</title>
        </head>
        <body>
          <div id="root"></div>
          <script src="app.js"></script>
        </body>
      </html>
    `,
    'app.js': `
      import React from 'react';
      import ReactDOM from 'react-dom';
      
      function App() {
        return <h1>Hello, World!</h1>;
      }
      
      ReactDOM.render(<App />, document.getElementById('root'));
    `,
    'package.json': JSON.stringify({
      name: 'my-react-app',
      version: '1.0.0',
      dependencies: {
        react: '^18.0.0',
        'react-dom': '^18.0.0',
      },
    }),
  },
})
```

### Cost Analysis

```javascript
// Get cost estimate before deployment
const estimate = await mcpClient.callTool('get-cost-estimate', {
  prompt: 'E-commerce website with product catalog and checkout',
  traffic: {
    monthlyVisitors: 10000,
    averagePageViews: 5,
    averageFileSize: 2.5,
  },
})

console.log('Monthly Cost:', estimate.total.monthly)
console.log('S3 Storage:', estimate.breakdown.s3.storage)
console.log('CloudFront:', estimate.breakdown.cloudfront.requests)
```

### Deployment Analysis

```javascript
// Analyze deployment requirements
const analysis = await mcpClient.callTool('analyze-deployment', {
  prompt:
    'Enterprise dashboard with real-time analytics and user authentication',
})

console.log('Project Type:', analysis.analysis.projectType)
console.log('Complexity:', analysis.analysis.complexity)
console.log('Recommended Services:', analysis.analysis.recommendedServices)
console.log('Recommendations:', analysis.recommendations)
console.log('Warnings:', analysis.warnings)
```

### List All Deployments

```javascript
// List recent deployments
const deployments = await mcpClient.callTool('list-deployments', {
  limit: 10,
  status: 'completed',
})

deployments.deployments.forEach((deployment) => {
  console.log(`${deployment.deploymentId}: ${deployment.prompt}`)
  console.log(`Status: ${deployment.status}`)
  console.log(`URL: ${deployment.websiteUrl}`)
  console.log(`Cost: $${deployment.estimatedCost}/month`)
  console.log('---')
})
```

## Authentication and Security

### MCP Client Configuration

```javascript
const mcpClient = new MCPClient({
  serverPath: './aws-deploy-ai/mcp-server/dist/main.js',
  serverArgs: [],
  env: {
    AWS_REGION: 'us-east-1',
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID,
  },
})
```

### Rate Limiting

The MCP server implements rate limiting to prevent abuse:

- **Deployment Operations**: 10 per hour per client
- **Status Checks**: 100 per hour per client
- **Analysis Operations**: 50 per hour per client

### Security Considerations

1. **Credential Management**: Never expose AWS credentials in client code
2. **Input Validation**: All prompts and files are validated before processing
3. **Resource Limits**: Deployments are limited to prevent excessive AWS charges
4. **Audit Logging**: All operations are logged for security monitoring

---

This API reference provides complete documentation for integrating with the AWS Deploy AI MCP server. For additional support or examples, refer to the project repository and documentation.
