/**
 * 项目数据转换器
 *
 * 负责前后端项目数据模型的转换和验证
 */

import { BaseTransformer } from './Transformer';
import type { ProjectDTO, ProjectSummary } from '@/types/api';
import type { ProjectState } from '@/types';

/**
 * 项目 DTO 转换器
 */
export class ProjectTransformer extends BaseTransformer<ProjectDTO, ProjectState> {
  /**
   * 从 DTO 转换为前端状态模型
   */
  transform(dto: ProjectDTO): ProjectState {
    return {
      id: dto.id,
      title: dto.title || '未命名项目',
      genre: dto.genre ?? '',
      premise: dto.premise || '',
      creativeSettings: dto.creativeSettings || {
        tone: '史诗',
        style: '',
        creativity: 0.8,
        targetAudience: '',
        promptProfile: 'WEB_NOVEL',
        styleTags: [],
        referenceText: '',
      },
      worldGenConfig: dto.worldGenConfig || {
        detailLevel: 'Standard',
        focus: 'Balanced',
      },
      characters: dto.characters || [],
      worldSettings: dto.worldSettings || [],
      plotOutline: dto.plotOutline || '',
      plotHistory: dto.plotHistory || [],
      plotNodes: dto.plotNodes || [],
      chapters: dto.chapters || [],
      drafts: dto.drafts || [],
      echoes: dto.echoes || [],
      timeline: dto.timeline || [],
      currentWorldDate: dto.currentWorldDate || '元年',
      customPrompts: dto.customPrompts || {},
      createdAt: dto.createdAt || Date.now(),
      lastModified: dto.lastModified || Date.now(),
    };
  }

  /**
   * 从前端状态模型转换为 DTO
   */
  transformReverse(state: ProjectState): ProjectDTO {
    return {
      id: state.id,
      title: state.title,
      genre: state.genre,
      premise: state.premise,
      creativeSettings: state.creativeSettings,
      worldGenConfig: state.worldGenConfig,
      characters: state.characters,
      worldSettings: state.worldSettings,
      plotOutline: state.plotOutline,
      plotHistory: state.plotHistory,
      plotNodes: state.plotNodes,
      chapters: state.chapters,
      drafts: state.drafts,
      echoes: state.echoes,
      timeline: state.timeline,
      currentWorldDate: state.currentWorldDate,
      customPrompts: state.customPrompts,
      createdAt: state.createdAt,
      lastModified: state.lastModified,
    };
  }

  /**
   * 从摘要信息转换为部分状态模型
   */
  transformSummary(summary: ProjectSummary): Partial<ProjectState> {
    return {
      id: summary.id,
      title: summary.title,
      genre: summary.genre,
      lastModified: summary.lastModified,
    };
  }
}

/**
 * 单例实例
 */
export const projectTransformer = new ProjectTransformer();
