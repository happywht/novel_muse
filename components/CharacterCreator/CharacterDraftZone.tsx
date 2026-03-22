import React from 'react';
import { Sparkles, Check, Edit2, RotateCcw } from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { Loader } from '../Loader';
import { useCharacterCreator } from './CharacterCreatorContext';

/**
 * 角色草稿区域组件
 * 展示 AI 生成的角色草稿，支持接受/拒绝和迭代优化
 */
export function CharacterDraftZone() {
  const {
    draftCharacter,
    setDraftCharacter,
    iterationFeedback,
    setIterationFeedback,
    isIterating,
    handleAcceptDraft,
    handleIterate,
  } = useCharacterCreator();

  if (!draftCharacter) return null;

  return (
    <div className="animate-fade-in space-y-6 flex flex-col h-full">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Sparkles size={20} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">灵魂预览 (Draft)</h2>
            <p className="text-xs text-slate-400">这就是刚刚召唤出的生命雏形</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setDraftCharacter(null)}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            放弃
          </button>
          <button
            onClick={handleAcceptDraft}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all active:scale-95"
          >
            <Check size={18} /> 确认入住该宇宙
          </button>
        </div>
      </div>

      {/* 草稿内容 */}
      <div className="flex-1 bg-slate-800/30 border border-slate-700 rounded-2xl p-6 overflow-y-auto custom-scrollbar relative">
        <div className="prose prose-invert prose-slate max-w-none">
          <MarkdownRenderer content={draftCharacter.description} />
        </div>
        {isIterating && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center rounded-2xl">
            <Loader text="正在根据反馈重塑灵魂..." />
          </div>
        )}
      </div>

      {/* 迭代反馈区域 */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <Edit2 size={12} /> 提供修改意见 (可选)
        </div>
        <div className="flex gap-3">
          <textarea
            value={iterationFeedback}
            onChange={(e) => setIterationFeedback(e.target.value)}
            placeholder="例如：让他更冷酷一点；或者背景改成落魄贵族..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-muse-500 outline-none resize-none h-20"
          />
          <button
            onClick={handleIterate}
            disabled={isIterating || !iterationFeedback.trim()}
            className="px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 transition-colors flex flex-col items-center justify-center gap-1 min-w-[100px]"
          >
            <RotateCcw size={18} />
            <span className="text-[10px] font-bold">迭代重塑</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default CharacterDraftZone;
