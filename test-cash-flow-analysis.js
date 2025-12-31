/**
 * 测试现金流分析功能
 * 
 * 使用方法：
 * node test-cash-flow-analysis.js
 */

const API_BASE_URL = 'http://localhost:8787'

// 测试数据 - 大型系统集成项目
const testTenderInfo = {
  id: 'test-tender-cashflow-001',
  title: '智慧城市综合管理平台系统集成项目',
  description: '建设涵盖交通、环保、安防、政务等多个领域的智慧城市综合管理平台，包括数据采集、分析处理、可视化展示等功能',
  purchaser: '某市政府信息化办公室',
  budget: 8000000, // 800万预算
  area: '上海市',
  status: 'ACTIVE',
  publishDate: new Date().toISOString(),
  deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60天后
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

// 现金流分析参数
const cashFlowParameters = {
  // 基础参数
  laborRatePerDay: 1000, // 人日单价1000元
  projectDurationMonths: 12, // 项目周期12个月
  teamSize: 10, // 团队规模10人
  technologyComplexity: 'MEDIUM', // 中等技术复杂度
  riskLevel: 'MEDIUM', // 中等风险
  discountRate: 0.08, // 8%折现率
  
  // 市场条件（用于ROI预测）
  marketConditions: {
    economicGrowthRate: 0.06, // 6%经济增长率
    industryGrowthRate: 0.12, // 12%智慧城市行业增长率
    competitionLevel: 'MEDIUM', // 中等竞争水平
    marketMaturity: 'GROWING' // 成长期市场
  },
  
  // 历史数据
  historicalData: {
    similarProjectsROI: [28, 35, 22, 31, 26], // 类似系统集成项目的历史ROI
    clientSatisfactionRate: 0.82, // 82%客户满意度
    projectSuccessRate: 0.85 // 85%项目成功率
  }
}

async function testCashFlowAnalysis() {
  console.log('🚀 开始测试现金流分析功能...\n')

  try {
    // 1. 检查服务器状态
    console.log('1. 检查服务器状态...')
    const healthResponse = await fetch(`${API_BASE_URL}/`)
    const healthResult = await healthResponse.json()
    console.log('✅ 服务器状态:', healthResult.status)

    // 2. 显示测试项目信息
    console.log('\n2. 测试项目信息:')
    console.log(`项目名称: ${testTenderInfo.title}`)
    console.log(`项目预算: ¥${testTenderInfo.budget.toLocaleString()}`)
    console.log(`采购方: ${testTenderInfo.purchaser}`)
    console.log(`项目类型: 系统集成项目`)
    console.log(`项目周期: ${cashFlowParameters.projectDurationMonths}个月`)
    console.log(`团队规模: ${cashFlowParameters.teamSize}人`)
    console.log(`人日单价: ¥${cashFlowParameters.laborRatePerDay.toLocaleString()}`)

    // 3. 预测付款计划
    console.log('\n3. 预期付款计划 (大型项目里程碑付款):')
    const paymentSchedule = [
      { name: '合同签署', percentage: 20, month: 1, amount: testTenderInfo.budget * 0.2 },
      { name: '需求确认', percentage: 15, month: 2, amount: testTenderInfo.budget * 0.15 },
      { name: '设计完成', percentage: 20, month: 4, amount: testTenderInfo.budget * 0.2 },
      { name: '开发完成', percentage: 25, month: 7, amount: testTenderInfo.budget * 0.25 },
      { name: '测试通过', percentage: 15, month: 9, amount: testTenderInfo.budget * 0.15 },
      { name: '项目验收', percentage: 5, month: 10, amount: testTenderInfo.budget * 0.05 }
    ]

    paymentSchedule.forEach(payment => {
      console.log(`  第${payment.month}月: ${payment.name} - ¥${payment.amount.toLocaleString()} (${payment.percentage}%)`)
    })

    // 4. 预测成本分布
    console.log('\n4. 预期成本分布 (系统集成项目-后期重载):')
    
    // 计算总成本
    const workDays = cashFlowParameters.projectDurationMonths * 22
    const totalPersonDays = workDays * cashFlowParameters.teamSize
    const laborCost = totalPersonDays * cashFlowParameters.laborRatePerDay
    const technologyCost = laborCost * 1.3 * 0.2 // 中等复杂度
    const managementCost = (laborCost + technologyCost) * 0.3
    const riskCost = (laborCost + technologyCost + managementCost) * 0.10
    const totalCost = laborCost + technologyCost + managementCost + riskCost

    console.log(`预期总成本: ¥${totalCost.toLocaleString()}`)

    // 后期重载分布：前50%时间30%成本，后50%时间70%成本
    const frontMonths = 6
    const backMonths = 6
    const frontCost = totalCost * 0.3
    const backCost = totalCost * 0.7
    const frontMonthlyCost = frontCost / frontMonths
    const backMonthlyCost = backCost / backMonths

    console.log(`前6个月月均成本: ¥${frontMonthlyCost.toLocaleString()}`)
    console.log(`后6个月月均成本: ¥${backMonthlyCost.toLocaleString()}`)

    // 5. 预测月度现金流
    console.log('\n5. 预期月度现金流分析:')
    
    const monthlyFlows = []
    let cumulativeFlow = 0

    for (let month = 1; month <= 12; month++) {
      // 收入
      const payment = paymentSchedule.find(p => p.month === month)
      const income = payment ? payment.amount : 0

      // 支出
      const expense = month <= 6 ? frontMonthlyCost : backMonthlyCost

      // 净现金流
      const netFlow = income - expense
      cumulativeFlow += netFlow

      monthlyFlows.push({
        month,
        income,
        expense,
        netFlow,
        cumulativeFlow
      })

      console.log(`第${month}月: 收入¥${income.toLocaleString()}, 支出¥${expense.toLocaleString()}, 净流入¥${netFlow.toLocaleString()}, 累计¥${cumulativeFlow.toLocaleString()}`)
    }

    // 6. 关键财务指标
    console.log('\n6. 关键财务指标:')
    
    const totalInflow = monthlyFlows.reduce((sum, flow) => sum + flow.income, 0)
    const totalOutflow = monthlyFlows.reduce((sum, flow) => sum + flow.expense, 0)
    const netCashFlow = totalInflow - totalOutflow
    const peakFunding = Math.abs(Math.min(...monthlyFlows.map(flow => flow.cumulativeFlow)))
    
    // 回收期
    let paybackPeriod = 12
    for (let i = 0; i < monthlyFlows.length; i++) {
      if (monthlyFlows[i].cumulativeFlow >= 0) {
        paybackPeriod = i + 1
        break
      }
    }

    console.log(`总收入: ¥${totalInflow.toLocaleString()}`)
    console.log(`总支出: ¥${totalOutflow.toLocaleString()}`)
    console.log(`净现金流: ¥${netCashFlow.toLocaleString()}`)
    console.log(`最大资金需求: ¥${peakFunding.toLocaleString()}`)
    console.log(`回收期: ${paybackPeriod}个月`)

    // 7. 风险分析
    console.log('\n7. 现金流风险分析:')
    
    const fundingRatio = peakFunding / totalInflow
    let liquidityRisk = 'LOW'
    if (fundingRatio > 0.5) liquidityRisk = 'HIGH'
    else if (fundingRatio > 0.3) liquidityRisk = 'MEDIUM'

    console.log(`资金需求比例: ${(fundingRatio * 100).toFixed(1)}%`)
    console.log(`流动性风险等级: ${liquidityRisk}`)

    // 现金流波动性
    const netFlows = monthlyFlows.map(flow => flow.netFlow)
    const avgNetFlow = netFlows.reduce((sum, flow) => sum + flow, 0) / netFlows.length
    const variance = netFlows.reduce((sum, flow) => sum + Math.pow(flow - avgNetFlow, 2), 0) / netFlows.length
    const volatility = Math.sqrt(variance)

    console.log(`现金流波动性: ¥${volatility.toLocaleString()}`)

    // 8. 情景分析
    console.log('\n8. 现金流情景分析:')
    
    console.log('🟢 乐观情景 (20%概率):')
    console.log('  - 客户付款及时，无延迟')
    console.log('  - 成本控制良好，节省5%')
    console.log('  - 项目进展顺利，无额外支出')
    console.log(`  - 预期净现金流: ¥${(netCashFlow * 1.15).toLocaleString()}`)

    console.log('\n🟡 中性情景 (60%概率):')
    console.log('  - 按计划付款和支出')
    console.log('  - 正常项目进展')
    console.log('  - 风险可控')
    console.log(`  - 预期净现金流: ¥${netCashFlow.toLocaleString()}`)

    console.log('\n🔴 悲观情景 (20%概率):')
    console.log('  - 客户付款延迟1-2个月')
    console.log('  - 成本超支10%')
    console.log('  - 项目遇到技术困难')
    console.log(`  - 预期净现金流: ¥${(netCashFlow * 0.8).toLocaleString()}`)

    // 9. 建议
    console.log('\n9. 现金流管理建议:')
    
    if (liquidityRisk === 'HIGH') {
      console.log('⚠️  流动性风险较高，建议:')
      console.log('  1. 争取更多预付款或调整付款计划')
      console.log('  2. 准备充足的营运资金或信贷额度')
      console.log('  3. 建立现金流预警机制')
    } else if (liquidityRisk === 'MEDIUM') {
      console.log('✅ 流动性风险适中，建议:')
      console.log('  1. 建立现金流监控机制')
      console.log('  2. 保持合理的现金储备')
    } else {
      console.log('✅ 流动性风险较低，现金流管理相对容易')
    }

    if (paybackPeriod <= 6) {
      console.log('✅ 回收期较短，投资回报较快')
    } else if (paybackPeriod <= 12) {
      console.log('✅ 回收期适中，符合一般项目预期')
    } else {
      console.log('⚠️  回收期较长，需要考虑资金成本')
    }

    console.log('\n📊 其他建议:')
    console.log('1. 与客户协商优化付款计划，减少资金压力')
    console.log('2. 建立分阶段交付机制，确保付款节点可控')
    console.log('3. 制定成本控制措施，避免超支风险')
    console.log('4. 建立应急资金计划，应对突发情况')

    console.log('\n🎯 现金流分析完成！')
    console.log('现金流分析服务能够全面分析项目的资金流动情况，')
    console.log('为项目财务管理和投资决策提供重要依据。')

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
  }
}

// 运行测试
testCashFlowAnalysis()