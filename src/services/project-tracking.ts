/**
 * 项目跟踪服务
 * 实现项目状态监控、时间线记录功能、使用KV存储状态数据
 */

import { Env } from '../index'

export interface ProjectStatus {
  id: string
  projectId: string
  status: 'pending' | 'active' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  previousStatus?: string
  updatedAt: string
  updatedBy?: string
  reason?: string
  metadata?: Record<string, any>
}

export interface ProjectTimeline {
  id: string
  projectId: string
  eventType: 'status_change' | 'milestone' | 'deadline' | 'analysis' | 'proposal' | 'notification' | 'comment'
  title: string
  description?: string
  timestamp: string
  userId?: string
  userName?: string
  metadata?: Record<string, any>
  importance: 'low' | 'medium' | 'high' | 'critical'
}

export interface ProjectMilestone {
  id: string
  projectId: string
  title: string
  description?: string
  targetDate: string
  completedDate?: string
  status: 'pending' | 'in_progress' | 'completed' | 'overdue'
  progress: number
  assignee?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface ProjectAlert {
  id: string
  projectId: string
  type: 'deadline_approaching' | 'status_change' | 'milestone_overdue' | 'analysis_complete' | 'proposal_ready'
  title: string
  message: string
  severity: 'info' | 'warning' | 'error' | 'success'
  createdAt: string
  acknowledged: boolean
  acknowledgedAt?: string
  acknowledgedBy?: string
}

export interface ProjectMetrics {
  projectId: string
  totalEvents: number
  statusChanges: number
  milestonesCompleted: number
  milestonesOverdue: number
  averageResponseTime: number
  lastActivity: string
  healthScore: number
  riskLevel: 'low' | 'medium' | 'high'
}

export class ProjectTrackingService {
  constructor(private env: Env) {}

