import path from 'path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../..'),

  outputFileTracingIncludes: {
    'api/**/*': [path.join(__dirname, '../../packages/mcp-server/dist/**/*')],
  },

  transpilePackages: ['@aws-deploy-ai/mcp-server'],

  env: {
    MCP_SERVER_PATH: path.join(
      __dirname,
      '../../packages/mcp-server/dist/main.js'
    ),
  },

  images: {
    unoptimized: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  experimental: {
    esmExternals: true,
  },

  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

export default nextConfig
