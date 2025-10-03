import { NextRequest, NextResponse } from 'next/server'

interface DeploymentRequest {
  repositoryName: string
  repositoryUrl: string
  prompt: string
  branch?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: DeploymentRequest = await request.json()
    const { repositoryName, repositoryUrl, prompt, branch = 'main' } = body

    // Validate required fields
    if (!repositoryName || !repositoryUrl || !prompt) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: repositoryName, repositoryUrl, or prompt',
        },
        { status: 400 }
      )
    }

    // Check if user is authenticated with GitHub
    const githubToken = request.cookies.get('github_token')?.value
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub authentication required' },
        { status: 401 }
      )
    }

    // Send deployment request to MCP server
    const mcpResponse = await fetch(
      `${process.env.MCP_API_URL || 'http://localhost:3000'}/api/mcp`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('cookie') || '', // Forward cookies for GitHub auth
        },
        body: JSON.stringify({
          method: 'deploy_from_github',
          params: {
            repositoryUrl,
            repositoryName,
            prompt,
            branch,
            githubToken, // Pass token for MCP server to access repo
          },
        }),
      }
    )

    if (!mcpResponse.ok) {
      throw new Error(`MCP server error: ${mcpResponse.status}`)
    }

    const mcpData = await mcpResponse.json()

    if (mcpData.error) {
      return NextResponse.json(
        {
          error: 'Deployment failed',
          details: mcpData.error.message,
        },
        { status: 500 }
      )
    }

    // Return deployment result
    return NextResponse.json({
      success: true,
      deployment: {
        id: mcpData.result.deploymentId,
        status: mcpData.result.status,
        message: mcpData.result.message,
        repositoryUrl: mcpData.result.repositoryUrl,
        awsRegion: mcpData.result.awsRegion,
        trackingUrl: `/deployment/${mcpData.result.deploymentId}`,
      },
    })
  } catch (error) {
    console.error('Deployment API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check deployment status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const deploymentId = searchParams.get('id')

  if (!deploymentId) {
    return NextResponse.json(
      { error: 'Deployment ID required' },
      { status: 400 }
    )
  }

  try {
    // Query MCP server for deployment status
    const mcpResponse = await fetch(
      `${process.env.MCP_API_URL || 'http://localhost:3000'}/api/mcp`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({
          method: 'get_deployment_status',
          params: { deploymentId },
        }),
      }
    )

    if (!mcpResponse.ok) {
      throw new Error(`MCP server error: ${mcpResponse.status}`)
    }

    const mcpData = await mcpResponse.json()

    if (mcpData.error) {
      return NextResponse.json(
        { error: mcpData.error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      deployment: mcpData.result,
    })
  } catch (error) {
    console.error('Deployment status API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deployment status' },
      { status: 500 }
    )
  }
}
