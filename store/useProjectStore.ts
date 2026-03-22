/**
 * Zustand Project Store
 * 
 * Centralized state management for the entire Muse application.
 * Replaces the giant useState tree in App.tsx with a sliced, performant store.
 * 
 * Components can selectively subscribe to only the slices they need,
 * preventing unnecessary re-renders when unrelated state changes.
 */

import { create } from 'zustand';
import { AppSection, ProjectState, WorldGenConfig, DeepPartial } from '../types';
import {
    isBackendAvailable, fetchProjectList, fetchProject, syncProject, patchProject,
    deleteProjectApi, fetchChapter, fetchChaptersContent,
    // Character Graph APIs
    fetchCharacterTraits, fetchCharacterEvolution, fetchCharacterForeshadowing,
    // Echo Graph APIs
    fetchRelationshipTimeline, fetchEchoForeshadowing, detectContradictions,
    // Outliner Graph APIs
    fetchChapterDependencies, fetchChapterCharacterNetwork, fetchConflictHeatmap,
    // Forge Graph APIs
    fetchForgeContext, syncForgeResult, ForgeGraphContext,
    // Echo Batch Operations APIs
    batchAcceptEchoes, batchRejectEchoes, undoBatchOperation, getBatchOperationHistory,
    BatchOperationHistoryItem
} from '../services/apiService';
import { storageService, STORAGE_KEYS } from '../services/storageService';
import { DEFAULT_CONFIG, getGlobalConfig } from '../config/global';

// ============================================================
// Utility Functions
// ============================================================

/**
 * 深度合并两个对象
 */
function deepMerge<T>(target: T, source: DeepPartial<T>): T {
    const result = { ...target };
    
    for (const key in source) {
        if (source[key] !== undefined) {
            if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
                result[key] = deepMerge(result[key], source[key] as any);
            } else {
                result[key] = source[key] as any;
            }
        }
    }
    
    return result;
}

// ============================================================
// Default State
// ============================================================

export const INITIAL_PROJECT: ProjectState = {
    id: 'default-project',
    lastModified: Date.now(),
    title: '',
    genre: '',
    premise: '',
    creativeSettings: {
        tone: '平衡 (Balanced)',
        style: '通俗易懂 (Standard)',
        creativity: 0.8,
        targetAudience: '成人 (Adult)',
        promptProfile: 'WEB_NOVEL',
    },
    worldGenConfig: {
        detailLevel: 'Standard',
        focus: 'Balanced',
    },
    characters: [],
    worldSettings: [],
    plotOutline: '',
    plotHistory: [],
    drafts: [],
    chapters: [],
    customPrompts: {},
    plotNodes: [],
    echoes: [],
    timeline: [],
    currentWorldDate: '元年',
};

// ============================================================
// Store Interface
// ============================================================

// 图谱查询结果类型定义
interface GraphQueryState {
    // 角色图谱
    characterTraits: Map<string, any>; // characterId -> traits
    characterEvolution: Map<string, any[]>; // characterId -> evolution history
    characterForeshadowing: Map<string, any[]>; // characterId -> foreshadowing

    // 加载状态
    loadingTraits: Set<string>; // 正在加载的角色ID
    loadingEvolution: Set<string>;
    loadingForeshadowing: Set<string>;
}

interface ProjectStore {
    // --- Project State ---
    project: ProjectState;
    savedProjects: ProjectState[];
    updateProject: (data: Partial<ProjectState>) => void;
    setProject: (project: ProjectState) => void;
    setSavedProjects: (projects: ProjectState[]) => void;

    // --- UI State ---
    activeSection: AppSection;
    setActiveSection: (section: AppSection) => void;
    activePlotNodeId: string | null;
    setActivePlotNodeId: (id: string | null) => void;
    activeChapterId: string | null;
    setActiveChapterId: (id: string | null) => void;
    showGuide: boolean;
    setShowGuide: (show: boolean) => void;
    showSettings: boolean;
    setShowSettings: (show: boolean) => void;
    showPromptTuner: boolean;
    setShowPromptTuner: (show: boolean) => void;
    showProjectList: boolean;
    setShowProjectList: (show: boolean) => void;

