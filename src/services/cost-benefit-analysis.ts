import {
  CostAnalysis,
  BenefitAnalysis,
  ROIAnalysis,
  CashFlowAnalysis,
  MonthlyFlow,
  FinancialMetrics,
  createDefaultCostAnalysis,
  createDefaultBenefitAnalysis,
  createDefaultROIAnalysis,
  createDefaultCashFlowAnalysis,
  calculateROI,
  calculateBreakEvenPoint,
  calculateNPV,
  calculateIRR
} from '../models/cost-benefit'
import { TenderInfo } from '../models/tender'
import { ProjectAnalysis } from '../models/analysis'
import { ROIPredictionService, ROIPredictionInput } from './roi-prediction'
import { CashFlowAnalyzer, CashFlowInput, PaymentSchedule, CostDistribution } from './cash-flow-analyzer'

export interface CostBenefitInput {
  tenderInfo: TenderInfo
  projectAnalysis?: ProjectAnalysis
  customParameters?: {
    laborRatePerDay?: number // 人日单价
    projectDurationMonths?: number // 项目周期（月）
    teamSize?: number // 团队规模
    technologyComplexity?: 'LOW' | 'MEDIUM' | 'HIGH' // 技术复杂度
    riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' // 风险等级
    discountRate?: number // 折现率
    // ROI预测相关参数
    marketConditions?: {
      economicGrowthRate?: number // 经济增长率
      industryGrowthRate?: number // 行业增长率
      competitionLevel?: 'LOW' | 'MEDIUM' | 'HIGH' // 竞争水平
      marketMaturity?: 'EMERGING' | 'GROWING' | 'MATURE' | 'DECLINING' // 市场成熟度
    }
    historicalData?: {
      similarProjectsROI?: number[] // 类似项目的历史ROI
      clientSatisfactionRate?: number // 客户满意度
      projectSuccessRate?: number // 项目成功率
    }
  }
}

export interface CostBenefitResult {
  costAnalysis: CostAnalysis
  benefitAnalysis: BenefitAnalysis
  roiAnalysis: ROIAnalysis
  cashFlowAnalysis: CashFlowAnalysis
  financialMetrics: FinancialMetrics
  recommendations: string[]
  riskAssessment: {
    level: 'LOW' | 'MEDIUM' | 'HIGH'
    factors: string[]
    mitigation: string[]
  }
  roiPrediction?: {
    confidenceLevel: number
    keyFactors: Array<{
      factor: string
      impact: number
      confidence: number
      description: string
    }>
    scenarios: {
      bestCase: { roi: number; probability: number; conditions: string[] }
      worstCase: { roi: number; probability: number; conditions: string[] }
      mostLikely: { roi: number; probability: number; conditions: string[] }
    }
    enhancedRecommendations: string[]
  }
}

export class CostBenefitAnalysisService {
  private readonly DEFAULT_LABOR_RATE = 800 // 默认人日单价（元）
  private readonly DEFAULT_DISCOUNT_RATE = 0.08 // 默认折现率8%
  private readonly OVERHEAD_RATE = 0.3 // 管理费用率30%
  private readonly RISK_BUFFER_RATE = 0.15 // 风险缓冲15%
  
  private roiPredictionService: ROIPredictionService
  private cashFlowAnalyzer: CashFlowAnalyzer

  constructor() {
    this.roiPredictionService = new ROIPredictionService()
    this.cashFlowAnalyzer = new CashFlowAnalyzer()
  }

