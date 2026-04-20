/**
 * 图谱查询 Slice
 *
 * 管理角色图谱和Echo图谱的查询结果
 * 缓存图谱数据以提升性能
 */

import { StateCreator } from 'zustand';
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
}

export interface GraphSlice {
  // 状态
  graphQuery: GraphQueryState;

  // 操作
  fetchCharacterTraits: (characterId: string, projectId: string, useBackend: boolean) => Promise<void>;
  fetchCharacterEvolution: (characterId: string, projectId: string, useBackend: boolean) => Promise<void>;
  fetchCharacterForeshadowing: (characterId: string, projectId: string, useBackend: boolean) => Promise<void>;
  clearCharacterGraphData: (characterId: string) => void;
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

    newTraitsMap.delete(characterId);
    newEvolutionMap.delete(characterId);
    newForeshadowingMap.delete(characterId);

    set({
      graphQuery: {
        ...graphQuery,
        characterTraits: newTraitsMap,
        characterEvolution: newEvolutionMap,
        characterForeshadowing: newForeshadowingMap,
      }
    });
  },
});
