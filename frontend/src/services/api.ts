import { TenderProject, SystemStatus, AnalysisResult, ApiResponse } from '@/types';

// API客户端基础配置
class ApiClient {
  private baseURL: string;

  constructor() {
    // 从环境变量获取API地址，默认使用开发环境地址
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://tender-analysis-system.dappweb.workers.dev';
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // 项目相关API
  async getProjects(params?: Record<string, any>): Promise<ApiResponse<TenderProject[]>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get<ApiResponse<TenderProject[]>>(`/api/projects${queryString}`);
  }

  async getProject(id: string): Promise<ApiResponse<TenderProject>> {
    return this.get<ApiResponse<TenderProject>>(`/api/projects/${id}`);
  }

  async getProjectAnalysis(id: string): Promise<ApiResponse<AnalysisResult>> {
    return this.get<ApiResponse<AnalysisResult>>(`/api/projects/${id}/analysis`);
  }

  // 系统状态API
  async getSystemStatus(): Promise<ApiResponse<SystemStatus>> {
    return this.get<ApiResponse<SystemStatus>>('/api/system/status');
  }

  async getCrawlerStatus(): Promise<ApiResponse<SystemStatus>> {
    return this.get<ApiResponse<SystemStatus>>('/api/crawler/status');
  }

  // 数据抓取API
  async startCrawler(keywords?: string[]): Promise<ApiResponse<any>> {
    return this.post<ApiResponse<any>>('/api/crawler/start', { keywords });
  }

  async stopCrawler(): Promise<ApiResponse<any>> {
    return this.post<ApiResponse<any>>('/api/crawler/stop', {});
  }

  // 统计数据API
  async getStatistics(period?: string): Promise<ApiResponse<any>> {
    const queryString = period ? `?period=${period}` : '';
    return this.get<ApiResponse<any>>(`/api/statistics${queryString}`);
  }

  // 导出数据API
  async exportProjects(format: 'excel' | 'csv' | 'pdf', filters?: Record<string, any>): Promise<Blob> {
    const queryString = new URLSearchParams({ format, ...filters }).toString();
    const response = await fetch(`${this.baseURL}/api/export/projects?${queryString}`);
    
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status} ${response.statusText}`);
    }
    
    return response.blob();
  }
}

// 创建单例实例
export const apiClient = new ApiClient();

// 导出类型以供其他地方使用
export type { ApiClient };