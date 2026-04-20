/**
 * 重构后的主 Store 文件
 *
 * 特点：
 * - 模块化设计：按功能域拆分为多个 slice
 * - 性能优化：使用 selector 模式避免过度渲染
 * - 类型安全：完整的 TypeScript 类型支持
 * - 开发体验：集成 devtools 和持久化
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

// Slices
import { createProjectSlice, ProjectSlice } from './slices/projectSlice';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createSyncSlice, SyncSlice } from './slices/syncSlice';
import { createGraphSlice, GraphSlice } from './slices/graphSlice';
import { createBatchSlice, BatchSlice } from './slices/batchSlice';
import { createConfigSlice, ConfigSlice } from './slices/configSlice';
import { createForeshadowingSlice, ForeshadowingSlice } from './slices/foreshadowingSlice';

// Types
import { ProjectState, AppSection } from '../types';
import { INITIAL_PROJECT } from './initialState';

// ============================================================
// Store 类型定义
// ============================================================

export type ProjectStore = ProjectSlice & UISlice & SyncSlice & GraphSlice & BatchSlice & ConfigSlice & ForeshadowingSlice & {
  // 兼容旧版本的一些直接访问
  isLoading: boolean;
  activeSection: AppSection;
};

// ============================================================
// Store 创建
// ============================================================

export const useProjectStore = create<ProjectStore>()(
  devtools(
    persist(
      (...a) => ({
        // 组合所有 slices
        ...createProjectSlice(...a),
        ...createUISlice(...a),
        ...createSyncSlice(...a),
        ...createGraphSlice(...a),
        ...createBatchSlice(...a),
        ...createConfigSlice(...a),
        ...createForeshadowingSlice(...a),
      }),
      {
        name: 'muse-project-storage',
        // 只持久化关键数据
        partialize: (state) => ({
          project: state.project,
          savedProjects: state.savedProjects,
          globalConfig: state.globalConfig,
          foreshadowings: state.foreshadowings,
          relationships: state.relationships,
          conflicts: state.conflicts,
        }),
      }
    ),
    {
      name: 'MuseProjectStore',
      enabled: process.env.NODE_ENV === 'development',
      // 只在开发环境启用详细日志
      trace: process.env.NODE_ENV === 'development',
    }
  )
);

// ============================================================
// 便捷的 Hook 导出
// ============================================================

/**
 * 项目数据相关 hooks
 */
export const useProject = () => useProjectStore((state) => state.project);
export const useProjectInfo = () => useProjectStore((state) => ({
  id: state.project.id,
  title: state.project.title,
  genre: state.project.genre,
  lastModified: state.project.lastModified,
}));

/**
 * UI 状态相关 hooks
 */
export const useActiveSection = () => useProjectStore((state) => state.activeSection);
export const useIsLoading = () => useProjectStore((state) => state.isLoading);

/**
 * 同步状态相关 hooks
 */
export const useSyncStatus = () => useProjectStore((state) => ({
  useBackend: state.useBackend,
  isSaving: state.isSaving,
  lastError: state.lastError,
}));

/**
 * 操作相关 hooks
 */
export const useProjectActions = () => useProjectStore((state) => ({
  updateProject: state.updateProject,
  setProject: state.setProject,
  createProject: state.createProject,
  switchProject: state.switchProject,
  deleteProject: state.deleteProject,
}));

export const useUIActions = () => useProjectStore((state) => ({
  setActiveSection: state.setActiveSection,
  setShowSettings: state.setShowSettings,
  setShowPromptTuner: state.setShowPromptTuner,
  setShowGuide: state.setShowGuide,
  setIsLoading: state.setIsLoading,
}));

/**
 * 伏笔追踪相关 hooks
 */
export const useForeshadowings = () => useProjectStore((state) => state.foreshadowings);
export const useForeshadowingStats = () => useProjectStore((state) => state.getStatistics());
export const useSelectedForeshadowing = () => useProjectStore((state) => state.getSelectedForeshadowing());
export const useForeshadowingActions = () => useProjectStore((state) => ({
  addForeshadowing: state.addForeshadowing,
  updateForeshadowing: state.updateForeshadowing,
  deleteForeshadowing: state.deleteForeshadowing,
  setSelectedForeshadowingId: state.setSelectedForeshadowingId,
  addRelationship: state.addRelationship,
  removeRelationship: state.removeRelationship,
  detectConflicts: state.detectConflicts,
  resolveConflict: state.resolveConflict,
  analyzeForeshadowing: state.analyzeForeshadowing,
  batchAnalyze: state.batchAnalyze,
  setFilter: state.setFilter,
  clearFilter: state.clearFilter,
}));

// ============================================================
// 向后兼容的导出
// ============================================================

export { INITIAL_PROJECT };
export type { ProjectState, AppSection };

// 重新导出所有 selectors
export * from './selectors';

// 重新导出 slices 类型
export type { ProjectSlice } from './slices/projectSlice';
export type { UISlice } from './slices/uiSlice';
export type { SyncSlice } from './slices/syncSlice';
export type { GraphSlice, GraphQueryState } from './slices/graphSlice';
export type { BatchSlice } from './slices/batchSlice';
export type { ConfigSlice } from './slices/configSlice';
export type { ForeshadowingSlice } from './slices/foreshadowingSlice';

// 重新导出工具函数
export { deepMerge, shallowMerge, safeDeepMerge } from './utils/deepMerge';
