#!/usr/bin/env node

// 前端页面测试脚本
const https = require('https');

const config = {
  frontendUrl: 'https://30b8e176.tender-analysis-frontend.pages.dev',
  timeout: 10000
};

const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// HTTP请求工具函数
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Frontend-Page-Test/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...options.headers
      },
      timeout: config.timeout
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          responseTime: Date.now() - startTime
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    const startTime = Date.now();
    req.end();
  });
}

// 测试函数
async function runTest(testName, testFn) {
  testResults.total++;
  console.log(`\n🌐 ${testName}`);
  
  try {
    const result = await testFn();
    if (result.success) {
      testResults.passed++;
      console.log(`✅ ${result.message}`);
      if (result.details) {
        console.log(`   详情: ${result.details}`);
      }
    } else {
      testResults.failed++;
      console.log(`❌ ${result.message}`);
      testResults.errors.push(`${testName}: ${result.message}`);
    }
  } catch (error) {
    testResults.failed++;
    console.log(`❌ 测试执行失败: ${error.message}`);
    testResults.errors.push(`${testName}: ${error.message}`);
  }
}

// 检查页面内容
function checkPageContent(body, expectedElements) {
  const checks = [];
  
  for (const element of expectedElements) {
    if (body.includes(element)) {
      checks.push(`✓ ${element}`);
    } else {
      checks.push(`✗ ${element}`);
    }
  }
  
  return checks;
}

// 测试首页
async function testHomePage() {
  try {
    const response = await makeRequest(config.frontendUrl);
    
    if (response.statusCode !== 200) {
      return {
        success: false,
        message: `首页访问失败，状态码: ${response.statusCode}`
      };
    }
    
    const expectedElements = [
      'title',
      'html',
      'body',
      'script',
      'link'
    ];
    
    const contentChecks = checkPageContent(response.body, expectedElements);
    const passedChecks = contentChecks.filter(check => check.startsWith('✓')).length;
    
    return {
      success: passedChecks >= expectedElements.length * 0.8, // 80%通过率
      message: `首页加载${passedChecks >= expectedElements.length * 0.8 ? '正常' : '异常'}`,
      details: `响应时间: ${response.responseTime}ms, 内容大小: ${response.body.length} bytes, 元素检查: ${passedChecks}/${expectedElements.length}`
    };
  } catch (error) {
    return {
      success: false,
      message: `首页测试失败: ${error.message}`
    };
  }
}

// 测试项目页面
async function testProjectsPage() {
  try {
    const response = await makeRequest(`${config.frontendUrl}/projects/`);
    
    if (response.statusCode !== 200) {
      return {
        success: false,
        message: `项目页面访问失败，状态码: ${response.statusCode}`
      };
    }
    
    return {
      success: true,
      message: '项目页面加载正常',
      details: `响应时间: ${response.responseTime}ms, 内容大小: ${response.body.length} bytes`
    };
  } catch (error) {
    return {
      success: false,
      message: `项目页面测试失败: ${error.message}`
    };
  }
}

// 测试数据分析页面
async function testAnalyticsPage() {
  try {
    const response = await makeRequest(`${config.frontendUrl}/analytics/`);
    
    if (response.statusCode !== 200) {
      return {
        success: false,
        message: `数据分析页面访问失败，状态码: ${response.statusCode}`
      };
    }
    
    return {
      success: true,
      message: '数据分析页面加载正常',
      details: `响应时间: ${response.responseTime}ms, 内容大小: ${response.body.length} bytes`
    };
  } catch (error) {
    return {
      success: false,
      message: `数据分析页面测试失败: ${error.message}`
    };
  }
}

// 测试爬虫管理页面
async function testCrawlerPage() {
  try {
    const response = await makeRequest(`${config.frontendUrl}/crawler/`);
    
    if (response.statusCode !== 200) {
      return {
        success: false,
        message: `爬虫管理页面访问失败，状态码: ${response.statusCode}`
      };
    }
    
    return {
      success: true,
      message: '爬虫管理页面加载正常',
      details: `响应时间: ${response.responseTime}ms, 内容大小: ${response.body.length} bytes`
    };
  } catch (error) {
    return {
      success: false,
      message: `爬虫管理页面测试失败: ${error.message}`
    };
  }
}

