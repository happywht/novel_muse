import { apiClient } from './client';

/**
 * 角色特质响应
 */
export interface CharacterTraitsResponse {
  characterId: string;
  characterName: string;
  desire: string | null;
  fear: string | null;
  weakness: string | null;
  signature: string | null;
  contrast: string | null;
}

/**
 * 角色演变历史项
 */
export interface CharacterEvolutionItem {
  echoId: string;
  timestamp: number;
  type: 'CHARACTER' | 'WORLD';
  description: string;
  reason: string;
  status: string;
  triples: Array<{
    subject: string;
    relation: string;
    object: string;
    weight?: number;
    trajectory?: string;
  }>;
}

/**
 * 角色伏笔项
 */
export interface CharacterForeshadowingItem {
  id: string;
  type: string;
  subject: string;
  relation: string;
  object: string;
  status: 'OPEN' | 'RESOLVED' | 'ABANDONED';
  weight?: number;
  relatedPlotNodes?: any[];
}

/**
 * 关系时间线项
 */
export interface RelationshipTimelineItem {
  timestamp: number;
  echoId: string;
  relation: string;
  trajectory: string;
  weight: number;
  description: string;
}

/**
 * Echo伏笔项
 */
export interface EchoForeshadowingItem {
  subject: string;
  relation: string;
  object: string;
  echoId: string;
  createdAt: number;
  relatedChapter?: string;
}

/**
 * 矛盾检测项
 */
export interface ContradictionItem {
  type: 'RELATIONSHIP_CONFLICT' | 'STATE_MISMATCH' | 'TEMPORAL_ERROR';
  description: string;
  entities: string[];
  conflictingEchoes: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * 角色管理 API
 */
export const characterApi = {
  /**
   * 获取角色特质
   */
  getTraits: (projectId: string, characterId: string): Promise<CharacterTraitsResponse | null> =>
    apiClient.get<CharacterTraitsResponse>(`/graph/${projectId}/characters/${characterId}/traits`),

  /**
   * 获取角色演变历史
   */
  getEvolution: (projectId: string, characterId: string): Promise<CharacterEvolutionItem[]> =>
    apiClient.get<CharacterEvolutionItem[]>(`/graph/${projectId}/characters/${characterId}/evolution`),

  /**
   * 获取角色伏笔
   */
  getForeshadowing: (projectId: string, characterId: string): Promise<CharacterForeshadowingItem[]> =>
    apiClient.get<CharacterForeshadowingItem[]>(`/graph/${projectId}/characters/${characterId}/foreshadowing`),

  /**
   * 获取关系时间线
   */
  getRelationshipTimeline: (
    projectId: string,
    char1Id: string,
    char2Id: string
  ): Promise<RelationshipTimelineItem[]> =>
    apiClient.get<RelationshipTimelineItem[]>(
      `/graph/${projectId}/relationship-timeline?char1Id=${char1Id}&char2Id=${char2Id}`
    ),

  /**
   * 获取Echo伏笔
   */
  getEchoForeshadowing: (projectId: string, branchId?: string): Promise<EchoForeshadowingItem[]> => {
    const url = branchId
      ? `/graph/${projectId}/echo-foreshadowing?branchId=${branchId}`
      : `/graph/${projectId}/echo-foreshadowing`;
    return apiClient.get<EchoForeshadowingItem[]>(url);
  },

  /**
   * 检测矛盾
   */
  detectContradictions: (projectId: string): Promise<ContradictionItem[]> =>
    apiClient.get<ContradictionItem[]>(`/graph/${projectId}/contradictions`),
};
