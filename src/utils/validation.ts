// 验证工具函数

// 验证招标ID格式
export function validateTenderId(id: string): boolean {
  if (!id || typeof id !== 'string') return false
  return /^[a-zA-Z0-9_-]+$/.test(id) && id.length > 0 && id.length <= 100
}

// 验证邮箱格式
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// 验证预算范围
export function validateBudget(budget: number): boolean {
  return typeof budget === 'number' && budget > 0 && budget <= 1000000000
}

// 验证分页参数
export function validatePagination(page?: number, pageSize?: number): {
  page: number
  pageSize: number
} {
  const validPage = Math.max(1, Math.floor(Number(page) || 1))
  const validPageSize = Math.min(100, Math.max(1, Math.floor(Number(pageSize) || 20)))
  
  return {
    page: validPage,
    pageSize: validPageSize
  }
}

// 验证日期范围
export function validateDateRange(startDate?: string, endDate?: string): {
  startDate?: Date
  endDate?: Date
  isValid: boolean
} {
  let start: Date | undefined
  let end: Date | undefined
  let isValid = true

  if (startDate) {
    start = new Date(startDate)
    if (isNaN(start.getTime())) {
      isValid = false
    }
  }

  if (endDate) {
    end = new Date(endDate)
    if (isNaN(end.getTime())) {
      isValid = false
    }
  }

  if (start && end && start > end) {
    isValid = false
  }

  return {
    startDate: start,
    endDate: end,
    isValid
  }
}

// 验证关键词数组
export function validateKeywords(keywords: any): string[] {
  if (!Array.isArray(keywords)) return []
  
  return keywords
    .filter(k => typeof k === 'string' && k.trim().length > 0)
    .map(k => k.trim())
    .slice(0, 20) // 最多20个关键词
}

// 验证项目状态
export function validateProjectStatus(status: string): status is 'ACTIVE' | 'CLOSED' | 'AWARDED' {
  return ['ACTIVE', 'CLOSED', 'AWARDED'].includes(status)
}

// 验证通知类型
export function validateNotificationType(type: string): boolean {
  return ['DEADLINE_REMINDER', 'STATUS_UPDATE', 'ANALYSIS_COMPLETE', 'PROPOSAL_READY'].includes(type)
}

// 验证通知渠道
export function validateNotificationChannel(channel: string): boolean {
  return ['EMAIL', 'WECHAT', 'DINGTALK', 'SMS'].includes(channel)
}

// 清理和验证文本输入
export function sanitizeText(text: string, maxLength: number = 1000): string {
  if (!text || typeof text !== 'string') return ''
  
  return text
    .trim()
    .replace(/\s+/g, ' ') // 合并多个空格
    .substring(0, maxLength)
}

// 验证分数范围
export function validateScore(score: number): boolean {
  return typeof score === 'number' && score >= 0 && score <= 100
}

// 验证置信度
export function validateConfidence(confidence: number): boolean {
  return typeof confidence === 'number' && confidence >= 0 && confidence <= 100
}