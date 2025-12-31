import {
  ROIAnalysis,
  CostAnalysis,
  BenefitAnalysis,
  calculateROI,
  calculateNPV,
  calculateIRR
} from '../models/cost-benefit'
import { TenderInfo } from '../models/tender'
import { ProjectAnalysis } from '../models/analysis'

export interface ROIPredictionInput {
  tenderInfo: TenderInfo
  costAnalysis: CostAnalysis
  benefitAnalysis: BenefitAnalysis
  projectAnalysis?: ProjectAnalysis
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

export interface ROIPredictionResult {
  baselineROI: ROIAnalysis
  adjustedROI: ROIAnalysis
  confidenceLevel: number // 预测置信度 (0-1)
  keyFactors: Array<{
    factor: string
    impact: number // 对ROI的影响 (-1 到 1)
    confidence: number // 对该因素的信心度 (0-1)
    description: string
  }>
  scenarios: {
    bestCase: {
      roi: number
      probability: number
      conditions: string[]
    }
    worstCase: {
      roi: number
      probability: number
      conditions: string[]
    }
    mostLikely: {
      roi: number
      probability: number
      conditions: string[]
    }
  }
  recommendations: string[]
  riskMitigation: Array<{
    risk: string
    impact: 'HIGH' | 'MEDIUM' | 'LOW'
    mitigation: string
    cost: number // 缓解成本
  }>
}

export class ROIPredictionService {
  private readonly CONFIDENCE_THRESHOLD = 0.7 // 置信度阈值
  private readonly MARKET_IMPACT_WEIGHTS = {
    economicGrowth: 0.2,
    industryGrowth: 0.3,
    competition: 0.25,
    marketMaturity: 0.25
  }

