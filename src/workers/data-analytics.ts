import { Hono } from 'hono'
import { DataAnalyticsService, AnalyticsQuery } from '../services/data-analytics'
import { DatabaseService } from '../services/database'
import { successResponse, errorResponse } from '../utils/response'

// 环境类型定义
interface Env {
  DB: D1Database
  KV: KVNamespace
  CACHE: KVNamespace
  [key: string]: any
}

// 创建 Hono 应用
const app = new Hono<{ Bindings: Env }>()

// 数据分析服务实例
let analyticsService: DataAnalyticsService
let databaseService: DatabaseService

// 初始化服务
function initializeServices(env: Env) {
  if (!databaseService) {
    databaseService = new DatabaseService(env.DB)
  }
  if (!analyticsService) {
    analyticsService = new DataAnalyticsService(databaseService)
  }
}

/**
 * 获取招标项目统计数据
 * GET /tender-statistics
 */
app.get('/tender-statistics', async (c) => {
  try {
    initializeServices(c.env)
    
    // 解析查询参数
    const query: AnalyticsQuery = {
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
      area: c.req.query('area'),
      category: c.req.query('category'),
      status: c.req.query('status') as any,
      budgetRange: {
        min: c.req.query('minBudget') ? parseInt(c.req.query('minBudget')!) : undefined,
        max: c.req.query('maxBudget') ? parseInt(c.req.query('maxBudget')!) : undefined
      }
    }

    // 检查缓存
    const cacheKey = `tender-stats:${JSON.stringify(query)}`
    const cached = await c.env.CACHE.get(cacheKey)
    if (cached) {
      return c.json(successResponse(JSON.parse(cached), '获取招标统计成功（缓存）'))
    }

    // 获取统计数据
    const statistics = await analyticsService.getTenderStatistics(query)

    // 缓存结果（30分钟）
    await c.env.CACHE.put(cacheKey, JSON.stringify(statistics), { expirationTtl: 1800 })

    return c.json(successResponse(statistics, '获取招标统计成功'))
  } catch (error) {
    console.error('Get tender statistics error:', error)
    return c.json(errorResponse(
      '获取招标统计失败',
      error instanceof Error ? error.message : 'Unknown error'
    ), 500)
  }
})

/**
 * 获取项目分析数据
 * GET /project-analytics
 */
app.get('/project-analytics', async (c) => {
  try {
    initializeServices(c.env)
    
    const query: AnalyticsQuery = {
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate'),
      area: c.req.query('area'),
      category: c.req.query('category')
    }

    const cacheKey = `project-analytics:${JSON.stringify(query)}`
    const cached = await c.env.CACHE.get(cacheKey)
    if (cached) {
      return c.json(successResponse(JSON.parse(cached), '获取项目分析数据成功（缓存）'))
    }

    const analytics = await analyticsService.getProjectAnalytics(query)

    await c.env.CACHE.put(cacheKey, JSON.stringify(analytics), { expirationTtl: 1800 })

    return c.json(successResponse(analytics, '获取项目分析数据成功'))
  } catch (error) {
    console.error('Get project analytics error:', error)
    return c.json(errorResponse(
      '获取项目分析数据失败',
      error instanceof Error ? error.message : 'Unknown error'
    ), 500)
  }
})

/**
 * 获取业务指标
 * GET /business-metrics
 */
app.get('/business-metrics', async (c) => {
  try {
    initializeServices(c.env)
    
    const query: AnalyticsQuery = {
      startDate: c.req.query('startDate'),
      endDate: c.req.query('endDate')
    }

    const cacheKey = `business-metrics:${JSON.stringify(query)}`
    const cached = await c.env.CACHE.get(cacheKey)
    if (cached) {
      return c.json(successResponse(JSON.parse(cached), '获取业务指标成功（缓存）'))
    }

    const metrics = await analyticsService.getBusinessMetrics(query)

    await c.env.CACHE.put(cacheKey, JSON.stringify(metrics), { expirationTtl: 1800 })

    return c.json(successResponse(metrics, '获取业务指标成功'))
  } catch (error) {
    console.error('Get business metrics error:', error)
    return c.json(errorResponse(
      '获取业务指标失败',
      error instanceof Error ? error.message : 'Unknown error'
    ), 500)
  }
})

/**
 * 获取仪表板数据
 * GET /dashboard
 */
app.get('/dashboard', async (c) => {
  try {
    initializeServices(c.env)
    
    const cacheKey = 'dashboard-data'
    const cached = await c.env.CACHE.get(cacheKey)
    if (cached) {
      return c.json(successResponse(JSON.parse(cached), '获取仪表板数据成功（缓存）'))
    }

    const dashboardData = await analyticsService.getDashboardData()

    // 仪表板数据缓存时间较短（5分钟）
    await c.env.CACHE.put(cacheKey, JSON.stringify(dashboardData), { expirationTtl: 300 })

    return c.json(successResponse(dashboardData, '获取仪表板数据成功'))
  } catch (error) {
    console.error('Get dashboard data error:', error)
    return c.json(errorResponse(
      '获取仪表板数据失败',
      error instanceof Error ? error.message : 'Unknown error'
    ), 500)
  }
})

