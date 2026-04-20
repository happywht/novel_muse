/**
 * uiSlice 单元测试
 *
 * 测试UI状态管理的核心逻辑
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createUISlice } from './uiSlice';
import { AppSection } from '../../types';

describe('uiSlice', () => {
  let useStore: any;

  beforeEach(() => {
    // 创建实际的store实例用于测试
    useStore = create<any>((set, get) => ({
      ...createUISlice(set, get, {} as any),
    }));
  });

  describe('State 初始化', () => {
    it('应该初始化为LOBBY界面', () => {
      const state = useStore.getState();
      expect(state.activeSection).toBe(AppSection.LOBBY);
    });

    it('showGuide应该默认为false', () => {
      const state = useStore.getState();
      expect(state.showGuide).toBe(false);
    });

    it('showSettings应该默认为false', () => {
      const state = useStore.getState();
      expect(state.showSettings).toBe(false);
    });

    it('showPromptTuner应该默认为false', () => {
      const state = useStore.getState();
      expect(state.showPromptTuner).toBe(false);
    });

    it('showProjectList应该默认为false', () => {
      const state = useStore.getState();
      expect(state.showProjectList).toBe(false);
    });

    it('activePlotNodeId应该默认为null', () => {
      const state = useStore.getState();
      expect(state.activePlotNodeId).toBeNull();
    });

    it('activeChapterId应该默认为null', () => {
      const state = useStore.getState();
      expect(state.activeChapterId).toBeNull();
    });
  });

  describe('setActiveSection', () => {
    it('应该能够切换到DASHBOARD', () => {
      useStore.getState().setActiveSection(AppSection.DASHBOARD);
      const state = useStore.getState();
      expect(state.activeSection).toBe(AppSection.DASHBOARD);
    });

    it('应该能够切换到WORLD', () => {
      useStore.getState().setActiveSection(AppSection.WORLD);
      const state = useStore.getState();
      expect(state.activeSection).toBe(AppSection.WORLD);
    });

    it('应该能够切换到CHARACTERS', () => {
      useStore.getState().setActiveSection(AppSection.CHARACTERS);
      const state = useStore.getState();
      expect(state.activeSection).toBe(AppSection.CHARACTERS);
    });

    it('应该能够切换到PLOT', () => {
      useStore.getState().setActiveSection(AppSection.PLOT);
      const state = useStore.getState();
      expect(state.activeSection).toBe(AppSection.PLOT);
    });

    it('应该能够切换到DRAFTING', () => {
      useStore.getState().setActiveSection(AppSection.DRAFTING);
      const state = useStore.getState();
      expect(state.activeSection).toBe(AppSection.DRAFTING);
    });

    it('应该能够切换到ECHOES', () => {
      useStore.getState().setActiveSection(AppSection.ECHOES);
      const state = useStore.getState();
      expect(state.activeSection).toBe(AppSection.ECHOES);
    });

    it('应该能够切换到GRAPH', () => {
      useStore.getState().setActiveSection(AppSection.GRAPH);
      const state = useStore.getState();
      expect(state.activeSection).toBe(AppSection.GRAPH);
    });

    it('应该能够切换到CREATIVE_COMPASS', () => {
      useStore.getState().setActiveSection(AppSection.CREATIVE_COMPASS);
      const state = useStore.getState();
      expect(state.activeSection).toBe(AppSection.CREATIVE_COMPASS);
    });

    it('应该能够切换到TEMPLATE_EDITOR', () => {
      useStore.getState().setActiveSection(AppSection.TEMPLATE_EDITOR);
      const state = useStore.getState();
      expect(state.activeSection).toBe(AppSection.TEMPLATE_EDITOR);
    });

    it('应该能够切换到OUTLINER', () => {
      useStore.getState().setActiveSection(AppSection.OUTLINER);
      const state = useStore.getState();
      expect(state.activeSection).toBe(AppSection.OUTLINER);
    });
  });

  describe('setShowGuide', () => {
    it('应该能够显示用户指南', () => {
      useStore.getState().setShowGuide(true);
      const state = useStore.getState();
      expect(state.showGuide).toBe(true);
    });

    it('应该能够隐藏用户指南', () => {
      useStore.getState().setShowGuide(false);
      const state = useStore.getState();
      expect(state.showGuide).toBe(false);
    });
  });

  describe('setShowSettings', () => {
    it('应该能够显示设置面板', () => {
      useStore.getState().setShowSettings(true);
      const state = useStore.getState();
      expect(state.showSettings).toBe(true);
    });

    it('应该能够隐藏设置面板', () => {
      useStore.getState().setShowSettings(false);
      const state = useStore.getState();
      expect(state.showSettings).toBe(false);
    });
  });

  describe('setShowPromptTuner', () => {
    it('应该能够显示提示词调优器', () => {
      useStore.getState().setShowPromptTuner(true);
      const state = useStore.getState();
      expect(state.showPromptTuner).toBe(true);
    });

    it('应该能够隐藏提示词调优器', () => {
      useStore.getState().setShowPromptTuner(false);
      const state = useStore.getState();
      expect(state.showPromptTuner).toBe(false);
    });
  });

  describe('setShowProjectList', () => {
    it('应该能够显示项目列表', () => {
      useStore.getState().setShowProjectList(true);
      const state = useStore.getState();
      expect(state.showProjectList).toBe(true);
    });

    it('应该能够隐藏项目列表', () => {
      useStore.getState().setShowProjectList(false);
      const state = useStore.getState();
      expect(state.showProjectList).toBe(false);
    });
  });

  describe('setActivePlotNodeId', () => {
    it('应该能够设置活跃的剧情节点ID', () => {
      const nodeId = 'plot-node-123';
      useStore.getState().setActivePlotNodeId(nodeId);
      const state = useStore.getState();
      expect(state.activePlotNodeId).toBe(nodeId);
    });

    it('应该能够清除活跃的剧情节点', () => {
      useStore.getState().setActivePlotNodeId('test');
      useStore.getState().setActivePlotNodeId(null);
      const state = useStore.getState();
      expect(state.activePlotNodeId).toBeNull();
    });

    it('应该能够处理空字符串ID', () => {
      useStore.getState().setActivePlotNodeId('');
      const state = useStore.getState();
      expect(state.activePlotNodeId).toBe('');
    });
  });

  describe('setActiveChapterId', () => {
    it('应该能够设置活跃的章节ID', () => {
      const chapterId = 'chapter-456';
      useStore.getState().setActiveChapterId(chapterId);
      const state = useStore.getState();
      expect(state.activeChapterId).toBe(chapterId);
    });

    it('应该能够清除活跃的章节', () => {
      useStore.getState().setActiveChapterId('test');
      useStore.getState().setActiveChapterId(null);
      const state = useStore.getState();
      expect(state.activeChapterId).toBeNull();
    });
  });

  describe('UI状态互斥性', () => {
    it('模态框状态应该独立管理', () => {
      // 这些状态可以同时为true，不互斥
      useStore.getState().setShowGuide(true);
      useStore.getState().setShowSettings(true);
      useStore.getState().setShowPromptTuner(true);

      const state = useStore.getState();
      expect(state.showGuide).toBe(true);
      expect(state.showSettings).toBe(true);
      expect(state.showPromptTuner).toBe(true);
    });

    it('活跃ID状态应该独立', () => {
      useStore.getState().setActivePlotNodeId('plot-1');
      useStore.getState().setActiveChapterId('chapter-1');

      const state = useStore.getState();
      expect(state.activePlotNodeId).toBe('plot-1');
      expect(state.activeChapterId).toBe('chapter-1');
    });
  });

  describe('边界条件', () => {
    it('应该能够快速连续切换section', () => {
      useStore.getState().setActiveSection(AppSection.DASHBOARD);
      useStore.getState().setActiveSection(AppSection.WORLD);
      useStore.getState().setActiveSection(AppSection.CHARACTERS);

      const state = useStore.getState();
      expect(state.activeSection).toBe(AppSection.CHARACTERS);
    });

    it('应该能够切换相同的section', () => {
      useStore.getState().setActiveSection(AppSection.DASHBOARD);
      useStore.getState().setActiveSection(AppSection.DASHBOARD);

      const state = useStore.getState();
      expect(state.activeSection).toBe(AppSection.DASHBOARD);
    });

    it('应该处理非常长的ID字符串', () => {
      const longId = 'a'.repeat(1000);
      useStore.getState().setActiveChapterId(longId);

      const state = useStore.getState();
      expect(state.activeChapterId).toBe(longId);
    });
  });

  describe('状态转换', () => {
    it('LOBBY -> DASHBOARD 转换', () => {
      useStore.getState().setActiveSection(AppSection.DASHBOARD);
      const state = useStore.getState();
      expect(state.activeSection).toBe(AppSection.DASHBOARD);
    });

    it('DASHBOARD -> WORLD 转换', () => {
      useStore.getState().setActiveSection(AppSection.DASHBOARD);
      useStore.getState().setActiveSection(AppSection.WORLD);

      const state = useStore.getState();
      expect(state.activeSection).toBe(AppSection.WORLD);
    });

    it('任意section -> LOBBY 转换', () => {
      useStore.getState().setActiveSection(AppSection.DRAFTING);
      useStore.getState().setActiveSection(AppSection.LOBBY);

      const state = useStore.getState();
      expect(state.activeSection).toBe(AppSection.LOBBY);
    });
  });
});
