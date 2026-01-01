import { DatabaseService } from './database'
import { TenderInfo } from '../models/tender'

export interface AnalyticsQuery {
  startDate?: string
  endDate?: string
  area?: string
  category?: string
  budgetRange?: {
    min?: number
    max?: number
  }
  status?: 'ACTIVE' | 'CLOSED' | 'AWARDED'
}

export interface TenderStatistics {
  totalProjects: number
  activeProjects: number
  closedProjects: number
  awardedProjects: number
  totalBudget: number
  averageBudget: number
  medianBudget: number
  budgetDistribution: {
    range: string
    count: number
    percentage: number
  }[]
  areaDistribution: {
    area: string
    count: number
    percentage: number
  }[]
  categoryDistribution: {
    category: string
    count: number
    percentage: number
  }[]
  timeSeriesData: {
    date: string
    count: number
    budget: number
  }[]
}

export interface ProjectAnalyticsData {
  analysisCompletion: {
    total: number
    completed: number
    pending: number
    completionRate: number
  }
  averageScores: {
    overall: number
    technical: number
    commercial: number
    risk: number
  }
  roiDistribution: {
    range: string
    count: number
    percentage: number
  }[]
  successPrediction: {
    high: number
    medium: number
    low: number
  }
}

export interface BusinessMetrics {
  bidSuccess: {
    totalBids: number
    successfulBids: number
    successRate: number
    totalValue: number
    wonValue: number
  }
  revenueAnalysis: {
    projectedRevenue: number
    actualRevenue: number
    variance: number
    monthlyTrend: {
      month: string
      projected: number
      actual: number
    }[]
  }
  costAnalysis: {
    totalCosts: number
    averageCostPerProject: number
    costByCategory: {
      category: string
      amount: number
      percentage: number
    }[]
  }
  profitability: {
    grossProfit: number
    netProfit: number
    profitMargin: number
    roi: number
  }
}

export interface DashboardData {
  summary: {
    todayNewProjects: number
    weeklyGrowth: number
    monthlyGrowth: number
    systemHealth: 'healthy' | 'warning' | 'error'
    lastUpdateTime: string
  }
  quickStats: {
    totalProjects: number
    activeAnalyses: number
    completedProposals: number
    averageROI: number
  }
  alerts: {
    type: 'info' | 'warning' | 'error'
    message: string
    timestamp: string
  }[]
  recentActivity: {
    type: 'project_added' | 'analysis_completed' | 'proposal_generated'
    title: string
    timestamp: string
    details?: any
  }[]
}

export class DataAnalyticsService {
  constructor(private db: DatabaseService) {}

