import { apiClient } from './client';
import type {
  ProjectSummary,
  ProjectDTO,
  CreateProjectResponse,
  ChapterContentDTO,
  ProjectStatisticsDTO
} from '../../types/api';
import { cacheManager, generateCacheKey } from '../cacheManager';
import { DeepPartial, ProjectState } from '../../types';

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
  getChapter: (projectId: string, chapterId: string): Promise<ChapterContentDTO> =>
    apiClient.get<ChapterContentDTO>(`/projects/${projectId}/chapters/${chapterId}`),

  /**
   * 获取所有非空章节内容
   */
  getChaptersContent: (projectId: string): Promise<ChapterContentDTO[]> =>
    apiClient.get<ChapterContentDTO[]>(`/projects/${projectId}/chapters-content`),

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
};
