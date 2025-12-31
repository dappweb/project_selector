# 🚀 快速部署指南

## 一键部署到 Cloudflare

### 前置要求

1. **Node.js 18+** 已安装
2. **Cloudflare 账户** (免费账户即可)

### 步骤 1: 安装依赖

```bash
npm install
npm install -g wrangler
```

### 步骤 2: 登录 Cloudflare

```bash
wrangler auth login
```

这会打开浏览器，请登录您的 Cloudflare 账户并授权。

### 步骤 3: 创建 Cloudflare 资源

```bash
npm run setup
```

这个命令会自动创建：
- D1 数据库
- KV 存储命名空间
- R2 对象存储桶
- 消息队列

### 步骤 4: 更新配置

运行上述命令后，您会看到创建的资源ID。请将这些ID更新到 `wrangler.toml` 文件中：

```toml
# 示例：将 your-database-id-here 替换为实际的数据库ID
[[d1_databases]]
binding = "DB"
database_name = "tender-analysis-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 步骤 5: 部署应用

```bash
# 部署到开发环境
npm run deploy:full

# 或部署到生产环境
npm run deploy:full:prod
```

### 步骤 6: 验证部署

部署完成后，您会看到 Worker URL。测试部署：

```bash
# 健康检查
curl https://your-worker-url.workers.dev/

# 启动数据抓取
curl -X POST https://your-worker-url.workers.dev/api/crawler/start

# 查看状态
curl https://your-worker-url.workers.dev/api/crawler/status
```

## 🔧 常用命令

```bash
# 查看实时日志
npm run logs

# 本地开发
npm run dev

# 运行测试
npm test

# 数据库迁移
npm run db:migrate:dev    # 开发环境
npm run db:migrate:prod   # 生产环境

# 查看数据库
npm run db:studio
```

## 📊 监控和管理

### Cloudflare Dashboard

访问 [Cloudflare Dashboard](https://dash.cloudflare.com) 查看：
- Workers 分析和日志
- D1 数据库状态
- KV 存储使用情况
- R2 存储文件

### API 端点

部署后可用的主要端点：

- `GET /` - 健康检查
- `POST /api/crawler/start` - 启动数据抓取
- `GET /api/crawler/status` - 获取抓取状态
- `POST /api/crawler/manual-fetch` - 手动抓取
- `GET /api/crawler/keywords` - 查看关键词配置
- `POST /api/crawler/keywords` - 更新关键词配置

## 🛠️ 故障排除

### 常见问题

1. **"Database not found" 错误**
   ```bash
   # 检查数据库是否存在
   wrangler d1 list
   
   # 运行迁移
   npm run db:migrate:dev
   ```

2. **"KV namespace not found" 错误**
   ```bash
   # 检查 KV 命名空间
   wrangler kv:namespace list
   
   # 确保 wrangler.toml 中的 ID 正确
   ```

3. **部署失败**
   ```bash
   # 检查 TypeScript 编译
   npm run build
   
   # 查看详细错误
   wrangler deploy --compatibility-date=2023-12-01
   ```

### 调试命令

```bash
# 查看 Worker 日志
wrangler tail

# 检查数据库数据
wrangler d1 execute tender-analysis-db --command "SELECT COUNT(*) FROM tender_info;"

# 查看 KV 存储
wrangler kv:key list --binding KV

# 检查 R2 存储
wrangler r2 object list tender-documents
```

## 🔐 安全配置

### 设置 API 密钥

如果您有剑鱼标讯 API 密钥：

```bash
wrangler secret put JIANYU_API_KEY
```

### 环境变量

在 `wrangler.toml` 中配置环境变量：

```toml
[vars]
ENVIRONMENT = "production"
JIANYU_API_BASE_URL = "https://api.jianyu360.com"
```

## 📈 下一步

部署成功后，您可以：

1. **配置自定义关键词**：通过 API 设置搜索关键词
2. **监控数据抓取**：查看抓取状态和统计信息
3. **扩展功能**：继续开发 AI 分析和方案生成功能
4. **设置域名**：在 Cloudflare 中配置自定义域名

## 💰 成本估算

基于 Cloudflare 免费层：
- **Workers**: 100,000 请求/天 (免费)
- **D1**: 5GB 存储 + 25M 行读取/月 (免费)
- **KV**: 100,000 读取/天 (免费)
- **R2**: 10GB 存储/月 (免费)

对于大多数用例，免费层已经足够使用。

---

🎉 **恭喜！您的招投标智能分析系统已成功部署到 Cloudflare！**