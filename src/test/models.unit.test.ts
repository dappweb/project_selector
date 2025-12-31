import { describe, it, expect } from 'vitest'
import {
  validateAIClassification,
  validateScoreEvaluation,
  validateCompetitorAnalysis,
  createDefaultAIClassification,
  createDefaultScoreEvaluation,
  createDefaultCompetitorAnalysis
} from '../models/analysis'
import {
  validateTechnicalSolution,
  validateRiskAssessment,
  createDefaultTechnicalSolution,
  createDefaultRiskAssessment,
  calculateRiskScore,
  calculateOverallRiskLevel
} from '../models/proposal'
import {
  validateCostAnalysis,
  validateBenefitAnalysis,
  validateROIAnalysis,
  validateCashFlowAnalysis,
  createDefaultCostAnalysis,
  createDefaultBenefitAnalysis,
  createDefaultROIAnalysis,
  createDefaultCashFlowAnalysis,
  calculateROI,
  calculateBreakEvenPoint,
  calculateNPV,
  calculateIRR
} from '../models/cost-benefit'

describe('Analysis Models Unit Tests', () => {
  describe('AI Classification Model', () => {
    it('should validate correct AI classification data', () => {
      const validData = {
        projectType: 'AI_DEVELOPMENT',
        confidence: 0.85,
        keywords: ['机器学习', '深度学习', 'AI'],
        isAIRelated: true,
        isSoftwareProject: true,
        reasoning: '项目包含AI相关技术栈'
      }
      
      expect(validateAIClassification(validData)).toBe(true)
    })

    it('should reject invalid AI classification data', () => {
      const invalidData = {
        projectType: 'INVALID_TYPE',
        confidence: 1.5, // 超出范围
        keywords: 'not an array',
        isAIRelated: 'not boolean',
        isSoftwareProject: true
      }
      
      expect(validateAIClassification(invalidData)).toBe(false)
    })

    it('should create default AI classification', () => {
      const defaultData = createDefaultAIClassification()
      
      expect(validateAIClassification(defaultData)).toBe(true)
      expect(defaultData.projectType).toBe('OTHER')
      expect(defaultData.confidence).toBe(0)
      expect(defaultData.keywords).toEqual([])
      expect(defaultData.isAIRelated).toBe(false)
      expect(defaultData.isSoftwareProject).toBe(false)
    })
  })

  describe('Score Evaluation Model', () => {
    it('should validate correct score evaluation data', () => {
      const validData = {
        totalScore: 85,
        budgetScore: 90,
        difficultyScore: 70,
        competitionScore: 80,
        matchScore: 95,
        priority: 'HIGH',
        scoreBreakdown: {
          budgetWeight: 0.3,
          difficultyWeight: 0.2,
          competitionWeight: 0.25,
          matchWeight: 0.25
        },
        recommendations: ['建议参与投标', '技术匹配度高']
      }
      
      expect(validateScoreEvaluation(validData)).toBe(true)
    })

    it('should reject invalid score evaluation data', () => {
      const invalidData = {
        totalScore: 150, // 超出范围
        priority: 'INVALID_PRIORITY',
        scoreBreakdown: 'not an object',
        recommendations: 'not an array'
      }
      
      expect(validateScoreEvaluation(invalidData)).toBe(false)
    })

    it('should create default score evaluation', () => {
      const defaultData = createDefaultScoreEvaluation()
      
      expect(validateScoreEvaluation(defaultData)).toBe(true)
      expect(defaultData.totalScore).toBe(0)
      expect(defaultData.priority).toBe('LOW')
      expect(defaultData.recommendations).toEqual([])
    })
  })

  describe('Competitor Analysis Model', () => {
    it('should validate correct competitor analysis data', () => {
      const validData = {
        competitors: [
          {
            name: '竞争对手A',
            strength: 85,
            previousWins: 5,
            estimatedBid: 1500000,
            advantages: ['技术实力强'],
            weaknesses: ['价格较高']
          }
        ],
        competitionLevel: 'HIGH',
        estimatedBidRange: {
          min: 1000000,
          max: 2000000,
          average: 1500000
        },
        marketAnalysis: {
          totalParticipants: 8,
          winProbability: 0.3,
          recommendedStrategy: '差异化竞争'
        },
        recommendations: ['突出技术优势']
      }
      
      expect(validateCompetitorAnalysis(validData)).toBe(true)
    })

    it('should create default competitor analysis', () => {
      const defaultData = createDefaultCompetitorAnalysis()
      
      expect(validateCompetitorAnalysis(defaultData)).toBe(true)
      expect(defaultData.competitors).toEqual([])
      expect(defaultData.competitionLevel).toBe('MEDIUM')
    })
  })
})

