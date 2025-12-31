import { describe, it, expect, beforeAll, vi } from 'vitest'
import { AIAnalysisService } from '../services/ai-analysis'
import { DatabaseService } from '../services/database'
import type { TenderInfo } from '../db/schema'
import type { Env } from '../index'

// 模拟数据库服务
const mockDatabaseService = {
  getTenderInfoById: vi.fn(),
  getProjectAnalysisByTenderId: vi.fn(),
  createProjectAnalysis: vi.fn(),
  updateProjectAnalysis: vi.fn(),
  getTenderInfoList: vi.fn(),
  getStatistics: vi.fn()
}

// 模拟环境
const mockEnv: Env = {
  AI: {
    run: vi.fn()
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

// 模拟测试数据
const mockTenderInfo: TenderInfo = {
  id: 'test_tender_001',
  title: '智能客服系统AI开发项目',
  content: '本项目需要开发一套基于人工智能技术的智能客服系统，包括自然语言处理、机器学习算法、深度学习模型等核心技术。',
  budget: 1500000,
  publishTime: new Date('2025-01-01'),
  deadline: new Date('2025-02-01'),
  purchaser: '某科技有限公司',
  area: '北京',
  projectType: 'AI开发',
  status: 'ACTIVE',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01')
}

describe('AI Analysis Worker Unit Tests', () => {
  let aiService: AIAnalysisService

  beforeAll(() => {
    aiService = new AIAnalysisService(mockEnv)
    // 替换数据库服务
    ;(aiService as any).dbService = mockDatabaseService
  })

  describe('Project Classification Tests', () => {
    it('should correctly classify AI projects', async () => {
      // 模拟AI响应
      mockEnv.AI.run = vi.fn().mockResolvedValue({
        response: JSON.stringify({
          isAIProject: true,
          isSoftwareProject: true,
          projectCategory: 'AI开发',
          confidence: 90,
          keywords: ['人工智能', '机器学习', '深度学习', '自然语言处理'],
          reasoning: '项目包含多个AI相关关键词，明确为AI开发项目'
        })
      })

      const classification = await aiService.classifyProject(mockTenderInfo)

      expect(classification.isAIProject).toBe(true)
      expect(classification.isSoftwareProject).toBe(true)
      expect(classification.projectCategory).toBe('AI开发')
      expect(classification.confidence).toBe(90)
      expect(classification.keywords).toContain('人工智能')
      expect(classification.keywords).toContain('机器学习')
      expect(classification.reasoning).toContain('AI开发项目')
    })

    it('should handle AI model failures gracefully with fallback classification', async () => {
      // 模拟AI调用失败
      mockEnv.AI.run = vi.fn().mockRejectedValue(new Error('AI model unavailable'))

      const classification = await aiService.classifyProject(mockTenderInfo)

      // 应该使用规则引擎降级分类
      expect(classification.isAIProject).toBe(true) // 基于关键词匹配
      expect(classification.isSoftwareProject).toBe(true)
      expect(classification.confidence).toBeGreaterThan(0)
      expect(classification.reasoning).toContain('关键词匹配')
    })

    it('should parse malformed AI responses correctly', async () => {
      // 模拟格式错误的AI响应
      mockEnv.AI.run = vi.fn().mockResolvedValue({
        response: '这是一个无效的JSON响应，不包含正确的分类信息'
      })

      const classification = await aiService.classifyProject(mockTenderInfo)

      // 应该降级到规则引擎
      expect(classification).toBeDefined()
      expect(classification.isAIProject).toBeDefined()
      expect(classification.isSoftwareProject).toBeDefined()
      expect(classification.confidence).toBeGreaterThan(0)
    })
  })

  describe('Project Scoring Tests', () => {
    const mockClassification = {
      isAIProject: true,
      isSoftwareProject: true,
      projectCategory: 'AI开发',
      confidence: 90,
      keywords: ['人工智能', '机器学习'],
      reasoning: 'AI项目'
    }

    it('should calculate project scores correctly', async () => {
      // 模拟AI评分响应
      mockEnv.AI.run = vi.fn().mockResolvedValue({
        response: JSON.stringify({
          total: 80,
          budget: 85,
          difficulty: 70,
          competition: 75,
          match: 90,
          details: {
            budgetReason: '预算合理，在目标范围内',
            difficultyReason: 'AI项目技术难度较高',
            competitionReason: '竞争程度适中',
            matchReason: '技术匹配度很高'
          }
        })
      })

      const score = await aiService.calculateProjectScore(mockTenderInfo, mockClassification)

      expect(score.total).toBe(80)
      expect(score.budget).toBe(85)
      expect(score.difficulty).toBe(70)
      expect(score.competition).toBe(75)
      expect(score.match).toBe(90)
      expect(score.details.budgetReason).toContain('预算合理')
      expect(score.details.difficultyReason).toContain('技术难度')
    })

    it('should handle scoring failures with fallback algorithm', async () => {
      // 模拟AI评分失败
      mockEnv.AI.run = vi.fn().mockRejectedValue(new Error('Scoring failed'))

      const score = await aiService.calculateProjectScore(mockTenderInfo, mockClassification)

      // 应该使用降级评分算法
      expect(score.total).toBeGreaterThan(0)
      expect(score.total).toBeLessThanOrEqual(100)
      expect(score.budget).toBeGreaterThan(0)
      expect(score.difficulty).toBeGreaterThan(0)
      expect(score.competition).toBeGreaterThan(0)
      expect(score.match).toBeGreaterThan(0)
    })

    it('should validate score ranges', async () => {
      // 模拟超出范围的AI响应
      mockEnv.AI.run = vi.fn().mockResolvedValue({
        response: JSON.stringify({
          total: 150, // 超出范围
          budget: -10, // 负数
          difficulty: 200, // 超出范围
          competition: 50,
          match: 80,
          details: {
            budgetReason: '测试',
            difficultyReason: '测试',
            competitionReason: '测试',
            matchReason: '测试'
          }
        })
      })

      const score = await aiService.calculateProjectScore(mockTenderInfo, mockClassification)

      // 应该修正到有效范围
      expect(score.total).toBeLessThanOrEqual(100)
      expect(score.total).toBeGreaterThanOrEqual(0)
      expect(score.budget).toBeLessThanOrEqual(100)
      expect(score.budget).toBeGreaterThanOrEqual(0)
      expect(score.difficulty).toBeLessThanOrEqual(100)
      expect(score.difficulty).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Competitor Analysis Tests', () => {
    const mockClassification = {
      isAIProject: true,
      isSoftwareProject: true,
      projectCategory: 'AI开发',
      confidence: 90,
      keywords: ['人工智能'],
      reasoning: 'AI项目'
    }

    it('should analyze competitors correctly', async () => {
      // 模拟竞争对手分析响应
      mockEnv.AI.run = vi.fn().mockResolvedValue({
        response: JSON.stringify({
          competitionLevel: 'MEDIUM',
          estimatedCompetitors: 5,
          mainCompetitors: ['大型软件公司', '系统集成商', '本地技术公司'],
          competitiveAdvantages: ['AI技术专长', '快速响应能力', '成本优势'],
          risks: ['价格竞争激烈', '大公司品牌优势'],
          recommendations: ['突出技术优势', '合理定价策略']
        })
      })

      const analysis = await aiService.analyzeCompetitors(mockTenderInfo, mockClassification)

      expect(analysis.competitionLevel).toBe('MEDIUM')
      expect(analysis.estimatedCompetitors).toBe(5)
      expect(analysis.mainCompetitors).toContain('大型软件公司')
      expect(analysis.competitiveAdvantages).toContain('AI技术专长')
      expect(analysis.risks).toContain('价格竞争激烈')
      expect(analysis.recommendations).toContain('突出技术优势')
    })

    it('should handle competitor analysis failures with fallback', async () => {
      // 模拟分析失败
      mockEnv.AI.run = vi.fn().mockRejectedValue(new Error('Analysis failed'))

      const analysis = await aiService.analyzeCompetitors(mockTenderInfo, mockClassification)

      // 应该使用降级分析
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(analysis.competitionLevel)
      expect(analysis.estimatedCompetitors).toBeGreaterThan(0)
      expect(analysis.mainCompetitors).toBeInstanceOf(Array)
      expect(analysis.competitiveAdvantages).toBeInstanceOf(Array)
      expect(analysis.risks).toBeInstanceOf(Array)
      expect(analysis.recommendations).toBeInstanceOf(Array)
    })
  })

  describe('Complete Project Analysis Tests', () => {
    it('should perform complete project analysis successfully', async () => {
      // 模拟数据库查询
      mockDatabaseService.getTenderInfoById.mockResolvedValue(mockTenderInfo)
      mockDatabaseService.getProjectAnalysisByTenderId.mockResolvedValue(null)
      mockDatabaseService.createProjectAnalysis.mockResolvedValue({
        id: 1,
        tenderId: 'test_tender_001',
        aiClassification: {},
        scoreEvaluation: {},
        competitorAnalysis: {},
        analysisTime: new Date()
      })

      // 模拟AI响应
      mockEnv.AI.run = vi.fn()
        .mockResolvedValueOnce({ // 分类响应
          response: JSON.stringify({
            isAIProject: true,
            isSoftwareProject: true,
            projectCategory: 'AI开发',
            confidence: 90,
            keywords: ['人工智能'],
            reasoning: 'AI项目'
          })
        })
        .mockResolvedValueOnce({ // 评分响应
          response: JSON.stringify({
            total: 80,
            budget: 85,
            difficulty: 70,
            competition: 75,
            match: 90,
            details: {
              budgetReason: '预算合理',
              difficultyReason: '技术难度适中',
              competitionReason: '竞争适中',
              matchReason: '匹配度高'
            }
          })
        })
        .mockResolvedValueOnce({ // 竞争分析响应
          response: JSON.stringify({
            competitionLevel: 'MEDIUM',
            estimatedCompetitors: 5,
            mainCompetitors: ['大型软件公司'],
            competitiveAdvantages: ['AI技术专长'],
            risks: ['价格竞争'],
            recommendations: ['突出优势']
          })
        })

      const analysisData = await aiService.analyzeProject('test_tender_001')

      expect(analysisData.tenderId).toBe('test_tender_001')
      expect(analysisData.aiClassification.isAIProject).toBe(true)
      expect(analysisData.scoreEvaluation.total).toBe(80)
      expect(analysisData.competitorAnalysis.competitionLevel).toBe('MEDIUM')
      expect(analysisData.analysisTime).toBeInstanceOf(Date)
    })

    it('should handle missing tender gracefully', async () => {
      // 模拟找不到招标信息
      mockDatabaseService.getTenderInfoById.mockResolvedValue(null)

      await expect(aiService.analyzeProject('nonexistent_tender')).rejects.toThrow('Tender not found')
    })
  })

  describe('Batch Analysis Tests', () => {
    it('should perform batch analysis correctly', async () => {
      const tenderIds = ['tender_001', 'tender_002', 'tender_003']

      // 模拟数据库查询
      mockDatabaseService.getTenderInfoById
        .mockResolvedValueOnce(mockTenderInfo)
        .mockResolvedValueOnce({ ...mockTenderInfo, id: 'tender_002' })
        .mockResolvedValueOnce({ ...mockTenderInfo, id: 'tender_003' })

      mockDatabaseService.getProjectAnalysisByTenderId.mockResolvedValue(null)
      mockDatabaseService.createProjectAnalysis.mockResolvedValue({
        id: 1,
        tenderId: 'test',
        aiClassification: {},
        scoreEvaluation: {},
        competitorAnalysis: {},
        analysisTime: new Date()
      })

      // 模拟AI响应
      mockEnv.AI.run = vi.fn().mockResolvedValue({
        response: JSON.stringify({
          isAIProject: true,
          isSoftwareProject: true,
          projectCategory: 'AI开发',
          confidence: 90,
          keywords: ['人工智能'],
          reasoning: 'AI项目'
        })
      })

      const result = await aiService.batchAnalyzeProjects(tenderIds)

      expect(result.successful).toHaveLength(3)
      expect(result.failed).toHaveLength(0)
      expect(result.successful).toContain('tender_001')
      expect(result.successful).toContain('tender_002')
      expect(result.successful).toContain('tender_003')
    })

    it('should handle partial failures in batch analysis', async () => {
      const tenderIds = ['valid_tender', 'invalid_tender']

      // 模拟部分成功部分失败
      mockDatabaseService.getTenderInfoById
        .mockResolvedValueOnce(mockTenderInfo)
        .mockResolvedValueOnce(null) // 第二个找不到

      mockDatabaseService.getProjectAnalysisByTenderId.mockResolvedValue(null)
      mockDatabaseService.createProjectAnalysis.mockResolvedValue({
        id: 1,
        tenderId: 'valid_tender',
        aiClassification: {},
        scoreEvaluation: {},
        competitorAnalysis: {},
        analysisTime: new Date()
      })

      mockEnv.AI.run = vi.fn().mockResolvedValue({
        response: JSON.stringify({
          isAIProject: true,
          isSoftwareProject: true,
          projectCategory: 'AI开发',
          confidence: 90,
          keywords: ['人工智能'],
          reasoning: 'AI项目'
        })
      })

      const result = await aiService.batchAnalyzeProjects(tenderIds)

      expect(result.successful).toHaveLength(1)
      expect(result.failed).toHaveLength(1)
      expect(result.successful).toContain('valid_tender')
      expect(result.failed[0].tenderId).toBe('invalid_tender')
      expect(result.failed[0].error).toContain('Tender not found')
    })
  })

  describe('Statistics Tests', () => {
    it('should calculate analysis statistics correctly', async () => {
      // 模拟统计数据
      mockDatabaseService.getStatistics.mockResolvedValue({
        tenders: 100,
        analyses: 80,
        proposals: 20,
        reports: 15
      })

      const stats = await aiService.getAnalysisStatistics()

      expect(stats.totalAnalyzed).toBe(80)
      expect(stats.aiProjects).toBeGreaterThan(0)
      expect(stats.softwareProjects).toBeGreaterThan(0)
      expect(stats.averageScore).toBe(65)
      expect(stats.highValueProjects).toBeGreaterThan(0)
    })

    it('should handle statistics calculation failures', async () => {
      // 模拟统计查询失败
      mockDatabaseService.getStatistics.mockRejectedValue(new Error('Database error'))

      const stats = await aiService.getAnalysisStatistics()

      // 应该返回默认值
      expect(stats.totalAnalyzed).toBe(0)
      expect(stats.aiProjects).toBe(0)
      expect(stats.softwareProjects).toBe(0)
      expect(stats.averageScore).toBe(0)
      expect(stats.highValueProjects).toBe(0)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty tender content', async () => {
      const emptyTender = {
        ...mockTenderInfo,
        content: null,
        title: ''
      }

      mockEnv.AI.run = vi.fn().mockRejectedValue(new Error('Empty content'))

      const classification = await aiService.classifyProject(emptyTender)

      // 应该使用降级分类
      expect(classification).toBeDefined()
      expect(classification.confidence).toBeGreaterThanOrEqual(0)
    })

    it('should handle extreme budget values', async () => {
      const extremeBudgetTender = {
        ...mockTenderInfo,
        budget: 999999999999 // 极大预算
      }

      const mockClassification = {
        isAIProject: false,
        isSoftwareProject: true,
        projectCategory: '软件开发',
        confidence: 80,
        keywords: ['软件开发'],
        reasoning: '软件项目'
      }

      mockEnv.AI.run = vi.fn().mockRejectedValue(new Error('Extreme budget'))

      const score = await aiService.calculateProjectScore(extremeBudgetTender, mockClassification)

      // 应该处理极端值
      expect(score.total).toBeGreaterThanOrEqual(0)
      expect(score.total).toBeLessThanOrEqual(100)
      expect(score.budget).toBeGreaterThanOrEqual(0)
      expect(score.budget).toBeLessThanOrEqual(100)
    })

    it('should handle network timeouts gracefully', async () => {
      // 模拟网络超时
      mockEnv.AI.run = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Network timeout')), 100)
        )
      )

      const classification = await aiService.classifyProject(mockTenderInfo)

      // 应该降级到规则引擎
      expect(classification).toBeDefined()
      expect(classification.reasoning).toContain('关键词匹配')
    })
  })
})