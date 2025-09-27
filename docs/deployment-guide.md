# AWS Deploy AI - Deployment Guide

This guide provides step-by-step instructions for deploying AWS Deploy AI in various environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Production Deployment](#production-deployment)
- [AWS Configuration](#aws-configuration)
- [Security Best Practices](#security-best-practices)
- [Monitoring and Logging](#monitoring-and-logging)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher (comes with Node.js)
- **Git**: For cloning the repository
- **AWS CLI**: Version 2.0 or higher (optional but recommended)

### AWS Account Setup

1. **Create an AWS Account**: If you don't have one, sign up at [aws.amazon.com](https://aws.amazon.com)

2. **Create IAM User**: Create a dedicated IAM user for AWS Deploy AI with programmatic access

3. **Attach Policies**: Attach the following AWS managed policies:
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
   - `AWSLambda_FullAccess`
   - `IAMFullAccess`
   - `AmazonRoute53FullAccess`
   - `AWSCertificateManagerFullAccess`

### AWS Bedrock Setup

AWS Bedrock provides the AI capabilities for natural language deployment interpretation. Ensure you have access to Bedrock in your AWS region.

1. **Enable Bedrock Access**: Bedrock is available in select AWS regions. Check [AWS Bedrock documentation](https://docs.aws.amazon.com/bedrock/) for region availability

2. **Request Model Access**: You may need to request access to Claude 3 models through the AWS Bedrock console

3. **Verify Permissions**: Ensure your IAM user/role has permissions for `bedrock:InvokeModel` action

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/DheerajShrivastav/aws-deploy-ai.git
cd aws-deploy-ai
```

### 2. Configure Environment Variables

```bash
cd mcp-server
cp .env.example .env
```

Edit the `.env` file with your credentials:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# AWS Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_REGION=us-east-1

# Development Configuration
NODE_ENV=development
LOG_LEVEL=debug
```

### 3. Install Dependencies

```bash
# Install MCP Server dependencies
cd mcp-server
npm install

# Install Frontend dependencies (optional)
cd ../frontend
npm install
```

### 4. Build and Start

```bash
# Build MCP Server
cd mcp-server
npm run build

# Start in development mode
npm run dev

# Or in separate terminals:
# Terminal 1 - MCP Server
cd mcp-server
npm run dev

# Terminal 2 - Frontend (optional)
cd frontend
npm run dev
```

### 5. Verify Installation

Test the MCP server with a simple deployment:

```bash
# Test using MCP Inspector (if available)
npx @modelcontextprotocol/inspector

# Or test directly with the deployment tool
# (Implementation specific to your MCP client)
```

## Production Deployment

### Option 1: AWS EC2 Deployment

#### 1. Launch EC2 Instance

```bash
# Create EC2 instance
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \
  --instance-type t3.micro \
  --key-name your-key-pair \
  --security-groups aws-deploy-ai-sg \
  --user-data file://user-data.sh
```

#### 2. Security Group Configuration

```bash
# Create security group
aws ec2 create-security-group \
  --group-name aws-deploy-ai-sg \
  --description "Security group for AWS Deploy AI"

# Allow SSH access
aws ec2 authorize-security-group-ingress \
  --group-name aws-deploy-ai-sg \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# Allow HTTP/HTTPS access (for frontend)
aws ec2 authorize-security-group-ingress \
  --group-name aws-deploy-ai-sg \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0

aws ec2 authorize-security-group-ingress \
  --group-name aws-deploy-ai-sg \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0
```

#### 3. User Data Script

Create `user-data.sh`:

```bash
#!/bin/bash
yum update -y
yum install -y git nodejs npm

# Install PM2 for process management
npm install -g pm2

# Clone and setup application
cd /home/ec2-user
git clone https://github.com/DheerajShrivastav/aws-deploy-ai.git
cd aws-deploy-ai/mcp-server

# Install dependencies
npm install
npm run build

# Setup environment
cp .env.example .env
# Note: You'll need to manually configure .env with your credentials

# Start with PM2
pm2 start dist/main.js --name "aws-deploy-ai"
pm2 startup
pm2 save
```

### Option 2: Docker Deployment

#### 1. Create Dockerfile

Create `Dockerfile` in the project root:

```dockerfile
# Multi-stage build
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY mcp-server/package*.json ./mcp-server/
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN cd mcp-server && npm ci --only=production
RUN cd frontend && npm ci --only=production

# Copy source code
COPY mcp-server/src ./mcp-server/src
COPY mcp-server/tsconfig.json ./mcp-server/
COPY frontend/src ./frontend/src
COPY frontend/next.config.js ./frontend/
COPY frontend/tailwind.config.js ./frontend/

# Build applications
RUN cd mcp-server && npm run build
RUN cd frontend && npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Copy built applications
COPY --from=builder /app/mcp-server/dist ./mcp-server/dist
COPY --from=builder /app/mcp-server/node_modules ./mcp-server/node_modules
COPY --from=builder /app/frontend/.next ./frontend/.next
COPY --from=builder /app/frontend/node_modules ./frontend/node_modules

# Create logs directory
RUN mkdir -p logs

# Expose ports
EXPOSE 3000 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start command
CMD ["node", "mcp-server/dist/main.js"]
```

#### 2. Build and Run Docker Container

```bash
# Build image
docker build -t aws-deploy-ai .

# Run container
docker run -d \
  --name aws-deploy-ai \
  -p 3000:3000 \
  -p 8080:8080 \
  -e AWS_ACCESS_KEY_ID=your_key \
  -e AWS_SECRET_ACCESS_KEY=your_secret \
  -e BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0 \
  -v $(pwd)/logs:/app/logs \
  aws-deploy-ai
```

### Option 3: AWS ECS Deployment

#### 1. Create Task Definition

```json
{
  "family": "aws-deploy-ai",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/aws-deploy-ai-task-role",
  "containerDefinitions": [
    {
      "name": "aws-deploy-ai",
      "image": "your-account.dkr.ecr.us-east-1.amazonaws.com/aws-deploy-ai:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "AWS_ACCESS_KEY_ID",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:account:secret:aws-deploy-ai-credentials"
        },
        {
          "name": "AWS_SECRET_ACCESS_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:account:secret:aws-deploy-ai-credentials"
        },
        {
          "name": "BEDROCK_MODEL_ID",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:account:secret:bedrock-config"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/aws/ecs/aws-deploy-ai",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

## AWS Configuration

### IAM Role Setup

#### 1. Create Execution Role

```bash
aws iam create-role \
  --role-name aws-deploy-ai-execution-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'

# Attach execution policy
aws iam attach-role-policy \
  --role-name aws-deploy-ai-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

#### 2. Create Task Role

```bash
aws iam create-role \
  --role-name aws-deploy-ai-task-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }'
```

#### 3. Create Custom Policy

Create `aws-deploy-ai-policy.json`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:PutBucketWebsite",
        "s3:PutBucketPolicy"
      ],
      "Resource": [
        "arn:aws:s3:::aws-deploy-ai-*",
        "arn:aws:s3:::aws-deploy-ai-*/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateDistribution",
        "cloudfront:GetDistribution",
        "cloudfront:UpdateDistribution",
        "cloudfront:DeleteDistribution",
        "cloudfront:CreateInvalidation"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:CreateFunction",
        "lambda:DeleteFunction",
        "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration",
        "lambda:InvokeFunction"
      ],
      "Resource": "arn:aws:lambda:*:*:function:aws-deploy-ai-*"
    },
    {
      "Effect": "Allow",
      "Action": ["iam:CreateRole", "iam:AttachRolePolicy", "iam:PassRole"],
      "Resource": "arn:aws:iam::*:role/aws-deploy-ai-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:CreateHostedZone",
        "route53:ChangeResourceRecordSets",
        "route53:GetChange"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "acm:RequestCertificate",
        "acm:DescribeCertificate",
        "acm:GetCertificate"
      ],
      "Resource": "*"
    }
  ]
}
```

Apply the policy:

```bash
aws iam create-policy \
  --policy-name aws-deploy-ai-policy \
  --policy-document file://aws-deploy-ai-policy.json