  /**
   * 获取招标项目统计数据
   */
  async getTenderStatistics(query: AnalyticsQuery = {}): Promise<TenderStatistics> {
    try {
      // 构建查询条件
      const conditions = this.buildQueryConditions(query)
      
      // 获取基础统计
      const basicStats = await this.getBasicTenderStats(conditions)
      
      // 获取预算分布
      const budgetDistribution = await this.getBudgetDistribution(conditions)
      
      // 获取地区分布
      const areaDistribution = await this.getAreaDistribution(conditions)
      
      // 获取类别分布
      const categoryDistribution = await this.getCategoryDistribution(conditions)
      
      // 获取时间序列数据
      const timeSeriesData = await this.getTimeSeriesData(conditions)

      return {
        ...basicStats,
        budgetDistribution,
        areaDistribution,
        categoryDistribution,
        timeSeriesData
      }
    } catch (error) {
      console.error('Get tender statistics error:', error)
      throw new Error(`获取招标统计失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 获取项目分析数据
   */
  async getProjectAnalytics(query: AnalyticsQuery = {}): Promise<ProjectAnalyticsData> {
    try {
      // 分析完成情况
      const analysisCompletion = await this.getAnalysisCompletion(query)
      
      // 平均评分
      const averageScores = await this.getAverageScores(query)
      
      // ROI分布
      const roiDistribution = await this.getROIDistribution(query)
      
      // 成功预测
      const successPrediction = await this.getSuccessPrediction(query)

      return {
        analysisCompletion,
        averageScores,
        roiDistribution,
        successPrediction
      }
    } catch (error) {
      console.error('Get project analytics error:', error)
      throw new Error(`获取项目分析数据失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 获取业务指标
   */
  async getBusinessMetrics(query: AnalyticsQuery = {}): Promise<BusinessMetrics> {
    try {
      // 投标成功率
      const bidSuccess = await this.getBidSuccessMetrics(query)
      
      // 收入分析
      const revenueAnalysis = await this.getRevenueAnalysis(query)
      
      // 成本分析
      const costAnalysis = await this.getCostAnalysis(query)
      
      // 盈利能力
      const profitability = await this.getProfitabilityMetrics(query)

      return {
        bidSuccess,
        revenueAnalysis,
        costAnalysis,
        profitability
      }
    } catch (error) {
      console.error('Get business metrics error:', error)
      throw new Error(`获取业务指标失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 获取仪表板数据
   */
  async getDashboardData(): Promise<DashboardData> {
    try {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      // 获取摘要数据
      const summary = await this.getDashboardSummary(today, weekAgo, monthAgo)
      
      // 获取快速统计
      const quickStats = await this.getQuickStats()
      
      // 获取系统警报
      const alerts = await this.getSystemAlerts()
      
      // 获取最近活动
      const recentActivity = await this.getRecentActivity()

      return {
        summary,
        quickStats,
        alerts,
        recentActivity
      }
    } catch (error) {
      console.error('Get dashboard data error:', error)
      throw new Error(`获取仪表板数据失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // 私有辅助方法

  private buildQueryConditions(query: AnalyticsQuery) {
    const conditions: any = {}
    
    if (query.startDate) conditions.startDate = new Date(query.startDate)
    if (query.endDate) conditions.endDate = new Date(query.endDate)
    if (query.area) conditions.area = query.area
    if (query.category) conditions.category = query.category
    if (query.status) conditions.status = query.status
    if (query.budgetRange) conditions.budgetRange = query.budgetRange
    
    return conditions
  }

  private async getBasicTenderStats(conditions: any) {
    // 模拟数据 - 实际实现中会查询数据库
    const totalProjects = 1250
    const activeProjects = 320
    const closedProjects = 780
    const awardedProjects = 150
    const totalBudget = 2500000000 // 25亿
    
    return {
      totalProjects,
      activeProjects,
      closedProjects,
      awardedProjects,
      totalBudget,
      averageBudget: totalBudget / totalProjects,
      medianBudget: 1800000 // 180万
    }
  }

  private async getBudgetDistribution(conditions: any) {
    return [
      { range: '< 50万', count: 280, percentage: 22.4 },
      { range: '50万 - 200万', count: 450, percentage: 36.0 },
      { range: '200万 - 500万', count: 320, percentage: 25.6 },
      { range: '500万 - 1000万', count: 150, percentage: 12.0 },
      { range: '> 1000万', count: 50, percentage: 4.0 }
    ]
  }

  private async getAreaDistribution(conditions: any) {
    return [
      { area: '北京市', count: 180, percentage: 14.4 },
      { area: '上海市', count: 165, percentage: 13.2 },
      { area: '广东省', count: 220, percentage: 17.6 },
      { area: '江苏省', count: 145, percentage: 11.6 },
      { area: '浙江省', count: 125, percentage: 10.0 },
      { area: '其他', count: 415, percentage: 33.2 }
    ]
  }

  private async getCategoryDistribution(conditions: any) {
    return [
      { category: 'IT软件开发', count: 380, percentage: 30.4 },
      { category: '系统集成', count: 290, percentage: 23.2 },
      { category: '数据服务', count: 220, percentage: 17.6 },
      { category: '咨询服务', count: 180, percentage: 14.4 },
      { category: '运维服务', count: 120, percentage: 9.6 },
      { category: '其他', count: 60, percentage: 4.8 }
    ]
  }

  private async getTimeSeriesData(conditions: any) {
    const data = []
    const now = new Date()
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      data.push({
        date: date.toISOString().split('T')[0],
        count: Math.floor(Math.random() * 20) + 5,
        budget: Math.floor(Math.random() * 50000000) + 10000000
      })
    }
    
    return data
  }

  private async getAnalysisCompletion(query: AnalyticsQuery) {
    const total = 1250
    const completed = 980
    const pending = total - completed
    
    return {
      total,
      completed,
      pending,
      completionRate: (completed / total) * 100
    }
  }

  private async getAverageScores(query: AnalyticsQuery) {
    return {
      overall: 72.5,
      technical: 75.2,
      commercial: 68.8,
      risk: 73.6
    }
  }

  private async getROIDistribution(query: AnalyticsQuery) {
    return [
      { range: '< 10%', count: 120, percentage: 12.2 },
      { range: '10% - 30%', count: 280, percentage: 28.6 },
      { range: '30% - 50%', count: 350, percentage: 35.7 },
      { range: '50% - 100%', count: 180, percentage: 18.4 },
      { range: '> 100%', count: 50, percentage: 5.1 }
    ]
  }

  private async getSuccessPrediction(query: AnalyticsQuery) {
    return {
      high: 280, // 高成功概率
      medium: 520, // 中等成功概率
      low: 180 // 低成功概率
    }
  }

  private async getBidSuccessMetrics(query: AnalyticsQuery) {
    const totalBids = 450
    const successfulBids = 125
    const totalValue = 1200000000 // 12亿
    const wonValue = 380000000 // 3.8亿
    
    return {
      totalBids,
      successfulBids,
      successRate: (successfulBids / totalBids) * 100,
      totalValue,
      wonValue
    }
  }

  private async getRevenueAnalysis(query: AnalyticsQuery) {
    const projectedRevenue = 380000000
    const actualRevenue = 320000000
    
    return {
      projectedRevenue,
      actualRevenue,
      variance: ((actualRevenue - projectedRevenue) / projectedRevenue) * 100,
      monthlyTrend: this.generateMonthlyTrend()
    }
  }

  private async getCostAnalysis(query: AnalyticsQuery) {
    const totalCosts = 280000000
    const projectCount = 125
    
    return {
      totalCosts,
      averageCostPerProject: totalCosts / projectCount,
      costByCategory: [
        { category: '人力成本', amount: 168000000, percentage: 60.0 },
        { category: '技术成本', amount: 56000000, percentage: 20.0 },
        { category: '管理成本', amount: 42000000, percentage: 15.0 },
        { category: '其他成本', amount: 14000000, percentage: 5.0 }
      ]
    }
  }

  private async getProfitabilityMetrics(query: AnalyticsQuery) {
    const revenue = 320000000
    const costs = 280000000
    const grossProfit = revenue - costs
    const netProfit = grossProfit * 0.85 // 扣除税费等
    
    return {
      grossProfit,
      netProfit,
      profitMargin: (netProfit / revenue) * 100,
      roi: (netProfit / costs) * 100
    }
  }

  private async getDashboardSummary(today: Date, weekAgo: Date, monthAgo: Date) {
    return {
      todayNewProjects: 8,
      weeklyGrowth: 12.5,
      monthlyGrowth: 18.3,
      systemHealth: 'healthy' as const,
      lastUpdateTime: new Date().toISOString()
    }
  }

  private async getQuickStats() {
    return {
      totalProjects: 1250,
      activeAnalyses: 85,
      completedProposals: 320,
      averageROI: 42.8
    }
  }

  private async getSystemAlerts() {
    return [
      {
        type: 'info' as const,
        message: '数据抓取任务正常运行',
        timestamp: new Date().toISOString()
      },
      {
        type: 'warning' as const,
        message: 'API调用频率接近限制',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    ]
  }

  private async getRecentActivity() {
    return [
      {
        type: 'project_added' as const,
        title: '新增AI智能客服系统项目',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        details: { budget: 2000000, area: '北京市' }
      },
      {
        type: 'analysis_completed' as const,
        title: '完成智慧城市项目分析',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        details: { score: 85, roi: 45.2 }
      },
      {
        type: 'proposal_generated' as const,
        title: '生成企业管理系统方案',
        timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        details: { pages: 25, format: 'PDF' }
      }
    ]
  }

  private generateMonthlyTrend() {
    const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    return months.map(month => ({
      month,
      projected: Math.floor(Math.random() * 50000000) + 20000000,
      actual: Math.floor(Math.random() * 45000000) + 18000000
    }))
  }

  /**
   * 获取多维度数据聚合
   */
  async getMultiDimensionalAnalysis(dimensions: string[], metrics: string[], query: AnalyticsQuery = {}) {
    try {
      // 实现多维度数据聚合逻辑
      const result: any = {}
      
      for (const dimension of dimensions) {
        result[dimension] = await this.getDataByDimension(dimension, metrics, query)
      }
      
      return result
    } catch (error) {
      console.error('Multi-dimensional analysis error:', error)
      throw new Error(`多维度分析失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async getDataByDimension(dimension: string, metrics: string[], query: AnalyticsQuery) {
    // 根据维度返回相应的数据
    switch (dimension) {
      case 'area':
        return await this.getAreaDistribution(query)
      case 'category':
        return await this.getCategoryDistribution(query)
      case 'budget':
        return await this.getBudgetDistribution(query)
      case 'time':
        return await this.getTimeSeriesData(query)
      default:
        return []
    }
  }
}