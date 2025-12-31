import { sqliteTable, text, real, integer, index } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

// 招标信息表
export const tenderInfo = sqliteTable('tender_info', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  budget: real('budget'),
  publishTime: integer('publish_time', { mode: 'timestamp' }),
  deadline: integer('deadline', { mode: 'timestamp' }),
  purchaser: text('purchaser'),
  area: text('area'),
  projectType: text('project_type'),
  status: text('status').$type<'ACTIVE' | 'CLOSED' | 'AWARDED'>().notNull().default('ACTIVE'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  publishTimeIdx: index('idx_tender_publish_time').on(table.publishTime),
  budgetIdx: index('idx_tender_budget').on(table.budget),
  areaIdx: index('idx_tender_area').on(table.area),
  statusIdx: index('idx_tender_status').on(table.status),
  deadlineIdx: index('idx_tender_deadline').on(table.deadline)
}))

// 项目分析表
export const projectAnalysis = sqliteTable('project_analysis', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  tenderId: text('tender_id').notNull().references(() => tenderInfo.id, { onDelete: 'cascade' }),
  aiClassification: text('ai_classification', { mode: 'json' }).notNull(),
  scoreEvaluation: text('score_evaluation', { mode: 'json' }).notNull(),
  competitorAnalysis: text('competitor_analysis', { mode: 'json' }).notNull(),
  analysisTime: integer('analysis_time', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  tenderIdIdx: index('idx_analysis_tender_id').on(table.tenderId),
  analysisTimeIdx: index('idx_analysis_time').on(table.analysisTime)
}))

// 方案文档表
export const proposalDocument = sqliteTable('proposal_document', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  tenderId: text('tender_id').notNull().references(() => tenderInfo.id, { onDelete: 'cascade' }),
  technicalSolution: text('technical_solution', { mode: 'json' }).notNull(),
  commercialProposal: text('commercial_proposal', { mode: 'json' }).notNull(),
  riskAssessment: text('risk_assessment', { mode: 'json' }).notNull(),
  documentPath: text('document_path'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  tenderIdIdx: index('idx_proposal_tender_id').on(table.tenderId),
  createdAtIdx: index('idx_proposal_created_at').on(table.createdAt)
}))

// 成本收益报告表
export const costBenefitReport = sqliteTable('cost_benefit_report', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  tenderId: text('tender_id').notNull().references(() => tenderInfo.id, { onDelete: 'cascade' }),
  costAnalysis: text('cost_analysis', { mode: 'json' }).notNull(),
  benefitAnalysis: text('benefit_analysis', { mode: 'json' }).notNull(),
  roiAnalysis: text('roi_analysis', { mode: 'json' }).notNull(),
  cashFlowAnalysis: text('cash_flow_analysis', { mode: 'json' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  tenderIdIdx: index('idx_cost_benefit_tender_id').on(table.tenderId),
  createdAtIdx: index('idx_cost_benefit_created_at').on(table.createdAt)
}))

// 通知记录表
export const notificationLog = sqliteTable('notification_log', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  tenderId: text('tender_id').references(() => tenderInfo.id, { onDelete: 'set null' }),
  type: text('type').notNull(), // 'DEADLINE_REMINDER', 'STATUS_UPDATE', 'ANALYSIS_COMPLETE'
  channel: text('channel').notNull(), // 'EMAIL', 'WECHAT', 'DINGTALK'
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),
  content: text('content').notNull(),
  status: text('status').$type<'PENDING' | 'SENT' | 'FAILED'>().notNull().default('PENDING'),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
}, (table) => ({
  tenderIdIdx: index('idx_notification_tender_id').on(table.tenderId),
  statusIdx: index('idx_notification_status').on(table.status),
  typeIdx: index('idx_notification_type').on(table.type),
  createdAtIdx: index('idx_notification_created_at').on(table.createdAt)
}))

// 系统配置表
export const systemConfig = sqliteTable('system_config', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description'),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date())
})

// 定义表关系
export const tenderInfoRelations = relations(tenderInfo, ({ many }) => ({
  analyses: many(projectAnalysis),
  proposals: many(proposalDocument),
  costBenefitReports: many(costBenefitReport),
  notifications: many(notificationLog)
}))

export const projectAnalysisRelations = relations(projectAnalysis, ({ one }) => ({
  tender: one(tenderInfo, {
    fields: [projectAnalysis.tenderId],
    references: [tenderInfo.id]
  })
}))

export const proposalDocumentRelations = relations(proposalDocument, ({ one }) => ({
  tender: one(tenderInfo, {
    fields: [proposalDocument.tenderId],
    references: [tenderInfo.id]
  })
}))

export const costBenefitReportRelations = relations(costBenefitReport, ({ one }) => ({
  tender: one(tenderInfo, {
    fields: [costBenefitReport.tenderId],
    references: [tenderInfo.id]
  })
}))

export const notificationLogRelations = relations(notificationLog, ({ one }) => ({
  tender: one(tenderInfo, {
    fields: [notificationLog.tenderId],
    references: [tenderInfo.id]
  })
}))

// 导出所有表的类型
export type TenderInfo = typeof tenderInfo.$inferSelect
export type NewTenderInfo = typeof tenderInfo.$inferInsert

export type ProjectAnalysis = typeof projectAnalysis.$inferSelect
export type NewProjectAnalysis = typeof projectAnalysis.$inferInsert

export type ProposalDocument = typeof proposalDocument.$inferSelect
export type NewProposalDocument = typeof proposalDocument.$inferInsert

export type CostBenefitReport = typeof costBenefitReport.$inferSelect
export type NewCostBenefitReport = typeof costBenefitReport.$inferInsert

export type NotificationLog = typeof notificationLog.$inferSelect
export type NewNotificationLog = typeof notificationLog.$inferInsert

export type SystemConfig = typeof systemConfig.$inferSelect
export type NewSystemConfig = typeof systemConfig.$inferInsert