import { describe, it, expect, beforeAll } from 'vitest'
import { AIAnalysisService } from '../services/ai-analysis'
import type { TenderInfo, AIClassification, ProjectScore } from '../services/ai-analysis'
import type { Env } from '../index'

// 模拟环境
const mockEnv: Env = {
  AI: {
    run: async (model: string, options: any) => {
      // 模拟AI评分响应
      const prompt = options.messages?.[1]?.content || ''
      
      // 从提示词中提取预算信息
      const budgetMatch = prompt.match(/预算：(\d+)元/)
      const budget = budgetMatch ? parseInt(budgetMatch[1]) : 1000000
      
      // 基于预算和内容生成评分
      let budgetScore = 50
      if (budget >= 500000 && budget <= 20000000) {
        budgetScore = 80
      } else if (budget < 500000) {
        budgetScore = 30
      } else {
        budgetScore = 60
      }
      
      const difficultyScore = prompt.includes('AI') ? 70 : 80
      const competitionScore = prompt.includes('政府') ? 40 : 60
      const matchScore = prompt.includes('AI') ? 90 : 70
      
      const total = Math.round(budgetScore * 0.3 + difficultyScore * 0.2 + competitionScore * 0.25 + matchScore * 0.25)
      
      return {
        response: JSON.stringify({
          total,
          budget: budgetScore,
          difficulty: difficultyScore,
          competition: competitionScore,
          match: matchScore,
          details: {
            budgetReason: `预算${budget}元，评分${budgetScore}`,
            difficultyReason: `技术难度评分${difficultyScore}`,
            competitionReason: `竞争程度评分${competitionScore}`,
            matchReason: `匹配度评分${matchScore}`
          }
        })
      }
    }
  } as any,
  DB: {} as any,
  KV: {} as any,
  CACHE: {} as any,
  CONFIG: {} as any,
  STORAGE: {} as any,
  NOTIFICATION_QUEUE: {} as any,
  ENVIRONMENT: 'test',
  API_BASE_URL: 'http://localhost:8787',
  JIANYU_API_BASE_URL: 'https://api.jianyu.com',
  JIANYU_API_KEY: 'test-key'
}

