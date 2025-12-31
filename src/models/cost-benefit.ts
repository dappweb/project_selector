// 成本分析模型
export interface CostAnalysis {
  laborCost: number // 人力成本
  technologyCost: number // 技术成本
  managementCost: number // 管理成本
  riskCost: number // 风险成本
  totalCost: number // 总成本
  costBreakdown: {
    directCosts: number // 直接成本
    indirectCosts: number // 间接成本
    fixedCosts: number // 固定成本
    variableCosts: number // 可变成本
  }
  costByPhase: Array<{
    phase: string
    cost: number
    percentage: number
  }> // 按阶段分解的成本
}

// 收益分析模型
export interface BenefitAnalysis {
  directRevenue: number // 直接收入
  futureOpportunities: number // 未来机会价值
  technologyValue: number // 技术积累价值
  brandValue: number // 品牌价值
  totalBenefit: number // 总收益
  benefitBreakdown: {
    immediateRevenue: number // 即时收入
    recurringRevenue: number // 持续收入
    strategicValue: number // 战略价值
    marketExpansion: number // 市场扩展价值
  }
  benefitTimeline: Array<{
    period: string // 时期（如：第1年、第2年）
    benefit: number // 该时期收益
    cumulative: number // 累计收益
  }>
}

// ROI分析模型
export interface ROIAnalysis {
  optimistic: number // 乐观情况ROI
  neutral: number // 中性情况ROI
  pessimistic: number // 悲观情况ROI
  breakEvenPoint: number // 盈亏平衡点（月数）
  scenarios: {
    optimistic: {
      revenue: number
      costs: number
      probability: number // 发生概率
      assumptions: string[] // 假设条件
    }
    neutral: {
      revenue: number
      costs: number
      probability: number
      assumptions: string[]
    }
    pessimistic: {
      revenue: number
      costs: number
      probability: number
      assumptions: string[]
    }
  }
  sensitivityAnalysis: Array<{
    factor: string // 影响因素
    impact: number // 对ROI的影响程度
    description: string
  }>
}

// 月度现金流模型
export interface MonthlyFlow {
  month: number // 月份
  income: number // 收入
  expense: number // 支出
  netFlow: number // 净现金流
  cumulativeFlow: number // 累计现金流
  milestones: string[] // 该月里程碑
}

// 现金流分析模型
export interface CashFlowAnalysis {
  monthlyFlow: MonthlyFlow[] // 月度现金流
  peakFunding: number // 最大资金需求
  paybackPeriod: number // 回收期（月）
  netPresentValue: number // 净现值
  internalRateOfReturn: number // 内部收益率
  cashFlowSummary: {
    totalInflow: number // 总流入
    totalOutflow: number // 总流出
    netCashFlow: number // 净现金流
    averageMonthlyFlow: number // 平均月现金流
  }
  riskFactors: Array<{
    factor: string
    impact: 'HIGH' | 'MEDIUM' | 'LOW'
    mitigation: string
  }>
}

// 财务指标模型
export interface FinancialMetrics {
  profitMargin: number // 利润率
  returnOnInvestment: number // 投资回报率
  costEfficiencyRatio: number // 成本效率比
  revenueGrowthRate: number // 收入增长率
  costVariancePercentage: number // 成本偏差百分比
  budgetUtilizationRate: number // 预算利用率
}

// 验证函数
export function validateCostAnalysis(data: any): data is CostAnalysis {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.laborCost === 'number' &&
    typeof data.technologyCost === 'number' &&
    typeof data.managementCost === 'number' &&
    typeof data.riskCost === 'number' &&
    typeof data.totalCost === 'number' &&
    typeof data.costBreakdown === 'object' &&
    Array.isArray(data.costByPhase)
  )
}

export function validateBenefitAnalysis(data: any): data is BenefitAnalysis {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.directRevenue === 'number' &&
    typeof data.futureOpportunities === 'number' &&
    typeof data.technologyValue === 'number' &&
    typeof data.brandValue === 'number' &&
    typeof data.totalBenefit === 'number' &&
    typeof data.benefitBreakdown === 'object' &&
    Array.isArray(data.benefitTimeline)
  )
}

export function validateROIAnalysis(data: any): data is ROIAnalysis {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.optimistic === 'number' &&
    typeof data.neutral === 'number' &&
    typeof data.pessimistic === 'number' &&
    typeof data.breakEvenPoint === 'number' &&
    typeof data.scenarios === 'object' &&
    Array.isArray(data.sensitivityAnalysis)
  )
}

export function validateMonthlyFlow(data: any): data is MonthlyFlow {
  return (
    typeof data === 'object' &&
    data !== null &&
    typeof data.month === 'number' &&
    typeof data.income === 'number' &&
    typeof data.expense === 'number' &&
    typeof data.netFlow === 'number' &&
    typeof data.cumulativeFlow === 'number' &&
    Array.isArray(data.milestones)
  )
}

