# 招投标智能分析系统

基于Cloudflare Workers的智能招投标分析系统，能够自动抓取剑鱼标讯平台的招标信息，使用AI技术进行智能分析，生成投标方案和成本收益分析。

## 技术栈

- **运行时**: Cloudflare Workers
- **框架**: Hono.js + TypeScript
- **数据库**: Cloudflare D1 (SQLite)
- **缓存**: Cloudflare KV
- **文件存储**: Cloudflare R2
- **消息队列**: Cloudflare Queues
- **AI服务**: Cloudflare Workers AI
- **ORM**: Drizzle ORM

## 项目结构

```
├── src/
│   ├── index.ts              # 主入口文件
│   ├── types/                # TypeScript类型定义
│   ├── db/                   # 数据库模式定义
│   ├── routes/               # API路由
│   │   ├── crawler.ts        # 数据抓取路由
│   │   ├── analysis.ts       # AI分析路由
│   │   ├── proposal.ts       # 方案生成路由
│   │   ├── cost-benefit.ts   # 成本收益分析路由
│   │   ├── notification.ts   # 通知服务路由
│   │   └── report.ts         # 报表服务路由
│   └── utils/                # 工具函数
├── migrations/               # 数据库迁移文件
├── wrangler.toml            # Cloudflare Workers配置
├── drizzle.config.ts        # Drizzle ORM配置
└── package.json             # 项目依赖
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置Cloudflare资源

在Cloudflare Dashboard中创建以下资源：

- D1数据库: `tender-analysis-db`
- KV命名空间: `CACHE` 和 `CONFIG`
- R2存储桶: `tender-documents`
- Queue队列: `notification-queue`

### 3. 更新wrangler.toml

将`wrangler.toml`中的资源ID替换为实际的ID：

```toml
[[d1_databases]]
binding = "DB"
database_name = "tender-analysis-db"
database_id = "your-actual-database-id"

[[kv_namespaces]]
binding = "CACHE"
id = "your-actual-kv-namespace-id"
```

### 4. 运行数据库迁移

```bash
# 生成迁移文件
npm run db:generate

# 应用迁移（本地开发）
npm run db:migrate

# 应用迁移（生产环境）
npm run db:migrate:prod
```

### 5. 本地开发

```bash
npm run dev
```

### 6. 部署到Cloudflare

```bash
npm run deploy
```

## API接口

### 数据抓取

- `POST /api/crawler/start` - 启动数据抓取
- `GET /api/crawler/status` - 获取抓取状态
- `POST /api/crawler/manual-fetch` - 手动抓取指定关键词

### AI分析

- `POST /api/analysis/analyze/:tenderId` - 分析单个招标项目
- `GET /api/analysis/result/:tenderId` - 获取分析结果
- `POST /api/analysis/batch` - 批量分析

### 方案生成

- `POST /api/proposal/generate/:tenderId` - 生成投标方案
- `GET /api/proposal/:tenderId` - 获取投标方案
- `GET /api/proposal/download/:tenderId` - 下载方案文档

### 成本收益分析

- `POST /api/cost-benefit/analyze/:tenderId` - 生成成本收益分析
- `GET /api/cost-benefit/:tenderId` - 获取分析结果

### 通知服务

- `POST /api/notification/send` - 发送通知
- `GET /api/notification/history` - 获取通知历史

### 报表服务

- `GET /api/report/overview` - 获取业务概览
- `GET /api/report/trends` - 获取市场趋势
- `POST /api/report/monthly` - 生成月度报告
- `GET /api/report/export` - 导出数据

## 核心功能

### 1. 自动数据抓取
- 定时从剑鱼标讯API获取最新招标信息
- 智能去重和增量更新
- 错误重试和告警机制

### 2. AI智能分析
- 基于Cloudflare Workers AI的项目分类
- 关键词提取和技术匹配度分析
- 多因子评分算法

### 3. 自动方案生成
- 基于AI的技术方案生成
- 智能报价计算
- 风险评估和应对措施

### 4. 成本收益分析
- 多维度成本计算
- ROI预测（乐观/中性/悲观）
- 现金流分析

### 5. 智能通知
- 多渠道通知（邮件/微信/钉钉）
- 时间节点提醒
- 状态变更通知

### 6. 数据可视化
- 业务概览仪表板
- 市场趋势分析
- 月度报告生成

## 开发指南

### 添加新的API路由

1. 在`src/routes/`目录下创建新的路由文件
2. 在`src/index.ts`中导入并注册路由
3. 更新类型定义（如需要）

### 数据库操作

使用Drizzle ORM进行数据库操作：

```typescript
import { createDatabase } from '../utils/database'

const db = createDatabase(env)
const result = await db.select().from(tenderInfo).where(eq(tenderInfo.id, tenderId))
```

### 使用Workers AI

```typescript
const response = await env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
  messages: [
    { role: 'user', content: 'Your prompt here' }
  ]
})
```

## 部署说明

### 环境变量

在Cloudflare Dashboard中设置以下环境变量：

- `ENVIRONMENT`: 环境标识（development/production）
- `API_BASE_URL`: 剑鱼标讯API基础URL

### 定时任务

系统配置了每小时执行一次的Cron触发器，用于自动抓取数据。

### 监控和日志

- 使用Cloudflare Analytics监控性能
- 日志输出到Cloudflare Workers日志
- 错误告警通过通知系统发送

## 许可证

MIT License