import { NextRequest, NextResponse } from 'next/server'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { existsSync } from 'fs'

// Store MCP process globally (in production, consider using a process manager)
let mcpProcess: ChildProcess | null = null
let mcpReady = false

// Initialize MCP Server
function initializeMCPServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    if (mcpProcess) {
      mcpProcess.kill()
    }

    // Use MCP server from within frontend directory (copied locally)
    const mcpServerPath =
      process.env.MCP_SERVER_PATH ||
      path.join(process.cwd(), 'mcp-server', 'dist', 'main.js')

    console.log('MCP Server Path:', mcpServerPath)

    // Check if MCP server exists
    if (!existsSync(mcpServerPath)) {
      throw new Error(
        `MCP server not found at: ${mcpServerPath}. Please build the MCP server first with: cd ../mcp-server && npm run build`
      )
    }

    mcpProcess = spawn('node', [mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MCP_SERVER_MODE: 'true',
      },
    })

    mcpProcess.on('error', (error) => {
      console.error('MCP Server error:', error)
      mcpReady = false
      reject(error)
    })

    mcpProcess.on('exit', (code) => {
      console.log(`MCP Server exited with code ${code}`)
      mcpProcess = null
      mcpReady = false
    })

    // Wait for server to be ready
    setTimeout(() => {
      mcpReady = true
      resolve(mcpProcess!)
    }, 2000)
  })
}

// Send request to MCP Server
async function sendMCPRequest(
  method: string,
  params: Record<string, unknown> = {}
): Promise<unknown> {
  return new Promise(async (resolve, reject) => {
    try {
      if (!mcpProcess || !mcpReady) {
        await initializeMCPServer()
      }

      if (!mcpProcess) {
        throw new Error('Failed to initialize MCP server')
      }

      const request = {
        jsonrpc: '2.0',
        id: Math.random().toString(36).substr(2, 9),
        method: 'tools/call',
        params: {
          name: method,
          arguments: params,
        },
      }

      let responseData = ''
      const timeout = setTimeout(() => {
        reject(new Error('MCP request timeout'))
      }, 30000)

      const handleData = (data: Buffer) => {
        responseData += data.toString()

        try {
          const lines = responseData.split('\n').filter((line) => line.trim())
          for (const line of lines) {
            if (line.trim()) {
              const response = JSON.parse(line)
              if (response.id === request.id) {
                clearTimeout(timeout)
                if (mcpProcess?.stdout)
                  mcpProcess.stdout.removeListener('data', handleData)
                if (mcpProcess?.stderr)
                  mcpProcess.stderr.removeListener('data', handleError)

                if (response.error) {
                  reject(new Error(response.error.message))
                } else {
                  resolve(response.result)
                }
                return
              }
            }
          }
        } catch {
          // Continue reading if JSON is incomplete
        }
      }

      const handleError = (data: Buffer) => {
        console.error('MCP stderr:', data.toString())
      }

      if (mcpProcess.stdout) mcpProcess.stdout.on('data', handleData)
      if (mcpProcess.stderr) mcpProcess.stderr.on('data', handleError)

      // Send request
      if (mcpProcess.stdin)
        mcpProcess.stdin.write(JSON.stringify(request) + '\n')
    } catch (error) {
      reject(error)
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const { method, params } = await request.json()

    console.log(`MCP Request: ${method}`, params)

    const result = await sendMCPRequest(method, params)

    return NextResponse.json({
      result,
      error: null,
    })
  } catch (error) {
    console.error('MCP API Error:', error)
    return NextResponse.json(
      {
        result: null,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
          code: -1,
        },
      },
      { status: 500 }
    )
  }
}

// Handle GET requests for testing
export async function GET() {
  return NextResponse.json({
    status: 'MCP API endpoint is running',
    mcpConnected: !!mcpProcess && mcpReady,
    timestamp: new Date().toISOString(),
  })
}
