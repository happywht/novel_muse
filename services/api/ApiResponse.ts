/**
 * API 响应工具
 *
 * 提供统一的 API 响应格式和验证机制
 */

import { z } from 'zod';

/**
 * 标准 API 响应 Schema
 */
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.number().optional(),
});

/**
 * 标准 API 响应类型
 */
export type ApiResponse<T = unknown> = z.infer<typeof ApiResponseSchema> & {
  data?: T;
};

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    data,
    message,
    timestamp: Date.now(),
  };
}

/**
 * 创建错误响应
 */
export function createErrorResponse(error: string, code?: string): ApiResponse {
  return {
    success: false,
    error: code ? `[${code}] ${error}` : error,
    timestamp: Date.now(),
  };
}

/**
 * 验证 API 响应
 */
export function validateApiResponse<T>(response: unknown): ApiResponse<T> {
  try {
    return ApiResponseSchema.parse(response) as ApiResponse<T>;
  } catch (error) {
    console.error('API 响应验证失败:', error);
    throw new Error('Invalid API response format');
  }
}

/**
 * 处理 API 错误
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 从响应中提取数据或抛出错误
 */
export function extractApiResponseData<T>(response: ApiResponse<T>): T {
  if (!response.success) {
    throw new ApiError(response.error || '请求失败', response.error);
  }
  if (response.data === undefined) {
    throw new ApiError('响应数据为空');
  }
  return response.data;
}

/**
 * 包装异步函数，自动处理 API 错误
 */
export async function withApiErrorHandling<T>(
  fn: () => Promise<ApiResponse<T>>
): Promise<T> {
  try {
    const response = await fn();
    return extractApiResponseData(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : '未知错误'
    );
  }
}
