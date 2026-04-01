/**
 * TemplatePreview 使用示例
 *
 * 演示如何使用 TemplatePreview 组件
 */

import React, { useState, useMemo } from 'react';
import { TemplatePreview } from './TemplatePreview';
import { mergeTemplateConfig } from '../../services/templateMerge';
import { TemplateOverride, UserTemplatePreferences } from '../../types/templateOverride';

/**
 * 示例组件 - 展示 TemplatePreview 的基本用法
 */
export const TemplatePreviewExample: React.FC = () => {
  // 模拟项目级覆盖配置
  const [projectOverride] = useState<TemplateOverride>({
    templateId: 'scene_generation',
    systemInstruction: '你是一个专业的小说写作助手，擅长生成生动、有深度的场景描写。',
    blocks: {
      genre_info: {
        blockId: 'genre_info',
        template: '[小说类型]: {{genre}}\n[风格基调]: {{style}}',
        order: 1,
      },
    },
    variableDefaults: {
      targetWordCount: 3000,
    },
  });

  // 模拟用户级偏好
  const [userPreference] = useState<UserTemplatePreferences>({
    version: '1.0.0',
    lastModified: new Date().toISOString(),
    globalVariableDefaults: {
      creativityLevel: 0.8,
    },
  });

  // 模拟变量值
  const [variableValues] = useState<Record<string, unknown>>({
    genre: '玄幻',
    style: '热血',
    targetWordCount: 3000,
    creativityLevel: 0.8,
    sceneContext: '主角在山顶修炼，突然突破境界',
  });

  // 合并模板
  const mergedResult = useMemo(() => {
    try {
      return mergeTemplateConfig('scene_generation', projectOverride, userPreference);
    } catch (error) {
      console.error('Failed to merge template:', error);
      return null;
    }
  }, [projectOverride, userPreference]);

  if (!mergedResult) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
        <p className="text-red-300">加载模板失败</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-white">模板预览示例</h2>

      {/* 基本用法 */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-400">基本预览（带变量值）</h3>
        <TemplatePreview
          mergedResult={mergedResult}
          variableValues={variableValues}
          defaultExpanded={true}
          showVariables={true}
          showSources={true}
          enableLivePreview={true}
        />
      </div>

      {/* 紧凑模式 */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-400">紧凑模式（默认折叠）</h3>
        <TemplatePreview
          mergedResult={mergedResult}
          defaultExpanded={false}
          showVariables={false}
        />
      </div>

      {/* 只读模式 */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-slate-400">只读模式（不显示来源）</h3>
        <TemplatePreview
          mergedResult={mergedResult}
          variableValues={variableValues}
          showSources={false}
          enableLivePreview={false}
        />
      </div>
    </div>
  );
};

/**
 * 在 PromptPanel 中集成 TemplatePreview 的示例
 */
export const PromptPanelWithPreview: React.FC = () => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('scene_generation');
  const [showPreview, setShowPreview] = useState(true);

  // 这里应该从实际的 store 或 context 中获取
  const projectOverride = undefined;
  const userPreference = undefined;

  const mergedResult = useMemo(() => {
    try {
      return mergeTemplateConfig(selectedTemplateId, projectOverride, userPreference);
    } catch (error) {
      return null;
    }
  }, [selectedTemplateId, projectOverride, userPreference]);

  return (
    <div className="space-y-4">
      {/* 模板选择器 */}
      <div className="flex items-center gap-3">
        <select
          value={selectedTemplateId}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="scene_generation">场景生成</option>
          <option value="character_gen">角色创建</option>
          <option value="plot_weaving">情节编织</option>
        </select>

        <button
          onClick={() => setShowPreview(!showPreview)}
          className="px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition-colors"
        >
          {showPreview ? '隐藏预览' : '显示预览'}
        </button>
      </div>

      {/* 预览面板 */}
      {showPreview && mergedResult && (
        <TemplatePreview
          mergedResult={mergedResult}
          defaultExpanded={true}
          showVariables={true}
          showSources={true}
        />
      )}
    </div>
  );
};

export default TemplatePreviewExample;
