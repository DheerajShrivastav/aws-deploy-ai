import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

// GET /api/deployments/[id] - Get a specific deployment
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deployment = await prisma.deployment.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!deployment) {
      return NextResponse.json(
        { success: false, error: 'Deployment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: deployment,
    })
  } catch (error) {
    console.error('Error fetching deployment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deployment' },
      { status: 500 }
    )
  }
}

// PUT /api/deployments/[id] - Update a deployment
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      name,
      description,
      repositoryUrl,
      branch,
      environmentVariables,
      buildCommand,
      startCommand,
      port,
      customDomain,
      sslEnabled,
    } = body

    const deployment = await prisma.deployment.update({
      where: { id: params.id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(repositoryUrl && { repositoryUrl }),
        ...(branch && { branch }),
        ...(environmentVariables && { environmentVariables }),
        ...(buildCommand !== undefined && { buildCommand }),
        ...(startCommand !== undefined && { startCommand }),
        ...(port && { port }),
        ...(customDomain !== undefined && { customDomain }),
        ...(sslEnabled !== undefined && { sslEnabled }),
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: deployment,
    })
  } catch (error) {
    console.error('Error updating deployment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update deployment' },
      { status: 500 }
    )
  }
}

// DELETE /api/deployments/[id] - Delete a deployment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.deployment.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      success: true,
      message: 'Deployment deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting deployment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete deployment' },
      { status: 500 }
    )
  }
}
