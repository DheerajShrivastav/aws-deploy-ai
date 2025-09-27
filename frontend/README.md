# AWS Deploy AI - Frontend

A modern web interface for deploying GitHub repositories to AWS infrastructure using AI-powered automation.

## Features

🚀 **AI-Powered Deployments**

- Natural language deployment instructions
- Intelligent AWS resource provisioning
- Automated infrastructure setup

🔗 **GitHub Integration**

- Connect your GitHub repositories
- Automatic project analysis
- Support for multiple project types (React, Vue, Angular, Node.js, Python)

📊 **Real-time Monitoring**

- Live deployment status tracking
- Progress indicators
- Error handling and recovery

☁️ **AWS Infrastructure**

- S3 static website hosting
- CloudFront CDN distribution
- Lambda serverless functions
- Route 53 DNS management
- SSL certificate provisioning

## Quick Start

### Prerequisites

- Node.js 18+ installed
- AWS credentials configured
- GitHub token (for private repositories)

### Environment Setup

1. **Configure AWS Credentials**

   ```bash
   export AWS_ACCESS_KEY_ID=your_access_key
   export AWS_SECRET_ACCESS_KEY=your_secret_key
   export AWS_REGION=us-east-1
   ```

2. **GitHub Token (Optional)**

   ```bash
   export GITHUB_TOKEN=your_github_personal_access_token
   ```

3. **MCP Server** (Auto-copied during build)
   The MCP server is automatically copied from `../mcp-server/dist/` to `./mcp-server/` during development and build.

### Installation & Running

1. **Quick Start (Recommended)**

   ```bash
   chmod +x start.sh
   ./start.sh
   ```

2. **Manual Setup**

   ```bash
   npm install --legacy-peer-deps
   cd ../mcp-server && npm run build && cd ../frontend
   npm run build
   npm run start
   ```

3. **Development Mode**
   ```bash
   npm run dev
   ```

The application will be available at:

- **Production**: `http://localhost:3000`
- **Development**: `http://localhost:3000`

## How to Use

### Step 1: Connect to GitHub

Click "Connect with GitHub" to access your repositories

### Step 2: Select Repository

Browse and select a repository for deployment

### Step 3: Configure Deployment

Write natural language instructions:

- "Deploy this React app with CloudFront CDN and SSL certificate"
- "Create a serverless API deployment with custom domain"

### Step 4: Monitor Progress

Watch real-time deployment progress and get live URLs

## Project Types Supported

- **Static**: HTML, CSS, JS websites → S3 + CloudFront
- **React/Vue/Angular**: SPA applications → S3 + CloudFront + Build
- **Node.js/Python**: API servers → Lambda + API Gateway

## Development

```bash
npm run dev          # Development mode
npm run build        # Production build
npm run server       # Start integrated server
```