  /**
   * 更新项目状态
   */
  async updateProjectStatus(
    projectId: string,
    newStatus: ProjectStatus['status'],
    reason?: string,
    userId?: string,
    userName?: string
  ): Promise<ProjectStatus> {
    try {
      // 获取当前状态
      const currentStatusData = await this.env.KV.get(`project:status:${projectId}`)
      const currentStatus = currentStatusData ? JSON.parse(currentStatusData) : null

      // 创建新状态记录
      const statusUpdate: ProjectStatus = {
        id: `status-${Date.now()}`,
        projectId,
        status: newStatus,
        previousStatus: currentStatus?.status,
        updatedAt: new Date().toISOString(),
        updatedBy: userId,
        reason,
        metadata: {
          userName,
          source: 'manual'
        }
      }

      // 保存状态到KV
      await this.env.KV.put(
        `project:status:${projectId}`,
        JSON.stringify(statusUpdate),
        { expirationTtl: 365 * 24 * 60 * 60 } // 1年过期
      )

      // 记录时间线事件
      await this.addTimelineEvent({
        projectId,
        eventType: 'status_change',
        title: `项目状态变更为：${this.getStatusLabel(newStatus)}`,
        description: reason || `项目状态从 ${this.getStatusLabel(currentStatus?.status)} 变更为 ${this.getStatusLabel(newStatus)}`,
        userId,
        userName,
        importance: 'medium',
        metadata: {
          previousStatus: currentStatus?.status,
          newStatus,
          reason
        }
      })

      // 生成状态变更警报
      if (this.shouldGenerateAlert(currentStatus?.status, newStatus)) {
        await this.createAlert({
          projectId,
          type: 'status_change',
          title: '项目状态变更',
          message: `项目状态已从 ${this.getStatusLabel(currentStatus?.status)} 变更为 ${this.getStatusLabel(newStatus)}`,
          severity: this.getAlertSeverity(newStatus)
        })
      }

      return statusUpdate
    } catch (error) {
      console.error('Update project status error:', error)
      throw new Error(`更新项目状态失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 获取项目状态
   */
  async getProjectStatus(projectId: string): Promise<ProjectStatus | null> {
    try {
      const statusData = await this.env.KV.get(`project:status:${projectId}`)
      return statusData ? JSON.parse(statusData) : null
    } catch (error) {
      console.error('Get project status error:', error)
      return null
    }
  }

  /**
   * 添加时间线事件
   */
  async addTimelineEvent(event: Omit<ProjectTimeline, 'id' | 'timestamp'>): Promise<ProjectTimeline> {
    try {
      const timelineEvent: ProjectTimeline = {
        ...event,
        id: `timeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      }

      // 保存到KV存储
      const timelineKey = `project:timeline:${event.projectId}`
      const existingTimelineData = await this.env.KV.get(timelineKey)
      const existingTimeline: ProjectTimeline[] = existingTimelineData ? JSON.parse(existingTimelineData) : []
      
      // 添加新事件并保持最近100个事件
      existingTimeline.unshift(timelineEvent)
      const trimmedTimeline = existingTimeline.slice(0, 100)

      await this.env.KV.put(
        timelineKey,
        JSON.stringify(trimmedTimeline),
        { expirationTtl: 365 * 24 * 60 * 60 } // 1年过期
      )

      return timelineEvent
    } catch (error) {
      console.error('Add timeline event error:', error)
      throw new Error(`添加时间线事件失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 获取项目时间线
   */
  async getProjectTimeline(projectId: string, limit = 50): Promise<ProjectTimeline[]> {
    try {
      const timelineData = await this.env.KV.get(`project:timeline:${projectId}`)
      const timeline: ProjectTimeline[] = timelineData ? JSON.parse(timelineData) : []
      
      return timeline.slice(0, limit)
    } catch (error) {
      console.error('Get project timeline error:', error)
      return []
    }
  }

  /**
   * 创建项目里程碑
   */
  async createMilestone(milestone: Omit<ProjectMilestone, 'id'>): Promise<ProjectMilestone> {
    try {
      const newMilestone: ProjectMilestone = {
        ...milestone,
        id: `milestone-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }

      // 保存里程碑
      const milestonesKey = `project:milestones:${milestone.projectId}`
      const existingMilestonesData = await this.env.KV.get(milestonesKey)
      const existingMilestones: ProjectMilestone[] = existingMilestonesData ? JSON.parse(existingMilestonesData) : []
      
      existingMilestones.push(newMilestone)

      await this.env.KV.put(
        milestonesKey,
        JSON.stringify(existingMilestones),
        { expirationTtl: 365 * 24 * 60 * 60 }
      )

      // 记录时间线事件
      await this.addTimelineEvent({
        projectId: milestone.projectId,
        eventType: 'milestone',
        title: `创建里程碑：${milestone.title}`,
        description: milestone.description,
        importance: milestone.priority === 'critical' ? 'critical' : 'medium',
        metadata: {
          milestoneId: newMilestone.id,
          targetDate: milestone.targetDate,
          priority: milestone.priority
        }
      })

      return newMilestone
    } catch (error) {
      console.error('Create milestone error:', error)
      throw new Error(`创建里程碑失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 更新里程碑状态
   */
  async updateMilestone(projectId: string, milestoneId: string, updates: Partial<ProjectMilestone>): Promise<ProjectMilestone | null> {
    try {
      const milestonesKey = `project:milestones:${projectId}`
      const milestonesData = await this.env.KV.get(milestonesKey)
      const milestones: ProjectMilestone[] = milestonesData ? JSON.parse(milestonesData) : []
      
      const milestoneIndex = milestones.findIndex(m => m.id === milestoneId)
      if (milestoneIndex === -1) {
        return null
      }

      const updatedMilestone = { ...milestones[milestoneIndex], ...updates }
      milestones[milestoneIndex] = updatedMilestone

      await this.env.KV.put(milestonesKey, JSON.stringify(milestones))

      // 记录时间线事件
      if (updates.status === 'completed') {
        await this.addTimelineEvent({
          projectId,
          eventType: 'milestone',
          title: `里程碑完成：${updatedMilestone.title}`,
          description: `里程碑已完成，进度：${updatedMilestone.progress}%`,
          importance: 'high',
          metadata: {
            milestoneId,
            completedDate: updates.completedDate
          }
        })
      }

      return updatedMilestone
    } catch (error) {
      console.error('Update milestone error:', error)
      throw new Error(`更新里程碑失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 获取项目里程碑
   */
  async getProjectMilestones(projectId: string): Promise<ProjectMilestone[]> {
    try {
      const milestonesData = await this.env.KV.get(`project:milestones:${projectId}`)
      return milestonesData ? JSON.parse(milestonesData) : []
    } catch (error) {
      console.error('Get project milestones error:', error)
      return []
    }
  }

  /**
   * 创建项目警报
   */
  async createAlert(alert: Omit<ProjectAlert, 'id' | 'createdAt' | 'acknowledged'>): Promise<ProjectAlert> {
    try {
      const newAlert: ProjectAlert = {
        ...alert,
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
        acknowledged: false
      }

      // 保存警报
      const alertsKey = `project:alerts:${alert.projectId}`
      const existingAlertsData = await this.env.KV.get(alertsKey)
      const existingAlerts: ProjectAlert[] = existingAlertsData ? JSON.parse(existingAlertsData) : []
      
      existingAlerts.unshift(newAlert)
      // 保持最近50个警报
      const trimmedAlerts = existingAlerts.slice(0, 50)

      await this.env.KV.put(
        alertsKey,
        JSON.stringify(trimmedAlerts),
        { expirationTtl: 90 * 24 * 60 * 60 } // 90天过期
      )

      return newAlert
    } catch (error) {
      console.error('Create alert error:', error)
      throw new Error(`创建警报失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 获取项目警报
   */
  async getProjectAlerts(projectId: string, unacknowledgedOnly = false): Promise<ProjectAlert[]> {
    try {
      const alertsData = await this.env.KV.get(`project:alerts:${projectId}`)
      const alerts: ProjectAlert[] = alertsData ? JSON.parse(alertsData) : []
      
      return unacknowledgedOnly ? alerts.filter(a => !a.acknowledged) : alerts
    } catch (error) {
      console.error('Get project alerts error:', error)
      return []
    }
  }

  /**
   * 确认警报
   */
  async acknowledgeAlert(projectId: string, alertId: string, userId?: string): Promise<boolean> {
    try {
      const alertsKey = `project:alerts:${projectId}`
      const alertsData = await this.env.KV.get(alertsKey)
      const alerts: ProjectAlert[] = alertsData ? JSON.parse(alertsData) : []
      
      const alertIndex = alerts.findIndex(a => a.id === alertId)
      if (alertIndex === -1) {
        return false
      }

      alerts[alertIndex].acknowledged = true
      alerts[alertIndex].acknowledgedAt = new Date().toISOString()
      alerts[alertIndex].acknowledgedBy = userId

      await this.env.KV.put(alertsKey, JSON.stringify(alerts))
      return true
    } catch (error) {
      console.error('Acknowledge alert error:', error)
      return false
    }
  }

  /**
   * 获取项目指标
   */
  async getProjectMetrics(projectId: string): Promise<ProjectMetrics> {
    try {
      const [timeline, milestones, alerts] = await Promise.all([
        this.getProjectTimeline(projectId),
        this.getProjectMilestones(projectId),
        this.getProjectAlerts(projectId)
      ])

      const statusChanges = timeline.filter(t => t.eventType === 'status_change').length
      const completedMilestones = milestones.filter(m => m.status === 'completed').length
      const overdueMilestones = milestones.filter(m => m.status === 'overdue').length
      const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length

      // 计算健康评分 (0-100)
      let healthScore = 100
      healthScore -= overdueMilestones * 15 // 每个逾期里程碑扣15分
      healthScore -= unacknowledgedAlerts * 10 // 每个未确认警报扣10分
      healthScore = Math.max(0, Math.min(100, healthScore))

      // 计算风险等级
      let riskLevel: 'low' | 'medium' | 'high' = 'low'
      if (healthScore < 60 || overdueMilestones > 2) {
        riskLevel = 'high'
      } else if (healthScore < 80 || overdueMilestones > 0) {
        riskLevel = 'medium'
      }

      return {
        projectId,
        totalEvents: timeline.length,
        statusChanges,
        milestonesCompleted: completedMilestones,
        milestonesOverdue: overdueMilestones,
        averageResponseTime: 0, // 需要更复杂的计算
        lastActivity: timeline[0]?.timestamp || new Date().toISOString(),
        healthScore,
        riskLevel
      }
    } catch (error) {
      console.error('Get project metrics error:', error)
      throw new Error(`获取项目指标失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 检查逾期里程碑
   */
  async checkOverdueMilestones(): Promise<void> {
    try {
      // 这里应该遍历所有项目的里程碑，检查是否逾期
      // 由于KV存储的限制，这里提供一个简化的实现
      console.log('Checking overdue milestones...')
      
      // 实际实现中，可以维护一个项目列表，然后遍历检查
      // 或者使用定时任务定期检查
    } catch (error) {
      console.error('Check overdue milestones error:', error)
    }
  }

  /**
   * 获取状态标签
   */
  private getStatusLabel(status?: string): string {
    const statusLabels = {
      pending: '待开始',
      active: '活跃',
      in_progress: '进行中',
      completed: '已完成',
      cancelled: '已取消',
      on_hold: '暂停'
    }
    return statusLabels[status as keyof typeof statusLabels] || status || '未知'
  }

  /**
   * 判断是否应该生成警报
   */
  private shouldGenerateAlert(oldStatus?: string, newStatus?: string): boolean {
    // 状态变更到完成、取消或暂停时生成警报
    return newStatus === 'completed' || newStatus === 'cancelled' || newStatus === 'on_hold'
  }

  /**
   * 获取警报严重程度
   */
  private getAlertSeverity(status: string): ProjectAlert['severity'] {
    switch (status) {
      case 'completed':
        return 'success'
      case 'cancelled':
        return 'error'
      case 'on_hold':
        return 'warning'
      default:
        return 'info'
    }
  }
}