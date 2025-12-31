// API响应工具函数

export interface SuccessResponse<T = any> {
  success: true
  data: T
  message?: string
  timestamp: string
}

export interface ErrorResponse {
  success: false
  error: string
  message?: string
  timestamp: string
}

// 创建成功响应
export function successResponse<T>(data: T, message?: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }
}

// 创建错误响应
export function errorResponse(error: string, message?: string): ErrorResponse {
  return {
    success: false,
    error,
    message,
    timestamp: new Date().toISOString()
  }
}

// 分页响应接口
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 创建分页响应
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  message?: string
): SuccessResponse<PaginatedResponse<T>> {
  return successResponse({
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }, message)
}