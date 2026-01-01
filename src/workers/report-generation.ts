/**
 * 报表生成Worker
 * 实现月度报告模板、图表数据生成API、数据导出功能
 */

import { Hono } from 'hono'
import { Env } from '../index'
import { ReportGenerationService } from '../services/report-generation'
import { successResponse, errorResponse } from '../utils/response'

const app = new Hono<{ Bindings: Env }>()

// 生成月度报告
app.post('/monthly/:year/:month', async (c) => {
  try {
    const year = parseInt(c.req.param('year'))
    const month = parseInt(c.req.param('month'))

    // 参数验证
    if (isNaN(year) || isNaN(month) || year < 2020 || year > 2030 || month < 1 || month > 12) {
      return c.json(errorResponse('无效的年份或月份参数'), 400)
    }

    const service = new ReportGenerationService(c.env)
    const report = await service.generateMonthlyReport(year, month)

    return c.json(successResponse(report, '月度报告生成成功'))
  } catch (error) {
    console.error('Generate monthly report error:', error)
    return c.json(
      errorResponse(
        '生成月度报告失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取报告模板列表
app.get('/templates', async (c) => {
  try {
    const service = new ReportGenerationService(c.env)
    const templates = await service.getReportTemplates()

    return c.json(successResponse(templates, '获取报告模板成功'))
  } catch (error) {
    console.error('Get report templates error:', error)
    return c.json(
      errorResponse(
        '获取报告模板失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 导出报告为PDF
app.post('/export/pdf/:reportId', async (c) => {
  try {
    const reportId = c.req.param('reportId')
    
    if (!reportId) {
      return c.json(errorResponse('报告ID不能为空'), 400)
    }

    const service = new ReportGenerationService(c.env)
    const fileName = await service.exportReportToPDF(reportId)

    return c.json(successResponse({
      fileName,
      downloadUrl: `/api/storage/download/${fileName}`
    }, 'PDF导出成功'))
  } catch (error) {
    console.error('Export PDF error:', error)
    return c.json(
      errorResponse(
        'PDF导出失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 导出报告为Excel
app.post('/export/excel/:reportId', async (c) => {
  try {
    const reportId = c.req.param('reportId')
    
    if (!reportId) {
      return c.json(errorResponse('报告ID不能为空'), 400)
    }

    const service = new ReportGenerationService(c.env)
    const fileName = await service.exportReportToExcel(reportId)

    return c.json(successResponse({
      fileName,
      downloadUrl: `/api/storage/download/${fileName}`
    }, 'Excel导出成功'))
  } catch (error) {
    console.error('Export Excel error:', error)
    return c.json(
      errorResponse(
        'Excel导出失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取图表数据
app.get('/charts/:reportId', async (c) => {
  try {
    const reportId = c.req.param('reportId')
    
    if (!reportId) {
      return c.json(errorResponse('报告ID不能为空'), 400)
    }

    // 从缓存获取报告数据
    const reportData = await c.env.CACHE.get(`report:monthly:${reportId}`)
    if (!reportData) {
      return c.json(errorResponse('报告不存在'), 404)
    }

    const report = JSON.parse(reportData)
    return c.json(successResponse(report.charts, '获取图表数据成功'))
  } catch (error) {
    console.error('Get chart data error:', error)
    return c.json(
      errorResponse(
        '获取图表数据失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取报告详情
app.get('/:reportId', async (c) => {
  try {
    const reportId = c.req.param('reportId')
    
    if (!reportId) {
      return c.json(errorResponse('报告ID不能为空'), 400)
    }

    // 从缓存获取报告数据
    const reportData = await c.env.CACHE.get(`report:monthly:${reportId}`)
    if (!reportData) {
      return c.json(errorResponse('报告不存在'), 404)
    }

    const report = JSON.parse(reportData)
    return c.json(successResponse(report, '获取报告详情成功'))
  } catch (error) {
    console.error('Get report details error:', error)
    return c.json(
      errorResponse(
        '获取报告详情失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 生成自定义报告
app.post('/custom', async (c) => {
  try {
    const body = await c.req.json()
    const { templateId, period, filters, sections } = body

    // 参数验证
    if (!templateId || !period) {
      return c.json(errorResponse('模板ID和时间周期不能为空'), 400)
    }

    // 模拟自定义报告生成
    const customReport = {
      id: `custom-${Date.now()}`,
      templateId,
      period,
      filters: filters || {},
      sections: sections || [],
      generatedAt: new Date().toISOString(),
      status: 'generating'
    }

    // 缓存报告状态
    await c.env.CACHE.put(
      `report:custom:${customReport.id}`,
      JSON.stringify(customReport),
      { expirationTtl: 24 * 60 * 60 } // 24小时过期
    )

    return c.json(successResponse(customReport, '自定义报告生成中'))
  } catch (error) {
    console.error('Generate custom report error:', error)
    return c.json(
      errorResponse(
        '生成自定义报告失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 获取报告列表
app.get('/', async (c) => {
  try {
    const { page = '1', limit = '10', type } = c.req.query()
    
    // 模拟报告列表数据
    const reports = [
      {
        id: 'monthly-2024-12-1735632000000',
        title: '2024年12月招投标分析报告',
        type: 'monthly',
        period: '2024-12',
        status: 'completed',
        generatedAt: '2024-12-31T08:00:00.000Z',
        summary: {
          totalProjects: 45,
          totalValue: 25600000,
          winRate: 68.5
        }
      },
      {
        id: 'monthly-2024-11-1733040000000',
        title: '2024年11月招投标分析报告',
        type: 'monthly',
        period: '2024-11',
        status: 'completed',
        generatedAt: '2024-11-30T08:00:00.000Z',
        summary: {
          totalProjects: 42,
          totalValue: 21200000,
          winRate: 67.8
        }
      }
    ]

    // 类型筛选
    const filteredReports = type ? reports.filter(r => r.type === type) : reports

    // 分页
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const startIndex = (pageNum - 1) * limitNum
    const endIndex = startIndex + limitNum
    const paginatedReports = filteredReports.slice(startIndex, endIndex)

    return c.json(successResponse({
      reports: paginatedReports,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: filteredReports.length,
        totalPages: Math.ceil(filteredReports.length / limitNum)
      }
    }, '获取报告列表成功'))
  } catch (error) {
    console.error('Get reports list error:', error)
    return c.json(
      errorResponse(
        '获取报告列表失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

// 删除报告
app.delete('/:reportId', async (c) => {
  try {
    const reportId = c.req.param('reportId')
    
    if (!reportId) {
      return c.json(errorResponse('报告ID不能为空'), 400)
    }

    // 从缓存删除报告
    await c.env.CACHE.delete(`report:monthly:${reportId}`)
    await c.env.CACHE.delete(`report:custom:${reportId}`)

    // 从R2删除相关文件
    try {
      await c.env.STORAGE.delete(`reports/${reportId}.pdf`)
      await c.env.STORAGE.delete(`reports/${reportId}.xlsx`)
    } catch (error) {
      // 文件可能不存在，忽略错误
      console.log('Delete report files warning:', error)
    }

    return c.json(successResponse(null, '报告删除成功'))
  } catch (error) {
    console.error('Delete report error:', error)
    return c.json(
      errorResponse(
        '删除报告失败',
        error instanceof Error ? error.message : 'Unknown error'
      ),
      500
    )
  }
})

export default app