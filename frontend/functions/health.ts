/**
 * 健康检查端点
 * 用于监控前端应用状态
 */

interface Env {
  API: Fetcher
  FRONTEND_CACHE: KVNamespace
  DB: D1Database
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env } = context
  
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: 'production',
      services: {
        frontend: 'healthy',
        api: 'unknown',
        cache: 'unknown',
        database: 'unknown'
      }
    }
    
    // 检查API服务状态
    try {
      if (env.API) {
        const apiResponse = await env.API.fetch('https://tender-analysis-api.your-domain.workers.dev/')
        healthData.services.api = apiResponse.ok ? 'healthy' : 'unhealthy'
      }
    } catch (error) {
      healthData.services.api = 'error'
    }
    
    // 检查缓存服务状态
    try {
      if (env.FRONTEND_CACHE) {
        await env.FRONTEND_CACHE.put('health-check', 'ok', { expirationTtl: 60 })
        const testValue = await env.FRONTEND_CACHE.get('health-check')
        healthData.services.cache = testValue === 'ok' ? 'healthy' : 'unhealthy'
      }
    } catch (error) {
      healthData.services.cache = 'error'
    }
    
    // 检查数据库状态
    try {
      if (env.DB) {
        const result = await env.DB.prepare('SELECT 1 as test').first()
        healthData.services.database = result ? 'healthy' : 'unhealthy'
      }
    } catch (error) {
      healthData.services.database = 'error'
    }
    
    // 确定整体状态
    const serviceStatuses = Object.values(healthData.services)
    if (serviceStatuses.includes('error')) {
      healthData.status = 'error'
    } else if (serviceStatuses.includes('unhealthy')) {
      healthData.status = 'degraded'
    }
    
    const statusCode = healthData.status === 'healthy' ? 200 : 503
    
    return new Response(JSON.stringify(healthData, null, 2), {
      status: statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
    
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}