    // --- Sync State ---
    useBackend: boolean;
    setUseBackend: (use: boolean) => void;
    isSaving: boolean;
    setIsSaving: (saving: boolean) => void;
    isLoading: boolean;
    setIsLoading: (loading: boolean) => void;
    lastError: string | null;
    setLastError: (error: string | null) => void;

    // --- Internal Sync State (for devtools tracking) ---
    _internal: {
        saveTimer: number | null;  // setTimeout 返回值在浏览器中是 number
        pendingPatch: Partial<ProjectState>;
    };

    // --- Echo Batch Operations State ---
    batchOperationHistory: BatchOperationHistoryItem[];
    lastBatchOperationId: string | null;
    isBatchProcessing: boolean;

    // --- Graph Query State ---
    graphQuery: GraphQueryState;
    fetchCharacterTraits: (characterId: string) => Promise<void>;
    fetchCharacterEvolution: (characterId: string) => Promise<void>;
    fetchCharacterForeshadowing: (characterId: string) => Promise<void>;
    clearCharacterGraphData: (characterId: string) => void;

    // --- Batch Operations Actions ---
    batchAcceptEchoes: (echoIds: string[], syncToGraph?: boolean) => Promise<void>;
    batchRejectEchoes: (echoIds: string[]) => Promise<void>;
    undoLastBatchOperation: (operationId?: string) => Promise<void>;
    loadBatchOperationHistory: () => Promise<void>;

    // --- Global Config State ---
    globalConfig: typeof DEFAULT_CONFIG;
    loadGlobalConfig: () => Promise<void>;
    updateGlobalConfig: (updates: DeepPartial<typeof DEFAULT_CONFIG>) => Promise<void>;

    // --- Actions ---
    initialize: () => Promise<void>;
    createProject: () => Promise<void>;
    switchProject: (id: string) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    saveToPersistentStorage: () => Promise<void>;
    syncToBackend: () => void;
    loadFromPersistentStorage: () => Promise<void>;
    fetchChapterContent: (chapterId: string) => Promise<void>;
    fetchAllChaptersContent: () => Promise<void>;
    updateChapterSummary: (chapterId: string, summary: string) => Promise<void>;
    forceSync: () => Promise<void>;
}

// ============================================================
// Store Implementation
// ============================================================

