import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Removed output: 'export' to support API routes
  images: {
    unoptimized: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Optionally ignore type errors as well
    ignoreBuildErrors: true,
  },
  // Additional config to handle build issues
  experimental: {
    esmExternals: true,
  },
  // Disable static optimization warnings
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

export default nextConfig
