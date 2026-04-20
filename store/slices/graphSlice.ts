/**
 * 图谱查询 Slice
 *
 * 管理角色图谱和Echo图谱的查询结果
 * 缓存图谱数据以提升性能
 */

import { StateCreator } from 'zustand';
import { graphApi } from '../../services/api';
import {
  fetchCharacterTraits,
  fetchCharacterEvolution,
  fetchCharacterForeshadowing
} from '../../services/apiService';

// 图谱查询结果类型定义
export interface GraphQueryState {
  // 角色图谱
  characterTraits: Map<string, {
    characterId: string;
    characterName: string;
    desire: string | null;
    fear: string | null;
    weakness: string | null;
    signature: string | null;
    contrast: string | null;
  }>; // characterId -> traits
  characterEvolution: Map<string, Array<{
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
  }>>; // characterId -> evolution history
  characterForeshadowing: Map<string, Array<{
    id: string;
    type: string;
    subject: string;
    relation: string;
    object: string;
    status: 'OPEN' | 'RESOLVED' | 'ABANDONED';
    weight?: number;
    relatedPlotNodes?: any[];
  }>>; // characterId -> foreshadowing

  // 加载状态
  loadingTraits: Set<string>; // 正在加载的角色ID
  loadingEvolution: Set<string>;
  loadingForeshadowing: Set<string>;

  // P0 增强：角色深度查询缓存
  characterDepthCache: Map<string, any>; // characterId -> depth data
  motivationNetwork: any | null; // 动机网络数据
  loadingDepth: Set<string>; // 正在加载深度数据的角色ID
  loadingMotivationNetwork: boolean;
}

export interface GraphSlice {
  // 状态
  graphQuery: GraphQueryState;

  // 操作
  fetchCharacterTraits: (characterId: string, projectId: string, useBackend: boolean) => Promise<void>;
  fetchCharacterEvolution: (characterId: string, projectId: string, useBackend: boolean) => Promise<void>;
  fetchCharacterForeshadowing: (characterId: string, projectId: string, useBackend: boolean) => Promise<void>;
  clearCharacterGraphData: (characterId: string) => void;

  // P0 增强：角色深度查询方法
  fetchCharacterDepth: (characterId: string, projectId: string, useBackend: boolean) => Promise<any | null>;
  searchCharactersByTags: (tags: string[], matchAll: boolean, projectId: string, useBackend: boolean) => Promise<any[]>;
  fetchCharactersByAlignment: (alignmentPattern: string, projectId: string, useBackend: boolean) => Promise<any[]>;
  fetchCharacterMotivationNetwork: (projectId: string, useBackend: boolean) => Promise<any | null>;
  fetchCharactersAtLocation: (locationId: string, includeVisitors: boolean, projectId: string, useBackend: boolean) => Promise<any[]>;
  syncCharacterToGraph: (characterId: string, projectId: string, useBackend: boolean) => Promise<void>;
}

export const createGraphSlice: StateCreator<
  GraphSlice,
  [],
  [],
  GraphSlice
