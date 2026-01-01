/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用静态导出以支持Cloudflare Pages
  output: 'export',
  
  // 禁用图片优化（Cloudflare Pages不支持）
  images: {
    unoptimized: true,
  },
  
  // 禁用ESLint检查（生产构建）
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 禁用TypeScript检查（生产构建）
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // 配置静态文件路径
  trailingSlash: true,
  
  // 环境变量配置
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787',
    NEXT_PUBLIC_ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  },
  
  // 构建配置
  distDir: 'out',
  
  // 资源优化
  compress: true,
  
  // 实验性功能
  experimental: {
    // 启用应用目录
    appDir: true,
  },
  
  // Webpack配置
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 优化构建
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            enforce: true,
          },
        },
      }
    }
    
    return config
  },
  
  // 重定向配置
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: true,
      },
    ]
  },
  
  // 头部配置
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig