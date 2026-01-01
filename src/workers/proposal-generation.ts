import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { ProposalGenerationService } from '../services/proposal-generation'
import { DocumentGenerationService } from '../services/document-generation'
import { DatabaseService } from '../services/database'
import { successResponse, errorResponse } from '../utils/response'
import type { Env } from '../index'

// 方案生成Worker应用
const app = new Hono<{ Bindings: Env }>()

// 中间件
app.use('*', cors())
app.use('*', logger())

// 生成单个项目的投标方案
app.post('/generate/:tenderId', async (c) => {
  try {
    const tenderId = c.req.param('tenderId')
    
    if (!tenderId) {
      return c.json(errorResponse('Tender ID is required'), 400)
    }

    const proposalService = new ProposalGenerationService(c.env)
    const dbService = new DatabaseService(c.env.DB)
    
    // 检查项目是否存在
    const tender = await dbService.getTenderInfoById(tenderId)
    if (!tender) {
      return c.json(errorResponse('Tender not found'), 404)
    }

    // 生成投标方案
    const proposalData = await proposalService.generateProposal(tenderId)
    
    // 检查是否已存在方案
    const existing = await dbService.getProposalDocumentByTenderId(tenderId)
    
    let result
    if (existing) {
      // 更新现有方案
      result = await dbService.updateProposalDocument(existing.id, proposalData)
    } else {
      // 创建新方案
      result = await dbService.createProposalDocument(proposalData)
    }

    return c.json(successResponse({
      message: 'Proposal generated successfully',
      proposal: result,
      tender: {
        id: tender.id,
        title: tender.title,
        budget: tender.budget
      }
    }))
  } catch (error) {
    console.error('Proposal generation error:', error)
    return c.json(errorResponse('Failed to generate proposal', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 批量生成方案
app.post('/batch-generate', async (c) => {
  try {
    const { tenderIds, limit = 5 } = await c.req.json()
    
    if (!Array.isArray(tenderIds) || tenderIds.length === 0) {
      return c.json(errorResponse('Tender IDs array is required'), 400)
    }

    // 限制批量处理数量
    const limitedIds = tenderIds.slice(0, Math.min(limit, 10))
    
    const proposalService = new ProposalGenerationService(c.env)
    const result = await proposalService.batchGenerateProposals(limitedIds)

    return c.json(successResponse({
      message: 'Batch proposal generation completed',
      results: result,
      summary: {
        total: limitedIds.length,
        successful: result.successful.length,
        failed: result.failed.length
      }
    }))
  } catch (error) {
    console.error('Batch proposal generation error:', error)
    return c.json(errorResponse('Failed to perform batch proposal generation', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 获取项目方案
app.get('/proposal/:tenderId', async (c) => {
  try {
    const tenderId = c.req.param('tenderId')
    
    if (!tenderId) {
      return c.json(errorResponse('Tender ID is required'), 400)
    }

    const dbService = new DatabaseService(c.env.DB)
    
    // 获取方案文档
    const proposal = await dbService.getProposalDocumentByTenderId(tenderId)
    
    if (!proposal) {
      return c.json(errorResponse('Proposal not found'), 404)
    }

    // 获取招标信息
    const tender = await dbService.getTenderInfoById(tenderId)

    return c.json(successResponse({
      proposal,
      tender: tender ? {
        id: tender.id,
        title: tender.title,
        budget: tender.budget,
        publishTime: tender.publishTime,
        deadline: tender.deadline
      } : null
    }))
  } catch (error) {
    console.error('Get proposal error:', error)
    return c.json(errorResponse('Failed to get proposal', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 自动为高价值项目生成方案
app.post('/auto-generate', async (c) => {
  try {
    const { limit = 5, minScore = 70 } = await c.req.json()
    
    const dbService = new DatabaseService(c.env.DB)
    const proposalService = new ProposalGenerationService(c.env)
    
    // 获取高价值项目（这里简化实现，实际应该根据分析评分筛选）
    const tenders = await dbService.getTenderInfoList({
      page: 1,
      pageSize: Math.min(limit, 20),
      status: 'ACTIVE'
    })

    const highValueTenders = []
    
    // 筛选未生成方案的高价值项目
    for (const tender of tenders.items) {
      const existing = await dbService.getProposalDocumentByTenderId(tender.id)
      if (!existing && tender.budget && tender.budget >= 1000000) { // 简化筛选：预算大于100万
        highValueTenders.push(tender.id)
      }
    }

    if (highValueTenders.length === 0) {
      return c.json(successResponse({
        message: 'No high-value projects found for proposal generation',
        results: { successful: [], failed: [] }
      }))
    }

    // 执行批量方案生成
    const result = await proposalService.batchGenerateProposals(highValueTenders)

    return c.json(successResponse({
      message: 'Auto proposal generation completed',
      results: result,
      summary: {
        found: highValueTenders.length,
        successful: result.successful.length,
        failed: result.failed.length
      }
    }))
  } catch (error) {
    console.error('Auto proposal generation error:', error)
    return c.json(errorResponse('Failed to perform auto proposal generation', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 获取方案统计
app.get('/statistics', async (c) => {
  try {
    const proposalService = new ProposalGenerationService(c.env)
    const stats = await proposalService.getProposalStatistics()

    return c.json(successResponse({
      statistics: stats,
      timestamp: new Date().toISOString()
    }))
  } catch (error) {
    console.error('Get proposal statistics error:', error)
    return c.json(errorResponse('Failed to get proposal statistics', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 重新生成方案（强制更新）
app.post('/regenerate/:tenderId', async (c) => {
  try {
    const tenderId = c.req.param('tenderId')
    
    if (!tenderId) {
      return c.json(errorResponse('Tender ID is required'), 400)
    }

    const proposalService = new ProposalGenerationService(c.env)
    const dbService = new DatabaseService(c.env.DB)
    
    // 检查项目是否存在
    const tender = await dbService.getTenderInfoById(tenderId)
    if (!tender) {
      return c.json(errorResponse('Tender not found'), 404)
    }

    // 重新生成方案
    const proposalData = await proposalService.generateProposal(tenderId)
    
    // 获取现有方案
    const existing = await dbService.getProposalDocumentByTenderId(tenderId)
    
    let result
    if (existing) {
      // 强制更新
      result = await dbService.updateProposalDocument(existing.id, proposalData)
    } else {
      // 创建新方案
      result = await dbService.createProposalDocument(proposalData)
    }

    return c.json(successResponse({
      message: 'Proposal regenerated successfully',
      proposal: result,
      tender: {
        id: tender.id,
        title: tender.title,
        budget: tender.budget
      }
    }))
  } catch (error) {
    console.error('Proposal regeneration error:', error)
    return c.json(errorResponse('Failed to regenerate proposal', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 分析项目需求（独立接口）
app.post('/analyze-requirement/:tenderId', async (c) => {
  try {
    const tenderId = c.req.param('tenderId')
    
    if (!tenderId) {
      return c.json(errorResponse('Tender ID is required'), 400)
    }

    const proposalService = new ProposalGenerationService(c.env)
    const dbService = new DatabaseService(c.env.DB)
    
    // 检查项目是否存在
    const tender = await dbService.getTenderInfoById(tenderId)
    if (!tender) {
      return c.json(errorResponse('Tender not found'), 404)
    }

    // 分析项目需求
    const requirement = await proposalService.analyzeRequirement(tender)

    return c.json(successResponse({
      message: 'Requirement analysis completed',
      requirement,
      tender: {
        id: tender.id,
        title: tender.title,
        budget: tender.budget
      }
    }))
  } catch (error) {
    console.error('Requirement analysis error:', error)
    return c.json(errorResponse('Failed to analyze requirement', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 生成技术方案（独立接口）
app.post('/generate-technical-solution', async (c) => {
  try {
    const { requirement } = await c.req.json()
    
    if (!requirement) {
      return c.json(errorResponse('Project requirement is required'), 400)
    }

    const proposalService = new ProposalGenerationService(c.env)
    
    // 生成技术方案
    const technicalSolution = await proposalService.generateTechnicalSolution(requirement)

    return c.json(successResponse({
      message: 'Technical solution generated',
      technicalSolution
    }))
  } catch (error) {
    console.error('Technical solution generation error:', error)
    return c.json(errorResponse('Failed to generate technical solution', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 生成商务方案（独立接口）
app.post('/generate-commercial-proposal', async (c) => {
  try {
    const { requirement, technicalSolution } = await c.req.json()
    
    if (!requirement || !technicalSolution) {
      return c.json(errorResponse('Requirement and technical solution are required'), 400)
    }

    const proposalService = new ProposalGenerationService(c.env)
    
    // 生成商务方案
    const commercialProposal = await proposalService.generateCommercialProposal(requirement, technicalSolution)

    return c.json(successResponse({
      message: 'Commercial proposal generated',
      commercialProposal
    }))
  } catch (error) {
    console.error('Commercial proposal generation error:', error)
    return c.json(errorResponse('Failed to generate commercial proposal', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 创建测试数据（仅用于开发测试）
app.post('/create-test-proposal', async (c) => {
  try {
    const dbService = new DatabaseService(c.env.DB)
    
    // 确保测试项目存在
    const testTender = {
      id: "test_ai_project_001",
      title: "智能客服系统AI开发项目",
      content: "本项目需要开发一套基于人工智能技术的智能客服系统，包括自然语言处理、机器学习算法、深度学习模型等核心技术。",
      budget: 1500000,
      publishTime: new Date(),
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      purchaser: "某科技有限公司",
      area: "北京",
      projectType: "AI开发",
      status: "ACTIVE" as const,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // 检查项目是否存在，不存在则创建
    let tender = await dbService.getTenderInfoById(testTender.id)
    if (!tender) {
      tender = await dbService.createTenderInfo(testTender)
    }
    
    // 生成测试方案
    const proposalService = new ProposalGenerationService(c.env)
    const proposalData = await proposalService.generateProposal(testTender.id)
    
    // 检查是否已存在方案
    const existing = await dbService.getProposalDocumentByTenderId(testTender.id)
    
    let result
    if (existing) {
      result = await dbService.updateProposalDocument(existing.id, proposalData)
    } else {
      result = await dbService.createProposalDocument(proposalData)
    }
    
    return c.json(successResponse({
      message: 'Test proposal created successfully',
      proposal: result,
      tender: {
        id: tender.id,
        title: tender.title,
        budget: tender.budget
      }
    }))
  } catch (error) {
    console.error('Create test proposal error:', error)
    return c.json(errorResponse('Failed to create test proposal', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 生成并下载方案文档
app.post('/generate-document/:tenderId', async (c) => {
  try {
    const tenderId = c.req.param('tenderId')
    const { format = 'markdown' } = await c.req.json().catch(() => ({}))
    
    if (!tenderId) {
      return c.json(errorResponse('Tender ID is required'), 400)
    }

    const dbService = new DatabaseService(c.env.DB)
    const documentService = new DocumentGenerationService(c.env)
    
    // 获取招标信息
    const tender = await dbService.getTenderInfoById(tenderId)
    if (!tender) {
      return c.json(errorResponse('Tender not found'), 404)
    }

    // 获取方案信息
    const proposal = await dbService.getProposalDocumentByTenderId(tenderId)
    if (!proposal) {
      return c.json(errorResponse('Proposal not found. Please generate proposal first.'), 404)
    }

    // 生成文档
    let documentPath: string
    if (format === 'html') {
      documentPath = await documentService.generateHtmlDocument(
        tenderId,
        tender.title,
        proposal.technicalSolution,
        proposal.commercialProposal
      )
    } else {
      documentPath = await documentService.generateProposalDocument(
        tenderId,
        tender.title,
        proposal.technicalSolution,
        proposal.commercialProposal
      )
    }

    // 生成下载URL
    const downloadUrl = await documentService.generateDownloadUrl(documentPath)

    return c.json(successResponse({
      message: 'Document generated successfully',
      documentPath,
      downloadUrl,
      format,
      tender: {
        id: tender.id,
        title: tender.title
      }
    }))
  } catch (error) {
    console.error('Document generation error:', error)
    return c.json(errorResponse('Failed to generate document', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 获取文档内容
app.get('/document/:documentPath', async (c) => {
  try {
    const documentPath = c.req.param('documentPath')
    
    if (!documentPath) {
      return c.json(errorResponse('Document path is required'), 400)
    }

    const documentService = new DocumentGenerationService(c.env)
    const content = await documentService.getDocument(documentPath)
    
    if (!content) {
      return c.json(errorResponse('Document not found'), 404)
    }

    // 根据文件扩展名设置Content-Type
    const contentType = documentPath.endsWith('.html') ? 'text/html' : 'text/markdown'
    
    return new Response(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${documentPath.split('/').pop()}"`
      }
    })
  } catch (error) {
    console.error('Get document error:', error)
    return c.json(errorResponse('Failed to get document', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

// 列出所有文档
app.get('/documents', async (c) => {
  try {
    const documentService = new DocumentGenerationService(c.env)
    const documents = await documentService.listProposalDocuments()

    return c.json(successResponse({
      documents,
      total: documents.length
    }))
  } catch (error) {
    console.error('List documents error:', error)
    return c.json(errorResponse('Failed to list documents', error instanceof Error ? error.message : 'Unknown error'), 500)
  }
})

export default app