aws iam attach-role-policy \
  --role-name aws-deploy-ai-task-role \
  --policy-arn arn:aws:iam::your-account:policy/aws-deploy-ai-policy
```

## Security Best Practices

### 1. Credential Management

- **Never commit credentials to version control**
- **Use AWS Secrets Manager for production credentials**
- **Rotate credentials regularly**
- **Use IAM roles instead of access keys when possible**

### 2. Network Security

- **Use VPC with private subnets for ECS deployment**
- **Configure security groups with minimal required access**
- **Enable VPC Flow Logs for network monitoring**

### 3. Application Security

- **Keep dependencies updated**
- **Use HTTPS for all communications**
- **Implement proper input validation**
- **Enable CloudTrail for audit logging**

### 4. Resource Isolation

- **Use separate AWS accounts for different environments**
- **Implement resource tagging for cost tracking**
- **Set up billing alerts and budgets**

## Monitoring and Logging

### 1. CloudWatch Setup

```bash
# Create log group
aws logs create-log-group --log-group-name /aws/ecs/aws-deploy-ai

# Create custom metrics dashboard
aws cloudwatch put-dashboard \
  --dashboard-name "AWS-Deploy-AI" \
  --dashboard-body file://dashboard.json
```

### 2. Application Metrics

Monitor these key metrics:

- **Deployment Success Rate**: Percentage of successful deployments
- **Average Deployment Time**: Time from initiation to completion
- **Cost Per Deployment**: Average AWS cost per deployment
- **Error Rate**: Percentage of failed operations
- **Resource Utilization**: CPU, memory, and network usage

### 3. Alerting

Set up CloudWatch alarms for:

- **High error rates**
- **Deployment failures**
- **Unusual cost spikes**
- **Resource exhaustion**

## Troubleshooting

### Common Issues

#### 1. AWS Permissions Errors

**Symptom**: `AccessDenied` errors during deployment

**Solution**:

```bash
# Check current permissions
aws sts get-caller-identity
aws iam get-user

