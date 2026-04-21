/**
 * 同步状态 Slice
 *
 * 管理与后端同步相关的状态和操作
 * 负责数据同步、错误处理和后端可用性检测
 */

import { StateCreator } from 'zustand';
import { ProjectState } from '../../types';
import {
  isBackendAvailable,
  fetchProjectList,
  fetchProject,
  syncProject,
  patchProject,
  deleteProjectApi
} from '../../services/apiService';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { getGlobalConfig } from '../../config/global';
import { INITIAL_PROJECT } from '../initialState';

export interface SyncSlice {
  // 状态
  useBackend: boolean;
  isSaving: boolean;
  lastError: string | null;

  // 内部状态（用于devtools跟踪）
  _internal: {
    saveTimer: number | null;
    pendingPatch: Partial<ProjectState>;
  };

  // 操作
  setUseBackend: (use: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setLastError: (error: string | null) => void;
  forceSync: () => Promise<void>;
  syncToBackend: () => void;
  initialize: () => Promise<void>;
  loadFromPersistentStorage: () => Promise<void>;
}

export const createSyncSlice: StateCreator<
  SyncSlice,
  [],
  [],
  SyncSlice
> = (set, get) => ({
  // 初始状态
  useBackend: false,
  isSaving: false,
  lastError: null,
  _internal: {
    saveTimer: null,
    pendingPatch: {},
  },

  // 设置后端使用状态
  setUseBackend: (use) => set({ useBackend: use }, false, 'setUseBackend'),

  // 设置保存状态
  setIsSaving: (saving) => set({ isSaving: saving }, false, 'setIsSaving'),

  // 设置错误信息
  setLastError: (error) => set({ lastError: error }, false, 'setLastError'),

  // 强制同步
  forceSync: async () => {
    const store = get() as any; // 需要访问其他slice的方法
    if (store.saveToPersistentStorage) {
      await store.saveToPersistentStorage();
    }
    get().syncToBackend();
  },

  // 后端同步
  syncToBackend: () => {
    const { useBackend, _internal } = get();
    if (!useBackend) return;

    const store = get() as any; // 需要访问project状态
    const project = store.project;

    // 清理之前的定时器
    if (_internal.saveTimer) {
      clearTimeout(_internal.saveTimer as number);
    }
    set({ isSaving: true });

    // 使用异步操作避免阻塞
    const timerId = setTimeout(async () => {
      try {
        const currentState = get() as any;
        const currentProject = currentState.project;
        const currentInternal = currentState._internal;

        const id = currentProject.id;
        const complexFields = ['characters', 'worldSettings', 'plotHistory', 'drafts', 'chapters', 'plotNodes', 'echoes', 'timeline'];
        const hasComplexChanges = Object.keys(currentInternal.pendingPatch).some(key => complexFields.includes(key));

        if (hasComplexChanges) {
          console.log('☁️ Full Sync (PUT) to backend:', id);
          await syncProject({ ...currentProject, lastModified: Date.now() });
        } else if (Object.keys(currentInternal.pendingPatch).length > 0) {
          console.log('☁️ Incremental Sync (PATCH) to backend:', id, Object.keys(currentInternal.pendingPatch));
          await patchProject(id, { ...currentInternal.pendingPatch, lastModified: Date.now() });
        }

        set((state) => ({
          _internal: {
            ...state._internal,
            pendingPatch: {},
            saveTimer: null,
          },
          isSaving: false,
        }));
      } catch (err) {
        console.warn('Backend sync failed:', err);
        set({
          isSaving: false,
          lastError: '数据同步失败：已保存到本地，将在下次连接时重试',
          _internal: {
            ...get()._internal,
            saveTimer: null,
          }
        });
      }
    }, 1000);

    set((state) => ({
      _internal: {
        ...state._internal,
        saveTimer: timerId as unknown as number,
      },
    }));
  },

  // 初始化应用
  initialize: async () => {
    set({ isLoading: true });

    // 1. 立即加载全局配置
    const config = await getGlobalConfig();
    const backendSyncEnabled = config.storage.backendSync.enabled;

    // 2. 并行执行：本地数据迁移 + 快速后端检测
    const localDataPromise = (async () => {
      const migrated = await storageService.migrateFromLocalStorage(STORAGE_KEYS.PROJECTS);
      const localProjects = await storageService.getItem<ProjectState[]>(STORAGE_KEYS.PROJECTS) || [];
      return localProjects;
    })();

    // 快速后端检测
    let backendOk = false;
    if (backendSyncEnabled) {
      try {
        backendOk = await Promise.race([
          isBackendAvailable(),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1000))
        ]);
      } catch (error) {
        console.log('💭 后端检测失败，将使用本地模式');
      }
    } else {
      console.log('⚙️ 后端同步已在配置中禁用');
    }

    set({ useBackend: backendOk });

    // 3. 根据检测结果决定数据源
    if (backendOk) {
      console.log('🚀 后端可用！正在加载云端数据...');
      try {
        const list = await fetchProjectList();
        if (list.length > 0) {
          const sorted = list.sort((a, b) => b.lastModified - a.lastModified);
          const mostRecentRemote = sorted[0];
          const localProjects = await localDataPromise;
          const localVersion = localProjects.find(p => p.id === mostRecentRemote.id);

          let projectToLoad: ProjectState;
          if (localVersion && localVersion.lastModified > mostRecentRemote.lastModified) {
            console.log('💡 本地版本较新，使用本地版本并同步到云端...');
            projectToLoad = { ...INITIAL_PROJECT, ...localVersion };
            setTimeout(() => get().syncToBackend(), 1000);
          } else {
            console.log('☁️ 从云端加载最新项目...');
            const fullProject = await fetchProject(mostRecentRemote.id);
            projectToLoad = { ...INITIAL_PROJECT, ...fullProject };
          }

          const store = set as any;
          store({
            project: projectToLoad,
            savedProjects: list.map(s => ({
              ...INITIAL_PROJECT,
              id: s.id,
              title: s.title,
              genre: s.genre,
              lastModified: s.lastModified,
            })),
            isLoading: false
          });
        } else {
          // 云端没有项目，迁移本地项目
          const localProjects = await localDataPromise;
          if (localProjects.length > 0) {
            console.log('📦 将本地项目迁移到云端...');
            for (const proj of localProjects) {
              await syncProject(proj);
            }
            const mostRecent = localProjects.sort((a, b) => b.lastModified - a.lastModified)[0];
            set({
              project: { ...INITIAL_PROJECT, ...mostRecent },
              savedProjects: localProjects,
              isLoading: false,
            } as any);
          } else {
            // 创建新项目
            const newProj = { ...INITIAL_PROJECT, id: Date.now().toString() };
            await syncProject(newProj);
            set({ project: newProj, savedProjects: [newProj], isLoading: false } as any);
          }
        }
      } catch (err) {
        console.warn('❌ 云端加载失败，回退到本地存储:', err);
        set({ useBackend: false });
        await get().loadFromPersistentStorage();
      }
    } else {
      console.log('💾 使用本地 IndexedDB 模式');
      const localProjects = await localDataPromise;

      if (localProjects && localProjects.length > 0) {
        const mostRecent = localProjects.sort((a, b) => b.lastModified - a.lastModified)[0];
        set({
          project: { ...INITIAL_PROJECT, ...mostRecent },
          savedProjects: localProjects,
          isLoading: false,
        } as any);
      } else {
        const newProj = { ...INITIAL_PROJECT, id: Date.now().toString() };
        set({ project: newProj, savedProjects: [newProj], isLoading: false } as any);
      }
    }

    // 4. 清理旧的 localStorage
    storageService.removeLegacyItem(STORAGE_KEYS.PROJECTS);
    set({ isLoading: false });
  },

  // 从持久化存储加载
  loadFromPersistentStorage: async () => {
    const parsed = await storageService.getItem<ProjectState[]>(STORAGE_KEYS.PROJECTS);
    if (parsed && Array.isArray(parsed) && parsed.length > 0) {
      const mostRecent = parsed.sort((a, b) => b.lastModified - a.lastModified)[0];
      set({
        savedProjects: parsed,
        project: { ...INITIAL_PROJECT, ...mostRecent },
        isLoading: false,
      } as any);
      return;
    }
    const newProj = { ...INITIAL_PROJECT, id: Date.now().toString() };
    set({ project: newProj, savedProjects: [newProj] } as any);
  },
});
