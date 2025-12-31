import { Hono } from 'hono'
import { CostBenefitAnalysisService, CostBenefitInput, CostBenefitResult } from '../services/cost-benefit-analysis'
import { DatabaseService } from '../services/database'
import { successResponse, errorResponse } from '../utils/response'
import { validateTenderInfo } from '../utils/validation'
import { TenderInfo } from '../models/tender'
import { ProjectAnalysis } from '../models/analysis'

// 环境类型定义
interface Env {
  DB: D1Database
  KV: KVNamespace
  CACHE: KVNamespace
  [key: string]: any
}

// 创建 Hono 应用
const app = new Hono<{ Bindings: Env }>()

// 成本收益分析服务实例
let costBenefitService: CostBenefitAnalysisService
let databaseService: DatabaseService

// 初始化服务
function initializeServices(env: Env) {
  if (!costBenefitService) {
    costBenefitService = new CostBenefitAnalysisService()
  }
  if (!databaseService) {
    databaseService = new DatabaseService(env.DB)
  }
}

/**
 * 执行成本收益分析
 * POST /analyze/:tenderId
 */
app.post('/analyze/:tenderId', async (c) => {
  try {
    initializeServices(c.env)
    
    const tenderId = c.req.param('tenderId')
    if (!tenderId) {
      return c.json(errorResponse('招标项目ID不能为空'), 400)
    }

    // 获取招标信息
    const tenderInfo = await databaseService.getTenderById(tenderId)
    if (!tenderInfo) {
      return c.json(errorResponse('招标项目不存在'), 404)
    }

    // 获取项目分析（如果存在）
    let projectAnalysis: ProjectAnalysis | undefined
    try {
      projectAnalysis = await databaseService.getProjectAnalysisByTenderId(tenderId)
    } catch (error) {
      console.log('No existing project analysis found, proceeding without it')
    }

    // 获取自定义参数
    const customParameters = await c.req.json().catch(() => ({}))

    // 构建分析输入
    const input: CostBenefitInput = {
      tenderInfo,
      projectAnalysis,
      customParameters
    }

    // 执行成本收益分析
    const result = await costBenefitService.analyzeCostBenefit(input)

    // 保存分析结果到数据库
    await saveCostBenefitResult(tenderId, result, databaseService)

    // 缓存结果
    const cacheKey = `cost-benefit:${tenderId}`
    await c.env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 3600 }) // 1小时缓存

    return c.json(successResponse(result, '成本收益分析完成'))
  } catch (error) {
    console.error('Cost-benefit analysis error:', error)
    return c.json(errorResponse(
      '成本收益分析失败',
      error instanceof Error ? error.message : 'Unknown error'
    ), 500)
  }
})

/**
 * 获取成本收益分析结果
 * GET /result/:tenderId
 */
app.get('/result/:tenderId', async (c) => {
  try {
    initializeServices(c.env)
    
    const tenderId = c.req.param('tenderId')
    if (!tenderId) {
      return c.json(errorResponse('招标项目ID不能为空'), 400)
    }

    // 先尝试从缓存获取
    const cacheKey = `cost-benefit:${tenderId}`
    const cachedResult = await c.env.CACHE.get(cacheKey)
    if (cachedResult) {
      return c.json(successResponse(JSON.parse(cachedResult), '获取成本收益分析结果成功（缓存）'))
    }

    // 从数据库获取
    const result = await getCostBenefitResult(tenderId, databaseService)
    if (!result) {
      return c.json(errorResponse('成本收益分析结果不存在'), 404)
    }

    // 更新缓存
    await c.env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 3600 })

    return c.json(successResponse(result, '获取成本收益分析结果成功'))
  } catch (error) {
    console.error('Get cost-benefit result error:', error)
    return c.json(errorResponse(
      '获取成本收益分析结果失败',
      error instanceof Error ? error.message : 'Unknown error'
    ), 500)
  }
})

/**
 * 批量分析多个项目
 * POST /batch-analyze
 */
