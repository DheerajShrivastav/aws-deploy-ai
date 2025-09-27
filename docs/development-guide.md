# AWS Deploy AI - Development Guide

This guide provides comprehensive information for developers who want to contribute to AWS Deploy AI or extend its functionality.

## Table of Contents

- [Development Setup](#development-setup)
- [Architecture Overview](#architecture-overview)
- [Contributing Guidelines](#contributing-guidelines)
- [Code Style and Standards](#code-style-and-standards)
- [Testing](#testing)
- [Building and Publishing](#building-and-publishing)
- [Extending Functionality](#extending-functionality)
- [Debugging](#debugging)

## Development Setup

### Prerequisites

- **Node.js 18+**: Install from [nodejs.org](https://nodejs.org)
- **npm 8+**: Comes with Node.js
- **Git**: For version control
- **VS Code**: Recommended IDE with extensions:
  - TypeScript and JavaScript Language Features
  - ESLint
  - Prettier
  - Jest Runner
  - AWS Toolkit

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/DheerajShrivastav/aws-deploy-ai.git
cd aws-deploy-ai

# Install dependencies
cd mcp-server
npm install

# Copy environment template
cp .env.example .env
```

### Environment Configuration

Edit `.env` file:

```bash
# Development Configuration
NODE_ENV=development
LOG_LEVEL=debug

# AWS Configuration (use test/development account)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_dev_access_key
AWS_SECRET_ACCESS_KEY=your_dev_secret_key

# AWS Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_REGION=us-east-1

# Development-specific settings
DEPLOYMENT_PREFIX=dev-
CLEANUP_RESOURCES=true
MAX_DEPLOYMENTS_PER_HOUR=5
```

### Development Commands

```bash
# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run type-check
```

## Architecture Overview

### Project Structure

```
mcp-server/
├── src/
│   ├── main.ts              # MCP server entry point
│   ├── types/               # TypeScript type definitions
│   │   ├── deployment.ts    # Deployment-related types
│   │   ├── aws.ts          # AWS service types
│   │   └── mcp.ts          # MCP protocol types
│   ├── services/           # Business logic services
│   │   ├── ai-interpreter.ts    # AWS Bedrock integration
│   │   ├── s3-service.ts       # S3 operations
│   │   ├── cloudfront-service.ts # CloudFront operations
│   │   └── lambda-service.ts    # Lambda operations
│   ├── tools/              # MCP tool implementations
│   │   └── deployment-tools.ts  # Main deployment orchestration
│   ├── utils/              # Utility functions
│   │   ├── logger.ts       # Logging configuration
│   │   ├── helpers.ts      # Common helper functions
│   │   └── validators.ts   # Input validation
│   └── __tests__/          # Test files
├── dist/                   # Compiled JavaScript output
├── logs/                   # Application logs
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── jest.config.js         # Test configuration
├── .eslintrc.js          # ESLint configuration
└── .prettierrc           # Prettier configuration
```

### Core Components

#### 1. MCP Server (main.ts)

The main entry point that sets up the Model Context Protocol server and registers all available tools.

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

const server = new Server(
  {
    name: 'aws-deploy-ai',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
)

// Tool registration
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'deploy-website',
      description: 'Deploy a website to AWS using natural language',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: { type: 'string' },
          files: { type: 'object' },
        },
        required: ['prompt'],
      },
    },
    // ... other tools
  ],
}))
```

#### 2. Services Layer

Business logic is organized into service classes:

```typescript
// ai-interpreter.ts
export class AIInterpreterService {
  async parseDeploymentIntent(prompt: string): Promise<DeploymentIntent> {
    // AWS Bedrock integration logic
  }

  async generateRecommendations(
    intent: DeploymentIntent
  ): Promise<Recommendations> {
    // Generate optimization recommendations
  }
}

// s3-service.ts
export class S3Service {
  async createWebsiteBucket(bucketName: string): Promise<S3BucketResult> {
    // S3 bucket creation and configuration
  }

  async uploadFiles(
    bucketName: string,
    files: Record<string, string>
  ): Promise<UploadResult> {
    // File upload with optimization
  }
}
```

#### 3. Tools Layer

MCP tools orchestrate services and handle user requests:

```typescript
// deployment-tools.ts
export class DeploymentTools {
  constructor(
    private aiService: AIInterpreterService,
    private s3Service: S3Service,
    private cloudFrontService: CloudFrontService,
    private lambdaService: LambdaService
  ) {}

  async deployWebsite(
    prompt: string,
    files?: Record<string, string>
  ): Promise<DeploymentResult> {
    // 1. Parse intent with AI
    const intent = await this.aiService.parseDeploymentIntent(prompt)

    // 2. Create S3 bucket
    const bucket = await this.s3Service.createWebsiteBucket(intent.bucketName)

    // 3. Upload files
    await this.s3Service.uploadFiles(bucket.bucketName, files || {})

    // 4. Create CloudFront distribution
    const distribution = await this.cloudFrontService.createDistribution(
      bucket.bucketName
    )

    // 5. Return deployment result
    return {
      deploymentId: generateId(),
      status: 'completed',
      websiteUrl: distribution.domainName,
      // ... other properties
    }
  }
}
```

### Data Flow

1. **Client Request** → MCP Client sends tool call request
2. **Tool Handler** → MCP server routes to appropriate tool
3. **Service Orchestration** → Deployment tool coordinates services
4. **AI Processing** → AWS Bedrock interprets natural language
5. **AWS Operations** → Services interact with AWS APIs
6. **Response** → Results returned to client

### Error Handling Strategy

```typescript
// Custom error classes
export class DeploymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public service: string,
    public details?: Record<string, any>
  ) {
    super(message)
    this.name = 'DeploymentError'
  }
}

// Error handling in services
export class S3Service {
  async createWebsiteBucket(bucketName: string): Promise<S3BucketResult> {
    try {
      // AWS S3 operations
    } catch (error) {
      if (error.name === 'BucketAlreadyExists') {
        throw new DeploymentError(
          `Bucket name '${bucketName}' is already taken`,
          'BUCKET_EXISTS',
          'S3',
          { bucketName, suggestion: `Try '${bucketName}-${Date.now()}'` }
        )
      }
      throw error
    }
  }
}
```

## Contributing Guidelines

### Getting Started

1. **Fork the repository** on GitHub
2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** with tests
4. **Run tests and linting**:
   ```bash
   npm test
   npm run lint
   ```
5. **Commit your changes** using conventional commits:
   ```bash
   git commit -m "feat: add support for custom domain deployment"
   ```
6. **Push and create a Pull Request**

### Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:

```bash
git commit -m "feat(s3): add support for custom bucket encryption"
git commit -m "fix(cloudfront): resolve distribution creation timeout"
git commit -m "docs: update API documentation for new tools"
```

### Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Ensure all tests pass**
4. **Update CHANGELOG.md** with your changes
5. **Request review** from maintainers

### Code Review Checklist

- [ ] Code follows TypeScript best practices
- [ ] Proper error handling implemented
- [ ] Tests cover new functionality
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed
- [ ] Backward compatibility maintained

## Code Style and Standards

### TypeScript Guidelines

```typescript
// Use explicit types
interface DeploymentConfig {
  readonly id: string
  readonly bucketName: string
  readonly region: string
  files: Record<string, string>
}

// Prefer interfaces over type aliases for object shapes
interface S3BucketResult {
  bucketName: string
  region: string
  websiteEndpoint: string
  success: boolean
  error?: string
}

// Use enums for constants
enum DeploymentStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Async/await over Promises
async function deployWebsite(
  config: DeploymentConfig
): Promise<DeploymentResult> {
  try {
    const bucket = await createS3Bucket(config.bucketName)
    const distribution = await createCloudFrontDistribution(bucket.name)
    return { success: true, url: distribution.domainName }
  } catch (error) {
    logger.error('Deployment failed', { error: error.message, config })
    throw new DeploymentError(
      'Failed to deploy website',
      'DEPLOYMENT_FAILED',
      'AWS'
    )
  }
}
```

### ESLint Configuration

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', '@typescript-eslint/recommended', 'prettier'],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-const': 'error',
    'no-var': 'error',
  },
}
```

### Prettier Configuration

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false
}
```

## Testing

### Test Structure

```typescript
// __tests__/services/s3-service.test.ts
import { S3Service } from '../../src/services/s3-service'
import { mockClient } from 'aws-sdk-client-mock'
import { S3Client, CreateBucketCommand } from '@aws-sdk/client-s3'

const s3Mock = mockClient(S3Client)

describe('S3Service', () => {
  let s3Service: S3Service

  beforeEach(() => {
    s3Service = new S3Service({ region: 'us-east-1' })
    s3Mock.reset()
  })

  describe('createWebsiteBucket', () => {
    it('should create a website bucket successfully', async () => {
      // Arrange
      const bucketName = 'test-bucket'
      s3Mock.on(CreateBucketCommand).resolves({})

      // Act
      const result = await s3Service.createWebsiteBucket(bucketName)

      // Assert
      expect(result.success).toBe(true)
      expect(result.bucketName).toBe(bucketName)
      expect(s3Mock.call(0).args[0].input).toMatchObject({
        Bucket: bucketName,
      })
    })

    it('should handle bucket already exists error', async () => {
      // Arrange
      const bucketName = 'existing-bucket'
      s3Mock.on(CreateBucketCommand).rejects({
        name: 'BucketAlreadyExists',
        message: 'Bucket already exists',
      })

      // Act & Assert
      await expect(s3Service.createWebsiteBucket(bucketName)).rejects.toThrow(
        "Bucket name 'existing-bucket' is already taken"
      )
    })
  })
})
```

### Test Coverage Requirements

- **Unit Tests**: Minimum 80% coverage for services
- **Integration Tests**: Cover main deployment workflows
- **Error Scenarios**: Test all error conditions
- **Edge Cases**: Test boundary conditions

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- s3-service.test.ts

# Run tests in watch mode
npm run test:watch

# Run integration tests
npm run test:integration
```

## Building and Publishing

### Build Process

```bash
# Clean previous build
npm run clean

# Type checking
npm run type-check

# Build TypeScript
npm run build

# Bundle for distribution
npm run bundle
```

### Package Configuration

```json
{
  "name": "@aws-deploy-ai/mcp-server",
  "version": "1.0.0",
  "main": "dist/main.js",
  "types": "dist/main.d.ts",
  "files": ["dist/**/*", "README.md", "package.json"],
  "scripts": {
    "prepublishOnly": "npm run build && npm test"
  }
}
```

### Release Process

1. **Update version** in `package.json`
2. **Update CHANGELOG.md** with new changes
3. **Run tests** and ensure they pass
4. **Build the package**:
   ```bash
   npm run build
   ```
5. **Tag the release**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
6. **Publish to npm**:
   ```bash
   npm publish
   ```

## Extending Functionality

### Adding New AWS Services

1. **Create service class**:

```typescript
// src/services/route53-service.ts
export class Route53Service {
  private client: Route53Client

  constructor(config: AWSConfig) {
    this.client = new Route53Client({ region: config.region })
  }

  async createHostedZone(domainName: string): Promise<HostedZoneResult> {
    try {
      const command = new CreateHostedZoneCommand({
        Name: domainName,
        CallerReference: `${domainName}-${Date.now()}`,
      })

      const response = await this.client.send(command)

      return {
        hostedZoneId: response.HostedZone?.Id || '',
        nameServers: response.DelegationSet?.NameServers || [],
        success: true,
      }
    } catch (error) {
      logger.error('Failed to create hosted zone', {
        error: error.message,
        domainName,
      })
      throw new DeploymentError(
        'Failed to create hosted zone',
        'HOSTED_ZONE_CREATION_FAILED',
        'Route53',
        { domainName }
      )
    }
  }
}
```

2. **Add types**:

```typescript
// src/types/aws.ts
export interface HostedZoneResult {
  hostedZoneId: string
  nameServers: string[]
  success: boolean
  error?: string
}
```

3. **Integrate with deployment tools**:

```typescript
// src/tools/deployment-tools.ts
export class DeploymentTools {
  constructor(
    // ... existing services
    private route53Service: Route53Service
  ) {}

  async deployWebsite(
    prompt: string,
    files?: Record<string, string>
  ): Promise<DeploymentResult> {
    const intent = await this.aiService.parseDeploymentIntent(prompt)

    // ... existing deployment logic

    // Add custom domain if specified
    if (intent.requirements.customDomain) {
      const hostedZone = await this.route53Service.createHostedZone(
        intent.requirements.customDomain
      )
      // Configure CloudFront with custom domain
    }

    return result
  }
}
```

### Adding New MCP Tools

1. **Define tool schema**:

```typescript
// Add to main.ts
const tools = [
  // ... existing tools
  {
    name: 'configure-custom-domain',
    description: 'Configure a custom domain for an existing deployment',
    inputSchema: {
      type: 'object',
      properties: {
        deploymentId: { type: 'string' },
        domainName: { type: 'string' },
      },
      required: ['deploymentId', 'domainName'],
    },
  },
]
```

2. **Implement tool handler**:

```typescript
// Add to main.ts
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'configure-custom-domain') {
    const { deploymentId, domainName } = request.params.arguments as {
      deploymentId: string
      domainName: string
    }

    const result = await deploymentTools.configureCustomDomain(
      deploymentId,
      domainName
    )

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    }
  }

  // ... handle other tools
})
```

### Adding AI Capabilities

Extend the AI interpreter with new capabilities:

```typescript
// src/services/ai-interpreter.ts
export class AIInterpreterService {
  async generateOptimizationSuggestions(
    deploymentConfig: DeploymentConfig
  ): Promise<string[]> {
    const prompt = `
      Analyze this deployment configuration and suggest optimizations:
      ${JSON.stringify(deploymentConfig, null, 2)}
      
      Focus on:
      - Cost optimization
      - Performance improvements
      - Security enhancements
      - Scalability considerations
    `

    const response = await this.invokeClaudeModel(
      'You are an expert AWS cloud architect.',
      prompt,
      false
    )

    const suggestions = response || ''
    return suggestions.split('\n').filter((line) => line.trim().startsWith('-'))
  }
}
```

## Debugging

### Logging Configuration

```typescript
// src/utils/logger.ts
import winston from 'winston'

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
})
```

### Debug Mode

Enable detailed debugging:

```bash
# Set environment variables
export NODE_ENV=development
export LOG_LEVEL=debug
export DEBUG_AWS_REQUESTS=true

# Start with debugging
npm run dev
```

### Common Debug Patterns

```typescript
// Service debugging
export class S3Service {
  async createWebsiteBucket(bucketName: string): Promise<S3BucketResult> {
    logger.debug('Creating S3 bucket', {
      bucketName,
      region: this.config.region,
    })

    try {
      const command = new CreateBucketCommand({ Bucket: bucketName })

      if (process.env.DEBUG_AWS_REQUESTS === 'true') {
        logger.debug('S3 CreateBucket request', { command: command.input })
      }

      const response = await this.client.send(command)

      logger.debug('S3 bucket created successfully', {
        bucketName,
        location: response.Location,
      })

      return { bucketName, success: true }
    } catch (error) {
      logger.error('Failed to create S3 bucket', {
        error: error.message,
        bucketName,
        stack: error.stack,
      })
      throw error
    }
  }
}
```

### Performance Monitoring

```typescript
// src/utils/performance.ts
export class PerformanceMonitor {
  private metrics: Map<string, number> = new Map()

  startTimer(operation: string): () => void {
    const start = Date.now()

    return () => {
      const duration = Date.now() - start
      this.metrics.set(operation, duration)

      logger.info('Operation completed', {
        operation,
        duration: `${duration}ms`,
      })

      if (duration > 30000) {
        logger.warn('Slow operation detected', { operation, duration })
      }
    }
  }

  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics.entries())
  }
}

// Usage in services
const monitor = new PerformanceMonitor()

export class DeploymentTools {
  async deployWebsite(prompt: string): Promise<DeploymentResult> {
    const endTimer = monitor.startTimer('deployWebsite')

    try {
      // Deployment logic
      return result
    } finally {
      endTimer()
    }
  }
}
```

### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug MCP Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/mcp-server/dist/main.js",
      "env": {
        "NODE_ENV": "development",
        "LOG_LEVEL": "debug"
      },
      "console": "integratedTerminal",
      "sourceMaps": true,
      "outFiles": ["${workspaceFolder}/mcp-server/dist/**/*.js"]
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

---

This development guide provides comprehensive information for contributing to AWS Deploy AI. Follow these guidelines to ensure consistent, high-quality code that integrates well with the existing codebase.
