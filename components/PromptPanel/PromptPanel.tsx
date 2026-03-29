import React, { useState, useMemo, useCallback } from 'react';
import {
  Settings2,
  X,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import { PromptBadge } from './PromptBadge';
import { PromptEditor, PromptItem } from './PromptEditor';
import { EffectBadge, EffectLevel, getEffectLevel } from './EffectBadge';

/**
 * PromptPanel 显示模式
 */
export type PromptPanelMode = 'compact' | 'collapsed' | 'expanded';

/**
 * 模块类型定义
 */
export type ModuleType =
  | 'world' // 世界观
  | 'character' // 角色创建
  | 'plot' // 情节编织
  | 'drafting' // 写作工坊
  | 'echo' // Echo 审查
  | 'global'; // 全局设置

/**
 * PromptPanel 属性
 */
export interface PromptPanelProps {
  /** 显示模式 */
  mode?: PromptPanelMode;
  /** 当前关联的模块 */
  moduleType?: ModuleType;
  /** prompt 列表 */
  prompts: PromptItem[];
  /** 项目级覆盖 */
  projectOverrides: Record<string, string>;
  /** 模块级覆盖（可选） */
  moduleOverrides?: Record<string, string>;
  /** 保存回调 */
  onSave: (key: string, content: string, level: 'PROJECT' | 'MODULE') => void;
  /** 重置回调 */
  onReset: (key: string, level: 'PROJECT' | 'MODULE') => void;
  /** 全部重置回调 */
  onResetAll?: (level: 'PROJECT' | 'MODULE') => void;
  /** 关闭回调（用于 modal 模式） */
  onClose?: () => void;
  /** 是否显示为模态框 */
  isModal?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
}

/**
 * 获取模块相关的 prompt keys
 */
export const MODULE_PROMPT_MAP: Record<ModuleType, string[]> = {
  world: ['world_gen', 'world_echo_extraction'],
  character: ['character_gen'],
  plot: [
    'plot_analysis',
    'plot_weaving',
    'plot_node_gen',
    'plot_fission',
    'plot_rewrite',
    'audit_plot',
  ],
  drafting: ['scene_expansion', 'scene_generation', 'polish_engine'],
  echo: ['world_echo_extraction', 'audit_plot'],
  global: ['writing_base'],
};

/**
 * PromptPanel - Prompt 管理面板核心组件
 *
 * 三种显示模式：
 * - compact: 仅显示徽章
 * - collapsed: 折叠状态
 * - expanded: 展开状态
 */
export const PromptPanel: React.FC<PromptPanelProps> = ({
  mode = 'collapsed',
  moduleType = 'global',
  prompts,
  projectOverrides = {},
  moduleOverrides = {},
  onSave,
  onReset,
  onResetAll,
  onClose,
  isModal = false,
  disabled = false,
  title = 'AI 调教台',
  subtitle,
}) => {
  const [internalMode, setInternalMode] = useState<PromptPanelMode>(mode);
  const [filterLevel, setFilterLevel] = useState<EffectLevel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 计算统计数据
  const stats = useMemo(() => {
    let modifiedCount = 0;
    prompts.forEach((p) => {
      if (projectOverrides[p.key] || moduleOverrides[p.key]) {
        modifiedCount++;
      }
    });
    return {
      availableCount: prompts.length,
      modifiedCount,
    };
  }, [prompts, projectOverrides, moduleOverrides]);

  // 筛选 prompts
  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !p.label.toLowerCase().includes(query) &&
          !p.description.toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // 层级过滤
      if (filterLevel !== 'ALL') {
        const level = getEffectLevel(!!moduleOverrides[p.key], !!projectOverrides[p.key]);
        if (level !== filterLevel) return false;
      }

      return true;
    });
  }, [prompts, searchQuery, filterLevel, projectOverrides, moduleOverrides]);

  // 合并 overrides 到 prompt 项
  const promptsWithOverrides: PromptItem[] = useMemo(() => {
    return filteredPrompts.map((p) => ({
      ...p,
      projectOverride: projectOverrides[p.key],
      moduleOverride: moduleOverrides[p.key],
    }));
  }, [filteredPrompts, projectOverrides, moduleOverrides]);

  // 处理保存
  const handleSave = useCallback(
    (key: string, content: string, level: 'PROJECT' | 'MODULE') => {
      onSave(key, content, level);
    },
    [onSave]
  );

  // 处理重置
  const handleReset = useCallback(
    (key: string, level: 'PROJECT' | 'MODULE') => {
      onReset(key, level);
    },
    [onReset]
  );

  // 处理全部重置
  const handleResetAll = useCallback(() => {
    if (onResetAll && confirm('确定要重置所有自定义设置吗？此操作不可撤销。')) {
      onResetAll('PROJECT');
    }
  }, [onResetAll]);

  // 渲染紧凑模式
  if (internalMode === 'compact' && !isModal) {
    return (
      <PromptBadge
        availableCount={stats.availableCount}
        modifiedCount={stats.modifiedCount}
        onClick={() => setInternalMode('expanded')}
        compact
      />
    );
  }

  // 渲染折叠模式
  if (internalMode === 'collapsed' && !isModal) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4">
        <PromptBadge
          availableCount={stats.availableCount}
          modifiedCount={stats.modifiedCount}
          onClick={() => setInternalMode('expanded')}
        />
      </div>
    );
  }

  // 主内容
  const content = (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="p-5 border-b border-slate-700 bg-gradient-to-r from-purple-900/30 to-indigo-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Settings2 size={20} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{title}</h2>
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xl leading-none transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* 警告提示 */}
      <div className="mx-5 mt-4 p-3 bg-amber-900/20 border border-amber-500/20 rounded-lg flex items-start gap-2">
        <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-300/80">
          提示词是项目的灵魂。修改后仅对当前宇宙生效。留空则使用 Muse 系统默认指令。
        </p>
      </div>

      {/* 工具栏 */}
      <div className="px-5 py-3 border-b border-slate-700/50 space-y-3">
        {/* 搜索框 */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索提示词..."
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg pl-3 pr-10 py-2 text-sm text-white focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 outline-none placeholder-slate-500 transition-all"
          />
          <Filter size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
        </div>

        {/* 层级过滤 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">过滤：</span>
          {(['ALL', 'DEFAULT', 'PROJECT', 'MODULE'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`text-xs px-2 py-1 rounded-md border transition-all ${
                filterLevel === level
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                  : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-500'
              }`}
            >
              {level === 'ALL'
                ? '全部'
                : level === 'DEFAULT'
                  ? '默认'
                  : level === 'PROJECT'
                    ? '项目自定义'
                    : '模块专属'}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt 列表 */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
        {promptsWithOverrides.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-sm">没有找到匹配的提示词</div>
        ) : (
          promptsWithOverrides.map((item) => (
            <PromptEditor
              key={item.key}
              item={item}
              onSave={handleSave}
              onReset={handleReset}
              editLevel={moduleType !== 'global' ? 'MODULE' : 'PROJECT'}
              disabled={disabled}
            />
          ))
        )}
      </div>

      {/* 底部操作栏 */}
      <div className="p-4 border-t border-slate-700 bg-slate-950/50 flex justify-between items-center">
        <button
          onClick={handleResetAll}
          disabled={disabled || stats.modifiedCount === 0}
          className="text-xs text-slate-500 hover:text-red-400 disabled:text-slate-600 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
        >
          <RotateCcw size={12} />
          重置全部
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {stats.modifiedCount} / {stats.availableCount} 已修改
          </span>
          {!isModal && (
            <button
              onClick={() => setInternalMode('collapsed')}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              收起
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // 模态框模式
  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
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

export default PromptPanel;