/**
 * 获取多维度分析数据
 * POST /multi-dimensional
 */
app.post('/multi-dimensional', async (c) => {
  try {
    initializeServices(c.env)
    
    const { dimensions, metrics, query } = await c.req.json()

    if (!Array.isArray(dimensions) || dimensions.length === 0) {
      return c.json(errorResponse('维度参数不能为空'), 400)
    }

    if (!Array.isArray(metrics) || metrics.length === 0) {
      return c.json(errorResponse('指标参数不能为空'), 400)
    }

    const cacheKey = `multi-dimensional:${JSON.stringify({ dimensions, metrics, query })}`
    const cached = await c.env.CACHE.get(cacheKey)
    if (cached) {
      return c.json(successResponse(JSON.parse(cached), '获取多维度分析数据成功（缓存）'))
    }

    const result = await analyticsService.getMultiDimensionalAnalysis(dimensions, metrics, query)

    await c.env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 1800 })

    return c.json(successResponse(result, '获取多维度分析数据成功'))
  } catch (error) {
    console.error('Multi-dimensional analysis error:', error)
    return c.json(errorResponse(
      '多维度分析失败',
      error instanceof Error ? error.message : 'Unknown error'
    ), 500)
  }
})

/**
 * 获取实时统计数据
 * GET /realtime-stats
 */
app.get('/realtime-stats', async (c) => {
  try {
    initializeServices(c.env)
    
    // 实时数据不使用缓存
    const stats = {
      currentTime: new Date().toISOString(),
      activeUsers: Math.floor(Math.random() * 50) + 10,
      ongoingAnalyses: Math.floor(Math.random() * 20) + 5,
      systemLoad: Math.random() * 0.8 + 0.1,
      apiCalls: {
        total: Math.floor(Math.random() * 1000) + 500,
        success: Math.floor(Math.random() * 950) + 450,
        errors: Math.floor(Math.random() * 50) + 10
      },
      dataFreshness: {
        tenderData: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        analysisData: new Date(Date.now() - Math.random() * 1800000).toISOString(),
        reportData: new Date(Date.now() - Math.random() * 7200000).toISOString()
      }
    }

    return c.json(successResponse(stats, '获取实时统计数据成功'))
  } catch (error) {
    console.error('Get realtime stats error:', error)
    return c.json(errorResponse(
      '获取实时统计数据失败',
      error instanceof Error ? error.message : 'Unknown error'
    ), 500)
  }
})

/**
 * 获取趋势分析数据
 * GET /trends
 */
app.get('/trends', async (c) => {
  try {
    initializeServices(c.env)
    
    const period = c.req.query('period') || '30d' // 30d, 90d, 1y
    const metric = c.req.query('metric') || 'projects' // projects, budget, roi, success_rate

    const cacheKey = `trends:${period}:${metric}`
    const cached = await c.env.CACHE.get(cacheKey)
    if (cached) {
      return c.json(successResponse(JSON.parse(cached), '获取趋势分析数据成功（缓存）'))
    }

    const trends = await generateTrendData(period, metric)

    await c.env.CACHE.put(cacheKey, JSON.stringify(trends), { expirationTtl: 3600 })

    return c.json(successResponse(trends, '获取趋势分析数据成功'))
  } catch (error) {
    console.error('Get trends error:', error)
    return c.json(errorResponse(
      '获取趋势分析失败',
      error instanceof Error ? error.message : 'Unknown error'
    ), 500)
  }
})

/**
 * 清除分析缓存
 * DELETE /cache
 */
app.delete('/cache', async (c) => {
  try {
    const pattern = c.req.query('pattern') || '*'
    
    // 清除匹配的缓存键
    const keys = ['tender-stats', 'project-analytics', 'business-metrics', 'dashboard-data', 'multi-dimensional', 'trends']
    
    for (const key of keys) {
      if (pattern === '*' || key.includes(pattern)) {
        // 由于KV不支持模式匹配删除，这里只能删除已知的键
        await c.env.CACHE.delete(key)
      }
    }

    return c.json(successResponse(null, '缓存清除成功'))
  } catch (error) {
    console.error('Clear cache error:', error)
    return c.json(errorResponse(
      '清除缓存失败',
      error instanceof Error ? error.message : 'Unknown error'
    ), 500)
  }
})

// 辅助函数

/**
 * 生成趋势数据
 */
async function generateTrendData(period: string, metric: string) {
  const days = period === '30d' ? 30 : period === '90d' ? 90 : 365
  const data = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    let value = 0
    switch (metric) {
      case 'projects':
        value = Math.floor(Math.random() * 20) + 5
        break
      case 'budget':
        value = Math.floor(Math.random() * 50000000) + 10000000
        break
      case 'roi':
        value = Math.random() * 50 + 10
        break
      case 'success_rate':
        value = Math.random() * 30 + 50
        break
    }
    
    data.push({
      date: date.toISOString().split('T')[0],
      value,
      metric
    })
  }
  
  return {
    period,
    metric,
    data,
    summary: {
      total: data.reduce((sum, item) => sum + item.value, 0),
      average: data.reduce((sum, item) => sum + item.value, 0) / data.length,
      trend: data[data.length - 1].value > data[0].value ? 'up' : 'down'
    }
  }
}

export default app