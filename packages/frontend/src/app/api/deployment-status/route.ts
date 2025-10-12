import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for deployment status (in production, use Redis or a database)
const deploymentStatusStore = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const { deploymentId } = await request.json()

    if (!deploymentId) {
      return NextResponse.json(
        { error: 'Deployment ID is required' },
        { status: 400 }
      )
    }

    // Get status from store or return default
    const status = deploymentStatusStore.get(deploymentId) || {
      deploymentId,
      status: 'starting',
      progress: 0,
      currentStep: 'Initializing deployment...',
      logs: ['🚀 Deployment initiated...'],
      message: 'Starting deployment process...',
    }

    return NextResponse.json(status)
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

// Helper function to update deployment status (called from deployment process)
export function updateDeploymentStatus(
  deploymentId: string,
  statusUpdate: any
) {
  const currentStatus = deploymentStatusStore.get(deploymentId) || {
    deploymentId,
    status: 'starting',
    progress: 0,
    logs: [],
  }

  const updatedStatus = {
    ...currentStatus,
    ...statusUpdate,
    lastUpdated: new Date().toISOString(),
  }

  deploymentStatusStore.set(deploymentId, updatedStatus)
  return updatedStatus
}
