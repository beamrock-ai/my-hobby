import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['beamrock.duckdns.org', '20.214.175.26'],
  output: 'standalone',
  basePath: process.env.NEXT_PUBLIC_BASE_PATH ?? '',
}

export default nextConfig
