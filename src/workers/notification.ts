/**
 * 通知提醒Worker
 * 创建多渠道通知Worker，使用Cloudflare Queues处理通知，集成邮件、微信、钉钉API
 */

import { Hono } from 'hono'
import { Env } from '../index'
import { NotificationService, NotificationTemplate, NotificationRecipient, NotificationRule } from '../services/notification'
import { successResponse, errorResponse } from '../utils/response'

const app = new Hono<{ Bindings: Env }>()

// 发送通知（支持模板和简单格式）
app.post('/send', async (c) => {
  try {
    const body = await c.req.json()
    
    // 检查是否是简单格式（向后兼容）
    if (body.type && body.recipient && body.subject && body.content && body.channel) {
      // 简单格式：直接发送到队列
      const queue = c.env?.NOTIFICATION_QUEUE as Queue | undefined
      if (!queue) {
        return c.json(errorResponse('通知队列未配置'), 500)
      }
      
      await queue.send({
        type: body.type,
        recipient: body.recipient,
        subject: body.subject,
        content: body.content,
        channel: body.channel,
        timestamp: new Date().toISOString()
      })
      
      return c.json(successResponse({
        message: '通知已加入发送队列',
        timestamp: new Date().toISOString()
      }, '通知发送成功'))
    }
    
    // 模板格式
    const { templateId, recipientId, variables, options } = body

    if (!templateId || !recipientId) {
      return c.json(errorResponse('模板ID和收件人ID不能为空'), 400)
    }

    const service = new NotificationService(c.env)
    const message = await service.sendNotification(templateId, recipientId, variables || {}, options || {})

    return c.json(successResponse(message, '通知发送成功'))
  } catch (error) {
    console.error('Send notification error:', error)
    return c.json(
      errorResponse(
        '发送通知失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 批量发送通知
app.post('/send/batch', async (c) => {
  try {
    const body = await c.req.json()
    const { templateId, recipientIds, variables, options } = body

    if (!templateId || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return c.json(errorResponse('模板ID和收件人ID列表不能为空'), 400)
    }

    const service = new NotificationService(c.env)
    const messages = await Promise.all(
      recipientIds.map(async (recipientId: string) => {
        try {
          return await service.sendNotification(templateId, recipientId, variables || {}, options || {})
        } catch (error) {
          console.error(`Send notification to ${recipientId} failed:`, error)
          return {
            recipientId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
    )

    const successful = messages.filter(m => !('error' in m))
    const failed = messages.filter(m => 'error' in m)

    return c.json(successResponse({
      successful: successful.length,
      failed: failed.length,
      messages,
      details: { successful, failed }
    }, `批量发送完成，成功：${successful.length}，失败：${failed.length}`))
  } catch (error) {
    console.error('Batch send notification error:', error)
    return c.json(
      errorResponse(
        '批量发送通知失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 创建通知模板
app.post('/templates', async (c) => {
  try {
    const body = await c.req.json()
    const { name, type, channels, subject, content, variables, priority } = body

    if (!name || !type || !subject || !content) {
      return c.json(errorResponse('模板名称、类型、主题和内容不能为空'), 400)
    }

    const template: NotificationTemplate = {
      id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      type,
      channels: channels || ['email'],
      subject,
      content,
      variables: variables || [],
      priority: priority || 'medium',
      enabled: true
    }

    await c.env.KV.put(
      `notification:template:${template.id}`,
      JSON.stringify(template),
      { expirationTtl: 365 * 24 * 60 * 60 }
    )

    return c.json(successResponse(template, '通知模板创建成功'))
  } catch (error) {
    console.error('Create notification template error:', error)
    return c.json(
      errorResponse(
        '创建通知模板失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取通知模板列表
app.get('/templates', async (c) => {
  try {
    const service = new NotificationService(c.env)
    const defaultTemplates = await service.getDefaultTemplates()

    // 实际实现中应该从KV存储获取用户自定义模板
    // 这里返回默认模板作为示例
    return c.json(successResponse(defaultTemplates, '获取通知模板成功'))
  } catch (error) {
    console.error('Get notification templates error:', error)
    return c.json(
      errorResponse(
        '获取通知模板失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取通知模板详情
app.get('/templates/:templateId', async (c) => {
  try {
    const templateId = c.req.param('templateId')

    if (!templateId) {
      return c.json(errorResponse('模板ID不能为空'), 400)
    }

    const templateData = await c.env.KV.get(`notification:template:${templateId}`)
    if (!templateData) {
      return c.json(errorResponse('通知模板不存在'), 404)
    }

    const template = JSON.parse(templateData)
    return c.json(successResponse(template, '获取通知模板详情成功'))
  } catch (error) {
    console.error('Get notification template error:', error)
    return c.json(
      errorResponse(
        '获取通知模板详情失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 更新通知模板
app.put('/templates/:templateId', async (c) => {
  try {
    const templateId = c.req.param('templateId')
    const body = await c.req.json()

    if (!templateId) {
      return c.json(errorResponse('模板ID不能为空'), 400)
    }

    const templateData = await c.env.KV.get(`notification:template:${templateId}`)
    if (!templateData) {
      return c.json(errorResponse('通知模板不存在'), 404)
    }

    const template = JSON.parse(templateData)
    const updatedTemplate = { ...template, ...body }

    await c.env.KV.put(
      `notification:template:${templateId}`,
      JSON.stringify(updatedTemplate),
      { expirationTtl: 365 * 24 * 60 * 60 }
    )

    return c.json(successResponse(updatedTemplate, '通知模板更新成功'))
  } catch (error) {
    console.error('Update notification template error:', error)
    return c.json(
      errorResponse(
        '更新通知模板失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 创建收件人
app.post('/recipients', async (c) => {
  try {
    const body = await c.req.json()
    const { name, email, phone, wechatId, dingtalkId, preferences } = body

    if (!name) {
      return c.json(errorResponse('收件人姓名不能为空'), 400)
    }

    const recipient: NotificationRecipient = {
      id: `recipient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      email,
      phone,
      wechatId,
      dingtalkId,
      preferences: preferences || {
        channels: ['email'],
        frequency: 'immediate'
      }
    }

    await c.env.KV.put(
      `notification:recipient:${recipient.id}`,
      JSON.stringify(recipient),
      { expirationTtl: 365 * 24 * 60 * 60 }
    )

    return c.json(successResponse(recipient, '收件人创建成功'))
  } catch (error) {
    console.error('Create notification recipient error:', error)
    return c.json(
      errorResponse(
        '创建收件人失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取收件人详情
app.get('/recipients/:recipientId', async (c) => {
  try {
    const recipientId = c.req.param('recipientId')

    if (!recipientId) {
      return c.json(errorResponse('收件人ID不能为空'), 400)
    }

    const recipientData = await c.env.KV.get(`notification:recipient:${recipientId}`)
    if (!recipientData) {
      return c.json(errorResponse('收件人不存在'), 404)
    }

    const recipient = JSON.parse(recipientData)
    return c.json(successResponse(recipient, '获取收件人详情成功'))
  } catch (error) {
    console.error('Get notification recipient error:', error)
    return c.json(
      errorResponse(
        '获取收件人详情失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 更新收件人
app.put('/recipients/:recipientId', async (c) => {
  try {
    const recipientId = c.req.param('recipientId')
    const body = await c.req.json()

    if (!recipientId) {
      return c.json(errorResponse('收件人ID不能为空'), 400)
    }

    const recipientData = await c.env.KV.get(`notification:recipient:${recipientId}`)
    if (!recipientData) {
      return c.json(errorResponse('收件人不存在'), 404)
    }

    const recipient = JSON.parse(recipientData)
    const updatedRecipient = { ...recipient, ...body }

    await c.env.KV.put(
      `notification:recipient:${recipientId}`,
      JSON.stringify(updatedRecipient),
      { expirationTtl: 365 * 24 * 60 * 60 }
    )

    return c.json(successResponse(updatedRecipient, '收件人更新成功'))
  } catch (error) {
    console.error('Update notification recipient error:', error)
    return c.json(
      errorResponse(
        '更新收件人失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 创建通知规则
app.post('/rules', async (c) => {
  try {
    const body = await c.req.json()
    const { name, description, trigger, templateId, recipients } = body

    if (!name || !trigger || !templateId) {
      return c.json(errorResponse('规则名称、触发条件和模板ID不能为空'), 400)
    }

    const service = new NotificationService(c.env)
    const rule = await service.createNotificationRule({
      name,
      description: description || '',
      trigger,
      templateId,
      recipients: recipients || [],
      enabled: true
    })

    return c.json(successResponse(rule, '通知规则创建成功'))
  } catch (error) {
    console.error('Create notification rule error:', error)
    return c.json(
      errorResponse(
        '创建通知规则失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 触发通知规则
app.post('/trigger', async (c) => {
  try {
    const body = await c.req.json()
    const { triggerType, context } = body

    if (!triggerType || !context) {
      return c.json(errorResponse('触发类型和上下文不能为空'), 400)
    }

    const service = new NotificationService(c.env)
    await service.triggerNotificationRules(triggerType, context)

    return c.json(successResponse(null, '通知规则触发成功'))
  } catch (error) {
    console.error('Trigger notification rules error:', error)
    return c.json(
      errorResponse(
        '触发通知规则失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取通知历史
app.get('/history', async (c) => {
  try {
    const { recipientId, projectId, status, limit = '50' } = c.req.query()

    // 这里应该从KV存储查询通知历史
    // 由于KV存储的限制，这里提供一个模拟实现
    const mockHistory = [
      {
        id: 'notification-1',
        templateId: 'project_status_change',
        recipientId: recipientId || 'recipient-1',
        projectId: projectId || 'project-1',
        subject: '项目状态变更：AI智能客服系统',
        status: 'sent',
        sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        channels: ['email', 'wechat']
      },
      {
        id: 'notification-2',
        templateId: 'deadline_reminder',
        recipientId: recipientId || 'recipient-1',
        projectId: projectId || 'project-2',
        subject: '截止日期提醒：智慧城市数据平台',
        status: 'sent',
        sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        channels: ['email']
      }
    ]

    const filteredHistory = status ? mockHistory.filter(h => h.status === status) : mockHistory
    const limitedHistory = filteredHistory.slice(0, parseInt(limit))

    return c.json(successResponse({
      history: limitedHistory,
      total: filteredHistory.length
    }, '获取通知历史成功'))
  } catch (error) {
    console.error('Get notification history error:', error)
    return c.json(
      errorResponse(
        '获取通知历史失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取通知统计
app.get('/statistics', async (c) => {
  try {
    const { startDate, endDate } = c.req.query()

    // 这里应该从KV存储统计通知数据
    // 由于KV存储的限制，这里提供一个模拟实现
    const statistics = {
      totalSent: 1250,
      totalFailed: 45,
      successRate: 96.4,
      channelStats: {
        email: { sent: 800, failed: 20 },
        wechat: { sent: 350, failed: 15 },
        dingtalk: { sent: 100, failed: 10 }
      },
      templateStats: {
        project_status_change: { sent: 450, failed: 15 },
        deadline_reminder: { sent: 380, failed: 12 },
        analysis_complete: { sent: 420, failed: 18 }
      },
      dailyStats: [
        { date: '2024-12-29', sent: 85, failed: 3 },
        { date: '2024-12-30', sent: 92, failed: 2 },
        { date: '2024-12-31', sent: 78, failed: 1 }
      ]
    }

    return c.json(successResponse(statistics, '获取通知统计成功'))
  } catch (error) {
    console.error('Get notification statistics error:', error)
    return c.json(
      errorResponse(
        '获取通知统计失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 测试通知发送
app.post('/test', async (c) => {
  try {
    const body = await c.req.json()
    const { channel, recipient, subject, content } = body

    if (!channel || !recipient || !content) {
      return c.json(errorResponse('渠道、收件人和内容不能为空'), 400)
    }

    // 创建测试通知
    const testMessage = {
      id: `test-${Date.now()}`,
      subject: subject || '测试通知',
      content,
      channels: [channel],
      priority: 'low' as const,
      scheduledAt: new Date().toISOString(),
      status: 'pending' as const,
      attempts: 0
    }

    // 模拟发送
    console.log(`Test notification sent via ${channel}:`, testMessage)

    return c.json(successResponse({
      messageId: testMessage.id,
      channel,
      recipient,
      status: 'sent',
      sentAt: new Date().toISOString()
    }, '测试通知发送成功'))
  } catch (error) {
    console.error('Test notification error:', error)
    return c.json(
      errorResponse(
        '测试通知发送失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

export default app