  /**
   * 执行ROI预测分析
   */
  async predictROI(input: ROIPredictionInput): Promise<ROIPredictionResult> {
    try {
      // 1. 计算基准ROI
      const baselineROI = this.calculateBaselineROI(input.costAnalysis, input.benefitAnalysis)
      
      // 2. 分析关键影响因素
      const keyFactors = this.analyzeKeyFactors(input)
      
      // 3. 根据市场条件调整ROI
      const adjustedROI = this.adjustROIForMarketConditions(baselineROI, input, keyFactors)
      
      // 4. 计算预测置信度
      const confidenceLevel = this.calculateConfidenceLevel(input, keyFactors)
      
      // 5. 生成情景分析
      const scenarios = this.generateScenarios(adjustedROI, input, keyFactors)
      
      // 6. 生成建议和风险缓解措施
      const recommendations = this.generateRecommendations(adjustedROI, keyFactors, confidenceLevel)
      const riskMitigation = this.generateRiskMitigation(input, keyFactors)

      return {
        baselineROI,
        adjustedROI,
        confidenceLevel,
        keyFactors,
        scenarios,
        recommendations,
        riskMitigation
      }
    } catch (error) {
      console.error('ROI prediction error:', error)
      throw new Error(`ROI预测失败: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 计算基准ROI（不考虑外部因素）
   */
  private calculateBaselineROI(costAnalysis: CostAnalysis, benefitAnalysis: BenefitAnalysis): ROIAnalysis {
    const baseROI = calculateROI(benefitAnalysis.totalBenefit, costAnalysis.totalCost)
    
    return {
      optimistic: baseROI * 1.3,
      neutral: baseROI,
      pessimistic: baseROI * 0.7,
      breakEvenPoint: this.calculateBreakEvenPoint(costAnalysis, benefitAnalysis),
      scenarios: {
        optimistic: {
          revenue: benefitAnalysis.totalBenefit * 1.3,
          costs: costAnalysis.totalCost * 0.9,
          probability: 0.2,
          assumptions: [
            '项目超预期完成',
            '市场反应积极',
            '技术实现顺利',
            '客户满意度高'
          ]
        },
        neutral: {
          revenue: benefitAnalysis.totalBenefit,
          costs: costAnalysis.totalCost,
          probability: 0.6,
          assumptions: [
            '项目按计划完成',
            '正常市场反应',
            '预期技术实现',
            '标准客户满意度'
          ]
        },
        pessimistic: {
          revenue: benefitAnalysis.totalBenefit * 0.7,
          costs: costAnalysis.totalCost * 1.2,
          probability: 0.2,
          assumptions: [
            '项目遇到困难',
            '市场反应冷淡',
            '技术实现困难',
            '客户满意度低'
          ]
        }
      },
      sensitivityAnalysis: [
        {
          factor: '项目预算',
          impact: 0.8,
          description: '预算变化对ROI影响最大'
        },
        {
          factor: '市场需求',
          impact: 0.6,
          description: '市场需求影响收益实现'
        },
        {
          factor: '技术风险',
          impact: 0.5,
          description: '技术风险影响成本和进度'
        },
        {
          factor: '竞争环境',
          impact: 0.4,
          description: '竞争影响市场份额'
        }
      ]
    }
  }

  /**
   * 分析关键影响因素
   */
  private analyzeKeyFactors(input: ROIPredictionInput): Array<{
    factor: string
    impact: number
    confidence: number
    description: string
  }> {
    const factors = []

    // 1. 项目规模因素
    const budget = input.tenderInfo.budget || 0
    if (budget > 5000000) {
      factors.push({
        factor: '大型项目规模',
        impact: 0.2,
        confidence: 0.9,
        description: '大型项目通常有更好的规模效应和品牌价值'
      })
    } else if (budget < 500000) {
      factors.push({
        factor: '小型项目规模',
        impact: -0.1,
        confidence: 0.8,
        description: '小型项目规模效应有限，但风险较低'
      })
    }

    // 2. 客户类型因素
    const purchaser = input.tenderInfo.purchaser?.toLowerCase() || ''
    if (purchaser.includes('银行') || purchaser.includes('金融')) {
      factors.push({
        factor: '金融行业客户',
        impact: 0.3,
        confidence: 0.85,
        description: '金融行业客户通常有更高的付费能力和后续合作机会'
      })
    } else if (purchaser.includes('政府') || purchaser.includes('委员会')) {
      factors.push({
        factor: '政府客户',
        impact: 0.15,
        confidence: 0.75,
        description: '政府项目稳定性高，但利润率相对较低'
      })
    }

    // 3. 技术复杂度因素
    const title = input.tenderInfo.title.toLowerCase()
    const description = input.tenderInfo.description?.toLowerCase() || ''
    
    if (this.containsAIKeywords(title + ' ' + description)) {
      factors.push({
        factor: 'AI技术项目',
        impact: 0.4,
        confidence: 0.7,
        description: 'AI项目技术价值高，但实现风险也较大'
      })
    }

    if (this.containsCloudKeywords(title + ' ' + description)) {
      factors.push({
        factor: '云计算项目',
        impact: 0.25,
        confidence: 0.8,
        description: '云计算项目市场需求旺盛，技术相对成熟'
      })
    }

    // 4. 市场条件因素
    if (input.marketConditions) {
      const { economicGrowthRate, industryGrowthRate, competitionLevel, marketMaturity } = input.marketConditions

      if (economicGrowthRate && economicGrowthRate > 0.06) {
        factors.push({
          factor: '经济增长良好',
          impact: 0.15,
          confidence: 0.6,
          description: '良好的经济环境有利于项目收益实现'
        })
      }

      if (industryGrowthRate && industryGrowthRate > 0.1) {
        factors.push({
          factor: '行业快速增长',
          impact: 0.2,
          confidence: 0.7,
          description: '行业快速增长带来更多机会'
        })
      }

      if (competitionLevel === 'HIGH') {
        factors.push({
          factor: '激烈竞争环境',
          impact: -0.2,
          confidence: 0.8,
          description: '激烈竞争可能压缩利润空间'
        })
      }

      if (marketMaturity === 'EMERGING') {
        factors.push({
          factor: '新兴市场',
          impact: 0.3,
          confidence: 0.6,
          description: '新兴市场机会大但不确定性高'
        })
      }
    }

    // 5. 历史数据因素
    if (input.historicalData) {
      const { similarProjectsROI, clientSatisfactionRate, projectSuccessRate } = input.historicalData

      if (similarProjectsROI && similarProjectsROI.length > 0) {
        const avgHistoricalROI = similarProjectsROI.reduce((sum, roi) => sum + roi, 0) / similarProjectsROI.length
        if (avgHistoricalROI > 30) {
          factors.push({
            factor: '历史项目表现优秀',
            impact: 0.25,
            confidence: 0.9,
            description: '类似项目的优秀历史表现增强信心'
          })
        }
      }

      if (clientSatisfactionRate && clientSatisfactionRate > 0.85) {
        factors.push({
          factor: '高客户满意度',
          impact: 0.2,
          confidence: 0.85,
          description: '高客户满意度有利于后续合作'
        })
      }

      if (projectSuccessRate && projectSuccessRate < 0.7) {
        factors.push({
          factor: '项目成功率偏低',
          impact: -0.3,
          confidence: 0.8,
          description: '历史项目成功率偏低增加风险'
        })
      }
    }

    return factors
  }

  /**
   * 根据市场条件调整ROI
   */
  private adjustROIForMarketConditions(
    baselineROI: ROIAnalysis,
    input: ROIPredictionInput,
    keyFactors: Array<{ factor: string; impact: number; confidence: number; description: string }>
  ): ROIAnalysis {
    // 计算总体调整因子
    const totalImpact = keyFactors.reduce((sum, factor) => sum + factor.impact * factor.confidence, 0)
    const adjustmentFactor = 1 + totalImpact

    // 调整ROI值
    const adjustedROI = { ...baselineROI }
    adjustedROI.optimistic = baselineROI.optimistic * adjustmentFactor
    adjustedROI.neutral = baselineROI.neutral * adjustmentFactor
    adjustedROI.pessimistic = baselineROI.pessimistic * adjustmentFactor

    // 调整情景分析
    adjustedROI.scenarios.optimistic.revenue *= adjustmentFactor
    adjustedROI.scenarios.neutral.revenue *= adjustmentFactor
    adjustedROI.scenarios.pessimistic.revenue *= adjustmentFactor

    // 重新计算ROI
    adjustedROI.scenarios.optimistic.probability = Math.min(0.3, baselineROI.scenarios.optimistic.probability * adjustmentFactor)
    adjustedROI.scenarios.pessimistic.probability = Math.max(0.1, baselineROI.scenarios.pessimistic.probability / adjustmentFactor)
    adjustedROI.scenarios.neutral.probability = 1 - adjustedROI.scenarios.optimistic.probability - adjustedROI.scenarios.pessimistic.probability

    return adjustedROI
  }

  /**
   * 计算预测置信度
   */
  private calculateConfidenceLevel(
    input: ROIPredictionInput,
    keyFactors: Array<{ factor: string; impact: number; confidence: number; description: string }>
  ): number {
    let confidenceScore = 0.5 // 基础置信度

    // 基于数据完整性调整
    if (input.projectAnalysis) confidenceScore += 0.1
    if (input.marketConditions) confidenceScore += 0.1
    if (input.historicalData) confidenceScore += 0.15

    // 基于关键因素的平均置信度调整
    if (keyFactors.length > 0) {
      const avgFactorConfidence = keyFactors.reduce((sum, factor) => sum + factor.confidence, 0) / keyFactors.length
      confidenceScore += (avgFactorConfidence - 0.5) * 0.3
    }

    // 基于项目复杂度调整（复杂度越高，置信度越低）
    const budget = input.tenderInfo.budget || 0
    if (budget > 10000000) confidenceScore -= 0.1 // 超大项目不确定性高
    if (budget < 500000) confidenceScore += 0.05 // 小项目相对确定

    return Math.max(0.1, Math.min(0.95, confidenceScore))
  }

  /**
   * 生成情景分析
   */
  private generateScenarios(
    adjustedROI: ROIAnalysis,
    input: ROIPredictionInput,
    keyFactors: Array<{ factor: string; impact: number; confidence: number; description: string }>
  ) {
    return {
      bestCase: {
        roi: adjustedROI.optimistic,
        probability: adjustedROI.scenarios.optimistic.probability,
        conditions: [
          '所有关键成功因素都实现',
          '市场环境持续向好',
          '技术实现超出预期',
          '客户关系发展良好',
          ...keyFactors.filter(f => f.impact > 0.2).map(f => f.description)
        ]
      },
      worstCase: {
        roi: adjustedROI.pessimistic,
        probability: adjustedROI.scenarios.pessimistic.probability,
        conditions: [
          '多个风险因素同时发生',
          '市场环境恶化',
          '技术实现遇到重大困难',
          '客户满意度不达预期',
          ...keyFactors.filter(f => f.impact < -0.1).map(f => f.description)
        ]
      },
      mostLikely: {
        roi: adjustedROI.neutral,
        probability: adjustedROI.scenarios.neutral.probability,
        conditions: [
          '项目按计划正常推进',
          '市场环境保持稳定',
          '技术实现符合预期',
          '客户满意度达到标准',
          '大部分关键因素表现正常'
        ]
      }
    }
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    adjustedROI: ROIAnalysis,
    keyFactors: Array<{ factor: string; impact: number; confidence: number; description: string }>,
    confidenceLevel: number
  ): string[] {
    const recommendations = []

    // 基于ROI水平的建议
    if (adjustedROI.neutral > 50) {
      recommendations.push('项目ROI预测优秀，强烈建议参与投标')
    } else if (adjustedROI.neutral > 25) {
      recommendations.push('项目ROI预测良好，建议积极参与投标')
    } else if (adjustedROI.neutral > 10) {
      recommendations.push('项目ROI预测一般，建议谨慎评估后决定')
    } else {
      recommendations.push('项目ROI预测较低，不建议参与投标')
    }

    // 基于置信度的建议
    if (confidenceLevel < 0.5) {
      recommendations.push('预测置信度较低，建议收集更多信息后重新评估')
    } else if (confidenceLevel > 0.8) {
      recommendations.push('预测置信度较高，可以基于此分析制定投标策略')
    }

    // 基于关键因素的建议
    const positiveFactors = keyFactors.filter(f => f.impact > 0.2)
    const negativeFactors = keyFactors.filter(f => f.impact < -0.1)

    if (positiveFactors.length > 0) {
      recommendations.push(`重点关注并发挥优势因素：${positiveFactors.map(f => f.factor).join('、')}`)
    }

    if (negativeFactors.length > 0) {
      recommendations.push(`需要重点关注和缓解风险因素：${negativeFactors.map(f => f.factor).join('、')}`)
    }

    // 基于情景分析的建议
    if (adjustedROI.scenarios.pessimistic.probability > 0.3) {
      recommendations.push('悲观情况概率较高，建议制定详细的风险应对预案')
    }

    if (adjustedROI.scenarios.optimistic.probability > 0.25) {
      recommendations.push('乐观情况有一定概率，可以考虑适当提高投标报价')
    }

    return recommendations
  }

  /**
   * 生成风险缓解措施
   */
  private generateRiskMitigation(
    input: ROIPredictionInput,
    keyFactors: Array<{ factor: string; impact: number; confidence: number; description: string }>
  ): Array<{ risk: string; impact: 'HIGH' | 'MEDIUM' | 'LOW'; mitigation: string; cost: number }> {
    const riskMitigation = []

    // 技术风险缓解
    if (this.containsAIKeywords(input.tenderInfo.title + ' ' + (input.tenderInfo.description || ''))) {
      riskMitigation.push({
        risk: 'AI技术实现风险',
        impact: 'HIGH',
        mitigation: '组建资深AI团队，进行技术预研，建立技术储备',
        cost: (input.tenderInfo.budget || 0) * 0.05
      })
    }

    // 市场风险缓解
    const negativeMarketFactors = keyFactors.filter(f => f.factor.includes('竞争') && f.impact < 0)
    if (negativeMarketFactors.length > 0) {
      riskMitigation.push({
        risk: '市场竞争风险',
        impact: 'MEDIUM',
        mitigation: '差异化定位，提升技术优势，建立客户粘性',
        cost: (input.tenderInfo.budget || 0) * 0.03
      })
    }

    // 项目管理风险缓解
    const budget = input.tenderInfo.budget || 0
    if (budget > 5000000) {
      riskMitigation.push({
        risk: '大型项目管理风险',
        impact: 'HIGH',
        mitigation: '建立专业项目管理团队，采用敏捷开发方法，分阶段交付',
        cost: budget * 0.02
      })
    }

    // 客户关系风险缓解
    riskMitigation.push({
      risk: '客户满意度风险',
      impact: 'MEDIUM',
      mitigation: '建立定期沟通机制，及时响应客户需求，提供优质服务',
      cost: budget * 0.01
    })

    // 财务风险缓解
    if (input.costAnalysis && input.costAnalysis.totalCost > budget * 0.9) {
      riskMitigation.push({
        risk: '成本超支风险',
        impact: 'HIGH',
        mitigation: '严格成本控制，建立预警机制，优化资源配置',
        cost: budget * 0.015
      })
    }

    return riskMitigation
  }

  // 辅助方法
  private calculateBreakEvenPoint(costAnalysis: CostAnalysis, benefitAnalysis: BenefitAnalysis): number {
    const monthlyRevenue = benefitAnalysis.directRevenue / 12 // 假设12个月项目周期
    const monthlyCost = costAnalysis.totalCost / 12
    
    if (monthlyRevenue <= monthlyCost) {
      return 12 // 如果月收益不超过月成本，则需要整个项目周期
    }
    
    return costAnalysis.totalCost / (monthlyRevenue - monthlyCost)
  }

  private containsAIKeywords(text: string): boolean {
    const aiKeywords = ['ai', '人工智能', '机器学习', '深度学习', '神经网络', '自然语言', 'nlp', '计算机视觉', '智能']
    return aiKeywords.some(keyword => text.includes(keyword))
  }

  private containsCloudKeywords(text: string): boolean {
    const cloudKeywords = ['云计算', '云平台', '云服务', 'saas', 'paas', 'iaas', '微服务', '容器', 'docker', 'kubernetes']
    return cloudKeywords.some(keyword => text.includes(keyword))
  }
}