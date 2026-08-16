import type { NextConfig } from 'next'

const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://localhost:9090'

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiProxyTarget}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${apiProxyTarget}/uploads/:path*`,
      },
    ]
  },
}

export default nextConfig
