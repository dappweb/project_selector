/**
 * Cloudflare Pages Functions中间件
 * 处理API代理、缓存、安全等功能
 */

interface Env {
  API: Fetcher
  FRONTEND_CACHE: KVNamespace
  DB: D1Database
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context
  const url = new URL(request.url)
  
  // 添加安全头部
  const response = await next()
  
  // 克隆响应以便修改头部
  const newResponse = new Response(response.body, response)
  
  // 添加安全头部
  newResponse.headers.set('X-Frame-Options', 'DENY')
  newResponse.headers.set('X-Content-Type-Options', 'nosniff')
  newResponse.headers.set('X-XSS-Protection', '1; mode=block')
  newResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  newResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  
  // HTTPS重定向
  if (url.protocol === 'http:' && url.hostname !== 'localhost') {
    return Response.redirect(`https://${url.host}${url.pathname}${url.search}`, 301)
  }
  
  // 设置缓存头部
  if (url.pathname.startsWith('/_next/static/')) {
    newResponse.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  } else if (url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
    newResponse.headers.set('Cache-Control', 'public, max-age=86400')
  } else if (url.pathname.endsWith('.html') || url.pathname === '/') {
    newResponse.headers.set('Cache-Control', 'public, max-age=3600')
  }
  
  return newResponse
}