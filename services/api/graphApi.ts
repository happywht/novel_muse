import { apiClient } from './client';
import type {
  GraphDTO,
  NodeNeighborsDTO,
  ForgeGraphContextDTO,
  NarrativeInsightDTO,
  PlotNodeContextDTO,
  ConsistencyIssueDTO
} from '../../types/api';
import { KnowledgeTriple, Faction, PropagationRisk, PhysicalStatus } from '../../types';
import { cacheManager, generateCacheKey } from '../cacheManager';

/**
 * 知识图谱 API
 */
export const graphApi = {
  /**
   * 获取图谱
   */
  get: async (projectId: string, types?: string[]): Promise<GraphDTO> => {
    const cacheKey = generateCacheKey('graph', projectId, types);
    const cached = await cacheManager.get<GraphDTO>(cacheKey);
    if (cached) return cached;

    const url = types && types.length > 0
      ? `/graph/${projectId}?types=${encodeURIComponent(types.join(','))}`
      : `/graph/${projectId}`;

    const data = await apiClient.get<GraphDTO>(url);
    await cacheManager.set(cacheKey, data);
    return data;
  },

  /**
   * 获取节点邻居
   */
  getNeighbors: (projectId: string, nodeId: string): Promise<NodeNeighborsDTO> =>
    apiClient.get<NodeNeighborsDTO>(`/graph/${projectId}/neighbors/${nodeId}`),

  /**
   * 创建边
   */
  createEdge: (projectId: string, sourceId: string, targetId: string, type: string): Promise<void> =>
    apiClient.post<void>(`/graph/${projectId}/edge`, { sourceId, targetId, type }),

  /**
   * 获取相关子图
   */
  getSubgraph: async (projectId: string, anchors: string[], branchId: string = 'main'): Promise<string> => {
    const cacheKey = generateCacheKey('subgraph', projectId, anchors.join(','), branchId);
    const cached = await cacheManager.get<string>(cacheKey);
    if (cached) return cached;

    const url = `/graph/${projectId}/subgraph?anchors=${encodeURIComponent(anchors.join(','))}&branchId=${branchId}`;
    const data = await apiClient.get<{ subgraph: string }>(url);
    await cacheManager.set(cacheKey, data.subgraph);
    return data.subgraph;
  },

  /**
   * 获取叙事洞察
   */
  getNarrativeInsights: async (projectId: string, branchId: string = 'main'): Promise<NarrativeInsightDTO[]> => {
    const cacheKey = generateCacheKey('narrativeInsights', projectId, branchId);
    const cached = await cacheManager.get<NarrativeInsightDTO[]>(cacheKey);
    if (cached) return cached;

    const data = await apiClient.get<NarrativeInsightDTO[]>(`/graph/${projectId}/insights?branchId=${branchId}`);
    await cacheManager.set(cacheKey, data);
    return data;
  },

  /**
   * 获取身体状态
   */
  getPhysicalStatus: async (projectId: string, characterNames: string[], branchId: string = 'main'): Promise<PhysicalStatus[]> => {
    const cacheKey = generateCacheKey('physicalStatus', projectId, characterNames.join(','), branchId);
    const cached = await cacheManager.get<PhysicalStatus[]>(cacheKey);
    if (cached) return cached;

    const url = `/graph/${projectId}/physical-status?names=${encodeURIComponent(characterNames.join(','))}&branchId=${branchId}`;
    const data = await apiClient.get<PhysicalStatus[]>(url);
    await cacheManager.set(cacheKey, data);
    return data;
  },

  /**
   * 获取未回收伏笔
   */
  getUnresolvedForeshadowing: async (projectId: string, branchId: string = 'main'): Promise<KnowledgeTriple[]> => {
    const cacheKey = generateCacheKey('foreshadowing', projectId, branchId);
    const cached = await cacheManager.get<KnowledgeTriple[]>(cacheKey);
    if (cached) return cached;

    const data = await apiClient.get<KnowledgeTriple[]>(`/graph/${projectId}/foreshadowing?branchId=${branchId}`);
    await cacheManager.set(cacheKey, data);
    return data;
  },

  /**
   * 合并分支
   */
  mergeBranch: (projectId: string, branchId: string): Promise<void> =>
    apiClient.post<void>(`/graph/${projectId}/merge`, { branchId }),

  /**
   * 获取势力派系
   */
  getFactions: async (projectId: string): Promise<Faction[]> => {
    const cacheKey = generateCacheKey('factions', projectId);
    const cached = await cacheManager.get<Faction[]>(cacheKey);
    if (cached) return cached;

    const data = await apiClient.get<Faction[]>(`/graph/${projectId}/factions`);
    await cacheManager.set(cacheKey, data);
    return data;
  },

  /**
   * 模拟状态传播（蝴蝶效应）
   */
  simulatePropagation: (projectId: string, triggerName: string, changeDescription: string): Promise<PropagationRisk[]> =>
    apiClient.post<PropagationRisk[]>(`/graph/${projectId}/propagate`, { triggerName, changeDescription }),

  /**
   * 获取情节节点上下文
   */
  getPlotNodeContext: (projectId: string, plotNodeId?: string): Promise<PlotNodeContextDTO> => {
    const url = plotNodeId
      ? `/graph/plot-context/${projectId}/${plotNodeId}`
      : `/graph/plot-context/${projectId}`;
    return apiClient.get<PlotNodeContextDTO>(url);
  },

  /**
   * 检测世界观一致性
   */
  checkConsistency: (projectId: string): Promise<ConsistencyIssueDTO[]> =>
    apiClient.get<ConsistencyIssueDTO[]>(`/graph/${projectId}/consistency-check`),

  // ============================================
  // P0 增强：角色深度查询 API
  // ============================================

  /**
   * 获取角色深度属性（包含关系和世界关联）
   */
  getCharacterDepth: async (projectId: string, characterId: string): Promise<any> => {
    const cacheKey = generateCacheKey('characterDepth', projectId, characterId);
    const cached = await cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const data = await apiClient.get<any>(`/graph/${projectId}/characters/${characterId}/depth`);
    await cacheManager.set(cacheKey, data);
    return data;
  },

  /**
   * 按标签搜索角色
   * @param tags - 标签数组
   * @param matchAll - true=AND逻辑(所有标签), false=OR逻辑(任一标签)
   */
  searchCharactersByTags: async (projectId: string, tags: string[], matchAll: boolean = false): Promise<any[]> => {
    const cacheKey = generateCacheKey('searchByTags', projectId, tags.join(','), matchAll.toString());
    const cached = await cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const data = await apiClient.post<any[]>(`/graph/${projectId}/characters/search/tags`, { tags, matchAll });
    await cacheManager.set(cacheKey, data);
    return data;
  },

  /**
   * 按道德阵营搜索角色（支持模糊匹配）
   * @param alignmentPattern - 阵营模式（如 "守序" 可匹配 "守序善良"、"守序中立" 等）
   */
  getCharactersByAlignment: async (projectId: string, alignmentPattern: string): Promise<any[]> => {
    const cacheKey = generateCacheKey('byAlignment', projectId, alignmentPattern);
    const cached = await cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const data = await apiClient.get<any[]>(`/graph/${projectId}/characters/search/alignment?pattern=${encodeURIComponent(alignmentPattern)}`);
    await cacheManager.set(cacheKey, data);
    return data;
  },

  /**
   * 获取角色动机网络（欲望和恐惧）
   */
  getCharacterMotivationNetwork: async (projectId: string): Promise<any> => {
    const cacheKey = generateCacheKey('motivationNetwork', projectId);
    const cached = await cacheManager.get<any>(cacheKey);
    if (cached) return cached;

    const data = await apiClient.get<any>(`/graph/${projectId}/characters/motivation-network`);
    await cacheManager.set(cacheKey, data);
    return data;
  },

  /**
   * 获取指定位置的角色（包含访问者）
   * @param locationId - 地点ID
   * @param includeVisitors - 是否包含访问者（起源地、控制领地）
   */
  getCharactersAtLocation: async (projectId: string, locationId: string, includeVisitors: boolean = false): Promise<any[]> => {
    const cacheKey = generateCacheKey('atLocation', projectId, locationId, includeVisitors.toString());
    const cached = await cacheManager.get<any[]>(cacheKey);
    if (cached) return cached;

    const url = `/graph/${projectId}/world-settings/${locationId}/characters-enhanced?includeVisitors=${includeVisitors}`;
    const data = await apiClient.get<any[]>(url);
    await cacheManager.set(cacheKey, data);
    return data;
  },

  /**
   * 增量同步单个角色到图谱
   */
  syncCharacter: (projectId: string, characterId: string): Promise<void> =>
    apiClient.post<void>(`/graph/${projectId}/characters/sync`, { characterId }),

  // ============================================
  // P1 增强：角色关系网络 API
  // ============================================

  /**
   * 获取角色关系网络数据
   * @param projectId - 项目ID
   * @param filters - 可选过滤条件
   *   - relationTypes: 关系类型数组（如 ['ALLY_OF', 'ENEMY_OF']）
   *   - minWeight: 最小关系权重（0-100）
   *   - alignments: 道德阵营数组（如 ['守序善良', '混乱邪恶']）
   *   - includeCharacterIds: 仅包含指定角色ID
   */
  getCharacterNetwork: async (projectId: string, filters?: {
    relationTypes?: string[];
    minWeight?: number;
    alignments?: string[];
    includeCharacterIds?: string[];
  }): Promise<{ nodes: any[]; edges: any[] }> => {
    const params = new URLSearchParams();

    if (filters?.relationTypes && filters.relationTypes.length > 0) {
      filters.relationTypes.forEach(type => params.append('relationTypes', type));
    }

    if (filters?.minWeight !== undefined) {
      params.append('minWeight', filters.minWeight.toString());
    }

    if (filters?.alignments && filters.alignments.length > 0) {
      filters.alignments.forEach(alignment => params.append('alignments', alignment));
    }

    if (filters?.includeCharacterIds && filters.includeCharacterIds.length > 0) {
      filters.includeCharacterIds.forEach(id => params.append('includeCharacterIds', id));
    }

    const queryString = params.toString();
    const url = `/graph/${projectId}/character-network${queryString ? `?${queryString}` : ''}`;

    const data = await apiClient.get<{ nodes: any[]; edges: any[] }>(url);
    return data;
  },
};
