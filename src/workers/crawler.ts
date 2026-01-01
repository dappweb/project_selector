import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { DatabaseService } from '../services/database'
import { JianyuApiClient } from '../services/jianyu-api.js'
import { SchedulerService } from '../services/scheduler'
import { successResponse, errorResponse } from '../utils/response'
import type { Env } from '../index'

// 数据抓取Worker应用
const app = new Hono<{ Bindings: Env }>()

// 中间件
app.use('*', cors())
app.use('*', logger())

// 启动数据抓取
app.post('/start', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json(errorResponse('数据库未配置'), 500)
    }
    
    const dbService = new DatabaseService(c.env.DB)
    const apiClient = new JianyuApiClient(c.env)
    
    // 获取最新的招标信息
    const tenders = await apiClient.fetchLatestTenders()
    
    let createdCount = 0
    let updatedCount = 0
    
    for (const tender of tenders) {
      // 检查是否已存在
      const existing = await dbService.getTenderInfoById(tender.id)
      
      if (existing) {
        // 更新现有记录
        await dbService.updateTenderInfo(tender.id, {
          title: tender.title,
          content: tender.content,
          budget: tender.budget,
          publishTime: tender.publishTime,
          deadline: tender.deadline,
          purchaser: tender.purchaser,
          area: tender.area,
          projectType: tender.projectType,
          status: tender.status
        })
        updatedCount++
      } else {
        // 创建新记录
        await dbService.createTenderInfo(tender)
        createdCount++
      }
    }
    
    return c.json(successResponse({
      message: 'Data crawling completed successfully',
      statistics: {
        total: tenders.length,
        created: createdCount,
        updated: updatedCount
      }
    }))
  } catch (error) {
    console.error('Crawler error:', error)
    return c.json(errorResponse('Failed to start data crawling', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 获取抓取状态
app.get('/status', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json(errorResponse('数据库未配置'), 500)
    }
    
    const dbService = new DatabaseService(c.env.DB)
    const scheduler = new SchedulerService(c.env)
    
    // 获取最近的抓取统计
    const [stats, crawlStats, recentTasks] = await Promise.all([
      dbService.getStatistics(),
      scheduler.getCrawlStatistics(),
      scheduler.getRecentTasks(5)
    ])
    
    return c.json(successResponse({
      status: 'running',
      lastUpdate: crawlStats.lastCrawlTime,
      statistics: {
        database: stats,
        crawling: crawlStats,
        recentTasks
      }
    }))
  } catch (error) {
    console.error('Status check error:', error)
    return c.json(errorResponse('Failed to get crawler status', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 手动抓取指定关键词
app.post('/manual-fetch', async (c) => {
  try {
    const { keyword, limit = 50 } = await c.req.json()
    
    if (!keyword) {
      return c.json(errorResponse('Keyword is required'), 400)
    }
    
    if (!c.env.DB) {
      return c.json(errorResponse('数据库未配置'), 500)
    }
    
    const dbService = new DatabaseService(c.env.DB)
    const apiClient = new JianyuApiClient(c.env)
    
    // 根据关键词搜索招标信息
    const tenders = await apiClient.searchTenders(keyword, limit)
    
    let processedCount = 0
    
    for (const tender of tenders) {
      // 检查是否已存在
      const existing = await dbService.getTenderInfoById(tender.id)
      
      if (!existing) {
        await dbService.createTenderInfo(tender)
        processedCount++
      }
    }
    
    return c.json(successResponse({
      message: `Manual fetch completed for keyword: ${keyword}`,
      results: {
        total: tenders.length,
        processed: processedCount,
        keyword
      }
    }))
  } catch (error) {
    console.error('Manual fetch error:', error)
    return c.json(errorResponse('Failed to perform manual fetch', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 定时任务触发器（Cron Trigger）
app.post('/cron', async (c) => {
  try {
    const scheduler = new SchedulerService(c.env)
    
    console.log('Starting scheduled crawling task...')
    
    // 执行定时抓取任务
    const taskStatus = await scheduler.executeScheduledCrawling()
    
    if (taskStatus.status === 'COMPLETED') {
      console.log(`Scheduled crawling completed successfully. Task ID: ${taskStatus.id}`)
      return c.json(successResponse({
        message: 'Scheduled crawling completed successfully',
        taskId: taskStatus.id,
        result: taskStatus.result
      }))
    } else {
      console.error(`Scheduled crawling failed. Task ID: ${taskStatus.id}, Error: ${taskStatus.error}`)
      return c.json(errorResponse('Scheduled crawling failed', taskStatus.error), 500)
    }
  } catch (error) {
    console.error('Cron crawling error:', error)
    return c.json(errorResponse('Failed to perform scheduled crawling', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 获取任务状态
app.get('/task/:taskId', async (c) => {
  try {
    const taskId = c.req.param('taskId')
    const scheduler = new SchedulerService(c.env)
    
    const taskStatus = await scheduler.getTaskStatus(taskId)
    
    if (!taskStatus) {
      return c.json(errorResponse('Task not found'), 404)
    }
    
    return c.json(successResponse(taskStatus))
  } catch (error) {
    console.error('Get task status error:', error)
    return c.json(errorResponse('Failed to get task status', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 获取关键词配置
app.get('/keywords', async (c) => {
  try {
    const scheduler = new SchedulerService(c.env)
    const keywords = await scheduler.getCurrentKeywords()
    
    return c.json(successResponse({
      keywords,
      count: keywords.length
    }))
  } catch (error) {
    console.error('Get keywords error:', error)
    return c.json(errorResponse('Failed to get keywords', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 更新关键词配置
app.post('/keywords', async (c) => {
  try {
    const { keywords } = await c.req.json()
    
    if (!Array.isArray(keywords)) {
      return c.json(errorResponse('Keywords must be an array'), 400)
    }
    
    const scheduler = new SchedulerService(c.env)
    await scheduler.setCustomKeywords(keywords)
    
    return c.json(successResponse({
      message: 'Keywords updated successfully',
      keywords,
      count: keywords.length
    }))
  } catch (error) {
    console.error('Update keywords error:', error)
    return c.json(errorResponse('Failed to update keywords', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 清理过期任务
app.post('/cleanup', async (c) => {
  try {
    const scheduler = new SchedulerService(c.env)
    await scheduler.cleanupExpiredTasks()
    
    return c.json(successResponse({
      message: 'Cleanup completed successfully'
    }))
  } catch (error) {
    console.error('Cleanup error:', error)
    return c.json(errorResponse('Failed to cleanup tasks', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 手动创建招标信息（用于测试）
app.post('/create-tender', async (c) => {
  try {
    if (!c.env.DB) {
      return c.json(errorResponse('数据库未配置'), 500)
    }
    
    const tenderData = await c.req.json()
    const dbService = new DatabaseService(c.env.DB)
    
    // 创建招标信息
    const tender = await dbService.createTenderInfo({
      id: tenderData.id || `tender-${Date.now()}`,
      title: tenderData.title,
      content: tenderData.description || tenderData.content,
      budget: tenderData.budget,
      publishTime: new Date(tenderData.publishDate || Date.now()),
      deadline: new Date(tenderData.deadline),
      purchaser: tenderData.purchaser || '测试采购方',
      area: tenderData.area || '北京',
      projectType: tenderData.category || '软件开发',
      status: tenderData.status || 'ACTIVE'
    })
    
    return c.json(successResponse(tender, '招标信息创建成功'))
  } catch (error) {
    console.error('Create tender error:', error)
    return c.json(errorResponse('Failed to create tender', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

export default app