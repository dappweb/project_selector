/**
 * 项目跟踪Worker
 * 实现项目状态监控、时间线记录功能、使用KV存储状态数据
 */

import { Hono } from 'hono'
import { Env } from '../index'
import { ProjectTrackingService } from '../services/project-tracking'
import { successResponse, errorResponse } from '../utils/response'

const app = new Hono<{ Bindings: Env }>()

// 更新项目状态
app.put('/status/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId')
    const body = await c.req.json()
    const { status, reason, userId, userName } = body

    if (!projectId || !status) {
      return c.json(errorResponse('项目ID和状态不能为空'), 400)
    }

    const validStatuses = ['pending', 'active', 'in_progress', 'completed', 'cancelled', 'on_hold']
    if (!validStatuses.includes(status)) {
      return c.json(errorResponse('无效的项目状态'), 400)
    }

    const service = new ProjectTrackingService(c.env)
    const statusUpdate = await service.updateProjectStatus(projectId, status, reason, userId, userName)

    return c.json(successResponse(statusUpdate, '项目状态更新成功'))
  } catch (error) {
    console.error('Update project status error:', error)
    return c.json(
      errorResponse(
        '更新项目状态失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取项目状态
app.get('/status/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId')

    if (!projectId) {
      return c.json(errorResponse('项目ID不能为空'), 400)
    }

    const service = new ProjectTrackingService(c.env)
    const status = await service.getProjectStatus(projectId)

    if (!status) {
      return c.json(errorResponse('项目状态不存在'), 404)
    }

    return c.json(successResponse(status, '获取项目状态成功'))
  } catch (error) {
    console.error('Get project status error:', error)
    return c.json(
      errorResponse(
        '获取项目状态失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 添加时间线事件
app.post('/timeline/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId')
    const body = await c.req.json()
    const { eventType, title, description, userId, userName, importance, metadata } = body

    if (!projectId || !eventType || !title) {
      return c.json(errorResponse('项目ID、事件类型和标题不能为空'), 400)
    }

    const validEventTypes = ['status_change', 'milestone', 'deadline', 'analysis', 'proposal', 'notification', 'comment']
    if (!validEventTypes.includes(eventType)) {
      return c.json(errorResponse('无效的事件类型'), 400)
    }

    const service = new ProjectTrackingService(c.env)
    const timelineEvent = await service.addTimelineEvent({
      projectId,
      eventType,
      title,
      description,
      userId,
      userName,
      importance: importance || 'medium',
      metadata
    })

    return c.json(successResponse(timelineEvent, '时间线事件添加成功'))
  } catch (error) {
    console.error('Add timeline event error:', error)
    return c.json(
      errorResponse(
        '添加时间线事件失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取项目时间线
app.get('/timeline/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId')
    const { limit } = c.req.query()

    if (!projectId) {
      return c.json(errorResponse('项目ID不能为空'), 400)
    }

    const service = new ProjectTrackingService(c.env)
    const timeline = await service.getProjectTimeline(projectId, limit ? parseInt(limit) : 50)

    return c.json(successResponse(timeline, '获取项目时间线成功'))
  } catch (error) {
    console.error('Get project timeline error:', error)
    return c.json(
      errorResponse(
        '获取项目时间线失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 创建里程碑
app.post('/milestones/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId')
    const body = await c.req.json()
    const { title, description, targetDate, assignee, priority } = body

    if (!projectId || !title || !targetDate) {
      return c.json(errorResponse('项目ID、标题和目标日期不能为空'), 400)
    }

    const service = new ProjectTrackingService(c.env)
    const milestone = await service.createMilestone({
      projectId,
      title,
      description,
      targetDate,
      status: 'pending',
      progress: 0,
      assignee,
      priority: priority || 'medium'
    })

    return c.json(successResponse(milestone, '里程碑创建成功'))
  } catch (error) {
    console.error('Create milestone error:', error)
    return c.json(
      errorResponse(
        '创建里程碑失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 更新里程碑
app.put('/milestones/:projectId/:milestoneId', async (c) => {
  try {
    const projectId = c.req.param('projectId')
    const milestoneId = c.req.param('milestoneId')
    const body = await c.req.json()

    if (!projectId || !milestoneId) {
      return c.json(errorResponse('项目ID和里程碑ID不能为空'), 400)
    }

    const service = new ProjectTrackingService(c.env)
    const updatedMilestone = await service.updateMilestone(projectId, milestoneId, body)

    if (!updatedMilestone) {
      return c.json(errorResponse('里程碑不存在'), 404)
    }

    return c.json(successResponse(updatedMilestone, '里程碑更新成功'))
  } catch (error) {
    console.error('Update milestone error:', error)
    return c.json(
      errorResponse(
        '更新里程碑失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取项目里程碑
app.get('/milestones/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId')

    if (!projectId) {
      return c.json(errorResponse('项目ID不能为空'), 400)
    }

    const service = new ProjectTrackingService(c.env)
    const milestones = await service.getProjectMilestones(projectId)

    return c.json(successResponse(milestones, '获取项目里程碑成功'))
  } catch (error) {
    console.error('Get project milestones error:', error)
    return c.json(
      errorResponse(
        '获取项目里程碑失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 创建警报
app.post('/alerts/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId')
    const body = await c.req.json()
    const { type, title, message, severity } = body

    if (!projectId || !type || !title || !message) {
      return c.json(errorResponse('项目ID、类型、标题和消息不能为空'), 400)
    }

    const validTypes = ['deadline_approaching', 'status_change', 'milestone_overdue', 'analysis_complete', 'proposal_ready']
    if (!validTypes.includes(type)) {
      return c.json(errorResponse('无效的警报类型'), 400)
    }

    const service = new ProjectTrackingService(c.env)
    const alert = await service.createAlert({
      projectId,
      type,
      title,
      message,
      severity: severity || 'info'
    })

    return c.json(successResponse(alert, '警报创建成功'))
  } catch (error) {
    console.error('Create alert error:', error)
    return c.json(
      errorResponse(
        '创建警报失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取项目警报
app.get('/alerts/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId')
    const { unacknowledged } = c.req.query()

    if (!projectId) {
      return c.json(errorResponse('项目ID不能为空'), 400)
    }

    const service = new ProjectTrackingService(c.env)
    const alerts = await service.getProjectAlerts(projectId, unacknowledged === 'true')

    return c.json(successResponse(alerts, '获取项目警报成功'))
  } catch (error) {
    console.error('Get project alerts error:', error)
    return c.json(
      errorResponse(
        '获取项目警报失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 确认警报
app.put('/alerts/:projectId/:alertId/acknowledge', async (c) => {
  try {
    const projectId = c.req.param('projectId')
    const alertId = c.req.param('alertId')
    const body = await c.req.json()
    const { userId } = body

    if (!projectId || !alertId) {
      return c.json(errorResponse('项目ID和警报ID不能为空'), 400)
    }

    const service = new ProjectTrackingService(c.env)
    const success = await service.acknowledgeAlert(projectId, alertId, userId)

    if (!success) {
      return c.json(errorResponse('警报不存在'), 404)
    }

    return c.json(successResponse(null, '警报确认成功'))
  } catch (error) {
    console.error('Acknowledge alert error:', error)
    return c.json(
      errorResponse(
        '确认警报失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取项目指标
app.get('/metrics/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId')

    if (!projectId) {
      return c.json(errorResponse('项目ID不能为空'), 400)
    }

    const service = new ProjectTrackingService(c.env)
    const metrics = await service.getProjectMetrics(projectId)

    return c.json(successResponse(metrics, '获取项目指标成功'))
  } catch (error) {
    console.error('Get project metrics error:', error)
    return c.json(
      errorResponse(
        '获取项目指标失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 批量获取项目状态
app.post('/status/batch', async (c) => {
  try {
    const body = await c.req.json()
    const { projectIds } = body

    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      return c.json(errorResponse('项目ID列表不能为空'), 400)
    }

    const service = new ProjectTrackingService(c.env)
    const statuses = await Promise.all(
      projectIds.map(async (projectId: string) => {
        const status = await service.getProjectStatus(projectId)
        return { projectId, status }
      })
    )

    return c.json(successResponse(statuses, '批量获取项目状态成功'))
  } catch (error) {
    console.error('Batch get project status error:', error)
    return c.json(
      errorResponse(
        '批量获取项目状态失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取项目活动摘要
app.get('/summary/:projectId', async (c) => {
  try {
    const projectId = c.req.param('projectId')

    if (!projectId) {
      return c.json(errorResponse('项目ID不能为空'), 400)
    }

    const service = new ProjectTrackingService(c.env)
    const [status, timeline, milestones, alerts, metrics] = await Promise.all([
      service.getProjectStatus(projectId),
      service.getProjectTimeline(projectId, 10),
      service.getProjectMilestones(projectId),
      service.getProjectAlerts(projectId, true), // 只获取未确认的警报
      service.getProjectMetrics(projectId)
    ])

    const summary = {
      projectId,
      currentStatus: status,
      recentActivity: timeline,
      upcomingMilestones: milestones.filter(m => m.status === 'pending' || m.status === 'in_progress').slice(0, 5),
      unacknowledgedAlerts: alerts,
      metrics
    }

    return c.json(successResponse(summary, '获取项目活动摘要成功'))
  } catch (error) {
    console.error('Get project summary error:', error)
    return c.json(
      errorResponse(
        '获取项目活动摘要失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

export default app