/** @type {import('next').NextConfig} */
const nextConfig = {
  // Explicit workspace root to silence warning
  outputFileTracingRoot: require('path').join(__dirname, '../..'),

  // File tracing for monorepo dependencies
  outputFileTracingIncludes: {
    '/api/**/*': ['../../packages/mcp-server/dist/**/*'],
  },

  // Transpile packages from the monorepo
  transpilePackages: ['@aws-deploy-ai/mcp-server'],

  // Environment variables - use relative path that will be resolved at runtime
  env: {
    MCP_SERVER_PATH: '../../packages/mcp-server/dist/main.js',
  },
}

module.exports = nextConfig