# Verify attached policies
aws iam list-attached-user-policies --user-name your-username
```

#### 2. AWS Bedrock Rate Limits

**Symptom**: `ThrottlingException` or rate limit errors

**Solution**:

- Implement exponential backoff
- Request quota increase through AWS Support
- Cache AI responses when possible

#### 3. CloudFront Distribution Creation Timeout

**Symptom**: CloudFront distribution stuck in "InProgress" state

**Solution**:

- Wait for completion (can take 15-20 minutes)
- Check for conflicting CNAME records
- Verify SSL certificate status

#### 4. Lambda Function Cold Starts

**Symptom**: Slow initial response times

**Solution**:

- Implement warming strategies
- Optimize function package size
- Consider provisioned concurrency

### Debug Mode

Enable detailed logging:

```bash
# Set environment variables
export LOG_LEVEL=debug
export NODE_ENV=development

# Start with debug output
npm run dev
```

### Log Analysis

Check logs for common patterns:

```bash
# Check recent errors
tail -f logs/error.log | grep ERROR

# Monitor deployment progress
tail -f logs/combined.log | grep "deployment"

# Check AWS API calls
grep "AWS" logs/combined.log
```

### Support Resources

- **GitHub Issues**: Report bugs and feature requests
- **AWS Support**: For AWS-specific and Bedrock issues
- **Community Discussions**: Share experiences and solutions

---

## Performance Optimization

### 1. MCP Server Optimization

- **Connection Pooling**: Reuse AWS SDK clients
- **Caching**: Cache AI responses and AWS resource information
- **Async Operations**: Use parallel processing where possible

### 2. Deployment Optimization

- **Regional Selection**: Choose AWS regions close to your users
- **Resource Right-Sizing**: Monitor and adjust resource allocations
- **CDN Configuration**: Optimize CloudFront caching policies

### 3. Cost Optimization

- **Resource Cleanup**: Automatically clean up unused resources
- **Scheduled Scaling**: Scale down non-production environments
- **Reserved Instances**: Use RIs for predictable workloads

---

This deployment guide provides comprehensive instructions for setting up AWS Deploy AI in various environments. Choose the deployment method that best fits your requirements and follow the security best practices to ensure a secure and reliable installation.
