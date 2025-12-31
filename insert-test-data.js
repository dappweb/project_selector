// 插入测试数据的脚本

async function insertTestData() {
  try {
    console.log('=== 插入测试招标数据 ===')
    
    // 创建测试招标项目
    const testTender = {
      keyword: "AI开发测试",
      limit: 1
    }
    
    // 由于没有真实API，我们直接调用手动抓取来创建测试数据
    const response = await fetch('http://localhost:8787/api/crawler/manual-fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testTender)
    })
    
    const result = await response.json()
    console.log('手动抓取结果:', result)
    
    // 获取抓取状态，查看是否有数据
    const statusResponse = await fetch('http://localhost:8787/api/crawler/status')
    const statusResult = await statusResponse.json()
    console.log('抓取状态:', statusResult)
    
  } catch (error) {
    console.error('插入测试数据失败:', error)
  }
}

insertTestData()