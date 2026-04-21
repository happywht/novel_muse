/**
 * 模板预览组件
 *
 * 显示合并后的模板效果，包括 system prompt 和 user prompt blocks
 */

import React, { useState, useMemo } from 'react';
import {
  Eye, Copy, Check, ChevronDown, ChevronRight,
  AlertCircle, Info, Sparkles
} from 'lucide-react';
import type { TemplateOverride } from '../../types/templateOverride';
import { MergedTemplate } from './index';

interface TemplatePreviewProps {
  template: MergedTemplate;
  override: TemplateOverride | null;
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  override,
}) => {
  const [showSystemPrompt, setShowSystemPrompt] = useState(true);
  const [showUserPrompt, setShowUserPrompt] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedBlockId, setExpandedBlockId] = useState<string | null>(null);

  // 复制到剪贴板
  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // 计算覆盖的区块
  const overriddenBlocks = useMemo(() => {
    if (!override?.blocks) return [];
    return Object.keys(override.blocks).filter(blockId => {
      const blockOverride = override.blocks![blockId];
      return blockOverride && Object.keys(blockOverride).length > 0;
    });
  }, [override]);

  // 计算覆盖的变量
  const overriddenVariables = useMemo(() => {
    if (!override?.variableDefaults) return [];
    return Object.keys(override.variableDefaults);
  }, [override]);

  return (
    <div className="h-full flex flex-col p-6">
      {/* 概览卡片 */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">模板名称</div>
          <div className="text-sm font-medium text-white truncate">{template.label}</div>
        </div>
        <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">区块数量</div>
          <div className="text-sm font-medium text-white">
            {template.sections.length}
            {overriddenBlocks.length > 0 && (
              <span className="text-teal-400 ml-1">({overriddenBlocks.length} 已修改)</span>
            )}
          </div>
        </div>
        <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
          <div className="text-xs text-slate-500 mb-1">变量数量</div>
          <div className="text-sm font-medium text-white">
            {template.variables.length}
            {overriddenVariables.length > 0 && (
              <span className="text-teal-400 ml-1">({overriddenVariables.length} 已修改)</span>
            )}
          </div>
        </div>
      </div>

      {/* 覆盖摘要 */}
      {(overriddenBlocks.length > 0 || overriddenVariables.length > 0 || override?.systemInstruction) && (
        <div className="mb-4 p-3 bg-teal-900/10 border border-teal-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-teal-400" />
            <span className="text-sm font-medium text-teal-300">覆盖摘要</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {override?.systemInstruction && (
              <span className="text-xs px-2 py-1 bg-teal-500/20 text-teal-300 rounded border border-teal-500/30">
                系统指令已修改
              </span>
            )}
            {overriddenBlocks.length > 0 && (
              <span className="text-xs px-2 py-1 bg-teal-500/20 text-teal-300 rounded border border-teal-500/30">
                {overriddenBlocks.length} 区块已修改
              </span>
            )}
            {overriddenVariables.length > 0 && (
              <span className="text-xs px-2 py-1 bg-teal-500/20 text-teal-300 rounded border border-teal-500/30">
                {overriddenVariables.length} 变量已修改
              </span>
            )}
          </div>
        </div>
      )}

      {/* System Prompt */}
      <div className="mb-4">
        <div
          onClick={() => setShowSystemPrompt(!showSystemPrompt)}
          className="w-full flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {showSystemPrompt ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
            <span className="text-sm font-medium text-white">System Prompt</span>
            {override?.systemInstruction && (
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30 ml-2">
                已修改
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(template.systemTemplate, 'system');
            }}
            className="p-1.5 text-slate-400 hover:text-teal-400 transition-colors"
            title="复制"
          >
            {copiedField === 'system' ? <Check size={14} className="text-teal-400" /> : <Copy size={14} />}
          </button>
        </div>
        {showSystemPrompt && (
          <div className="mt-2 p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg">
            <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap overflow-x-auto">
              {template.systemTemplate || <span className="text-slate-600 italic">（空）</span>}
            </pre>
          </div>
        )}
      </div>

      {/* User Prompt Blocks */}
      <div className="flex-1 min-h-0">
        <div
          onClick={() => setShowUserPrompt(!showUserPrompt)}
          className="w-full flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {showUserPrompt ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
            <span className="text-sm font-medium text-white">User Prompt Blocks</span>
            <span className="text-xs text-slate-500">({template.sections.length} 个区块)</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              copyToClipboard(template.userTemplate, 'user');
            }}
            className="p-1.5 text-slate-400 hover:text-teal-400 transition-colors"
            title="复制全部"
          >
            {copiedField === 'user' ? <Check size={14} className="text-teal-400" /> : <Copy size={14} />}
          </button>
        </div>

        {showUserPrompt && (
          <div className="mt-2 space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {template.sections.map((section, index) => {
              const isOverridden = overriddenBlocks.includes(section.id);
              const isDisabled = override?.blocks?.[section.id]?.disabled;
              const isExpanded = expandedBlockId === section.id;

              if (isDisabled) return null;

              return (
                <div
                  key={section.id}
                  className={`rounded-lg border transition-all ${
                    isOverridden
                      ? 'bg-purple-900/10 border-purple-500/20'
                      : 'bg-slate-800/30 border-slate-700/50'
                  }`}
                >
                  {/* 区块头部 */}
                  <div
                    className="flex items-center gap-2 p-3 cursor-pointer"
                    onClick={() => setExpandedBlockId(isExpanded ? null : section.id)}
                  >
                    <span className="text-slate-500 text-xs font-mono w-8 shrink-0">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <button className="text-slate-400 hover:text-white transition-colors">
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    <span className="text-sm text-white flex-1">{section.label}</span>
                    {isOverridden && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                        已修改
                      </span>
                    )}
                    {section.condition && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                        条件
                      </span>
                    )}
                  </div>

                  {/* 区块内容 */}
                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-slate-700/50">
                      {section.template ? (
                        <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap overflow-x-auto">
                          {section.template}
                        </pre>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-600 italic">
                          <Info size={12} />
                          <span className="text-xs">此区块没有模板内容</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplatePreview;
