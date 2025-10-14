import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { deploymentId } = await request.json()

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'Deployment ID is required' },
        { status: 400 }
      )
    }

    // Call MCP service to get real deployment status
    const mcpResponse = await fetch(`${request.nextUrl.origin}/api/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'get_deployment_status',
        params: { deploymentId },
      }),
    })

    if (!mcpResponse.ok) {
      throw new Error('Failed to get status from MCP service')
    }

    const mcpData = await mcpResponse.json()

    if (mcpData.error) {
      throw new Error(mcpData.error.message || 'MCP service error')
    }

    const status = mcpData.result

    // Transform MCP response to match component expectations
    const transformedStatus = {
      deploymentId: status.deploymentId,
      status:
        status.status === 'completed'
          ? 'completed'
          : status.status === 'error'
          ? 'failed'
          : 'in-progress',
      progress: status.progress || 0,
      currentStep: status.message || 'Processing...',
      logs: status.logs || [],
      message: status.message || 'Deployment in progress...',
      elapsedTime: status.elapsedTime,
      estimatedTimeRemaining: status.estimatedTimeRemaining,
      // Include all URL and access information
      instanceId: status.instanceId,
      instanceType: status.instanceType,
      publicIp: status.publicIp,
      deploymentUrl: status.deploymentUrl,
      liveUrl: status.liveUrl,
      nginxUrl: status.nginxUrl,
      directUrl: status.directUrl,
      statusPageUrl: status.statusPageUrl,
      sshAccess: status.sshAccess,
      applicationReady: status.applicationReady,
      estimatedReadyTime: status.estimatedReadyTime,
      instructions: status.instructions,
    }

    return NextResponse.json(transformedStatus)
  } catch (error) {
    console.error('Deployment status error:', error)
    return NextResponse.json(
      {
        error: 'Failed to get deployment status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
