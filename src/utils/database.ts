import { drizzle } from 'drizzle-orm/d1'
import * as schema from '../db/schema'
import type { Env } from '../index'

// 创建数据库连接
export function createDatabase(env: Env) {
  return drizzle(env.DB, { schema })
}

// 数据库连接类型
export type Database = ReturnType<typeof createDatabase>

// 数据库工具函数
export class DatabaseUtils {
  static generateTenderId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `tender_${timestamp}_${random}`
  }

  static validateTenderId(id: string): boolean {
    return /^tender_[a-z0-9]+_[a-z0-9]+$/.test(id)
  }

  static formatTimestamp(timestamp: Date | number): number {
    if (timestamp instanceof Date) {
      return Math.floor(timestamp.getTime() / 1000)
    }
    return Math.floor(timestamp / 1000)
  }

  static parseTimestamp(timestamp: number): Date {
    return new Date(timestamp * 1000)
  }

  static validateBudgetRange(budget: number): boolean {
    return budget > 0 && budget <= 1000000000 // 最大10亿
  }

  static validateStatus(status: string): status is 'ACTIVE' | 'CLOSED' | 'AWARDED' {
    return ['ACTIVE', 'CLOSED', 'AWARDED'].includes(status)
  }

  static validateNotificationStatus(status: string): status is 'PENDING' | 'SENT' | 'FAILED' {
    return ['PENDING', 'SENT', 'FAILED'].includes(status)
  }

  static validateNotificationChannel(channel: string): boolean {
    return ['EMAIL', 'WECHAT', 'DINGTALK', 'SMS'].includes(channel)
  }

  static validateNotificationType(type: string): boolean {
    return ['DEADLINE_REMINDER', 'STATUS_UPDATE', 'ANALYSIS_COMPLETE', 'PROPOSAL_READY'].includes(type)
  }
}