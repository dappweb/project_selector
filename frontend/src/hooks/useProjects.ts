import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'

// API基础URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'

// 系统状态接口
export interface SystemStatus {
  success: boolean
  data: {
    crawlerStatus: 'running' | 'stopped'
    systemHealth: 'healthy' | 'warning' | 'error'
    lastCrawlTime: string
    todayNewProjects: number
    totalProjects: number
  }
}

// 统计数据接口
export interface Statistics {
  success: boolean
  data: {
    totalProjects: number
    newProjects: number
    completedProjects: number
    totalValue: number
    averageValue: number
    winRate: number
  }
}

// 项目接口
export interface Project {
  id: string
  title: string
  category: string
  budget: number
  status: 'active' | 'completed' | 'cancelled'
  createdAt: string
  updatedAt: string
  description?: string
  deadline?: string
  location?: string
}

// 获取系统状态
export const useSystemStatus = () => {
  return useQuery<SystemStatus>({
    queryKey: ['systemStatus'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/`)
      if (!response.ok) {
        throw new Error('获取系统状态失败')
      }
      const data = await response.json()
      
      // 模拟系统状态数据
      return {
        success: true,
        data: {
          crawlerStatus: 'running' as const,
          systemHealth: 'healthy' as const,
          lastCrawlTime: new Date().toISOString(),
          todayNewProjects: 12,
          totalProjects: 156
        }
      }
    },
    refetchInterval: 30000, // 30秒刷新一次
  })
}

// 获取统计数据
export const useStatistics = () => {
  return useQuery<Statistics>({
    queryKey: ['statistics'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/data-analytics/statistics`)
      if (!response.ok) {
        throw new Error('获取统计数据失败')
      }
      return response.json()
    },
    refetchInterval: 60000, // 1分钟刷新一次
  })
}

// 获取项目列表
export const useProjects = (params?: {
  page?: number
  limit?: number
  category?: string
  status?: string
  search?: string
}) => {
  return useQuery<{
    success: boolean
    data: {
      projects: Project[]
      pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
      }
    }
  }>({
    queryKey: ['projects', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      if (params?.page) searchParams.set('page', params.page.toString())
      if (params?.limit) searchParams.set('limit', params.limit.toString())
      if (params?.category) searchParams.set('category', params.category)
      if (params?.status) searchParams.set('status', params.status)
      if (params?.search) searchParams.set('search', params.search)

      const response = await fetch(`${API_BASE_URL}/api/crawler/projects?${searchParams}`)
      if (!response.ok) {
        throw new Error('获取项目列表失败')
      }
      return response.json()
    },
  })
}

// 获取项目详情
export const useProject = (id: string) => {
  return useQuery<{
    success: boolean
    data: Project
  }>({
    queryKey: ['project', id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/crawler/projects/${id}`)
      if (!response.ok) {
        throw new Error('获取项目详情失败')
      }
      return response.json()
    },
    enabled: !!id,
  })
}

// 启动数据抓取
export const useCrawlerStart = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/crawler/start`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('启动数据抓取失败')
      }
      return response.json()
    },
    onSuccess: () => {
      message.success('数据抓取已启动')
      queryClient.invalidateQueries({ queryKey: ['systemStatus'] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => {
      message.error(`启动失败: ${error.message}`)
    },
  })
}

// 停止数据抓取
export const useCrawlerStop = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/crawler/stop`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('停止数据抓取失败')
      }
      return response.json()
    },
    onSuccess: () => {
      message.success('数据抓取已停止')
      queryClient.invalidateQueries({ queryKey: ['systemStatus'] })
    },
    onError: (error) => {
      message.error(`停止失败: ${error.message}`)
    },
  })
}

// 分析项目
export const useAnalyzeProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`${API_BASE_URL}/api/ai-analysis/analyze/${projectId}`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('项目分析失败')
      }
      return response.json()
    },
    onSuccess: () => {
      message.success('项目分析已启动')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => {
      message.error(`分析失败: ${error.message}`)
    },
  })
}

// 生成方案
export const useGenerateProposal = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`${API_BASE_URL}/api/proposal-generation/generate/${projectId}`, {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error('方案生成失败')
      }
      return response.json()
    },
    onSuccess: () => {
      message.success('方案生成已启动')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: (error) => {
      message.error(`生成失败: ${error.message}`)
    },
  })
}