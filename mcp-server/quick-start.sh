#!/bin/bash

# Quick Start Guide for AWS Deploy AI MCP Server

echo "🚀 AWS Deploy AI MCP Server - Quick Start"
echo "==========================================="

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  Creating .env file from example..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "🔧 IMPORTANT: Edit the .env file with your AWS credentials:"
    echo "   - AWS_ACCESS_KEY_ID"
    echo "   - AWS_SECRET_ACCESS_KEY" 
    echo "   - AWS_REGION"
    echo ""
    read -p "Press Enter after updating your .env file..."
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building project..."
npm run build

echo ""
echo "🎯 Available options:"
echo ""
echo "1) Start MCP Inspector (Web UI) - RECOMMENDED"
echo "2) Run server in development mode"
echo "3) Run server in production mode"
echo "4) Exit"
echo ""

read -p "Choose an option (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🌐 Starting MCP Inspector..."
        echo "This will open a web interface to test the MCP server"
        echo ""
        npx @modelcontextprotocol/inspector dist/main.js
        ;;
    2)
        echo ""
        echo "🔧 Starting in development mode..."
        echo "Press Ctrl+C to stop"
        echo ""
        npm run dev
        ;;
    3)
        echo ""
        echo "🚀 Starting in production mode..."
        echo "Press Ctrl+C to stop"
        echo ""
        npm start
        ;;
    4)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid option"
        exit 1
        ;;
esac