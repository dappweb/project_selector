import type { ApiResponse, PaginatedResponse } from '../types'

// 成功响应
export function successResponse<T>(data?: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }
}

// 错误响应
export function errorResponse(error: string, message?: string): ApiResponse {
  return {
    success: false,
    error,
    message,
    timestamp: new Date().toISOString()
  }
}

// 分页响应
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResponse<T> {
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}

// 验证分页参数
export function validatePagination(page?: string, pageSize?: string) {
  const parsedPage = Math.max(1, parseInt(page || '1'))
  const parsedPageSize = Math.min(100, Math.max(1, parseInt(pageSize || '20')))
  
  return {
    page: parsedPage,
    pageSize: parsedPageSize,
    offset: (parsedPage - 1) * parsedPageSize
  }
}