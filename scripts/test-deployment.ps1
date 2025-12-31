# 部署测试脚本
# 测试已部署的 Worker 是否正常工作

param(
    [string]$WorkerUrl = ""
)

$ErrorActionPreference = "Stop"

if (-not $WorkerUrl) {
    Write-Host "请提供 Worker URL:" -ForegroundColor Yellow
    Write-Host "用法: .\scripts\test-deployment.ps1 -WorkerUrl 'https://your-worker.workers.dev'" -ForegroundColor Gray
    
    # 尝试从 wrangler 获取 URL
    try {
        Write-Host "`n🔍 尝试获取 Worker URL..." -ForegroundColor Cyan
        $deployments = wrangler deployments list --json | ConvertFrom-Json
        if ($deployments -and $deployments.Count -gt 0) {
            $WorkerUrl = $deployments[0].url
            Write-Host "✅ 找到 Worker URL: $WorkerUrl" -ForegroundColor Green
        } else {
            Write-Host "❌ 无法自动获取 Worker URL" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ 无法获取部署信息" -ForegroundColor Red
        exit 1
    }
}

Write-Host "🧪 测试部署: $WorkerUrl" -ForegroundColor Green

# 测试健康检查
Write-Host "`n1️⃣ 测试健康检查..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri $WorkerUrl -Method GET -TimeoutSec 30
    if ($healthResponse.status -eq "healthy") {
        Write-Host "✅ 健康检查通过" -ForegroundColor Green
        Write-Host "   版本: $($healthResponse.version)" -ForegroundColor Gray
        Write-Host "   环境: $($healthResponse.environment)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  健康检查响应异常" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 健康检查失败: $_" -ForegroundColor Red
}

# 测试抓取状态
Write-Host "`n2️⃣ 测试抓取状态..." -ForegroundColor Cyan
try {
    $statusUrl = "$WorkerUrl/api/crawler/status"
    $statusResponse = Invoke-RestMethod -Uri $statusUrl -Method GET -TimeoutSec 30
    if ($statusResponse.success) {
        Write-Host "✅ 抓取状态 API 正常" -ForegroundColor Green
        Write-Host "   状态: $($statusResponse.data.status)" -ForegroundColor Gray
        if ($statusResponse.data.lastUpdate) {
            Write-Host "   最后更新: $($statusResponse.data.lastUpdate)" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️  抓取状态 API 响应异常" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 抓取状态 API 失败: $_" -ForegroundColor Red
}

# 测试关键词配置
Write-Host "`n3️⃣ 测试关键词配置..." -ForegroundColor Cyan
try {
    $keywordsUrl = "$WorkerUrl/api/crawler/keywords"
    $keywordsResponse = Invoke-RestMethod -Uri $keywordsUrl -Method GET -TimeoutSec 30
    if ($keywordsResponse.success) {
        Write-Host "✅ 关键词配置 API 正常" -ForegroundColor Green
        Write-Host "   关键词数量: $($keywordsResponse.data.count)" -ForegroundColor Gray
        Write-Host "   关键词: $($keywordsResponse.data.keywords -join ', ')" -ForegroundColor Gray
    } else {
        Write-Host "⚠️  关键词配置 API 响应异常" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ 关键词配置 API 失败: $_" -ForegroundColor Red
}

# 测试手动抓取（可选）
Write-Host "`n4️⃣ 测试手动抓取 (可选)..." -ForegroundColor Cyan
$testCrawl = Read-Host "是否测试手动抓取功能？这会触发实际的 API 调用 (y/N)"
if ($testCrawl -eq "y" -or $testCrawl -eq "Y") {
    try {
        $crawlUrl = "$WorkerUrl/api/crawler/manual-fetch"
        $crawlBody = @{
            keyword = "AI开发"
            limit = 5
        } | ConvertTo-Json
        
        $crawlResponse = Invoke-RestMethod -Uri $crawlUrl -Method POST -Body $crawlBody -ContentType "application/json" -TimeoutSec 60
        if ($crawlResponse.success) {
            Write-Host "✅ 手动抓取测试成功" -ForegroundColor Green
            Write-Host "   处理数量: $($crawlResponse.data.results.processed)" -ForegroundColor Gray
            Write-Host "   总数量: $($crawlResponse.data.results.total)" -ForegroundColor Gray
        } else {
            Write-Host "⚠️  手动抓取测试响应异常" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "❌ 手动抓取测试失败: $_" -ForegroundColor Red
    }
} else {
    Write-Host "⏭️  跳过手动抓取测试" -ForegroundColor Gray
}

# 测试数据库连接
Write-Host "`n5️⃣ 测试数据库连接..." -ForegroundColor Cyan
try {
    $dbResult = wrangler d1 execute tender-analysis-db --command "SELECT COUNT(*) as count FROM tender_info;" --json
    if ($dbResult) {
        $dbData = $dbResult | ConvertFrom-Json
        Write-Host "✅ 数据库连接正常" -ForegroundColor Green
        Write-Host "   招标信息数量: $($dbData[0].count)" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ 数据库连接测试失败: $_" -ForegroundColor Red
}

Write-Host "`n🎉 部署测试完成!" -ForegroundColor Green

Write-Host "`n📊 监控建议:" -ForegroundColor Cyan
Write-Host "wrangler tail                                    # 查看实时日志" -ForegroundColor Gray
Write-Host "wrangler analytics                               # 查看使用统计" -ForegroundColor Gray

Write-Host "`n🔗 有用的链接:" -ForegroundColor Cyan
Write-Host "Worker URL: $WorkerUrl" -ForegroundColor Blue
Write-Host "Cloudflare Dashboard: https://dash.cloudflare.com" -ForegroundColor Blue
Write-Host "API 文档: $WorkerUrl (查看健康检查响应)" -ForegroundColor Blue