export function validateCashFlowAnalysis(data: any): data is CashFlowAnalysis {
  return (
    typeof data === 'object' &&
    data !== null &&
    Array.isArray(data.monthlyFlow) &&
    data.monthlyFlow.every(validateMonthlyFlow) &&
    typeof data.peakFunding === 'number' &&
    typeof data.paybackPeriod === 'number' &&
    typeof data.netPresentValue === 'number' &&
    typeof data.internalRateOfReturn === 'number' &&
    typeof data.cashFlowSummary === 'object'
  )
}

// 创建默认成本分析
export function createDefaultCostAnalysis(): CostAnalysis {
  return {
    laborCost: 0,
    technologyCost: 0,
    managementCost: 0,
    riskCost: 0,
    totalCost: 0,
    costBreakdown: {
      directCosts: 0,
      indirectCosts: 0,
      fixedCosts: 0,
      variableCosts: 0
    },
    costByPhase: []
  }
}

// 创建默认收益分析
export function createDefaultBenefitAnalysis(): BenefitAnalysis {
  return {
    directRevenue: 0,
    futureOpportunities: 0,
    technologyValue: 0,
    brandValue: 0,
    totalBenefit: 0,
    benefitBreakdown: {
      immediateRevenue: 0,
      recurringRevenue: 0,
      strategicValue: 0,
      marketExpansion: 0
    },
    benefitTimeline: []
  }
}

// 创建默认ROI分析
export function createDefaultROIAnalysis(): ROIAnalysis {
  return {
    optimistic: 0,
    neutral: 0,
    pessimistic: 0,
    breakEvenPoint: 0,
    scenarios: {
      optimistic: {
        revenue: 0,
        costs: 0,
        probability: 0.2,
        assumptions: []
      },
      neutral: {
        revenue: 0,
        costs: 0,
        probability: 0.6,
        assumptions: []
      },
      pessimistic: {
        revenue: 0,
        costs: 0,
        probability: 0.2,
        assumptions: []
      }
    },
    sensitivityAnalysis: []
  }
}

// 创建默认现金流分析
export function createDefaultCashFlowAnalysis(): CashFlowAnalysis {
  return {
    monthlyFlow: [],
    peakFunding: 0,
    paybackPeriod: 0,
    netPresentValue: 0,
    internalRateOfReturn: 0,
    cashFlowSummary: {
      totalInflow: 0,
      totalOutflow: 0,
      netCashFlow: 0,
      averageMonthlyFlow: 0
    },
    riskFactors: []
  }
}

// 计算ROI
export function calculateROI(revenue: number, cost: number): number {
  if (cost === 0) return 0
  return ((revenue - cost) / cost) * 100
}

// 计算盈亏平衡点
export function calculateBreakEvenPoint(
  fixedCosts: number,
  variableCostPerUnit: number,
  pricePerUnit: number
): number {
  const contributionMargin = pricePerUnit - variableCostPerUnit
  if (contributionMargin <= 0) return Infinity
  return fixedCosts / contributionMargin
}

// 计算净现值
export function calculateNPV(
  cashFlows: number[],
  discountRate: number,
  initialInvestment: number
): number {
  let npv = -initialInvestment
  
  for (let i = 0; i < cashFlows.length; i++) {
    const cashFlow = cashFlows[i]
    if (cashFlow !== undefined) {
      npv += cashFlow / Math.pow(1 + discountRate, i + 1)
    }
  }
  
  return npv
}

// 计算内部收益率（简化版本）
export function calculateIRR(cashFlows: number[], initialGuess: number = 0.1): number {
  // 使用牛顿法求解IRR
  let rate = initialGuess
  const maxIterations = 100
  const tolerance = 0.0001
  
  // 确保现金流数组不为空
  if (cashFlows.length === 0) {
    return 0
  }
  
  for (let i = 0; i < maxIterations; i++) {
    const initialCashFlow = cashFlows[0]
    if (initialCashFlow === undefined) {
      break
    }
    
    let npv = -initialCashFlow // 初始投资（负值）
    let derivative = 0
    
    for (let j = 1; j < cashFlows.length; j++) {
      const cashFlow = cashFlows[j]
      if (cashFlow !== undefined) {
        const factor = Math.pow(1 + rate, j)
        npv += cashFlow / factor
        derivative -= (j * cashFlow) / Math.pow(1 + rate, j + 1)
      }
    }
    
    if (Math.abs(npv) < tolerance) {
      return rate
    }
    
    if (derivative === 0) {
      break
    }
    
    rate = rate - npv / derivative
  }
  
  return rate
}