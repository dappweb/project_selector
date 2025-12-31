// 应用常量定义

// 项目状态选项
export const PROJECT_STATUS_OPTIONS = [
  { label: '进行中', value: 'active' },
  { label: '已结束', value: 'closed' },
  { label: '已中标', value: 'awarded' },
] as const;

// 竞争激烈程度选项
export const COMPETITIVENESS_OPTIONS = [
  { label: '低', value: 'low', color: '#52c41a' },
  { label: '中', value: 'medium', color: '#faad14' },
  { label: '高', value: 'high', color: '#f5222d' },
] as const;

// 风险等级选项
export const RISK_LEVEL_OPTIONS = [
  { label: '低风险', value: 'low', color: '#52c41a' },
  { label: '中风险', value: 'medium', color: '#faad14' },
  { label: '高风险', value: 'high', color: '#f5222d' },
] as const;

// 系统健康状态选项
export const SYSTEM_HEALTH_OPTIONS = [
  { label: '健康', value: 'healthy', color: '#52c41a' },
  { label: '警告', value: 'warning', color: '#faad14' },
  { label: '错误', value: 'error', color: '#f5222d' },
] as const;

// 爬虫状态选项
export const CRAWLER_STATUS_OPTIONS = [
  { label: '运行中', value: 'running', color: '#52c41a' },
  { label: '已停止', value: 'stopped', color: '#d9d9d9' },
  { label: '错误', value: 'error', color: '#f5222d' },
] as const;

// 通知类型选项
export const NOTIFICATION_TYPE_OPTIONS = [
  { label: '信息', value: 'info', color: '#1890ff' },
  { label: '成功', value: 'success', color: '#52c41a' },
  { label: '警告', value: 'warning', color: '#faad14' },
  { label: '错误', value: 'error', color: '#f5222d' },
] as const;

// 预算范围选项
export const BUDGET_RANGE_OPTIONS = [
  { label: '10万以下', value: [0, 100000] },
  { label: '10-50万', value: [100000, 500000] },
  { label: '50-100万', value: [500000, 1000000] },
  { label: '100-500万', value: [1000000, 5000000] },
  { label: '500万以上', value: [5000000, Infinity] },
] as const;

// 项目类型选项
export const PROJECT_TYPE_OPTIONS = [
  '工程建设',
  '货物采购',
  '服务采购',
  'IT项目',
  '咨询服务',
  '设备采购',
  '其他',
] as const;

// 地区选项
export const AREA_OPTIONS = [
  '北京市',
  '上海市',
  '广东省',
  '江苏省',
  '浙江省',
  '山东省',
  '河南省',
  '四川省',
  '湖北省',
  '湖南省',
  '其他',
] as const;

// 分页默认配置
export const DEFAULT_PAGINATION = {
  current: 1,
  pageSize: 20,
  showSizeChanger: true,
  showQuickJumper: true,
  pageSizeOptions: ['10', '20', '50', '100'],
} as const;

// 图表颜色配置
export const CHART_COLORS = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#fa8c16',
  '#13c2c2',
  '#eb2f96',
  '#a0d911',
  '#2f54eb',
] as const;

// 主题配置
export const THEME_CONFIG = {
  light: {
    primaryColor: '#1890ff',
    backgroundColor: '#ffffff',
    textColor: '#000000',
  },
  dark: {
    primaryColor: '#1890ff',
    backgroundColor: '#141414',
    textColor: '#ffffff',
  },
} as const;

// API端点
export const API_ENDPOINTS = {
  PROJECTS: '/api/projects',
  SYSTEM_STATUS: '/api/system/status',
  CRAWLER_STATUS: '/api/crawler/status',
  STATISTICS: '/api/statistics',
  EXPORT: '/api/export',
} as const;

// 本地存储键名
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'user-preferences',
  PROJECT_FILTERS: 'project-filters',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;

// 时间格式
export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  TIME: 'HH:mm:ss',
  MONTH: 'YYYY-MM',
  YEAR: 'YYYY',
} as const;