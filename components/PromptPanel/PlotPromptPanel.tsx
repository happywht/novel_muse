/**
 * PlotPromptPanel - PlotWeaver 专用的 Prompt 鵨板
 * 包装 PromptPanel 组件，专门用于 PlotWeaver 模块
 */

import React, { useMemo, useCallback } from 'react';
import { PromptPanel, PromptItem, MODULE_PROMPT_MAP } from './index';
import { useProjectStore } from '../../store/useProjectStore';
import { PROMPT_REGISTRY_LITERARY, PROMPT_REGISTRY_WEB_NOVEL } from '../../config/prompts';

import { AppSection } from '../../types';

interface PlotPromptPanelProps {
  /** 是否显示为模态框 */
  isModal?: boolean;
  /** 关闭回调 */
  onClose?: () => void;
}

/**
 * PlotPromptPanel - 专为 PlotWeaver 模块设计的 Prompt 管理面板
 */
export const PlotPromptPanel: React.FC<PlotPromptPanelProps> = ({ isModal, onClose }) => {
  const project = useProjectStore((state) => state.project);
  const customPrompts = useProjectStore((state) => state.project.customPrompts);
  const updateProject = useProjectStore((state) => state.updateProject);

  // 根据创作风格选择对应的 prompt registry
  const activeRegistry =
    project.creativeSettings?.promptProfile === 'WEB_NOVEL'
      ? PROMPT_REGISTRY_WEB_NOVEL
      : PROMPT_REGISTRY_LITERARY;

  // 过滤出 Plot 相关的 prompts
  const plotPrompts: PromptItem[] = useMemo(() => {
    const plotKeys = MODULE_PROMPT_MAP.plot;
    return Object.values(activeRegistry)
      .filter((p: any) => plotKeys.includes(p.key) && p.modules?.includes(AppSection.PLOT))
      .map((p: any) => ({
        key: p.key,
        label: p.label,
        description: p.description,
        instruction: p.instruction,
        projectOverride: customPrompts?.[p.key],
      }));
  }, [activeRegistry, customPrompts]);

  // 处理保存
  const handleSave = useCallback(
    (key: string, content: string, level: 'PROJECT' | 'MODULE') => {
      const updatedPrompts = {
        ...customPrompts,
        [key]: content,
      };
      updateProject({ customPrompts: updatedPrompts });
    },
    [customPrompts, updateProject]
  );

  // 处理重置
  const handleReset = useCallback(
    (key: string, level: 'PROJECT' | 'MODULE') => {
      const updatedPrompts = { ...customPrompts };
      delete updatedPrompts[key];
      updateProject({ customPrompts: updatedPrompts });
    },
    [customPrompts, updateProject]
  );

  // 处理全部重置
  const handleResetAll = useCallback(
    (level: 'PROJECT' | 'MODULE') => {
      updateProject({ customPrompts: {} });
    },
    [updateProject]
  );

  return (
    <PromptPanel
      mode="expanded"
      moduleType="plot"
      prompts={plotPrompts}
      projectOverrides={customPrompts || {}}
      onSave={handleSave}
      onReset={handleReset}
      onResetAll={handleResetAll}
      isModal={isModal}
      onClose={onClose}
      title="AI 调教台"
      subtitle="针对剧情编织模块的 Prompt 管理"
    />
  );
};
