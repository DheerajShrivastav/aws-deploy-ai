import { NextRequest, NextResponse } from 'next/server'

// Simple HTTP-based MCP communication (no process spawning)
// This avoids all Next.js build-time analysis issues

interface MCPRequest {
  method: string
  params: any
}

interface MCPResponse {
  result?: any
  error?: any
}

// GitHub API helper functions
async function fetchGitHubRepository(owner: string, repo: string) {
  try {
    // Get repository metadata
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`
    )
    if (!repoResponse.ok) throw new Error('Repository not found')
    const repoData = await repoResponse.json()

    // Get repository contents
    const contentsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents`
    )
    const contents = contentsResponse.ok ? await contentsResponse.json() : []

    // Get package.json if it exists
    let packageJson = null
    try {
      const packageResponse = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/package.json`
      )
      if (packageResponse.ok) {
        const packageData = await packageResponse.json()
        if (packageData.content) {
          packageJson = JSON.parse(
            Buffer.from(packageData.content, 'base64').toString()
          )
        }
      }
    } catch (e) {
      // Package.json doesn't exist
    }

    return {
      name: repoData.name,
      language: repoData.language,
      description: repoData.description,
      contents: Array.isArray(contents) ? contents : [],
      packageJson,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
    }
  } catch (error) {
    console.error('GitHub API error:', error)
    return {
      name: repo,
      language: 'Unknown',
      description: 'Repository analysis failed',
      contents: [],
      packageJson: null,
      stars: 0,
      forks: 0,
    }
  }
}

function analyzeRepositoryData(repoData: any) {
  const { language, packageJson, contents } = repoData

  // Analyze file structure
  const fileNames = contents.map((file: any) => file.name.toLowerCase())
  const hasDockerfile = fileNames.includes('dockerfile')
  const hasPackageJson = fileNames.includes('package.json')
  const hasRequirementsTxt = fileNames.includes('requirements.txt')
  const hasComposerJson = fileNames.includes('composer.json')
  const hasCargoToml = fileNames.includes('cargo.toml')
  const hasGoMod = fileNames.includes('go.mod')

  // Determine framework and package manager
  let framework = 'Unknown'
  let packageManager = 'Unknown'
  let buildCommand = 'Unknown'
  let startCommand = 'Unknown'
  let port = 3000

  if (hasPackageJson && packageJson) {
    packageManager = fileNames.includes('yarn.lock')
      ? 'yarn'
      : fileNames.includes('pnpm-lock.yaml')
      ? 'pnpm'
      : 'npm'

    // Analyze package.json for framework
    const dependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }

    if (dependencies['next']) {
      framework = 'Next.js'
      buildCommand = `${packageManager} run build`
      startCommand = `${packageManager} run start`
      port = 3000
    } else if (dependencies['react']) {
      framework = 'React'
      buildCommand = `${packageManager} run build`
      startCommand = `${packageManager} run start`
      port = 3000
    } else if (dependencies['vue']) {
      framework = 'Vue.js'
      buildCommand = `${packageManager} run build`
      startCommand = `${packageManager} run serve`
      port = 8080
    } else if (dependencies['angular']) {
      framework = 'Angular'
      buildCommand = `${packageManager} run build`
      startCommand = `${packageManager} run start`
      port = 4200
    } else if (dependencies['express']) {
      framework = 'Express.js'
      buildCommand = 'Not required'
      startCommand = `${packageManager} start`
      port = 3000
    }
  } else if (hasRequirementsTxt || language === 'Python') {
    packageManager = 'pip'
    if (fileNames.includes('app.py') || fileNames.includes('main.py')) {
      framework = 'Flask/FastAPI'
      buildCommand = 'pip install -r requirements.txt'
      startCommand = 'python app.py'
      port = 5000
    } else {
      framework = 'Python'
      buildCommand = 'pip install -r requirements.txt'
      startCommand = 'python main.py'
      port = 8000
    }
  } else if (hasComposerJson || language === 'PHP') {
    packageManager = 'composer'
    framework = 'PHP'
    buildCommand = 'composer install'
    startCommand = 'php -S localhost:8000'
    port = 8000
  } else if (hasCargoToml || language === 'Rust') {
    packageManager = 'cargo'
    framework = 'Rust'
    buildCommand = 'cargo build --release'
    startCommand = 'cargo run'
    port = 8080
  } else if (hasGoMod || language === 'Go') {
    packageManager = 'go'
    framework = 'Go'
    buildCommand = 'go build'
    startCommand = 'go run main.go'
    port = 8080
  }

  return {
    language: language || 'Unknown',
    framework,
    packageManager,
    hasDatabase: false, // Would need more sophisticated analysis
    hasEnvVariables:
      fileNames.includes('.env') || fileNames.includes('.env.example'),
    buildCommand,
    startCommand,
    port,
    dependencies: packageJson?.dependencies
      ? Object.keys(packageJson.dependencies)
      : [],
    devDependencies: packageJson?.devDependencies
      ? Object.keys(packageJson.devDependencies)
      : [],
    staticAssets: fileNames.some((name: string) =>
      ['public', 'static', 'assets', 'dist', 'build'].includes(name)
    ),
    hasDockerfile,
  }
}

function generateDeploymentPlan(analysis: any, userPrompt: string) {
  const { framework, language, hasDockerfile, staticAssets } = analysis

  // Generate deployment plan based on framework and requirements
  let architecture = 'Containerized Application'
  let services = []
  let steps = []
  let estimatedCost = '$20-100'
  let deploymentTime = '30-60 minutes'

  if (framework.includes('Next.js') || framework.includes('React')) {
    if (staticAssets) {
      architecture = 'Static Site + API'
      services = [
        {
          name: 'Static Website',
          type: 'Amazon S3 + CloudFront',
          purpose: 'Host static files and assets',
          estimated_cost: '$5-20/month',
        },
        {
          name: 'API Backend',
          type: 'AWS Lambda + API Gateway',
          purpose: 'Handle dynamic requests',
          estimated_cost: '$10-30/month',
        },
      ]
      estimatedCost = '$15-50'
    } else {
      architecture = 'Serverless Application'
      services = [
        {
          name: 'Web Application',
          type: 'AWS Lambda + API Gateway',
          purpose: 'Serve the entire application',
          estimated_cost: '$10-40/month',
        },
      ]
      estimatedCost = '$10-40'
    }
  } else if (hasDockerfile) {
    architecture = 'Containerized Deployment'
    services = [
      {
        name: 'Container Service',
        type: 'AWS ECS Fargate',
        purpose: 'Run containerized application',
        estimated_cost: '$20-80/month',
      },
      {
        name: 'Load Balancer',
        type: 'Application Load Balancer',
        purpose: 'Distribute traffic and provide SSL',
        estimated_cost: '$15-25/month',
      },
    ]
    estimatedCost = '$35-105'
  } else {
    architecture = 'Traditional Deployment'
    services = [
      {
        name: 'Web Server',
        type: 'EC2 Instance',
        purpose: 'Host the application',
        estimated_cost: '$10-50/month',
      },
    ]
    estimatedCost = '$10-50'
  }

  // Generate deployment steps
  steps = [
    {
      step: 1,
      action: 'Setup AWS Environment',
      description: 'Configure AWS CLI and create necessary IAM roles',
      resources: ['AWS CLI', 'IAM User with deployment permissions'],
    },
    {
      step: 2,
      action: 'Prepare Application',
      description: `Build the ${framework} application for production`,
      resources: [analysis.buildCommand],
    },
    {
      step: 3,
      action: 'Deploy Infrastructure',
      description: 'Create AWS resources using CloudFormation or CDK',
      resources: ['CloudFormation template', 'VPC', 'Security Groups'],
    },
    {
      step: 4,
      action: 'Deploy Application',
      description: 'Upload and configure the application code',
      resources: ['Application bundle', 'Environment variables'],
    },
    {
      step: 5,
      action: 'Configure Domain',
      description: 'Setup custom domain and SSL certificate',
      resources: ['Route 53', 'ACM Certificate'],
    },
  ]

  return {
    architecture,
    services,
    steps,
    estimated_monthly_cost: estimatedCost,
    deployment_time: deploymentTime,
    requirements: [
      'AWS Account with billing enabled',
      'Domain name (optional but recommended)',
      'AWS CLI configured locally',
    ],
    recommendations: [
      'Use CI/CD pipeline for automated deployments',
      'Set up monitoring with CloudWatch',
      'Configure backup and disaster recovery',
      'Implement security best practices',
      'Use environment variables for configuration',
    ],
  }
}

// Helper function to format dates
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 1) return '1 day ago'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`
  return `${Math.ceil(diffDays / 365)} years ago`
}

// Simulate MCP server responses with real GitHub integration
async function handleMCPRequest(
  request: MCPRequest,
  cookies?: any
): Promise<MCPResponse> {
  const { method, params } = request

  console.log('MCP Request:', method, params)

  // Simulate different MCP server methods
  switch (method) {
    case 'deploy_from_github':
      return {
        result: {
          deploymentId: `deploy_${Date.now()}`,
          status: 'started',
          message: 'GitHub repository deployment initiated',
          repositoryUrl: params.repositoryUrl,
          awsRegion: params.region || 'us-east-1',
        },
      }

    case 'analyze_repository':
      // Extract repository info from params
      const { repositoryName, repositoryOwner, userPrompt } = params

      if (!repositoryName || !repositoryOwner || !userPrompt) {
        return {
          error: {
            code: -32602,
            message:
              'Missing required parameters: repositoryName, repositoryOwner, userPrompt',
          },
        }
      }

      try {
        // For now, let's create a more intelligent fallback analysis
        // that actually fetches repository data from GitHub API
        const repoData = await fetchGitHubRepository(
          repositoryOwner,
          repositoryName
        )

        const analysis = analyzeRepositoryData(repoData)
        const deploymentPlan = generateDeploymentPlan(analysis, userPrompt)

        return {
          result: {
            repositoryId: `repo_${Date.now()}`,
            analysis,
            deploymentPlan,
            recommendations: deploymentPlan.recommendations || [
              'Review the deployment plan carefully',
              'Ensure AWS credentials are properly configured',
              'Test the deployment in a staging environment first',
            ],
          },
        }
      } catch (error) {
        console.error('Repository analysis failed:', error)

        // Fallback to basic analysis if AI fails
        return {
          result: {
            repositoryId: `repo_${Date.now()}`,
            analysis: {
              language: 'Unknown',
              framework: 'Web Application',
              hasDockerfile: false,
              packageManager: 'npm',
              buildCommand: 'npm run build',
              startCommand: 'npm run start',
            },
            deploymentPlan: {
              architecture: 'Basic web application deployment',
              services: [
                {
                  name: 'Web Application',
                  type: 'EC2 / Lambda',
                  purpose: 'Host the application',
                  estimated_cost: '$10-30/month',
                },
              ],
              steps: [
                {
                  step: 1,
                  action: 'Analyze Repository',
                  description: 'Analyze repository structure and dependencies',
                  resources: ['Repository Analysis'],
                },
                {
                  step: 2,
                  action: 'Prepare Infrastructure',
                  description: 'Set up AWS resources for deployment',
                  resources: ['AWS Resources'],
                },
                {
                  step: 3,
                  action: 'Deploy Application',
                  description: 'Deploy the application to AWS',
                  resources: ['Deployed Application'],
                },
              ],
              estimated_monthly_cost: '$10 - $30',
              deployment_time: '10-20 minutes',
              requirements: ['AWS Account', 'GitHub Repository Access'],
              recommendations: [
                'AI analysis failed - using fallback analysis',
                'Consider adding more repository information',
                'Ensure repository is public or provide access token',
              ],
            },
            recommendations: [
              'AI analysis failed - manual review recommended',
              'Configure environment variables for production',
              'Set up monitoring and logging',
            ],
          },
        }
      }

    case 'get_repositories':
      // Get repositories from GitHub API instead of mock data
      const token = cookies?.get('github_token')?.value

      if (!token) {
        return {
          error: {
            code: -32001,
            message: 'GitHub authentication required',
          },
        }
      }

      try {
        const response = await fetch(
          'https://api.github.com/user/repos?sort=updated&per_page=20',
          {
            headers: {
              Authorization: `token ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        )

        if (!response.ok) {
          throw new Error(`GitHub API error: ${response.status}`)
        }

        const repos = await response.json()

        return {
          result: {
            repositories: repos.map((repo: any) => ({
              id: repo.id,
              name: repo.name,
              fullName: repo.full_name,
              description: repo.description || 'No description available',
              language: repo.language || 'Unknown',
              stars: repo.stargazers_count,
              forks: repo.forks_count,
              owner: repo.owner.login,
              htmlUrl: repo.html_url,
              cloneUrl: repo.clone_url,
              isPrivate: repo.private,
              updatedAt: formatDate(repo.updated_at),
              defaultBranch: repo.default_branch || 'main',
            })),
          },
        }
      } catch (error) {
        return {
          error: {
            code: -32002,
            message: 'Failed to fetch repositories from GitHub',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
        }
      }

    case 'get_deployment_status':
      return {
        result: {
          deploymentId: params.deploymentId,
          status: 'completed',
          progress: 100,
          logs: [
            '✓ Repository cloned successfully',
            '✓ Dependencies installed',
            '✓ Build completed',
            '✓ AWS resources created',
            '✓ Application deployed',
          ],
          url: `https://${params.deploymentId}.aws-deploy-ai.com`,
        },
      }

    default:
      return {
        error: {
          code: -32601,
          message: `Method not found: ${method}`,
        },
      }
  }
}

// POST handler for MCP requests
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const response = await handleMCPRequest(body, request.cookies)

    return NextResponse.json(response)
  } catch (error) {
    console.error('MCP API Error:', error)
    return NextResponse.json(
      {
        error: {
          code: -32603,
          message: 'Internal server error',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

// GET handler for health check
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'AWS Deploy AI MCP API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  })
}
