import React, { useMemo, useCallback } from 'react';
import { PromptPanel, ModuleType } from '../PromptPanel/PromptPanel';
import { PromptItem } from '../PromptPanel/PromptEditor';
import { useProjectStore } from '../../store/useProjectStore';
import { PROMPT_REGISTRY_LITERARY, PROMPT_REGISTRY_WEB_NOVEL } from '../../config/prompts';

/**
 * PromptPanelWrapper - 连接 PromptPanel 到 store 和 config
 *
 * 功能:
 * 1. 从 config/prompts.ts 获取 drafting 模块相关的 prompts
 * 2. 从 store 获取 projectOverrides 和 moduleOverrides
 * 3. 实现 onSave 和 onReset 回调
 */
export const PromptPanelWrapper: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const updateProject = useProjectStore((state) => state.updateProject);

  // 根据 promptProfile 选择 registry
  const registry = useMemo(() => {
    const profile = project.creativeSettings?.promptProfile || 'LITERARY';
    return profile === 'WEB_NOVEL' ? PROMPT_REGISTRY_WEB_NOVEL : PROMPT_REGISTRY_LITERARY;
  }, [project.creativeSettings?.promptProfile]);

  // 过滤 drafting 模块相关的 prompts
  const draftingPrompts = useMemo(() => {
    const promptKeys = ['scene_expansion', 'scene_generation', 'polish_engine'];

    const items: PromptItem[] = promptKeys
      .map((key) => {
        const template = registry[key];
        if (!template) return null;

        // 转换 parameters 格式 (PromptParameter -> ParameterConfig)
        const convertedParameters = template.parameters?.map(param => ({
          key: param.name,
          label: param.label,
          type: param.type,
          min: param.min,
          max: param.max,
          step: param.step,
          options: param.options?.map(opt => ({
            label: opt.label,
            value: opt.value,
          })),
          value: param.default,
          description: param.description,
        }));

        return {
          key: template.key,
          label: template.label,
          description: template.description,
          instruction: template.instruction,
          parameters: convertedParameters,
        } as PromptItem;
      })
      .filter((item): item is PromptItem => item !== null);

    return items;
  }, [registry]);

  // 从 project.customPrompts 获取 projectOverrides
  const projectOverrides = useMemo(() => {
    const overrides: Record<string, string> = {};
    const customPrompts = project.customPrompts || {};

    // 提取 drafting 模块相关的 project 级覆盖
    ['scene_expansion', 'scene_generation', 'polish_engine'].forEach((key) => {
      if (customPrompts[key]) {
        overrides[key] = customPrompts[key];
      }
    });

    return overrides;
  }, [project.customPrompts]);

  // 从 project.modulePrompts 获取 moduleOverrides (如果存在)
  // 目前 project 结构中可能没有 modulePrompts, 我们先使用空对象
  const moduleOverrides = useMemo(() => {
    // TODO: 如果需要模块级覆盖, 可以从 project.modulePrompts?.drafting 中获取
    return {};
  }, []);

  // 保存 prompt 覆盖
  const handleSave = useCallback(
    (key: string, content: string, level: 'PROJECT' | 'MODULE') => {
      const customPrompts = project.customPrompts || {};

      if (level === 'PROJECT') {
        // 项目级覆盖
        updateProject({
          customPrompts: {
            ...customPrompts,
            [key]: content,
          },
        });
      } else {
        // 模块级覆盖 (如果支持)
        // TODO: 实现模块级覆盖存储
        console.warn('Module-level prompt override not yet implemented');
      }
    },
    [project.customPrompts, updateProject]
  );

  // 重置 prompt 覆盖
  const handleReset = useCallback(
    (key: string, level: 'PROJECT' | 'MODULE') => {
      const customPrompts = { ...(project.customPrompts || {}) };

      if (level === 'PROJECT') {
        // 删除项目级覆盖
        delete customPrompts[key];
        updateProject({ customPrompts });
      } else {
        // 模块级覆盖重置
        // TODO: 实现模块级覆盖重置
        console.warn('Module-level prompt override reset not yet implemented');
      }
    },
    [project.customPrompts, updateProject]
  );

  // 全部重置
  const handleResetAll = useCallback(
    (level: 'PROJECT' | 'MODULE') => {
      if (level === 'PROJECT') {
        const customPrompts = { ...(project.customPrompts || {}) };
        ['scene_expansion', 'scene_generation', 'polish_engine'].forEach((key) => {
          delete customPrompts[key];
        });
        updateProject({ customPrompts });
      } else {
        // TODO: 实现模块级全部重置
        console.warn('Module-level prompt reset all not yet implemented');
      }
    },
    [project.customPrompts, updateProject]
  );

  return (
    <PromptPanel
      prompts={draftingPrompts}
      projectOverrides={projectOverrides}
      moduleOverrides={moduleOverrides}
      onSave={handleSave}
      onReset={handleReset}
      onResetAll={handleResetAll}
      mode="collapsed"
      moduleType="drafting"
      title="写作工坊 Prompt 调教"
      subtitle="自定义场景生成、润色等指令"
    />
  );
};