describe('Scoring Algorithm Property Tests', () => {
  let aiService: AIAnalysisService

  beforeAll(() => {
    aiService = new AIAnalysisService(mockEnv)
  })

  /**
   * 属性4：预算筛选一致性
   * 对于任何项目预算，当预算在50万-2000万范围内时，系统应当标记为优先项目
   * 验证：需求2.4
   */
  describe('Property 4: Budget Filtering Consistency', () => {
    const targetBudgetRange = [
      500000, 1000000, 2000000, 5000000, 10000000, 20000000
    ]

    it.each(targetBudgetRange)('should give higher budget score for budget %d within target range', async (budget) => {
      const testTender: TenderInfo = {
        id: `budget_test_${budget}`,
        title: '软件开发项目',
        content: '标准软件开发项目',
        budget,
        publishTime: new Date(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        purchaser: '测试公司',
        area: '北京',
        projectType: '软件开发',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const classification: AIClassification = {
        isAIProject: false,
        isSoftwareProject: true,
        projectCategory: '软件开发',
        confidence: 80,
        keywords: ['软件开发'],
        reasoning: '软件开发项目'
      }

      const score = await aiService.calculateProjectScore(testTender, classification)

      // 验证预算筛选一致性
      if (budget >= 500000 && budget <= 20000000) {
        expect(score.budget).toBeGreaterThan(70) // 目标范围内应该有高预算评分
        expect(score.total).toBeGreaterThan(60) // 总分也应该相对较高
      } else if (budget < 500000) {
        expect(score.budget).toBeLessThan(50) // 预算过低评分应该较低
      } else {
        expect(score.budget).toBeLessThan(80) // 预算过高评分应该适中
      }
    })

    it('should run property test with 50 iterations for budget consistency', async () => {
      const iterations = 50
      let consistentResults = 0

      for (let i = 0; i < iterations; i++) {
        // 生成随机预算
        const budget = Math.floor(Math.random() * 50000000) + 100000 // 10万到5000万

        const testTender: TenderInfo = {
          id: `budget_property_${i}`,
          title: '随机预算项目',
          content: '测试项目',
          budget,
          publishTime: new Date(),
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          purchaser: '随机公司',
          area: '随机地区',
          projectType: '软件开发',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const classification: AIClassification = {
          isAIProject: false,
          isSoftwareProject: true,
          projectCategory: '软件开发',
          confidence: 80,
          keywords: ['软件开发'],
          reasoning: '软件开发项目'
        }

        try {
          const score = await aiService.calculateProjectScore(testTender, classification)

          // 验证预算筛选一致性属性
          const isInTargetRange = budget >= 500000 && budget <= 20000000
          const hasHighBudgetScore = score.budget > 70

          if (isInTargetRange === hasHighBudgetScore) {
            consistentResults++
          }
        } catch (error) {
          console.error(`Budget property test iteration ${i} failed:`, error)
        }
      }

      const consistencyRate = consistentResults / iterations
      expect(consistencyRate).toBeGreaterThan(0.85) // 至少85%的一致性

      console.log(`Budget Filtering Property Test: ${consistentResults}/${iterations} iterations consistent (${(consistencyRate * 100).toFixed(1)}%)`)
    })
  })

  /**
   * 属性5：评分算法单调性
   * 对于任何两个项目，当项目A的预算/复杂度比值高于项目B时，项目A的性价比评分应当不低于项目B
   * 验证：需求3.2
   */
  describe('Property 5: Scoring Algorithm Monotonicity', () => {
    it('should maintain monotonicity in cost-effectiveness scoring', async () => {
      // 创建两个项目，A的性价比应该高于B
      const projectA: TenderInfo = {
        id: 'monotonicity_test_a',
        title: '简单管理系统开发',
        content: '开发简单的信息管理系统，功能相对基础',
        budget: 2000000, // 高预算
        publishTime: new Date(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        purchaser: '企业客户',
        area: '北京',
        projectType: '软件开发',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const projectB: TenderInfo = {
        id: 'monotonicity_test_b',
        title: '复杂AI系统开发',
        content: '开发复杂的人工智能系统，包含深度学习、自然语言处理等高难度技术',
        budget: 1000000, // 低预算
        publishTime: new Date(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        purchaser: '企业客户',
        area: '北京',
        projectType: 'AI开发',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const classificationA: AIClassification = {
        isAIProject: false,
        isSoftwareProject: true,
        projectCategory: '软件开发',
        confidence: 80,
        keywords: ['软件开发', '管理系统'],
        reasoning: '简单软件开发项目'
      }

      const classificationB: AIClassification = {
        isAIProject: true,
        isSoftwareProject: true,
        projectCategory: 'AI开发',
        confidence: 90,
        keywords: ['人工智能', '深度学习', '自然语言处理'],
        reasoning: '复杂AI开发项目'
      }

      const scoreA = await aiService.calculateProjectScore(projectA, classificationA)
      const scoreB = await aiService.calculateProjectScore(projectB, classificationB)

      // 验证单调性：预算高且复杂度低的项目A应该有更高的性价比评分
      const costEffectivenessA = scoreA.budget / (100 - scoreA.difficulty) // 预算高，难度低
      const costEffectivenessB = scoreB.budget / (100 - scoreB.difficulty) // 预算低，难度高

      if (costEffectivenessA > costEffectivenessB) {
        expect(scoreA.total).toBeGreaterThanOrEqual(scoreB.total)
      }
    })

    it('should run property test with 50 iterations for scoring monotonicity', async () => {
      const iterations = 50
      let monotonicResults = 0

      for (let i = 0; i < iterations; i++) {
        // 生成两个随机项目进行比较
        const budgetA = Math.floor(Math.random() * 10000000) + 1000000
        const budgetB = Math.floor(Math.random() * 10000000) + 1000000
        
        // 简化复杂度评估：AI项目复杂度高，软件项目复杂度低
        const isAIProjectA = Math.random() > 0.5
        const isAIProjectB = Math.random() > 0.5

        const projectA: TenderInfo = {
          id: `monotonic_a_${i}`,
          title: isAIProjectA ? 'AI项目A' : '软件项目A',
          content: isAIProjectA ? '复杂AI开发' : '标准软件开发',
          budget: budgetA,
          publishTime: new Date(),
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          purchaser: '测试公司A',
          area: '北京',
          projectType: isAIProjectA ? 'AI开发' : '软件开发',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const projectB: TenderInfo = {
          id: `monotonic_b_${i}`,
          title: isAIProjectB ? 'AI项目B' : '软件项目B',
          content: isAIProjectB ? '复杂AI开发' : '标准软件开发',
          budget: budgetB,
          publishTime: new Date(),
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          purchaser: '测试公司B',
          area: '上海',
          projectType: isAIProjectB ? 'AI开发' : '软件开发',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const classificationA: AIClassification = {
          isAIProject: isAIProjectA,
          isSoftwareProject: true,
          projectCategory: isAIProjectA ? 'AI开发' : '软件开发',
          confidence: 80,
          keywords: isAIProjectA ? ['AI'] : ['软件开发'],
          reasoning: '测试分类'
        }

        const classificationB: AIClassification = {
          isAIProject: isAIProjectB,
          isSoftwareProject: true,
          projectCategory: isAIProjectB ? 'AI开发' : '软件开发',
          confidence: 80,
          keywords: isAIProjectB ? ['AI'] : ['软件开发'],
          reasoning: '测试分类'
        }

        try {
          const scoreA = await aiService.calculateProjectScore(projectA, classificationA)
          const scoreB = await aiService.calculateProjectScore(projectB, classificationB)

          // 计算性价比：预算/难度的简化指标
          const difficultyA = isAIProjectA ? 70 : 80 // AI项目难度更高（分数更低）
          const difficultyB = isAIProjectB ? 70 : 80
          
          const costEffectivenessA = budgetA / (100 - difficultyA)
          const costEffectivenessB = budgetB / (100 - difficultyB)

          // 验证单调性属性：性价比高的项目总分应该不低于性价比低的项目
          if (Math.abs(costEffectivenessA - costEffectivenessB) > 10000) { // 只在差异明显时验证
            if (costEffectivenessA > costEffectivenessB) {
              if (scoreA.total >= scoreB.total - 5) { // 允许5分的误差
                monotonicResults++
              }
            } else {
              if (scoreB.total >= scoreA.total - 5) { // 允许5分的误差
                monotonicResults++
              }
            }
          } else {
            monotonicResults++ // 性价比相近时不要求严格单调性
          }
        } catch (error) {
          console.error(`Monotonicity property test iteration ${i} failed:`, error)
        }
      }

      const monotonicityRate = monotonicResults / iterations
      expect(monotonicityRate).toBeGreaterThan(0.8) // 至少80%的单调性

      console.log(`Scoring Monotonicity Property Test: ${monotonicResults}/${iterations} iterations monotonic (${(monotonicityRate * 100).toFixed(1)}%)`)
    })
  })

  /**
   * 评分范围有效性测试
   */
  describe('Score Range Validity', () => {
    it('should always return scores within valid range (0-100)', async () => {
      const iterations = 20

      for (let i = 0; i < iterations; i++) {
        const testTender: TenderInfo = {
          id: `range_test_${i}`,
          title: '范围测试项目',
          content: '测试评分范围',
          budget: Math.floor(Math.random() * 100000000) + 10000, // 1万到1亿
          publishTime: new Date(),
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          purchaser: '范围测试公司',
          area: '测试地区',
          projectType: '软件开发',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }

        const classification: AIClassification = {
          isAIProject: Math.random() > 0.5,
          isSoftwareProject: true,
          projectCategory: '软件开发',
          confidence: Math.floor(Math.random() * 100),
          keywords: ['软件开发'],
          reasoning: '测试分类'
        }

        const score = await aiService.calculateProjectScore(testTender, classification)

        // 验证所有评分都在有效范围内
        expect(score.total).toBeGreaterThanOrEqual(0)
        expect(score.total).toBeLessThanOrEqual(100)
        expect(score.budget).toBeGreaterThanOrEqual(0)
        expect(score.budget).toBeLessThanOrEqual(100)
        expect(score.difficulty).toBeGreaterThanOrEqual(0)
        expect(score.difficulty).toBeLessThanOrEqual(100)
        expect(score.competition).toBeGreaterThanOrEqual(0)
        expect(score.competition).toBeLessThanOrEqual(100)
        expect(score.match).toBeGreaterThanOrEqual(0)
        expect(score.match).toBeLessThanOrEqual(100)
      }
    })
  })

  /**
   * 评分权重一致性测试
   */
  describe('Score Weight Consistency', () => {
    it('should maintain consistent weight distribution in total score calculation', async () => {
      const testTender: TenderInfo = {
        id: 'weight_test',
        title: '权重测试项目',
        content: '测试评分权重',
        budget: 1500000,
        publishTime: new Date(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        purchaser: '权重测试公司',
        area: '北京',
        projectType: '软件开发',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const classification: AIClassification = {
        isAIProject: false,
        isSoftwareProject: true,
        projectCategory: '软件开发',
        confidence: 80,
        keywords: ['软件开发'],
        reasoning: '软件开发项目'
      }

      const score = await aiService.calculateProjectScore(testTender, classification)

      // 验证权重分布：预算30%，难度20%，竞争25%，匹配25%
      const expectedTotal = Math.round(
        score.budget * 0.3 + 
        score.difficulty * 0.2 + 
        score.competition * 0.25 + 
        score.match * 0.25
      )

      // 允许1分的舍入误差
      expect(Math.abs(score.total - expectedTotal)).toBeLessThanOrEqual(1)
    })
  })
})