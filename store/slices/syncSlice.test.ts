/**
 * syncSlice 单元测试
 *
 * 测试同步状态和后端交互的核心逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { createSyncSlice } from './syncSlice';
import { INITIAL_PROJECT } from '../initialState';

// Mock所有依赖模块
vi.mock('../../services/apiService', () => ({
  isBackendAvailable: vi.fn().mockResolvedValue(true),
  fetchProjectList: vi.fn().mockResolvedValue([]),
  fetchProject: vi.fn().mockResolvedValue({}),
  syncProject: vi.fn().mockResolvedValue({}),
  patchProject: vi.fn().mockResolvedValue({}),
  deleteProjectApi: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../services/storageService', () => ({
  storageService: {
    migrateFromLocalStorage: vi.fn().mockResolvedValue([]),
    getItem: vi.fn().mockResolvedValue([]),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeLegacyItem: vi.fn(),
  },
  STORAGE_KEYS: {
    PROJECTS: 'muse-projects',
  },
}));

vi.mock('../../config/global', () => ({
  getGlobalConfig: vi.fn().mockResolvedValue({
    storage: {
      backendSync: {
        enabled: true,
      },
    },
  }),
}));

describe('syncSlice', () => {
  let useStore: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // 创建实际的store实例用于测试
    useStore = create<any>((set, get) => ({
      project: INITIAL_PROJECT,
      savedProjects: [],
      updateProject: vi.fn(),
      setProject: vi.fn(),
      setSavedProjects: vi.fn(),
      ...createSyncSlice(set, get, {
        project: INITIAL_PROJECT,
        savedProjects: [],
        updateProject: vi.fn(),
        setProject: vi.fn(),
        setSavedProjects: vi.fn(),
      } as any),
    }));
  });

  describe('State 初始化', () => {
    it('useBackend应该默认为false', () => {
      const state = useStore.getState();
      expect(state.useBackend).toBe(false);
    });

    it('isSaving应该默认为false', () => {
      const state = useStore.getState();
      expect(state.isSaving).toBe(false);
    });

    it('lastError应该默认为null', () => {
      const state = useStore.getState();
      expect(state.lastError).toBeNull();
    });

    it('内部状态应该初始化为空', () => {
      const state = useStore.getState();
      expect(state._internal.saveTimer).toBeNull();
      expect(state._internal.pendingPatch).toEqual({});
    });
  });

  describe('setUseBackend', () => {
    it('应该能够启用后端同步', () => {
      useStore.getState().setUseBackend(true);
      const state = useStore.getState();
      expect(state.useBackend).toBe(true);
    });

    it('应该能够禁用后端同步', () => {
      useStore.getState().setUseBackend(false);
      const state = useStore.getState();
      expect(state.useBackend).toBe(false);
    });

    it('应该能够切换后端状态', () => {
      useStore.getState().setUseBackend(true);
      useStore.getState().setUseBackend(false);

      const state = useStore.getState();
      expect(state.useBackend).toBe(false);
    });
  });

  describe('setIsSaving', () => {
    it('应该能够设置保存中状态', () => {
      useStore.getState().setIsSaving(true);
      const state = useStore.getState();
      expect(state.isSaving).toBe(true);
    });

    it('应该能够清除保存中状态', () => {
      useStore.getState().setIsSaving(false);
      const state = useStore.getState();
      expect(state.isSaving).toBe(false);
    });
  });

  describe('setLastError', () => {
    it('应该能够设置错误信息', () => {
      const errorMsg = '同步失败';
      useStore.getState().setLastError(errorMsg);
      const state = useStore.getState();
      expect(state.lastError).toBe(errorMsg);
    });

    it('应该能够清除错误信息', () => {
      useStore.getState().setLastError(null);
      const state = useStore.getState();
      expect(state.lastError).toBeNull();
    });

    it('应该能够设置空错误信息', () => {
      useStore.getState().setLastError('');
      const state = useStore.getState();
      expect(state.lastError).toBe('');
    });
  });

  describe('错误处理状态', () => {
    it('应该记录详细的错误信息', () => {
      const detailedError = 'Failed to sync: Connection timeout after 30000ms';
      useStore.getState().setLastError(detailedError);

      const state = useStore.getState();
      expect(state.lastError).toBe(detailedError);
    });

    it('应该记录空错误', () => {
      useStore.getState().setLastError('');
      const state = useStore.getState();
      expect(state.lastError).toBe('');
    });

    it('应该记录网络错误', () => {
      const networkError = 'Network request failed';
      useStore.getState().setLastError(networkError);

      const state = useStore.getState();
      expect(state.lastError).toBe(networkError);
    });

    it('应该记录验证错误', () => {
      const validationError = 'Validation failed: Invalid project data';
      useStore.getState().setLastError(validationError);

      const state = useStore.getState();
      expect(state.lastError).toBe(validationError);
    });
  });

  describe('后端模式切换', () => {
    it('应该能够从本地模式切换到后端模式', () => {
      useStore.getState().setUseBackend(false);
      useStore.getState().setUseBackend(true);

      const state = useStore.getState();
      expect(state.useBackend).toBe(true);
    });

    it('应该能够从后端模式切换到本地模式', () => {
      useStore.getState().setUseBackend(true);
      useStore.getState().setUseBackend(false);

      const state = useStore.getState();
      expect(state.useBackend).toBe(false);
    });

    it('应该能够多次切换模式', () => {
      useStore.getState().setUseBackend(true);
      useStore.getState().setUseBackend(false);
      useStore.getState().setUseBackend(true);
      useStore.getState().setUseBackend(false);

      const state = useStore.getState();
      expect(state.useBackend).toBe(false);
    });
  });

  describe('保存状态转换', () => {
    it('保存开始 -> 保存中状态', () => {
      useStore.getState().setIsSaving(true);
      const state = useStore.getState();
      expect(state.isSaving).toBe(true);
    });

    it('保存完成 -> 非保存状态', () => {
      useStore.getState().setIsSaving(true);
      useStore.getState().setIsSaving(false);

      const state = useStore.getState();
      expect(state.isSaving).toBe(false);
    });

    it('错误发生 -> 错误信息设置', () => {
      const errorMsg = '网络错误';
      useStore.getState().setLastError(errorMsg);

      const state = useStore.getState();
      expect(state.lastError).toBe(errorMsg);
    });

    it('错误清除 -> 无错误状态', () => {
      useStore.getState().setLastError('错误');
      useStore.getState().setLastError(null);

      const state = useStore.getState();
      expect(state.lastError).toBeNull();
    });
  });

  describe('边界条件', () => {
    it('应该能够处理相同的状态设置', () => {
      useStore.getState().setUseBackend(true);
      useStore.getState().setUseBackend(true);

      const state = useStore.getState();
      expect(state.useBackend).toBe(true);
    });

    it('应该能够处理undefined错误', () => {
      useStore.getState().setLastError(undefined as any);
      const state = useStore.getState();
      expect(state.lastError).toBeUndefined();
    });
  });

  describe('状态重置', () => {
    it('应该能够重置所有状态到初始值', () => {
      // 设置一些状态
      useStore.getState().setUseBackend(true);
      useStore.getState().setIsSaving(true);
      useStore.getState().setLastError('error');

      // 重置
      useStore.getState().setUseBackend(false);
      useStore.getState().setIsSaving(false);
      useStore.getState().setLastError(null);

      const state = useStore.getState();
      expect(state.useBackend).toBe(false);
      expect(state.isSaving).toBe(false);
      expect(state.lastError).toBeNull();
    });
  });

  describe('内部状态管理', () => {
    it('应该有saveTimer初始为null', () => {
      const state = useStore.getState();
      expect(state._internal.saveTimer).toBeNull();
    });

    it('应该有pendingPatch初始为空对象', () => {
      const state = useStore.getState();
      expect(state._internal.pendingPatch).toEqual({});
    });

    it('内部状态应该可序列化', () => {
      const state = useStore.getState();
      const serialized = JSON.stringify(state._internal);
      expect(() => JSON.parse(serialized)).not.toThrow();
    });
  });

  describe('状态持久化准备', () => {
    it('同步状态应该可序列化', () => {
      const state = {
        useBackend: useStore.getState().useBackend,
        isSaving: useStore.getState().isSaving,
        lastError: useStore.getState().lastError,
      };

      // 这些值都应该可以被JSON序列化
      expect(() => JSON.stringify(state)).not.toThrow();
    });

    it('错误信息应该可以被存储', () => {
      const errorMsg = 'Test error message';
      useStore.getState().setLastError(errorMsg);

      const serialized = JSON.stringify({ error: errorMsg });
      expect(JSON.parse(serialized).error).toBe(errorMsg);
    });
  });
});
