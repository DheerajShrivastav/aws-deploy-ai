import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'

// GET /api/deployments/[id]/events - Get deployment events
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Verify deployment exists
    const deployment = await prisma.deployment.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!deployment) {
      return NextResponse.json(
        { success: false, error: 'Deployment not found' },
        { status: 404 }
      )
    }

    const where = { deploymentId: params.id }

    const [events, total] = await Promise.all([
      prisma.deploymentEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.deploymentEvent.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: events,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching deployment events:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deployment events' },
      { status: 500 }
    )
  }
}

// POST /api/deployments/[id]/events - Create a deployment event
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { event, description, metadata } = body

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event type is required' },
        { status: 400 }
      )
    }

    // Verify deployment exists
    const deployment = await prisma.deployment.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!deployment) {
      return NextResponse.json(
        { success: false, error: 'Deployment not found' },
        { status: 404 }
      )
    }

    const deploymentEvent = await prisma.deploymentEvent.create({
      data: {
        deploymentId: params.id,
        event,
        description,
        metadata: metadata || {},
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: deploymentEvent,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating deployment event:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create deployment event' },
      { status: 500 }
    )
  }
}
