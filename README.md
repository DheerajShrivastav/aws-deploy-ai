# AWS Deploy AI - AI-Powered AWS Deployment Platform (Monorepo)

<div align="center">
  <img src="https://img.shields.io/badge/AWS-Deploy%20AI-blue?style=for-the-badge&logo=amazon-aws" alt="AWS Deploy AI">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/AWS_Bedrock-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white" alt="AWS Bedrock">
  <img src="https://img.shields.io/badge/Monorepo-Workspace-green?style=for-the-badge" alt="Monorepo">
</div>

## 🏗️ Monorepo Architecture

This monorepo contains two main packages:

- **@aws-deploy-ai/mcp-server**: Model Context Protocol server with AWS Bedrock integration
- **@aws-deploy-ai/frontend**: Next.js web interface for the deployment platform

## 🚀 Quick Start

```bash
# Install all dependencies and build MCP server
npm run install-all

# Start development environment (both packages)
npm run dev

# Access the web interface at http://localhost:3000
```

<div align="center">
  <h3>🚀 Deploy websites and applications to AWS using simple, natural language prompts</h3>
  <p>No cloud expertise required. Just describe what you want, and watch your infrastructure come to life.</p>
</div>

---

## 🌟 Features

### 🤖 **AI-Powered Deployment**

- **Natural Language Processing**: Describe your deployment in plain English
- **Intelligent Infrastructure Recommendations**: AI analyzes your needs and suggests optimal AWS services
- **Cost Optimization**: Automatic selection of cost-effective resources
- **Smart Defaults**: Production-ready configurations out of the box

### ☁️ **Comprehensive AWS Integration**

- **Static Websites**: S3 + CloudFront for lightning-fast static sites
- **Single Page Applications**: Optimized SPA deployment with proper routing
- **Serverless APIs**: Lambda functions with API Gateway integration
- **Full-Stack Applications**: Complete infrastructure orchestration
- **Custom Domains**: Automatic SSL certificate provisioning and DNS setup

### 📊 **Real-Time Monitoring**

- **Live Deployment Progress**: Watch your infrastructure being created in real-time
- **Cost Tracking**: Transparent cost estimates and monitoring
- **Resource Management**: View and manage all deployed resources
- **Health Monitoring**: Automatic health checks and alerts

### 🎯 **Developer-Friendly**

- **Model Context Protocol (MCP)**: Extensible architecture for easy integration
- **TypeScript**: Full type safety throughout the codebase
- **Modern Stack**: Next.js frontend with Tailwind CSS
- **Comprehensive Logging**: Detailed deployment logs and error tracking

---

## 🚀 Quick Start

### Prerequisites

```bash
# Node.js 18+ required
node --version  # Should be 18.0.0 or higher

# AWS CLI configured
aws configure
# OR set environment variables:
# AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION

# Ensure AWS Bedrock access is enabled in your region
```

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/DheerajShrivastav/aws-deploy-ai.git
cd aws-deploy-ai
```

2. **Set up the MCP Server**

```bash
cd mcp-server
npm install
cp .env.example .env
# Edit .env with your AWS credentials
npm run build
```

3. **Set up the Frontend** (Optional)

```bash
cd ../frontend
npm install
npm run dev  # Runs on http://localhost:3000
```

4. **Start the MCP Server**

```bash
cd ../mcp-server
npm run dev  # For development
# OR
npm start    # For production
```

---

## 💻 Usage Examples

### Basic Static Website

```
"Deploy my portfolio website with my resume and projects"
```

### React Application

```
"Deploy my React app with custom domain myportfolio.com and SSL certificate"
```

### Blog Site

```
"Create a blog website with fast loading and SEO optimization"
```

### E-commerce Store

```
"Deploy my online store with product catalog and payment processing"
```

### API Backend

```
"Set up a serverless API for my mobile app with database integration"
```

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   MCP Server    │    │   AWS Services  │
│   (Next.js)     │────│   (TypeScript)  │────│   (Auto-Deploy) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         │              ┌─────────────────┐                │
         └──────────────│  AI Interpreter │────────────────┘
                        │ (AWS Bedrock)   │
                        └─────────────────┘
```

### Core Components

#### 🧠 **AI Interpreter Service**

- Parses natural language deployment requests
- Generates infrastructure requirements
- Provides cost estimates and recommendations
- Powered by AWS Bedrock (Claude 3) for intelligent analysis

#### ⚙️ **AWS Service Orchestration**

- **S3 Service**: Static website hosting and asset storage
- **CloudFront Service**: Global CDN distribution
- **Lambda Service**: Serverless function deployment
- **IAM Service**: Automated security policy creation
- **Route53 Service**: DNS and domain management

#### 🔄 **Deployment Workflow Engine**

- State machine for deployment orchestration
- Real-time progress tracking
- Error handling and rollback capabilities
- Resource lifecycle management

---

## 🛠️ Configuration

### Environment Variables

Create a `.env` file in the `mcp-server` directory:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# AWS Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_REGION=us-east-1

# Deployment Configuration
DEFAULT_BUCKET_PREFIX=aws-deploy-ai
DEFAULT_CLOUDFRONT_PRICE_CLASS=PriceClass_100

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/aws-deploy-ai.log