> = (set, get) => ({
  // 初始状态
  graphQuery: {
    characterTraits: new Map(),
    characterEvolution: new Map(),
    characterForeshadowing: new Map(),
    loadingTraits: new Set(),
    loadingEvolution: new Set(),
    loadingForeshadowing: new Set(),

    // P0 增强：初始状态
    characterDepthCache: new Map(),
    motivationNetwork: null,
    loadingDepth: new Set(),
    loadingMotivationNetwork: false,
  },

  // 获取角色特征
  fetchCharacterTraits: async (characterId: string, projectId: string, useBackend: boolean) => {
    if (!useBackend) return;

    const { graphQuery } = get();

    // 如果正在加载，直接返回
    if (graphQuery.loadingTraits.has(characterId)) return;

    // 标记为加载中
    set({
      graphQuery: {
        ...graphQuery,
        loadingTraits: new Set([...graphQuery.loadingTraits, characterId])
      }
    });

    try {
      const traits = await fetchCharacterTraits(projectId, characterId);
      const newTraitsMap = new Map(graphQuery.characterTraits);
      if (traits) {
        newTraitsMap.set(characterId, traits);
      }

      set({
        graphQuery: {
          ...get().graphQuery,
          characterTraits: newTraitsMap,
          loadingTraits: new Set([...get().graphQuery.loadingTraits].filter(id => id !== characterId))
        }
      });
    } catch (err) {
      console.error('Failed to fetch character traits:', err);
      set({
        graphQuery: {
          ...get().graphQuery,
          loadingTraits: new Set([...get().graphQuery.loadingTraits].filter(id => id !== characterId))
        }
      });
    }
  },

  // 获取角色演化
  fetchCharacterEvolution: async (characterId: string, projectId: string, useBackend: boolean) => {
    if (!useBackend) return;

    const { graphQuery } = get();

    // 如果正在加载，直接返回
    if (graphQuery.loadingEvolution.has(characterId)) return;

    // 标记为加载中
    set({
      graphQuery: {
        ...graphQuery,
        loadingEvolution: new Set([...graphQuery.loadingEvolution, characterId])
      }
    });

    try {
      const evolution = await fetchCharacterEvolution(projectId, characterId);
      const newEvolutionMap = new Map(graphQuery.characterEvolution);
      newEvolutionMap.set(characterId, evolution);

      set({
        graphQuery: {
          ...get().graphQuery,
          characterEvolution: newEvolutionMap,
          loadingEvolution: new Set([...get().graphQuery.loadingEvolution].filter(id => id !== characterId))
        }
      });
    } catch (err) {
      console.error('Failed to fetch character evolution:', err);
      set({
        graphQuery: {
          ...get().graphQuery,
          loadingEvolution: new Set([...get().graphQuery.loadingEvolution].filter(id => id !== characterId))
        }
      });
    }
  },

  // 获取角色伏笔
  fetchCharacterForeshadowing: async (characterId: string, projectId: string, useBackend: boolean) => {
    if (!useBackend) return;

    const { graphQuery } = get();

    // 如果正在加载，直接返回
    if (graphQuery.loadingForeshadowing.has(characterId)) return;

    // 标记为加载中
    set({
      graphQuery: {
        ...graphQuery,
        loadingForeshadowing: new Set([...graphQuery.loadingForeshadowing, characterId])
      }
    });

    try {
      const foreshadowing = await fetchCharacterForeshadowing(projectId, characterId);
      const newForeshadowingMap = new Map(graphQuery.characterForeshadowing);
      newForeshadowingMap.set(characterId, foreshadowing);

      set({
        graphQuery: {
          ...get().graphQuery,
          characterForeshadowing: newForeshadowingMap,
          loadingForeshadowing: new Set([...get().graphQuery.loadingForeshadowing].filter(id => id !== characterId))
        }
      });
    } catch (err) {
      console.error('Failed to fetch character foreshadowing:', err);
      set({
        graphQuery: {
          ...get().graphQuery,
          loadingForeshadowing: new Set([...get().graphQuery.loadingForeshadowing].filter(id => id !== characterId))
        }
      });
    }
  },

  // 清除角色图谱数据
  clearCharacterGraphData: (characterId: string) => {
    const { graphQuery } = get();
    const newTraitsMap = new Map(graphQuery.characterTraits);
    const newEvolutionMap = new Map(graphQuery.characterEvolution);
    const newForeshadowingMap = new Map(graphQuery.characterForeshadowing);
    const newDepthCacheMap = new Map(graphQuery.characterDepthCache);

    newTraitsMap.delete(characterId);
    newEvolutionMap.delete(characterId);
    newForeshadowingMap.delete(characterId);
    newDepthCacheMap.delete(characterId);

    set({
      graphQuery: {
        ...graphQuery,
        characterTraits: newTraitsMap,
        characterEvolution: newEvolutionMap,
        characterForeshadowing: newForeshadowingMap,
        characterDepthCache: newDepthCacheMap,
      }
    });
  },

  // ============================================
  // P0 增强：角色深度查询实现
  // ============================================

  /**
   * 获取角色深度属性（包含关系和世界关联）
   */
  fetchCharacterDepth: async (characterId: string, projectId: string, useBackend: boolean) => {
    if (!useBackend) return null;

    const { graphQuery } = get();

    // 如果正在加载，直接返回
    if (graphQuery.loadingDepth.has(characterId)) {
      return graphQuery.characterDepthCache.get(characterId) || null;
    }

    // 检查缓存
    if (graphQuery.characterDepthCache.has(characterId)) {
      return graphQuery.characterDepthCache.get(characterId);
    }

    // 标记为加载中
    set({
      graphQuery: {
        ...graphQuery,
        loadingDepth: new Set([...graphQuery.loadingDepth, characterId])
      }
    });

    try {
      const depthData = await graphApi.getCharacterDepth(projectId, characterId);
      const newCache = new Map(graphQuery.characterDepthCache);
      newCache.set(characterId, depthData);

      set({
        graphQuery: {
          ...get().graphQuery,
          characterDepthCache: newCache,
          loadingDepth: new Set([...get().graphQuery.loadingDepth].filter(id => id !== characterId))
        }
      });

      return depthData;
    } catch (err) {
      console.error('Failed to fetch character depth:', err);
      set({
        graphQuery: {
          ...get().graphQuery,
          loadingDepth: new Set([...get().graphQuery.loadingDepth].filter(id => id !== characterId))
        }
      });
      return null;
    }
  },

  /**
   * 按标签搜索角色
   * @param tags - 标签数组
   * @param matchAll - true=AND逻辑(所有标签), false=OR逻辑(任一标签)
   */
  searchCharactersByTags: async (tags: string[], matchAll: boolean, projectId: string, useBackend: boolean) => {
    if (!useBackend) return [];

    try {
      const results = await graphApi.searchCharactersByTags(projectId, tags, matchAll);
      return results;
    } catch (err) {
      console.error('Failed to search characters by tags:', err);
      return [];
    }
  },

  /**
   * 按道德阵营搜索角色（支持模糊匹配）
   * @param alignmentPattern - 阵营模式（如 "守序" 可匹配 "守序善良"、"守序中立" 等）
   */
  fetchCharactersByAlignment: async (alignmentPattern: string, projectId: string, useBackend: boolean) => {
    if (!useBackend) return [];

    try {
      const results = await graphApi.getCharactersByAlignment(projectId, alignmentPattern);
      return results;
    } catch (err) {
      console.error('Failed to fetch characters by alignment:', err);
      return [];
    }
  },

  /**
   * 获取角色动机网络（欲望和恐惧）
   */
  fetchCharacterMotivationNetwork: async (projectId: string, useBackend: boolean) => {
    if (!useBackend) return null;

    const { graphQuery } = get();

    // 如果正在加载，直接返回缓存
    if (graphQuery.loadingMotivationNetwork) {
      return graphQuery.motivationNetwork;
    }

    // 检查缓存
    if (graphQuery.motivationNetwork) {
      return graphQuery.motivationNetwork;
    }

    // 标记为加载中
    set({
      graphQuery: {
        ...graphQuery,
        loadingMotivationNetwork: true
      }
    });

    try {
      const networkData = await graphApi.getCharacterMotivationNetwork(projectId);

      set({
        graphQuery: {
          ...get().graphQuery,
          motivationNetwork: networkData,
          loadingMotivationNetwork: false
        }
      });

      return networkData;
    } catch (err) {
      console.error('Failed to fetch character motivation network:', err);
      set({
        graphQuery: {
          ...get().graphQuery,
          loadingMotivationNetwork: false
        }
      });
      return null;
    }
  },

  /**
   * 获取指定位置的角色（包含访问者）
   * @param locationId - 地点ID
   * @param includeVisitors - 是否包含访问者（起源地、控制领地）
   */
  fetchCharactersAtLocation: async (locationId: string, includeVisitors: boolean, projectId: string, useBackend: boolean) => {
    if (!useBackend) return [];

    try {
      const results = await graphApi.getCharactersAtLocation(projectId, locationId, includeVisitors);
      return results;
    } catch (err) {
      console.error('Failed to fetch characters at location:', err);
      return [];
    }
  },

  /**
   * 增量同步单个角色到图谱
   */
  syncCharacterToGraph: async (characterId: string, projectId: string, useBackend: boolean) => {
    if (!useBackend) return;

    try {
      await graphApi.syncCharacter(projectId, characterId);

      // 清除缓存以强制下次重新获取
      const { graphQuery } = get();
      const newCache = new Map(graphQuery.characterDepthCache);
      newCache.delete(characterId);

      set({
        graphQuery: {
          ...graphQuery,
          characterDepthCache: newCache
        }
      });
    } catch (err) {
      console.error('Failed to sync character to graph:', err);
    }
  },
});
