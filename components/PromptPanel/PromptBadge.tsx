import React from 'react';
import { Settings2, Sparkles } from 'lucide-react';

interface PromptBadgeProps {
  /** 可用 prompt 数量 */
  availableCount: number;
  /** 已修改数量 */
  modifiedCount: number;
  /** 点击回调 */
  onClick?: () => void;
  /** 是否紧凑模式 */
  compact?: boolean;
}

/**
 * PromptBadge - 折叠状态徽章
 *
 * 显示格式：
 * ┌──────────────────────┐
 * │ 🎛️ AI调教            │
 * │ ┌─────┐ ┌─────┐     │
 * │ │ 4   │ │ ✨  │     │  ← 可用数量 + 是否已修改
 * │ │可用 │ │已修改│     │
 * └─────┘ └─────┘     │
 * └──────────────────────┘
 */
export const PromptBadge: React.FC<PromptBadgeProps> = ({
  availableCount,
  modifiedCount,
  onClick,
  compact = false,
}) => {
  const hasModifications = modifiedCount > 0;

  if (compact) {
    // 紧凑模式：仅显示图标和数字
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/50 rounded-lg transition-all duration-200 group"
      >
        <Settings2 size={14} className="text-purple-400 group-hover:text-purple-300" />
        <span className="text-xs font-bold text-white">{availableCount}</span>
        {hasModifications && <Sparkles size={12} className="text-amber-400" />}
      </button>
    );
  }

  // 完整模式：显示详细徽章
  return (
    <button
      onClick={onClick}
      className="flex flex-col bg-slate-800/40 hover:bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 transition-all duration-200 group cursor-pointer w-full"
    >
      {/* 标题行 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
          <Settings2 size={14} className="text-purple-400" />
        </div>
        <span className="text-sm font-bold text-white">AI调教</span>
      </div>

      {/* 统计卡片 */}
      <div className="flex gap-2">
        {/* 可用数量 */}
        <div className="flex-1 bg-slate-900/60 rounded-lg p-2 text-center border border-slate-700/30">
          <div className="text-lg font-bold text-white">{availableCount}</div>
          <div className="text-[10px] text-slate-500">可用</div>
        </div>

        {/* 已修改状态 */}
        <div
          className={`flex-1 rounded-lg p-2 text-center border transition-colors ${
            hasModifications
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-slate-900/60 border-slate-700/30'
          }`}
        >
          {hasModifications ? (
            <>
              <div className="flex items-center justify-center gap-1">
                <Sparkles size={14} className="text-amber-400" />
                <span className="text-lg font-bold text-amber-400">{modifiedCount}</span>
              </div>
              <div className="text-[10px] text-amber-500/70">已修改</div>
            </>
          ) : (
            <>
              <div className="text-lg font-bold text-slate-500">-</div>
              <div className="text-[10px] text-slate-500">未修改</div>
            </>
          )}
        </div>
      </div>
    </button>
  );
};

export default PromptBadge;
