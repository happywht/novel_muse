/**
 * Store 单元测试
 *
 * 测试各个 slice 的功能和性能
 */

import { renderHook, act } from '@testing-library/react';
import { useProjectStore } from './index';
import { INITIAL_PROJECT } from './initialState';
import type { ProjectState } from '../types';

// ============================================================
// 测试工具函数
// ============================================================

const createMockProject = (overrides?: Partial<ProjectState>): ProjectState => ({
  ...INITIAL_PROJECT,
  id: 'test-project',
  title: '测试项目',
  genre: '玄幻',
  lastModified: Date.now(),
  ...overrides,
});

// ============================================================
// Project Slice 测试
// ============================================================

describe('ProjectSlice', () => {
  beforeEach(() => {
    // 重置 store 状态
    useProjectStore.setState({
      project: INITIAL_PROJECT,
      savedProjects: [],
    });
  });

  test('应该正确设置项目', () => {
    const mockProject = createMockProject();

    act(() => {
      useProjectStore.getState().setProject(mockProject);
    });

    const { project } = useProjectStore.getState();
    expect(project.title).toBe('测试项目');
    expect(project.id).toBe('test-project');
  });

  test('应该正确更新项目', () => {
    const mockProject = createMockProject();

    act(() => {
      useProjectStore.getState().setProject(mockProject);
      useProjectStore.getState().updateProject({ title: '更新后的标题' });
    });

    const { project } = useProjectStore.getState();
    expect(project.title).toBe('更新后的标题');
    expect(project.genre).toBe('玄幻'); // 其他属性保持不变
  });

  test('应该正确添加到已保存项目列表', () => {
    const mockProject = createMockProject();

    act(() => {
      useProjectStore.getState().setProject(mockProject);
      useProjectStore.getState().setSavedProjects([mockProject]);
    });

    const { savedProjects } = useProjectStore.getState();
    expect(savedProjects).toHaveLength(1);
    expect(savedProjects[0].title).toBe('测试项目');
  });
});

// ============================================================
// UI Slice 测试
// ============================================================

describe('UISlice', () => {
  beforeEach(() => {
    useProjectStore.setState({
      activeSection: 'LOBBY' as any,
      isLoading: false,
      showGuide: false,
      showSettings: false,
    });
  });

  test('应该正确设置当前页面', () => {
    act(() => {
      useProjectStore.getState().setActiveSection('DASHBOARD' as any);
    });

    const { activeSection } = useProjectStore.getState();
    expect(activeSection).toBe('DASHBOARD');
  });

  test('应该正确设置加载状态', () => {
    act(() => {
      useProjectStore.getState().setIsLoading(true);
    });

    const { isLoading } = useProjectStore.getState();
    expect(isLoading).toBe(true);
  });

  test('应该正确设置对话框状态', () => {
    act(() => {
      useProjectStore.getState().setShowSettings(true);
      useProjectStore.getState().setShowGuide(true);
    });

    const { showSettings, showGuide } = useProjectStore.getState();
    expect(showSettings).toBe(true);
    expect(showGuide).toBe(true);
  });
});

// ============================================================
// Sync Slice 测试
// ============================================================

describe('SyncSlice', () => {
  beforeEach(() => {
    useProjectStore.setState({
      useBackend: false,
      isSaving: false,
      lastError: null,
      _internal: {
        saveTimer: null,
        pendingPatch: {},
      },
    });
  });

  test('应该正确设置后端使用状态', () => {
    act(() => {
      useProjectStore.getState().setUseBackend(true);
    });

    const { useBackend } = useProjectStore.getState();
    expect(useBackend).toBe(true);
  });

  test('应该正确设置保存状态', () => {
    act(() => {
      useProjectStore.getState().setIsSaving(true);
    });

    const { isSaving } = useProjectStore.getState();
    expect(isSaving).toBe(true);
  });

  test('应该正确设置错误信息', () => {
    const errorMessage = '同步失败';

    act(() => {
      useProjectStore.getState().setLastError(errorMessage);
    });

    const { lastError } = useProjectStore.getState();
    expect(lastError).toBe(errorMessage);
  });
});

// ============================================================
// Config Slice 测试
// ============================================================

describe('ConfigSlice', () => {
  beforeEach(() => {
    useProjectStore.setState({
      globalConfig: {
        ai: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          apiKey: '',
          temperature: 0.7,
        },
        storage: {
          backendSync: { enabled: false },
          autoSaveInterval: 1000,
        },
        performance: {
          cache: { enabled: true, ttl: 300000 },
        },
      },
    });
  });

  test('应该正确获取AI配置', () => {
    const { globalConfig } = useProjectStore.getState();
    expect(globalConfig.ai.provider).toBe('anthropic');
    expect(globalConfig.ai.model).toBe('claude-sonnet-4-6');
  });

  test('应该正确更新配置', async () => {
    await act(async () => {
      await useProjectStore.getState().updateGlobalConfig({
        ai: { model: 'claude-opus-4' },
      });
    });

    const { globalConfig } = useProjectStore.getState();
    expect(globalConfig.ai.model).toBe('claude-opus-4');
  });
});

