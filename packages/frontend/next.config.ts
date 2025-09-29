import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Removed output: 'export' to support API routes
  images: {
    unoptimized: true,
  },
}

export default nextConfig
