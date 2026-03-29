import React, { useMemo, useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { PromptPanel, ModuleType } from '../PromptPanel/PromptPanel';
import { PromptItem } from '../PromptPanel/PromptEditor';
import { useProjectStore } from '../../store/useProjectStore';
import { PROMPT_REGISTRY_LITERARY, PROMPT_REGISTRY_WEB_NOVEL } from '../../config/prompts';

/**
 * PromptPanelWrapper - 连接 PromptPanel 到 store 和 config (ChapterOutliner 版本)
 *
 * 功能:
 * 1. 从 config/prompts.ts 获取 outliner 模块相关的 prompts (主要是 plot_fission)
 * 2. 从 store 获取 projectOverrides 和 moduleOverrides
 * 3. 实现 onSave 和 onReset 回调
 * 4. 提供可折叠的右侧栏
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

  // 过滤 outliner 模块相关的 prompts (主要是 plot_fission)
  const outlinerPrompts = useMemo(() => {
    // 主要使用 plot_fission，也可以包含其他相关 prompts
    const promptKeys = ['plot_fission', 'plot_rewrite', 'audit_plot'];

    const items: PromptItem[] = promptKeys
      .map((key) => {
        const template = registry[key];
        if (!template) return null;

        // 转换 parameters 格式 (PromptParameter -> ParameterConfig)
        const convertedParameters = template.parameters?.map((param) => ({
          key: param.name,
          label: param.label,
          type: param.type,
          min: param.min,
          max: param.max,
          step: param.step,
          options: param.options?.map((opt) => ({
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

    // 提取 outliner 模块相关的 project 级覆盖
    ['plot_fission', 'plot_rewrite', 'audit_plot'].forEach((key) => {
      if (customPrompts[key]) {
        overrides[key] = customPrompts[key];
      }
    });

    return overrides;
  }, [project.customPrompts]);

  // 从 project.modulePrompts 获取 moduleOverrides (如果存在)
  // 目前 project 结构中可能没有 modulePrompts, 我们先使用空对象
  const moduleOverrides = useMemo(() => {
    // TODO: 如果需要模块级覆盖, 可以从 project.modulePrompts?.outliner 中获取
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
        ['plot_fission', 'plot_rewrite', 'audit_plot'].forEach((key) => {
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

  return (
    <div className="relative flex h-full">
      {/* 折叠按钮 */}
      <button
        onClick={toggleCollapse}
        className="absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-4 h-16 bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 rounded-l-md flex items-center justify-center transition-colors group"
        title={isCollapsed ? '展开 Prompt 面板' : '折叠 Prompt 面板'}
      >
        {isCollapsed ? (
          <ChevronLeft size={14} className="text-slate-400 group-hover:text-white" />
        ) : (
          <ChevronRight size={14} className="text-slate-400 group-hover:text-white" />
        )}
      </button>

      {/* Prompt 面板 */}
      <div
        className={`transition-all duration-300 ease-in-out h-full ${
          isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-80 opacity-100'
        }`}
      >
        <div className="h-full w-80">
          <PromptPanel
            prompts={outlinerPrompts}
            projectOverrides={projectOverrides}
            moduleOverrides={moduleOverrides}
            onSave={handleSave}
            onReset={handleReset}
            onResetAll={handleResetAll}
            mode="collapsed"
            moduleType="plot"
            title="章节规划 Prompt 调教"
            subtitle="自定义情节裂变、审计等指令"
          />
        </div>
      </div>

      {/* 折叠状态下的迷你按钮 */}
      {isCollapsed && (
        <button
          onClick={toggleCollapse}
          className="flex-shrink-0 w-10 h-10 bg-slate-800/60 hover:bg-slate-700 border border-slate-700/50 rounded-lg flex items-center justify-center transition-colors group ml-2"
          title="展开 Prompt 面板"
        >
          <Settings2 size={18} className="text-purple-400 group-hover:text-purple-300" />
        </button>
      )}
    </div>
  );
};

export default PromptPanelWrapper;
