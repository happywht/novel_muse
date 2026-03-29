import React, { useMemo, useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { PromptPanel, ModuleType } from '../PromptPanel/PromptPanel';
import { PromptItem } from '../PromptPanel/PromptEditor';
import { useProjectStore } from '../../store/useProjectStore';
import { PROMPT_REGISTRY_LITERARY, PROMPT_REGISTRY_WEB_NOVEL } from '../../config/prompts';

/**
 * PromptPanelWrapper - CharacterCreator 模块的 Prompt 面板包装器
 *
 * 功能:
 * 1. 从 config/prompts.ts 获取 character 模块相关的 prompts (character_gen)
 * 2. 从 store 获取 projectOverrides 和 moduleOverrides
 * 3. 实现 onSave 和 onReset 回调
 * 4. 提供可折叠的侧边栏功能
 */
export const PromptPanelWrapper: React.FC = () => {
  const project = useProjectStore((state) => state.project);
  const updateProject = useProjectStore((state) => state.updateProject);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 根据 promptProfile 选择 registry
  const registry = useMemo(() => {
    const profile = project.creativeSettings?.promptProfile || 'LITERARY';
    return profile === 'WEB_NOVEL' ? PROMPT_REGISTRY_WEB_NOVEL : PROMPT_REGISTRY_LITERARY;
  }, [project.creativeSettings?.promptProfile]);

  // 过滤 character 模块相关的 prompts
  const characterPrompts = useMemo(() => {
    const promptKeys = ['character_gen'];

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

    // 提取 character 模块相关的 project 级覆盖
    ['character_gen'].forEach((key) => {
      if (customPrompts[key]) {
        overrides[key] = customPrompts[key];
      }
    });

    return overrides;
  }, [project.customPrompts]);

  // 模块级覆盖（目前为空，可扩展）
  const moduleOverrides = useMemo(() => {
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
        ['character_gen'].forEach((key) => {
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

  // 折叠状态切换
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // 折叠状态下只显示展开按钮
  if (isCollapsed) {
    return (
      <div className="flex-shrink-0 w-10 flex flex-col items-center py-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
        <button
          onClick={toggleCollapse}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
          title="展开 Prompt 配置面板"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="mt-3 writing-mode-vertical text-[10px] text-slate-500">
          Prompt
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 w-80 relative">
      {/* 折叠按钮 */}
      <button
        onClick={toggleCollapse}
        className="absolute -left-3 top-4 z-10 p-1.5 bg-slate-700 border border-slate-600 rounded-md text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
        title="收起面板"
      >
        <ChevronRight size={14} />
      </button>

      <PromptPanel
        prompts={characterPrompts}
        projectOverrides={projectOverrides}
        moduleOverrides={moduleOverrides}
        onSave={handleSave}
        onReset={handleReset}
        onResetAll={handleResetAll}
        mode="collapsed"
        moduleType="character"
        title="角色生成 Prompt 调教"
        subtitle="自定义角色生成的 AI 指令"
      />
    </div>
  );
};

export default PromptPanelWrapper;
