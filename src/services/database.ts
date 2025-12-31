import { drizzle } from 'drizzle-orm/d1'
import { eq, desc, and, gte, lte, like, count } from 'drizzle-orm'
import * as schema from '../db/schema'

// 数据库服务类
export class DatabaseService {
  private db: ReturnType<typeof drizzle>

  constructor(database: D1Database) {
    this.db = drizzle(database, { schema })
  }

  // 招标信息相关操作
  async createTenderInfo(data: schema.NewTenderInfo): Promise<schema.TenderInfo> {
    const [result] = await this.db.insert(schema.tenderInfo).values(data).returning()
    if (!result) {
      throw new Error('Failed to create tender info')
    }
    return result
  }

  async getTenderInfoById(id: string): Promise<schema.TenderInfo | undefined> {
    const result = await this.db.select().from(schema.tenderInfo).where(eq(schema.tenderInfo.id, id)).limit(1)
    return result[0]
  }

  async getTenderInfoList(params: {
    page?: number
    pageSize?: number
    status?: 'ACTIVE' | 'CLOSED' | 'AWARDED'
    area?: string
    minBudget?: number
    maxBudget?: number
    search?: string
  }) {
    const { page = 1, pageSize = 20, status, area, minBudget, maxBudget, search } = params
    const offset = (page - 1) * pageSize

    // 构建查询条件
    const conditions = []
    if (status) conditions.push(eq(schema.tenderInfo.status, status))
    if (area) conditions.push(eq(schema.tenderInfo.area, area))
    if (minBudget) conditions.push(gte(schema.tenderInfo.budget, minBudget))
    if (maxBudget) conditions.push(lte(schema.tenderInfo.budget, maxBudget))
    if (search) {
      conditions.push(like(schema.tenderInfo.title, `%${search}%`))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // 获取总数
    const totalResult = await this.db
      .select({ total: count() })
      .from(schema.tenderInfo)
      .where(whereClause)
    
    const total = totalResult[0]?.total ?? 0

    // 获取数据
    const items = await this.db.select().from(schema.tenderInfo)
      .where(whereClause)
      .orderBy(desc(schema.tenderInfo.createdAt))
      .limit(pageSize)
      .offset(offset)

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }

  async updateTenderInfo(id: string, data: Partial<schema.NewTenderInfo>): Promise<schema.TenderInfo | undefined> {
    const result = await this.db
      .update(schema.tenderInfo)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.tenderInfo.id, id))
      .returning()
    return result[0]
  }

  async deleteTenderInfo(id: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.tenderInfo)
      .where(eq(schema.tenderInfo.id, id))
    return result.success
  }

  // 项目分析相关操作
  async createProjectAnalysis(data: schema.NewProjectAnalysis): Promise<schema.ProjectAnalysis> {
    const result = await this.db.insert(schema.projectAnalysis).values(data).returning()
    if (!result[0]) {
      throw new Error('Failed to create project analysis')
    }
    return result[0]
  }

  async getProjectAnalysisByTenderId(tenderId: string): Promise<schema.ProjectAnalysis | undefined> {
    const result = await this.db.select().from(schema.projectAnalysis)
      .where(eq(schema.projectAnalysis.tenderId, tenderId))
      .limit(1)
    return result[0]
  }

  async updateProjectAnalysis(id: number, data: Partial<schema.NewProjectAnalysis>): Promise<schema.ProjectAnalysis | undefined> {
    const result = await this.db
      .update(schema.projectAnalysis)
      .set(data)
      .where(eq(schema.projectAnalysis.id, id))
      .returning()
    return result[0]
  }

  // 方案文档相关操作
  async createProposalDocument(data: schema.NewProposalDocument): Promise<schema.ProposalDocument> {
    const result = await this.db.insert(schema.proposalDocument).values(data).returning()
    if (!result[0]) {
      throw new Error('Failed to create proposal document')
    }
    return result[0]
  }

  async getProposalDocumentByTenderId(tenderId: string): Promise<schema.ProposalDocument | undefined> {
    const result = await this.db.select().from(schema.proposalDocument)
      .where(eq(schema.proposalDocument.tenderId, tenderId))
      .limit(1)
    return result[0]
  }

  async updateProposalDocument(id: number, data: Partial<schema.NewProposalDocument>): Promise<schema.ProposalDocument | undefined> {
    const result = await this.db
      .update(schema.proposalDocument)
      .set(data)
      .where(eq(schema.proposalDocument.id, id))
      .returning()
    return result[0]
  }

  // 成本收益报告相关操作
  async createCostBenefitReport(data: schema.NewCostBenefitReport): Promise<schema.CostBenefitReport> {
    const result = await this.db.insert(schema.costBenefitReport).values(data).returning()
    if (!result[0]) {
      throw new Error('Failed to create cost benefit report')
    }
    return result[0]
  }

  async getCostBenefitReportByTenderId(tenderId: string): Promise<schema.CostBenefitReport | undefined> {
    const result = await this.db.select().from(schema.costBenefitReport)
      .where(eq(schema.costBenefitReport.tenderId, tenderId))
      .limit(1)
    return result[0]
  }

  async updateCostBenefitReport(id: number, data: Partial<schema.NewCostBenefitReport>): Promise<schema.CostBenefitReport | undefined> {
    const result = await this.db
      .update(schema.costBenefitReport)
      .set(data)
      .where(eq(schema.costBenefitReport.id, id))
      .returning()
    return result[0]
  }

  async updateCostBenefitReportByTenderId(tenderId: string, data: Partial<schema.NewCostBenefitReport>): Promise<schema.CostBenefitReport | undefined> {
    const result = await this.db
      .update(schema.costBenefitReport)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(schema.costBenefitReport.tenderId, tenderId))
      .returning()
    return result[0]
  }

  async deleteCostBenefitReport(tenderId: string): Promise<boolean> {
    const result = await this.db
      .delete(schema.costBenefitReport)
      .where(eq(schema.costBenefitReport.tenderId, tenderId))
    return result.success
  }

  async getAllCostBenefitReports(): Promise<schema.CostBenefitReport[]> {
    return await this.db.select().from(schema.costBenefitReport)
      .orderBy(desc(schema.costBenefitReport.createdAt))
  }

  // 便捷方法：通过tenderId获取招标信息
  async getTenderById(id: string): Promise<schema.TenderInfo | undefined> {
    return this.getTenderInfoById(id)
  }

  // 通知记录相关操作
  async createNotificationLog(data: schema.NewNotificationLog): Promise<schema.NotificationLog> {
    const result = await this.db.insert(schema.notificationLog).values(data).returning()
    if (!result[0]) {
      throw new Error('Failed to create notification log')
    }
    return result[0]
  }

  async getNotificationLogs(params: {
    page?: number
    pageSize?: number
    status?: 'PENDING' | 'SENT' | 'FAILED'
    type?: string
    tenderId?: string
  }) {
    const { page = 1, pageSize = 20, status, type, tenderId } = params
    const offset = (page - 1) * pageSize

    const conditions = []
    if (status) conditions.push(eq(schema.notificationLog.status, status))
    if (type) conditions.push(eq(schema.notificationLog.type, type))
    if (tenderId) conditions.push(eq(schema.notificationLog.tenderId, tenderId))

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const totalResult = await this.db
      .select({ total: count() })
      .from(schema.notificationLog)
      .where(whereClause)
    
    const total = totalResult[0]?.total ?? 0

    const items = await this.db.select().from(schema.notificationLog)
      .where(whereClause)
      .orderBy(desc(schema.notificationLog.createdAt))
      .limit(pageSize)
      .offset(offset)

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    }
  }

  async updateNotificationStatus(id: number, status: 'PENDING' | 'SENT' | 'FAILED', sentAt?: Date): Promise<schema.NotificationLog | undefined> {
    const result = await this.db
      .update(schema.notificationLog)
      .set({ status, sentAt })
      .where(eq(schema.notificationLog.id, id))
      .returning()
    return result[0]
  }

  // 系统配置相关操作
  async getSystemConfig(key: string): Promise<schema.SystemConfig | undefined> {
    const result = await this.db.select().from(schema.systemConfig)
      .where(eq(schema.systemConfig.key, key))
      .limit(1)
    return result[0]
  }

  async setSystemConfig(key: string, value: string, description?: string): Promise<schema.SystemConfig> {
    const result = await this.db
      .insert(schema.systemConfig)
      .values({ key, value, description, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: schema.systemConfig.key,
        set: { value, description, updatedAt: new Date() }
      })
      .returning()
    if (!result[0]) {
      throw new Error('Failed to set system config')
    }
    return result[0]
  }

  async getAllSystemConfigs(): Promise<schema.SystemConfig[]> {
    return await this.db.select().from(schema.systemConfig)
      .orderBy(schema.systemConfig.key)
  }

  // 统计相关操作
  async getStatistics(startDate?: Date, endDate?: Date) {
    const conditions = []
    if (startDate) conditions.push(gte(schema.tenderInfo.createdAt, startDate))
    if (endDate) conditions.push(lte(schema.tenderInfo.createdAt, endDate))
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // 招标项目统计
    const tenderStatsResult = await this.db
      .select({
        total: count(),
        active: count(eq(schema.tenderInfo.status, 'ACTIVE')),
        closed: count(eq(schema.tenderInfo.status, 'CLOSED')),
        awarded: count(eq(schema.tenderInfo.status, 'AWARDED'))
      })
      .from(schema.tenderInfo)
      .where(whereClause)

    const tenderStats = tenderStatsResult[0] ?? {
      total: 0,
      active: 0,
      closed: 0,
      awarded: 0
    }

    // 分析完成统计
    const analysisStatsResult = await this.db
      .select({ total: count() })
      .from(schema.projectAnalysis)
      .where(whereClause ? and(whereClause) : undefined)

    const analysisStats = analysisStatsResult[0] ?? { total: 0 }

    // 方案生成统计
    const proposalStatsResult = await this.db
      .select({ total: count() })
      .from(schema.proposalDocument)
      .where(whereClause ? and(whereClause) : undefined)

    const proposalStats = proposalStatsResult[0] ?? { total: 0 }

    return {
      tenders: tenderStats,
      analyses: analysisStats.total,
      proposals: proposalStats.total
    }
  }
}