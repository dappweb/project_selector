/**
 * 通知提醒服务
 * 创建多渠道通知Worker，使用Cloudflare Queues处理通知，集成邮件、微信、钉钉API
 */

import { Env } from '../index'

export interface NotificationChannel {
  type: 'email' | 'wechat' | 'dingtalk' | 'sms' | 'webhook'
  config: Record<string, any>
  enabled: boolean
}

export interface NotificationTemplate {
  id: string
  name: string
  type: 'project_status' | 'deadline_reminder' | 'milestone_complete' | 'analysis_ready' | 'proposal_generated' | 'system_alert'
  channels: NotificationChannel['type'][]
  subject: string
  content: string
  variables: string[]
  priority: 'low' | 'medium' | 'high' | 'urgent'
  enabled: boolean
}

export interface NotificationRecipient {
  id: string
  name: string
  email?: string
  phone?: string
  wechatId?: string
  dingtalkId?: string
  preferences: {
    channels: NotificationChannel['type'][]
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
    quietHours?: {
      start: string
      end: string
    }
  }
}

export interface NotificationMessage {
  id: string
  templateId: string
  recipientId: string
  projectId?: string
  channels: NotificationChannel['type'][]
  subject: string
  content: string
  variables: Record<string, any>
  priority: 'low' | 'medium' | 'high' | 'urgent'
  scheduledAt: string
  sentAt?: string
  status: 'pending' | 'sent' | 'failed' | 'cancelled'
  attempts: number
  lastError?: string
  metadata?: Record<string, any>
}

