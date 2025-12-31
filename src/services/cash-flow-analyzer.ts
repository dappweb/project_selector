import {
  CashFlowAnalysis,
  MonthlyFlow,
  CostAnalysis,
  BenefitAnalysis,
  calculateNPV,
  calculateIRR
} from '../models/cost-benefit'
import { TenderInfo } from '../models/tender'

export interface CashFlowInput {
  tenderInfo: TenderInfo
  costAnalysis: CostAnalysis
  benefitAnalysis: BenefitAnalysis
  projectParameters: {
    duration: number // 项目周期（月）
    paymentSchedule?: PaymentSchedule // 付款计划
    costDistribution?: CostDistribution // 成本分布
    discountRate?: number // 折现率
  }
}

export interface PaymentSchedule {
  type: 'MILESTONE' | 'MONTHLY' | 'CUSTOM' // 付款类型
  milestones?: Array<{
    name: string
    percentage: number // 付款比例
    month: number // 付款月份
    conditions: string[] // 付款条件
  }>
  monthlyPercentage?: number // 月度付款比例
  customSchedule?: Array<{
    month: number
    amount: number
    description: string
  }>
}

export interface CostDistribution {
  type: 'UNIFORM' | 'FRONT_LOADED' | 'BACK_LOADED' | 'CUSTOM' // 成本分布类型
  phases?: Array<{
    name: string
    startMonth: number
    endMonth: number
    costPercentage: number
  }>
  customDistribution?: Array<{
    month: number
    percentage: number
  }>
}

export interface CashFlowResult {
  monthlyFlow: MonthlyFlow[]
  summary: {
    totalInflow: number
    totalOutflow: number
    netCashFlow: number
    peakFunding: number // 最大资金需求
    paybackPeriod: number // 回收期（月）
    averageMonthlyFlow: number
  }
  financialMetrics: {
    netPresentValue: number
    internalRateOfReturn: number
    profitabilityIndex: number // 盈利指数
    discountedPaybackPeriod: number // 折现回收期
  }
  riskAnalysis: {
    cashFlowVolatility: number // 现金流波动性
    liquidityRisk: 'LOW' | 'MEDIUM' | 'HIGH' // 流动性风险
    fundingGap: number // 资金缺口
    riskFactors: Array<{
      factor: string
      impact: 'HIGH' | 'MEDIUM' | 'LOW'
      description: string
      mitigation: string
    }>
  }
  scenarios: {
    optimistic: CashFlowScenario
    neutral: CashFlowScenario
    pessimistic: CashFlowScenario
  }
  recommendations: string[]
}

export interface CashFlowScenario {
  name: string
  probability: number
  monthlyFlow: MonthlyFlow[]
  netPresentValue: number
  paybackPeriod: number
  peakFunding: number
  assumptions: string[]
}

export class CashFlowAnalyzer {
  private readonly DEFAULT_DISCOUNT_RATE = 0.08 // 8%年折现率
  private readonly MONTHLY_DISCOUNT_RATE = 0.08 / 12 // 月折现率

