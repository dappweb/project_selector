/**
 * Cloudflare Pages Functions API代理
 * 将前端API请求代理到后端Workers
 */

interface Env {
  API: Fetcher
  FRONTEND_CACHE: KVNamespace
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context
  const url = new URL(request.url)
  
  try {
    // 构建后端API URL
    const pathSegments = params.path as string[]
    const apiPath = pathSegments ? pathSegments.join('/') : ''
    const backendUrl = `https://tender-analysis-api.your-domain.workers.dev/api/${apiPath}${url.search}`
    
    // 检查缓存（仅对GET请求）
    if (request.method === 'GET' && env.FRONTEND_CACHE) {
      const cacheKey = `api:${apiPath}:${url.search}`
      const cached = await env.FRONTEND_CACHE.get(cacheKey)
      
      if (cached) {
        const cachedData = JSON.parse(cached)
        return new Response(JSON.stringify(cachedData), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300',
            'X-Cache': 'HIT'
          }
        })
      }
    }
    
    // 创建新的请求
    const newRequest = new Request(backendUrl, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'X-Forwarded-For': request.headers.get('CF-Connecting-IP') || '',
        'X-Real-IP': request.headers.get('CF-Connecting-IP') || '',
        'User-Agent': request.headers.get('User-Agent') || 'Cloudflare-Pages-Proxy'
      },
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined
    })
    
    // 发送请求到后端API
    let response: Response
    
    if (env.API) {
      // 使用Service Binding
      response = await env.API.fetch(newRequest)
    } else {
      // 使用HTTP请求
      response = await fetch(newRequest)
    }
    
    // 克隆响应
    const responseClone = response.clone()
    
    // 缓存GET请求的响应（仅成功响应）
    if (request.method === 'GET' && response.ok && env.FRONTEND_CACHE) {
      try {
        const responseData = await responseClone.json()
        const cacheKey = `api:${apiPath}:${url.search}`
        
        // 根据API类型设置不同的缓存时间
        let cacheTtl = 300 // 默认5分钟
        
        if (apiPath.includes('statistics') || apiPath.includes('analytics')) {
          cacheTtl = 600 // 统计数据缓存10分钟
        } else if (apiPath.includes('projects')) {
          cacheTtl = 180 // 项目数据缓存3分钟
        } else if (apiPath.includes('reports')) {
          cacheTtl = 1800 // 报告数据缓存30分钟
        }
        
        await env.FRONTEND_CACHE.put(
          cacheKey,
          JSON.stringify(responseData),
          { expirationTtl: cacheTtl }
        )
      } catch (error) {
        console.error('Cache error:', error)
      }
    }
    
    // 添加代理头部
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'X-Proxy': 'Cloudflare-Pages',
        'X-Cache': 'MISS'
      }
    })
    
    return newResponse
    
  } catch (error) {
    console.error('API Proxy Error:', error)
    
    return new Response(JSON.stringify({
      success: false,
      error: 'API代理错误',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}