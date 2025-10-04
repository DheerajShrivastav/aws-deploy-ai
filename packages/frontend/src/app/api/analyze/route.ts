import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Analyze API called')

    const body = await request.json()
    const { repositoryUrl, userPrompt } = body

    if (!repositoryUrl || !userPrompt) {
      return NextResponse.json(
        { error: 'Missing required fields: repositoryUrl or userPrompt' },
        { status: 400 }
      )
    }

    // Extract owner and repo from GitHub URL
    const urlMatch = repositoryUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)
    if (!urlMatch) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL' },
        { status: 400 }
      )
    }

    const [, repositoryOwner, repositoryName] = urlMatch

    console.log('📝 Extracted data:', {
      repositoryName,
      repositoryOwner,
      userPrompt,
    })

    // Forward to MCP API
    const mcpResponse = await fetch('http://localhost:3000/api/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        method: 'analyze_repository',
        params: {
          repositoryName,
          repositoryOwner,
          userPrompt,
        },
      }),
    })

    if (!mcpResponse.ok) {
      throw new Error(`MCP API error: ${mcpResponse.status}`)
    }

    const mcpData = await mcpResponse.json()

    if (mcpData.error) {
      throw new Error(mcpData.error.message || 'MCP analysis failed')
    }

    const { result } = mcpData
    const { analysis, deploymentPlan } = result

    // Format the response for the frontend
    return NextResponse.json({
      success: true,
      repositoryName,
      repositoryOwner,
      analysis: {
        language: analysis?.language || 'Unknown',
        framework: analysis?.framework || 'Unknown',
        packageManager: analysis?.packageManager || 'npm',
        buildCommand: analysis?.buildCommand || 'npm run build',
        startCommand: analysis?.startCommand || 'npm start',
        port: analysis?.port || 3000,
        dependencies: analysis?.dependencies || [],
        hasDatabase: analysis?.hasDatabase || false,
        hasEnvVariables: analysis?.hasEnvVariables || true,
        staticAssets: analysis?.staticAssets || true,
        hasDockerfile: analysis?.hasDockerfile || false,
      },
      deploymentPlan: {
        architecture: deploymentPlan?.architecture || 'Serverless',
        services: deploymentPlan?.services || [
          {
            name: 'Web Application',
            type: 'AWS Lambda',
            purpose: 'Serve the application',
            estimated_cost: '$10-50/month',
          },
        ],
        steps: deploymentPlan?.steps || [
          {
            step: 1,
            action: 'Setup AWS Account',
            description: 'Configure AWS credentials and region',
            resources: ['AWS CLI', 'IAM User'],
          },
        ],
        estimated_monthly_cost: deploymentPlan?.estimated_monthly_cost || '$20-100',
        deployment_time: deploymentPlan?.deployment_time || '30-60 minutes',
        requirements: deploymentPlan?.requirements || [
          'AWS Account',
          'Domain name (optional)',
        ],
        recommendations: deploymentPlan?.recommendations || [
          'Use CI/CD pipeline for automated deployments',
          'Set up monitoring and logging',
          'Configure environment variables',
        ],
      },
    })
  } catch (error) {
    console.error('❌ Analyze API error:', error)
    
    return NextResponse.json(
      {
        error: 'Failed to analyze repository',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
