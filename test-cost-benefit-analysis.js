/**
 * 测试成本收益分析功能
 * 
 * 使用方法：
 * node test-cost-benefit-analysis.js
 */

const API_BASE_URL = 'http://localhost:8787'

// 测试数据
const testTenderInfo = {
  id: 'test-tender-001',
  title: 'AI智能客服系统开发项目',
  description: '开发基于人工智能的智能客服系统，包括自然语言处理、知识图谱、多轮对话等功能',
  purchaser: '某大型银行',
  budget: 2000000, // 200万预算
  area: '北京市',
  status: 'ACTIVE',
  publishDate: new Date().toISOString(),
  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天后
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

// 自定义参数
const customParameters = {
  laborRatePerDay: 1000, // 人日单价1000元
  projectDurationMonths: 8, // 项目周期8个月
  teamSize: 6, // 团队规模6人
  technologyComplexity: 'HIGH', // 高技术复杂度
  riskLevel: 'MEDIUM', // 中等风险
  discountRate: 0.08 // 8%折现率
}

async function testCostBenefitAnalysis() {
  console.log('🚀 开始测试成本收益分析功能...\n')

  try {
    // 1. 首先创建测试招标项目
    console.log('1. 创建测试招标项目...')
    const createTenderResponse = await fetch(`${API_BASE_URL}/api/crawler/test-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenders: [testTenderInfo] })
    })

    if (!createTenderResponse.ok) {
      console.log('⚠️  招标项目可能已存在，继续测试...')
    } else {
      const createResult = await createTenderResponse.json()
      console.log('✅ 招标项目创建成功')
    }

    // 2. 执行成本收益分析
    console.log('\n2. 执行成本收益分析...')
    const analysisResponse = await fetch(`${API_BASE_URL}/api/cost-benefit-analysis/analyze/${testTenderInfo.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customParameters)
    })

    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text()
      throw new Error(`分析失败: ${analysisResponse.status} - ${errorText}`)
    }

    const analysisResult = await analysisResponse.json()
    console.log('✅ 成本收益分析完成')
    
    // 显示分析结果摘要
    const { costAnalysis, benefitAnalysis, roiAnalysis, financialMetrics } = analysisResult.data
    
    console.log('\n📊 分析结果摘要:')
    console.log(`总成本: ¥${costAnalysis.totalCost.toLocaleString()}`)
    console.log(`总收益: ¥${benefitAnalysis.totalBenefit.toLocaleString()}`)
    console.log(`ROI (中性): ${roiAnalysis.neutral.toFixed(1)}%`)
    console.log(`利润率: ${financialMetrics.profitMargin.toFixed(1)}%`)
    console.log(`盈亏平衡点: ${roiAnalysis.breakEvenPoint.toFixed(1)}个月`)
    
    console.log('\n💡 建议:')
    analysisResult.data.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`)
    })

    // 3. 获取分析结果
    console.log('\n3. 获取分析结果...')
    const getResultResponse = await fetch(`${API_BASE_URL}/api/cost-benefit-analysis/result/${testTenderInfo.id}`)
    
    if (!getResultResponse.ok) {
      throw new Error(`获取结果失败: ${getResultResponse.status}`)
    }

    const getResult = await getResultResponse.json()
    console.log('✅ 成功获取分析结果')

    // 4. 测试统计功能
    console.log('\n4. 测试统计功能...')
    const statsResponse = await fetch(`${API_BASE_URL}/api/cost-benefit-analysis/statistics`)
    
    if (!statsResponse.ok) {
      throw new Error(`获取统计失败: ${statsResponse.status}`)
    }

    const statsResult = await statsResponse.json()
    console.log('✅ 统计功能正常')
    console.log(`总报告数: ${statsResult.data.totalReports}`)
    console.log(`平均ROI: ${statsResult.data.averageROI}%`)
    console.log(`平均成本: ¥${statsResult.data.averageCost.toLocaleString()}`)

    // 5. 测试批量分析（创建另一个测试项目）
    console.log('\n5. 测试批量分析...')
    const testTender2 = {
      ...testTenderInfo,
      id: 'test-tender-002',
      title: '企业管理系统升级项目',
      budget: 800000,
      description: '对现有企业管理系统进行升级改造，提升用户体验和系统性能'
    }

    // 创建第二个测试项目
    await fetch(`${API_BASE_URL}/api/crawler/test-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenders: [testTender2] })
    })

    // 批量分析
    const batchResponse = await fetch(`${API_BASE_URL}/api/cost-benefit-analysis/batch-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenderIds: [testTenderInfo.id, testTender2.id],
        customParameters: {
          laborRatePerDay: 800,
          technologyComplexity: 'MEDIUM'
        }
      })
    })

    if (!batchResponse.ok) {
      throw new Error(`批量分析失败: ${batchResponse.status}`)
    }

    const batchResult = await batchResponse.json()
    console.log('✅ 批量分析完成')
    console.log(`成功: ${batchResult.data.summary.success}个, 失败: ${batchResult.data.summary.failure}个`)

    // 6. 测试项目比较
    console.log('\n6. 测试项目比较...')
    const compareResponse = await fetch(`${API_BASE_URL}/api/cost-benefit-analysis/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenderIds: [testTenderInfo.id, testTender2.id]
      })
    })

    if (!compareResponse.ok) {
      throw new Error(`项目比较失败: ${compareResponse.status}`)
    }

    const compareResult = await compareResponse.json()
    console.log('✅ 项目比较完成')
    console.log('\n🏆 比较结果:')
    compareResult.data.rankings.byROI.forEach((project, index) => {
      console.log(`${index + 1}. ${project.title} - ROI: ${project.roi.toFixed(1)}%`)
    })

    console.log('\n🎉 所有测试完成！成本收益分析功能正常工作')

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    
    // 显示详细错误信息
    if (error.response) {
      console.error('响应状态:', error.response.status)
      console.error('响应内容:', await error.response.text())
    }
  }
}

// 运行测试
testCostBenefitAnalysis()