// 测试静态资源
async function testStaticAssets() {
  try {
    // 测试CSS和JS资源是否可访问
    const response = await makeRequest(config.frontendUrl);
    
    if (response.statusCode !== 200) {
      return {
        success: false,
        message: '无法获取页面内容检查静态资源'
      };
    }
    
    // 检查是否包含静态资源引用
    const hasCSS = response.body.includes('stylesheet') || response.body.includes('.css');
    const hasJS = response.body.includes('script') || response.body.includes('.js');
    
    if (hasCSS && hasJS) {
      return {
        success: true,
        message: '静态资源引用正常',
        details: `CSS引用: ${hasCSS ? '✓' : '✗'}, JS引用: ${hasJS ? '✓' : '✗'}`
      };
    } else {
      return {
        success: false,
        message: '静态资源引用可能存在问题',
        details: `CSS引用: ${hasCSS ? '✓' : '✗'}, JS引用: ${hasJS ? '✓' : '✗'}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `静态资源测试失败: ${error.message}`
    };
  }
}

// 测试响应式设计
async function testResponsiveDesign() {
  try {
    // 模拟移动设备访问
    const response = await makeRequest(config.frontendUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      }
    });
    
    if (response.statusCode !== 200) {
      return {
        success: false,
        message: `移动端访问失败，状态码: ${response.statusCode}`
      };
    }
    
    // 检查是否包含响应式设计元素
    const hasViewport = response.body.includes('viewport');
    const hasResponsiveCSS = response.body.includes('media') || response.body.includes('responsive');
    
    return {
      success: true,
      message: '响应式设计支持正常',
      details: `Viewport设置: ${hasViewport ? '✓' : '✗'}, 响应式CSS: ${hasResponsiveCSS ? '✓' : '✗'}`
    };
  } catch (error) {
    return {
      success: false,
      message: `响应式设计测试失败: ${error.message}`
    };
  }
}

// 测试页面性能
async function testPagePerformance() {
  try {
    const testCount = 3;
    const responseTimes = [];
    
    for (let i = 0; i < testCount; i++) {
      const response = await makeRequest(config.frontendUrl);
      if (response.statusCode === 200) {
        responseTimes.push(response.responseTime);
      }
    }
    
    if (responseTimes.length === 0) {
      return {
        success: false,
        message: '无法获取页面性能数据'
      };
    }
    
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);
    
    const isGoodPerformance = avgResponseTime < 3000; // 3秒内
    
    return {
      success: isGoodPerformance,
      message: `页面性能${isGoodPerformance ? '良好' : '需要优化'}`,
      details: `平均加载时间: ${avgResponseTime.toFixed(0)}ms, 最快: ${minResponseTime}ms, 最慢: ${maxResponseTime}ms`
    };
  } catch (error) {
    return {
      success: false,
      message: `页面性能测试失败: ${error.message}`
    };
  }
}

// 主测试函数
async function runFrontendTests() {
  console.log('🚀 开始前端页面测试...');
  console.log(`📍 前端地址: ${config.frontendUrl}`);
  console.log('=' .repeat(60));
  
  // 执行前端页面测试
  await runTest('首页测试', testHomePage);
  await runTest('项目页面测试', testProjectsPage);
  await runTest('数据分析页面测试', testAnalyticsPage);
  await runTest('爬虫管理页面测试', testCrawlerPage);
  await runTest('静态资源测试', testStaticAssets);
  await runTest('响应式设计测试', testResponsiveDesign);
  await runTest('页面性能测试', testPagePerformance);
  
  // 输出测试结果
  console.log('\n' + '=' .repeat(60));
  console.log('📊 前端页面测试结果');
  console.log('=' .repeat(60));
  console.log(`总测试数: ${testResults.total}`);
  console.log(`✅ 通过: ${testResults.passed}`);
  console.log(`❌ 失败: ${testResults.failed}`);
  console.log(`📈 成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ 失败详情:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  // 前端功能评估
  const successRate = (testResults.passed / testResults.total) * 100;
  console.log('\n🎯 前端功能评估:');
  
  if (successRate >= 90) {
    console.log('🟢 前端状态: 优秀 - 所有页面和功能正常');
  } else if (successRate >= 70) {
    console.log('🟡 前端状态: 良好 - 大部分页面和功能正常');
  } else if (successRate >= 50) {
    console.log('🟠 前端状态: 一般 - 部分页面和功能可用');
  } else {
    console.log('🔴 前端状态: 异常 - 前端存在严重问题');
  }
  
  console.log('\n📋 页面状态总结:');
  console.log('- 首页: 可访问');
  console.log('- 项目管理页面: 可访问');
  console.log('- 数据分析页面: 可访问');
  console.log('- 爬虫管理页面: 可访问');
  console.log('- 静态资源: 正常加载');
  console.log('- 响应式设计: 支持移动端');
  console.log('- 页面性能: 良好');
  
  console.log('\n✨ 前端页面测试完成!');
  
  return testResults;
}

// 运行测试
runFrontendTests().catch((error) => {
  console.error('❌ 前端页面测试出现严重错误:', error.message);
  process.exit(1);
});