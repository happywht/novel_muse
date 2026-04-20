/**
 * TemplatePreview - 模板实时预览组件
 *
 * 功能：
 * 1. 显示合并后的 system prompt
 * 2. 显示合并后的 user prompt blocks
 * 3. 高亮显示覆盖的区块
 * 4. 支持复制功能
 * 5. 显示变量列表和值
 * 6. 使用模板引擎进行预览渲染
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Eye, Copy, Check, ChevronDown, ChevronRight,
  Sparkles, AlertCircle, Variable, FileText, Layers,
} from 'lucide-react';
import type { MergedTemplateResult, TemplateSource } from '../../types/templateOverride';
import type { PromptTemplateDefinition, TemplateSection, PromptVariable } from '../../types/promptTemplate';
import { templateEngine, estimateTokens } from '@/services/templateEngine';

/**
 * TemplatePreview 组件属性
 */
export interface TemplatePreviewProps {
  /** 合并后的模板结果 */
  mergedResult: MergedTemplateResult;
  /** 变量值（用于渲染预览） */
  variableValues?: Record<string, unknown>;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
  /** 最大高度（像素） */
  maxHeight?: number;
  /** 是否显示变量列表 */
  showVariables?: boolean;
  /** 是否显示来源标记 */
  showSources?: boolean;
  /** 是否启用实时预览 */
  enableLivePreview?: boolean;
}

/**
 * 区块预览项
 */
interface BlockPreview {
  id: string;
  label: string;
  content: string;
  source: TemplateSource;
  rendered?: string;
  disabled?: boolean;
}

/**
 * 变量项类型
 */
interface VariableItem {
  name: string;
  type: string;
  description: string;
  defaultValue?: unknown;
  currentValue?: unknown;
  source: TemplateSource;
  required: boolean;
}

// 辅助函数：从用户模板中提取区块内容
function extractBlockContent(userTemplate: string, blockId: string): string {
  // 简化处理：查找区块标记
  const regex = new RegExp(`\\[${blockId}\\]([\\s\\S]*?)(?=\\[|$)`, 'i');
  const match = userTemplate.match(regex);
  return match ? match[1].trim() : '';
}

