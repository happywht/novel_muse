/**
 * 项目数据 Slice
 *
 * 管理项目核心数据和项目列表状态
 * 负责项目的CRUD操作和数据持久化
 */

import { StateCreator } from 'zustand';
import { ProjectState } from '../../types';
import { INITIAL_PROJECT } from '../initialState';
import { storageService, STORAGE_KEYS } from '../../services/storageService';

export interface ProjectSlice {
  // 状态
  project: ProjectState;
  savedProjects: ProjectState[];

  // 操作
  setProject: (project: ProjectState) => void;
  updateProject: (data: Partial<ProjectState>) => void;
  createProject: () => Promise<void>;
  switchProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setSavedProjects: (projects: ProjectState[]) => void;
  saveToPersistentStorage: () => Promise<void>;
}

export const createProjectSlice: StateCreator<
  ProjectSlice,
  [],
  [],
  ProjectSlice
> = (set, get) => ({
  // 初始状态
  project: INITIAL_PROJECT,
  savedProjects: [],

  // 设置整个项目
  setProject: (project) => set({ project }, false, 'setProject'),

  // 部分更新项目
  updateProject: (data) => set(
    (state) => ({
      project: { ...state.project, ...data }
    }),
    false,
    'updateProject'
  ),

  // 创建新项目
  createProject: async () => {
    const newProject: ProjectState = {
      ...INITIAL_PROJECT,
      id: Date.now().toString(),
      lastModified: Date.now(),
    };

    set((state) => ({
      project: newProject,
      savedProjects: [...state.savedProjects, newProject]
    }), false, 'createProject');

    await get().saveToPersistentStorage();
  },

  // 切换项目
  switchProject: async (id) => {
    const localProject = get().savedProjects.find(p => p.id === id);
    if (localProject) {
      set({ project: { ...INITIAL_PROJECT, ...localProject } }, false, 'switchProject');
    }
  },

  // 删除项目
  deleteProject: async (id) => {
    const state = get();
    if (state.savedProjects.length <= 1) {
      alert('至少需要保留一个项目！');
      return;
    }

    const newList = state.savedProjects.filter(p => p.id !== id);
    const needsSwitch = state.project.id === id;

    await storageService.setItem(STORAGE_KEYS.PROJECTS, newList);

    set({
      savedProjects: newList,
      project: needsSwitch ? { ...INITIAL_PROJECT, ...newList[0] } : state.project
    }, false, 'deleteProject');
  },

  // 设置已保存项目列表
  setSavedProjects: (projects) => set({ savedProjects: projects }, false, 'setSavedProjects'),

  // 保存到持久化存储
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
    set({ savedProjects: newList }, false, 'saveToPersistentStorage');
  },
});