export const useProjectStore = create<ProjectStore>((set, get) => ({
    // --- Project State ---
    project: INITIAL_PROJECT,
    savedProjects: [],

    // --- Global Config State ---
    globalConfig: DEFAULT_CONFIG,

    // --- Error State ---
    lastError: null,
    setLastError: (error) => set({ lastError: error }),

    // --- Internal Sync State ---
    _internal: {
        saveTimer: null,
        pendingPatch: {},
    },

    // --- Echo Batch Operations State ---
    batchOperationHistory: [],
    lastBatchOperationId: null,
    isBatchProcessing: false,

    // --- Graph Query State ---
    graphQuery: {
        characterTraits: new Map(),
        characterEvolution: new Map(),
        characterForeshadowing: new Map(),
        loadingTraits: new Set(),
        loadingEvolution: new Set(),
        loadingForeshadowing: new Set(),
    },

    updateProject: (data) => {
        set((state) => ({
            project: { ...state.project, ...data },
            _internal: {
                ...state._internal,
                pendingPatch: { ...state._internal.pendingPatch, ...data },
            },
        }));

        // Trigger auto-save
        const store = get();
        if (!store.isLoading) {
            store.saveToPersistentStorage();
            store.syncToBackend();
        }
    },

    setProject: (project) => set({ project }),
    setSavedProjects: (projects) => set({ savedProjects: projects }),

    // --- UI State ---
    activeSection: AppSection.LOBBY,
    setActiveSection: (section) => set({ activeSection: section }),
    showGuide: false,
    setShowGuide: (show) => set({ showGuide: show }),
    showSettings: false,
    setShowSettings: (show) => set({ showSettings: show }),
    showPromptTuner: false,
    setShowPromptTuner: (show) => set({ showPromptTuner: show }),
    showProjectList: false,
    setShowProjectList: (show) => set({ showProjectList: show }),

    activePlotNodeId: null,
    setActivePlotNodeId: (id) => set({ activePlotNodeId: id }),

    activeChapterId: null,
    setActiveChapterId: (id) => set({ activeChapterId: id }),

    // --- Sync State ---
    useBackend: false,
    setUseBackend: (use) => set({ useBackend: use }),
    isSaving: false,
    setIsSaving: (saving) => set({ isSaving: saving }),
    isLoading: true,
    setIsLoading: (loading) => set({ isLoading: loading }),

    // --- Actions ---
    initialize: async () => {
        set({ isLoading: true });
        
        // 检查全局配置是否启用了后端同步
        const config = await getGlobalConfig();
        const backendSyncEnabled = config.storage.backendSync.enabled;
        
        // 只有在全局配置启用且后端可用时才使用后端
        const backendOk = backendSyncEnabled && await isBackendAvailable();
        set({ useBackend: backendOk });

        // Try to migrate from localStorage if needed
        const migrated = await storageService.migrateFromLocalStorage(STORAGE_KEYS.PROJECTS);
        const localProjects = await storageService.getItem<ProjectState[]>(STORAGE_KEYS.PROJECTS) || [];

        if (backendOk) {
            console.log('🚀 Backend connected! Comparing versions...');
            try {
                const list = await fetchProjectList();
                if (list.length > 0) {
                    const sorted = list.sort((a, b) => b.lastModified - a.lastModified);
                    const mostRecentRemote = sorted[0];
                    const localVersion = localProjects.find(p => p.id === mostRecentRemote.id);

                    let projectToLoad: ProjectState;
                    if (localVersion && localVersion.lastModified > mostRecentRemote.lastModified) {
                        console.log('💡 Local version is newer than MySQL. Using local and syncing back...');
                        projectToLoad = { ...INITIAL_PROJECT, ...localVersion };
                        setTimeout(() => get().syncToBackend(), 1000);
                    } else {
                        console.log('☁️ Loading project from MySQL...');
                        const fullProject = await fetchProject(mostRecentRemote.id);
                        const mergedChapters = (fullProject.chapters || []).map((remoteCh: any) => {
                            const localCh = localVersion?.chapters?.find(c => c.id === remoteCh.id);
                            const content = (remoteCh.content === "" && localCh && localCh.content !== "")
                                ? localCh.content : remoteCh.content;
                            const beats = (!remoteCh.beats || remoteCh.beats.length === 0) && localCh?.beats
                                ? localCh.beats : remoteCh.beats;
                            return { ...remoteCh, content, beats };
                        });

                        projectToLoad = { ...INITIAL_PROJECT, ...fullProject, chapters: mergedChapters };
                    }

                    set({
                        project: projectToLoad,
                        activeSection: AppSection.LOBBY,
                        savedProjects: list.map(s => ({
                            ...INITIAL_PROJECT, id: s.id, title: s.title, genre: s.genre, lastModified: s.lastModified,
                        } as ProjectState)),
                        isLoading: false
                    });
                } else {
                    if (localProjects.length > 0) {
                        console.log('📦 Migrating local projects to MySQL...');
                        for (const proj of localProjects) { await syncProject(proj); }
                        const mostRecent = localProjects.sort((a, b) => b.lastModified - a.lastModified)[0];
                        set({
                            project: { ...INITIAL_PROJECT, ...mostRecent },
                            activeSection: AppSection.LOBBY,
                            savedProjects: localProjects,
                            isLoading: false,
                        });
                    } else {
                        const newProj = { ...INITIAL_PROJECT, id: Date.now().toString() };
                        await syncProject(newProj);
                        set({ project: newProj, savedProjects: [newProj], isLoading: false });
                    }
                }
            } catch (err) {
                console.warn('Backend load failed, falling back to local storage', err);
                set({ useBackend: false });
                await get().loadFromPersistentStorage();
            }
        } else {
            console.log('💾 Backend unavailable, using local IndexedDB');
            await get().loadFromPersistentStorage();
        }

        // Cleanup legacy localStorage after successful load/migration
        storageService.removeLegacyItem(STORAGE_KEYS.PROJECTS);
        set({ isLoading: false });
    },

    createProject: async () => {
        const store = get();
        const newProject: ProjectState = {
            ...INITIAL_PROJECT,
            id: Date.now().toString(),
            lastModified: Date.now(),
        };

        if (store.useBackend) {
            try { 
                await syncProject(newProject); 
            } catch (e) { 
                console.warn('Failed to sync new project', e);
                store.setLastError('数据同步失败：新创建的项目已保存到本地，但未能同步到服务器');
            }
        }

        set((state) => ({
            project: newProject,
            savedProjects: [...state.savedProjects, newProject],
            showProjectList: false,
        }));
        await get().saveToPersistentStorage();
    },

    switchProject: async (id) => {
        const store = get();
        set({ isLoading: true });

        if (store.useBackend) {
            try {
                const fullProject = await fetchProject(id);
                set({ project: { ...INITIAL_PROJECT, ...fullProject }, showProjectList: false, isLoading: false });
                return;
            } catch (e) {
                console.warn('Failed to fetch from backend, falling back to local', e);
                store.setLastError('从服务器加载项目失败，已回退到本地版本');
            }
        }

        const localProject = store.savedProjects.find(p => p.id === id);
        if (localProject) {
            set({ project: { ...INITIAL_PROJECT, ...localProject }, showProjectList: false });
        }
        set({ isLoading: false });
    },

    deleteProject: async (id) => {
        const store = get();
        if (store.savedProjects.length <= 1) {
            alert('至少需要保留一个项目！');
            return;
        }

        if (store.useBackend) {
            try { 
                await deleteProjectApi(id); 
            } catch (e) { 
                console.warn('Failed to delete from backend', e);
                store.setLastError('删除项目失败：已从本地删除，但未能同步到服务器');
            }
        }

        const state = get();
        const newList = state.savedProjects.filter(p => p.id !== id);
        const needsSwitch = state.project.id === id;
        await storageService.setItem(STORAGE_KEYS.PROJECTS, newList);
        set({
            savedProjects: newList,
            project: needsSwitch ? { ...INITIAL_PROJECT, ...newList[0] } : state.project,
        });
    },

    saveToPersistentStorage: async () => {
        const { project, savedProjects } = get();
        const updatedProject = { ...project, lastModified: Date.now() };
        const index = savedProjects.findIndex(p => p.id === project.id);
        let newList: ProjectState[];
        if (index >= 0) {
            newList = [...savedProjects];
            newList[index] = updatedProject;
        } else {
            newList = [...savedProjects, updatedProject];
        }
        await storageService.setItem(STORAGE_KEYS.PROJECTS, newList);
        set({ savedProjects: newList });
    },

    syncToBackend: async () => {
        const { useBackend, project, _internal } = get();
        if (!useBackend) return;

        if (_internal.saveTimer) clearTimeout(_internal.saveTimer);
        set({ isSaving: true });

        // 使用全局配置的同步间隔
        const config = await getGlobalConfig();
        const syncInterval = config.storage.autoSaveInterval;

        const timerId = setTimeout(async () => {
            try {
                const currentState = get();
                const { project, _internal } = currentState;
                const id = project.id;
                const complexFields = ['characters', 'worldSettings', 'plotHistory', 'drafts', 'chapters', 'plotNodes', 'echoes', 'timeline'];
                const hasComplexChanges = Object.keys(_internal.pendingPatch).some(key => complexFields.includes(key));

                if (hasComplexChanges) {
                    console.log('☁️ Full Sync (PUT) to backend:', id);
                    await syncProject({ ...project, lastModified: Date.now() });
                } else if (Object.keys(_internal.pendingPatch).length > 0) {
                    console.log('☁️ Incremental Sync (PATCH) to backend:', id, Object.keys(_internal.pendingPatch));
                    await patchProject(id, { ..._internal.pendingPatch, lastModified: Date.now() });
                }

                set((state) => ({
                    _internal: {
                        ...state._internal,
                        pendingPatch: {},
                    },
                    isSaving: false,
                }));
            } catch (err) {
                console.warn('Backend sync failed:', err);
                set({
                    isSaving: false,
                    lastError: '数据同步失败：已保存到本地，将在下次连接时重试'
                });
            }
        }, syncInterval) as unknown as number;

        set((state) => ({
            _internal: {
                ...state._internal,
                saveTimer: timerId,
            },
        }));
    },

    loadFromPersistentStorage: async () => {
        const parsed = await storageService.getItem<ProjectState[]>(STORAGE_KEYS.PROJECTS);
        if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            const mostRecent = parsed.sort((a, b) => b.lastModified - a.lastModified)[0];
            set({
                savedProjects: parsed,
                project: { ...INITIAL_PROJECT, ...mostRecent },
                activeSection: AppSection.LOBBY,
            });
            return;
        }
        const newProj = { ...INITIAL_PROJECT, id: Date.now().toString() };
        set({ project: newProj, savedProjects: [newProj] });
    },

    fetchChapterContent: async (chapterId) => {
        const { project, useBackend } = get();
        const chapter = project.chapters.find(c => c.id === chapterId);
        if (chapter && chapter.content && chapter.content.trim() !== "") return;
        if (!useBackend) return;

        set({ isLoading: true });
        try {
            const fullChapter = await fetchChapter(project.id, chapterId);
            if (fullChapter && fullChapter.content !== undefined) {
                set((state) => ({
                    project: {
                        ...state.project,
                        chapters: state.project.chapters.map(c =>
                            c.id === chapterId ? { ...c, content: fullChapter.content } : c
                        )
                    }
                }));
            }
        } catch (err) {
            console.error('Failed to fetch chapter content:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    fetchAllChaptersContent: async () => {
        const { project, useBackend } = get();
        if (!useBackend) return;

        set({ isLoading: true });
        try {
            const contents = await fetchChaptersContent(project.id);
            if (contents && contents.length > 0) {
                // Map the fetched contents back to the project chapters
                const contentMap = new Map(contents.map(i => [i.id, i.content]));

                set((state) => ({
                    project: {
                        ...state.project,
                        chapters: state.project.chapters.map(c => ({
                            ...c,
                            content: contentMap.get(c.id) ?? c.content
                        }))
                    }
                }));
            }
        } catch (err) {
            console.error('Failed to fetch bulk chapters content:', err);
        } finally {
            set({ isLoading: false });
        }
    },

    updateChapterSummary: async (chapterId, summary) => {
        const { project } = get();
        const updatedChapters = project.chapters.map(c =>
            c.id === chapterId ? { ...c, summary, lastModified: Date.now() } : c
        );

        set((state) => ({
            project: { ...state.project, chapters: updatedChapters },
            _internal: {
                ...state._internal,
                pendingPatch: { ...state._internal.pendingPatch, chapters: updatedChapters },
            },
        }));

        const store = get();
        if (!store.isLoading) {
            store.saveToPersistentStorage();
            store.syncToBackend();
        }
    },

    forceSync: async () => {
        const { syncToBackend, saveToPersistentStorage } = get();
        await saveToPersistentStorage();
        syncToBackend();
    },

    // 更新全局配置
    loadGlobalConfig: async () => {
        try {
            const savedConfig = await storageService.getItem<typeof DEFAULT_CONFIG>(STORAGE_KEYS.GLOBAL_CONFIG);
            if (savedConfig) {
                set({ globalConfig: deepMerge(DEFAULT_CONFIG, savedConfig) });
            }
        } catch (err) {
            console.error('Failed to load global config:', err);
        }
    },

    updateGlobalConfig: async (updates: DeepPartial<typeof DEFAULT_CONFIG>) => {
        const currentConfig = get().globalConfig;
        const newConfig = deepMerge(currentConfig, updates);

        // 更新store状态
        set({ globalConfig: newConfig });

        // 清除core.ts中的配置缓存
        const { clearConfigCache } = await import('../services/gemini/core');
        clearConfigCache();

        // 如果缓存配置改变，清除缓存管理器中的缓存
        if (updates.performance?.cache?.enabled === false ||
            (updates.performance?.cache?.ttl && updates.performance.cache.ttl !== currentConfig.performance.cache.ttl)) {
            const { cacheManager } = await import('../services/cacheManager');
            cacheManager.clear();
        }

        // 保存到storage
        await storageService.setItem(STORAGE_KEYS.GLOBAL_CONFIG, newConfig);
    },

    // --- Graph Query Methods ---

    fetchCharacterTraits: async (characterId: string) => {
        const { project, useBackend, graphQuery } = get();
        if (!useBackend) return;

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
            const traits = await fetchCharacterTraits(project.id, characterId);
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

    fetchCharacterEvolution: async (characterId: string) => {
        const { project, useBackend, graphQuery } = get();
        if (!useBackend) return;

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
            const evolution = await fetchCharacterEvolution(project.id, characterId);
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

    fetchCharacterForeshadowing: async (characterId: string) => {
        const { project, useBackend, graphQuery } = get();
        if (!useBackend) return;

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
            const foreshadowing = await fetchCharacterForeshadowing(project.id, characterId);
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

    // --- Echo Batch Operations ---

    batchAcceptEchoes: async (echoIds: string[], syncToGraph: boolean = true) => {
        const { project, useBackend } = get();

        if (!useBackend) {
            // Fallback to local update
            const updatedEchoes = project.echoes.map(e =>
                echoIds.includes(e.id) ? { ...e, status: 'ACCEPTED' as const } : e
            );
            get().updateProject({ echoes: updatedEchoes });
            return;
        }

        try {
            const result = await batchAcceptEchoes(project.id, echoIds, syncToGraph);

            // 更新本地状态
            const updatedEchoes = project.echoes.map(e =>
                echoIds.includes(e.id) ? { ...e, status: 'ACCEPTED' as const } : e
            );
            get().updateProject({ echoes: updatedEchoes });

            // 更新批量操作历史
            const historyItem: BatchOperationHistoryItem = {
                id: result.operationId,
                operation: 'BATCH_ACCEPT',
                echoCount: result.affectedCount,
                timestamp: Date.now(),
                canUndo: true
            };

            set((state: any) => ({
                batchOperationHistory: [historyItem, ...state.batchOperationHistory]
            }));
        } catch (err) {
            console.error('Failed to batch accept echoes:', err);
            // 回退到本地更新
            const updatedEchoes = project.echoes.map(e =>
                echoIds.includes(e.id) ? { ...e, status: 'ACCEPTED' as const } : e
            );
            get().updateProject({ echoes: updatedEchoes });
        }
    },

    batchRejectEchoes: async (echoIds: string[]) => {
        const { project, useBackend } = get();

        if (!useBackend) {
            // Fallback to local update
            const updatedEchoes = project.echoes.map(e =>
                echoIds.includes(e.id) ? { ...e, status: 'REJECTED' as const } : e
            );
            get().updateProject({ echoes: updatedEchoes });
            return;
        }

        try {
            const result = await batchRejectEchoes(project.id, echoIds);

            // 更新本地状态
            const updatedEchoes = project.echoes.map(e =>
                echoIds.includes(e.id) ? { ...e, status: 'REJECTED' as const } : e
            );
            get().updateProject({ echoes: updatedEchoes });

            // 更新批量操作历史
            const historyItem: BatchOperationHistoryItem = {
                id: result.operationId,
                operation: 'BATCH_REJECT',
                echoCount: result.affectedCount,
                timestamp: Date.now(),
                canUndo: true
            };

            set((state: any) => ({
                batchOperationHistory: [historyItem, ...state.batchOperationHistory]
            }));
        } catch (err) {
            console.error('Failed to batch reject echoes:', err);
            // 回退到本地更新
            const updatedEchoes = project.echoes.map(e =>
                echoIds.includes(e.id) ? { ...e, status: 'REJECTED' as const } : e
            );
            get().updateProject({ echoes: updatedEchoes });
        }
    },

    undoLastBatchOperation: async (operationId?: string) => {
        const { project, useBackend } = get();

        if (!useBackend) {
            alert('批量撤销需要后端支持');
            return;
        }

        try {
            await undoBatchOperation(project.id, operationId);

            // 重新加载项目数据
            const fullProject = await fetchProject(project.id);
            set({ project: { ...INITIAL_PROJECT, ...fullProject } });

            // 清除已撤销的操作历史
            set((state: any) => ({
                batchOperationHistory: state.batchOperationHistory.filter(
                    (item: BatchOperationHistoryItem) => item.id !== operationId
                )
            }));
        } catch (err) {
            console.error('Failed to undo batch operation:', err);
            alert('撤销失败');
        }
    },

    loadBatchOperationHistory: async () => {
        const { project, useBackend } = get();

        if (!useBackend) {
            console.log('批量操作历史需要后端支持');
            return;
        }

        try {
            const result = await getBatchOperationHistory(project.id);
            set({ batchOperationHistory: result.operations });
        } catch (err) {
            console.error('Failed to load batch operation history:', err);
        }
    }
}));
