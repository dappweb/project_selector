# Cloudflare 资源创建脚本
# 此脚本将创建所需的 Cloudflare 资源并输出配置信息

$ErrorActionPreference = "Stop"

Write-Host "📦 创建 Cloudflare 资源..." -ForegroundColor Green

# 检查 wrangler 是否已安装和登录
try {
    wrangler whoami | Out-Null
} catch {
    Write-Host "❌ 请先安装并登录 Wrangler CLI:" -ForegroundColor Red
    Write-Host "npm install -g wrangler" -ForegroundColor Yellow
    Write-Host "wrangler auth login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ 开始创建资源..." -ForegroundColor Green

# 创建 D1 数据库
Write-Host "`n🗄️  创建 D1 数据库..." -ForegroundColor Cyan
try {
    $dbOutput = wrangler d1 create tender-analysis-db 2>&1
    Write-Host $dbOutput -ForegroundColor Gray
} catch {
    Write-Host "⚠️  数据库可能已存在: $_" -ForegroundColor Yellow
}

# 创建 KV 命名空间
Write-Host "`n🔑 创建 KV 命名空间..." -ForegroundColor Cyan

$kvNamespaces = @("KV", "CACHE", "CONFIG")
foreach ($namespace in $kvNamespaces) {
    try {
        Write-Host "创建 $namespace 命名空间..." -ForegroundColor Blue
        $kvOutput = wrangler kv:namespace create $namespace 2>&1
        Write-Host $kvOutput -ForegroundColor Gray
        
        Write-Host "创建 $namespace 预览命名空间..." -ForegroundColor Blue
        $kvPreviewOutput = wrangler kv:namespace create $namespace --preview 2>&1
        Write-Host $kvPreviewOutput -ForegroundColor Gray
    } catch {
        Write-Host "⚠️  KV 命名空间 $namespace 可能已存在: $_" -ForegroundColor Yellow
    }
}

# 创建 R2 存储桶
Write-Host "`n📦 创建 R2 存储桶..." -ForegroundColor Cyan
try {
    $r2Output = wrangler r2 bucket create tender-documents 2>&1
    Write-Host $r2Output -ForegroundColor Gray
} catch {
    Write-Host "⚠️  R2 存储桶可能已存在: $_" -ForegroundColor Yellow
}

# 创建消息队列
Write-Host "`n📬 创建消息队列..." -ForegroundColor Cyan
try {
    $queueOutput = wrangler queues create notification-queue 2>&1
    Write-Host $queueOutput -ForegroundColor Gray
} catch {
    Write-Host "⚠️  消息队列可能已存在: $_" -ForegroundColor Yellow
}

Write-Host "`n✅ 资源创建完成!" -ForegroundColor Green

# 显示资源列表
Write-Host "`n📋 当前资源列表:" -ForegroundColor Cyan

Write-Host "`n🗄️  D1 数据库:" -ForegroundColor Blue
try {
    wrangler d1 list
} catch {
    Write-Host "无法获取 D1 数据库列表" -ForegroundColor Red
}

Write-Host "`n🔑 KV 命名空间:" -ForegroundColor Blue
try {
    wrangler kv:namespace list
} catch {
    Write-Host "无法获取 KV 命名空间列表" -ForegroundColor Red
}

Write-Host "`n📦 R2 存储桶:" -ForegroundColor Blue
try {
    wrangler r2 bucket list
} catch {
    Write-Host "无法获取 R2 存储桶列表" -ForegroundColor Red
}

Write-Host "`n📬 消息队列:" -ForegroundColor Blue
try {
    wrangler queues list
} catch {
    Write-Host "无法获取消息队列列表" -ForegroundColor Red
}

Write-Host "`n📝 下一步:" -ForegroundColor Yellow
Write-Host "1. 复制上面显示的资源ID" -ForegroundColor Gray
Write-Host "2. 更新 wrangler.toml 文件中的相应ID" -ForegroundColor Gray
Write-Host "3. 运行部署脚本: .\scripts\deploy.ps1" -ForegroundColor Gray

Write-Host "`n💡 提示: 您也可以使用以下命令单独查看资源:" -ForegroundColor Cyan
Write-Host "wrangler d1 list" -ForegroundColor Gray
Write-Host "wrangler kv:namespace list" -ForegroundColor Gray
Write-Host "wrangler r2 bucket list" -ForegroundColor Gray
Write-Host "wrangler queues list" -ForegroundColor Gray