# AWS Deploy AI - MCP Server

A powerful Model Context Protocol (MCP) server that enables AI assistants to deploy applications to AWS using natural language commands. Now with **GitHub integration** for seamless repository-based deployments!

## 🌟 Features

- **Natural Language Deployments**: Describe what you want to deploy in plain English
- **GitHub Integration**: Deploy directly from GitHub repositories with automatic project analysis
- **Intelligent Project Analysis**: Automatically detects project types (React, Vue, Angular, Node.js, Python, etc.)
- **AWS Bedrock AI**: Uses Claude 3 for intelligent deployment planning and cost optimization
- **Multi-Service AWS Integration**: S3, CloudFront, Lambda, IAM, Route53, ACM, and more
- **Real-time Status Tracking**: Monitor deployment progress with detailed status updates
- **Cost Estimation**: Get accurate cost projections before deploying
- **Security Best Practices**: Follows AWS security recommendations and least-privilege access

## 🚀 Quick Start

### Prerequisites

1. **AWS Account** with programmatic access
2. **AWS Bedrock** access enabled (Claude 3 model)
3. **GitHub Personal Access Token** (optional, for private repos)
4. **Node.js** 18+ and npm

### Installation

1. Clone and install dependencies:
```bash
git clone <repository-url>
cd mcp-server
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. Required environment variables:
```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1

# GitHub Integration (optional)
GITHUB_TOKEN=your_github_personal_access_token

# Logging
LOG_LEVEL=info
```

4. Build the server:
```bash
npm run build
```

5. Start the MCP server:
```bash
npm start
```

## 🛠️ Available Tools

The MCP server provides the following tools:

### 1. `deploy-website`
Deploy a website or application to AWS based on natural language prompt.

**Parameters:**
- `prompt` (required): Natural language description of what you want to deploy
- `files` (optional): Array of files to deploy

**Example:**
```
Deploy my React portfolio website with a contact form
```

### 2. `deploy-from-github` ⭐ NEW!
Deploy directly from a GitHub repository to AWS with automatic project analysis.

**Parameters:**
- `repository` (required): GitHub repository in format "owner/repo"
- `prompt` (required): Natural language description of deployment requirements
- `branch` (optional): Branch to deploy (default: main)
- `path` (optional): Path within repository to deploy

**Example:**
```
repository: "username/my-portfolio"
prompt: "Deploy this React app with CloudFront CDN and custom domain"
```

### 3. `analyze-github-repo` ⭐ NEW!
Analyze a GitHub repository to understand its deployment requirements and project structure.

**Parameters:**
- `repository` (required): GitHub repository in format "owner/repo"
- `branch` (optional): Branch to analyze (default: main)

**Example:**
```
repository: "facebook/react"
```

### 4. `list-github-repos` ⭐ NEW!
List GitHub repositories for a user with deployment insights.

**Parameters:**
- `username` (optional): GitHub username (uses authenticated user if not provided)
- `page` (optional): Page number for pagination (default: 1)
- `per_page` (optional): Number of repositories per page (default: 10, max: 30)

### 5. `get-deployment-status`
Check the status of a deployment by its ID.

**Parameters:**
- `deploymentId` (required): The deployment ID returned from deployment commands

### 6. `analyze-deployment-prompt`
Analyze a deployment prompt and provide detailed recommendations.

**Parameters:**
- `prompt` (required): Natural language deployment description

### 7. `get-cost-estimate`
Get detailed cost estimates for a deployment.

**Parameters:**
- `prompt` (required): Natural language deployment description

## 🔧 Usage Examples

### Basic Website Deployment
```bash
# Deploy a simple website
deploy-website: "Deploy my HTML/CSS/JS portfolio website with global CDN"
```

### GitHub Repository Deployment
```bash
# Analyze a repository first
analyze-github-repo: repository="vercel/next.js"

# Deploy from GitHub
deploy-from-github: 
  repository="myusername/my-app"
  prompt="Deploy this Next.js app with serverless functions and custom domain"
```

### Project Analysis and Planning
```bash
# Get deployment recommendations
analyze-deployment-prompt: "I want to deploy a React app with user authentication and a PostgreSQL database"

# Get cost estimates
get-cost-estimate: "Static website with 10GB storage and 1TB monthly transfer"
```

## 🏗️ Supported Project Types

The server automatically detects and supports:

- **Static Websites**: HTML, CSS, JavaScript files
- **React Applications**: Create React App, Next.js, Vite
- **Vue.js Applications**: Vue CLI, Nuxt.js, Vite
- **Angular Applications**: Angular CLI projects
- **Node.js APIs**: Express, Fastify, serverless functions
- **Python Applications**: Flask, FastAPI, serverless functions
- **Custom Projects**: Manual configuration support

## 🔐 Security & Permissions

Required AWS IAM permissions:
- S3: Bucket creation, object management
- CloudFront: Distribution management
- Lambda: Function creation and deployment
- IAM: Role and policy management
- Route53: DNS management (for custom domains)
- ACM: SSL certificate management
- Bedrock: Model invocation

## 📊 Monitoring & Logging

- **Structured Logging**: Winston-based logging with rotation
- **Deployment Tracking**: Real-time status updates and progress tracking
- **Error Handling**: Comprehensive error reporting and recovery suggestions
- **Cost Monitoring**: Pre-deployment cost estimates and optimization tips

## 🤝 GitHub Integration Features

### Repository Analysis
- Automatic project type detection
- Dependency analysis
- Build configuration detection
- Deployment recommendations

### Supported Repository Types
- Public repositories (no token required)
- Private repositories (requires GITHUB_TOKEN)
- Organization repositories
- Monorepos with path specification

### Build Process Support
- npm/yarn build scripts
- Custom build commands
- Output directory detection
- Static site generation

## 🐛 Troubleshooting

### Common Issues

1. **AWS Credentials Not Found**
   - Ensure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set
   - Check AWS region configuration

2. **Bedrock Access Denied**
   - Enable Bedrock access in your AWS region
   - Ensure Claude 3 model access is granted

3. **GitHub Repository Not Found**
   - Check repository name format ("owner/repo")
   - Set GITHUB_TOKEN for private repositories
   - Verify repository permissions

4. **Build Failures**
   - Check project dependencies
   - Verify build scripts in package.json
   - Review deployment logs

## 📈 Performance & Scaling

- **Serverless Architecture**: Automatic scaling based on demand
- **CDN Integration**: Global content delivery via CloudFront
- **Optimized Builds**: Automatic build optimization and caching
- **Cost Optimization**: Smart resource allocation and usage-based pricing

## 🔄 Updates & Maintenance

The server includes automatic update mechanisms and maintenance features:
- Dependency vulnerability scanning
- Performance monitoring
- Cost optimization suggestions
- Infrastructure health checks

## 📝 Development

### Project Structure
```
mcp-server/
├── src/
│   ├── services/          # Core services
│   │   ├── ai-interpreter.ts    # AWS Bedrock integration
│   │   ├── github-service.ts    # GitHub API integration
│   │   ├── s3-service.ts        # S3 operations
│   │   ├── cloudfront-service.ts # CDN management
│   │   └── lambda-service.ts    # Serverless functions
│   ├── tools/             # MCP tool definitions
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── main.ts                # MCP server entry point
└── package.json           # Dependencies and scripts
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Made with ❤️ for the AWS and GitHub developer community**

For support, issues, or feature requests, please open an issue on the GitHub repository.