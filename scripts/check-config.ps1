# 配置检查脚本
# 检查 wrangler.toml 配置是否完整

$ErrorActionPreference = "Stop"

Write-Host "🔍 检查 Cloudflare 配置..." -ForegroundColor Green

# 检查 wrangler.toml 是否存在
if (-not (Test-Path "wrangler.toml")) {
    Write-Host "❌ wrangler.toml 文件不存在" -ForegroundColor Red
    exit 1
}

# 读取配置文件
$config = Get-Content "wrangler.toml" -Raw

# 检查占位符
$placeholders = @(
    "your-database-id-here",
    "your-kv-namespace-id-here", 
    "your-main-kv-namespace-id-here",
    "your-config-kv-namespace-id-here",
    "your-preview-kv-namespace-id-here",
    "your-preview-main-kv-namespace-id-here",
    "your-preview-config-kv-namespace-id-here"
)

$hasPlaceholders = $false
foreach ($placeholder in $placeholders) {
    if ($config -match $placeholder) {
        Write-Host "⚠️  发现占位符: $placeholder" -ForegroundColor Yellow
        $hasPlaceholders = $true
    }
}

if ($hasPlaceholders) {
    Write-Host "`n❌ 配置文件包含占位符，需要先创建资源" -ForegroundColor Red
    Write-Host "运行以下命令创建资源:" -ForegroundColor Cyan
    Write-Host "npm run setup" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ wrangler.toml 配置检查通过" -ForegroundColor Green

# 检查 Wrangler CLI
try {
    $wranglerVersion = wrangler --version
    Write-Host "✅ Wrangler CLI: $wranglerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Wrangler CLI 未安装" -ForegroundColor Red
    Write-Host "安装命令: npm install -g wrangler" -ForegroundColor Yellow
    exit 1
}

# 检查登录状态
try {
    $whoami = wrangler whoami
    Write-Host "✅ Cloudflare 认证: $whoami" -ForegroundColor Green
} catch {
    Write-Host "❌ 未登录 Cloudflare" -ForegroundColor Red
    Write-Host "登录命令: wrangler auth login" -ForegroundColor Yellow
    exit 1
}

# 检查 TypeScript 编译
Write-Host "`n🔨 检查 TypeScript 编译..." -ForegroundColor Cyan
try {
    npx tsc --noEmit
    Write-Host "✅ TypeScript 编译检查通过" -ForegroundColor Green
} catch {
    Write-Host "❌ TypeScript 编译失败" -ForegroundColor Red
    Write-Host "请修复编译错误后重试" -ForegroundColor Yellow
    exit 1
}

# 检查依赖
Write-Host "`n📦 检查依赖..." -ForegroundColor Cyan
if (-not (Test-Path "node_modules")) {
    Write-Host "❌ 依赖未安装" -ForegroundColor Red
    Write-Host "安装命令: npm install" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ 依赖检查通过" -ForegroundColor Green

# 检查资源是否存在
Write-Host "`n🔍 检查 Cloudflare 资源..." -ForegroundColor Cyan

try {
    # 检查 D1 数据库
    $databases = wrangler d1 list --json | ConvertFrom-Json
    $dbExists = $databases | Where-Object { $_.name -eq "tender-analysis-db" }
    if ($dbExists) {
        Write-Host "✅ D1 数据库存在: tender-analysis-db" -ForegroundColor Green
    } else {
        Write-Host "⚠️  D1 数据库不存在: tender-analysis-db" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  无法检查 D1 数据库" -ForegroundColor Yellow
}

try {
    # 检查 KV 命名空间
    $kvNamespaces = wrangler kv:namespace list --json | ConvertFrom-Json
    $kvCount = $kvNamespaces.Count
    Write-Host "✅ KV 命名空间数量: $kvCount" -ForegroundColor Green
} catch {
    Write-Host "⚠️  无法检查 KV 命名空间" -ForegroundColor Yellow
}

try {
    # 检查 R2 存储桶
    $buckets = wrangler r2 bucket list --json | ConvertFrom-Json
    $bucketExists = $buckets | Where-Object { $_.name -eq "tender-documents" }
    if ($bucketExists) {
        Write-Host "✅ R2 存储桶存在: tender-documents" -ForegroundColor Green
    } else {
        Write-Host "⚠️  R2 存储桶不存在: tender-documents" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  无法检查 R2 存储桶" -ForegroundColor Yellow
}

Write-Host "`n🎉 配置检查完成!" -ForegroundColor Green
Write-Host "`n📋 部署准备状态:" -ForegroundColor Cyan
Write-Host "✅ 配置文件完整" -ForegroundColor Green
Write-Host "✅ Wrangler CLI 就绪" -ForegroundColor Green  
Write-Host "✅ Cloudflare 认证通过" -ForegroundColor Green
Write-Host "✅ TypeScript 编译通过" -ForegroundColor Green
Write-Host "✅ 依赖安装完成" -ForegroundColor Green

Write-Host "`n🚀 可以开始部署:" -ForegroundColor Yellow
Write-Host "npm run deploy:full        # 部署到开发环境" -ForegroundColor Gray
Write-Host "npm run deploy:full:prod   # 部署到生产环境" -ForegroundColor Gray