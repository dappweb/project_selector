import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { AIAnalysisService } from '../services/ai-analysis'
import { DatabaseService } from '../services/database'
import { successResponse, errorResponse } from '../utils/response'
import type { Env } from '../index'

// AI分析Worker应用
const app = new Hono<{ Bindings: Env }>()

// 中间件
app.use('*', cors())
app.use('*', logger())

// 分析单个项目
app.post('/analyze/:tenderId', async (c) => {
  try {
    const tenderId = c.req.param('tenderId')
    
    if (!tenderId) {
      return c.json(errorResponse('Tender ID is required'), 400)
    }

    const aiService = new AIAnalysisService(c.env)
    const dbService = new DatabaseService(c.env.DB)
    
    // 检查项目是否存在
    const tender = await dbService.getTenderInfoById(tenderId)
    if (!tender) {
      return c.json(errorResponse('Tender not found'), 404)
    }

    // 执行AI分析
    const analysisData = await aiService.analyzeProject(tenderId)
    
    // 检查是否已存在分析结果
    const existing = await dbService.getProjectAnalysisByTenderId(tenderId)
    
    let result
    if (existing) {
      // 更新现有分析
      result = await dbService.updateProjectAnalysis(existing.id, analysisData)
    } else {
      // 创建新分析
      result = await dbService.createProjectAnalysis(analysisData)
    }

    return c.json(successResponse({
      message: 'Project analysis completed successfully',
      analysis: result,
      tender: {
        id: tender.id,
        title: tender.title,
        budget: tender.budget
      }
    }))
  } catch (error) {
    console.error('AI analysis error:', error)
    return c.json(errorResponse('Failed to analyze project', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 批量分析项目
app.post('/batch-analyze', async (c) => {
  try {
    const { tenderIds, limit = 10 } = await c.req.json()
    
    if (!Array.isArray(tenderIds) || tenderIds.length === 0) {
      return c.json(errorResponse('Tender IDs array is required'), 400)
    }

    // 限制批量处理数量
    const limitedIds = tenderIds.slice(0, Math.min(limit, 20))
    
    const aiService = new AIAnalysisService(c.env)
    const result = await aiService.batchAnalyzeProjects(limitedIds)

    return c.json(successResponse({
      message: 'Batch analysis completed',
      results: result,
      summary: {
        total: limitedIds.length,
        successful: result.successful.length,
        failed: result.failed.length
      }
    }))
  } catch (error) {
    console.error('Batch analysis error:', error)
    return c.json(errorResponse('Failed to perform batch analysis', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 获取项目分析结果
app.get('/result/:tenderId', async (c) => {
  try {
    const tenderId = c.req.param('tenderId')
    
    if (!tenderId) {
      return c.json(errorResponse('Tender ID is required'), 400)
    }

    const dbService = new DatabaseService(c.env.DB)
    
    // 获取分析结果
    const analysis = await dbService.getProjectAnalysisByTenderId(tenderId)
    
    if (!analysis) {
      return c.json(errorResponse('Analysis not found'), 404)
    }

    // 获取招标信息
    const tender = await dbService.getTenderInfoById(tenderId)

    return c.json(successResponse({
      analysis,
      tender: tender ? {
        id: tender.id,
        title: tender.title,
        budget: tender.budget,
        publishTime: tender.publishTime,
        deadline: tender.deadline
      } : null
    }))
  } catch (error) {
    console.error('Get analysis result error:', error)
    return c.json(errorResponse('Failed to get analysis result', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 自动分析未分析的项目
app.post('/auto-analyze', async (c) => {
  try {
    const { limit = 10 } = await c.req.json()
    
    const dbService = new DatabaseService(c.env.DB)
    const aiService = new AIAnalysisService(c.env)
    
    // 获取未分析的项目
    const tenders = await dbService.getTenderInfoList({
      page: 1,
      pageSize: Math.min(limit, 50),
      status: 'ACTIVE'
    })

    const unanalyzedTenders = []
    
    // 筛选未分析的项目
    for (const tender of tenders.items) {
      const existing = await dbService.getProjectAnalysisByTenderId(tender.id)
      if (!existing) {
        unanalyzedTenders.push(tender.id)
      }
    }

    if (unanalyzedTenders.length === 0) {
      return c.json(successResponse({
        message: 'No unanalyzed projects found',
        results: { successful: [], failed: [] }
      }))
    }

    // 执行批量分析
    const result = await aiService.batchAnalyzeProjects(unanalyzedTenders)

    return c.json(successResponse({
      message: 'Auto analysis completed',
      results: result,
      summary: {
        found: unanalyzedTenders.length,
        successful: result.successful.length,
        failed: result.failed.length
      }
    }))
  } catch (error) {
    console.error('Auto analysis error:', error)
    return c.json(errorResponse('Failed to perform auto analysis', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 获取分析统计
app.get('/statistics', async (c) => {
  try {
    const aiService = new AIAnalysisService(c.env)
    const stats = await aiService.getAnalysisStatistics()

    return c.json(successResponse({
      statistics: stats,
      timestamp: new Date().toISOString()
    }))
  } catch (error) {
    console.error('Get statistics error:', error)
    return c.json(errorResponse('Failed to get statistics', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 重新分析项目（强制更新）
app.post('/reanalyze/:tenderId', async (c) => {
  try {
    const tenderId = c.req.param('tenderId')
    
    if (!tenderId) {
      return c.json(errorResponse('Tender ID is required'), 400)
    }

    const aiService = new AIAnalysisService(c.env)
    const dbService = new DatabaseService(c.env.DB)
    
    // 检查项目是否存在
    const tender = await dbService.getTenderInfoById(tenderId)
    if (!tender) {
      return c.json(errorResponse('Tender not found'), 404)
    }

    // 执行重新分析
    const analysisData = await aiService.analyzeProject(tenderId)
    
    // 获取现有分析
    const existing = await dbService.getProjectAnalysisByTenderId(tenderId)
    
    let result
    if (existing) {
      // 强制更新
      result = await dbService.updateProjectAnalysis(existing.id, analysisData)
    } else {
      // 创建新分析
      result = await dbService.createProjectAnalysis(analysisData)
    }

    return c.json(successResponse({
      message: 'Project reanalysis completed successfully',
      analysis: result,
      tender: {
        id: tender.id,
        title: tender.title,
        budget: tender.budget
      }
    }))
  } catch (error) {
    console.error('Reanalysis error:', error)
    return c.json(errorResponse('Failed to reanalyze project', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 测试AI模型连接
app.get('/test-ai', async (c) => {
  try {
    const response = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct' as any, {
      messages: [
        {
          role: 'user',
          content: '请回复"AI模型连接正常"'
        }
      ],
      max_tokens: 50
    })

    const responseText = typeof response === 'string' ? response : (response as any)?.response || JSON.stringify(response)

    return c.json(successResponse({
      message: 'AI model test successful',
      response: responseText,
      timestamp: new Date().toISOString()
    }))
  } catch (error) {
    console.error('AI model test error:', error)
    return c.json(errorResponse('AI model test failed', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 获取支持的AI模型列表
app.get('/models', async (c) => {
  return c.json(successResponse({
    models: [
      {
        name: '@cf/meta/llama-3.1-8b-instruct',
        description: 'Llama 3.1 8B Instruct model optimized for multilingual dialogue',
        capabilities: ['text-generation', 'chat', 'analysis', 'multilingual'],
        recommended: true
      }
    ],
    currentModel: '@cf/meta/llama-3.1-8b-instruct'
  }))
})

// 创建测试数据（仅用于开发测试）
app.post('/create-test-data', async (c) => {
  try {
    const dbService = new DatabaseService(c.env.DB)
    
    // 创建测试招标项目
    const testTender = {
      id: "test_ai_project_001",
      title: "智能客服系统AI开发项目",
      content: "本项目需要开发一套基于人工智能技术的智能客服系统，包括自然语言处理、机器学习算法、深度学习模型等核心技术。系统需要支持多轮对话、意图识别、实体抽取、情感分析等功能。预期能够处理80%以上的常见客户咨询，提升客服效率。技术要求包括：Python开发、TensorFlow/PyTorch框架、NLP算法、对话管理、知识图谱等。",
      budget: 1500000,
      publishTime: new Date(),
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后
      purchaser: "某科技有限公司",
      area: "北京",
      projectType: "AI开发",
      status: "ACTIVE" as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // 检查是否已存在
    const existing = await dbService.getTenderInfoById(testTender.id)
    
    let result
    if (existing) {
      result = await dbService.updateTenderInfo(testTender.id, testTender)
    } else {
      result = await dbService.createTenderInfo(testTender)
    }
    
    return c.json(successResponse({
      message: 'Test data created successfully',
      tender: result
    }))
  } catch (error) {
    console.error('Create test data error:', error)
    return c.json(errorResponse('Failed to create test data', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

export default app