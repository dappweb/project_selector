// 基础类型定义

export interface TenderInfo {
  id: string
  title: string
  content?: string
  budget?: number
  publishTime?: Date
  deadline?: Date
  purchaser?: string
  area?: string
  projectType?: string
  status: 'ACTIVE' | 'CLOSED' | 'AWARDED'
  createdAt: Date
  updatedAt: Date
}

export interface ProjectAnalysis {
  id: number
  tenderId: string
  aiClassification: AIClassification
  scoreEvaluation: ScoreEvaluation
  competitorAnalysis: CompetitorAnalysis
  analysisTime: Date
}

export interface AIClassification {
  projectType: 'AI_DEVELOPMENT' | 'SOFTWARE_DEVELOPMENT' | 'HARDWARE_PROCUREMENT' | 'OTHER'
  confidence: number
  keywords: string[]
  isAIRelated: boolean
  isSoftwareProject: boolean
}

export interface ScoreEvaluation {
  totalScore: number
  budgetScore: number
  difficultyScore: number
  competitionScore: number
  matchScore: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface CompetitorAnalysis {
  competitors: Competitor[]
  competitionLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  estimatedBidRange: {
    min: number
    max: number
  }
  recommendations: string[]
}

export interface Competitor {
  name: string
  strength: number
  previousWins: number
  estimatedBid?: number
}

export interface ProposalDocument {
  id: number
  tenderId: string
  technicalSolution: TechnicalSolution
  commercialProposal: CommercialProposal
  riskAssessment: RiskAssessment
  documentPath?: string
  createdAt: Date
}

export interface TechnicalSolution {
  architecture: string
  techStack: string[]
  developmentPlan: DevelopmentPhase[]
  teamStructure: TeamMember[]
  timeline: number // 开发周期（天）
}

export interface DevelopmentPhase {
  name: string
  duration: number // 天数
  deliverables: string[]
  resources: number // 人天
}

export interface TeamMember {
  role: string
  level: 'SENIOR' | 'INTERMEDIATE' | 'JUNIOR'
  allocation: number // 投入比例 0-1
}

export interface CommercialProposal {
  totalBudget: number
  breakdown: CostBreakdown
  paymentSchedule: PaymentMilestone[]
  warranty: number // 质保期（月）
}

export interface CostBreakdown {
  development: number
  testing: number
  deployment: number
  management: number
  contingency: number
}

export interface PaymentMilestone {
  phase: string
  percentage: number
  amount: number
  condition: string
}

export interface RiskAssessment {
  risks: Risk[]
  overallRiskLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  mitigationStrategies: string[]
}

export interface Risk {
  category: 'TECHNICAL' | 'COMMERCIAL' | 'SCHEDULE' | 'RESOURCE'
  description: string
  probability: number // 0-1
  impact: number // 0-1
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
}

export interface CostBenefitReport {
  id: number
  tenderId: string
  costAnalysis: CostAnalysis
  benefitAnalysis: BenefitAnalysis
  roiAnalysis: ROIAnalysis
  cashFlowAnalysis: CashFlowAnalysis
  createdAt: Date
}

export interface CostAnalysis {
  laborCost: number
  technologyCost: number
  managementCost: number
  riskCost: number
  totalCost: number
}

export interface BenefitAnalysis {
  directRevenue: number
  futureOpportunities: number
  technologyValue: number
  brandValue: number
  totalBenefit: number
}

export interface ROIAnalysis {
  optimistic: number
  neutral: number
  pessimistic: number
  breakEvenPoint: number // 月数
}

export interface CashFlowAnalysis {
  monthlyFlow: MonthlyFlow[]
  peakFunding: number
  paybackPeriod: number
}

export interface MonthlyFlow {
  month: number
  income: number
  expense: number
  netFlow: number
  cumulativeFlow: number
}

// API 响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp: string
}

// 分页类型
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 查询参数类型
export interface QueryParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
  filters?: Record<string, any>
}