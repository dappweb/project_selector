// 通用类型定义

export interface BreadcrumbItem {
  title: string
  href?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  timestamp?: string
}

export interface PaginationParams {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface TableColumn {
  key: string
  title: string
  dataIndex?: string
  width?: number
  align?: 'left' | 'center' | 'right'
  sorter?: boolean
  render?: (value: any, record: any, index: number) => React.ReactNode
}

export interface FilterOption {
  label: string
  value: string | number
}

export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: any
}

export interface DateRange {
  start: string
  end: string
}

// 项目相关类型
export interface ProjectCategory {
  id: string
  name: string
  description?: string
  count?: number
}

export interface ProjectStatus {
  key: 'active' | 'completed' | 'cancelled' | 'pending'
  label: string
  color: string
}

// 分析相关类型
export interface AnalysisResult {
  id: string
  projectId: string
  score: number
  classification: string
  keywords: string[]
  competitors: string[]
  recommendations: string[]
  createdAt: string
}

export interface CostBenefitAnalysis {
  id: string
  projectId: string
  totalCost: number
  expectedRevenue: number
  roi: number
  paybackPeriod: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  scenarios: {
    optimistic: number
    realistic: number
    pessimistic: number
  }
  createdAt: string
}

// 报告相关类型
export interface ReportTemplate {
  id: string
  name: string
  type: 'monthly' | 'quarterly' | 'annual' | 'custom'
  description: string
  sections: string[]
}

export interface Report {
  id: string
  title: string
  type: string
  period: string
  status: 'generating' | 'completed' | 'failed'
  generatedAt: string
  downloadUrls?: {
    pdf?: string
    excel?: string
  }
}

// 系统配置类型
export interface SystemConfig {
  crawlerInterval: number
  apiTimeout: number
  maxRetries: number
  enableNotifications: boolean
  notificationChannels: string[]
}

// 用户权限类型
export type Permission = 
  | 'read'
  | 'write' 
  | 'delete'
  | 'admin'
  | 'crawler:start'
  | 'crawler:stop'
  | 'analysis:run'
  | 'report:generate'
  | 'report:export'

// 通知类型
export type NotificationType = 'info' | 'success' | 'warning' | 'error'

// 图表类型
export type ChartType = 'line' | 'bar' | 'pie' | 'area' | 'scatter'

// 导出格式
export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'json'

// 排序方向
export type SortOrder = 'asc' | 'desc'

// 筛选操作符
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in'

export interface FilterCondition {
  field: string
  operator: FilterOperator
  value: any
}

export interface SortCondition {
  field: string
  order: SortOrder
}

export interface QueryParams {
  page?: number
  limit?: number
  search?: string
  filters?: FilterCondition[]
  sort?: SortCondition[]
}