# Security Configuration
ENCRYPTION_KEY=your_encryption_key_here
```

### AWS IAM Permissions

Your AWS user/role needs the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:*",
        "cloudfront:*",
        "lambda:*",
        "iam:CreateRole",
        "iam:AttachRolePolicy",
        "iam:PassRole",
        "route53:*",
        "acm:*",
        "apigateway:*",
        "logs:*"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 📡 API Reference

### MCP Tools

#### `deploy-website`

Deploy a website or application to AWS.

**Parameters:**

- `prompt` (string): Natural language description of what to deploy
- `projectName` (string, optional): Name of the project
- `customDomain` (string, optional): Custom domain name
- `environment` (string, optional): deployment environment (development/staging/production)

**Example:**

```typescript
await mcpClient.callTool('deploy-website', {
  prompt: 'Deploy my React portfolio with contact form',
  projectName: 'my-portfolio',
  customDomain: 'johnsmith.dev',
  environment: 'production',
})
```

#### `get-deployment-status`

Check the status of a deployment.

**Parameters:**

- `deploymentId` (string): The deployment ID to check

#### `analyze-deployment`

Analyze deployment requirements without deploying.

**Parameters:**

- `prompt` (string): Deployment requirements to analyze

#### `get-cost-estimate`

Get detailed cost estimates for a deployment.

**Parameters:**

- `prompt` (string): Deployment requirements for cost estimation

---

## 🎯 Supported Project Types

| Project Type        | Description                      | AWS Services Used                |
| ------------------- | -------------------------------- | -------------------------------- |
| **Static Website**  | HTML, CSS, JS files              | S3, CloudFront, Route53          |
| **Single Page App** | React, Vue, Angular apps         | S3, CloudFront, Route53          |
| **Blog**            | Content-focused websites         | S3, CloudFront, Lambda           |
| **E-commerce**      | Online stores                    | S3, CloudFront, Lambda, DynamoDB |
| **API Backend**     | RESTful APIs                     | Lambda, API Gateway, DynamoDB    |
| **Full-Stack App**  | Complete web applications        | All services                     |
| **Documentation**   | Documentation sites              | S3, CloudFront                   |
| **Portfolio**       | Personal/professional portfolios | S3, CloudFront, Route53          |

---

## 💰 Cost Estimation

### Typical Monthly Costs

| Project Type   | Small Traffic | Medium Traffic | High Traffic |
| -------------- | ------------- | -------------- | ------------ |
| Static Website | $2-5          | $10-25         | $50-100      |
| SPA            | $3-8          | $15-35         | $75-150      |
| API Backend    | $5-15         | $25-75         | $100-300     |
| Full-Stack App | $10-30        | $50-150        | $200-500     |

_Costs include S3 storage, CloudFront distribution, Lambda execution, and data transfer. Actual costs may vary based on usage patterns._

### Cost Optimization Features

- **Intelligent Resource Sizing**: AI selects optimal resource configurations
- **Free Tier Utilization**: Maximizes use of AWS free tier benefits
- **Caching Optimization**: CloudFront caching reduces data transfer costs
- **Serverless-First**: Uses cost-effective serverless services when possible

---

## 🔧 Development

### Project Structure

```
aws-deploy-ai/
├── mcp-server/                 # MCP Server (TypeScript)
│   ├── src/
│   │   ├── main.ts            # Server entry point
│   │   ├── services/          # AWS service integrations
│   │   ├── tools/             # MCP tool implementations
│   │   ├── types/             # TypeScript type definitions
│   │   └── utils/             # Utility functions
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                   # Next.js Frontend (Optional)
│   ├── src/app/               # Next.js App Router
│   ├── components/            # React components
│   ├── package.json
│   └── tailwind.config.js
│
└── docs/                      # Documentation
    ├── api.md                 # API documentation
    ├── deployment-guide.md    # Deployment guide
    └── examples/              # Usage examples
```

### Running Tests

```bash
# MCP Server tests
cd mcp-server
npm test

# Frontend tests
cd frontend
npm test
```

### Building for Production

```bash
# Build MCP Server
cd mcp-server
npm run build

# Build Frontend
cd frontend
npm run build
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Add tests for new functionality
5. Run tests: `npm test`
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Model Context Protocol (MCP)**: For providing the extensible server framework
- **AWS Bedrock**: For powering the intelligent deployment analysis with Claude 3
- **AWS**: For providing the robust cloud infrastructure platform
- **Next.js & Tailwind CSS**: For the beautiful and responsive frontend

---

## 📞 Support

- **Documentation**: [Full Documentation](docs/)
- **GitHub Issues**: [Report Bugs or Request Features](https://github.com/DheerajShrivastav/aws-deploy-ai/issues)
- **Discussions**: [Community Discussions](https://github.com/DheerajShrivastav/aws-deploy-ai/discussions)

---

<div align="center">
  <p>Made with ❤️ for developers who want to focus on building, not configuring infrastructure.</p>
  <p><strong>Deploy with AI. Scale with AWS. Build without limits.</strong></p>
</div>
