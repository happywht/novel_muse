/**
 * projectSlice 单元测试
 *
 * 测试项目数据管理的核心逻辑
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { create } from 'zustand';
import { createProjectSlice } from './projectSlice';
import { INITIAL_PROJECT } from '../initialState';
import { ProjectState } from '../../types';

// Mock storageService
vi.mock('../../services/storageService', () => ({
  storageService: {
    setItem: vi.fn().mockResolvedValue(undefined),
    getItem: vi.fn(),
    removeItem: vi.fn(),
  },
  STORAGE_KEYS: {
    PROJECTS: 'muse-projects',
    GLOBAL_CONFIG: 'muse-global-config',
  },
}));

describe('projectSlice', () => {
  let useStore: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // 创建实际的store实例用于测试
    useStore = create<any>((set, get) => ({
      ...createProjectSlice(set, get, {} as any),
    }));
  });

  describe('State 初始化', () => {
    it('应该初始化正确的默认状态', () => {
      const state = useStore.getState();
      expect(state.project).toBeDefined();
      expect(state.project.id).toBe('default-project');
      expect(state.project.title).toBe('');
      expect(state.project.characters).toEqual([]);
      expect(state.project.worldSettings).toEqual([]);
    });

    it('应该有空的savedProjects数组', () => {
      const state = useStore.getState();
      expect(state.savedProjects).toEqual([]);
    });
  });

  describe('updateProject', () => {
    it('应该正确更新项目标题', () => {
      const newTitle = '测试项目';
      useStore.getState().updateProject({ title: newTitle });

      const state = useStore.getState();
      expect(state.project.title).toBe(newTitle);
    });

    it('应该正确更新项目体裁', () => {
      const newGenre = '玄幻';
      useStore.getState().updateProject({ genre: newGenre });

      const state = useStore.getState();
      expect(state.project.genre).toBe(newGenre);
    });

    it('应该正确更新多个字段', () => {
      const updates = {
        title: '新标题',
        genre: '科幻',
        premise: '这是一个测试',
      };

      useStore.getState().updateProject(updates);

      const state = useStore.getState();
      expect(state.project.title).toBe('新标题');
      expect(state.project.genre).toBe('科幻');
      expect(state.project.premise).toBe('这是一个测试');
    });

    it('应该正确更新角色列表', () => {
      const mockCharacter = {
        id: 'char-1',
        name: '测试角色',
        role: 'protagonist',
        personality: '勇敢',
        background: '背景故事',
      };

      useStore.getState().updateProject({
        characters: [mockCharacter as any],
      });

      const state = useStore.getState();
      expect(state.project.characters).toHaveLength(1);
      expect(state.project.characters[0].name).toBe('测试角色');
    });

    it('应该正确更新世界设定', () => {
      const mockWorldSetting = {
        id: 'world-1',
        category: 'Geography',
        content: '测试世界设定',
      };

      useStore.getState().updateProject({
        worldSettings: [mockWorldSetting as any],
      });

      const state = useStore.getState();
      expect(state.project.worldSettings).toHaveLength(1);
      expect(state.project.worldSettings[0].category).toBe('Geography');
    });
  });

  describe('setProject', () => {
    it('应该完全替换项目状态', () => {
      const newProject: ProjectState = {
        ...INITIAL_PROJECT,
        id: 'test-project-1',
        title: '测试项目',
        genre: '玄幻',
      };

      useStore.getState().setProject(newProject);

      const state = useStore.getState();
      expect(state.project.id).toBe('test-project-1');
      expect(state.project.title).toBe('测试项目');
      expect(state.project.genre).toBe('玄幻');
    });

    it('应该保留项目完整性', () => {
      const newProject: ProjectState = {
        ...INITIAL_PROJECT,
        id: 'test-project-2',
        title: '完整项目',
        genre: '科幻',
        premise: '完整前提',
      };

      useStore.getState().setProject(newProject);

      const state = useStore.getState();
      expect(state.project).toMatchObject({
        id: 'test-project-2',
        title: '完整项目',
        genre: '科幻',
        premise: '完整前提',
      });
    });
  });

  describe('setSavedProjects', () => {
    it('应该设置保存的项目列表', () => {
      const mockProjects: ProjectState[] = [
        { ...INITIAL_PROJECT, id: 'p1', title: '项目1' },
        { ...INITIAL_PROJECT, id: 'p2', title: '项目2' },
      ];

      useStore.getState().setSavedProjects(mockProjects);

      const state = useStore.getState();
      expect(state.savedProjects).toHaveLength(2);
      expect(state.savedProjects[0].title).toBe('项目1');
      expect(state.savedProjects[1].title).toBe('项目2');
    });

    it('应该能够清空项目列表', () => {
      useStore.getState().setSavedProjects([]);

      const state = useStore.getState();
      expect(state.savedProjects).toEqual([]);
    });

    it('应该能够设置单个项目', () => {
      const singleProject: ProjectState = {
        ...INITIAL_PROJECT,
        id: 'single',
        title: '单个项目',
      };

      useStore.getState().setSavedProjects([singleProject]);

      const state = useStore.getState();
      expect(state.savedProjects).toHaveLength(1);
      expect(state.savedProjects[0].title).toBe('单个项目');
    });
  });

  describe('数据完整性', () => {
    it('项目应该包含所有必需字段', () => {
      const project: ProjectState = useStore.getState().project;

      expect(project).toHaveProperty('id');
      expect(project).toHaveProperty('title');
      expect(project).toHaveProperty('genre');
      expect(project).toHaveProperty('premise');
      expect(project).toHaveProperty('creativeSettings');
      expect(project).toHaveProperty('worldGenConfig');
      expect(project).toHaveProperty('characters');
      expect(project).toHaveProperty('worldSettings');
      expect(project).toHaveProperty('plotOutline');
      expect(project).toHaveProperty('drafts');
      expect(project).toHaveProperty('chapters');
      expect(project).toHaveProperty('echoes');
      expect(project).toHaveProperty('lastModified');
    });

    it('creativeSettings应该包含所有子字段', () => {
      const { creativeSettings } = useStore.getState().project;

      expect(creativeSettings).toHaveProperty('tone');
      expect(creativeSettings).toHaveProperty('style');
      expect(creativeSettings).toHaveProperty('creativity');
      expect(creativeSettings).toHaveProperty('targetAudience');
      expect(creativeSettings).toHaveProperty('promptProfile');
      expect(creativeSettings).toHaveProperty('styleTags');
      expect(creativeSettings).toHaveProperty('referenceText');
    });

    it('worldGenConfig应该包含配置项', () => {
      const { worldGenConfig } = useStore.getState().project;

      expect(worldGenConfig).toHaveProperty('detailLevel');
      expect(worldGenConfig).toHaveProperty('focus');
    });
  });

  describe('边界条件', () => {
    it('应该处理空字符串更新', () => {
      useStore.getState().updateProject({ title: '' });

      const state = useStore.getState();
      expect(state.project.title).toBe('');
    });

    it('应该处理null和undefined', () => {
      useStore.getState().updateProject({ title: undefined as any });

      const state = useStore.getState();
      expect(state.project.title).toBeUndefined();
    });

    it('应该处理大型数据更新', () => {
      const largeCharacters = Array.from({ length: 100 }, (_, i) => ({
        id: `char-${i}`,
        name: `角色${i}`,
        role: 'npc',
      }));

      useStore.getState().updateProject({ characters: largeCharacters as any });

      const state = useStore.getState();
      expect(state.project.characters).toHaveLength(100);
    });
  });

  describe('类型安全', () => {
    it('updateProject应该接受Partial<ProjectState>', () => {
      const partialUpdate: Partial<ProjectState> = {
        title: '部分更新',
      };

      // 这应该编译通过，不抛出类型错误
      expect(() =>
        useStore.getState().updateProject(partialUpdate)
      ).not.toThrow();

      const state = useStore.getState();
      expect(state.project.title).toBe('部分更新');
    });

    it('setProject应该接受完整的ProjectState', () => {
      const fullProject: ProjectState = {
        ...INITIAL_PROJECT,
        id: 'typed-project',
      };

      expect(() => useStore.getState().setProject(fullProject)).not.toThrow();

      const state = useStore.getState();
      expect(state.project.id).toBe('typed-project');
    });
  });
});
