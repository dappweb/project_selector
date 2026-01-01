/**
 * Workers间通信服务
 * 配置Service Bindings，实现异步消息处理，添加错误处理和重试
 */

import { Env } from '../index'

export interface WorkerMessage {
  id: string
  type: 'analysis_request' | 'proposal_request' | 'notification_request' | 'status_update' | 'data_sync'
  source: string
  target: string
  payload: any
  timestamp: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  retryCount: number
  maxRetries: number
  expiresAt?: string
}

export interface WorkerResponse {
  success: boolean
  data?: any
  error?: string
  timestamp: string
  processingTime: number
}

export interface ServiceBinding {
  name: string
  service: Fetcher
  baseUrl: string
  timeout: number
  retryPolicy: {
    maxRetries: number
    backoffMultiplier: number
    maxBackoffTime: number
  }
}

export class WorkerCommunicationService {
  private services: Map<string, ServiceBinding> = new Map()

  constructor(private env: Env) {
    this.initializeServices()
  }

  /**
   * 初始化服务绑定
   */
  private initializeServices() {
    // 注册各个Worker服务
    const services = [
      {
        name: 'crawler',
        service: this.env.CRAWLER_SERVICE,
        baseUrl: '/api/crawler',
        timeout: 30000,
        retryPolicy: { maxRetries: 3, backoffMultiplier: 2, maxBackoffTime: 10000 }
      },
      {
        name: 'ai-analysis',
        service: this.env.AI_ANALYSIS_SERVICE,
        baseUrl: '/api/ai-analysis',
        timeout: 60000,
        retryPolicy: { maxRetries: 2, backoffMultiplier: 2, maxBackoffTime: 15000 }
      },
      {
        name: 'proposal-generation',
        service: this.env.PROPOSAL_SERVICE,
        baseUrl: '/api/proposal-generation',
        timeout: 45000,
        retryPolicy: { maxRetries: 2, backoffMultiplier: 2, maxBackoffTime: 12000 }
      },
      {
        name: 'cost-benefit-analysis',
        service: this.env.COST_BENEFIT_SERVICE,
        baseUrl: '/api/cost-benefit-analysis',
        timeout: 30000,
        retryPolicy: { maxRetries: 3, backoffMultiplier: 2, maxBackoffTime: 10000 }
      },
      {
        name: 'data-analytics',
        service: this.env.DATA_ANALYTICS_SERVICE,
        baseUrl: '/api/data-analytics',
        timeout: 20000,
        retryPolicy: { maxRetries: 3, backoffMultiplier: 1.5, maxBackoffTime: 8000 }
      },
      {
        name: 'report-generation',
        service: this.env.REPORT_SERVICE,
        baseUrl: '/api/report-generation',
        timeout: 90000,
        retryPolicy: { maxRetries: 2, backoffMultiplier: 2, maxBackoffTime: 20000 }
      },
      {
        name: 'project-tracking',
        service: this.env.PROJECT_TRACKING_SERVICE,
        baseUrl: '/api/project-tracking',
        timeout: 15000,
        retryPolicy: { maxRetries: 3, backoffMultiplier: 1.5, maxBackoffTime: 6000 }
      },
      {
        name: 'notification',
        service: this.env.NOTIFICATION_SERVICE,
        baseUrl: '/api/notification',
        timeout: 25000,
        retryPolicy: { maxRetries: 3, backoffMultiplier: 2, maxBackoffTime: 8000 }
      }
    ]

    services.forEach(service => {
      if (service.service) {
        this.services.set(service.name, service as ServiceBinding)
      }
    })
  }

