import { describe, it, expect, beforeAll } from 'vitest'
import { AIAnalysisService } from '../services/ai-analysis'
import type { TenderInfo } from '../db/schema'
import type { Env } from '../index'

// 模拟环境
const mockEnv: Env = {
  AI: {
    run: async (model: string, options: any) => {
      // 模拟AI响应
      const prompt = options.messages?.[1]?.content || ''
      
      // 检查各种AI关键词
      const aiKeywords = ['人工智能', 'AI', '机器学习', '深度学习', '自然语言处理', '计算机视觉', '神经网络', 'TensorFlow']
      const softwareKeywords = ['软件开发', '系统开发', '应用开发', '平台建设', '系统集成']
      const nonSoftwareKeywords = ['硬件采购', '设备采购', '工程建设', '装修工程', '物业服务']
      
      const foundAIKeywords = aiKeywords.filter(keyword => prompt.includes(keyword))
      const foundSoftwareKeywords = softwareKeywords.filter(keyword => prompt.includes(keyword))
      const foundNonSoftwareKeywords = nonSoftwareKeywords.filter(keyword => prompt.includes(keyword))
      
      let isAIProject = foundAIKeywords.length > 0
      let isSoftwareProject = foundSoftwareKeywords.length > 0 || isAIProject
      let projectCategory = '其他'
      let confidence = 30
      let keywords: string[] = []
      
      // 非软件项目优先排除
      if (foundNonSoftwareKeywords.length > 0) {
        isAIProject = false
        isSoftwareProject = false
        projectCategory = '其他'
        confidence = 20
        keywords = foundNonSoftwareKeywords
      } else if (isAIProject) {
        projectCategory = 'AI开发'
        confidence = 90
        keywords = foundAIKeywords
        isSoftwareProject = true
      } else if (isSoftwareProject) {
        projectCategory = '软件开发'
        confidence = 80
        keywords = foundSoftwareKeywords
      }
      
      return {
        response: JSON.stringify({
          isAIProject,
          isSoftwareProject,
          projectCategory,
          confidence,
          keywords,
          reasoning: `基于关键词匹配：${keywords.join(', ')}`
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

describe('AI Classification Property Tests', () => {
  let aiService: AIAnalysisService

  beforeAll(() => {
    aiService = new AIAnalysisService(mockEnv)
  })

  /**
   * 属性3：AI分类准确性
   * 对于任何包含AI相关关键词的项目描述，分类器应当正确识别为AI项目类型
   * 验证：需求2.1
   */
  describe('Property 3: AI Classification Accuracy', () => {
    const aiKeywords = [
      '人工智能', 'AI', '机器学习', '深度学习', '自然语言处理',
      '计算机视觉', '神经网络', 'TensorFlow'
    ]

    it.each(aiKeywords)('should classify projects with AI keyword "%s" as AI projects', async (keyword) => {
      // 生成包含AI关键词的测试项目
      const testTender: TenderInfo = {
        id: `test_${keyword}_${Date.now()}`,
        title: `${keyword}系统开发项目`,
        content: `本项目需要开发基于${keyword}技术的智能系统，实现自动化处理和智能分析功能。`,
        budget: 1000000,
        publishTime: new Date(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        purchaser: '测试公司',
        area: '北京',
        projectType: 'AI开发',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const classification = await aiService.classifyProject(testTender)

      // 验证AI项目识别准确性
      expect(classification.isAIProject).toBe(true)
      expect(classification.isSoftwareProject).toBe(true)
      expect(classification.confidence).toBeGreaterThan(70)
      expect(classification.keywords).toContain(keyword)
      expect(classification.projectCategory).toMatch(/AI|人工智能/)
    })

    it('should run property test with 50 iterations for AI keyword detection', async () => {
      const iterations = 50
      let successCount = 0

      for (let i = 0; i < iterations; i++) {
        // 随机选择AI关键词
        const randomKeyword = aiKeywords[Math.floor(Math.random() * aiKeywords.length)]
        
        const testTender: TenderInfo = {
          id: `property_test_${i}`,
          title: `${randomKeyword}项目开发`,
          content: `使用${randomKeyword}技术实现智能化解决方案`,
          budget: Math.floor(Math.random() * 10000000) + 500000,
          publishTime: new Date(),
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          purchaser: '随机公司',
          area: '随机地区',
          projectType: 'AI开发',
          status: 'ACTIVE',
          createdAt: new Date(),
          updatedAt: new Date()
        }

        try {
          const classification = await aiService.classifyProject(testTender)
          
          // 验证属性：包含AI关键词的项目应被识别为AI项目
          if (classification.isAIProject && classification.confidence > 70) {
            successCount++
          }
        } catch (error) {
          console.error(`Property test iteration ${i} failed:`, error)
        }
      }

      // 属性测试应该有高成功率（至少90%）
      const successRate = successCount / iterations
      expect(successRate).toBeGreaterThan(0.9)
      
      console.log(`AI Classification Property Test: ${successCount}/${iterations} iterations passed (${(successRate * 100).toFixed(1)}%)`)
    })
  })

  /**
   * 软件项目识别准确性测试
   */
  describe('Software Project Classification', () => {
    const softwareKeywords = [
      '软件开发', '系统开发', '应用开发', '平台建设', '系统集成'
    ]

    it.each(softwareKeywords)('should classify projects with software keyword "%s" as software projects', async (keyword) => {
      const testTender: TenderInfo = {
        id: `test_software_${keyword}_${Date.now()}`,
        title: `${keyword}项目`,
        content: `本项目需要进行${keyword}，实现业务流程自动化和信息化管理。`,
        budget: 800000,
        publishTime: new Date(),
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        purchaser: '测试机构',
        area: '上海',
        projectType: '软件开发',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const classification = await aiService.classifyProject(testTender)

      // 验证软件项目识别
      expect(classification.isSoftwareProject).toBe(true)
      expect(classification.confidence).toBeGreaterThan(60)
      expect(classification.keywords).toContain(keyword)
    })
  })

  /**
   * 非软件项目排除测试
   */
  describe('Non-Software Project Exclusion', () => {
    const nonSoftwareKeywords = [
      '硬件采购', '设备采购', '工程建设', '装修工程', '物业服务'
    ]

    it.each(nonSoftwareKeywords)('should not classify projects with non-software keyword "%s" as software projects', async (keyword) => {
      const testTender: TenderInfo = {
        id: `test_nonsoftware_${keyword}_${Date.now()}`,
        title: `${keyword}项目`,
        content: `本项目主要涉及${keyword}，不包含软件开发内容。`,
        budget: 500000,
        publishTime: new Date(),
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        purchaser: '测试单位',
        area: '广州',
        projectType: '其他',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const classification = await aiService.classifyProject(testTender)

      // 验证非软件项目排除
      expect(classification.isSoftwareProject).toBe(false)
      expect(classification.isAIProject).toBe(false)
      expect(classification.projectCategory).toBe('其他')
    })
  })

  /**
   * 分类一致性测试
   */
  describe('Classification Consistency', () => {
    it('should provide consistent classification for the same project', async () => {
      const testTender: TenderInfo = {
        id: 'consistency_test',
        title: '人工智能客服系统开发',
        content: '开发基于深度学习的智能客服系统，支持自然语言处理和机器学习算法。',
        budget: 1500000,
        publishTime: new Date(),
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        purchaser: '一致性测试公司',
        area: '深圳',
        projectType: 'AI开发',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      // 多次分类同一个项目
      const classifications = []
      for (let i = 0; i < 3; i++) {
        const classification = await aiService.classifyProject(testTender)
        classifications.push(classification)
      }

      // 验证分类结果一致性
      const firstResult = classifications[0]
      for (const result of classifications) {
        expect(result.isAIProject).toBe(firstResult.isAIProject)
        expect(result.isSoftwareProject).toBe(firstResult.isSoftwareProject)
        expect(result.projectCategory).toBe(firstResult.projectCategory)
        // 置信度可能有小幅波动，但应该在合理范围内
        expect(Math.abs(result.confidence - firstResult.confidence)).toBeLessThan(20)
      }
    })
  })
})