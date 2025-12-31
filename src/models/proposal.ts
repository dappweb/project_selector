// 开发阶段模型
export interface DevelopmentPhase {
  name: string // 阶段名称
  duration: number // 持续时间（天）
  deliverables: string[] // 交付物
  resources: number // 所需人天
  dependencies: string[] // 依赖的前置阶段
  milestones: string[] // 里程碑
}

// 团队成员模型
export interface TeamMember {
  role: string // 角色（如：项目经理、架构师、开发工程师）
  level: 'SENIOR' | 'INTERMEDIATE' | 'JUNIOR' // 级别
  allocation: number // 投入比例 0-1
  dailyRate: number // 日薪
  skills: string[] // 技能标签
}

// 技术方案模型
export interface TechnicalSolution {
  architecture: string // 系统架构描述
  techStack: string[] // 技术栈
  developmentPlan: DevelopmentPhase[] // 开发计划
  teamStructure: TeamMember[] // 团队结构
  timeline: number // 总开发周期（天）
  riskFactors: string[] // 技术风险因素
  qualityAssurance: {
    testingStrategy: string // 测试策略
    codeReviewProcess: string // 代码审查流程
    qualityMetrics: string[] // 质量指标
  }
}

// 成本分解模型
export interface CostBreakdown {
  development: number // 开发成本
  testing: number // 测试成本
  deployment: number // 部署成本
  management: number // 管理成本
  contingency: number // 应急费用
  thirdPartyLicenses: number // 第三方许可费用
  infrastructure: number // 基础设施费用
}

// 付款里程碑模型
export interface PaymentMilestone {
  phase: string // 阶段名称
  percentage: number // 付款比例
  amount: number // 付款金额
  condition: string // 付款条件
  expectedDate: Date // 预期付款日期
}

// 商务方案模型
export interface CommercialProposal {
  totalBudget: number // 总预算
  breakdown: CostBreakdown // 成本分解
  paymentSchedule: PaymentMilestone[] // 付款计划
  warranty: number // 质保期（月）
  supportPlan: {
    duration: number // 支持期限（月）
    responseTime: string // 响应时间
    supportChannels: string[] // 支持渠道
  }
  pricing: {
    basePrice: number // 基础价格
    optionalFeatures: Array<{
      name: string
      price: number
      description: string
    }> // 可选功能
    discounts: Array<{
      condition: string
      percentage: number
    }> // 折扣条件
  }
}

// 风险类别
export type RiskCategory = 'TECHNICAL' | 'COMMERCIAL' | 'SCHEDULE' | 'RESOURCE' | 'EXTERNAL'

// 风险模型
export interface Risk {
  id: string // 风险ID
  category: RiskCategory // 风险类别
  description: string // 风险描述
  probability: number // 发生概率 0-1
  impact: number // 影响程度 0-1
  severity: 'HIGH' | 'MEDIUM' | 'LOW' // 风险严重程度
  mitigationStrategy: string // 缓解策略
  contingencyPlan: string // 应急计划
  owner: string // 风险负责人
  status: 'IDENTIFIED' | 'MITIGATED' | 'RESOLVED' | 'ACCEPTED' // 风险状态
}

// 风险评估模型
export interface RiskAssessment {
  risks: Risk[] // 风险列表
  overallRiskLevel: 'HIGH' | 'MEDIUM' | 'LOW' // 整体风险级别
  mitigationStrategies: string[] // 总体缓解策略
  riskMatrix: {
    high: number // 高风险数量
    medium: number // 中风险数量
    low: number // 低风险数量
  }
  contingencyBudget: number // 应急预算
  riskMonitoringPlan: string // 风险监控计划
}

// 验证函数
export function validateDevelopmentPhase(data: any): data is DevelopmentPhase {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.name === 'string' &&
    typeof data.duration === 'number' &&
    data.duration > 0 &&
    Array.isArray(data.deliverables) &&
    typeof data.resources === 'number' &&
    data.resources > 0 &&
    Array.isArray(data.dependencies) &&
    Array.isArray(data.milestones)
  )
}

