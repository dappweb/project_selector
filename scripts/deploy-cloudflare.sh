#!/bin/bash

# Cloudflare部署脚本
# 用于本地部署到Cloudflare Workers和Pages

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的工具
check_dependencies() {
    log_info "检查依赖工具..."
    
    if ! command -v wrangler &> /dev/null; then
        log_error "Wrangler CLI未安装，请运行: npm install -g wrangler"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js未安装"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm未安装"
        exit 1
    fi
    
    log_success "依赖检查完成"
}

# 检查Wrangler认证
check_auth() {
    log_info "检查Wrangler认证状态..."
    
    if ! wrangler whoami &> /dev/null; then
        log_warning "未登录Wrangler，请运行: wrangler login"
        read -p "是否现在登录? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            wrangler login
        else
            log_error "需要登录才能继续部署"
            exit 1
        fi
    fi
    
    log_success "认证检查完成"
}

# 部署后端Workers
deploy_backend() {
    local env=${1:-staging}
    
    log_info "开始部署后端Workers到 $env 环境..."
    
    # 安装依赖
    log_info "安装后端依赖..."
    npm ci
    
    # 运行测试
    log_info "运行后端测试..."
    npm test
    
    # 部署Workers
    log_info "部署Workers..."
    wrangler deploy --env $env
    
    # 等待部署完成
    sleep 10
    
    # 运行部署后测试
    log_info "运行部署后测试..."
    if [ "$env" = "production" ]; then
        API_BASE_URL="https://tender-analysis-api.your-domain.workers.dev" node test-system-integration.js
    else
        API_BASE_URL="https://tender-analysis-api-staging.your-domain.workers.dev" node test-system-integration.js
    fi
    
    log_success "后端Workers部署完成"
}

# 部署前端Pages
deploy_frontend() {
    local env=${1:-staging}
    
    log_info "开始部署前端Pages到 $env 环境..."
    
    cd frontend
    
    # 安装依赖
    log_info "安装前端依赖..."
    npm ci
    
    # 运行类型检查
    log_info "运行类型检查..."
    npm run type-check
    
    # 运行测试
    log_info "运行前端测试..."
    npm test
    
    # 构建应用
    log_info "构建前端应用..."
    if [ "$env" = "production" ]; then
        NEXT_PUBLIC_API_URL="https://tender-analysis-api.your-domain.workers.dev" \
        NEXT_PUBLIC_ENVIRONMENT="production" \
        npm run build
    else
        NEXT_PUBLIC_API_URL="https://tender-analysis-api-staging.your-domain.workers.dev" \
        NEXT_PUBLIC_ENVIRONMENT="staging" \
        npm run build
    fi
    
    # 部署Pages
    log_info "部署Pages..."
    wrangler pages deploy out --env $env
    
    cd ..
    
    log_success "前端Pages部署完成"
}

# 部署数据库迁移
deploy_database() {
    local env=${1:-staging}
    
    log_info "部署数据库迁移到 $env 环境..."
    
    # 运行数据库迁移
    wrangler d1 migrations apply tender-analysis-db --env $env
    
    # 插入测试数据（仅staging环境）
    if [ "$env" = "staging" ]; then
        log_info "插入测试数据..."
        node insert-test-data.js
    fi
    
    log_success "数据库迁移完成"
}

# 完整部署
full_deploy() {
    local env=${1:-staging}
    
    log_info "开始完整部署到 $env 环境..."
    
    # 检查依赖和认证
    check_dependencies
    check_auth
    
    # 部署数据库
    deploy_database $env
    
    # 部署后端
    deploy_backend $env
    
    # 部署前端
    deploy_frontend $env
    
    log_success "完整部署完成！"
    
    if [ "$env" = "production" ]; then
        log_info "生产环境访问地址:"
        log_info "  前端: https://tender-analysis.pages.dev"
        log_info "  API: https://tender-analysis-api.your-domain.workers.dev"
    else
        log_info "测试环境访问地址:"
        log_info "  前端: https://tender-analysis-staging.pages.dev"
        log_info "  API: https://tender-analysis-api-staging.your-domain.workers.dev"
    fi
}

# 回滚部署
rollback() {
    local env=${1:-staging}
    
    log_warning "开始回滚 $env 环境..."
    
    # 回滚Workers
    log_info "回滚Workers..."
    wrangler rollback --env $env
    
    log_success "回滚完成"
}

# 显示帮助信息
show_help() {
    echo "Cloudflare部署脚本"
    echo ""
    echo "用法:"
    echo "  $0 [命令] [环境]"
    echo ""
    echo "命令:"
    echo "  backend     部署后端Workers"
    echo "  frontend    部署前端Pages"
    echo "  database    部署数据库迁移"
    echo "  full        完整部署（默认）"
    echo "  rollback    回滚部署"
    echo "  help        显示帮助信息"
    echo ""
    echo "环境:"
    echo "  staging     测试环境（默认）"
    echo "  production  生产环境"
    echo ""
    echo "示例:"
    echo "  $0 full production          # 完整部署到生产环境"
    echo "  $0 backend staging          # 仅部署后端到测试环境"
    echo "  $0 frontend production      # 仅部署前端到生产环境"
    echo "  $0 rollback production      # 回滚生产环境"
}

# 主函数
main() {
    local command=${1:-full}
    local env=${2:-staging}
    
    case $command in
        backend)
            check_dependencies
            check_auth
            deploy_backend $env
            ;;
        frontend)
            check_dependencies
            check_auth
            deploy_frontend $env
            ;;
        database)
            check_dependencies
            check_auth
            deploy_database $env
            ;;
        full)
            full_deploy $env
            ;;
        rollback)
            check_dependencies
            check_auth
            rollback $env
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"