  /**
   * 执行成本收益分析
   */
  async analyzeCostBenefit(input: CostBenefitInput): Promise<CostBenefitResult> {
    try {
      // 解析输入参数
      const params = this.parseInputParameters(input)
      
      // 计算成本分析
      const costAnalysis = this.calculateCostAnalysis(input, params)
      
      // 计算收益分析
      const benefitAnalysis = this.calculateBenefitAnalysis(input, params)
      
      // 计算ROI分析
      const roiAnalysis = this.calculateROIAnalysis(costAnalysis, benefitAnalysis, params)
      
      // 计算现金流分析
      const cashFlowAnalysis = await this.calculateEnhancedCashFlowAnalysis(costAnalysis, benefitAnalysis, params, input)
      
      // 计算财务指标
      const financialMetrics = this.calculateFinancialMetrics(costAnalysis, benefitAnalysis, params)
      
      // 生成建议和风险评估
      const recommendations = this.generateRecommendations(costAnalysis, benefitAnalysis, roiAnalysis)
      const riskAssessment = this.assessRisk(input, costAnalysis, benefitAnalysis)

      // 执行ROI预测分析（如果有足够的数据）
      let roiPrediction
      try {
        const roiPredictionInput: ROIPredictionInput = {
          tenderInfo: input.tenderInfo,
          costAnalysis,
          benefitAnalysis,
          projectAnalysis: input.projectAnalysis,
          marketConditions: input.customParameters?.marketConditions,
          historicalData: input.customParameters?.historicalData
        }
        
        const roiPredictionResult = await this.roiPredictionService.predictROI(roiPredictionInput)
        
        roiPrediction = {
          confidenceLevel: roiPredictionResult.confidenceLevel,
          keyFactors: roiPredictionResult.keyFactors,
          scenarios: roiPredictionResult.scenarios,
          enhancedRecommendations: roiPredictionResult.recommendations
        }
        
        // 使用预测调整后的ROI
        if (roiPredictionResult.adjustedROI) {
          Object.assign(roiAnalysis, roiPredictionResult.adjustedROI)
        }
      } catch (error) {
        console.log('ROI prediction failed, using basic analysis:', error)
      }

      return {
        costAnalysis,
        benefitAnalysis,
        roiAnalysis,
        cashFlowAnalysis,
        financialMetrics,
        recommendations,
        riskAssessment,
        roiPrediction
      }
    } catch (error) {
      console.error('Cost-benefit analysis error:', error)
      throw new Error(`成本收益分析失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 解析输入参数
   */
  private parseInputParameters(input: CostBenefitInput) {
    const custom = input.customParameters || {}
    const budget = input.tenderInfo.budget || 0
    
    return {
      laborRate: custom.laborRatePerDay || this.DEFAULT_LABOR_RATE,
      duration: custom.projectDurationMonths || this.estimateProjectDuration(input.tenderInfo),
      teamSize: custom.teamSize || this.estimateTeamSize(input.tenderInfo),
      complexity: custom.technologyComplexity || this.assessTechnologyComplexity(input.tenderInfo),
      riskLevel: custom.riskLevel || this.assessRiskLevel(input.tenderInfo),
      discountRate: custom.discountRate || this.DEFAULT_DISCOUNT_RATE,
      budget
    }
  }

  /**
   * 计算成本分析
   */
  private calculateCostAnalysis(input: CostBenefitInput, params: any): CostAnalysis {
    const costAnalysis = createDefaultCostAnalysis()
    
    // 人力成本计算
    const workDays = params.duration * 22 // 每月22个工作日
    const totalPersonDays = workDays * params.teamSize
    costAnalysis.laborCost = totalPersonDays * params.laborRate
    
    // 技术成本计算
    const complexityMultiplier = this.getComplexityMultiplier(params.complexity)
    costAnalysis.technologyCost = costAnalysis.laborCost * complexityMultiplier * 0.2
    
    // 管理成本计算
    costAnalysis.managementCost = (costAnalysis.laborCost + costAnalysis.technologyCost) * this.OVERHEAD_RATE
    
    // 风险成本计算
    const riskMultiplier = this.getRiskMultiplier(params.riskLevel)
    costAnalysis.riskCost = (costAnalysis.laborCost + costAnalysis.technologyCost + costAnalysis.managementCost) * riskMultiplier
    
    // 总成本
    costAnalysis.totalCost = costAnalysis.laborCost + costAnalysis.technologyCost + costAnalysis.managementCost + costAnalysis.riskCost
    
    // 成本分解
    costAnalysis.costBreakdown = {
      directCosts: costAnalysis.laborCost + costAnalysis.technologyCost,
      indirectCosts: costAnalysis.managementCost + costAnalysis.riskCost,
      fixedCosts: costAnalysis.managementCost,
      variableCosts: costAnalysis.laborCost + costAnalysis.technologyCost + costAnalysis.riskCost
    }
    
    // 按阶段分解成本
    costAnalysis.costByPhase = this.calculateCostByPhase(costAnalysis.totalCost, params.duration)
    
    return costAnalysis
  }

  /**
   * 计算收益分析
   */
  private calculateBenefitAnalysis(input: CostBenefitInput, params: any): BenefitAnalysis {
    const benefitAnalysis = createDefaultBenefitAnalysis()
    const budget = params.budget
    
    // 直接收入（项目预算）
    benefitAnalysis.directRevenue = budget
    
    // 未来机会价值（基于项目类型和规模）
    benefitAnalysis.futureOpportunities = this.calculateFutureOpportunities(input.tenderInfo, budget)
    
    // 技术积累价值
    benefitAnalysis.technologyValue = this.calculateTechnologyValue(input.tenderInfo, params.complexity)
    
    // 品牌价值
    benefitAnalysis.brandValue = this.calculateBrandValue(input.tenderInfo, budget)
    
    // 总收益
    benefitAnalysis.totalBenefit = benefitAnalysis.directRevenue + benefitAnalysis.futureOpportunities + 
                                   benefitAnalysis.technologyValue + benefitAnalysis.brandValue
    
    // 收益分解
    benefitAnalysis.benefitBreakdown = {
      immediateRevenue: benefitAnalysis.directRevenue,
      recurringRevenue: benefitAnalysis.futureOpportunities * 0.6,
      strategicValue: benefitAnalysis.technologyValue + benefitAnalysis.brandValue,
      marketExpansion: benefitAnalysis.futureOpportunities * 0.4
    }
    
    // 收益时间线
    benefitAnalysis.benefitTimeline = this.calculateBenefitTimeline(benefitAnalysis, params.duration)
    
    return benefitAnalysis
  }

  /**
   * 计算ROI分析
   */
  private calculateROIAnalysis(costAnalysis: CostAnalysis, benefitAnalysis: BenefitAnalysis, params: any): ROIAnalysis {
    const roiAnalysis = createDefaultROIAnalysis()
    
    // 基础ROI计算
    const baseROI = calculateROI(benefitAnalysis.totalBenefit, costAnalysis.totalCost)
    
    // 三种情况的ROI
    roiAnalysis.optimistic = baseROI * 1.3 // 乐观情况增加30%
    roiAnalysis.neutral = baseROI
    roiAnalysis.pessimistic = baseROI * 0.7 // 悲观情况减少30%
    
    // 盈亏平衡点计算
    roiAnalysis.breakEvenPoint = this.calculateBreakEvenMonths(costAnalysis, benefitAnalysis, params.duration)
    
    // 情景分析
    roiAnalysis.scenarios = {
      optimistic: {
        revenue: benefitAnalysis.totalBenefit * 1.3,
        costs: costAnalysis.totalCost * 0.9,
        probability: 0.2,
        assumptions: [
          '项目顺利完成，无重大技术难题',
          '客户满意度高，带来额外业务',
          '团队效率超出预期',
          '技术方案获得市场认可'
        ]
      },
      neutral: {
        revenue: benefitAnalysis.totalBenefit,
        costs: costAnalysis.totalCost,
        probability: 0.6,
        assumptions: [
          '项目按计划完成',
          '成本控制在预算范围内',
          '达到预期的技术目标',
          '正常的市场反应'
        ]
      },
      pessimistic: {
        revenue: benefitAnalysis.totalBenefit * 0.7,
        costs: costAnalysis.totalCost * 1.2,
        probability: 0.2,
        assumptions: [
          '项目遇到技术难题，延期交付',
          '成本超支20%',
          '市场反应不如预期',
          '竞争激烈，利润率下降'
        ]
      }
    }
    
    // 敏感性分析
    roiAnalysis.sensitivityAnalysis = [
      {
        factor: '项目预算',
        impact: 0.8,
        description: '预算变化对ROI影响最大'
      },
      {
        factor: '人力成本',
        impact: 0.6,
        description: '人力成本是主要成本组成'
      },
      {
        factor: '项目周期',
        impact: 0.4,
        description: '周期延长会增加成本'
      },
      {
        factor: '技术复杂度',
        impact: 0.5,
        description: '复杂度影响开发效率'
      },
      {
        factor: '市场竞争',
        impact: 0.3,
        description: '竞争影响未来机会价值'
      }
    ]
    
    return roiAnalysis
  }

  /**
   * 计算现金流分析
   */
  private calculateCashFlowAnalysis(costAnalysis: CostAnalysis, benefitAnalysis: BenefitAnalysis, params: any): CashFlowAnalysis {
    const cashFlowAnalysis = createDefaultCashFlowAnalysis()
    
    // 生成月度现金流
    cashFlowAnalysis.monthlyFlow = this.generateMonthlyFlow(costAnalysis, benefitAnalysis, params.duration)
    
    // 计算关键指标
    const cashFlows = cashFlowAnalysis.monthlyFlow.map(flow => flow.netFlow)
    const totalInflow = cashFlowAnalysis.monthlyFlow.reduce((sum, flow) => sum + flow.income, 0)
    const totalOutflow = cashFlowAnalysis.monthlyFlow.reduce((sum, flow) => sum + flow.expense, 0)
    
    cashFlowAnalysis.peakFunding = Math.min(...cashFlowAnalysis.monthlyFlow.map(flow => flow.cumulativeFlow))
    cashFlowAnalysis.paybackPeriod = this.calculatePaybackPeriod(cashFlowAnalysis.monthlyFlow)
    cashFlowAnalysis.netPresentValue = calculateNPV(cashFlows, params.discountRate, Math.abs(cashFlowAnalysis.peakFunding))
    cashFlowAnalysis.internalRateOfReturn = calculateIRR(cashFlows) * 100
    
    cashFlowAnalysis.cashFlowSummary = {
      totalInflow,
      totalOutflow,
      netCashFlow: totalInflow - totalOutflow,
      averageMonthlyFlow: (totalInflow - totalOutflow) / params.duration
    }
    
    // 风险因素
    cashFlowAnalysis.riskFactors = [
      {
        factor: '客户付款延迟',
        impact: 'HIGH',
        mitigation: '建立付款保证机制，分阶段收款'
      },
      {
        factor: '成本超支',
        impact: 'MEDIUM',
        mitigation: '严格成本控制，建立预警机制'
      },
      {
        factor: '项目延期',
        impact: 'MEDIUM',
        mitigation: '合理安排进度，预留缓冲时间'
      }
    ]
    
    return cashFlowAnalysis
  }

  /**
   * 计算财务指标
   */
  private calculateFinancialMetrics(costAnalysis: CostAnalysis, benefitAnalysis: BenefitAnalysis, params: any): FinancialMetrics {
    const revenue = benefitAnalysis.directRevenue
    const cost = costAnalysis.totalCost
    const profit = revenue - cost
    
    return {
      profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
      returnOnInvestment: calculateROI(revenue, cost),
      costEfficiencyRatio: revenue > 0 ? cost / revenue : 0,
      revenueGrowthRate: this.estimateRevenueGrowthRate(benefitAnalysis),
      costVariancePercentage: 0, // 实际项目中会根据历史数据计算
      budgetUtilizationRate: params.budget > 0 ? (cost / params.budget) * 100 : 0
    }
  }

  /**
   * 计算增强的现金流分析
   */
  private async calculateEnhancedCashFlowAnalysis(
    costAnalysis: CostAnalysis, 
    benefitAnalysis: BenefitAnalysis, 
    params: any,
    input: CostBenefitInput
  ): Promise<CashFlowAnalysis> {
    try {
      // 构建现金流分析输入
      const cashFlowInput: CashFlowInput = {
        tenderInfo: input.tenderInfo,
        costAnalysis,
        benefitAnalysis,
        projectParameters: {
          duration: params.duration,
          discountRate: params.discountRate,
          paymentSchedule: this.createDefaultPaymentSchedule(input.tenderInfo),
          costDistribution: this.createDefaultCostDistribution(input.tenderInfo)
        }
      }

      // 执行现金流分析
      const result = await this.cashFlowAnalyzer.analyzeCashFlow(cashFlowInput)

      // 转换为原有的CashFlowAnalysis格式
      return {
        monthlyFlow: result.monthlyFlow,
        peakFunding: result.summary.peakFunding,
        paybackPeriod: result.summary.paybackPeriod,
        netPresentValue: result.financialMetrics.netPresentValue,
        internalRateOfReturn: result.financialMetrics.internalRateOfReturn,
        cashFlowSummary: {
          totalInflow: result.summary.totalInflow,
          totalOutflow: result.summary.totalOutflow,
          netCashFlow: result.summary.netCashFlow,
          averageMonthlyFlow: result.summary.averageMonthlyFlow
        },
        riskFactors: result.riskAnalysis.riskFactors.map(factor => ({
          factor: factor.factor,
          impact: factor.impact,
          mitigation: factor.mitigation
        }))
      }
    } catch (error) {
      console.log('Enhanced cash flow analysis failed, using basic analysis:', error)
      return this.calculateCashFlowAnalysis(costAnalysis, benefitAnalysis, params)
    }
  }

  /**
   * 创建默认付款计划
   */
  private createDefaultPaymentSchedule(tenderInfo: TenderInfo): PaymentSchedule {
    const budget = tenderInfo.budget || 0
    
    // 根据项目规模确定付款计划
    if (budget > 5000000) {
      // 大型项目：里程碑付款
      return {
        type: 'MILESTONE',
        milestones: [
          { name: '合同签署', percentage: 20, month: 1, conditions: ['合同生效'] },
          { name: '需求确认', percentage: 15, month: 2, conditions: ['需求文档确认'] },
          { name: '设计完成', percentage: 20, month: 4, conditions: ['设计方案通过'] },
          { name: '开发完成', percentage: 25, month: 7, conditions: ['功能开发完成'] },
          { name: '测试通过', percentage: 15, month: 9, conditions: ['测试报告通过'] },
          { name: '项目验收', percentage: 5, month: 10, conditions: ['项目验收通过'] }
        ]
      }
    } else if (budget > 1000000) {
      // 中型项目：分阶段付款
      return {
        type: 'MILESTONE',
        milestones: [
          { name: '项目启动', percentage: 30, month: 1, conditions: ['合同签署'] },
          { name: '中期交付', percentage: 40, month: 4, conditions: ['阶段性成果交付'] },
          { name: '项目完成', percentage: 30, month: 6, conditions: ['项目验收完成'] }
        ]
      }
    } else {
      // 小型项目：月度付款
      return {
        type: 'MONTHLY',
        monthlyPercentage: 100 / 6 // 假设6个月项目周期
      }
    }
  }

  /**
   * 创建默认成本分布
   */
  private createDefaultCostDistribution(tenderInfo: TenderInfo): CostDistribution {
    const title = tenderInfo.title.toLowerCase()
    const description = tenderInfo.description?.toLowerCase() || ''
    
    // 根据项目类型确定成本分布
    if (title.includes('ai') || title.includes('人工智能') || description.includes('机器学习')) {
      // AI项目：前期重载（研发密集）
      return {
        type: 'FRONT_LOADED'
      }
    } else if (title.includes('系统集成') || title.includes('部署') || description.includes('实施')) {
      // 系统集成项目：后期重载（实施密集）
      return {
        type: 'BACK_LOADED'
      }
    } else {
      // 一般项目：按阶段分布
      return {
        type: 'CUSTOM',
        phases: [
          { name: '需求分析', startMonth: 1, endMonth: 2, costPercentage: 15 },
          { name: '系统设计', startMonth: 2, endMonth: 3, costPercentage: 20 },
          { name: '开发实现', startMonth: 3, endMonth: 7, costPercentage: 45 },
          { name: '测试验收', startMonth: 7, endMonth: 9, costPercentage: 15 },
          { name: '部署维护', startMonth: 9, endMonth: 10, costPercentage: 5 }
        ]
      }
    }
  }
  private estimateProjectDuration(tenderInfo: TenderInfo): number {
    const budget = tenderInfo.budget || 0
    if (budget < 500000) return 3 // 3个月
    if (budget < 2000000) return 6 // 6个月
    if (budget < 5000000) return 12 // 12个月
    return 18 // 18个月
  }

  private estimateTeamSize(tenderInfo: TenderInfo): number {
    const budget = tenderInfo.budget || 0
    if (budget < 500000) return 3
    if (budget < 2000000) return 5
    if (budget < 5000000) return 8
    return 12
  }

  private assessTechnologyComplexity(tenderInfo: TenderInfo): 'LOW' | 'MEDIUM' | 'HIGH' {
    const title = tenderInfo.title.toLowerCase()
    const description = tenderInfo.description?.toLowerCase() || ''
    
    const highComplexityKeywords = ['ai', '人工智能', '机器学习', '深度学习', '区块链', '大数据', '云计算']
    const mediumComplexityKeywords = ['系统集成', '数据库', '网络', '安全', '移动应用']
    
    if (highComplexityKeywords.some(keyword => title.includes(keyword) || description.includes(keyword))) {
      return 'HIGH'
    }
    if (mediumComplexityKeywords.some(keyword => title.includes(keyword) || description.includes(keyword))) {
      return 'MEDIUM'
    }
    return 'LOW'
  }

  private assessRiskLevel(tenderInfo: TenderInfo): 'LOW' | 'MEDIUM' | 'HIGH' {
    const budget = tenderInfo.budget || 0
    const complexity = this.assessTechnologyComplexity(tenderInfo)
    
    if (budget > 5000000 || complexity === 'HIGH') return 'HIGH'
    if (budget > 1000000 || complexity === 'MEDIUM') return 'MEDIUM'
    return 'LOW'
  }

  private getComplexityMultiplier(complexity: 'LOW' | 'MEDIUM' | 'HIGH'): number {
    switch (complexity) {
      case 'LOW': return 1.0
      case 'MEDIUM': return 1.3
      case 'HIGH': return 1.6
      default: return 1.0
    }
  }

  private getRiskMultiplier(riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'): number {
    switch (riskLevel) {
      case 'LOW': return 0.05
      case 'MEDIUM': return 0.10
      case 'HIGH': return 0.20
      default: return 0.10
    }
  }

  private calculateCostByPhase(totalCost: number, duration: number) {
    const phases = [
      { phase: '需求分析', percentage: 0.15 },
      { phase: '系统设计', percentage: 0.20 },
      { phase: '开发实现', percentage: 0.45 },
      { phase: '测试验收', percentage: 0.15 },
      { phase: '部署维护', percentage: 0.05 }
    ]
    
    return phases.map(phase => ({
      phase: phase.phase,
      cost: totalCost * phase.percentage,
      percentage: phase.percentage * 100
    }))
  }

  private calculateFutureOpportunities(tenderInfo: TenderInfo, budget: number): number {
    // 基于项目类型和客户类型估算未来机会价值
    const baseValue = budget * 0.3 // 基础30%
    
    // 政府项目通常有更多后续机会
    if (tenderInfo.purchaser?.includes('政府') || tenderInfo.purchaser?.includes('委员会')) {
      return baseValue * 1.5
    }
    
    // 大型企业项目
    if (budget > 2000000) {
      return baseValue * 1.2
    }
    
    return baseValue
  }

  private calculateTechnologyValue(tenderInfo: TenderInfo, complexity: 'LOW' | 'MEDIUM' | 'HIGH'): number {
    const budget = tenderInfo.budget || 0
    const baseValue = budget * 0.1
    
    switch (complexity) {
      case 'HIGH': return baseValue * 2.0
      case 'MEDIUM': return baseValue * 1.5
      case 'LOW': return baseValue * 1.0
      default: return baseValue
    }
  }

  private calculateBrandValue(tenderInfo: TenderInfo, budget: number): number {
    // 品牌价值主要基于客户知名度和项目规模
    const baseValue = budget * 0.05
    
    if (tenderInfo.purchaser?.includes('银行') || tenderInfo.purchaser?.includes('保险')) {
      return baseValue * 2.0 // 金融行业品牌价值高
    }
    
    if (budget > 5000000) {
      return baseValue * 1.5 // 大项目品牌价值高
    }
    
    return baseValue
  }

  private calculateBenefitTimeline(benefitAnalysis: BenefitAnalysis, duration: number) {
    const timeline = []
    const monthlyBenefit = benefitAnalysis.directRevenue / duration
    let cumulative = 0
    
    for (let i = 1; i <= duration + 12; i++) { // 项目期间 + 12个月后续收益
      let benefit = 0
      
      if (i <= duration) {
        // 项目期间的直接收益
        benefit = monthlyBenefit
      } else {
        // 项目后的间接收益
        benefit = (benefitAnalysis.futureOpportunities + benefitAnalysis.technologyValue + benefitAnalysis.brandValue) / 12
      }
      
      cumulative += benefit
      timeline.push({
        period: i <= duration ? `项目第${i}月` : `项目后第${i - duration}月`,
        benefit,
        cumulative
      })
    }
    
    return timeline
  }

  private calculateBreakEvenMonths(costAnalysis: CostAnalysis, benefitAnalysis: BenefitAnalysis, duration: number): number {
    const monthlyCost = costAnalysis.totalCost / duration
    const monthlyRevenue = benefitAnalysis.directRevenue / duration
    
    if (monthlyRevenue <= monthlyCost) {
      return duration // 如果月收益不超过月成本，则需要整个项目周期
    }
    
    return costAnalysis.totalCost / (monthlyRevenue - monthlyCost)
  }

  private generateMonthlyFlow(costAnalysis: CostAnalysis, benefitAnalysis: BenefitAnalysis, duration: number): MonthlyFlow[] {
    const monthlyFlow: MonthlyFlow[] = []
    const monthlyCost = costAnalysis.totalCost / duration
    const monthlyRevenue = benefitAnalysis.directRevenue / duration
    let cumulativeFlow = 0
    
    for (let month = 1; month <= duration; month++) {
      const income = monthlyRevenue
      const expense = monthlyCost
      const netFlow = income - expense
      cumulativeFlow += netFlow
      
      const milestones = this.getMilestones(month, duration)
      
      monthlyFlow.push({
        month,
        income,
        expense,
        netFlow,
        cumulativeFlow,
        milestones
      })
    }
    
    return monthlyFlow
  }

  private getMilestones(month: number, duration: number): string[] {
    const milestones: string[] = []
    
    if (month === 1) milestones.push('项目启动')
    if (month === Math.ceil(duration * 0.2)) milestones.push('需求确认')
    if (month === Math.ceil(duration * 0.4)) milestones.push('设计完成')
    if (month === Math.ceil(duration * 0.8)) milestones.push('开发完成')
    if (month === duration) milestones.push('项目交付')
    
    return milestones
  }

  private calculatePaybackPeriod(monthlyFlow: MonthlyFlow[]): number {
    for (let i = 0; i < monthlyFlow.length; i++) {
      if (monthlyFlow[i]?.cumulativeFlow && monthlyFlow[i].cumulativeFlow >= 0) {
        return i + 1
      }
    }
    return monthlyFlow.length
  }

  private estimateRevenueGrowthRate(benefitAnalysis: BenefitAnalysis): number {
    // 基于未来机会价值估算收入增长率
    const futureValue = benefitAnalysis.futureOpportunities
    const currentValue = benefitAnalysis.directRevenue
    
    if (currentValue === 0) return 0
    return (futureValue / currentValue) * 100
  }

  private generateRecommendations(costAnalysis: CostAnalysis, benefitAnalysis: BenefitAnalysis, roiAnalysis: ROIAnalysis): string[] {
    const recommendations: string[] = []
    
    // 基于ROI的建议
    if (roiAnalysis.neutral > 30) {
      recommendations.push('项目ROI较高，建议积极参与投标')
    } else if (roiAnalysis.neutral > 15) {
      recommendations.push('项目ROI适中，建议评估竞争情况后决定')
    } else {
      recommendations.push('项目ROI较低，建议谨慎考虑或优化成本结构')
    }
    
    // 基于成本结构的建议
    const laborCostRatio = costAnalysis.laborCost / costAnalysis.totalCost
    if (laborCostRatio > 0.7) {
      recommendations.push('人力成本占比较高，建议考虑技术方案优化或外包部分工作')
    }
    
    // 基于风险的建议
    if (costAnalysis.riskCost / costAnalysis.totalCost > 0.15) {
      recommendations.push('项目风险较高，建议制定详细的风险管控措施')
    }
    
    // 基于现金流的建议
    if (roiAnalysis.breakEvenPoint > 12) {
      recommendations.push('回收期较长，建议争取分阶段付款或预付款')
    }
    
    return recommendations
  }

  private assessRisk(input: CostBenefitInput, costAnalysis: CostAnalysis, benefitAnalysis: BenefitAnalysis) {
    const factors: string[] = []
    const mitigation: string[] = []
    
    // 技术风险评估
    const complexity = this.assessTechnologyComplexity(input.tenderInfo)
    if (complexity === 'HIGH') {
      factors.push('技术复杂度高，存在技术实现风险')
      mitigation.push('组建经验丰富的技术团队，进行技术预研')
    }
    
    // 财务风险评估
    const budget = input.tenderInfo.budget || 0
    if (costAnalysis.totalCost > budget * 0.9) {
      factors.push('成本接近预算上限，存在超支风险')
      mitigation.push('严格控制成本，建立成本监控机制')
    }
    
    // 市场风险评估
    if (benefitAnalysis.futureOpportunities > benefitAnalysis.directRevenue * 0.5) {
      factors.push('收益过度依赖未来机会，存在市场风险')
      mitigation.push('保守估计未来收益，关注当前项目价值')
    }
    
    // 确定风险等级
    let level: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    if (factors.length >= 3) level = 'HIGH'
    else if (factors.length >= 2) level = 'MEDIUM'
    
    return { level, factors, mitigation }
  }
}