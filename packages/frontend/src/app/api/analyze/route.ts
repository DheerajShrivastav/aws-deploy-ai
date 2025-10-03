import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Analyze API called')
    const body = await request.json()
    const { repositoryName, repositoryOwner, repositoryFullName, userPrompt } =
      body

    console.log('📝 Request data:', {
      repositoryName,
      repositoryOwner,
      repositoryFullName,
      userPrompt,
    })

    if (!repositoryName || !repositoryOwner || !userPrompt) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        {
          error:
            'Missing required fields: repositoryName, repositoryOwner, or userPrompt',
        },
        { status: 400 }
      )
    }

    console.log('🤖 Sending request to MCP server for AI analysis...')

    try {
      // Call MCP server for GitHub repository analysis with real AI
      const mcpResponse = await fetch('http://localhost:3001/api/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: 'tools/call',
          params: {
            name: 'analyze_github_repository',
            arguments: {
              owner: repositoryOwner,
              repo: repositoryName,
              userPrompt: userPrompt,
            },
          },
        }),
      })

      if (!mcpResponse.ok) {
        throw new Error(`MCP server error: ${mcpResponse.statusText}`)
      }

      const mcpResult = await mcpResponse.json()

      if (!mcpResult.result) {
        throw new Error('MCP server returned no result')
      }

      console.log('✅ MCP AI analysis completed successfully')

      return NextResponse.json({
        success: true,
        analysis: mcpResult.result.analysis,
        deploymentPlan: mcpResult.result.deploymentPlan,
        repositoryData: {
          name: repositoryName,
          owner: repositoryOwner,
          fullName: repositoryFullName,
        },
      })
    } catch (mcpError) {
      console.error('❌ MCP AI analysis failed:', mcpError)
      return NextResponse.json(
        {
          error: 'AI analysis failed',
          details:
            mcpError instanceof Error ? mcpError.message : 'Unknown MCP error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ Repository analysis error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return NextResponse.json(
      {
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
