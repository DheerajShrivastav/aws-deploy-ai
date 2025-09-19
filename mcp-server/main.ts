// main.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'

const server = new McpServer({
  name: 'AWS Deploy Server',
  version: '1.0.0',
})

// Define your first tool - deploy website
server.tool(
  'deploy-website',
  'Deploy a website to AWS based on user prompt',
  {
    prompt: z.string().describe("User's deployment request"),
    siteType: z.enum(['static', 'dynamic']).optional(),
  },
  async ({ prompt, siteType }) => {
    return {
      content: [
        {
          type: 'text',
          text: `Processing deployment request: ${prompt}`,
        },
      ],
    }
  }
)

// Start the server
const transport = new StdioServerTransport()
server.connect(transport)