describe('Proposal Models Unit Tests', () => {
  describe('Technical Solution Model', () => {
    it('should validate correct technical solution data', () => {
      const validData = {
        architecture: '微服务架构',
        techStack: ['Spring Boot', 'Vue.js', 'MySQL'],
        developmentPlan: [
          {
            name: '需求分析',
            duration: 10,
            deliverables: ['需求文档'],
            resources: 20,
            dependencies: [],
            milestones: ['需求确认']
          }
        ],
        teamStructure: [
          {
            role: '项目经理',
            level: 'SENIOR',
            allocation: 0.5,
            dailyRate: 1500,
            skills: ['项目管理', '沟通协调']
          }
        ],
        timeline: 90,
        riskFactors: ['技术风险'],
        qualityAssurance: {
          testingStrategy: '自动化测试',
          codeReviewProcess: '代码审查',
          qualityMetrics: ['代码覆盖率']
        }
      }
      
      expect(validateTechnicalSolution(validData)).toBe(true)
    })

    it('should create default technical solution', () => {
      const defaultData = createDefaultTechnicalSolution()
      
      expect(validateTechnicalSolution(defaultData)).toBe(true)
      expect(defaultData.architecture).toBe('待设计')
      expect(defaultData.techStack).toEqual([])
      expect(defaultData.timeline).toBe(0)
    })
  })

  describe('Risk Assessment Model', () => {
    it('should validate correct risk assessment data', () => {
      const validData = {
        risks: [
          {
            id: 'RISK_001',
            category: 'TECHNICAL',
            description: '技术实现风险',
            probability: 0.3,
            impact: 0.7,
            severity: 'MEDIUM',
            mitigationStrategy: '技术预研',
            contingencyPlan: '备选方案',
            owner: '技术负责人',
            status: 'IDENTIFIED'
          }
        ],
        overallRiskLevel: 'MEDIUM',
        mitigationStrategies: ['风险监控'],
        riskMatrix: {
          high: 0,
          medium: 1,
          low: 0
        },
        contingencyBudget: 100000,
        riskMonitoringPlan: '每周风险评估'
      }
      
      expect(validateRiskAssessment(validData)).toBe(true)
    })

    it('should calculate risk score correctly', () => {
      const risk = {
        id: 'RISK_001',
        category: 'TECHNICAL' as const,
        description: '技术风险',
        probability: 0.6,
        impact: 0.8,
        severity: 'HIGH' as const,
        mitigationStrategy: '预研',
        contingencyPlan: '备选',
        owner: '技术负责人',
        status: 'IDENTIFIED' as const
      }
      
      const score = calculateRiskScore(risk)
      expect(score).toBe(48) // 0.6 * 0.8 * 100
    })

    it('should calculate overall risk level correctly', () => {
      const risks = [
        { severity: 'HIGH' },
        { severity: 'MEDIUM' },
        { severity: 'LOW' }
      ] as any[]
      
      expect(calculateOverallRiskLevel(risks)).toBe('MEDIUM') // 1/3 = 33% 高风险，应该是MEDIUM
      
      const highRisks = [
        { severity: 'HIGH' },
        { severity: 'HIGH' }
      ] as any[]
      
      expect(calculateOverallRiskLevel(highRisks)).toBe('HIGH') // 100% 高风险
      
      const lowRisks = [
        { severity: 'MEDIUM' },
        { severity: 'LOW' }
      ] as any[]
      
      expect(calculateOverallRiskLevel(lowRisks)).toBe('LOW') // 0% 高风险
    })

    it('should create default risk assessment', () => {
      const defaultData = createDefaultRiskAssessment()
      
      expect(validateRiskAssessment(defaultData)).toBe(true)
      expect(defaultData.risks).toEqual([])
      expect(defaultData.overallRiskLevel).toBe('MEDIUM')
    })
  })
})