  /**
   * 发送消息到指定Worker
   */
  async sendMessage(
    targetService: string,
    endpoint: string,
    payload: any,
    options: {
      method?: string
      priority?: WorkerMessage['priority']
      timeout?: number
      retries?: number
    } = {}
  ): Promise<WorkerResponse> {
    const startTime = Date.now()
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    try {
      const service = this.services.get(targetService)
      if (!service) {
        throw new Error(`Service not found: ${targetService}`)
      }

      const message: WorkerMessage = {
        id: messageId,
        type: this.inferMessageType(endpoint),
        source: 'main-worker',
        target: targetService,
        payload,
        timestamp: new Date().toISOString(),
        priority: options.priority || 'medium',
        retryCount: 0,
        maxRetries: options.retries || service.retryPolicy.maxRetries
      }

      // 记录消息发送
      await this.logMessage(message, 'sent')

      const response = await this.executeWithRetry(
        service,
        endpoint,
        message,
        options.method || 'POST',
        options.timeout || service.timeout
      )

      const processingTime = Date.now() - startTime

      const workerResponse: WorkerResponse = {
        success: true,
        data: response,
        timestamp: new Date().toISOString(),
        processingTime
      }

      // 记录成功响应
      await this.logMessage(message, 'completed', workerResponse)

      return workerResponse

    } catch (error) {
      const processingTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      const workerResponse: WorkerResponse = {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
        processingTime
      }

      // 记录错误响应
      await this.logMessage({
        id: messageId,
        type: this.inferMessageType(endpoint),
        source: 'main-worker',
        target: targetService,
        payload,
        timestamp: new Date().toISOString(),
        priority: options.priority || 'medium',
        retryCount: 0,
        maxRetries: 0
      }, 'failed', workerResponse)

      return workerResponse
    }
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry(
    service: ServiceBinding,
    endpoint: string,
    message: WorkerMessage,
    method: string,
    timeout: number
  ): Promise<any> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= message.maxRetries; attempt++) {
      try {
        message.retryCount = attempt

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const request = new Request(`${service.baseUrl}${endpoint}`, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'X-Message-ID': message.id,
            'X-Source-Service': message.source,
            'X-Target-Service': message.target,
            'X-Priority': message.priority,
            'X-Retry-Count': attempt.toString()
          },
          body: method !== 'GET' ? JSON.stringify(message.payload) : undefined,
          signal: controller.signal
        })

        const response = await service.service.fetch(request)
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const responseData = await response.json()
        return responseData

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // 如果是最后一次尝试，直接抛出错误
        if (attempt === message.maxRetries) {
          break
        }

        // 计算退避时间
        const backoffTime = Math.min(
          service.retryPolicy.backoffMultiplier ** attempt * 1000,
          service.retryPolicy.maxBackoffTime
        )

        // 等待退避时间
        await new Promise(resolve => setTimeout(resolve, backoffTime))

