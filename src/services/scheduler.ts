import { DatabaseService } from './database'
import { JianyuApiClient } from './jianyu-api.js'
import type { Env } from '../index'

// 调度任务状态
export interface ScheduleTaskStatus {
  id: string
  name: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  startTime?: Date
  endTime?: Date
  error?: string
  result?: any
}

// 重试配置
interface RetryConfig {
  maxRetries: number
  baseDelay: number // 基础延迟（毫秒）
  maxDelay: number // 最大延迟（毫秒）
  backoffMultiplier: number // 退避倍数
}

export class SchedulerService {
  private env: Env
  private dbService: DatabaseService
  private apiClient: JianyuApiClient
  private retryConfig: RetryConfig

  constructor(env: Env) {
    this.env = env
    this.dbService = new DatabaseService(env.DB)
    this.apiClient = new JianyuApiClient(env)
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2
    }
  }

  // 执行定时数据抓取任务
  async executeScheduledCrawling(): Promise<ScheduleTaskStatus> {
    const taskId = `crawl_${Date.now()}`
    const taskStatus: ScheduleTaskStatus = {
      id: taskId,
      name: 'Scheduled Data Crawling',
      status: 'PENDING',
      startTime: new Date()
    }

    try {
      console.log(`Starting scheduled crawling task: ${taskId}`)
      taskStatus.status = 'RUNNING'
      
      // 存储任务状态到KV
      await this.env.KV.put(`task:${taskId}`, JSON.stringify(taskStatus))

      // 获取AI相关关键词列表
      const keywords = await this.getKeywords()
      let totalProcessed = 0
      let totalErrors = 0
      const results: any[] = []

      for (const keyword of keywords) {
        try {
          const keywordResult = await this.processKeywordWithRetry(keyword)
          results.push(keywordResult)
          totalProcessed += keywordResult.processed
          
          // 添加延迟以避免API限流
          await this.delay(2000)
        } catch (error) {
          console.error(`Failed to process keyword "${keyword}" after retries:`, error)
          totalErrors++
          results.push({
            keyword,
            processed: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // 更新最后抓取时间
      await this.env.KV.put('last_crawl_time', new Date().toISOString())
      await this.env.KV.put('crawl_statistics', JSON.stringify({
        totalProcessed,
        totalErrors,
        keywords: keywords.length,
        timestamp: new Date().toISOString()
      }))

      taskStatus.status = 'COMPLETED'
      taskStatus.endTime = new Date()
      taskStatus.result = {
        totalProcessed,
        totalErrors,
        keywordResults: results
      }

      console.log(`Scheduled crawling completed: ${totalProcessed} items processed, ${totalErrors} errors`)
      
    } catch (error) {
      console.error(`Scheduled crawling task failed:`, error)
      taskStatus.status = 'FAILED'
      taskStatus.endTime = new Date()
      taskStatus.error = error instanceof Error ? error.message : 'Unknown error'
    }

    // 更新任务状态
    await this.env.KV.put(`task:${taskId}`, JSON.stringify(taskStatus))
    
    return taskStatus
  }

  // 带重试机制处理关键词
  private async processKeywordWithRetry(keyword: string): Promise<{
    keyword: string
    processed: number
    total: number
  }> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const tenders = await this.apiClient.searchTenders(keyword, 20)
        let processedCount = 0

        for (const tender of tenders) {
          try {
            const existing = await this.dbService.getTenderInfoById(tender.id)
            
            if (!existing) {
              await this.dbService.createTenderInfo(tender)
              processedCount++
            }
          } catch (dbError) {
            console.error(`Failed to save tender ${tender.id}:`, dbError)
            // 继续处理其他项目
          }
        }

        return {
          keyword,
          processed: processedCount,
          total: tenders.length
        }
        
      } catch (error) {
        lastError = error as Error
        
        if (attempt < this.retryConfig.maxRetries) {
          const delay = Math.min(
            this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt),
            this.retryConfig.maxDelay
          )
          
          console.log(`Keyword "${keyword}" failed (attempt ${attempt + 1}), retrying in ${delay}ms...`)
          await this.delay(delay)
        }
      }
    }

    throw lastError || new Error(`Failed to process keyword "${keyword}" after ${this.retryConfig.maxRetries} retries`)
  }

  // 获取搜索关键词列表
  private async getKeywords(): Promise<string[]> {
    try {
      // 尝试从KV存储获取自定义关键词
      const customKeywords = await this.env.KV.get('crawl_keywords')
      if (customKeywords) {
        const parsed = JSON.parse(customKeywords)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (error) {
      console.error('Failed to load custom keywords:', error)
    }

    // 默认关键词列表
    return [
      'AI开发',
      '人工智能',
      '机器学习',
      '深度学习',
      '自然语言处理',
      '软件开发',
      '系统集成',
      '平台建设',
      '数据分析',
      '智能系统'
    ]
  }

  // 获取任务状态
  async getTaskStatus(taskId: string): Promise<ScheduleTaskStatus | null> {
    try {
      const statusJson = await this.env.KV.get(`task:${taskId}`)
      if (statusJson) {
        const status = JSON.parse(statusJson)
        // 转换日期字符串回Date对象
        if (status.startTime) status.startTime = new Date(status.startTime)
        if (status.endTime) status.endTime = new Date(status.endTime)
        return status
      }
    } catch (error) {
      console.error(`Failed to get task status for ${taskId}:`, error)
    }
    return null
  }

  // 获取最近的任务列表
  async getRecentTasks(limit: number = 10): Promise<ScheduleTaskStatus[]> {
    try {
      // 这里简化实现，实际应该维护一个任务列表
      const recentTasksJson = await this.env.KV.get('recent_tasks')
      if (recentTasksJson) {
        const tasks = JSON.parse(recentTasksJson)
        return tasks.slice(0, limit).map((task: any) => ({
          ...task,
          startTime: task.startTime ? new Date(task.startTime) : undefined,
          endTime: task.endTime ? new Date(task.endTime) : undefined
        }))
      }
    } catch (error) {
      console.error('Failed to get recent tasks:', error)
    }
    return []
  }

  // 清理过期任务记录
  async cleanupExpiredTasks(): Promise<void> {
    try {
      const cutoffTime = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7天前
      
      // 获取所有任务键
      const taskKeys = await this.env.KV.list({ prefix: 'task:' })
      
      for (const key of taskKeys.keys) {
        try {
          const taskJson = await this.env.KV.get(key.name)
          if (taskJson) {
            const task = JSON.parse(taskJson)
            const taskTime = new Date(task.startTime || task.endTime)
            
            if (taskTime < cutoffTime) {
              await this.env.KV.delete(key.name)
              console.log(`Cleaned up expired task: ${key.name}`)
            }
          }
        } catch (error) {
          console.error(`Failed to process task ${key.name} during cleanup:`, error)
        }
      }
    } catch (error) {
      console.error('Failed to cleanup expired tasks:', error)
    }
  }

  // 获取抓取统计信息
  async getCrawlStatistics(): Promise<{
    lastCrawlTime?: Date
    totalProcessed?: number
    totalErrors?: number
    keywords?: number
  }> {
    try {
      const [lastCrawlTime, statistics] = await Promise.all([
        this.env.KV.get('last_crawl_time'),
        this.env.KV.get('crawl_statistics')
      ])

      const result: any = {}
      
      if (lastCrawlTime) {
        result.lastCrawlTime = new Date(lastCrawlTime)
      }
      
      if (statistics) {
        const stats = JSON.parse(statistics)
        result.totalProcessed = stats.totalProcessed
        result.totalErrors = stats.totalErrors
        result.keywords = stats.keywords
      }
      
      return result
    } catch (error) {
      console.error('Failed to get crawl statistics:', error)
      return {}
    }
  }

  // 设置自定义关键词
  async setCustomKeywords(keywords: string[]): Promise<void> {
    if (!Array.isArray(keywords) || keywords.length === 0) {
      throw new Error('Keywords must be a non-empty array')
    }
    
    // 验证关键词
    const validKeywords = keywords
      .filter(k => typeof k === 'string' && k.trim().length > 0)
      .map(k => k.trim())
    
    if (validKeywords.length === 0) {
      throw new Error('No valid keywords provided')
    }
    
    await this.env.KV.put('crawl_keywords', JSON.stringify(validKeywords))
    console.log(`Updated custom keywords: ${validKeywords.join(', ')}`)
  }

  // 获取当前关键词列表
  async getCurrentKeywords(): Promise<string[]> {
    return await this.getKeywords()
  }

  // 延迟函数
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // 发送告警通知
  private async sendAlert(message: string, error?: Error): Promise<void> {
    try {
      const alertData = {
        type: 'SYSTEM_ALERT',
        message,
        error: error?.message,
        timestamp: new Date().toISOString(),
        source: 'SchedulerService'
      }

      // 发送到通知队列
      await this.env.NOTIFICATION_QUEUE?.send(alertData)
    } catch (notificationError) {
      console.error('Failed to send alert notification:', notificationError)
    }
  }
}