export function validateTeamMember(data: any): data is TeamMember {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.role === 'string' &&
    ['SENIOR', 'INTERMEDIATE', 'JUNIOR'].includes(data.level) &&
    typeof data.allocation === 'number' &&
    data.allocation >= 0 &&
    data.allocation <= 1 &&
    typeof data.dailyRate === 'number' &&
    data.dailyRate > 0 &&
    Array.isArray(data.skills)
  )
}

export function validateTechnicalSolution(data: any): data is TechnicalSolution {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.architecture === 'string' &&
    Array.isArray(data.techStack) &&
    Array.isArray(data.developmentPlan) &&
    data.developmentPlan.every(validateDevelopmentPhase) &&
    Array.isArray(data.teamStructure) &&
    data.teamStructure.every(validateTeamMember) &&
    typeof data.timeline === 'number' &&
    data.timeline >= 0 && // 允许0值
    Array.isArray(data.riskFactors) &&
    typeof data.qualityAssurance === 'object'
  )
}

export function validateRisk(data: any): data is Risk {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.id === 'string' &&
    ['TECHNICAL', 'COMMERCIAL', 'SCHEDULE', 'RESOURCE', 'EXTERNAL'].includes(data.category) &&
    typeof data.description === 'string' &&
    typeof data.probability === 'number' &&
    data.probability >= 0 &&
    data.probability <= 1 &&
    typeof data.impact === 'number' &&
    data.impact >= 0 &&
    data.impact <= 1 &&
    ['HIGH', 'MEDIUM', 'LOW'].includes(data.severity)
  )
}

export function validateRiskAssessment(data: any): data is RiskAssessment {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray(data.risks) &&
    data.risks.every(validateRisk) &&
    ['HIGH', 'MEDIUM', 'LOW'].includes(data.overallRiskLevel) &&
    Array.isArray(data.mitigationStrategies) &&
    typeof data.riskMatrix === 'object' &&
    typeof data.contingencyBudget === 'number'
  )
}

// 创建默认技术方案
export function createDefaultTechnicalSolution(): TechnicalSolution {
  return {
    architecture: '待设计',
    techStack: [],
    developmentPlan: [],
    teamStructure: [],
    timeline: 0,
    riskFactors: [],
    qualityAssurance: {
      testingStrategy: '待制定',
      codeReviewProcess: '待制定',
      qualityMetrics: []
    }
  }
}

// 创建默认商务方案
export function createDefaultCommercialProposal(): CommercialProposal {
  return {
    totalBudget: 0,
    breakdown: {
      development: 0,
      testing: 0,
      deployment: 0,
      management: 0,
      contingency: 0,
      thirdPartyLicenses: 0,
      infrastructure: 0
    },
    paymentSchedule: [],
    warranty: 12,
    supportPlan: {
      duration: 12,
      responseTime: '24小时',
      supportChannels: ['电话', '邮件', '在线']
    },
    pricing: {
      basePrice: 0,
      optionalFeatures: [],
      discounts: []
    }
  }
}

// 创建默认风险评估
export function createDefaultRiskAssessment(): RiskAssessment {
  return {
    risks: [],
    overallRiskLevel: 'MEDIUM',
    mitigationStrategies: [],
    riskMatrix: {
      high: 0,
      medium: 0,
      low: 0
    },
    contingencyBudget: 0,
    riskMonitoringPlan: '待制定'
  }
}

// 计算风险评分
export function calculateRiskScore(risk: Risk): number {
  return risk.probability * risk.impact * 100
}

// 计算总体风险级别
export function calculateOverallRiskLevel(risks: Risk[]): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (risks.length === 0) return 'LOW'
  
  const highRiskCount = risks.filter(r => r.severity === 'HIGH').length
  const totalRisks = risks.length
  const highRiskRatio = highRiskCount / totalRisks
  
  if (highRiskRatio >= 0.5) return 'HIGH' // 50%以上高风险
  if (highRiskRatio > 0) return 'MEDIUM' // 有高风险但不超过50%
  return 'LOW'
}