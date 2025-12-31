# Cloudflare 部署指南

## 前置要求

1. **Cloudflare账户**: 确保您有一个Cloudflare账户
2. **Wrangler CLI**: 安装并配置Wrangler CLI
3. **Node.js**: 确保安装了Node.js 18+

## 安装和配置 Wrangler

```bash
# 安装 Wrangler CLI
npm install -g wrangler

# 登录到 Cloudflare
wrangler auth login
```

## 部署步骤

### 1. 创建 Cloudflare 资源

运行以下命令创建所需的Cloudflare资源：

```bash
# 创建 D1 数据库
wrangler d1 create tender-analysis-db

# 创建 KV 命名空间
wrangler kv:namespace create "KV"
wrangler kv:namespace create "KV" --preview
wrangler kv:namespace create "CACHE"
wrangler kv:namespace create "CACHE" --preview
wrangler kv:namespace create "CONFIG"
wrangler kv:namespace create "CONFIG" --preview

# 创建 R2 存储桶
wrangler r2 bucket create tender-documents

# 创建消息队列
wrangler queues create notification-queue
```

### 2. 更新 wrangler.toml 配置

将上述命令返回的ID更新到 `wrangler.toml` 文件中：

```toml
# 更新数据库ID
[[d1_databases]]
binding = "DB"
database_name = "tender-analysis-db"
database_id = "你的数据库ID"

# 更新KV命名空间ID
[[kv_namespaces]]
binding = "KV"
id = "你的KV命名空间ID"
preview_id = "你的预览KV命名空间ID"

# ... 其他配置
```

### 3. 运行数据库迁移

```bash
# 执行数据库迁移
wrangler d1 migrations apply tender-analysis-db
```

### 4. 设置环境变量和密钥

```bash
# 设置剑鱼标讯API密钥（如果有的话）
wrangler secret put JIANYU_API_KEY

# 设置其他敏感配置
wrangler secret put DATABASE_ENCRYPTION_KEY
```

### 5. 部署应用

```bash
# 构建和部署
npm run build
wrangler deploy

# 或者直接部署（会自动构建）
wrangler deploy
```

## 验证部署

部署完成后，您可以通过以下方式验证：

1. **健康检查**:
   ```bash
   curl https://your-worker-url.workers.dev/
   ```

2. **测试数据抓取**:
   ```bash
   curl -X POST https://your-worker-url.workers.dev/api/crawler/start
   ```

3. **查看状态**:
   ```bash
   curl https://your-worker-url.workers.dev/api/crawler/status
   ```

## 监控和日志

- **实时日志**: `wrangler tail`
- **Cloudflare Dashboard**: 在Cloudflare控制台查看Workers分析
- **D1数据库**: 在控制台查看数据库状态和查询

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 确保D1数据库ID正确
   - 检查迁移是否成功执行

2. **KV存储访问失败**
   - 验证KV命名空间ID
   - 确保绑定名称正确

3. **API限流问题**
   - 检查剑鱼标讯API密钥
   - 调整请求频率

### 调试命令

```bash
# 查看实时日志
wrangler tail

# 本地开发模式
wrangler dev

# 检查配置
wrangler whoami
```

## 生产环境配置

对于生产环境，建议：

1. **启用自定义域名**
2. **配置CDN缓存策略**
3. **设置监控和告警**
4. **定期备份D1数据库**

## 成本估算

基于预期使用量的成本估算：

- **Workers**: 免费层包含100,000请求/天
- **D1数据库**: 免费层包含5GB存储
- **KV存储**: 免费层包含100,000读取/天
- **R2存储**: 免费层包含10GB存储

## 下一步

部署完成后，您可以：

1. 配置自定义关键词
2. 设置通知渠道
3. 监控数据抓取效果
4. 继续开发AI分析功能