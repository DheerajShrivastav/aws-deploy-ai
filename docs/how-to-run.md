# How to Run and Use AWS Deploy AI MCP Server

## Prerequisites

Before running the MCP server, ensure you have:

1. **Node.js 18+** installed
2. **AWS Account** with proper permissions
3. **AWS Bedrock access** enabled in your region

## Setup Instructions

### 1. Environment Configuration

First, create your environment file:

```bash
cd /home/dheeraj/SelfStudy/aws-deploy-ai/mcp-server
cp .env.example .env
```

Edit the `.env` file with your actual credentials:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_actual_access_key
AWS_SECRET_ACCESS_KEY=your_actual_secret_key

# AWS Bedrock Configuration
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
BEDROCK_REGION=us-east-1

# Deployment Configuration
DEFAULT_BUCKET_PREFIX=aws-deploy-ai
DEFAULT_CLOUDFRONT_PRICE_CLASS=PriceClass_100

# Logging Configuration
LOG_LEVEL=debug
LOG_FILE=./logs/aws-deploy-ai.log
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Project

```bash
npm run build
```

## Running the MCP Server

### Option 1: Development Mode (Recommended for testing)

```bash
npm run dev
```

This runs the server with hot-reload using `tsx`.

### Option 2: Production Mode

```bash
npm start
```

This runs the compiled JavaScript from the `dist/` folder.

## How to Use the MCP Server

The MCP server communicates through standard input/output (stdio). Here are several ways to interact with it:

### Method 1: Using MCP Inspector (Recommended)

The MCP Inspector provides a web-based interface to test MCP servers:

```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Run the inspector with your server
npx @modelcontextprotocol/inspector /home/dheeraj/SelfStudy/aws-deploy-ai/mcp-server/dist/main.js
```

This will open a web interface where you can:

- See all available tools
- Test tool calls with real parameters
- View responses and logs

### Method 2: Using a Compatible MCP Client

Popular MCP clients include:

- **Claude Desktop** (with MCP configuration)
- **Cline** (VS Code extension)
- **Continue** (VS Code extension)

#### Example: Claude Desktop Configuration

Add this to your Claude Desktop config:

```json
{
  "mcpServers": {
    "aws-deploy-ai": {
      "command": "node",
      "args": ["/home/dheeraj/SelfStudy/aws-deploy-ai/mcp-server/dist/main.js"],
      "env": {
        "AWS_REGION": "us-east-1",
        "AWS_ACCESS_KEY_ID": "your_access_key",
        "AWS_SECRET_ACCESS_KEY": "your_secret_key",
        "BEDROCK_MODEL_ID": "anthropic.claude-3-sonnet-20240229-v1:0"
      }
    }
  }
}
```

### Method 3: Direct Testing with curl/scripts

Create a test script to send MCP protocol messages:

```javascript
// test-mcp.js
const { spawn } = require('child_process')

const mcpServer = spawn('node', ['dist/main.js'], {
  stdio: ['pipe', 'pipe', 'pipe'],
})

// Send initialization message
const initMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0',
    },
  },
}

mcpServer.stdin.write(JSON.stringify(initMessage) + '\n')

// Listen for responses
mcpServer.stdout.on('data', (data) => {
  console.log('Response:', data.toString())
})

// Example tool call after initialization
setTimeout(() => {
  const toolCall = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'deploy-website',
      arguments: {
        prompt: 'Deploy a simple portfolio website with dark theme',
      },
    },
  }

  mcpServer.stdin.write(JSON.stringify(toolCall) + '\n')
}, 2000)
```

Run the test:

```bash
node test-mcp.js
```

## Available Tools

The MCP server provides these tools:

### 1. `deploy-website`

Deploy a website using natural language description.

**Example Usage:**

```json
{
  "name": "deploy-website",
  "arguments": {
    "prompt": "Create a modern portfolio website with dark theme, showcase my projects, and include a contact form",
    "files": {
      "index.html": "<html>...</html>",
      "style.css": "body { background: #1a1a1a; }"
    }
  }
}
```

