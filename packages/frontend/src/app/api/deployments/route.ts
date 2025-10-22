import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

// GET /api/deployments - List all deployments
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    const where: any = {}
    if (status) where.status = status
    if (userId) where.userId = userId

    const [deployments, total] = await Promise.all([
      prisma.deployment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, name: true },
          },
        },
      }),
      prisma.deployment.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: deployments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching deployments:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deployments' },
      { status: 500 }
    )
  }
}

// POST /api/deployments - Create a new deployment
export async function POST(request: NextRequest) {
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
      userId,
    } = body

    // Validate required fields
    if (!name || !repositoryUrl || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, repositoryUrl, userId',
        },
        { status: 400 }
      )
    }

    const deployment = await prisma.deployment.create({
      data: {
        name,
        description,
        repositoryUrl,
        branch: branch || 'main',
        environmentVariables: environmentVariables || {},
        buildCommand,
        startCommand,
        port: port || 3000,
        customDomain,
        sslEnabled: sslEnabled || false,
        status: 'pending',
        userId,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    })

    return NextResponse.json(
      {
        success: true,
        data: deployment,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating deployment:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create deployment' },
      { status: 500 }
    )
  }
}