// ============================================================
// Selector 性能测试
// ============================================================

describe('Selector Performance', () => {
  test('selector 应该避免不必要的重渲染', () => {
    let renderCount = 0;

    const { result } = renderHook(() => {
      renderCount++;
      return useProjectStore((state) => state.project.title);
    });

    // 初始渲染
    expect(result.current).toBe('');
    expect(renderCount).toBe(1);

    // 更新不相关的状态
    act(() => {
      useProjectStore.getState().setActiveSection('DASHBOARD' as any);
    });

    // 不应该触发重渲染
    expect(renderCount).toBe(1);

    // 更新相关的状态
    act(() => {
      useProjectStore.getState().updateProject({ title: '新标题' });
    });

    // 应该触发重渲染
    expect(result.current).toBe('新标题');
    expect(renderCount).toBe(2);
  });

  test('复合 selector 应该正常工作', () => {
    const mockProject = createMockProject({
      title: '测试项目',
      genre: '玄幻',
    });

    act(() => {
      useProjectStore.getState().setProject(mockProject);
    });

    const { result } = renderHook(() => {
      return useProjectStore((state) => ({
        title: state.project.title,
        genre: state.project.genre,
      }));
    });

    expect(result.current).toEqual({
      title: '测试项目',
      genre: '玄幻',
    });
  });
});

// ============================================================
// 集成测试
// ============================================================

describe('Store Integration', () => {
  test('多个 slice 应该协同工作', () => {
    const mockProject = createMockProject();

    act(() => {
      // Project slice
      useProjectStore.getState().setProject(mockProject);

      // UI slice
      useProjectStore.getState().setActiveSection('DASHBOARD' as any);
      useProjectStore.getState().setIsLoading(false);

      // Sync slice
      useProjectStore.getState().setUseBackend(true);
    });

    const state = useProjectStore.getState();
    expect(state.project.title).toBe('测试项目');
    expect(state.activeSection).toBe('DASHBOARD');
    expect(state.useBackend).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  test('状态更新应该保持一致性', () => {
    const mockProject = createMockProject();

    act(() => {
      useProjectStore.getState().setProject(mockProject);
      useProjectStore.getState().updateProject({
        title: '更新后的标题',
        genre: '仙侠',
      });
    });

    const { project } = useProjectStore.getState();
    expect(project.title).toBe('更新后的标题');
    expect(project.genre).toBe('仙侠');
    expect(project.id).toBe('test-project'); // ID 保持不变
  });
});

// ============================================================
// 性能基准测试
// ============================================================

describe('Performance Benchmarks', () => {
  test('批量更新应该高效', () => {
    const startTime = performance.now();

    act(() => {
      const store = useProjectStore.getState();
      for (let i = 0; i < 100; i++) {
        store.updateProject({ title: `项目 ${i}` });
      }
    });

    const endTime = performance.now();
    const duration = endTime - startTime;

    // 100次更新应该在合理时间内完成（< 100ms）
    expect(duration).toBeLessThan(100);
  });

  test('selector 查询应该高效', () => {
    const mockProject = createMockProject();
    const characters = Array.from({ length: 100 }, (_, i) => ({
      id: `char-${i}`,
      name: `角色 ${i}`,
      role: 'protagonist',
    }));

    act(() => {
      useProjectStore.getState().setProject({
        ...mockProject,
        characters,
      });
    });

    const startTime = performance.now();

    // 模拟多次 selector 查询
    for (let i = 0; i < 1000; i++) {
      useProjectStore.getState().project.characters;
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // 1000次查询应该非常快（< 10ms）
    expect(duration).toBeLessThan(10);
  });
});

// ============================================================
// 边界情况测试
// ============================================================

describe('Edge Cases', () => {
  test('应该处理空项目状态', () => {
    act(() => {
      useProjectStore.getState().setProject(INITIAL_PROJECT);
    });

    const { project } = useProjectStore.getState();
    expect(project.title).toBe('');
    expect(project.characters).toHaveLength(0);
  });

  test('应该处理undefined更新', () => {
    const mockProject = createMockProject();

    act(() => {
      useProjectStore.getState().setProject(mockProject);
      useProjectStore.getState().updateProject({
        title: undefined as any,
      });
    });

    // 应该不抛出错误
    const { project } = useProjectStore.getState();
    expect(project).toBeDefined();
  });

  test('应该处理大型对象更新', () => {
    const largeData = {
      characters: Array.from({ length: 1000 }, (_, i) => ({
        id: `char-${i}`,
        name: `角色 ${i}`,
        role: 'protagonist',
      })),
      worldSettings: Array.from({ length: 500 }, (_, i) => ({
        id: `setting-${i}`,
        title: `设定 ${i}`,
        content: '内容',
        category: 'Geography' as const,
      })),
    };

    act(() => {
      useProjectStore.getState().updateProject(largeData);
    });

    const { project } = useProjectStore.getState();
    expect(project.characters).toHaveLength(1000);
    expect(project.worldSettings).toHaveLength(500);
  });
});
