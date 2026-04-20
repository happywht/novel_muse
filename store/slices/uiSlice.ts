/**
 * UI 状态 Slice
 *
 * 管理用户界面状态，包括当前激活的区域、对话框显示状态等
 * 纯UI状态，不涉及业务逻辑
 */

import { StateCreator } from 'zustand';
import { AppSection } from '../../types';

export interface UISlice {
  // 导航状态
  activeSection: AppSection;
  setActiveSection: (section: AppSection) => void;

  // 选中状态
  activePlotNodeId: string | null;
  setActivePlotNodeId: (id: string | null) => void;

  activeChapterId: string | null;
  setActiveChapterId: (id: string | null) => void;

  // 对话框状态
  showGuide: boolean;
  setShowGuide: (show: boolean) => void;

  showSettings: boolean;
  setShowSettings: (show: boolean) => void;

  showPromptTuner: boolean;
  setShowPromptTuner: (show: boolean) => void;

  showProjectList: boolean;
  setShowProjectList: (show: boolean) => void;

  // 加载状态
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const createUISlice: StateCreator<
  UISlice,
  [],
  [],
  UISlice
> = (set) => ({
  // 初始导航状态
  activeSection: AppSection.LOBBY,
  setActiveSection: (section) => set({ activeSection: section }, false, 'setActiveSection'),

  // 初始选中状态
  activePlotNodeId: null,
  setActivePlotNodeId: (id) => set({ activePlotNodeId: id }, false, 'setActivePlotNodeId'),

  activeChapterId: null,
  setActiveChapterId: (id) => set({ activeChapterId: id }, false, 'setActiveChapterId'),

  // 初始对话框状态
  showGuide: false,
  setShowGuide: (show) => set({ showGuide: show }, false, 'setShowGuide'),

  showSettings: false,
  setShowSettings: (show) => set({ showSettings: show }, false, 'setShowSettings'),

  showPromptTuner: false,
  setShowPromptTuner: (show) => set({ showPromptTuner: show }, false, 'setShowPromptTuner'),

  showProjectList: false,
  setShowProjectList: (show) => set({ showProjectList: show }, false, 'setShowProjectList'),

  // 初始加载状态
  isLoading: true,
  setIsLoading: (loading) => set({ isLoading: loading }, false, 'setIsLoading'),
});
