// 招标项目数据模型
export interface TenderProject {
  id: string;
  title: string;
  content: string;
  budget: number;
  publishTime: string;
  deadline: string;
  purchaser: string;
  area: string;
  projectType: string;
  status: 'active' | 'closed' | 'awarded';
  aiScore?: number;
  competitiveness?: 'low' | 'medium' | 'high';
  matchScore?: number;
}

// 分析结果数据模型
export interface AnalysisResult {
  projectId: string;
  overallScore: number;
  costBenefitRatio: number;
  technicalMatch: number;
  competitionLevel: number;
  riskAssessment: RiskLevel;
  recommendations: string[];
  generatedAt: string;
}

// 风险等级
export type RiskLevel = 'low' | 'medium' | 'high';

// 系统状态数据模型
export interface SystemStatus {
  crawlerStatus: 'running' | 'stopped' | 'error';
  lastCrawlTime: string;
  totalProjects: number;
  todayNewProjects: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

// 项目筛选条件
export interface ProjectFilters {
  keyword?: string;
  budgetRange?: [number, number];
  projectType?: string;
  area?: string;
  status?: TenderProject['status'];
  dateRange?: [string, string];
}

// 用户信息
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  avatar?: string;
}

// 用户偏好设置
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'zh-CN' | 'en-US';
  notifications: {
    email: boolean;
    browser: boolean;
    highValueProjects: boolean;
    deadlineReminders: boolean;
  };
  dashboard: {
    defaultView: 'grid' | 'list';
    itemsPerPage: number;
    autoRefresh: boolean;
    refreshInterval: number;
  };
}

// 通知数据模型
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

// 图表数据类型
export interface TimeSeriesData {
  date: string;
  value: number;
  category?: string;
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

// 分页配置
export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 面包屑导航项
export interface BreadcrumbItem {
  title: string;
  href?: string;
}

// 菜单项
export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  children?: MenuItem[];
  href?: string;
}