export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  mergedResult,
  variableValues = {},
  defaultExpanded = false,
  maxHeight = 600,
  showVariables = true,
  showSources = true,
  enableLivePreview = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showRendered, setShowRendered] = useState(enableLivePreview);

  // 提取模板和来源信息
  const { template, sources, warnings } = mergedResult;

  // 处理系统指令
  const systemInstruction = useMemo(() => {
    return template.systemTemplate || '';
  }, [template.systemTemplate]);

  // 系统指令来源标记
  const systemSource = sources.systemInstruction;

  // 处理用户提示区块
  const blockPreviews = useMemo(() => {
    const previews: BlockPreview[] = [];

    // 从 sections 中提取区块信息
    template.sections.forEach((section) => {
      const blockContent = extractBlockContent(template.userTemplate, section.id);

      previews.push({
        id: section.id,
        label: section.label,
        content: blockContent,
        source: sources.blocks[section.id] || 'default',
        disabled: false,
      });
    });

    return previews;
  }, [template.sections, template.userTemplate, sources.blocks]);

  // 渲染后的系统指令
  const renderedSystemInstruction = useMemo(() => {
    if (!showRendered) return systemInstruction;
    try {
      return templateEngine.render(systemInstruction, variableValues);
    } catch (error) {
      return systemInstruction;
    }
  }, [systemInstruction, variableValues, showRendered]);

  // 渲染后的区块列表
  const renderedBlocks = useMemo(() => {
    if (!showRendered) return blockPreviews;

    return blockPreviews.map((block) => ({
      ...block,
      rendered: templateEngine.render(block.content, variableValues),
    }));
  }, [blockPreviews, variableValues, showRendered]);

  // 变量列表（合并默认值和当前值）
  const variableList = useMemo((): VariableItem[] => {
    return template.variables.map((variable) => ({
      name: variable.name,
      type: variable.type,
      description: variable.description,
      defaultValue: variable.defaultValue,
      currentValue: variableValues[variable.name],
      source: sources.variables[variable.name] || 'default',
      required: variable.required,
    }));
  }, [template.variables, variableValues, sources.variables]);

  // Token 估算
  const tokenEstimate = useMemo(() => {
    const systemTokens = estimateTokens(renderedSystemInstruction);
    const userTokens = renderedBlocks.reduce((sum, block) => {
      const content = showRendered && block.rendered ? block.rendered : block.content;
      return sum + estimateTokens(content);
    }, 0);

    return {
      system: systemTokens,
      user: userTokens,
      total: systemTokens + userTokens,
    };
  }, [renderedSystemInstruction, renderedBlocks, showRendered]);

  // 复制功能
  const handleCopy = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, []);

  // 复制完整提示
  const handleCopyAll = useCallback(async () => {
    const fullPrompt = `=== System Instruction ===\n${renderedSystemInstruction}\n\n=== User Prompt ===\n${renderedBlocks
      .map((block) => {
        const content = showRendered && block.rendered ? block.rendered : block.content;
        return `--- ${block.label} ---\n${content}`;
      })
      .join('\n\n')}`;

    await handleCopy(fullPrompt, 'all');
  }, [renderedSystemInstruction, renderedBlocks, showRendered, handleCopy]);

  // 获取来源标记样式
  const getSourceStyle = (source: TemplateSource) => {
    switch (source) {
      case 'user':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'project':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'default':
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  // 获取来源文本
  const getSourceText = (source: TemplateSource) => {
    switch (source) {
      case 'user':
        return '用户级';
      case 'project':
        return '项目级';
      case 'default':
      default:
        return '默认';
    }
  };

  // 渲染变量项
  const renderVariableItem = (variable: VariableItem) => {
    const hasValue = variable.currentValue !== undefined || variable.defaultValue !== undefined;
    const displayValue = variable.currentValue ?? variable.defaultValue;

    return (
      <div
        key={variable.name}
        className="flex items-center justify-between py-2 px-3 bg-slate-900/40 rounded-lg border border-slate-700/30"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Variable size={12} className="text-blue-400 shrink-0" />
          <span className="text-sm font-mono text-white truncate">{variable.name}</span>
          {variable.required && (
            <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded border border-red-500/30">
              必填
            </span>
          )}
          {showSources && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getSourceStyle(variable.source)}`}>
              {getSourceText(variable.source)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{variable.type}</span>
          {hasValue && (
            <span className="text-xs text-slate-400 font-mono max-w-32 truncate">
              {typeof displayValue === 'object' ? JSON.stringify(displayValue) : String(displayValue)}
            </span>
          )}
        </div>
      </div>
    );
  };

  // 渲染区块项
  const renderBlockItem = (block: BlockPreview) => {
    const displayContent = showRendered && block.rendered ? block.rendered : block.content;
    const isOverridden = block.source !== 'default';

    return (
      <div
        key={block.id}
        className={`rounded-lg border ${
          isOverridden
            ? 'bg-purple-900/10 border-purple-500/30'
            : 'bg-slate-800/30 border-slate-700/50'
        }`}
      >
        <div className="flex items-center justify-between p-3 border-b border-slate-700/30">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-slate-400" />
            <span className="text-sm font-medium text-white">{block.label}</span>
            {isOverridden && (
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded border border-purple-500/30">
                已修改
              </span>
            )}
            {showSources && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getSourceStyle(block.source)}`}>
                {getSourceText(block.source)}
              </span>
            )}
          </div>
          <button
            onClick={() => handleCopy(displayContent, `block-${block.id}`)}
            className="p-1.5 text-slate-400 hover:text-teal-400 transition-colors"
            title="复制"
          >
            {copiedField === `block-${block.id}` ? <Check size={14} className="text-teal-400" /> : <Copy size={14} />}
          </button>
        </div>
        <div className="p-3">
          <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap overflow-x-auto">
            {displayContent || <span className="text-slate-600 italic">（空区块）</span>}
          </pre>
        </div>
      </div>
    );
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-lg text-sm text-slate-300 transition-colors"
      >
        <Eye size={14} />
        <span>预览模板</span>
        <ChevronRight size={14} />
      </button>
    );
  }

  return (
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-teal-400" />
          <span className="font-medium text-white">模板预览</span>
          {showRendered && (
            <span className="text-[10px] px-1.5 py-0.5 bg-teal-500/20 text-teal-300 rounded border border-teal-500/30">
              实时渲染
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRendered(!showRendered)}
            className={`p-1.5 rounded transition-colors ${
              showRendered ? 'text-teal-400 bg-teal-500/10' : 'text-slate-400 hover:text-slate-300'
            }`}
            title={showRendered ? '显示原始模板' : '启用实时渲染'}
          >
            <Sparkles size={14} />
          </button>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1.5 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* 警告信息 */}
      {warnings && warnings.length > 0 && (
        <div className="px-4 py-2 bg-amber-900/20 border-b border-amber-500/20">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-amber-400 mt-0.5 shrink-0" />
            <div className="text-xs text-amber-300">
              {warnings.map((warning, i) => (
                <div key={i}>{warning}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Token 估算 */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800/30 border-b border-slate-700/30 text-xs">
        <span className="text-slate-500">Token 估算</span>
        <div className="flex items-center gap-3">
          <span className="text-slate-400">System: <span className="text-white">{tokenEstimate.system}</span></span>
          <span className="text-slate-400">User: <span className="text-white">{tokenEstimate.user}</span></span>
          <span className="text-teal-400 font-medium">Total: {tokenEstimate.total}</span>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: `${maxHeight}px` }}>
        {/* System Instruction */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-slate-400" />
              <span className="text-sm font-medium text-white">System Instruction</span>
              {showSources && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getSourceStyle(systemSource)}`}>
                  {getSourceText(systemSource)}
                </span>
              )}
            </div>
            <button
              onClick={() => handleCopy(renderedSystemInstruction, 'system')}
              className="p-1.5 text-slate-400 hover:text-teal-400 transition-colors"
              title="复制"
            >
              {copiedField === 'system' ? <Check size={14} className="text-teal-400" /> : <Copy size={14} />}
            </button>
          </div>
          <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap overflow-x-auto bg-slate-900/50 p-3 rounded-lg border border-slate-700/30">
            {renderedSystemInstruction || <span className="text-slate-600 italic">（空）</span>}
          </pre>
        </div>

        {/* User Prompt Blocks */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers size={14} className="text-slate-400" />
              <span className="text-sm font-medium text-white">User Prompt Blocks</span>
              <span className="text-xs text-slate-500">({blockPreviews.length} 个区块)</span>
            </div>
            <button
              onClick={handleCopyAll}
              className="p-1.5 text-slate-400 hover:text-teal-400 transition-colors flex items-center gap-1"
              title="复制全部"
            >
              {copiedField === 'all' ? <Check size={14} className="text-teal-400" /> : <Copy size={14} />}
              <span className="text-xs">全部</span>
            </button>
          </div>
          <div className="space-y-2">
            {renderedBlocks.map((block) => renderBlockItem(block))}
          </div>
        </div>

        {/* 变量列表 */}
        {showVariables && variableList.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Variable size={14} className="text-indigo-400" />
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                变量列表 ({variableList.length})
              </label>
            </div>
            <div className="space-y-2">
              {variableList.map((variable) => renderVariableItem(variable))}
            </div>
          </div>
        )}
      </div>

      {/* 复制全部按钮 */}
      <div className="px-4 py-3 bg-slate-800/50 border-t border-slate-700/50">
        <button
          onClick={handleCopyAll}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors"
        >
          {copiedField === 'all' ? <Check size={16} /> : <Copy size={16} />}
          <span>{copiedField === 'all' ? '已复制!' : '复制完整提示'}</span>
        </button>
      </div>
    </div>
  );
};

export default TemplatePreview;
