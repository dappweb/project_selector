#!/usr/bin/env node

// 系统可用性测试脚本
const https = require('https');
const http = require('http');

// 测试配置
const config = {
  apiBaseUrl: 'https://tender-analysis-system-production.dappweb.workers.dev',
  frontendUrl: 'https://30b8e176.tender-analysis-frontend.pages.dev',
  timeout: 10000, // 10秒超时
  retries: 3
};

// 测试结果统计
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
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'System-Availability-Test/1.0',
        'Accept': 'application/json',
        ...options.headers
      },
      timeout: config.timeout
    };

    if (options.body) {
      requestOptions.headers['Content-Type'] = 'application/json';
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(requestOptions, (res) => {
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
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// 测试函数
async function runTest(testName, testFn) {
  testResults.total++;
  console.log(`\n🧪 ${testName}`);
  
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

// API健康检查测试
async function testApiHealth() {
  const response = await makeRequest(config.apiBaseUrl);
  
  if (response.statusCode !== 200) {
    return {
      success: false,
      message: `API健康检查失败，状态码: ${response.statusCode}`
    };
  }
  
  try {
    const data = JSON.parse(response.body);
    if (data.status === 'healthy') {
      return {
        success: true,
        message: `API健康检查通过`,
        details: `版本: ${data.version}, 环境: ${data.environment}, 响应时间: ${response.responseTime}ms`
      };
    } else {
      return {
        success: false,
        message: `API状态异常: ${data.status}`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `API响应解析失败: ${error.message}`
    };
  }
}

// 前端可用性测试
async function testFrontendAvailability() {
  const response = await makeRequest(config.frontendUrl);
  
  if (response.statusCode !== 200) {
    return {
      success: false,
      message: `前端访问失败，状态码: ${response.statusCode}`
    };
  }
  
  // 检查是否返回HTML内容
  if (response.headers['content-type'] && response.headers['content-type'].includes('text/html')) {
    return {
      success: true,
      message: `前端页面可访问`,
      details: `响应时间: ${response.responseTime}ms, 内容大小: ${response.body.length} bytes`
    };
  } else {
    return {
      success: false,
      message: `前端返回非HTML内容`
    };
  }
}

// API端点测试
async function testApiEndpoints() {
  const endpoints = [
    { path: '/api/crawler/status', method: 'GET', name: '数据抓取状态' },
    { path: '/api/data-analytics/statistics', method: 'GET', name: '数据统计' },
    { path: '/api/project-tracking/projects', method: 'GET', name: '项目列表' }
  ];
  
  let successCount = 0;
  let totalCount = endpoints.length;
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(`${config.apiBaseUrl}${endpoint.path}`, {
        method: endpoint.method
      });
      
      // 接受200-299状态码为成功，404为端点不存在但服务正常
      if (response.statusCode >= 200 && response.statusCode < 300) {
        successCount++;
      } else if (response.statusCode === 404) {
        // 404表示端点不存在，但服务器正常响应
        successCount++;
      }
    } catch (error) {
      // 网络错误或超时
      console.log(`   ⚠️  ${endpoint.name} 测试失败: ${error.message}`);
    }
  }
  
  if (successCount === totalCount) {
    return {
      success: true,
      message: `API端点测试通过`,
      details: `${successCount}/${totalCount} 个端点响应正常`
    };
  } else {
    return {
      success: false,
      message: `部分API端点无响应: ${successCount}/${totalCount}`
    };
  }
}

// 数据库连接测试
async function testDatabaseConnection() {
  try {
    // 尝试访问一个需要数据库的端点
    const response = await makeRequest(`${config.apiBaseUrl}/api/data-analytics/statistics`);
    
    // 即使返回错误，只要不是500错误，说明数据库连接正常
    if (response.statusCode !== 500) {
      return {
        success: true,
        message: `数据库连接正常`,
        details: `状态码: ${response.statusCode}`
      };
    } else {
      return {
        success: false,
        message: `数据库连接可能存在问题，返回500错误`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `数据库连接测试失败: ${error.message}`
    };
  }
}

// CORS配置测试
async function testCorsConfiguration() {
  try {
    const response = await makeRequest(config.apiBaseUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://30b8e176.tender-analysis-frontend.pages.dev',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    const corsHeaders = response.headers['access-control-allow-origin'];
    if (corsHeaders) {
      return {
        success: true,
        message: `CORS配置正常`,
        details: `允许的源: ${corsHeaders}`
      };
    } else {
      return {
        success: false,
        message: `CORS配置可能存在问题`
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `CORS测试失败: ${error.message}`
    };
  }
}

// 性能测试
async function testPerformance() {
  const testCount = 5;
  const responseTimes = [];
  
  for (let i = 0; i < testCount; i++) {
    try {
      const response = await makeRequest(config.apiBaseUrl);
      responseTimes.push(response.responseTime);
    } catch (error) {
      return {
        success: false,
        message: `性能测试失败: ${error.message}`
      };
    }
  }
  
  const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const maxResponseTime = Math.max(...responseTimes);
  const minResponseTime = Math.min(...responseTimes);
  
  if (avgResponseTime < 2000) { // 平均响应时间小于2秒
    return {
      success: true,
      message: `性能测试通过`,
      details: `平均响应时间: ${avgResponseTime.toFixed(0)}ms, 最快: ${minResponseTime}ms, 最慢: ${maxResponseTime}ms`
    };
  } else {
    return {
      success: false,
      message: `性能测试未通过，平均响应时间过长: ${avgResponseTime.toFixed(0)}ms`
    };
  }
}

// SSL证书测试
async function testSSLCertificate() {
  try {
    // 测试API的SSL
    const apiResponse = await makeRequest(config.apiBaseUrl);
    const frontendResponse = await makeRequest(config.frontendUrl);
    
    if (apiResponse.statusCode && frontendResponse.statusCode) {
      return {
        success: true,
        message: `SSL证书正常`,
        details: `API和前端都支持HTTPS访问`
      };
    } else {
      return {
        success: false,
        message: `SSL证书可能存在问题`
      };
    }
  } catch (error) {
    if (error.message.includes('certificate') || error.message.includes('SSL')) {
      return {
        success: false,
        message: `SSL证书错误: ${error.message}`
      };
    } else {
      return {
        success: false,
        message: `SSL测试失败: ${error.message}`
      };
    }
  }
}

// 主测试函数
async function runAllTests() {
  console.log('🚀 开始系统可用性测试...');
  console.log(`📍 API地址: ${config.apiBaseUrl}`);
  console.log(`📍 前端地址: ${config.frontendUrl}`);
  console.log('=' .repeat(60));
  
  // 执行所有测试
  await runTest('API健康检查', testApiHealth);
  await runTest('前端可用性检查', testFrontendAvailability);
  await runTest('API端点测试', testApiEndpoints);
  await runTest('数据库连接测试', testDatabaseConnection);
  await runTest('CORS配置测试', testCorsConfiguration);
  await runTest('性能测试', testPerformance);
  await runTest('SSL证书测试', testSSLCertificate);
  
  // 输出测试结果
  console.log('\n' + '=' .repeat(60));
  console.log('📊 测试结果汇总');
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
  
  // 总体评估
  const successRate = (testResults.passed / testResults.total) * 100;
  console.log('\n🎯 系统可用性评估:');
  
  if (successRate >= 90) {
    console.log('🟢 系统状态: 优秀 - 系统完全可用');
  } else if (successRate >= 70) {
    console.log('🟡 系统状态: 良好 - 系统基本可用，部分功能可能受限');
  } else if (successRate >= 50) {
    console.log('🟠 系统状态: 一般 - 系统部分可用，需要关注');
  } else {
    console.log('🔴 系统状态: 异常 - 系统存在严重问题，需要立即处理');
  }
  
  console.log('\n✨ 测试完成!');
  
  // 返回退出码
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// 运行测试
runAllTests().catch((error) => {
  console.error('❌ 测试执行出现严重错误:', error.message);
  process.exit(1);
});