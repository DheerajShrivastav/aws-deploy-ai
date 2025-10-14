import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Simple Analyze API called')

    const body = await request.json()
    const { repositoryName, userPrompt } = body

    console.log('📝 Request data:', { repositoryName, userPrompt })

    if (!repositoryName || !userPrompt) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        {
          error:
            'Missing required fields: repositoryName and userPrompt are required',
        },
        { status: 400 }
      )
    }

    console.log('🤖 Generating simple mock analysis...')
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const analysis = generateMockAnalysis(repositoryName, userPrompt)
    const deploymentPlan = generateMockDeploymentPlan(
      repositoryName,
      userPrompt,
      analysis
    )

    console.log('✅ Simple analysis completed successfully')

    return NextResponse.json({
      success: true,
      analysis,
      deploymentPlan,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('❌ Error in simple analyze API:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function generateMockAnalysis(repositoryName: string, userPrompt: string) {
  return {
    repository: repositoryName,
    projectType: 'Next.js Application',
    framework: 'Next.js',
    language: 'JavaScript/TypeScript',
    packageManager: 'npm',
    buildTool: 'Next.js',
    hasDatabase: false,
    dependencies: ['react', 'next', '@types/node', 'typescript', 'tailwindcss'],
    buildCommand: 'npm run build',
    startCommand: 'npm start',
    environmentVariables: [],
    ports: [3000],
    staticFiles: true,
    serverSideRendering: true,
    apiRoutes: true,
    confidence: 0.85,
    suggestions: [
      'Project appears to be a modern web application',
      'Suitable for deployment on AWS EC2',
      'Recommend using PM2 for process management',
      'Configure nginx for reverse proxy',
    ],
  }
}

function generateMockDeploymentPlan(
  repositoryName: string,
  userPrompt: string,
  analysis: any
) {
  return {
    deploymentStrategy: 'AWS EC2',
    instanceType: 't2.micro',
    region: 'us-east-1',
    steps: [
      'Create EC2 instance with Ubuntu 22.04',
      'Install Node.js 18.x and npm',
      'Clone repository and install dependencies',
      'Build the application',
      'Configure PM2 for process management',
      'Setup nginx reverse proxy',
      'Configure security groups for HTTP/HTTPS',
      'Start the application',
    ],
    estimatedTime: '5-10 minutes',
    cost: '$0.0116/hour (t2.micro)',
    requirements: {
      ram: '1 GB',
      storage: '8 GB',
      bandwidth: 'Low to Moderate',
    },
    environment: { NODE_ENV: 'production', PORT: '3000' },
    securityRecommendations: [
      'Use HTTPS in production',
      'Configure proper security groups',
      'Enable CloudWatch monitoring',
      'Set up automated backups',
    ],
    scalingOptions: [
      'Auto Scaling Groups for high availability',
      'Application Load Balancer for multiple instances',
      'CloudFront CDN for static assets',
    ],
  }
}
