/**
 * Store Selectors
 *
 * 优化的选择器集合，用于精确订阅Store状态
 * 避免不必要的重渲染，提升性能
 */

import { ProjectStore } from './index';
import { AppSection } from '../types';

// ============================================================
// 项目相关 Selectors
// ============================================================

export const selectProject = (state: ProjectStore) => state.project;
export const selectProjectId = (state: ProjectStore) => state.project.id;
export const selectProjectTitle = (state: ProjectStore) => state.project.title;
export const selectProjectGenre = (state: ProjectStore) => state.project.genre;
export const selectProjectPremise = (state: ProjectStore) => state.project.premise;
export const selectProjectCharacters = (state: ProjectStore) => state.project.characters;
export const selectProjectWorldSettings = (state: ProjectStore) => state.project.worldSettings;
export const selectProjectPlotNodes = (state: ProjectStore) => state.project.plotNodes;
export const selectProjectEchoes = (state: ProjectStore) => state.project.echoes;
export const selectProjectChapters = (state: ProjectStore) => state.project.chapters;
export const selectProjectTimeline = (state: ProjectStore) => state.project.timeline;

export const selectCreativeSettings = (state: ProjectStore) => state.project.creativeSettings;
export const selectWorldGenConfig = (state: ProjectStore) => state.project.worldGenConfig;

// 组合 selector - 项目基本信息
export const selectProjectInfo = (state: ProjectStore) => ({
  id: state.project.id,
  title: state.project.title,
  genre: state.project.genre,
  lastModified: state.project.lastModified,
});

// ============================================================
// UI 相关 Selectors
// ============================================================

export const selectActiveSection = (state: ProjectStore) => state.activeSection;
export const selectActivePlotNodeId = (state: ProjectStore) => state.activePlotNodeId;
export const selectActiveChapterId = (state: ProjectStore) => state.activeChapterId;
export const selectIsLoading = (state: ProjectStore) => state.isLoading;
export const selectShowGuide = (state: ProjectStore) => state.showGuide;
export const selectShowSettings = (state: ProjectStore) => state.showSettings;
export const selectShowPromptTuner = (state: ProjectStore) => state.showPromptTuner;
export const selectShowProjectList = (state: ProjectStore) => state.showProjectList;

// 组合 selector - UI 状态
export const selectUIState = (state: ProjectStore) => ({
  activeSection: state.activeSection,
  isLoading: state.isLoading,
  showGuide: state.showGuide,
  showSettings: state.showSettings,
});

// ============================================================
// 同步相关 Selectors
// ============================================================

export const selectUseBackend = (state: ProjectStore) => state.useBackend;
export const selectIsSaving = (state: ProjectStore) => state.isSaving;
export const selectLastError = (state: ProjectStore) => state.lastError;

// 组合 selector - 同步状态
export const selectSyncStatus = (state: ProjectStore) => ({
  useBackend: state.useBackend,
  isSaving: state.isSaving,
  lastError: state.lastError,
});

// ============================================================
// 图谱相关 Selectors
// ============================================================

export const selectGraphQuery = (state: ProjectStore) => state.graphQuery;

// 角色图谱相关
export const selectCharacterTraits = (characterId: string) => (state: ProjectStore) =>
  state.graphQuery.characterTraits.get(characterId);

export const selectCharacterEvolution = (characterId: string) => (state: ProjectStore) =>
  state.graphQuery.characterEvolution.get(characterId);

export const selectCharacterForeshadowing = (characterId: string) => (state: ProjectStore) =>
  state.graphQuery.characterForeshadowing.get(characterId);

export const selectLoadingTraits = (state: ProjectStore) => state.graphQuery.loadingTraits;
export const selectLoadingEvolution = (state: ProjectStore) => state.graphQuery.loadingEvolution;
export const selectLoadingForeshadowing = (state: ProjectStore) => state.graphQuery.loadingForeshadowing;

// ============================================================
// 批量操作相关 Selectors
// ============================================================

export const selectBatchOperationHistory = (state: ProjectStore) => state.batchOperationHistory;
export const selectLastBatchOperationId = (state: ProjectStore) => state.lastBatchOperationId;
export const selectIsBatchProcessing = (state: ProjectStore) => state.isBatchProcessing;

// ============================================================
// 配置相关 Selectors
// ============================================================

export const selectGlobalConfig = (state: ProjectStore) => state.globalConfig;
export const selectAIProvider = (state: ProjectStore) => state.globalConfig.ai.provider;
export const selectAIModel = (state: ProjectStore) => state.globalConfig.ai.model;
export const selectCacheEnabled = (state: ProjectStore) => state.globalConfig.performance.cache.enabled;

// ============================================================
// 操作相关 Selectors
// ============================================================

export const selectUpdateProject = (state: ProjectStore) => state.updateProject;
export const selectSetProject = (state: ProjectStore) => state.setProject;
export const selectSetActiveSection = (state: ProjectStore) => state.setActiveSection;
export const selectSetShowSettings = (state: ProjectStore) => state.setShowSettings;
export const selectSetShowPromptTuner = (state: ProjectStore) => state.setShowPromptTuner;
export const selectSetShowGuide = (state: ProjectStore) => state.setShowGuide;

// ============================================================
// 工具函数 Selectors
// ============================================================

/**
 * 创建特定Section的检查器
 */
export const createSectionChecker = (section: AppSection) => (state: ProjectStore) =>
  state.activeSection === section;

/**
 * 创建特定角色的图谱数据选择器
 */
export const createCharacterGraphSelector = (characterId: string) => (state: ProjectStore) => ({
  traits: state.graphQuery.characterTraits.get(characterId),
  evolution: state.graphQuery.characterEvolution.get(characterId),
  foreshadowing: state.graphQuery.characterForeshadowing.get(characterId),
  isLoading:
    state.graphQuery.loadingTraits.has(characterId) ||
    state.graphQuery.loadingEvolution.has(characterId) ||
    state.graphQuery.loadingForeshadowing.has(characterId),
});

/**
 * 创建项目统计选择器
 */
export const selectProjectStats = (state: ProjectStore) => ({
  characterCount: state.project.characters.length,
  worldSettingCount: state.project.worldSettings.length,
  plotNodeCount: state.project.plotNodes.length,
  echoCount: state.project.echoes.length,
  chapterCount: state.project.chapters.length,
});
