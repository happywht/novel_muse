import React, { useState, useCallback } from 'react';
import { Save, RotateCcw, ChevronDown, ChevronRight, Sparkles, Info } from 'lucide-react';
import { EffectBadge, getEffectLevel, EffectLevel } from './EffectBadge';
import { ParameterControl, ParameterConfig } from './ParameterControl';

/**
 * Prompt 模板定义
 */
export interface PromptTemplate {
  key: string;
  label: string;
  description: string;
  instruction: string;
}

/**
 * Prompt 编辑项
 */
export interface PromptItem extends PromptTemplate {
  /** 项目级覆盖内容 */
  projectOverride?: string;
  /** 模块级覆盖内容 */
  moduleOverride?: string;
  /** 关联的参数控制 */
  parameters?: ParameterConfig[];
}

interface PromptEditorProps {
  /** prompt 项 */
  item: PromptItem;
  /** 保存回调 */
  onSave: (key: string, content: string, level: 'PROJECT' | 'MODULE') => void;
  /** 重置回调 */
  onReset: (key: string, level: 'PROJECT' | 'MODULE') => void;
  /** 默认展开状态 */
  defaultExpanded?: boolean;
  /** 编辑层级 */
  editLevel?: 'PROJECT' | 'MODULE';
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * PromptEditor - Prompt 编辑器组件
 *
 * 功能：
 * 1. 显示 prompt 模板信息
 * 2. 支持项目/模块级覆盖编辑
 * 3. 显示生效层级 Badge
 * 4. 参数控制面板
 */
export const PromptEditor: React.FC<PromptEditorProps> = ({
  item,
  onSave,
  onReset,
  defaultExpanded = false,
  editLevel = 'PROJECT',
  disabled = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');

  // 计算当前生效层级
  const effectLevel: EffectLevel = getEffectLevel(!!item.moduleOverride, !!item.projectOverride);

  // 获取当前生效的内容
  const activeContent = item.moduleOverride || item.projectOverride || item.instruction;

  // 判断是否有修改
  const hasOverride = !!(item.moduleOverride || item.projectOverride);

  // 开始编辑
  const handleStartEdit = useCallback(() => {
    setEditContent(item.moduleOverride || item.projectOverride || '');
    setIsEditing(true);
  }, [item.moduleOverride, item.projectOverride]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditContent('');
    setIsEditing(false);
  }, []);

  // 保存编辑
  const handleSave = useCallback(() => {
    onSave(item.key, editContent, editLevel);
    setIsEditing(false);
  }, [item.key, editContent, editLevel, onSave]);

  // 重置
  const handleReset = useCallback(() => {
    if (confirm('确定要恢复为默认设置吗？')) {
      onReset(item.key, editLevel);
      setIsEditing(false);
    }
  }, [item.key, editLevel, onReset]);

  return (
    <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl overflow-hidden transition-all duration-200 hover:border-slate-600/60">
      {/* 头部 - 可折叠 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-white">{item.label}</span>
          <EffectBadge level={effectLevel} size="sm" />
          {hasOverride && (
            <span className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30 flex items-center gap-1">
              <Sparkles size={10} />
              已自定义
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown size={16} className="text-slate-400" />
        ) : (
          <ChevronRight size={16} className="text-slate-400" />
        )}
      </button>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-700/50 pt-4">
          {/* 描述 */}
          <div className="flex items-start gap-2">
            <Info size={14} className="text-slate-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-400">{item.description}</p>
          </div>

          {/* 参数控制 */}
          {item.parameters && item.parameters.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-900/40 rounded-lg border border-slate-700/30">
              {item.parameters.map((param) => (
                <ParameterControl key={param.key} config={param} disabled={disabled} />
              ))}
            </div>
          )}

          {/* 默认指令预览（只读） */}
          {!isEditing && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                默认指令
              </label>
              <div className="bg-slate-900/60 border border-slate-700/30 rounded-lg p-3 text-xs text-slate-400 font-mono leading-relaxed max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                {item.instruction}
              </div>
            </div>
          )}

          {/* 已覆盖内容预览 */}
          {!isEditing && hasOverride && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider">
                当前生效内容
              </label>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-200/80 font-mono leading-relaxed max-h-32 overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                {activeContent}
              </div>
            </div>
          )}

          {/* 编辑区域 */}
          {isEditing ? (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                自定义内容 ({editLevel === 'MODULE' ? '模块级' : '项目级'})
              </label>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                placeholder={item.instruction}
                rows={6}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none resize-none font-mono leading-relaxed"
                disabled={disabled}
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-600">{editContent.length} / 2000 字</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
                    disabled={disabled}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={disabled || !editContent.trim()}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <Save size={12} />
                    保存
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* 操作按钮 */
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleReset}
                disabled={disabled || !hasOverride}
                className="text-xs text-slate-500 hover:text-slate-300 disabled:text-slate-600 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={12} />
                恢复默认
              </button>
              <button
                onClick={handleStartEdit}
                disabled={disabled}
                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
              >
                {hasOverride ? '编辑自定义' : '自定义此指令'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PromptEditor;
