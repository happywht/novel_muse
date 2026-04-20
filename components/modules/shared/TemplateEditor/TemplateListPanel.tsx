/**
 * 模板列表面板组件
 *
 * 显示所有可用模板的列表，支持选择和高亮覆盖状态
 */

import React from 'react';
import { FileCode, Sparkles, Check } from 'lucide-react';
import { TemplateSummary } from './index';

interface TemplateListPanelProps {
  templates: TemplateSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

export const TemplateListPanel: React.FC<TemplateListPanelProps> = ({
  templates,
  selectedId,
  onSelect,
  isLoading,
}) => {
  if (isLoading && templates.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
        <FileCode size={32} className="text-slate-700 mb-3" />
        <p className="text-sm text-slate-500">没有找到匹配的模板</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
      <div className="space-y-1">
        {templates.map(template => {
          const isSelected = selectedId === template.id;
          const hasOverride = template.hasOverride;

          return (
            <button
              key={template.id}
              onClick={() => onSelect(template.id)}
              className={`w-full text-left p-3 rounded-lg transition-all ${
                isSelected
                  ? 'bg-teal-500/15 border border-teal-500/30'
                  : 'bg-slate-800/30 border border-transparent hover:bg-slate-800/50 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium truncate ${
                      isSelected ? 'text-teal-300' : 'text-white'
                    }`}>
                      {template.name}
                    </span>
                    {hasOverride && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 shrink-0">
                        <Sparkles size={10} />
                        已修改
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{template.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] px-2 py-0.5 bg-slate-700/50 text-slate-400 rounded">
                      {template.category}
                    </span>
                    {template.overrideSummary && (
                      <span className="text-[10px] text-slate-500">
                        {template.overrideSummary.overriddenBlocks > 0 && `${template.overrideSummary.overriddenBlocks} 区块`}
                        {template.overrideSummary.overriddenBlocks > 0 && template.overrideSummary.overriddenVariables > 0 && ' · '}
                        {template.overrideSummary.overriddenVariables > 0 && `${template.overrideSummary.overriddenVariables} 变量`}
                      </span>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <Check size={16} className="text-teal-400 shrink-0 mt-1" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TemplateListPanel;
