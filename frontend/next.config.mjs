/** @type {import('next').NextConfig} */
const nextConfig = {
  // 启用实验性功能
  experimental: {
    // 启用 App Router
    appDir: true,
  },
  
  // 输出配置 - 用于静态导出
  output: 'export',
  
  // 禁用图片优化（Cloudflare Pages 不支持）
  images: {
    unoptimized: true,
  },
  
  // 基础路径配置（如果需要部署到子路径）
  // basePath: '/dashboard',
  
  // 资源前缀（用于 CDN）
  // assetPrefix: 'https://cdn.example.com',
  
  // 环境变量
  env: {
    CUSTOM_KEY: 'my-value',
  },
  
  // 重定向配置
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/',
        permanent: true,
      },
    ];
  },
  
  // 重写配置
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://tender-analysis-system.dappweb.workers.dev/api/:path*',
      },
    ];
  },
  
  // Webpack 配置
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // 自定义 webpack 配置
    return config;
  },
  
  // 编译器选项
  compiler: {
    // 移除 console.log
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // 压缩配置
  compress: true,
  
  // 电源效率配置
  poweredByHeader: false,
  
  // 严格模式
  reactStrictMode: true,
  
  // SWC 压缩
  swcMinify: true,
};

export default nextConfig;