        console.warn(`Retry ${attempt + 1}/${message.maxRetries} for ${service.name}${endpoint}:`, lastError.message)
      }
    }

    throw lastError
  }

  /**
   * 批量发送消息
   */
  async sendBatchMessages(
    messages: Array<{
      targetService: string
      endpoint: string
      payload: any
      options?: any
    }>
  ): Promise<WorkerResponse[]> {
    const promises = messages.map(msg =>
      this.sendMessage(msg.targetService, msg.endpoint, msg.payload, msg.options)
    )

    return Promise.all(promises)
  }

  /**
   * 发送异步消息（通过队列）
   */
  async sendAsyncMessage(
    targetService: string,
    endpoint: string,
    payload: any,
    options: {
      delay?: number
      priority?: WorkerMessage['priority']
    } = {}
  ): Promise<void> {
    const message: WorkerMessage = {
      id: `async-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: this.inferMessageType(endpoint),
      source: 'main-worker',
      target: targetService,
      payload: {
        endpoint,
        data: payload,
        options
      },
      timestamp: new Date().toISOString(),
      priority: options.priority || 'medium',
      retryCount: 0,
      maxRetries: 3
    }

    // 发送到消息队列
    await this.env.WORKER_COMMUNICATION_QUEUE.send(message, {
      delaySeconds: options.delay || 0
    })

    // 记录异步消息
    await this.logMessage(message, 'queued')
  }

  /**
   * 处理队列消息
   */
  async processQueueMessage(messageBody: WorkerMessage): Promise<void> {
    try {
      const { target, payload } = messageBody
      const { endpoint, data, options } = payload

      await this.sendMessage(target, endpoint, data, options)

      // 记录处理完成
      await this.logMessage(messageBody, 'processed')

    } catch (error) {
      console.error('Process queue message error:', error)
      
      // 记录处理失败
      await this.logMessage(messageBody, 'failed', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        processingTime: 0
      })

      throw error
    }
  }

  /**
   * 广播消息到多个服务
   */
  async broadcastMessage(
    targetServices: string[],
    endpoint: string,
    payload: any,
    options: any = {}
  ): Promise<Map<string, WorkerResponse>> {
    const results = new Map<string, WorkerResponse>()

    const promises = targetServices.map(async (service) => {
      try {
        const response = await this.sendMessage(service, endpoint, payload, options)
        results.set(service, response)
      } catch (error) {
        results.set(service, {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          processingTime: 0
        })
      }
    })

    await Promise.all(promises)
    return results
  }

  /**
   * 获取服务健康状态
   */
  async getServiceHealth(serviceName?: string): Promise<Map<string, any>> {
    const healthResults = new Map<string, any>()
    const servicesToCheck = serviceName ? [serviceName] : Array.from(this.services.keys())

    for (const service of servicesToCheck) {
      try {
        const startTime = Date.now()
        const response = await this.sendMessage(service, '/health', {}, {
          method: 'GET',
          timeout: 5000,
          retries: 1
        })
        
        healthResults.set(service, {
          status: response.success ? 'healthy' : 'unhealthy',
          responseTime: Date.now() - startTime,
          lastCheck: new Date().toISOString(),
          details: response.data
        })
      } catch (error) {
        healthResults.set(service, {
          status: 'error',
          responseTime: -1,
          lastCheck: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return healthResults
  }

  /**
   * 获取通信统计
   */
  async getCommunicationStats(): Promise<any> {
    try {
      const statsData = await this.env.KV.get('worker-communication:stats')
      return statsData ? JSON.parse(statsData) : {
        totalMessages: 0,
        successfulMessages: 0,
        failedMessages: 0,
        averageResponseTime: 0,
        serviceStats: {}
      }
    } catch (error) {
      console.error('Get communication stats error:', error)
      return null
    }
  }

  /**
   * 推断消息类型
   */
  private inferMessageType(endpoint: string): WorkerMessage['type'] {
    if (endpoint.includes('analyze')) return 'analysis_request'
    if (endpoint.includes('generate') || endpoint.includes('proposal')) return 'proposal_request'
    if (endpoint.includes('notification') || endpoint.includes('send')) return 'notification_request'
    if (endpoint.includes('status') || endpoint.includes('tracking')) return 'status_update'
    return 'data_sync'
  }

  /**
   * 记录消息日志
   */
  private async logMessage(
    message: WorkerMessage,
    status: 'sent' | 'completed' | 'failed' | 'queued' | 'processed',
    response?: WorkerResponse
  ): Promise<void> {
    try {
      const logEntry = {
        messageId: message.id,
        type: message.type,
        source: message.source,
        target: message.target,
        status,
        timestamp: new Date().toISOString(),
        priority: message.priority,
        retryCount: message.retryCount,
        response: response ? {
          success: response.success,
          processingTime: response.processingTime,
          error: response.error
        } : undefined
      }

      // 存储到KV（保留最近1000条记录）
      const logsKey = 'worker-communication:logs'
      const existingLogsData = await this.env.KV.get(logsKey)
      const existingLogs = existingLogsData ? JSON.parse(existingLogsData) : []
      
      existingLogs.unshift(logEntry)
      const trimmedLogs = existingLogs.slice(0, 1000)

      await this.env.KV.put(logsKey, JSON.stringify(trimmedLogs), {
        expirationTtl: 7 * 24 * 60 * 60 // 7天过期
      })

      // 更新统计信息
      await this.updateStats(message, status, response)

    } catch (error) {
      console.error('Log message error:', error)
    }
  }

  /**
   * 更新统计信息
   */
  private async updateStats(
    message: WorkerMessage,
    status: string,
    response?: WorkerResponse
  ): Promise<void> {
    try {
      const statsKey = 'worker-communication:stats'
      const existingStatsData = await this.env.KV.get(statsKey)
      const stats = existingStatsData ? JSON.parse(existingStatsData) : {
        totalMessages: 0,
        successfulMessages: 0,
        failedMessages: 0,
        totalResponseTime: 0,
        serviceStats: {}
      }

      if (status === 'completed' || status === 'failed') {
        stats.totalMessages++
        
        if (status === 'completed' && response?.success) {
          stats.successfulMessages++
          stats.totalResponseTime += response.processingTime
        } else {
          stats.failedMessages++
        }

        // 更新服务统计
        if (!stats.serviceStats[message.target]) {
          stats.serviceStats[message.target] = {
            totalMessages: 0,
            successfulMessages: 0,
            failedMessages: 0,
            totalResponseTime: 0
          }
        }

        const serviceStats = stats.serviceStats[message.target]
        serviceStats.totalMessages++
        
        if (status === 'completed' && response?.success) {
          serviceStats.successfulMessages++
          serviceStats.totalResponseTime += response.processingTime
        } else {
          serviceStats.failedMessages++
        }
      }

      await this.env.KV.put(statsKey, JSON.stringify(stats), {
        expirationTtl: 30 * 24 * 60 * 60 // 30天过期
      })

    } catch (error) {
      console.error('Update stats error:', error)
    }
  }
}