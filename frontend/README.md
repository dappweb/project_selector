# 招投标智能分析系统 - 前端界面

这是招投标智能分析系统的Web用户界面，基于Next.js 14构建，提供现代化的用户体验。

## 技术栈

- **框架**: Next.js 14 (App Router)
- **UI组件库**: Ant Design 5.x
- **样式**: Tailwind CSS
- **状态管理**: Zustand + React Query
- **图表库**: Apache ECharts
- **类型系统**: TypeScript
- **测试**: Jest + React Testing Library + fast-check
- **部署**: Cloudflare Pages

## 功能特性

- 📊 **仪表板**: 关键指标展示和快速操作
- 📋 **项目管理**: 招标项目浏览、搜索和筛选
- 📈 **数据分析**: 可视化图表和趋势分析
- 🔄 **数据抓取**: 爬虫状态监控和控制
- 🔔 **通知系统**: 实时通知和提醒
- ⚙️ **系统设置**: 用户偏好和权限管理
- 📱 **响应式设计**: 支持桌面端和移动端
- 🌐 **离线支持**: PWA功能和数据缓存

## 开发环境设置

### 前置要求

- Node.js 18.0 或更高版本
- npm 或 yarn 包管理器

### 安装依赖

```bash
npm install
# 或
yarn install
```

### 环境变量配置

复制 `.env.local` 文件并配置相应的环境变量：

```bash
cp .env.local.example .env.local
```

主要环境变量：
- `NEXT_PUBLIC_API_URL`: 后端API地址
- `NEXT_PUBLIC_APP_NAME`: 应用名称
- `NEXT_PUBLIC_APP_VERSION`: 应用版本

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 可用脚本

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行ESLint检查
- `npm run lint:fix` - 自动修复ESLint问题
- `npm run type-check` - 运行TypeScript类型检查
- `npm run test` - 运行测试
- `npm run test:watch` - 监听模式运行测试

## 项目结构

```
src/
├── app/                    # Next.js App Router页面
├── components/             # React组件
│   ├── layout/            # 布局组件
│   ├── dashboard/         # 仪表板组件
│   ├── projects/          # 项目管理组件
│   ├── charts/            # 图表组件
│   └── forms/             # 表单组件
├── hooks/                 # 自定义React Hooks
├── lib/                   # 工具库和配置
├── services/              # API服务
├── stores/                # Zustand状态管理
├── types/                 # TypeScript类型定义
└── utils/                 # 工具函数
```

## 组件开发指南

### 组件命名规范

- 组件文件使用PascalCase命名：`MyComponent.tsx`
- 组件目录使用kebab-case命名：`my-component/`
- Hook文件使用camelCase命名：`useMyHook.ts`

### 状态管理

使用Zustand进行全局状态管理：

```typescript
import { useProjectStore } from '@/stores/projectStore';

const MyComponent = () => {
  const { projects, setProjects } = useProjectStore();
  // ...
};
```

### API调用

使用React Query进行数据获取：

```typescript
import { useProjects } from '@/hooks/useProjects';

const MyComponent = () => {
  const { data, isLoading, error } = useProjects();
  // ...
};
```

### 样式规范

- 优先使用Ant Design组件的内置样式
- 使用Tailwind CSS进行自定义样式
- 避免内联样式，使用CSS类名

## 测试

### 单元测试

使用Jest和React Testing Library进行组件测试：

```bash
npm run test
```

### 属性测试

使用fast-check进行属性测试：

```typescript
import fc from 'fast-check';

test('property test example', () => {
  fc.assert(fc.property(
    fc.string(),
    (input) => {
      // 测试属性
      expect(myFunction(input)).toBeDefined();
    }
  ));
});
```

## 部署

### Cloudflare Pages部署

1. 连接GitHub仓库到Cloudflare Pages
2. 设置构建命令：`npm run build`
3. 设置输出目录：`out`
4. 配置环境变量

### 手动部署

```bash
npm run build
# 将out目录上传到静态托管服务
```

## 性能优化

- 使用Next.js的自动代码分割
- 实现组件懒加载
- 优化图片和资源加载
- 使用React Query缓存API响应
- 实现虚拟滚动处理大列表

## 浏览器支持

- Chrome (最新版本)
- Firefox (最新版本)
- Safari (最新版本)
- Edge (最新版本)

## 贡献指南

1. Fork项目
2. 创建功能分支：`git checkout -b feature/my-feature`
3. 提交更改：`git commit -am 'Add some feature'`
4. 推送分支：`git push origin feature/my-feature`
5. 提交Pull Request

## 许可证

MIT License