### 2. `get-deployment-status`

Check the status of a deployment.

**Example Usage:**

```json
{
  "name": "get-deployment-status",
  "arguments": {
    "deploymentId": "deploy-abc123"
  }
}
```

### 3. `analyze-deployment`

Get analysis and recommendations for a deployment.

**Example Usage:**

```json
{
  "name": "analyze-deployment",
  "arguments": {
    "prompt": "High-traffic e-commerce website with payment processing"
  }
}
```

### 4. `get-cost-estimate`

Get cost estimation for a deployment.

**Example Usage:**

```json
{
  "name": "get-cost-estimate",
  "arguments": {
    "prompt": "Blog website with 10,000 monthly visitors",
    "traffic": {
      "monthlyVisitors": 10000,
      "averagePageViews": 3,
      "averageFileSize": 1.5
    }
  }
}
```

### 5. `list-deployments`

List all deployments.

**Example Usage:**

```json
{
  "name": "list-deployments",
  "arguments": {
    "limit": 10,
    "status": "completed"
  }
}
```

## Example Deployment Workflow

Here's a complete example of deploying a website:

### 1. Start the Server

```bash
cd /home/dheeraj/SelfStudy/aws-deploy-ai/mcp-server
npm run dev
```

### 2. Connect with MCP Inspector

```bash
npx @modelcontextprotocol/inspector /home/dheeraj/SelfStudy/aws-deploy-ai/mcp-server/dist/main.js
```

### 3. Deploy a Website

Use the `deploy-website` tool with this prompt:

```
"Create a professional business website for a consulting firm. Include a homepage with services overview, about page with team information, contact page with form, and a modern blue color scheme. Make it mobile responsive."
```

### 4. Monitor Progress

Use `get-deployment-status` with the returned deployment ID to check progress.

### 5. View Results

Once completed, you'll get:

- S3 bucket URL
- CloudFront distribution URL
- Estimated monthly costs
- List of created AWS resources

## Troubleshooting

### Common Issues

1. **Server Won't Start**

   ```bash
   # Check if build is successful
   npm run build

   # Check for missing dependencies
   npm install

   # Check environment variables
   cat .env
   ```

2. **AWS Permission Errors**

   ```bash
   # Test AWS credentials
   aws sts get-caller-identity

   # Check Bedrock access
   aws bedrock list-foundation-models --region us-east-1
   ```

3. **MCP Protocol Errors**
   - Ensure you're sending valid JSON-RPC 2.0 messages
   - Check that tool names and parameters match the schema
   - Verify the server is properly initialized before calling tools

### Debug Mode

Enable detailed logging:

```bash
export LOG_LEVEL=debug
npm run dev
```

Check logs:

```bash
tail -f logs/aws-deploy-ai.log
```

## Integration Examples

### With VS Code Extensions

For VS Code extensions that support MCP (like Continue or Cline):

1. Install the extension
2. Configure it to use your MCP server:
   ```json
   {
     "mcpServers": {
       "aws-deploy-ai": {
         "command": "node",
         "args": ["/path/to/aws-deploy-ai/mcp-server/dist/main.js"]
       }
     }
   }
   ```

### With Custom Applications

You can integrate the MCP server into your own applications:

```javascript
const { MCPClient } = require('@modelcontextprotocol/client')

const client = new MCPClient({
  command: 'node',
  args: ['/path/to/dist/main.js'],
  env: process.env,
})

async function deployWebsite() {
  await client.connect()

  const result = await client.callTool('deploy-website', {
    prompt: 'Deploy a React portfolio website',
  })

  console.log('Deployment result:', result)
}
```

## Performance Tips

1. **Keep the server running** - Starting up takes time due to AWS SDK initialization
2. **Use development mode** for testing - Hot reload saves time
3. **Monitor logs** - Enable debug logging to see what's happening
4. **Cache responses** - The AI interpreter results can be cached for similar prompts

---

This guide should get you up and running with the AWS Deploy AI MCP server. The server provides powerful natural language deployment capabilities through a standardized MCP interface!