app.post('/batch-analyze', async (c) => {
  try {
    initializeServices(c.env)
    
    const { tenderIds, customParameters } = await c.req.json()
    
    if (!Array.isArray(tenderIds) || tenderIds.length === 0) {
      return c.json(errorResponse('招标项目ID列表不能为空'), 400)
    }

    if (tenderIds.length > 10) {
      return c.json(errorResponse('批量分析最多支持10个项目'), 400)
    }

    const results: Array<{ tenderId: string; result?: CostBenefitResult; error?: string }> = []

    // 并行处理多个项目
    const promises = tenderIds.map(async (tenderId: string) => {
      try {
        // 获取招标信息
        const tenderInfo = await databaseService.getTenderById(tenderId)
        if (!tenderInfo) {
          return { tenderId, error: '招标项目不存在' }
        }

        // 获取项目分析
        let projectAnalysis: ProjectAnalysis | undefined
        try {
          projectAnalysis = await databaseService.getProjectAnalysisByTenderId(tenderId)
        } catch (error) {
          // 忽略项目分析不存在的错误
        }

        // 构建分析输入
        const input: CostBenefitInput = {
          tenderInfo,
          projectAnalysis,
          customParameters
        }

        // 执行分析
        const result = await costBenefitService.analyzeCostBenefit(input)

        // 保存结果
        await saveCostBenefitResult(tenderId, result, databaseService)

        // 缓存结果
        const cacheKey = `cost-benefit:${tenderId}`
        await c.env.CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 3600 })

        return { tenderId, result }
      } catch (error) {
        console.error(`Batch analysis error for ${tenderId}:`, error)
        return { 
          tenderId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    })

    const batchResults = await Promise.all(promises)
    
    // 统计成功和失败数量
    const successCount = batchResults.filter(r => r.result).length
    const failureCount = batchResults.filter(r => r.error).length

    return c.json(successResponse({
      results: batchResults,
      summary: {
        total: tenderIds.length,
        success: successCount,
        failure: failureCount
      }
    }, `批量分析完成：成功${successCount}个，失败${failureCount}个`))
  } catch (error) {
    console.error('Batch cost-benefit analysis error:', error)
    return c.json(errorResponse(
      '批量成本收益分析失败',
      error instanceof Error ? error.message : 'Unknown error'
    ), 500)
  }
})

/**
 * 获取成本收益分析统计
 * GET /statistics
 */
app.get('/statistics', async (c) => {
  try {
    initializeServices(c.env)
    
    // 获取统计数据
    const stats = await getCostBenefitStatistics(databaseService)
    
    return c.json(successResponse(stats, '获取成本收益分析统计成功'))
  } catch (error) {
    console.error('Get cost-benefit statistics error:', error)
    return c.json(errorResponse(
      '获取成本收益分析统计失败',
      error instanceof Error ? error.message : 'Unknown error'
    ), 500)
  }
})

/**
 * 比较多个项目的成本收益
 * POST /compare
 */
app.post('/compare', async (c) => {
  try {
    initializeServices(c.env)
    
    const { tenderIds } = await c.req.json()
    
    if (!Array.isArray(tenderIds) || tenderIds.length < 2) {
      return c.json(errorResponse('至少需要2个项目进行比较'), 400)
    }

    if (tenderIds.length > 5) {
      return c.json(errorResponse('最多支持比较5个项目'), 400)
    }

    // 获取所有项目的成本收益分析结果
    const comparisons = []
    for (const tenderId of tenderIds) {
      const result = await getCostBenefitResult(tenderId, databaseService)
      if (result) {
        const tenderInfo = await databaseService.getTenderById(tenderId)
        comparisons.push({
          tenderId,
          tenderTitle: tenderInfo?.title || '未知项目',
          costBenefit: result
        })
      }
    }

    if (comparisons.length === 0) {
      return c.json(errorResponse('没有找到可比较的成本收益分析结果'), 404)
    }

    // 生成比较报告
    const comparisonReport = generateComparisonReport(comparisons)

    return c.json(successResponse(comparisonReport, '项目成本收益比较完成'))
  } catch (error) {
    console.error('Cost-benefit comparison error:', error)
    return c.json(errorResponse(
      '项目成本收益比较失败',
      error instanceof Error ? error.message : 'Unknown error'
    ), 500)
  }
})

