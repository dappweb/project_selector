import { DatabaseUtils } from '../utils/database'
import type { NewTenderInfo } from '../db/schema'
import type { Env } from '../index'

// 剑鱼标讯API响应接口
interface JianyuApiResponse {
  code: number
  message: string
  data: {
    list: JianyuTenderItem[]
    total: number
    page: number
    pageSize: number
  }
}

// 剑鱼标讯招标项目接口
interface JianyuTenderItem {
  id: string
  title: string
  content?: string
  budget?: number
  publishTime?: string
  deadline?: string
  purchaser?: string
  area?: string
  projectType?: string
  status?: string
  url?: string
}

// API限流配置
interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  retryDelay: number
  maxRetries: number
}

export class JianyuApiClient {
  private env: Env
  private baseUrl: string
  private apiKey: string
  private rateLimitConfig: RateLimitConfig
  private requestCount: number = 0
  private windowStart: number = Date.now()

  constructor(env: Env) {
    this.env = env
    this.baseUrl = env.JIANYU_API_BASE_URL || 'https://api.jianyu360.com'
    this.apiKey = env.JIANYU_API_KEY || ''
    this.rateLimitConfig = {
      maxRequests: 100, // 每分钟最大请求数
      windowMs: 60 * 1000, // 1分钟窗口
      retryDelay: 1000, // 重试延迟1秒
      maxRetries: 3 // 最大重试次数
    }
  }

