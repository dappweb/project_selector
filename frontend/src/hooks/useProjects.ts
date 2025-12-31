import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { TenderProject, ProjectFilters } from '@/types';

// 获取项目列表
export const useProjects = (filters?: ProjectFilters) => {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: () => apiClient.getProjects(filters),
    staleTime: 5 * 60 * 1000, // 5分钟缓存
  });
};

// 获取单个项目详情
export const useProject = (id: string) => {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => apiClient.getProject(id),
    enabled: !!id,
  });
};

// 获取项目分析结果
export const useProjectAnalysis = (id: string) => {
  return useQuery({
    queryKey: ['project-analysis', id],
    queryFn: () => apiClient.getProjectAnalysis(id),
    enabled: !!id,
  });
};

// 获取系统状态
export const useSystemStatus = () => {
  return useQuery({
    queryKey: ['system-status'],
    queryFn: () => apiClient.getSystemStatus(),
    refetchInterval: 30 * 1000, // 30秒自动刷新
  });
};

// 获取爬虫状态
export const useCrawlerStatus = () => {
  return useQuery({
    queryKey: ['crawler-status'],
    queryFn: () => apiClient.getCrawlerStatus(),
    refetchInterval: 10 * 1000, // 10秒自动刷新
  });
};

// 启动爬虫
export const useStartCrawler = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (keywords?: string[]) => apiClient.startCrawler(keywords),
    onSuccess: () => {
      // 刷新爬虫状态
      queryClient.invalidateQueries({ queryKey: ['crawler-status'] });
      queryClient.invalidateQueries({ queryKey: ['system-status'] });
    },
  });
};

// 停止爬虫
export const useStopCrawler = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => apiClient.stopCrawler(),
    onSuccess: () => {
      // 刷新爬虫状态
      queryClient.invalidateQueries({ queryKey: ['crawler-status'] });
      queryClient.invalidateQueries({ queryKey: ['system-status'] });
    },
  });
};

// 获取统计数据
export const useStatistics = (period?: string) => {
  return useQuery({
    queryKey: ['statistics', period],
    queryFn: () => apiClient.getStatistics(period),
    staleTime: 2 * 60 * 1000, // 2分钟缓存
  });
};