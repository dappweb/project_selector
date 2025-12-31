# Cloudflare 部署脚本 (PowerShell)
# 使用方法: .\scripts\deploy.ps1 [environment]
# 环境: development (默认) 或 production

param(
    [string]$Environment = "development"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 开始部署到 Cloudflare ($Environment 环境)..." -ForegroundColor Green

# 检查 wrangler 是否已安装
try {
    wrangler --version | Out-Null
    Write-Host "✅ Wrangler CLI 已就绪" -ForegroundColor Green
} catch {
    Write-Host "❌ Wrangler CLI 未安装，请先安装:" -ForegroundColor Red
    Write-Host "npm install -g wrangler" -ForegroundColor Yellow
    exit 1
}

# 检查是否已登录
try {
    wrangler whoami | Out-Null
    Write-Host "✅ Cloudflare 认证已就绪" -ForegroundColor Green
} catch {
    Write-Host "❌ 请先登录 Cloudflare:" -ForegroundColor Red
    Write-Host "wrangler auth login" -ForegroundColor Yellow
    exit 1
}

# 检查 wrangler.toml 配置
$wranglerContent = Get-Content "wrangler.toml" -Raw
if ($wranglerContent -match "your-database-id-here") {
    Write-Host "⚠️  检测到 wrangler.toml 中有占位符ID，需要先创建资源..." -ForegroundColor Yellow
    
    Write-Host "📦 创建 Cloudflare 资源..." -ForegroundColor Cyan
    
    # 创建 D1 数据库
    Write-Host "创建 D1 数据库..." -ForegroundColor Blue
    try {
        $dbResult = wrangler d1 create tender-analysis-db --json 2>$null
        if ($dbResult) {
            $dbData = $dbResult | ConvertFrom-Json
            Write-Host "✅ D1 数据库创建成功: $($dbData.database_id)" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠️  D1 数据库可能已存在，请手动检查" -ForegroundColor Yellow
    }
    
    # 创建 KV 命名空间
    Write-Host "创建 KV 命名空间..." -ForegroundColor Blue
    
    try {
        wrangler kv:namespace create "KV" 2>$null
        wrangler kv:namespace create "KV" --preview 2>$null
        wrangler kv:namespace create "CACHE" 2>$null
        wrangler kv:namespace create "CACHE" --preview 2>$null
        wrangler kv:namespace create "CONFIG" 2>$null
        wrangler kv:namespace create "CONFIG" --preview 2>$null
        Write-Host "✅ KV 命名空间创建完成" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  KV 命名空间可能已存在" -ForegroundColor Yellow
    }
    
    # 创建 R2 存储桶
    Write-Host "创建 R2 存储桶..." -ForegroundColor Blue
    try {
        wrangler r2 bucket create tender-documents 2>$null
        Write-Host "✅ R2 存储桶创建成功" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  R2 存储桶可能已存在" -ForegroundColor Yellow
    }
    
    # 创建消息队列
    Write-Host "创建消息队列..." -ForegroundColor Blue
    try {
        wrangler queues create notification-queue 2>$null
        Write-Host "✅ 消息队列创建成功" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  消息队列可能已存在" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "⚠️  请手动更新 wrangler.toml 文件中的资源ID，然后重新运行此脚本" -ForegroundColor Yellow
    Write-Host "或者使用以下命令查看资源ID:" -ForegroundColor Cyan
    Write-Host "wrangler d1 list" -ForegroundColor Gray
    Write-Host "wrangler kv:namespace list" -ForegroundColor Gray
    exit 0
}

# 构建项目
Write-Host "🔨 构建项目..." -ForegroundColor Cyan
npm run build

# 运行数据库迁移
Write-Host "📊 运行数据库迁移..." -ForegroundColor Cyan
if ($Environment -eq "production") {
    wrangler d1 migrations apply tender-analysis-db --env production
} else {
    wrangler d1 migrations apply tender-analysis-db --env development
}

# 部署到指定环境
Write-Host "🚀 部署到 $Environment 环境..." -ForegroundColor Cyan
if ($Environment -eq "production") {
    wrangler deploy --env production
} else {
    wrangler deploy --env development
}

# 获取部署信息
Write-Host ""
Write-Host "🎉 部署完成!" -ForegroundColor Green
Write-Host ""

# 显示测试命令
Write-Host "🧪 测试部署:" -ForegroundColor Cyan
Write-Host "# 健康检查" -ForegroundColor Gray
Write-Host "curl https://your-worker-url.workers.dev/" -ForegroundColor Yellow
Write-Host ""
Write-Host "# 启动数据抓取" -ForegroundColor Gray
Write-Host "curl -X POST https://your-worker-url.workers.dev/api/crawler/start" -ForegroundColor Yellow
Write-Host ""
Write-Host "# 查看状态" -ForegroundColor Gray
Write-Host "curl https://your-worker-url.workers.dev/api/crawler/status" -ForegroundColor Yellow

Write-Host ""
Write-Host "📊 监控命令:" -ForegroundColor Cyan
Write-Host "wrangler tail                                                    # 查看实时日志" -ForegroundColor Gray
Write-Host "wrangler d1 execute tender-analysis-db --command 'SELECT COUNT(*) FROM tender_info;'  # 检查数据" -ForegroundColor Gray

Write-Host ""
Write-Host "🔧 管理命令:" -ForegroundColor Cyan
Write-Host "wrangler kv:key list --binding KV                               # 查看KV数据" -ForegroundColor Gray
Write-Host "wrangler r2 object list tender-documents                        # 查看R2文件" -ForegroundColor Gray
Write-Host "wrangler queues consumer list notification-queue                # 查看队列状态" -ForegroundColor Gray

Write-Host ""
Write-Host "🌐 请在 Cloudflare Dashboard 中查看完整的 Worker URL" -ForegroundColor Blue