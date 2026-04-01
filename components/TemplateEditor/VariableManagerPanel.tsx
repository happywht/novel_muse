/**
 * 变量管理面板组件
 *
 * 用于编辑模板变量的默认值
 */

import React, { useState, useMemo } from 'react';
import {
  Search, Filter, Edit2, Save, RotateCcw, X, AlertCircle, Check
} from 'lucide-react';
import type { PromptVariable } from '../../types/promptTemplate';

interface VariableManagerPanelProps {
  templateId: string;
  templateName: string;
  variables: PromptVariable[];
  values: Record<string, unknown>;
  onSave: (name: string, value: unknown) => void;
  onReset: (name: string) => void;
  onResetAll: () => void;
  disabled?: boolean;
  isModal?: boolean;
  onClose?: () => void;
}

export const VariableManagerPanel: React.FC<VariableManagerPanelProps> = ({
  templateId,
  templateName,
  variables,
  values,
  onSave,
  onReset,
  onResetAll,
  disabled = false,
  isModal = false,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [editingVarName, setEditingVarName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // 过滤变量
  const filteredVariables = useMemo(() => {
    return variables.filter(v => {
      const matchesSearch = !searchQuery ||
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTier = tierFilter === 'all' || v.tier === tierFilter;
      return matchesSearch && matchesTier;
    });
  }, [variables, searchQuery, tierFilter]);

  // 获取变量显示值
  const getDisplayValue = (v: PromptVariable): string => {
    const value = values[v.name];
    if (value !== undefined) {
      return JSON.stringify(value);
    }
    if (v.defaultValue !== undefined) {
      return JSON.stringify(v.defaultValue);
    }
    return '';
  };

  // 检查变量是否被覆盖
  const isOverridden = (v: PromptVariable): boolean => {
    return values[v.name] !== undefined;
  };

  // 开始编辑变量
  const startEditing = (v: PromptVariable) => {
    setEditingVarName(v.name);
    setEditValue(getDisplayValue(v));
    setValidationError(null);
  };

  // 验证值
  const validateValue = (value: string, type: string): boolean => {
    if (!value.trim()) return true; // 空值允许

    try {
      const parsed = JSON.parse(value);
      switch (type) {
        case 'string':
          return typeof parsed === 'string';
        case 'number':
          return typeof parsed === 'number';
        case 'boolean':
          return typeof parsed === 'boolean';
        case 'array':
          return Array.isArray(parsed);
        case 'object':
          return typeof parsed === 'object' && !Array.isArray(parsed);
        default:
          return true;
      }
    } catch {
      return false;
    }
  };

  // 保存编辑
  const saveEdit = () => {
    if (!editingVarName) return;

    const variable = variables.find(v => v.name === editingVarName);
    if (!variable) return;

    if (!editValue.trim()) {
      // 空值，重置变量
      onReset(editingVarName);
      setEditingVarName(null);
      setEditValue('');
      return;
    }

    if (!validateValue(editValue, variable.type)) {
      setValidationError(`类型不匹配：期望 ${variable.type}`);
      return;
    }

    try {
      const parsedValue = JSON.parse(editValue);
      onSave(editingVarName, parsedValue);
      setEditingVarName(null);
      setEditValue('');
      setValidationError(null);
    } catch (err) {
      setValidationError('无效的 JSON 格式');
    }
  };

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'string': return 'T';
      case 'number': return '#';
      case 'boolean': return 'B';
      case 'array': return '[]';
      case 'object': return '{}';
      default: return '?';
    }
  };

  // 获取层级颜色
  const getTierStyles = (tier: string) => {
    switch (tier) {
      case 'critical':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'important':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'optional':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  // 获取来源标签
  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'user_input': return '用户输入';
      case 'project_state': return '项目状态';
      case 'computed': return '系统计算';
      case 'derived': return '派生';
      case 'optional': return '可选';
      default: return source;
    }
  };

  const containerClass = isModal
    ? "bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col max-h-[70vh]"
    : "h-full flex flex-col";

  return (
    <div className={containerClass}>
      {/* 头部 */}
      <div className="p-4 border-b border-slate-700/50 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white">
            变量管理
            <span className="text-slate-500 ml-2 font-normal">
              ({variables.length} 个变量)
            </span>
          </h3>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* 搜索和过滤 */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索变量..."
              className="w-full pl-9 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-teal-500"
          >
            <option value="all">全部层级</option>
            <option value="critical">核心</option>
            <option value="important">重要</option>
            <option value="optional">可选</option>
          </select>
        </div>
      </div>

      {/* 变量列表 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {filteredVariables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertCircle size={32} className="text-slate-700 mb-3" />
            <p className="text-sm text-slate-500">没有找到匹配的变量</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredVariables.map(v => {
              const overridden = isOverridden(v);
              const isEditing = editingVarName === v.name;
              const displayValue = getDisplayValue(v);

              return (
                <div
                  key={v.name}
                  className={`p-3 rounded-lg border transition-all ${
                    overridden
                      ? 'bg-teal-900/10 border-teal-500/20'
                      : 'bg-slate-800/30 border-slate-700/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-white">{v.name}</span>
                        {v.required && (
                          <span className="text-red-400">*</span>
                        )}
                        {overridden && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-teal-500/20 text-teal-300 rounded border border-teal-500/30">
                            已修改
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{v.description}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {/* 类型标签 */}
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded font-mono">
                        {getTypeIcon(v.type)}
                      </span>
                      {/* 层级标签 */}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getTierStyles(v.tier)}`}>
                        {v.tier === 'critical' ? '核心' : v.tier === 'important' ? '重要' : '可选'}
                      </span>
                      {/* 来源标签 */}
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded">
                        {getSourceLabel(v.source)}
                      </span>
                    </div>
                  </div>

                  {/* 值编辑 */}
                  {isEditing ? (
                    <div className="mt-2">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className={`w-full px-3 py-2 bg-slate-900 border ${
                          validationError ? 'border-red-500' : 'border-slate-700'
                        } rounded-lg text-sm text-slate-300 font-mono resize-none focus:outline-none focus:border-teal-500`}
                        rows={3}
                        placeholder="输入 JSON 格式的值..."
                        disabled={disabled}
                      />
                      {validationError && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} />
                          {validationError}
                        </p>
                      )}
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => {
                            setEditingVarName(null);
                            setEditValue('');
                            setValidationError(null);
                          }}
                          className="px-3 py-1 text-xs text-slate-400 hover:text-white transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={disabled}
                          className="px-3 py-1 text-xs bg-teal-600 hover:bg-teal-500 text-white rounded transition-colors flex items-center gap-1 disabled:opacity-50"
                        >
                          <Save size={12} />
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-2">
                        {displayValue ? (
                          <code className="text-xs bg-slate-900/50 px-2 py-1 rounded text-cyan-400 font-mono block truncate">
                            {displayValue}
                          </code>
                        ) : (
                          <span className="text-xs text-slate-600 italic">（无默认值）</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEditing(v)}
                          disabled={disabled}
                          className="p-1 text-slate-500 hover:text-teal-400 transition-colors disabled:opacity-50"
                          title="编辑"
                        >
                          <Edit2 size={14} />
                        </button>
                        {overridden && (
                          <button
                            onClick={() => onReset(v.name)}
                            disabled={disabled}
                            className="p-1 text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50"
                            title="重置"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      {filteredVariables.some(v => isOverridden(v)) && (
        <div className="p-4 border-t border-slate-700/50 shrink-0">
          <button
            onClick={onResetAll}
            disabled={disabled}
            className="w-full py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RotateCcw size={14} />
            重置所有变量
          </button>
        </div>
      )}
    </div>
  );
};

export default VariableManagerPanel;
