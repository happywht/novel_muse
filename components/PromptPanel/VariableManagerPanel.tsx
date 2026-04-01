import React, { useState, useMemo, useCallback } from 'react';
import {
  Variable,
  X,
  Search,
  Filter,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle,
  Info,
} from 'lucide-react';
import {
  PromptVariable,
  VariableTier,
  VariableSource,
} from '../../types/promptTemplate';

/**
 * 变量层级配置
 */
const TIER_CONFIG: Record<VariableTier, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  critical: {
    label: '核心',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
  },
  important: {
    label: '重要',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  optional: {
    label: '可选',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
  },
};

/**
 * 变量来源配置
 */
const SOURCE_CONFIG: Record<VariableSource, {
  label: string;
  color: string;
}> = {
  user_input: { label: '用户输入', color: 'text-blue-400' },
  project_state: { label: '项目状态', color: 'text-purple-400' },
  computed: { label: '系统计算', color: 'text-emerald-400' },
  derived: { label: '推导数据', color: 'text-cyan-400' },
  optional: { label: '可选来源', color: 'text-slate-400' },
};

/**
 * 变量类型配置
 */
const TYPE_CONFIG: Record<string, { label: string; icon: string }> = {
  string: { label: '文本', icon: 'T' },
  number: { label: '数字', icon: '#' },
  boolean: { label: '布尔', icon: 'B' },
  array: { label: '数组', icon: '[]' },
  object: { label: '对象', icon: '{}' },
};

/**
 * 变量管理面板属性
 */
export interface VariableManagerPanelProps {
  /** 模板ID */
  templateId: string;
  /** 模板名称 */
  templateName: string;
  /** 变量列表 */
  variables: PromptVariable[];
  /** 当前变量值（默认值覆盖） */
  values: Record<string, unknown>;
  /** 保存回调 */
  onSave: (variableName: string, value: unknown) => void;
  /** 重置回调 */
  onReset: (variableName: string) => void;
  /** 全部重置回调 */
  onResetAll?: () => void;
  /** 关闭回调 */
  onClose?: () => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否显示为模态框 */
  isModal?: boolean;
}

/**
 * 变量层级徽章组件
 */