export interface NotificationRule {
  id: string
  name: string
  description: string
  trigger: {
    type: 'project_status_change' | 'deadline_approaching' | 'milestone_overdue' | 'analysis_complete' | 'scheduled'
    conditions: Record<string, any>
  }
  templateId: string
  recipients: string[]
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export class NotificationService {
  constructor(private env: Env) {}

  /**
   * 发送通知
   */
  async sendNotification(
    templateId: string,
    recipientId: string,
    variables: Record<string, any> = {},
    options: {
      projectId?: string
      priority?: NotificationMessage['priority']
      scheduledAt?: string
      channels?: NotificationChannel['type'][]
    } = {}
  ): Promise<NotificationMessage> {
    try {
      // 获取模板和收件人信息
      const [template, recipient] = await Promise.all([
        this.getTemplate(templateId),
        this.getRecipient(recipientId)
      ])

      if (!template) {
        throw new Error(`通知模板不存在: ${templateId}`)
      }

      if (!recipient) {
        throw new Error(`收件人不存在: ${recipientId}`)
      }

      // 确定发送渠道
      const channels = options.channels || 
        template.channels.filter(c => recipient.preferences.channels.includes(c))

      if (channels.length === 0) {
        throw new Error('没有可用的通知渠道')
      }

      // 渲染消息内容
      const renderedContent = this.renderTemplate(template.content, variables)
      const renderedSubject = this.renderTemplate(template.subject, variables)

      // 创建通知消息
      const message: NotificationMessage = {
        id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        templateId,
        recipientId,
        projectId: options.projectId,
        channels,
        subject: renderedSubject,
        content: renderedContent,
        variables,
        priority: options.priority || template.priority,
        scheduledAt: options.scheduledAt || new Date().toISOString(),
        status: 'pending',
        attempts: 0,
        metadata: {
          templateName: template.name,
          recipientName: recipient.name
        }
      }

      // 检查静默时间
      if (this.isInQuietHours(recipient, message.scheduledAt)) {
        message.scheduledAt = this.getNextAvailableTime(recipient, message.scheduledAt)
      }

      // 保存消息到KV存储
      await this.env.KV.put(
        `notification:message:${message.id}`,
        JSON.stringify(message),
        { expirationTtl: 30 * 24 * 60 * 60 } // 30天过期
      )

      // 发送到队列
      await this.env.NOTIFICATION_QUEUE.send({
        messageId: message.id,
        action: 'send',
        scheduledAt: message.scheduledAt
      })

      return message
    } catch (error) {
      console.error('Send notification error:', error)
      throw new Error(`发送通知失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 处理队列消息
   */
  async processQueueMessage(messageBody: any): Promise<void> {
    try {
      const { messageId, action } = messageBody

      if (action === 'send') {
        await this.deliverNotification(messageId)
      }
    } catch (error) {
      console.error('Process queue message error:', error)
      throw error
    }
  }

  /**
   * 投递通知
   */
  private async deliverNotification(messageId: string): Promise<void> {
    try {
      // 获取消息
      const messageData = await this.env.KV.get(`notification:message:${messageId}`)
      if (!messageData) {
        console.error(`Notification message not found: ${messageId}`)
        return
      }

      const message: NotificationMessage = JSON.parse(messageData)

      // 检查是否到了发送时间
      if (new Date(message.scheduledAt) > new Date()) {
        // 重新排队
        await this.env.NOTIFICATION_QUEUE.send({
          messageId,
          action: 'send',
          scheduledAt: message.scheduledAt
        })
        return
      }

      // 获取收件人信息
      const recipient = await this.getRecipient(message.recipientId)
      if (!recipient) {
        message.status = 'failed'
        message.lastError = '收件人不存在'
        await this.updateMessage(message)
        return
      }

      // 尝试发送到各个渠道
      let success = false
      const errors: string[] = []

      for (const channel of message.channels) {
        try {
          await this.sendToChannel(channel, message, recipient)
          success = true
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          errors.push(`${channel}: ${errorMsg}`)
          console.error(`Send to ${channel} failed:`, error)
        }
      }

      // 更新消息状态
      message.attempts += 1
      message.sentAt = new Date().toISOString()

      if (success) {
        message.status = 'sent'
      } else {
        message.status = 'failed'
        message.lastError = errors.join('; ')

        // 如果尝试次数少于3次，重新排队
        if (message.attempts < 3) {
          const retryDelay = Math.pow(2, message.attempts) * 60 * 1000 // 指数退避
          const retryTime = new Date(Date.now() + retryDelay).toISOString()
          
          await this.env.NOTIFICATION_QUEUE.send({
            messageId,
            action: 'send',
            scheduledAt: retryTime
          })
        }
      }

      await this.updateMessage(message)
    } catch (error) {
      console.error('Deliver notification error:', error)
    }
  }

  /**
   * 发送到指定渠道
   */
  private async sendToChannel(
    channel: NotificationChannel['type'],
    message: NotificationMessage,
    recipient: NotificationRecipient
  ): Promise<void> {
    switch (channel) {
      case 'email':
        await this.sendEmail(message, recipient)
        break
      case 'wechat':
        await this.sendWechat(message, recipient)
        break
      case 'dingtalk':
        await this.sendDingtalk(message, recipient)
        break
      case 'sms':
        await this.sendSMS(message, recipient)
        break
      case 'webhook':
        await this.sendWebhook(message, recipient)
        break
      default:
        throw new Error(`不支持的通知渠道: ${channel}`)
    }
  }

  /**
   * 发送邮件
   */
  private async sendEmail(message: NotificationMessage, recipient: NotificationRecipient): Promise<void> {
    if (!recipient.email) {
      throw new Error('收件人邮箱地址为空')
    }

    // 这里应该集成实际的邮件服务，如SendGrid、AWS SES等
    // 由于Cloudflare Workers的限制，这里提供一个模拟实现
    console.log(`Sending email to ${recipient.email}:`, {
      subject: message.subject,
      content: message.content
    })

    // 模拟邮件发送
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  /**
   * 发送微信消息
   */
  private async sendWechat(message: NotificationMessage, recipient: NotificationRecipient): Promise<void> {
    if (!recipient.wechatId) {
      throw new Error('收件人微信ID为空')
    }

    // 这里应该集成微信企业号或服务号API
    console.log(`Sending WeChat message to ${recipient.wechatId}:`, {
      content: message.content
    })

    // 模拟微信发送
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  /**
   * 发送钉钉消息
   */
  private async sendDingtalk(message: NotificationMessage, recipient: NotificationRecipient): Promise<void> {
    if (!recipient.dingtalkId) {
      throw new Error('收件人钉钉ID为空')
    }

    // 这里应该集成钉钉机器人或工作通知API
    console.log(`Sending DingTalk message to ${recipient.dingtalkId}:`, {
      content: message.content
    })

    // 模拟钉钉发送
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  /**
   * 发送短信
   */
  private async sendSMS(message: NotificationMessage, recipient: NotificationRecipient): Promise<void> {
    if (!recipient.phone) {
      throw new Error('收件人手机号为空')
    }

    // 这里应该集成短信服务，如阿里云短信、腾讯云短信等
    console.log(`Sending SMS to ${recipient.phone}:`, {
      content: message.content
    })

    // 模拟短信发送
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  /**
   * 发送Webhook
   */
  private async sendWebhook(message: NotificationMessage, recipient: NotificationRecipient): Promise<void> {
    // 这里应该发送HTTP请求到指定的Webhook URL
    console.log(`Sending webhook notification:`, {
      recipient: recipient.id,
      message: message.content
    })

    // 模拟Webhook发送
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  /**
   * 创建通知规则
   */
  async createNotificationRule(rule: Omit<NotificationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationRule> {
    try {
      const newRule: NotificationRule = {
        ...rule,
        id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await this.env.KV.put(
        `notification:rule:${newRule.id}`,
        JSON.stringify(newRule),
        { expirationTtl: 365 * 24 * 60 * 60 } // 1年过期
      )

      return newRule
    } catch (error) {
      console.error('Create notification rule error:', error)
      throw new Error(`创建通知规则失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 触发通知规则
   */
  async triggerNotificationRules(
    triggerType: NotificationRule['trigger']['type'],
    context: Record<string, any>
  ): Promise<void> {
    try {
      // 这里应该查询所有匹配的规则
      // 由于KV存储的限制，这里提供一个简化的实现
      console.log(`Triggering notification rules for ${triggerType}:`, context)

      // 实际实现中，可以维护一个规则索引，或者使用其他存储方案
    } catch (error) {
      console.error('Trigger notification rules error:', error)
    }
  }

  /**
   * 获取通知模板
   */
  private async getTemplate(templateId: string): Promise<NotificationTemplate | null> {
    try {
      const templateData = await this.env.KV.get(`notification:template:${templateId}`)
      return templateData ? JSON.parse(templateData) : null
    } catch (error) {
      console.error('Get template error:', error)
      return null
    }
  }

  /**
   * 获取收件人信息
   */
  private async getRecipient(recipientId: string): Promise<NotificationRecipient | null> {
    try {
      const recipientData = await this.env.KV.get(`notification:recipient:${recipientId}`)
      return recipientData ? JSON.parse(recipientData) : null
    } catch (error) {
      console.error('Get recipient error:', error)
      return null
    }
  }

  /**
   * 渲染模板
   */
  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template
    
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g')
      rendered = rendered.replace(regex, String(value))
    }
    
    return rendered
  }

  /**
   * 检查是否在静默时间
   */
  private isInQuietHours(recipient: NotificationRecipient, scheduledAt: string): boolean {
    if (!recipient.preferences.quietHours) {
      return false
    }

    const scheduledTime = new Date(scheduledAt)
    const hour = scheduledTime.getHours()
    const minute = scheduledTime.getMinutes()
    const currentTime = hour * 60 + minute

    const { start, end } = recipient.preferences.quietHours
    const [startHour, startMinute] = start.split(':').map(Number)
    const [endHour, endMinute] = end.split(':').map(Number)
    const startTime = startHour * 60 + startMinute
    const endTime = endHour * 60 + endMinute

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime
    } else {
      // 跨天的情况
      return currentTime >= startTime || currentTime <= endTime
    }
  }

  /**
   * 获取下一个可用时间
   */
  private getNextAvailableTime(recipient: NotificationRecipient, scheduledAt: string): string {
    if (!recipient.preferences.quietHours) {
      return scheduledAt
    }

    const scheduledTime = new Date(scheduledAt)
    const { end } = recipient.preferences.quietHours
    const [endHour, endMinute] = end.split(':').map(Number)

    const nextAvailable = new Date(scheduledTime)
    nextAvailable.setHours(endHour, endMinute, 0, 0)

    // 如果结束时间已过，设置为明天
    if (nextAvailable <= scheduledTime) {
      nextAvailable.setDate(nextAvailable.getDate() + 1)
    }

    return nextAvailable.toISOString()
  }

  /**
   * 更新消息状态
   */
  private async updateMessage(message: NotificationMessage): Promise<void> {
    try {
      await this.env.KV.put(
        `notification:message:${message.id}`,
        JSON.stringify(message),
        { expirationTtl: 30 * 24 * 60 * 60 }
      )
    } catch (error) {
      console.error('Update message error:', error)
    }
  }

  /**
   * 获取默认通知模板
   */
  async getDefaultTemplates(): Promise<NotificationTemplate[]> {
    return [
      {
        id: 'project_status_change',
        name: '项目状态变更通知',
        type: 'project_status',
        channels: ['email', 'wechat'],
        subject: '项目状态变更：{{projectTitle}}',
        content: '您好，{{recipientName}}！\n\n项目"{{projectTitle}}"的状态已从"{{oldStatus}}"变更为"{{newStatus}}"。\n\n变更时间：{{changeTime}}\n变更原因：{{reason}}\n\n请及时关注项目进展。',
        variables: ['recipientName', 'projectTitle', 'oldStatus', 'newStatus', 'changeTime', 'reason'],
        priority: 'medium',
        enabled: true
      },
      {
        id: 'deadline_reminder',
        name: '截止日期提醒',
        type: 'deadline_reminder',
        channels: ['email', 'wechat', 'dingtalk'],
        subject: '截止日期提醒：{{projectTitle}}',
        content: '您好，{{recipientName}}！\n\n项目"{{projectTitle}}"即将到达截止日期。\n\n截止时间：{{deadline}}\n剩余时间：{{remainingTime}}\n\n请及时完成相关工作。',
        variables: ['recipientName', 'projectTitle', 'deadline', 'remainingTime'],
        priority: 'high',
        enabled: true
      },
      {
        id: 'analysis_complete',
        name: 'AI分析完成通知',
        type: 'analysis_ready',
        channels: ['email', 'wechat'],
        subject: 'AI分析完成：{{projectTitle}}',
        content: '您好，{{recipientName}}！\n\n项目"{{projectTitle}}"的AI分析已完成。\n\n分析得分：{{score}}\n分类结果：{{category}}\n建议等级：{{recommendation}}\n\n请查看详细分析报告。',
        variables: ['recipientName', 'projectTitle', 'score', 'category', 'recommendation'],
        priority: 'medium',
        enabled: true
      }
    ]
  }
}