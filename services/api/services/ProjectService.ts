/**
 * 项目服务层
 *
 * 提供完整的项目 CRUD 操作，包括数据验证、转换和错误处理
 */

import { apiClient } from '../client';
import { projectTransformer } from '../transformers/ProjectTransformer';
import { validateCreateProject, validateUpdateProject } from '../validators/ProjectValidator';
import { validateApiResponse, extractApiResponseData, ApiError } from '../ApiResponse';
import type { ProjectState } from '@/types';
import type { ProjectDTO, ProjectSummary, CreateProjectResponse } from '@/types/api';

/**
 * 项目服务类
 */
export class ProjectService {
  private readonly basePath = '/projects';

  /**
   * 获取项目列表
   */
  async list(): Promise<ProjectState[]> {
    try {
      const response = await apiClient.get<unknown>(`${this.basePath}`);
      const validated = validateApiResponse<ProjectSummary[]>(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '获取项目列表失败');
      }

      // 转换 DTO 为前端模型
      return Array.isArray(validated.data)
        ? validated.data.map(dto => projectTransformer.transformSummary(dto) as ProjectState)
        : [];
    } catch (error) {
      console.error('获取项目列表失败:', error);
      throw error instanceof ApiError ? error : new ApiError('获取项目列表失败');
    }
  }

  /**
   * 获取单个项目
   */
  async get(id: string): Promise<ProjectState> {
    try {
      const response = await apiClient.get<unknown>(`${this.basePath}/${id}`);
      const validated = validateApiResponse<ProjectDTO>(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '获取项目失败');
      }

      return projectTransformer.transform(validated.data);
    } catch (error) {
      console.error('获取项目失败:', error);
      throw error instanceof ApiError ? error : new ApiError('获取项目失败');
    }
  }

  /**
   * 创建新项目
   */
  async create(data: Partial<ProjectState>): Promise<ProjectState> {
    try {
      // 验证输入数据
      const validated = validateCreateProject(data);

      // 转换为 DTO
      const dto: Partial<ProjectDTO> = {
        title: validated.title,
        genre: validated.genre,
        premise: validated.premise,
        creativeSettings: validated.creativeSettings,
        characters: data.characters || [],
        worldSettings: data.worldSettings || [],
        plotNodes: data.plotNodes || [],
        chapters: data.chapters || [],
        drafts: data.drafts || [],
        echoes: data.echoes || [],
        timeline: data.timeline || [],
        createdAt: Date.now(),
        lastModified: Date.now(),
      };

      const response = await apiClient.post<unknown>(this.basePath, dto);
      const apiResponse = validateApiResponse<CreateProjectResponse>(response);

      if (!apiResponse.success || !apiResponse.data) {
        throw new ApiError(apiResponse.error || '创建项目失败');
      }

      // 返回完整的项目数据
      return this.get(apiResponse.data.id);
    } catch (error) {
      console.error('创建项目失败:', error);
      throw error instanceof ApiError ? error : new ApiError('创建项目失败');
    }
  }

  /**
   * 更新项目
   */
  async update(id: string, data: Partial<ProjectState>): Promise<void> {
    try {
      // 验证输入数据
      const validated = validateUpdateProject(data);

      // 部分转换
      const dto = projectTransformer.transformReverse({
        ...data,
        id,
        lastModified: Date.now(),
      } as ProjectState);

      const response = await apiClient.patch<unknown>(`${this.basePath}/${id}`, dto);
      const apiResponse = validateApiResponse(response);

      if (!apiResponse.success) {
        throw new ApiError(apiResponse.error || '更新项目失败');
      }
    } catch (error) {
      console.error('更新项目失败:', error);
      throw error instanceof ApiError ? error : new ApiError('更新项目失败');
    }
  }

  /**
   * 删除项目
   */
  async delete(id: string): Promise<void> {
    try {
      const response = await apiClient.delete(`${this.basePath}/${id}`);
      const apiResponse = validateApiResponse(response);

      if (!apiResponse.success) {
        throw new ApiError(apiResponse.error || '删除项目失败');
      }
    } catch (error) {
      console.error('删除项目失败:', error);
      throw error instanceof ApiError ? error : new ApiError('删除项目失败');
    }
  }

  /**
   * 完整同步项目
   */
  async syncFull(project: ProjectState): Promise<void> {
    try {
      const dto = projectTransformer.transformReverse(project);
      await apiClient.put<void>(`${this.basePath}/${project.id}/full`, dto);
    } catch (error) {
      console.error('同步项目失败:', error);
      throw new ApiError('同步项目失败');
    }
  }

  /**
   * 获取项目统计信息
   */
  async getStatistics(projectId: string): Promise<{
    totalWords: number;
    chapterCount: number;
    characterCount: number;
    worldSettingCount: number;
    plotNodeCount: number;
    echoCount: number;
    pendingEchoCount: number;
    relationshipCount: number;
    timelineCount: number;
    lastModified: number;
  }> {
    try {
      const response = await apiClient.get<unknown>(`${this.basePath}/${projectId}/statistics`);
      const validated = validateApiResponse(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '获取统计信息失败');
      }

      return validated.data as any;
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error instanceof ApiError ? error : new ApiError('获取统计信息失败');
    }
  }

  /**
   * 获取章节内容
   */
  async getChapter(projectId: string, chapterId: string): Promise<{
    id: string;
    content: string;
  }> {
    try {
      const response = await apiClient.get<unknown>(
        `${this.basePath}/${projectId}/chapters/${chapterId}`
      );
      const validated = validateApiResponse(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '获取章节内容失败');
      }

      return validated.data as any;
    } catch (error) {
      console.error('获取章节内容失败:', error);
      throw error instanceof ApiError ? error : new ApiError('获取章节内容失败');
    }
  }

  /**
   * 获取所有非空章节内容
   */
  async getChaptersContent(projectId: string): Promise<Array<{
    id: string;
    content: string;
  }>> {
    try {
      const response = await apiClient.get<unknown>(
        `${this.basePath}/${projectId}/chapters-content`
      );
      const validated = validateApiResponse(response);

      if (!validated.success || !validated.data) {
        throw new ApiError(validated.error || '获取章节内容失败');
      }

      return validated.data as any;
    } catch (error) {
      console.error('获取章节内容失败:', error);
      throw error instanceof ApiError ? error : new ApiError('获取章节内容失败');
    }
  }
}

/**
 * 单例实例
 */
export const projectService = new ProjectService();
