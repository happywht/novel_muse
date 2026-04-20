/**
 * 角色服务层
 *
 * 提供角色相关的 API 服务
 */

import { apiClient } from '../client';
import { validateApiResponse, ApiError } from '../ApiResponse';
import type { Character } from '@/types';

/**
 * 角色服务类
 */
export class CharacterService {
  private readonly basePath = '/characters';

  /**
   * 获取所有角色
   */
  async list(projectId: string): Promise<Character[]> {
    try {
      const response = await apiClient.get<unknown>(`${this.basePath}?projectId=${projectId}`);
      const validated = validateApiResponse<Character[]>(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '获取角色列表失败');
      }

      return validated.data;
    } catch (error) {
      console.error('获取角色列表失败:', error);
      throw error instanceof ApiError ? error : new ApiError('获取角色列表失败');
    }
  }

  /**
   * 获取单个角色
   */
  async get(projectId: string, characterId: string): Promise<Character> {
    try {
      const response = await apiClient.get<unknown>(
        `${this.basePath}/${characterId}?projectId=${projectId}`
      );
      const validated = validateApiResponse<Character>(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '获取角色失败');
      }

      return validated.data;
    } catch (error) {
      console.error('获取角色失败:', error);
      throw error instanceof ApiError ? error : new ApiError('获取角色失败');
    }
  }

  /**
   * 创建角色
   */
  async create(projectId: string, character: Omit<Character, 'id'>): Promise<Character> {
    try {
      const response = await apiClient.post<unknown>(
        `${this.basePath}?projectId=${projectId}`,
        character
      );
      const validated = validateApiResponse<Character>(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '创建角色失败');
      }

      return validated.data;
    } catch (error) {
      console.error('创建角色失败:', error);
      throw error instanceof ApiError ? error : new ApiError('创建角色失败');
    }
  }

  /**
   * 更新角色
   */
  async update(projectId: string, characterId: string, character: Partial<Character>): Promise<void> {
    try {
      const response = await apiClient.patch<unknown>(
        `${this.basePath}/${characterId}?projectId=${projectId}`,
        character
      );
      const validated = validateApiResponse(response);

      if (!validated.success) {
        throw new ApiError(validated.error || '更新角色失败');
      }
    } catch (error) {
      console.error('更新角色失败:', error);
      throw error instanceof ApiError ? error : new ApiError('更新角色失败');
    }
  }

  /**
   * 删除角色
   */
  async delete(projectId: string, characterId: string): Promise<void> {
    try {
      const response = await apiClient.delete(
        `${this.basePath}/${characterId}?projectId=${projectId}`
      );
      const validated = validateApiResponse(response);

      if (!validated.success) {
        throw new ApiError(validated.error || '删除角色失败');
      }
    } catch (error) {
      console.error('删除角色失败:', error);
      throw error instanceof ApiError ? error : new ApiError('删除角色失败');
    }
  }

  /**
   * 获取角色关系网络
   */
  async getRelationshipNetwork(projectId: string, characterId: string): Promise<{
    character: Character;
    relationships: Array<{
      targetCharacter: Character;
      relation: string;
      weight: number;
      trajectory?: string;
    }>;
  }> {
    try {
      const response = await apiClient.get<unknown>(
        `${this.basePath}/${characterId}/relationships?projectId=${projectId}`
      );
      const validated = validateApiResponse(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '获取角色关系网络失败');
      }

      return validated.data as any;
    } catch (error) {
      console.error('获取角色关系网络失败:', error);
      throw error instanceof ApiError ? error : new ApiError('获取角色关系网络失败');
    }
  }

  /**
   * 获取角色演变历史
   */
  async getEvolutionHistory(projectId: string, characterId: string): Promise<Array<{
    echoId: string;
    timestamp: number;
    type: string;
    description: string;
    reason: string;
    status: string;
  }>> {
    try {
      const response = await apiClient.get<unknown>(
        `${this.basePath}/${characterId}/evolution?projectId=${projectId}`
      );
      const validated = validateApiResponse(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '获取角色演变历史失败');
      }

      return validated.data as any;
    } catch (error) {
      console.error('获取角色演变历史失败:', error);
      throw error instanceof ApiError ? error : new ApiError('获取角色演变历史失败');
    }
  }
}

/**
 * 单例实例
 */
export const characterService = new CharacterService();
