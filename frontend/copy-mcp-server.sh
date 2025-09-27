#!/bin/bash

# Copy MCP Server script
echo "📦 Copying MCP Server to frontend..."

# Create mcp-server directory in frontend
mkdir -p "./mcp-server/dist"

# Copy the built MCP server files
if [ -d "../mcp-server/dist" ]; then
    cp -r ../mcp-server/dist/* ./mcp-server/dist/
    echo "✅ MCP Server copied successfully"
else
    echo "❌ MCP Server not found. Building it first..."
    cd ../mcp-server && npm run build && cd ../frontend
    cp -r ../mcp-server/dist/* ./mcp-server/dist/
    echo "✅ MCP Server built and copied successfully"
fi