describe('Cost-Benefit Models Unit Tests', () => {
  describe('Cost Analysis Model', () => {
    it('should validate correct cost analysis data', () => {
      const validData = {
        laborCost: 800000,
        technologyCost: 100000,
        managementCost: 150000,
        riskCost: 50000,
        totalCost: 1100000,
        costBreakdown: {
          directCosts: 900000,
          indirectCosts: 200000,
          fixedCosts: 300000,
          variableCosts: 800000
        },
        costByPhase: [
          {
            phase: '开发阶段',
            cost: 600000,
            percentage: 0.6
          }
        ]
      }
      
      expect(validateCostAnalysis(validData)).toBe(true)
    })

    it('should create default cost analysis', () => {
      const defaultData = createDefaultCostAnalysis()
      
      expect(validateCostAnalysis(defaultData)).toBe(true)
      expect(defaultData.totalCost).toBe(0)
      expect(defaultData.costByPhase).toEqual([])
    })
  })

  describe('Benefit Analysis Model', () => {
    it('should validate correct benefit analysis data', () => {
      const validData = {
        directRevenue: 1500000,
        futureOpportunities: 500000,
        technologyValue: 200000,
        brandValue: 100000,
        totalBenefit: 2300000,
        benefitBreakdown: {
          immediateRevenue: 1500000,
          recurringRevenue: 300000,
          strategicValue: 300000,
          marketExpansion: 200000
        },
        benefitTimeline: [
          {
            period: '第1年',
            benefit: 1500000,
            cumulative: 1500000
          }
        ]
      }
      
      expect(validateBenefitAnalysis(validData)).toBe(true)
    })

    it('should create default benefit analysis', () => {
      const defaultData = createDefaultBenefitAnalysis()
      
      expect(validateBenefitAnalysis(defaultData)).toBe(true)
      expect(defaultData.totalBenefit).toBe(0)
      expect(defaultData.benefitTimeline).toEqual([])
    })
  })

  describe('ROI Analysis Model', () => {
    it('should validate correct ROI analysis data', () => {
      const validData = {
        optimistic: 150,
        neutral: 100,
        pessimistic: 50,
        breakEvenPoint: 12,
        scenarios: {
          optimistic: {
            revenue: 2500000,
            costs: 1000000,
            probability: 0.2,
            assumptions: ['市场表现良好']
          },
          neutral: {
            revenue: 2000000,
            costs: 1000000,
            probability: 0.6,
            assumptions: ['正常市场条件']
          },
          pessimistic: {
            revenue: 1500000,
            costs: 1000000,
            probability: 0.2,
            assumptions: ['市场竞争激烈']
          }
        },
        sensitivityAnalysis: [
          {
            factor: '市场需求',
            impact: 0.3,
            description: '市场需求变化对ROI的影响'
          }
        ]
      }
      
      expect(validateROIAnalysis(validData)).toBe(true)
    })

    it('should create default ROI analysis', () => {
      const defaultData = createDefaultROIAnalysis()
      
      expect(validateROIAnalysis(defaultData)).toBe(true)
      expect(defaultData.optimistic).toBe(0)
      expect(defaultData.neutral).toBe(0)
      expect(defaultData.pessimistic).toBe(0)
    })
  })

  describe('Cash Flow Analysis Model', () => {
    it('should validate correct cash flow analysis data', () => {
      const validData = {
        monthlyFlow: [
          {
            month: 1,
            income: 100000,
            expense: 80000,
            netFlow: 20000,
            cumulativeFlow: 20000,
            milestones: ['项目启动']
          }
        ],
        peakFunding: 500000,
        paybackPeriod: 18,
        netPresentValue: 300000,
        internalRateOfReturn: 0.15,
        cashFlowSummary: {
          totalInflow: 2000000,
          totalOutflow: 1500000,
          netCashFlow: 500000,
          averageMonthlyFlow: 25000
        },
        riskFactors: [
          {
            factor: '付款延迟',
            impact: 'MEDIUM',
            mitigation: '合同条款保护'
          }
        ]
      }
      
      expect(validateCashFlowAnalysis(validData)).toBe(true)
    })

    it('should create default cash flow analysis', () => {
      const defaultData = createDefaultCashFlowAnalysis()
      
      expect(validateCashFlowAnalysis(defaultData)).toBe(true)
      expect(defaultData.monthlyFlow).toEqual([])
      expect(defaultData.peakFunding).toBe(0)
    })
  })

  describe('Financial Calculations', () => {
    it('should calculate ROI correctly', () => {
      expect(calculateROI(1500000, 1000000)).toBe(50) // (1500000 - 1000000) / 1000000 * 100
      expect(calculateROI(1000000, 1000000)).toBe(0)
      expect(calculateROI(800000, 1000000)).toBe(-20)
    })

    it('should calculate break-even point correctly', () => {
      const breakEven = calculateBreakEvenPoint(100000, 50, 100)
      expect(breakEven).toBe(2000) // 100000 / (100 - 50)
    })

    it('should calculate NPV correctly', () => {
      const cashFlows = [100000, 120000, 150000]
      const npv = calculateNPV(cashFlows, 0.1, 300000)
      // 实际计算结果约为2779.86，使用更宽松的精度
      expect(npv).toBeCloseTo(2779.86, 1)
    })

    it('should calculate IRR correctly', () => {
      const cashFlows = [1000000, 300000, 400000, 500000]
      const irr = calculateIRR(cashFlows, 0.1)
      expect(irr).toBeGreaterThan(0)
      expect(irr).toBeLessThan(1)
    })

    it('should handle edge cases in financial calculations', () => {
      // ROI with zero cost
      expect(calculateROI(1000000, 0)).toBe(0)
      
      // Break-even with zero contribution margin
      expect(calculateBreakEvenPoint(100000, 100, 100)).toBe(Infinity)
      
      // NPV with empty cash flows
      expect(calculateNPV([], 0.1, 100000)).toBe(-100000)
    })
  })
})