/**
 * 删除成本收益分析结果
 * DELETE /result/:tenderId
 */
app.delete('/result/:tenderId', async (c) => {
  try {
    initializeServices(c.env)
    
    const tenderId = c.req.param('tenderId')
    if (!tenderId) {
      return c.json(errorResponse('招标项目ID不能为空'), 400)
    }

    // 从数据库删除
    await deleteCostBenefitResult(tenderId, databaseService)

    // 从缓存删除
    const cacheKey = `cost-benefit:${tenderId}`
    await c.env.CACHE.delete(cacheKey)

    return c.json(successResponse(null, '成本收益分析结果删除成功'))
  } catch (error) {
    console.error('Delete cost-benefit result error:', error)
    return c.json(errorResponse(
      '删除成本收益分析结果失败',
      error instanceof Error ? error.message : 'Unknown error'
    ), 500)
  }
})

// 辅助函数

/**
 * 保存成本收益分析结果到数据库
 */
async function saveCostBenefitResult(
  tenderId: string, 
  result: CostBenefitResult, 
  db: DatabaseService
): Promise<void> {
  try {
    // 检查是否已存在记录
    const existing = await getCostBenefitResult(tenderId, db)
    
    const reportData = {
      tenderId,
      costAnalysis: result.costAnalysis,
      benefitAnalysis: result.benefitAnalysis,
      roiAnalysis: result.roiAnalysis,
      cashFlowAnalysis: result.cashFlowAnalysis,
      financialMetrics: result.financialMetrics,
      recommendations: result.recommendations,
      riskAssessment: result.riskAssessment,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    if (existing) {
      // 更新现有记录
      await db.updateCostBenefitReportByTenderId(tenderId, reportData)
    } else {
      // 创建新记录
      await db.createCostBenefitReport(reportData)
    }
  } catch (error) {
    console.error('Save cost-benefit result error:', error)
    throw error
  }
}

/**
 * 从数据库获取成本收益分析结果
 */
async function getCostBenefitResult(
  tenderId: string, 
  db: DatabaseService
): Promise<CostBenefitResult | null> {
  try {
    const report = await db.getCostBenefitReportByTenderId(tenderId)
    if (!report) return null

    return {
      costAnalysis: report.costAnalysis,
      benefitAnalysis: report.benefitAnalysis,
      roiAnalysis: report.roiAnalysis,
      cashFlowAnalysis: report.cashFlowAnalysis,
      financialMetrics: report.financialMetrics,
      recommendations: report.recommendations,
      riskAssessment: report.riskAssessment
    }
  } catch (error) {
    console.error('Get cost-benefit result error:', error)
    return null
  }
}

/**
 * 删除成本收益分析结果
 */
async function deleteCostBenefitResult(
  tenderId: string, 
  db: DatabaseService
): Promise<void> {
  try {
    await db.deleteCostBenefitReport(tenderId)
  } catch (error) {
    console.error('Delete cost-benefit result error:', error)
    throw error
  }
}

/**
 * 获取成本收益分析统计
 */
async function getCostBenefitStatistics(db: DatabaseService) {
  try {
    const reports = await db.getAllCostBenefitReports()
    
    if (reports.length === 0) {
      return {
        totalReports: 0,
        averageROI: 0,
        averageCost: 0,
        averageBenefit: 0,
        riskDistribution: { LOW: 0, MEDIUM: 0, HIGH: 0 },
        topRecommendations: []
      }
    }

    // 计算统计指标
    const totalReports = reports.length
    const totalROI = reports.reduce((sum, report) => sum + (report.roiAnalysis?.neutral || 0), 0)
    const totalCost = reports.reduce((sum, report) => sum + (report.costAnalysis?.totalCost || 0), 0)
    const totalBenefit = reports.reduce((sum, report) => sum + (report.benefitAnalysis?.totalBenefit || 0), 0)
    
    const averageROI = totalROI / totalReports
    const averageCost = totalCost / totalReports
    const averageBenefit = totalBenefit / totalReports

    // 风险分布统计
    const riskDistribution = { LOW: 0, MEDIUM: 0, HIGH: 0 }
    reports.forEach(report => {
      const riskLevel = report.riskAssessment?.level || 'MEDIUM'
      riskDistribution[riskLevel]++
    })

    // 统计最常见的建议
    const recommendationCounts: { [key: string]: number } = {}
    reports.forEach(report => {
      if (report.recommendations) {
        report.recommendations.forEach((rec: string) => {
          recommendationCounts[rec] = (recommendationCounts[rec] || 0) + 1
        })
      }
    })

    const topRecommendations = Object.entries(recommendationCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([recommendation, count]) => ({ recommendation, count }))

    return {
      totalReports,
      averageROI: Math.round(averageROI * 100) / 100,
      averageCost: Math.round(averageCost),
      averageBenefit: Math.round(averageBenefit),
      riskDistribution,
      topRecommendations
    }
  } catch (error) {
    console.error('Get cost-benefit statistics error:', error)
    throw error
  }
}

/**
 * 生成项目比较报告
 */
function generateComparisonReport(comparisons: any[]) {
  const projects = comparisons.map(comp => ({
    tenderId: comp.tenderId,
    title: comp.tenderTitle,
    roi: comp.costBenefit.roiAnalysis.neutral,
    cost: comp.costBenefit.costAnalysis.totalCost,
    benefit: comp.costBenefit.benefitAnalysis.totalBenefit,
    riskLevel: comp.costBenefit.riskAssessment.level,
    breakEvenPoint: comp.costBenefit.roiAnalysis.breakEvenPoint,
    profitMargin: comp.costBenefit.financialMetrics.profitMargin
  }))

  // 排序：按ROI降序
  const sortedByROI = [...projects].sort((a, b) => b.roi - a.roi)
  
  // 排序：按成本升序
  const sortedByCost = [...projects].sort((a, b) => a.cost - b.cost)
  
  // 排序：按风险等级
  const riskOrder = { LOW: 1, MEDIUM: 2, HIGH: 3 }
  const sortedByRisk = [...projects].sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel])

  // 生成建议
  const recommendations = []
  
  // 最佳ROI项目
  const bestROI = sortedByROI[0]
  if (bestROI) {
    recommendations.push(`推荐项目"${bestROI.title}"，ROI最高(${bestROI.roi.toFixed(1)}%)`)
  }
  
  // 最低风险项目
  const lowestRisk = sortedByRisk[0]
  if (lowestRisk && lowestRisk.riskLevel === 'LOW') {
    recommendations.push(`项目"${lowestRisk.title}"风险最低，适合稳健投资`)
  }
  
  // 成本效益平衡项目
  const balanced = projects.find(p => p.roi > 15 && p.riskLevel !== 'HIGH')
  if (balanced) {
    recommendations.push(`项目"${balanced.title}"在收益和风险之间平衡较好`)
  }

  return {
    projects,
    rankings: {
      byROI: sortedByROI,
      byCost: sortedByCost,
      byRisk: sortedByRisk
    },
    summary: {
      totalProjects: projects.length,
      averageROI: projects.reduce((sum, p) => sum + p.roi, 0) / projects.length,
      averageCost: projects.reduce((sum, p) => sum + p.cost, 0) / projects.length,
      riskDistribution: {
        LOW: projects.filter(p => p.riskLevel === 'LOW').length,
        MEDIUM: projects.filter(p => p.riskLevel === 'MEDIUM').length,
        HIGH: projects.filter(p => p.riskLevel === 'HIGH').length
      }
    },
    recommendations
  }
}

export default app