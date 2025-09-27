#!/bin/bash

# GitHub Integration Test Script
echo "🧪 Testing GitHub Integration for AWS Deploy AI MCP Server"
echo "=========================================================="

# Test 1: Build the project
echo "1️⃣ Building TypeScript project..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Test 2: Check if server starts (with timeout)
echo "2️⃣ Testing server startup..."
timeout 5s npm start &
SERVER_PID=$!
sleep 3
if kill -0 $SERVER_PID 2>/dev/null; then
    echo "✅ Server started successfully"
    kill $SERVER_PID 2>/dev/null
else
    echo "❌ Server failed to start"
    exit 1
fi

# Test 3: Verify GitHub service can be imported
echo "3️⃣ Testing GitHub service import..."
node -e "
const { GitHubService } = require('./dist/services/github-service.js');
const service = new GitHubService();
console.log('✅ GitHub service imported successfully');
console.log('📊 Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(service)).filter(name => name !== 'constructor'));
" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ GitHub service import test passed"
else
    echo "❌ GitHub service import failed"
    exit 1
fi

echo ""
echo "🎉 All tests passed! GitHub integration is ready."
echo ""
echo "📋 Available GitHub Tools:"
echo "  • deploy-from-github - Deploy directly from GitHub repos"
echo "  • analyze-github-repo - Analyze repository structure"
echo "  • list-github-repos - List user repositories"
echo ""
echo "🔧 Setup Requirements:"
echo "  • Set GITHUB_TOKEN environment variable for private repos"
echo "  • Ensure AWS credentials are configured"
echo "  • AWS Bedrock access must be enabled"
echo ""
echo "🚀 Ready to deploy from GitHub!"