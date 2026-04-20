/**
 * 伏笔追踪系统 State Slice
 */

import { StateCreator } from 'zustand';
import {
  Foreshadowing,
  ForeshadowingRelationship,
  ForeshadowingConflict,
  ForeshadowingAnalysis,
  ForeshadowingStats,
  ForeshadowingFilter,
  ForeshadowingFormData,
  ForeshadowingType,
  ForeshadowingStatus,
} from '@/types/foreshadowing';

export interface ForeshadowingSlice {
  // State
  foreshadowings: Foreshadowing[];
  relationships: ForeshadowingRelationship[];
  conflicts: ForeshadowingConflict[];
  analyses: Map<string, ForeshadowingAnalysis>;
  selectedForeshadowingId: string | null;
  filter: ForeshadowingFilter;
  isLoading: boolean;
  error: string | null;

  // CRUD Operations
  addForeshadowing: (data: ForeshadowingFormData) => Foreshadowing;
  updateForeshadowing: (id: string, data: Partial<ForeshadowingFormData>) => void;
  deleteForeshadowing: (id: string) => void;
  getForeshadowingById: (id: string) => Foreshadowing | undefined;
  getFilteredForeshadowings: () => Foreshadowing[];

  // Relationship Management
  addRelationship: (
    sourceId: string,
    targetId: string,
    relationType: ForeshadowingRelationship['relationType'],
    strength: number,
    description?: string
  ) => ForeshadowingRelationship;
  removeRelationship: (relationshipId: string) => void;
  getRelationshipsByForeshadowingId: (id: string) => ForeshadowingRelationship[];
  getRelatedForeshadowings: (id: string) => Foreshadowing[];

  // Conflict Management
  detectConflicts: (foreshadowingId: string, useProject?: any) => ForeshadowingConflict[];
  batchDetectConflicts: () => void;
  resolveConflict: (conflictId: string) => void;
  getConflictsByForeshadowingId: (id: string) => ForeshadowingConflict[];
  getConflictReport: () => {
    totalConflicts: number;
    affectedForeshadowings: number;
    byType: Record<string, number>;
    highSeverityConflicts: number;
    summary: string;
  };

  // Analysis
  analyzeForeshadowing: (id: string) => ForeshadowingAnalysis;
  batchAnalyze: () => void;
  getAnalysis: (id: string) => ForeshadowingAnalysis | undefined;

  // Statistics
  getStatistics: () => ForeshadowingStats;

  // Selection
  setSelectedForeshadowingId: (id: string | null) => void;
  getSelectedForeshadowing: () => Foreshadowing | undefined;

  // Filter
  setFilter: (filter: Partial<ForeshadowingFilter>) => void;
  clearFilter: () => void;

  // Network Analysis
  analyzeAllRelationships: () => void;
  getNetworkAnalysis: () => {
    clusters: Foreshadowing[][];
    hubs: Foreshadowing[];
    isolated: Foreshadowing[];
    density: number;
  };
  getInfluenceSpread: (foreshadowingId: string, maxDepth?: number) => {
    directInfluence: string[];
    indirectInfluence: string[];
    reach: number;
  };
  findShortestPath: (startId: string, endId: string) => string[] | null;

  // Utility
  searchForeshadowings: (query: string) => Foreshadowing[];
  getForeshadowingsByType: (type: ForeshadowingType) => Foreshadowing[];
  getForeshadowingsByStatus: (status: ForeshadowingStatus) => Foreshadowing[];
  getForeshadowingsByChapter: (chapterId: string) => Foreshadowing[];
  getForeshadowingsByCharacter: (characterId: string) => Foreshadowing[];
}