  // 检查API限流
  private async checkRateLimit(): Promise<void> {
    const now = Date.now()
    
    // 重置窗口
    if (now - this.windowStart > this.rateLimitConfig.windowMs) {
      this.requestCount = 0
      this.windowStart = now
    }
    
    // 检查是否超过限制
    if (this.requestCount >= this.rateLimitConfig.maxRequests) {
      const waitTime = this.rateLimitConfig.windowMs - (now - this.windowStart)
      console.log(`Rate limit reached, waiting ${waitTime}ms...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
      
      // 重置计数器
      this.requestCount = 0
      this.windowStart = Date.now()
    }
    
    this.requestCount++
  }

  // 发送HTTP请求
  private async makeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    await this.checkRateLimit()
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      'User-Agent': 'TenderAnalysisSystem/1.0',
      ...options.headers
    }

    let lastError: Error | null = null
    
    for (let attempt = 0; attempt <= this.rateLimitConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers
        })

        if (response.ok) {
          return response
        }

        // 处理特定的HTTP错误
        if (response.status === 429) {
          // 限流错误，等待后重试
          const retryAfter = response.headers.get('Retry-After')
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.rateLimitConfig.retryDelay
          console.log(`Rate limited, retrying after ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }

        if (response.status === 401) {
          throw new Error('API authentication failed. Please check your API key.')
        }

        if (response.status >= 500) {
          // 服务器错误，可以重试
          throw new Error(`Server error: ${response.status} ${response.statusText}`)
        }

        // 客户端错误，不重试
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
        
      } catch (error) {
        lastError = error as Error
        
        if (attempt < this.rateLimitConfig.maxRetries) {
          const delay = this.rateLimitConfig.retryDelay * Math.pow(2, attempt) // 指数退避
          console.log(`Request failed, retrying in ${delay}ms... (attempt ${attempt + 1}/${this.rateLimitConfig.maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError || new Error('Request failed after all retries')
  }

  // 转换剑鱼标讯数据格式为内部格式
  private convertToTenderInfo(item: JianyuTenderItem): NewTenderInfo {
    return {
      id: item.id || DatabaseUtils.generateTenderId(),
      title: item.title || '未知项目',
      content: item.content || null,
      budget: item.budget || null,
      publishTime: item.publishTime ? new Date(item.publishTime) : null,
      deadline: item.deadline ? new Date(item.deadline) : null,
      purchaser: item.purchaser || null,
      area: item.area || null,
      projectType: item.projectType || null,
      status: this.validateStatus(item.status) ? item.status as 'ACTIVE' | 'CLOSED' | 'AWARDED' : 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  // 验证状态值
  private validateStatus(status?: string): boolean {
    return status ? ['ACTIVE', 'CLOSED', 'AWARDED'].includes(status) : false
  }

  // 获取最新招标信息
  async fetchLatestTenders(limit: number = 50): Promise<NewTenderInfo[]> {
    try {
      const url = `${this.baseUrl}/api/tenders/latest?limit=${limit}`
      const response = await this.makeRequest(url)
      const data: JianyuApiResponse = await response.json()

      if (data.code !== 200) {
        throw new Error(`API error: ${data.message}`)
      }

      return data.data.list.map(item => this.convertToTenderInfo(item))
    } catch (error) {
      console.error('Failed to fetch latest tenders:', error)
      throw error
    }
  }

  // 根据关键词搜索招标信息
  async searchTenders(keyword: string, limit: number = 50): Promise<NewTenderInfo[]> {
    try {
      const url = `${this.baseUrl}/api/tenders/search`
      const response = await this.makeRequest(url, {
        method: 'POST',
        body: JSON.stringify({
          keyword,
          limit,
          filters: {
            // 筛选软件类项目
            categories: ['软件开发', '系统集成', '平台建设', 'AI开发'],
            // 预算范围：50万-2000万
            budgetMin: 500000,
            budgetMax: 20000000,
            // 只要活跃状态的项目
            status: 'ACTIVE'
          }
        })
      })

      const data: JianyuApiResponse = await response.json()

      if (data.code !== 200) {
        throw new Error(`API error: ${data.message}`)
      }

      return data.data.list.map(item => this.convertToTenderInfo(item))
    } catch (error) {
      console.error(`Failed to search tenders with keyword "${keyword}":`, error)
      throw error
    }
  }

  // 获取指定项目的详细信息
  async getTenderDetails(tenderId: string): Promise<NewTenderInfo | null> {
    try {
      const url = `${this.baseUrl}/api/tenders/${tenderId}`
      const response = await this.makeRequest(url)
      const data: { code: number; message: string; data: JianyuTenderItem } = await response.json()

      if (data.code !== 200) {
        throw new Error(`API error: ${data.message}`)
      }

      return this.convertToTenderInfo(data.data)
    } catch (error) {
      console.error(`Failed to get tender details for ID "${tenderId}":`, error)
      return null
    }
  }

  // 批量获取招标信息
  async batchFetchTenders(tenderIds: string[]): Promise<NewTenderInfo[]> {
    const results: NewTenderInfo[] = []
    const batchSize = 10 // 每批处理10个

    for (let i = 0; i < tenderIds.length; i += batchSize) {
      const batch = tenderIds.slice(i, i + batchSize)
      const batchPromises = batch.map(id => this.getTenderDetails(id))
      
      try {
        const batchResults = await Promise.allSettled(batchPromises)
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value)
          } else {
            console.error(`Failed to fetch tender ${batch[index]}:`, 
              result.status === 'rejected' ? result.reason : 'No data returned')
          }
        })
        
        // 批次间添加延迟
        if (i + batchSize < tenderIds.length) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (error) {
        console.error(`Batch fetch error for batch starting at index ${i}:`, error)
      }
    }

    return results
  }

  // 获取API使用统计
  async getApiUsageStats(): Promise<{
    requestCount: number
    windowStart: number
    remainingRequests: number
  }> {
    const now = Date.now()
    
    // 重置窗口如果需要
    if (now - this.windowStart > this.rateLimitConfig.windowMs) {
      this.requestCount = 0
      this.windowStart = now
    }
    
    return {
      requestCount: this.requestCount,
      windowStart: this.windowStart,
      remainingRequests: Math.max(0, this.rateLimitConfig.maxRequests - this.requestCount)
    }
  }

  // 测试API连接
  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/api/health`
      const response = await this.makeRequest(url)
      return response.ok
    } catch (error) {
      console.error('API connection test failed:', error)
      return false
    }
  }
}