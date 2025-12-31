// 测试AI分析功能的脚本

const testTender = {
  id: "test_ai_project_001",
  title: "智能客服系统AI开发项目",
  content: "本项目需要开发一套基于人工智能技术的智能客服系统，包括自然语言处理、机器学习算法、深度学习模型等核心技术。系统需要支持多轮对话、意图识别、实体抽取、情感分析等功能。预期能够处理80%以上的常见客户咨询，提升客服效率。技术要求包括：Python开发、TensorFlow/PyTorch框架、NLP算法、对话管理、知识图谱等。",
  budget: 1500000,
  publishTime: new Date().toISOString(),
  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天后
  purchaser: "某科技有限公司",
  area: "北京",
  projectType: "AI开发",
  status: "ACTIVE"
}

console.log('测试招标项目数据：')
console.log(JSON.stringify(testTender, null, 2))

// 测试AI分析API
async function testAIAnalysis() {
  try {
    // 1. 首先创建测试项目（模拟）
    console.log('\n=== 测试AI分析功能 ===')
    
    // 2. 测试AI模型连接
    console.log('\n1. 测试AI模型连接...')
    const testResponse = await fetch('http://localhost:8787/api/ai-analysis/test-ai')
    const testResult = await testResponse.json()
    console.log('AI模型测试结果:', testResult)
    
    // 3. 获取支持的模型列表
    console.log('\n2. 获取支持的AI模型...')
    const modelsResponse = await fetch('http://localhost:8787/api/ai-analysis/models')
    const modelsResult = await modelsResponse.json()
    console.log('支持的AI模型:', modelsResult)
    
    // 4. 获取分析统计
    console.log('\n3. 获取分析统计...')
    const statsResponse = await fetch('http://localhost:8787/api/ai-analysis/statistics')
    const statsResult = await statsResponse.json()
    console.log('分析统计:', statsResult)
    
    console.log('\n=== AI分析功能测试完成 ===')
    
  } catch (error) {
    console.error('测试失败:', error)
  }
}

// 运行测试
testAIAnalysis()