#!/bin/bash

# Cloudflare 部署脚本
# 使用方法: ./scripts/deploy.sh [environment]
# 环境: development (默认) 或 production

set -e

ENVIRONMENT=${1:-development}
echo "🚀 开始部署到 Cloudflare ($ENVIRONMENT 环境)..."

# 检查 wrangler 是否已安装
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI 未安装，请先安装:"
    echo "npm install -g wrangler"
    exit 1
fi

# 检查是否已登录
if ! wrangler whoami &> /dev/null; then
    echo "❌ 请先登录 Cloudflare:"
    echo "wrangler auth login"
    exit 1
fi

echo "✅ Wrangler CLI 已就绪"

# 检查 wrangler.toml 配置
if grep -q "your-database-id-here" wrangler.toml; then
    echo "⚠️  检测到 wrangler.toml 中有占位符ID，需要先创建资源..."
    
    echo "📦 创建 Cloudflare 资源..."
    
    # 创建 D1 数据库
    echo "创建 D1 数据库..."
    DB_RESULT=$(wrangler d1 create tender-analysis-db --json 2>/dev/null || echo "")
    if [ -n "$DB_RESULT" ]; then
        DB_ID=$(echo $DB_RESULT | jq -r '.database_id')
        echo "✅ D1 数据库创建成功: $DB_ID"
    else
        echo "⚠️  D1 数据库可能已存在，请手动检查"
    fi
    
    # 创建 KV 命名空间
    echo "创建 KV 命名空间..."
    
    KV_MAIN=$(wrangler kv:namespace create "KV" --json 2>/dev/null || echo "")
    KV_MAIN_PREVIEW=$(wrangler kv:namespace create "KV" --preview --json 2>/dev/null || echo "")
    
    KV_CACHE=$(wrangler kv:namespace create "CACHE" --json 2>/dev/null || echo "")
    KV_CACHE_PREVIEW=$(wrangler kv:namespace create "CACHE" --preview --json 2>/dev/null || echo "")
    
    KV_CONFIG=$(wrangler kv:namespace create "CONFIG" --json 2>/dev/null || echo "")
    KV_CONFIG_PREVIEW=$(wrangler kv:namespace create "CONFIG" --preview --json 2>/dev/null || echo "")
    
    # 创建 R2 存储桶
    echo "创建 R2 存储桶..."
    wrangler r2 bucket create tender-documents 2>/dev/null || echo "⚠️  R2 存储桶可能已存在"
    
    # 创建消息队列
    echo "创建消息队列..."
    wrangler queues create notification-queue 2>/dev/null || echo "⚠️  消息队列可能已存在"
    
    echo "✅ 资源创建完成"
    echo ""
    echo "⚠️  请手动更新 wrangler.toml 文件中的资源ID，然后重新运行此脚本"
    echo "或者使用 'wrangler d1 list' 和 'wrangler kv:namespace list' 查看资源ID"
    exit 0
fi

# 构建项目
echo "🔨 构建项目..."
npm run build

# 运行数据库迁移
echo "📊 运行数据库迁移..."
wrangler d1 migrations apply tender-analysis-db --env $ENVIRONMENT

# 部署到指定环境
echo "🚀 部署到 $ENVIRONMENT 环境..."
if [ "$ENVIRONMENT" = "production" ]; then
    wrangler deploy --env production
else
    wrangler deploy --env development
fi

# 获取部署URL
WORKER_URL=$(wrangler deployments list --json | jq -r '.[0].url' 2>/dev/null || echo "")

echo ""
echo "🎉 部署完成!"
echo ""
if [ -n "$WORKER_URL" ]; then
    echo "🌐 Worker URL: $WORKER_URL"
    echo ""
    echo "🧪 测试部署:"
    echo "curl $WORKER_URL/"
    echo "curl -X POST $WORKER_URL/api/crawler/start"
    echo "curl $WORKER_URL/api/crawler/status"
else
    echo "请在 Cloudflare Dashboard 中查看 Worker URL"
fi

echo ""
echo "📊 监控命令:"
echo "wrangler tail                    # 查看实时日志"
echo "wrangler d1 execute tender-analysis-db --command 'SELECT COUNT(*) FROM tender_info;'  # 检查数据"
echo ""
echo "🔧 管理命令:"
echo "wrangler kv:key list --binding KV                    # 查看KV数据"
echo "wrangler r2 object list tender-documents             # 查看R2文件"
echo "wrangler queues consumer list notification-queue     # 查看队列状态"