import { apiClient } from './client';

/**
 * 章节依赖关系
 */
export interface ChapterDependencies {
  chapter: any;
  plotNode?: any;
  involvedCharacters: any[];
  setLocation?: any;
  beats: any[];
  predecessor?: any;
  successor?: any;
}

/**
 * 章节角色网络
 */
export interface ChapterCharacterNetwork {
  characters: any[];
  relationships: Array<{
    subject: string;
    relation: string;
    object: string;
    weight: number;
  }>;
}

/**
 * 冲突热力图项
 */
export interface ConflictHeatmapEntry {
  chapterId: string;
  chapterTitle: string;
  intensity: number;
  conflictType: string;
  participants: string[];
}

/**
 * 章节分析 API
 */
export const chapterApi = {
  /**
   * 获取章节依赖关系
   */
  getDependencies: (projectId: string, chapterId: string): Promise<ChapterDependencies> =>
    apiClient.get<ChapterDependencies>(`/graph/${projectId}/chapters/${chapterId}/dependencies`),

  /**
   * 获取章节角色网络
   */
  getCharacterNetwork: (projectId: string, chapterId: string): Promise<ChapterCharacterNetwork> =>
    apiClient.get<ChapterCharacterNetwork>(`/graph/${projectId}/chapters/${chapterId}/character-network`),

  /**
   * 获取冲突热力图
   */
  getConflictHeatmap: (projectId: string): Promise<ConflictHeatmapEntry[]> =>
    apiClient.get<ConflictHeatmapEntry[]>(`/graph/${projectId}/conflict-heatmap`),
};
