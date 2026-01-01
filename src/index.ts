import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { prettyJSON } from 'hono/pretty-json'
import crawlerApp from './workers/crawler'
import aiAnalysisApp from './workers/ai-analysis'
import proposalGenerationApp from './workers/proposal-generation'
import costBenefitAnalysisApp from './workers/cost-benefit-analysis'
import dataAnalyticsApp from './workers/data-analytics'
import reportGenerationApp from './workers/report-generation'
import projectTrackingApp from './workers/project-tracking'
import notificationApp from './workers/notification'
import workerCommunicationApp from './workers/worker-communication'

// 类型定义
export interface Env {
  // Cloudflare 绑定
  AI: Ai
  DB: D1Database
  KV: KVNamespace
  CACHE: KVNamespace
  CONFIG: KVNamespace
  STORAGE: R2Bucket
  NOTIFICATION_QUEUE: Queue
  WORKER_COMMUNICATION_QUEUE: Queue
  
  // Service Bindings for Worker Communication
  CRAWLER_SERVICE?: Fetcher
  AI_ANALYSIS_SERVICE?: Fetcher
  PROPOSAL_SERVICE?: Fetcher
  COST_BENEFIT_SERVICE?: Fetcher
  DATA_ANALYTICS_SERVICE?: Fetcher
  REPORT_SERVICE?: Fetcher
  PROJECT_TRACKING_SERVICE?: Fetcher
  NOTIFICATION_SERVICE?: Fetcher
  
  // 环境变量
  ENVIRONMENT: string
  API_BASE_URL: string
  JIANYU_API_BASE_URL: string
  JIANYU_API_KEY: string
  
  // 添加索引签名以满足Hono的要求
  [key: string]: any
}

// 创建 Hono 应用
const app = new Hono<{ Bindings: Env }>()

// 中间件
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://tender-analysis.pages.dev'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.use('*', logger())
app.use('*', prettyJSON())

// 健康检查
app.get('/', (c) => {
  return c.json({
    message: '招投标智能分析系统 API',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: c.env?.ENVIRONMENT || 'unknown'
  })
})

// 挂载数据抓取Worker
app.route('/api/crawler', crawlerApp)

// 挂载AI分析Worker
app.route('/api/ai-analysis', aiAnalysisApp)

// 挂载方案生成Worker
app.route('/api/proposal-generation', proposalGenerationApp)

// 挂载成本收益分析Worker
app.route('/api/cost-benefit-analysis', costBenefitAnalysisApp)

// 挂载数据分析Worker
app.route('/api/data-analytics', dataAnalyticsApp)

// 挂载报表生成Worker
app.route('/api/report-generation', reportGenerationApp)

// 挂载项目跟踪Worker
app.route('/api/project-tracking', projectTrackingApp)

// 挂载通知Worker
app.route('/api/notification', notificationApp)

// 挂载Workers间通信Worker
app.route('/api/worker-communication', workerCommunicationApp)

// AI分析路由
app.post('/api/analysis/analyze/:tenderId', async (c) => {
  try {
    const tenderId = c.req.param('tenderId')
    
    if (!tenderId) {
      return c.json({
        success: false,
        error: '招标项目ID不能为空'
      }, 400)
    }
    
    return c.json({
      success: true,
      message: `正在分析项目: ${tenderId}`,
      data: {
        tenderId,
        status: 'analyzing',
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Analysis error:', error)
    return c.json({
      success: false,
      error: '项目分析失败',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// Note: Notification routes are handled by the notification worker mounted at /api/notification

// 错误处理
app.onError((err, c) => {
  console.error('Application Error:', err)
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
    timestamp: new Date().toISOString()
  }, 500)
})

// 404 处理
app.notFound((c) => {
  return c.json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    timestamp: new Date().toISOString()
  }, 404)
})

// Worker 导出
const worker: ExportedHandler<Env> = {
  fetch: app.fetch,
  
  // 定时任务 - 每小时执行数据抓取
  async scheduled(controller, env, ctx): Promise<void> {
    console.log('Scheduled task triggered:', controller.cron)
    
    try {
      const request = new Request('http://localhost/api/crawler/cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const response = await app.fetch(request, env, ctx)
      console.log('Scheduled crawling result:', await response.text())
    } catch (error) {
      console.error('Scheduled task error:', error)
    }
  },

  // 队列消息处理
  async queue(batch, env): Promise<void> {
    console.log('Processing queue batch:', batch.messages.length, 'messages')
    
    for (const message of batch.messages) {
      try {
        // 根据队列类型处理不同的消息
        if (batch.queue === 'notification-queue') {
          await processNotificationMessage(message.body, env)
        } else if (batch.queue === 'worker-communication-queue') {
          await processWorkerCommunicationMessage(message.body, env)
        } else {
          console.warn('Unknown queue:', batch.queue)
        }
        
        message.ack()
      } catch (error) {
        console.error('Queue message processing error:', error)
        message.retry()
      }
    }
  }
}

// 通知消息处理函数
async function processNotificationMessage(messageBody: any, env: Env): Promise<void> {
  try {
    const { NotificationService } = await import('./services/notification')
    const service = new NotificationService(env)
    await service.processQueueMessage(messageBody)
  } catch (error) {
    console.error('Process notification message error:', error)
    throw error
  }
}

// Workers间通信消息处理函数
async function processWorkerCommunicationMessage(messageBody: any, env: Env): Promise<void> {
  try {
    const { WorkerCommunicationService } = await import('./services/worker-communication')
    const service = new WorkerCommunicationService(env)
    await service.processQueueMessage(messageBody)
  } catch (error) {
    console.error('Process worker communication message error:', error)
    throw error
  }
}

export default worker