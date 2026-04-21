import { apiClient } from './client';
import type {
  ProjectSummary,
  ProjectDTO,
  CreateProjectResponse,
  ChapterContentDTO,
  ProjectStatisticsDTO
} from '../../types/api';
import { cacheManager, generateCacheKey } from '../cacheManager';
import { DeepPartial, ProjectState, PlotNode } from '../../types';

/**
 * 项目管理 API
 */
export const projectApi = {
  /**
   * 获取项目列表
   */
  list: async (): Promise<ProjectSummary[]> => {
    const cacheKey = generateCacheKey('projectList');
    const cached = await cacheManager.get<ProjectSummary[]>(cacheKey);
    if (cached) return cached;

    const data = await apiClient.get<ProjectSummary[]>('/projects');
    await cacheManager.set(cacheKey, data);
    return data;
  },

  /**
   * 获取单个项目
   */
  get: (id: string): Promise<ProjectDTO> =>
    apiClient.get<ProjectDTO>(`/projects/${id}`),

  /**
   * 创建项目
   */
  create: (): Promise<CreateProjectResponse> =>
    apiClient.post<CreateProjectResponse>('/projects', {}),

  /**
   * 完整同步项目
   */
  syncFull: (project: ProjectDTO): Promise<void> =>
    apiClient.put<void>(`/projects/${project.id}/full`, project),

  /**
   * 部分更新项目
   */
  patch: (id: string, delta: DeepPartial<ProjectState>): Promise<void> =>
    apiClient.patch<void>(`/projects/${id}`, delta),

  /**
   * 删除项目
   */
  delete: (id: string): Promise<void> =>
    apiClient.delete(`/projects/${id}`),

  /**
   * 获取章节内容
   */
  getChapter: (projectId: string, chapterId: string, signal?: AbortSignal): Promise<ChapterContentDTO> =>
    apiClient.get<ChapterContentDTO>(`/projects/${projectId}/chapters/${chapterId}`, signal),

  /**
   * 获取所有非空章节内容
   */
  getChaptersContent: (projectId: string, signal?: AbortSignal): Promise<ChapterContentDTO[]> =>
    apiClient.get<ChapterContentDTO[]>(`/projects/${projectId}/chapters-content`, signal),

  /**
   * 获取项目统计数据
   */
  getStatistics: async (projectId: string): Promise<ProjectStatisticsDTO> => {
    const cacheKey = generateCacheKey('statistics', projectId);
    const cached = await cacheManager.get<ProjectStatisticsDTO>(cacheKey);
    if (cached) return cached;

    const data = await apiClient.get<ProjectStatisticsDTO>(`/projects/${projectId}/statistics`);
    await cacheManager.set(cacheKey, data);
    return data;
  },

  /**
   * P2 增强：将PlotNode中的名称转换为UUID引用
   * @param projectId 项目ID
   * @param nodes PlotNode数组（包含relatedCharacterNames和relatedLocationNames）
   * @returns 转换后的PlotNode数组（包含relatedCharacters和relatedLocations UUIDs）
   */
  convertPlotNodeNamesToUUIDs: async (projectId: string, nodes: PlotNode[], signal?: AbortSignal): Promise<PlotNode[]> => {
    return apiClient.post<PlotNode[]>(`/projects/${projectId}/plotnodes/convert-names-to-uuids`, { nodes }, signal);
  },

  /**
   * 获取项目角色的名称到UUID映射表
   * @param projectId 项目ID
   * @returns 名称到ID的映射对象
   */
  getCharacterMappings: async (projectId: string, signal?: AbortSignal): Promise<{ mapping: Record<string, string>; count: number }> => {
    return apiClient.get<{ mapping: Record<string, string>; count: number }>(`/projects/${projectId}/mappings/characters`, signal);
  },

  /**
   * 获取项目地点的名称到UUID映射表
   * @param projectId 项目ID
   * @returns 名称到ID的映射对象
   */
  getLocationMappings: async (projectId: string, signal?: AbortSignal): Promise<{ mapping: Record<string, string>; count: number }> => {
    return apiClient.get<{ mapping: Record<string, string>; count: number }>(`/projects/${projectId}/mappings/locations`, signal);
  },
};