const TierBadge: React.FC<{ tier: VariableTier }> = ({ tier }) => {
  const config = TIER_CONFIG[tier];
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border
        ${config.bgColor} ${config.borderColor} ${config.color}
      `}
    >
      {config.label}
    </span>
  );
};

/**
 * 变量来源徽章组件
 */
const SourceBadge: React.FC<{ source: VariableSource }> = ({ source }) => {
  const config = SOURCE_CONFIG[source];
  return (
    <span className={`text-[10px] ${config.color}`}>
      {config.label}
    </span>
  );
};

/**
 * 变量类型图标组件
 */
const TypeIcon: React.FC<{ type: string }> = ({ type }) => {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.string;
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-700/50 text-[10px] font-mono text-slate-300">
      {config.icon}
    </span>
  );
};

/**
 * 值编辑器组件
 */
const ValueEditor: React.FC<{
  variable: PromptVariable;
  value: unknown;
  onChange: (value: unknown) => void;
  onReset: () => void;
  disabled: boolean;
}> = ({ variable, value, onChange, onReset, disabled }) => {
  const [localValue, setLocalValue] = useState<string>(
    value !== undefined ? String(value) : ''
  );
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 是否有自定义值
  const hasCustomValue = value !== undefined && value !== variable.defaultValue;

  // 验证值
  const validateValue = (val: string): boolean => {
    if (!variable.required && val === '') {
      return true;
    }

    switch (variable.type) {
      case 'number':
        if (isNaN(Number(val))) {
          setError('请输入有效的数字');
          return false;
        }
        break;
      case 'boolean':
        if (!['true', 'false', ''].includes(val.toLowerCase())) {
          setError('请输入 true 或 false');
          return false;
        }
        break;
      case 'array':
        try {
          if (val && val.trim()) {
            JSON.parse(val);
          }
        } catch {
          setError('请输入有效的 JSON 数组');
          return false;
        }
        break;
      case 'object':
        try {
          if (val && val.trim()) {
            JSON.parse(val);
          }
        } catch {
          setError('请输入有效的 JSON 对象');
          return false;
        }
        break;
    }

    setError(null);
    return true;
  };

  // 处理保存
  const handleSave = () => {
    if (!validateValue(localValue)) {
      return;
    }

    let parsedValue: unknown;
    switch (variable.type) {
      case 'number':
        parsedValue = localValue ? Number(localValue) : undefined;
        break;
      case 'boolean':
        parsedValue = localValue ? localValue.toLowerCase() === 'true' : undefined;
        break;
      case 'array':
      case 'object':
        parsedValue = localValue ? JSON.parse(localValue) : undefined;
        break;
      default:
        parsedValue = localValue || undefined;
    }

    onChange(parsedValue);
    setIsEditing(false);
  };

  // 处理重置
  const handleReset = () => {
    setLocalValue('');
    setError(null);
    setIsEditing(false);
    onReset();
  };

  // 显示值
  const displayValue = useMemo(() => {
    if (value === undefined || value === null) {
      return <span className="text-slate-500 italic">未设置</span>;
    }
    const strVal = String(value);
    if (strVal.length > 50) {
      return strVal.substring(0, 50) + '...';
    }
    return strVal;
  }, [value]);

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 text-sm text-slate-300 truncate">
          {displayValue}
        </div>
        {hasCustomValue && (
          <span className="text-[10px] text-amber-400 flex items-center gap-1 shrink-0">
            <AlertCircle size={10} />
            已修改
          </span>
        )}
        <button
          onClick={() => {
            setLocalValue(value !== undefined ? String(value) : '');
            setIsEditing(true);
          }}
          disabled={disabled}
          className="p-1 hover:bg-slate-700/50 rounded text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0"
          title="编辑"
        >
          <Save size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          setError(null);
        }}
        placeholder={variable.defaultValue !== undefined ? String(variable.defaultValue) : '输入默认值...'}
        disabled={disabled}
        className="w-full bg-slate-900/60 border border-slate-700/50 rounded px-2 py-1 text-sm text-white focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {error && (
        <p className="text-[10px] text-rose-400 flex items-center gap-1">
          <AlertCircle size={10} />
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={disabled}
          className="flex-1 px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-xs rounded border border-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          保存
        </button>
        <button
          onClick={handleReset}
          disabled={disabled}
          className="px-2 py-1 hover:bg-slate-700/50 text-slate-400 text-xs rounded border border-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
        >
          <RotateCcw size={10} />
          重置
        </button>
        <button
          onClick={() => {
            setLocalValue(value !== undefined ? String(value) : '');
            setError(null);
            setIsEditing(false);
          }}
          className="px-2 py-1 hover:bg-slate-700/50 text-slate-400 text-xs rounded border border-slate-700/50 transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  );
};

/**
 * VariableManagerPanel - 变量管理面板
 *
 * 用于编辑模板变量的默认值
 * - 显示变量列表（名称、类型、来源、默认值）
 * - 支持变量搜索和过滤
 * - 显示变量层级（critical/important/optional）
 * - 编辑变量默认值
 */
export const VariableManagerPanel: React.FC<VariableManagerPanelProps> = ({
  templateId,
  templateName,
  variables,
  values,
  onSave,
  onReset,
  onResetAll,
  onClose,
  disabled = false,
  isModal = false,
}) => {
  // 搜索关键词
  const [searchQuery, setSearchQuery] = useState('');
  // 层级过滤
  const [filterTier, setFilterTier] = useState<VariableTier | 'ALL'>('ALL');
  // 来源过滤
  const [filterSource, setFilterSource] = useState<VariableSource | 'ALL'>('ALL');

  // 统计数据
  const stats = useMemo(() => {
    const modified = variables.filter((v) => values[v.name] !== undefined).length;
    return {
      total: variables.length,
      modified,
      critical: variables.filter((v) => v.tier === 'critical').length,
      important: variables.filter((v) => v.tier === 'important').length,
      optional: variables.filter((v) => v.tier === 'optional').length,
    };
  }, [variables, values]);

  // 过滤后的变量列表
  const filteredVariables = useMemo(() => {
    return variables.filter((v) => {
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !v.name.toLowerCase().includes(query) &&
          !v.description.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // 层级过滤
      if (filterTier !== 'ALL' && v.tier !== filterTier) {
        return false;
      }

      // 来源过滤
      if (filterSource !== 'ALL' && v.source !== filterSource) {
        return false;
      }

      return true;
    });
  }, [variables, searchQuery, filterTier, filterSource]);

  // 处理全部重置
  const handleResetAll = useCallback(() => {
    if (onResetAll && confirm('确定要重置所有变量为默认值吗？此操作不可撤销。')) {
      onResetAll();
    }
  }, [onResetAll]);

  // 主内容
  const content = (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-indigo-900/30 to-purple-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <Variable size={18} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">变量管理</h2>
              <p className="text-xs text-slate-400 mt-0.5">{templateName}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="px-4 py-2 border-b border-slate-700/50 bg-slate-800/30">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-400">
            共 <span className="text-white font-medium">{stats.total}</span> 个变量
          </span>
          <span className="text-amber-400">
            已修改 <span className="font-medium">{stats.modified}</span> 个
          </span>
          {stats.critical > 0 && (
            <span className="text-rose-400">
              核心 <span className="font-medium">{stats.critical}</span>
            </span>
          )}
          {stats.important > 0 && (
            <span className="text-amber-400">
              重要 <span className="font-medium">{stats.important}</span>
            </span>
          )}
        </div>
      </div>

      {/* 工具栏 */}
      <div className="px-4 py-3 border-b border-slate-700/50 space-y-3">
        {/* 搜索框 */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索变量名称或描述..."
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none placeholder-slate-500 transition-all"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>

        {/* 过滤器 */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* 层级过滤 */}
          <div className="flex items-center gap-1">
            <Filter size={12} className="text-slate-500" />
            <span className="text-[10px] text-slate-500">层级:</span>
            {(['ALL', 'critical', 'important', 'optional'] as const).map((tier) => (
              <button
                key={tier}
                onClick={() => setFilterTier(tier)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                  filterTier === tier
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-500'
                }`}
              >
                {tier === 'ALL' ? '全部' : TIER_CONFIG[tier].label}
              </button>
            ))}
          </div>

          {/* 来源过滤 */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-500">来源:</span>
            {(['ALL', 'user_input', 'project_state', 'computed'] as const).map((source) => (
              <button
                key={source}
                onClick={() => setFilterSource(source)}
                className={`text-[10px] px-2 py-0.5 rounded border transition-all ${
                  filterSource === source
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-500'
                }`}
              >
                {source === 'ALL' ? '全部' : SOURCE_CONFIG[source].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 变量列表 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filteredVariables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Info size={32} className="mb-2 opacity-50" />
            <p className="text-sm">没有找到匹配的变量</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-800/90 backdrop-blur-sm z-10">
              <tr className="text-left text-[10px] text-slate-500 uppercase tracking-wider border-b border-slate-700/50">
                <th className="px-4 py-2 w-8"></th>
                <th className="px-4 py-2">变量名</th>
                <th className="px-4 py-2 w-16 text-center">类型</th>
                <th className="px-4 py-2 w-20 text-center">层级</th>
                <th className="px-4 py-2 w-20 text-center">来源</th>
                <th className="px-4 py-2">默认值</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filteredVariables.map((variable) => (
                <tr
                  key={variable.name}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  {/* 必填标记 */}
                  <td className="px-4 py-3">
                    {variable.required && (
                      <span className="text-rose-400" title="必填">
                        *
                      </span>
                    )}
                  </td>

                  {/* 变量名和描述 */}
                  <td className="px-4 py-3">
                    <div>
                      <code className="text-sm font-mono text-indigo-300">
                        {`{{${variable.name}}}`}
                      </code>
                      <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                        {variable.description}
                      </p>
                    </div>
                  </td>

                  {/* 类型 */}
                  <td className="px-4 py-3 text-center">
                    <TypeIcon type={variable.type} />
                  </td>

                  {/* 层级 */}
                  <td className="px-4 py-3 text-center">
                    <TierBadge tier={variable.tier} />
                  </td>

                  {/* 来源 */}
                  <td className="px-4 py-3 text-center">
                    <SourceBadge source={variable.source} />
                  </td>

                  {/* 默认值编辑器 */}
                  <td className="px-4 py-3">
                    <ValueEditor
                      variable={variable}
                      value={values[variable.name]}
                      onChange={(value) => onSave(variable.name, value)}
                      onReset={() => onReset(variable.name)}
                      disabled={disabled}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="p-4 border-t border-slate-700 bg-slate-950/50 flex justify-between items-center">
        <button
          onClick={handleResetAll}
          disabled={disabled || stats.modified === 0}
          className="text-xs text-slate-500 hover:text-red-400 disabled:text-slate-600 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
        >
          <RotateCcw size={12} />
          重置全部
        </button>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <CheckCircle size={12} className="text-emerald-400" />
            {stats.total - stats.modified} 默认
          </span>
          <span className="flex items-center gap-1">
            <AlertCircle size={12} className="text-amber-400" />
            {stats.modified} 已修改
          </span>
        </div>
      </div>
    </div>
  );

  // 模态框模式
  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          {content}
        </div>
      </div>
    );
  }

  // 内联模式
  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
      {content}
    </div>
  );
};

export default VariableManagerPanel;
