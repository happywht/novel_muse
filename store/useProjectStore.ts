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
import { AppSection, ProjectState, WorldGenConfig } from '../types';
import { isBackendAvailable, fetchProjectList, fetchProject, syncProject, patchProject, deleteProjectApi, fetchChapter } from '../services/apiService';

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

    // --- Actions ---
    initialize: () => Promise<void>;
    createProject: () => Promise<void>;
    switchProject: (id: string) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    saveToLocalStorage: () => void;
    syncToBackend: () => void;
    loadFromLocalStorage: () => void;
    fetchChapterContent: (chapterId: string) => Promise<void>;
    forceSync: () => Promise<void>;
}

// ============================================================
// Debounce Timer (module-level to avoid closure issues)
// ============================================================
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingPatch: Partial<ProjectState> = {};

// ============================================================
// Store Implementation
// ============================================================

export const useProjectStore = create<ProjectStore>((set, get) => ({
    // --- Project State ---
    project: INITIAL_PROJECT,
    savedProjects: [],

    updateProject: (data) => {
        set((state) => ({
            project: { ...state.project, ...data },
        }));

        // Track the changes for incremental sync
        _pendingPatch = { ..._pendingPatch, ...data };

        // Trigger auto-save
        const store = get();
        if (!store.isLoading) {
            store.saveToLocalStorage();
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
        const backendOk = await isBackendAvailable();
        set({ useBackend: backendOk });

        if (backendOk) {
            console.log('🚀 Backend connected! Loading from MySQL...');
            try {
                const list = await fetchProjectList();
                if (list.length > 0) {
                    const sorted = list.sort((a, b) => b.lastModified - a.lastModified);
                    const fullProject = await fetchProject(sorted[0].id);
                    const merged = { ...INITIAL_PROJECT, ...fullProject };
                    set({
                        project: merged,
                        activeSection: AppSection.LOBBY, // Default to lobby on start
                        savedProjects: list.map(s => ({
                            ...INITIAL_PROJECT,
                            id: s.id,
                            title: s.title,
                            genre: s.genre,
                            lastModified: s.lastModified,
                        } as ProjectState)),
                    });
                } else {
                    // Check localStorage for migration
                    const stored = localStorage.getItem('muse_projects');
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            console.log('📦 Migrating localStorage projects to MySQL...');
                            for (const proj of parsed) {
                                await syncProject(proj);
                            }
                            const mostRecent = parsed.sort((a: any, b: any) => b.lastModified - a.lastModified)[0];
                            set({
                                project: { ...INITIAL_PROJECT, ...mostRecent },
                                activeSection: AppSection.LOBBY,
                                savedProjects: parsed,
                                isLoading: false,
                            });
                            return;
                        }
                    }
                    // Brand new user
                    const newProj = { ...INITIAL_PROJECT, id: Date.now().toString() };
                    await syncProject(newProj);
                    set({ project: newProj, savedProjects: [newProj] });
                }
            } catch (err) {
                console.warn('Backend load failed, falling back to localStorage', err);
                set({ useBackend: false });
                get().loadFromLocalStorage();
            }
        } else {
            console.log('💾 Backend unavailable, using localStorage');
            get().loadFromLocalStorage();
        }
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
            try { await syncProject(newProject); } catch (e) { console.warn('Failed to sync new project', e); }
        }

        set((state) => ({
            project: newProject,
            savedProjects: [...state.savedProjects, newProject],
            showProjectList: false,
        }));
        store.saveToLocalStorage();
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
            }
        }

        // Fallback to local
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
            try { await deleteProjectApi(id); } catch (e) { console.warn('Failed to delete from backend', e); }
        }

        set((state) => {
            const newList = state.savedProjects.filter(p => p.id !== id);
            const needsSwitch = state.project.id === id;
            localStorage.setItem('muse_projects', JSON.stringify(newList));
            return {
                savedProjects: newList,
                project: needsSwitch ? { ...INITIAL_PROJECT, ...newList[0] } : state.project,
            };
        });
    },

    saveToLocalStorage: () => {
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
        localStorage.setItem('muse_projects', JSON.stringify(newList));
        set({ savedProjects: newList });
    },

    syncToBackend: () => {
        const { useBackend, project } = get();
        if (!useBackend) return;

        if (_saveTimer) clearTimeout(_saveTimer);
        set({ isSaving: true });

        _saveTimer = setTimeout(async () => {
            try {
                const id = project.id;
                // Determine if we can use PATCH or must use full PUT
                const complexFields = ['characters', 'worldSettings', 'plotHistory', 'drafts', 'chapters', 'plotNodes', 'echoes', 'timeline'];
                const hasComplexChanges = Object.keys(_pendingPatch).some(key => complexFields.includes(key));

                if (hasComplexChanges) {
                    console.log('☁️ Full Sync (PUT) to backend:', id);
                    await syncProject({ ...project, lastModified: Date.now() });
                } else if (Object.keys(_pendingPatch).length > 0) {
                    console.log('☁️ Incremental Sync (PATCH) to backend:', id, Object.keys(_pendingPatch));
                    await patchProject(id, { ..._pendingPatch, lastModified: Date.now() });
                }

                _pendingPatch = {}; // Clear after successful sync
                set({ isSaving: false });
            } catch (err) {
                console.warn('Backend sync failed:', err);
                set({ isSaving: false });
                // Note: We don't clear _pendingPatch on failure so it can retry in the next cycle
            }
        }, 2000);
    },

    // Private-ish helper (not in interface but accessible via get())
    loadFromLocalStorage: () => {
        const stored = localStorage.getItem('muse_projects');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const mostRecent = parsed.sort((a: any, b: any) => b.lastModified - a.lastModified)[0];
                    set({
                        savedProjects: parsed,
                        project: { ...INITIAL_PROJECT, ...mostRecent },
                        activeSection: AppSection.LOBBY,
                    });
                    return;
                }
            } catch (e) {
                console.error('Failed to load projects from localStorage', e);
            }
        }
        const newProj = { ...INITIAL_PROJECT, id: Date.now().toString() };
        set({ project: newProj, savedProjects: [newProj] });
    },

    fetchChapterContent: async (chapterId) => {
        const { project, useBackend } = get();
        if (!useBackend) return;

        const chapter = project.chapters.find(c => c.id === chapterId);
        if (chapter && chapter.content && chapter.content.trim() !== "") {
            return;
        }

        set({ isLoading: true });
        try {
            const fullChapter = await fetchChapter(project.id, chapterId);
            set((state) => ({
                project: {
                    ...state.project,
                    chapters: state.project.chapters.map(c =>
                        c.id === chapterId ? { ...c, content: fullChapter.content } : c
                    )
                },
                isLoading: false
            }));
        } catch (err) {
            console.error('Failed to fetch chapter content:', err);
            set({ isLoading: false });
        }
    },

    // NEW: Manual force sync for the Save button
    forceSync: async () => {
        const { syncToBackend, saveToLocalStorage } = get();
        saveToLocalStorage();
        syncToBackend();
        // Immediately trigger sync without waiting for debounce if needed, 
        // but syncToBackend already handles it. We can make it more explicit if we want.
    }
}));
