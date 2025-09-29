#!/bin/bash

# AWS Deploy AI - Startup Script
echo "🚀 Starting AWS Deploy AI Platform..."

# Check if MCP server is built
if [ ! -d "../mcp-server/dist" ]; then
    echo "📦 Building MCP Server..."
    cd ../mcp-server && npm run build
    cd ../frontend
fi

# Copy MCP server to frontend directory
echo "📋 Copying MCP Server to frontend..."
chmod +x copy-mcp-server.sh
./copy-mcp-server.sh

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Build the frontend
echo "🏗️  Building Frontend..."
npm run build

# Start Next.js server
echo "🌐 Starting Next.js Server..."
npm run start