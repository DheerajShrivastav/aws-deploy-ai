# Real AWS Deployment Configuration

## Prerequisites

### 1. AWS Account Setup

- Create an AWS account
- Configure AWS CLI with credentials
- Set up IAM user with required permissions

### 2. Required AWS Permissions

The MCP server needs the following AWS permissions:

- EC2: Launch instances, create security groups, manage key pairs
- S3: Create buckets, upload files
- CloudFront: Create distributions (for static sites)
- Lambda: Create functions (for serverless)

### 3. Security Group Configuration

Create a security group with the following rules:

- Port 22 (SSH) - For server management
- Port 80 (HTTP) - For web traffic
- Port 443 (HTTPS) - For secure web traffic
- Port 3000 (Custom) - For Node.js applications

### 4. Key Pair Setup

Create an EC2 key pair named `aws-deploy-ai-key` for SSH access to instances.

## Environment Variables

Set the following environment variables in the MCP server:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# GitHub Integration
GITHUB_TOKEN=your_github_token
```

## Deployment Flow

### 1. Repository Analysis

- Clones the GitHub repository to `/tmp/deployments/{deploymentId}/`
- Analyzes project structure (package.json, framework, dependencies)
- Determines optimal deployment strategy

### 2. Infrastructure Provisioning

Based on the deployment plan:

#### EC2 Deployment (Default)

- Launches Amazon Linux 2 t2.micro instance
- Installs Node.js, git, nginx
- Sets up PM2 for process management
- Configures reverse proxy

#### Serverless Deployment

- Creates AWS Lambda functions
- Sets up API Gateway
- Configures S3 for static assets

#### Container Deployment

- Builds Docker image
- Pushes to ECR
- Deploys to ECS Fargate

### 3. Application Deployment

- Clones repository on target infrastructure
- Installs dependencies (`npm install`)
- Builds application (`npm run build`)
- Starts application with PM2
- Configures monitoring and logging

## Monitoring and Management

### Deployment Status Tracking

- Real-time step-by-step progress
- Error reporting and debugging
- Public URL generation
- Instance management

### Cost Estimation

- t2.micro instance: ~$8-10/month
- Data transfer: ~$1-5/month
- Storage: ~$1-3/month
- **Total estimated cost: $10-20/month**

## Security Considerations

1. **Network Security**

   - Security groups restrict access
   - SSH key authentication
   - HTTPS enforcement

2. **Application Security**

   - Environment variable management
   - Secrets management with AWS Systems Manager
   - Regular security updates

3. **Access Control**
   - IAM roles and policies
   - Least privilege principle
   - Audit logging

## Troubleshooting

### Common Issues

1. **Deployment timeouts**: Increase instance size or optimize build process
2. **Port conflicts**: Update security groups and application configuration
3. **Memory issues**: Upgrade to larger instance type
4. **Build failures**: Check dependencies and Node.js version compatibility

### Debugging

- Check CloudWatch logs for instance errors
- SSH into instance for direct debugging
- Monitor application logs via PM2
- Use deployment status tracking for step-by-step analysis

## Future Enhancements

1. **Auto-scaling**: Implement load balancers and auto-scaling groups
2. **CI/CD Integration**: Connect with GitHub Actions for automated deployments
3. **Multi-environment**: Support for staging, production environments
4. **Database Integration**: Automatic RDS setup for data-driven applications
5. **SSL/TLS**: Automatic certificate management with AWS Certificate Manager