export const createForeshadowingSlice: StateCreator<ForeshadowingSlice> = (set, get) => ({
  // Initial State
  foreshadowings: [],
  relationships: [],
  conflicts: [],
  analyses: new Map(),
  selectedForeshadowingId: null,
  filter: {},
  isLoading: false,
  error: null,

  // CRUD Operations
  addForeshadowing: (data) => {
    const newForeshadowing: Foreshadowing = {
      id: `fs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      hasConflicts: false,
      conflictCount: 0,
      referenceCount: 0,
    };

    set((state) => ({
      foreshadowings: [...state.foreshadowings, newForeshadowing],
      updatedAt: new Date(),
    }));

    return newForeshadowing;
  },

  updateForeshadowing: (id, data) => {
    set((state) => ({
      foreshadowings: state.foreshadowings.map((fs) =>
        fs.id === id
          ? { ...fs, ...data, updatedAt: new Date() }
          : fs
      ),
    }));
  },

  deleteForeshadowing: (id) => {
    set((state) => ({
      foreshadowings: state.foreshadowings.filter((fs) => fs.id !== id),
      relationships: state.relationships.filter(
        (rel) => rel.sourceId !== id && rel.targetId !== id
      ),
      conflicts: state.conflicts.filter((conf) => conf.foreshadowingId !== id),
      analyses: (() => {
        const newAnalyses = new Map(state.analyses);
        newAnalyses.delete(id);
        return newAnalyses;
      })(),
      selectedForeshadowingId:
        state.selectedForeshadowingId === id ? null : state.selectedForeshadowingId,
    }));
  },

  getForeshadowingById: (id) => {
    return get().foreshadowings.find((fs) => fs.id === id);
  },

  getFilteredForeshadowings: () => {
    const state = get();
    let filtered = [...state.foreshadowings];

    // Apply filters
    if (state.filter.statuses && state.filter.statuses.length > 0) {
      filtered = filtered.filter((fs) =>
        state.filter.statuses!.includes(fs.status)
      );
    }

    if (state.filter.types && state.filter.types.length > 0) {
      filtered = filtered.filter((fs) =>
        state.filter.types!.includes(fs.type)
      );
    }

    if (state.filter.priorities && state.filter.priorities.length > 0) {
      filtered = filtered.filter((fs) =>
        state.filter.priorities!.includes(fs.priority)
      );
    }

    if (state.filter.characterIds && state.filter.characterIds.length > 0) {
      filtered = filtered.filter((fs) =>
        fs.relatedCharacters.some((charId) =>
          state.filter.characterIds!.includes(charId)
        )
      );
    }

    if (state.filter.chapterIds && state.filter.chapterIds.length > 0) {
      filtered = filtered.filter((fs) =>
        fs.relatedChapters.some((chapId) =>
          state.filter.chapterIds!.includes(chapId)
        )
      );
    }

    if (state.filter.tags && state.filter.tags.length > 0) {
      filtered = filtered.filter((fs) =>
        fs.tags.some((tag) => state.filter.tags!.includes(tag))
      );
    }

    if (state.filter.onlyWithConflicts) {
      filtered = filtered.filter((fs) => fs.hasConflicts);
    }

    if (state.filter.searchQuery) {
      const query = state.filter.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (fs) =>
          fs.title.toLowerCase().includes(query) ||
          fs.description.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    if (state.filter.sortBy) {
      filtered.sort((a, b) => {
        let comparison = 0;

        switch (state.filter.sortBy) {
          case 'createdAt':
            comparison = a.createdAt.getTime() - b.createdAt.getTime();
            break;
          case 'updatedAt':
            comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
            break;
          case 'title':
            comparison = a.title.localeCompare(b.title);
            break;
          case 'priority':
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            comparison =
              priorityOrder[a.priority as keyof typeof priorityOrder] -
              priorityOrder[b.priority as keyof typeof priorityOrder];
            break;
          case 'impact':
            const impactOrder = { extreme: 0, high: 1, medium: 2, low: 3 };
            comparison =
              impactOrder[a.impact as keyof typeof impactOrder] -
              impactOrder[b.impact as keyof typeof impactOrder];
            break;
        }

        return state.filter.sortOrder === 'desc' ? -comparison : comparison;
      });
    }

    return filtered;
  },

  // Relationship Management
  addRelationship: (sourceId, targetId, relationType, strength, description) => {
    const newRelationship: ForeshadowingRelationship = {
      id: `fsr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      sourceId,
      targetId,
      relationType,
      strength,
      description,
      createdAt: new Date(),
    };

    set((state) => ({
      relationships: [...state.relationships, newRelationship],
    }));

    return newRelationship;
  },

  removeRelationship: (relationshipId) => {
    set((state) => ({
      relationships: state.relationships.filter(
        (rel) => rel.id !== relationshipId
      ),
    }));
  },

  getRelationshipsByForeshadowingId: (id) => {
    return get().relationships.filter(
      (rel) => rel.sourceId === id || rel.targetId === id
    );
  },

  getRelatedForeshadowings: (id) => {
    const state = get();
    const relationships = state.getRelationshipsByForeshadowingId(id);
    const relatedIds = relationships.flatMap(
      (rel) => [rel.sourceId, rel.targetId].filter((fid) => fid !== id)
    );

    return state.foreshadowings.filter((fs) => relatedIds.includes(fs.id));
  },

  // Conflict Management
  detectConflicts: (foreshadowingId, useProject) => {
    const { ConflictDetector } = require('@/services/conflictDetector');
    const state = get();

    const foreshadowing = state.getForeshadowingById(foreshadowingId);
    if (!foreshadowing) {
      return [];
    }

    const project = useProject || state; // 如果没有提供project，使用store中的数据
    const detectedConflicts = ConflictDetector.detectConflicts(foreshadowing, project);

    // 更新矛盾列表和伏笔的矛盾标记
    set((state) => {
      const newConflicts = state.conflicts.filter(
        c => c.foreshadowingId !== foreshadowingId
      );
      newConflicts.push(...detectedConflicts);

      const updatedForeshadowings = state.foreshadowings.map(fs =>
        fs.id === foreshadowingId
          ? { ...fs, hasConflicts: detectedConflicts.length > 0, conflictCount: detectedConflicts.length }
          : fs
      );

      return {
        conflicts: newConflicts,
        foreshadowings: updatedForeshadowings,
      };
    });

    return detectedConflicts;
  },

  batchDetectConflicts: () => {
    const { ConflictDetector } = require('@/services/conflictDetector');
    const state = get();

    const conflictsMap = ConflictDetector.batchDetectConflicts(
      state.foreshadowings,
      state as any // 使用 store 中的项目数据
    );

    // 更新所有矛盾和伏笔状态
    set((state) => {
      const allConflicts: ForeshadowingConflict[] = [];
      const updatedForeshadowings = state.foreshadowings.map(fs => {
        const conflicts = conflictsMap.get(fs.id) || [];
        allConflicts.push(...conflicts);

        return {
          ...fs,
          hasConflicts: conflicts.length > 0,
          conflictCount: conflicts.length,
        };
      });

      return {
        conflicts: allConflicts,
        foreshadowings: updatedForeshadowings,
      };
    });
  },

  resolveConflict: (conflictId) => {
    set((state) => ({
      conflicts: state.conflicts.map((conf) =>
        conf.id === conflictId ? { ...conf, resolved: true } : conf
      ),
    }));
  },

  getConflictsByForeshadowingId: (id) => {
    return get().conflicts.filter((conf) => conf.foreshadowingId === id);
  },

  getConflictReport: () => {
    const { ConflictDetector } = require('@/services/conflictDetector');
    const state = get();

    // 构建矛盾映射
    const conflictsMap = new Map<string, ForeshadowingConflict[]>();
    state.conflicts.forEach(conflict => {
      if (!conflictsMap.has(conflict.foreshadowingId)) {
        conflictsMap.set(conflict.foreshadowingId, []);
      }
      conflictsMap.get(conflict.foreshadowingId)!.push(conflict);
    });

    return ConflictDetector.generateConflictReport(conflictsMap);
  },

  // Analysis
  analyzeForeshadowing: (id) => {
    const foreshadowing = get().getForeshadowingById(id);
    if (!foreshadowing) {
      throw new Error(`Foreshadowing with id ${id} not found`);
    }

    const relationshipCount = get().getRelationshipsByForeshadowingId(id).length;

    // Calculate importance score based on various factors
    const importanceScore = calculateImportanceScore(foreshadowing, relationshipCount);

    // Calculate impact score
    const impactScore = calculateImpactScore(foreshadowing);

    // Calculate complexity score
    const complexityScore = calculateComplexityScore(foreshadowing, relationshipCount);

    const analysis: ForeshadowingAnalysis = {
      foreshadowingId: id,
      importanceScore,
      impactScore,
      complexityScore,
      relationshipCount,
      analyzedAt: new Date(),
    };

    set((state) => {
      const newAnalyses = new Map(state.analyses);
      newAnalyses.set(id, analysis);
      return { analyses: newAnalyses };
    });

    return analysis;
  },

  batchAnalyze: () => {
    const state = get();
    state.foreshadowings.forEach((fs) => {
      state.analyzeForeshadowing(fs.id);
    });
  },

  getAnalysis: (id) => {
    return get().analyses.get(id);
  },

  // Statistics
  getStatistics: () => {
    const state = get();
    const foreshadowings = state.foreshadowings;

    const byStatus = foreshadowings.reduce((acc, fs) => {
      acc[fs.status] = (acc[fs.status] || 0) + 1;
      return acc;
    }, {} as Record<ForeshadowingStatus, number>);

    const byType = foreshadowings.reduce((acc, fs) => {
      acc[fs.type] = (acc[fs.type] || 0) + 1;
      return acc;
    }, {} as Record<ForeshadowingType, number>);

    const byPriority = foreshadowings.reduce((acc, fs) => {
      acc[fs.priority] = (acc[fs.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const resolved = foreshadowings.filter(
      (fs) => fs.status === ForeshadowingStatus.RESOLVED
    ).length;

    const ongoing = foreshadowings.filter(
      (fs) => fs.status === ForeshadowingStatus.ONGOING
    ).length;

    const unrevealed = foreshadowings.filter(
      (fs) => fs.status === ForeshadowingStatus.UNREVEALED
    ).length;

    const withConflicts = foreshadowings.filter(
      (fs) => fs.hasConflicts
    ).length;

    const totalImportanceScore = Array.from(state.analyses.values()).reduce(
      (sum, analysis) => sum + analysis.importanceScore,
      0
    );

    const avgImportanceScore =
      state.analyses.size > 0 ? totalImportanceScore / state.analyses.size : 0;

    return {
      total: foreshadowings.length,
      byStatus,
      byType,
      byPriority: byPriority as any,
      resolved,
      ongoing,
      unrevealed,
      withConflicts,
      avgImportanceScore,
      totalRelationships: state.relationships.length,
      totalConflicts: state.conflicts.length,
    };
  },

  // Selection
  setSelectedForeshadowingId: (id) => {
    set({ selectedForeshadowingId: id });
  },

  getSelectedForeshadowing: () => {
    const state = get();
    return state.selectedForeshadowingId
      ? state.getForeshadowingById(state.selectedForeshadowingId)
      : undefined;
  },

  // Filter
  setFilter: (filter) => {
    set((state) => ({
      filter: { ...state.filter, ...filter },
    }));
  },

  clearFilter: () => {
    set({ filter: {} });
  },

  // Utility
  searchForeshadowings: (query) => {
    const state = get();
    const lowerQuery = query.toLowerCase();
    return state.foreshadowings.filter(
      (fs) =>
        fs.title.toLowerCase().includes(lowerQuery) ||
        fs.description.toLowerCase().includes(lowerQuery) ||
        fs.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  },

  getForeshadowingsByType: (type) => {
    return get().foreshadowings.filter((fs) => fs.type === type);
  },

  getForeshadowingsByStatus: (status) => {
    return get().foreshadowings.filter((fs) => fs.status === status);
  },

  getForeshadowingsByChapter: (chapterId) => {
    return get().foreshadowings.filter((fs) =>
      fs.relatedChapters.includes(chapterId)
    );
  },

  getForeshadowingsByCharacter: (characterId) => {
    return get().foreshadowings.filter((fs) =>
      fs.relatedCharacters.includes(characterId)
    );
  },

  // Network Analysis
  analyzeAllRelationships: () => {
    const { ForeshadowingAnalyzer } = require('@/services/foreshadowingAnalyzer');
    const state = get();

    const detectedRelationships = ForeshadowingAnalyzer.analyzeRelationships(
      state.foreshadowings
    );

    set((state) => ({
      relationships: detectedRelationships,
    }));
  },

  getNetworkAnalysis: () => {
    const { ForeshadowingAnalyzer } = require('@/services/foreshadowingAnalyzer');
    const state = get();

    const networkAnalysis = ForeshadowingAnalyzer.analyzeNetwork(
      state.foreshadowings,
      state.relationships
    );

    const density = ForeshadowingAnalyzer.calculateNetworkDensity(
      state.foreshadowings.length,
      state.relationships.length
    );

    return {
      ...networkAnalysis,
      density,
    };
  },

  getInfluenceSpread: (foreshadowingId, maxDepth = 3) => {
    const { ForeshadowingAnalyzer } = require('@/services/foreshadowingAnalyzer');
    const state = get();

    return ForeshadowingAnalyzer.analyzeInfluenceSpread(
      foreshadowingId,
      state.relationships,
      maxDepth
    );
  },

  findShortestPath: (startId, endId) => {
    const { ForeshadowingAnalyzer } = require('@/services/foreshadowingAnalyzer');
    const state = get();

    return ForeshadowingAnalyzer.findShortestPath(
      startId,
      endId,
      state.relationships
    );
  },
});

// Helper functions
function calculateImportanceScore(
  foreshadowing: Foreshadowing,
  relationshipCount: number
): number {
  let score = 0;

  // Priority impact (40%)
  const priorityScores = { critical: 40, high: 30, medium: 20, low: 10 };
  score += priorityScores[foreshadowing.priority] || 20;

  // Impact impact (30%)
  const impactScores = { extreme: 30, high: 25, medium: 15, low: 5 };
  score += impactScores[foreshadowing.impact] || 15;

  // Relationship impact (20%)
  score += Math.min(relationshipCount * 2, 20);

  // Type impact (10%)
  const typeScores = {
    suspense: 10,
    prophecy: 9,
    setup: 8,
    foreshadowing: 7,
    twist: 8,
    hint: 5,
    payoff: 6,
    red_herring: 4,
  };
  score += typeScores[foreshadowing.type] || 5;

  return Math.min(score, 100);
}

function calculateImpactScore(foreshadowing: Foreshadowing): number {
  let score = 0;

  // Based on priority
  const priorityScores = { critical: 40, high: 30, medium: 20, low: 10 };
  score += priorityScores[foreshadowing.priority] || 20;

  // Based on impact level
  const impactScores = { extreme: 40, high: 30, medium: 20, low: 10 };
  score += impactScores[foreshadowing.impact] || 20;

  // Based on related entities
  score += Math.min(foreshadowing.relatedCharacters.length * 5, 20);
  score += Math.min(foreshadowing.relatedEvents.length * 3, 10);
  score += Math.min(foreshadowing.relatedChapters.length * 2, 10);

  return Math.min(score, 100);
}

function calculateComplexityScore(
  foreshadowing: Foreshadowing,
  relationshipCount: number
): number {
  let score = 0;

  // Relationships (40%)
  score += Math.min(relationshipCount * 10, 40);

  // Related entities (30%)
  score += Math.min(
    foreshadowing.relatedCharacters.length * 5 +
      foreshadowing.relatedEvents.length * 3 +
      foreshadowing.relatedChapters.length * 2,
    30
  );

  // Tags (20%)
  score += Math.min(foreshadowing.tags.length * 4, 20);

  // Description length (10%)
  score += Math.min(foreshadowing.description.length / 50, 10);

  return Math.min(score, 100);
}
