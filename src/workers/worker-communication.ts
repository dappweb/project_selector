/**
 * Workers间通信Worker
 * 提供Workers间通信管理、监控和统计功能
 */

import { Hono } from 'hono'
import { Env } from '../index'
import { WorkerCommunicationService } from '../services/worker-communication'
import { successResponse, errorResponse } from '../utils/response'

const app = new Hono<{ Bindings: Env }>()

// 发送消息到指定Worker
app.post('/send/:targetService', async (c) => {
  try {
    const targetService = c.req.param('targetService')
    const body = await c.req.json()
    const { endpoint, payload, options } = body

    if (!targetService || !endpoint) {
      return c.json(errorResponse('目标服务和端点不能为空'), 400)
    }

    const service = new WorkerCommunicationService(c.env)
    const response = await service.sendMessage(targetService, endpoint, payload, options || {})

    return c.json(successResponse(response, '消息发送成功'))
  } catch (error) {
    console.error('Send message error:', error)
    return c.json(
      errorResponse(
        '发送消息失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 批量发送消息
app.post('/send/batch', async (c) => {
  try {
    const body = await c.req.json()
    const { messages } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return c.json(errorResponse('消息列表不能为空'), 400)
    }

    const service = new WorkerCommunicationService(c.env)
    const responses = await service.sendBatchMessages(messages)

    const successful = responses.filter(r => r.success).length
    const failed = responses.filter(r => !r.success).length

    return c.json(successResponse({
      responses,
      summary: {
        total: messages.length,
        successful,
        failed,
        successRate: (successful / messages.length) * 100
      }
    }, `批量发送完成，成功：${successful}，失败：${failed}`))
  } catch (error) {
    console.error('Batch send messages error:', error)
    return c.json(
      errorResponse(
        '批量发送消息失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 发送异步消息
app.post('/send/async/:targetService', async (c) => {
  try {
    const targetService = c.req.param('targetService')
    const body = await c.req.json()
    const { endpoint, payload, options } = body

    if (!targetService || !endpoint) {
      return c.json(errorResponse('目标服务和端点不能为空'), 400)
    }

    const service = new WorkerCommunicationService(c.env)
    await service.sendAsyncMessage(targetService, endpoint, payload, options || {})

    return c.json(successResponse(null, '异步消息已加入队列'))
  } catch (error) {
    console.error('Send async message error:', error)
    return c.json(
      errorResponse(
        '发送异步消息失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 广播消息
app.post('/broadcast', async (c) => {
  try {
    const body = await c.req.json()
    const { targetServices, endpoint, payload, options } = body

    if (!Array.isArray(targetServices) || targetServices.length === 0 || !endpoint) {
      return c.json(errorResponse('目标服务列表和端点不能为空'), 400)
    }

    const service = new WorkerCommunicationService(c.env)
    const results = await service.broadcastMessage(targetServices, endpoint, payload, options || {})

    const responses = Array.from(results.entries()).map(([serviceName, response]) => ({
      service: serviceName,
      ...response
    }))

    const successful = responses.filter(r => r.success).length
    const failed = responses.filter(r => !r.success).length

    return c.json(successResponse({
      responses,
      summary: {
        total: targetServices.length,
        successful,
        failed,
        successRate: (successful / targetServices.length) * 100
      }
    }, `广播完成，成功：${successful}，失败：${failed}`))
  } catch (error) {
    console.error('Broadcast message error:', error)
    return c.json(
      errorResponse(
        '广播消息失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取服务健康状态
app.get('/health/:serviceName?', async (c) => {
  try {
    const serviceName = c.req.param('serviceName')

    const service = new WorkerCommunicationService(c.env)
    const healthResults = await service.getServiceHealth(serviceName)

    const healthData = Array.from(healthResults.entries()).map(([name, health]) => ({
      service: name,
      ...health
    }))

    const healthyServices = healthData.filter(s => s.status === 'healthy').length
    const totalServices = healthData.length

    return c.json(successResponse({
      services: healthData,
      summary: {
        total: totalServices,
        healthy: healthyServices,
        unhealthy: totalServices - healthyServices,
        healthRate: totalServices > 0 ? (healthyServices / totalServices) * 100 : 0
      }
    }, '获取服务健康状态成功'))
  } catch (error) {
    console.error('Get service health error:', error)
    return c.json(
      errorResponse(
        '获取服务健康状态失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取通信统计
app.get('/stats', async (c) => {
  try {
    const service = new WorkerCommunicationService(c.env)
    const stats = await service.getCommunicationStats()

    if (!stats) {
      return c.json(errorResponse('获取统计数据失败'), 500)
    }

    // 计算平均响应时间
    const averageResponseTime = stats.totalMessages > 0 
      ? stats.totalResponseTime / stats.successfulMessages 
      : 0

    // 计算成功率
    const successRate = stats.totalMessages > 0 
      ? (stats.successfulMessages / stats.totalMessages) * 100 
      : 0

    // 处理服务统计
    const serviceStats = Object.entries(stats.serviceStats || {}).map(([serviceName, serviceData]: [string, any]) => ({
      service: serviceName,
      totalMessages: serviceData.totalMessages,
      successfulMessages: serviceData.successfulMessages,
      failedMessages: serviceData.failedMessages,
      successRate: serviceData.totalMessages > 0 
        ? (serviceData.successfulMessages / serviceData.totalMessages) * 100 
        : 0,
      averageResponseTime: serviceData.successfulMessages > 0 
        ? serviceData.totalResponseTime / serviceData.successfulMessages 
        : 0
    }))

    const enhancedStats = {
      ...stats,
      averageResponseTime,
      successRate,
      serviceStats
    }

    return c.json(successResponse(enhancedStats, '获取通信统计成功'))
  } catch (error) {
    console.error('Get communication stats error:', error)
    return c.json(
      errorResponse(
        '获取通信统计失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取通信日志
app.get('/logs', async (c) => {
  try {
    const { limit = '50', service, status, type } = c.req.query()

    const logsData = await c.env.KV.get('worker-communication:logs')
    let logs = logsData ? JSON.parse(logsData) : []

    // 应用筛选
    if (service) {
      logs = logs.filter((log: any) => log.target === service || log.source === service)
    }

    if (status) {
      logs = logs.filter((log: any) => log.status === status)
    }

    if (type) {
      logs = logs.filter((log: any) => log.type === type)
    }

    // 限制数量
    const limitNum = parseInt(limit)
    const paginatedLogs = logs.slice(0, limitNum)

    return c.json(successResponse({
      logs: paginatedLogs,
      total: logs.length,
      filtered: paginatedLogs.length
    }, '获取通信日志成功'))
  } catch (error) {
    console.error('Get communication logs error:', error)
    return c.json(
      errorResponse(
        '获取通信日志失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 清理日志和统计
app.delete('/cleanup', async (c) => {
  try {
    const { type } = c.req.query()

    if (type === 'logs' || !type) {
      await c.env.KV.delete('worker-communication:logs')
    }

    if (type === 'stats' || !type) {
      await c.env.KV.delete('worker-communication:stats')
    }

    return c.json(successResponse(null, '清理完成'))
  } catch (error) {
    console.error('Cleanup error:', error)
    return c.json(
      errorResponse(
        '清理失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 测试Worker通信
app.post('/test/:targetService', async (c) => {
  try {
    const targetService = c.req.param('targetService')
    const body = await c.req.json()
    const { endpoint = '/health', payload = {}, timeout = 5000 } = body

    if (!targetService) {
      return c.json(errorResponse('目标服务不能为空'), 400)
    }

    const service = new WorkerCommunicationService(c.env)
    const startTime = Date.now()
    
    const response = await service.sendMessage(targetService, endpoint, payload, {
      method: 'GET',
      timeout,
      retries: 1
    })

    const testResult = {
      targetService,
      endpoint,
      success: response.success,
      responseTime: Date.now() - startTime,
      response: response.data,
      error: response.error,
      timestamp: new Date().toISOString()
    }

    return c.json(successResponse(testResult, '通信测试完成'))
  } catch (error) {
    console.error('Test communication error:', error)
    return c.json(
      errorResponse(
        '通信测试失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

export default app