  /**
   * 执行现金流分析
   */
  async analyzeCashFlow(input: CashFlowInput): Promise<CashFlowResult> {
    try {
      // 1. 生成基础现金流
      const monthlyFlow = this.generateMonthlyFlow(input)
      
      // 2. 计算现金流摘要
      const summary = this.calculateSummary(monthlyFlow)
      
      // 3. 计算财务指标
      const financialMetrics = this.calculateFinancialMetrics(monthlyFlow, input.projectParameters.discountRate)
      
      // 4. 分析风险
      const riskAnalysis = this.analyzeRisk(monthlyFlow, input)
      
      // 5. 生成情景分析
      const scenarios = this.generateScenarios(input)
      
      // 6. 生成建议
      const recommendations = this.generateRecommendations(summary, financialMetrics, riskAnalysis)

      return {
        monthlyFlow,
        summary,
        financialMetrics,
        riskAnalysis,
        scenarios,
        recommendations
      }
    } catch (error) {
      console.error('Cash flow analysis error:', error)
      throw new Error(`现金流分析失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 生成月度现金流
   */
  private generateMonthlyFlow(input: CashFlowInput): MonthlyFlow[] {
    const { duration } = input.projectParameters
    const monthlyFlow: MonthlyFlow[] = []
    
    // 生成收入流
    const incomeFlow = this.generateIncomeFlow(input)
    
    // 生成支出流
    const expenseFlow = this.generateExpenseFlow(input)
    
    let cumulativeFlow = 0
    
    for (let month = 1; month <= duration; month++) {
      const income = incomeFlow[month - 1] || 0
      const expense = expenseFlow[month - 1] || 0
      const netFlow = income - expense
      cumulativeFlow += netFlow
      
      const milestones = this.getMilestones(month, duration, input.projectParameters.paymentSchedule)
      
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

  /**
   * 生成收入流
   */
  private generateIncomeFlow(input: CashFlowInput): number[] {
    const { duration, paymentSchedule } = input.projectParameters
    const totalRevenue = input.benefitAnalysis.directRevenue
    const incomeFlow = new Array(duration).fill(0)
    
    if (!paymentSchedule || paymentSchedule.type === 'MONTHLY') {
      // 月度均匀付款
      const monthlyPayment = totalRevenue / duration
      incomeFlow.fill(monthlyPayment)
    } else if (paymentSchedule.type === 'MILESTONE') {
      // 里程碑付款
      if (paymentSchedule.milestones) {
        paymentSchedule.milestones.forEach(milestone => {
          const amount = totalRevenue * (milestone.percentage / 100)
          const monthIndex = milestone.month - 1
          if (monthIndex >= 0 && monthIndex < duration) {
            incomeFlow[monthIndex] += amount
          }
        })
      }
    } else if (paymentSchedule.type === 'CUSTOM') {
      // 自定义付款计划
      if (paymentSchedule.customSchedule) {
        paymentSchedule.customSchedule.forEach(payment => {
          const monthIndex = payment.month - 1
          if (monthIndex >= 0 && monthIndex < duration) {
            incomeFlow[monthIndex] += payment.amount
          }
        })
      }
    }
    
    return incomeFlow
  }

  /**
   * 生成支出流
   */
  private generateExpenseFlow(input: CashFlowInput): number[] {
    const { duration, costDistribution } = input.projectParameters
    const totalCost = input.costAnalysis.totalCost
    const expenseFlow = new Array(duration).fill(0)
    
    if (!costDistribution || costDistribution.type === 'UNIFORM') {
      // 均匀分布
      const monthlyExpense = totalCost / duration
      expenseFlow.fill(monthlyExpense)
    } else if (costDistribution.type === 'FRONT_LOADED') {
      // 前期重载
      this.distributeFrontLoaded(expenseFlow, totalCost, duration)
    } else if (costDistribution.type === 'BACK_LOADED') {
      // 后期重载
      this.distributeBackLoaded(expenseFlow, totalCost, duration)
    } else if (costDistribution.type === 'CUSTOM') {
      // 自定义分布
      if (costDistribution.phases) {
        costDistribution.phases.forEach(phase => {
          const phaseCost = totalCost * (phase.costPercentage / 100)
          const phaseMonths = phase.endMonth - phase.startMonth + 1
          const monthlyPhaseCost = phaseCost / phaseMonths
          
          for (let month = phase.startMonth; month <= phase.endMonth && month <= duration; month++) {
            expenseFlow[month - 1] += monthlyPhaseCost
          }
        })
      } else if (costDistribution.customDistribution) {
        costDistribution.customDistribution.forEach(dist => {
          const monthIndex = dist.month - 1
          if (monthIndex >= 0 && monthIndex < duration) {
            expenseFlow[monthIndex] = totalCost * (dist.percentage / 100)
          }
        })
      }
    }
    
    return expenseFlow
  }

  /**
   * 前期重载分布
   */
  private distributeFrontLoaded(expenseFlow: number[], totalCost: number, duration: number): void {
    // 前50%时间消耗70%成本，后50%时间消耗30%成本
    const frontMonths = Math.ceil(duration * 0.5)
    const backMonths = duration - frontMonths
    
    const frontCost = totalCost * 0.7
    const backCost = totalCost * 0.3
    
    const frontMonthlyCost = frontCost / frontMonths
    const backMonthlyCost = backCost / backMonths
    
    for (let i = 0; i < frontMonths; i++) {
      expenseFlow[i] = frontMonthlyCost
    }
    
    for (let i = frontMonths; i < duration; i++) {
      expenseFlow[i] = backMonthlyCost
    }
  }

  /**
   * 后期重载分布
   */
  private distributeBackLoaded(expenseFlow: number[], totalCost: number, duration: number): void {
    // 前50%时间消耗30%成本，后50%时间消耗70%成本
    const frontMonths = Math.ceil(duration * 0.5)
    const backMonths = duration - frontMonths
    
    const frontCost = totalCost * 0.3
    const backCost = totalCost * 0.7
    
    const frontMonthlyCost = frontCost / frontMonths
    const backMonthlyCost = backCost / backMonths
    
    for (let i = 0; i < frontMonths; i++) {
      expenseFlow[i] = frontMonthlyCost
    }
    
    for (let i = frontMonths; i < duration; i++) {
      expenseFlow[i] = backMonthlyCost
    }
  }

  /**
   * 获取里程碑
   */
  private getMilestones(month: number, duration: number, paymentSchedule?: PaymentSchedule): string[] {
    const milestones: string[] = []
    
    // 默认项目里程碑
    if (month === 1) milestones.push('项目启动')
    if (month === Math.ceil(duration * 0.2)) milestones.push('需求确认')
    if (month === Math.ceil(duration * 0.4)) milestones.push('设计完成')
    if (month === Math.ceil(duration * 0.7)) milestones.push('开发完成')
    if (month === Math.ceil(duration * 0.9)) milestones.push('测试完成')
    if (month === duration) milestones.push('项目交付')
    
    // 付款里程碑
    if (paymentSchedule?.milestones) {
      paymentSchedule.milestones.forEach(milestone => {
        if (milestone.month === month) {
          milestones.push(`付款节点: ${milestone.name} (${milestone.percentage}%)`)
        }
      })
    }
    
    return milestones
  }

  /**
   * 计算现金流摘要
   */
  private calculateSummary(monthlyFlow: MonthlyFlow[]) {
    const totalInflow = monthlyFlow.reduce((sum, flow) => sum + flow.income, 0)
    const totalOutflow = monthlyFlow.reduce((sum, flow) => sum + flow.expense, 0)
    const netCashFlow = totalInflow - totalOutflow
    const peakFunding = Math.min(...monthlyFlow.map(flow => flow.cumulativeFlow))
    const averageMonthlyFlow = netCashFlow / monthlyFlow.length
    
    // 计算回收期
    let paybackPeriod = monthlyFlow.length
    for (let i = 0; i < monthlyFlow.length; i++) {
      if (monthlyFlow[i]?.cumulativeFlow && monthlyFlow[i].cumulativeFlow >= 0) {
        paybackPeriod = i + 1
        break
      }
    }
    
    return {
      totalInflow,
      totalOutflow,
      netCashFlow,
      peakFunding: Math.abs(peakFunding),
      paybackPeriod,
      averageMonthlyFlow
    }
  }

  /**
   * 计算财务指标
   */
  private calculateFinancialMetrics(monthlyFlow: MonthlyFlow[], discountRate?: number) {
    const rate = discountRate || this.DEFAULT_DISCOUNT_RATE
    const monthlyRate = rate / 12
    
    const cashFlows = monthlyFlow.map(flow => flow.netFlow)
    const initialInvestment = Math.abs(Math.min(...monthlyFlow.map(flow => flow.cumulativeFlow)))
    
    // 净现值
    const netPresentValue = calculateNPV(cashFlows, monthlyRate, initialInvestment)
    
    // 内部收益率
    const internalRateOfReturn = calculateIRR(cashFlows) * 100
    
    // 盈利指数
    const presentValueOfCashFlows = cashFlows.reduce((sum, cashFlow, index) => {
      return sum + cashFlow / Math.pow(1 + monthlyRate, index + 1)
    }, 0)
    const profitabilityIndex = initialInvestment > 0 ? presentValueOfCashFlows / initialInvestment : 0
    
    // 折现回收期
    let discountedPaybackPeriod = monthlyFlow.length
    let discountedCumulative = 0
    for (let i = 0; i < monthlyFlow.length; i++) {
      const discountedCashFlow = cashFlows[i] / Math.pow(1 + monthlyRate, i + 1)
      discountedCumulative += discountedCashFlow
      if (discountedCumulative >= initialInvestment) {
        discountedPaybackPeriod = i + 1
        break
      }
    }
    
    return {
      netPresentValue,
      internalRateOfReturn,
      profitabilityIndex,
      discountedPaybackPeriod
    }
  }

  /**
   * 分析风险
   */
  private analyzeRisk(monthlyFlow: MonthlyFlow[], input: CashFlowInput) {
    // 现金流波动性（标准差）
    const netFlows = monthlyFlow.map(flow => flow.netFlow)
    const avgNetFlow = netFlows.reduce((sum, flow) => sum + flow, 0) / netFlows.length
    const variance = netFlows.reduce((sum, flow) => sum + Math.pow(flow - avgNetFlow, 2), 0) / netFlows.length
    const cashFlowVolatility = Math.sqrt(variance)
    
    // 流动性风险评估
    const peakFunding = Math.abs(Math.min(...monthlyFlow.map(flow => flow.cumulativeFlow)))
    const totalRevenue = input.benefitAnalysis.directRevenue
    const fundingRatio = peakFunding / totalRevenue
    
    let liquidityRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    if (fundingRatio > 0.5) liquidityRisk = 'HIGH'
    else if (fundingRatio > 0.3) liquidityRisk = 'MEDIUM'
    
    // 资金缺口
    const fundingGap = peakFunding
    
    // 风险因素
    const riskFactors = []
    
    if (liquidityRisk === 'HIGH') {
      riskFactors.push({
        factor: '高流动性风险',
        impact: 'HIGH' as const,
        description: '项目需要大量前期资金投入',
        mitigation: '寻求项目融资或调整付款计划'
      })
    }
    
    if (cashFlowVolatility > avgNetFlow * 0.5) {
      riskFactors.push({
        factor: '现金流波动大',
        impact: 'MEDIUM' as const,
        description: '月度现金流变化较大，增加管理难度',
        mitigation: '建立现金流预警机制，保持充足现金储备'
      })
    }
    
    // 检查付款集中度风险
    const incomeConcentration = this.checkIncomeConcentration(monthlyFlow)
    if (incomeConcentration > 0.5) {
      riskFactors.push({
        factor: '付款集中度高',
        impact: 'MEDIUM' as const,
        description: '收入过度集中在少数几个月',
        mitigation: '协商分散付款计划，降低集中度风险'
      })
    }
    
    return {
      cashFlowVolatility,
      liquidityRisk,
      fundingGap,
      riskFactors
    }
  }

  /**
   * 检查收入集中度
   */
  private checkIncomeConcentration(monthlyFlow: MonthlyFlow[]): number {
    const totalIncome = monthlyFlow.reduce((sum, flow) => sum + flow.income, 0)
    if (totalIncome === 0) return 0
    
    // 计算最大的3个月收入占总收入的比例
    const incomes = monthlyFlow.map(flow => flow.income).sort((a, b) => b - a)
    const top3Income = incomes.slice(0, 3).reduce((sum, income) => sum + income, 0)
    
    return top3Income / totalIncome
  }

  /**
   * 生成情景分析
   */
  private generateScenarios(input: CashFlowInput) {
    // 乐观情景：收入提前，成本延后
    const optimisticInput = { ...input }
    optimisticInput.benefitAnalysis = { ...input.benefitAnalysis, directRevenue: input.benefitAnalysis.directRevenue * 1.1 }
    optimisticInput.costAnalysis = { ...input.costAnalysis, totalCost: input.costAnalysis.totalCost * 0.95 }
    const optimisticFlow = this.generateMonthlyFlow(optimisticInput)
    
    // 悲观情景：收入延后，成本提前
    const pessimisticInput = { ...input }
    pessimisticInput.benefitAnalysis = { ...input.benefitAnalysis, directRevenue: input.benefitAnalysis.directRevenue * 0.9 }
    pessimisticInput.costAnalysis = { ...input.costAnalysis, totalCost: input.costAnalysis.totalCost * 1.1 }
    const pessimisticFlow = this.generateMonthlyFlow(pessimisticInput)
    
    // 中性情景（基础情景）
    const neutralFlow = this.generateMonthlyFlow(input)
    
    return {
      optimistic: this.createScenario('乐观情景', 0.2, optimisticFlow, [
        '客户付款及时',
        '成本控制良好',
        '项目进展顺利',
        '无重大风险事件'
      ]),
      neutral: this.createScenario('中性情景', 0.6, neutralFlow, [
        '按计划付款',
        '成本符合预期',
        '正常项目进展',
        '风险可控'
      ]),
      pessimistic: this.createScenario('悲观情景', 0.2, pessimisticFlow, [
        '客户付款延迟',
        '成本超支',
        '项目遇到困难',
        '风险事件发生'
      ])
    }
  }

  /**
   * 创建情景
   */
  private createScenario(name: string, probability: number, monthlyFlow: MonthlyFlow[], assumptions: string[]): CashFlowScenario {
    const summary = this.calculateSummary(monthlyFlow)
    const financialMetrics = this.calculateFinancialMetrics(monthlyFlow)
    
    return {
      name,
      probability,
      monthlyFlow,
      netPresentValue: financialMetrics.netPresentValue,
      paybackPeriod: summary.paybackPeriod,
      peakFunding: summary.peakFunding,
      assumptions
    }
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    summary: any,
    financialMetrics: any,
    riskAnalysis: any
  ): string[] {
    const recommendations = []
    
    // 基于NPV的建议
    if (financialMetrics.netPresentValue > 0) {
      recommendations.push('项目净现值为正，从财务角度建议执行')
    } else {
      recommendations.push('项目净现值为负，需要重新评估项目可行性')
    }
    
    // 基于回收期的建议
    if (summary.paybackPeriod <= 12) {
      recommendations.push('项目回收期较短，投资回报较快')
    } else if (summary.paybackPeriod <= 24) {
      recommendations.push('项目回收期适中，需要考虑资金成本')
    } else {
      recommendations.push('项目回收期较长，建议评估长期战略价值')
    }
    
    // 基于资金需求的建议
    if (riskAnalysis.fundingGap > summary.totalInflow * 0.3) {
      recommendations.push('项目需要大量前期资金，建议安排充足的营运资金')
    }
    
    // 基于流动性风险的建议
    if (riskAnalysis.liquidityRisk === 'HIGH') {
      recommendations.push('流动性风险较高，建议：1)争取预付款 2)分阶段付款 3)准备充足资金')
    } else if (riskAnalysis.liquidityRisk === 'MEDIUM') {
      recommendations.push('流动性风险适中，建议建立现金流监控机制')
    }
    
    // 基于盈利指数的建议
    if (financialMetrics.profitabilityIndex > 1.2) {
      recommendations.push('盈利指数较高，项目投资价值良好')
    } else if (financialMetrics.profitabilityIndex < 1) {
      recommendations.push('盈利指数小于1，项目投资价值有限')
    }
    
    // 基于IRR的建议
    if (financialMetrics.internalRateOfReturn > 15) {
      recommendations.push('内部收益率较高，超过一般投资要求')
    } else if (financialMetrics.internalRateOfReturn < 8) {
      recommendations.push('内部收益率较低，可能不如其他投资机会')
    }
    
    return recommendations
  }
}