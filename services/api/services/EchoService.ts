/**
 * Echo 服务层
 *
 * 提供 Echo（叙事回响）相关的 API 服务
 */

import { apiClient } from '../client';
import { validateApiResponse, ApiError } from '../ApiResponse';
import type { Echo } from '@/types';

/**
 * Echo 服务类
 */
export class EchoService {
  private readonly basePath = '/echoes';

  /**
   * 获取所有 Echo
   */
  async list(projectId: string): Promise<Echo[]> {
    try {
      const response = await apiClient.get<unknown>(`${this.basePath}?projectId=${projectId}`);
      const validated = validateApiResponse<Echo[]>(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '获取 Echo 列表失败');
      }

      return validated.data;
    } catch (error) {
      console.error('获取 Echo 列表失败:', error);
      throw error instanceof ApiError ? error : new ApiError('获取 Echo 列表失败');
    }
  }

  /**
   * 获取单个 Echo
   */
  async get(projectId: string, echoId: string): Promise<Echo> {
    try {
      const response = await apiClient.get<unknown>(
        `${this.basePath}/${echoId}?projectId=${projectId}`
      );
      const validated = validateApiResponse<Echo>(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '获取 Echo 失败');
      }

      return validated.data;
    } catch (error) {
      console.error('获取 Echo 失败:', error);
      throw error instanceof ApiError ? error : new ApiError('获取 Echo 失败');
    }
  }

  /**
   * 创建 Echo
   */
  async create(projectId: string, echo: Omit<Echo, 'id'>): Promise<Echo> {
    try {
      const response = await apiClient.post<unknown>(
        `${this.basePath}?projectId=${projectId}`,
        echo
      );
      const validated = validateApiResponse<Echo>(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '创建 Echo 失败');
      }

      return validated.data;
    } catch (error) {
      console.error('创建 Echo 失败:', error);
      throw error instanceof ApiError ? error : new ApiError('创建 Echo 失败');
    }
  }

  /**
   * 更新 Echo
   */
  async update(projectId: string, echoId: string, echo: Partial<Echo>): Promise<void> {
    try {
      const response = await apiClient.patch<unknown>(
        `${this.basePath}/${echoId}?projectId=${projectId}`,
        echo
      );
      const validated = validateApiResponse(response);

      if (!validated.success) {
        throw new ApiError(validated.error || '更新 Echo 失败');
      }
    } catch (error) {
      console.error('更新 Echo 失败:', error);
      throw error instanceof ApiError ? error : new ApiError('更新 Echo 失败');
    }
  }

  /**
   * 删除 Echo
   */
  async delete(projectId: string, echoId: string): Promise<void> {
    try {
      const response = await apiClient.delete(
        `${this.basePath}/${echoId}?projectId=${projectId}`
      );
      const validated = validateApiResponse(response);

      if (!validated.success) {
        throw new ApiError(validated.error || '删除 Echo 失败');
      }
    } catch (error) {
      console.error('删除 Echo 失败:', error);
      throw error instanceof ApiError ? error : new ApiError('删除 Echo 失败');
    }
  }

  /**
   * 批量操作 Echo
   */
  async batchOperation(
    projectId: string,
    operation: 'ACCEPT' | 'REJECT',
    echoIds: string[]
  ): Promise<{ success: boolean; affectedCount: number }> {
    try {
      const response = await apiClient.post<unknown>(
        `${this.basePath}/batch?projectId=${projectId}`,
        { operation, echoIds }
      );
      const validated = validateApiResponse<{ success: boolean; affectedCount: number }>(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '批量操作失败');
      }

      return validated.data;
    } catch (error) {
      console.error('批量操作失败:', error);
      throw error instanceof ApiError ? error : new ApiError('批量操作失败');
    }
  }
}

/**
 * 单例实例
 */
export const echoService = new EchoService();
