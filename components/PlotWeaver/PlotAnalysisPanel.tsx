import React, { useState } from 'react';
import { Activity, Zap, RefreshCw, MousePointer2 } from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';

interface RewriteOption {
  label: string;
  prompt: string;
}

const REWRITE_OPTIONS: RewriteOption[] = [
  { label: "🔥 增加冲突与张力", prompt: "增加剧情的冲突烈度，让反派更具压迫感，让主角的处境更绝望。" },
  { label: "🕵️‍♂️ 增加悬疑与反转", prompt: "埋下更多伏笔，并在结局或中点增加一个意想不到的剧情反转。" },
  { label: "🎭 深化情感羁绊", prompt: "着重描写角色之间的情感纠葛，增加感人或虐心的情节。" },
  { label: "⚡ 加快叙事节奏", prompt: "删除拖沓的过渡情节，让剧情更加紧凑，事件接连发生。" },
];

interface PlotAnalysisPanelProps {
  analysis: string;
  selectedText: string;
  customRewritePrompt: string;
  onCustomRewritePromptChange: (value: string) => void;
  onRewrite: (prompt: string, label: string) => void;
  onAutoFix: () => void;
  isIterating?: boolean;
  activeSubTab: 'ANALYSIS' | 'OPTIMIZE';
}

export const PlotAnalysisPanel: React.FC<PlotAnalysisPanelProps> = ({
  analysis,
  selectedText,
  customRewritePrompt,
  onCustomRewritePromptChange,
  onRewrite,
  onAutoFix,
  isIterating,
  activeSubTab,
}) => {

  if (activeSubTab === 'ANALYSIS') {
    return (
      <>
        {analysis ? (
          <div className="prose prose-invert prose-slate max-w-none animate-fade-in">
            <MarkdownRenderer content={analysis} />
            <div className="mt-8 pt-4 border-t border-slate-700 flex flex-col items-center gap-4">
              <p className="text-xs text-slate-500 italic text-center">系统检测到可落地的优化路径，点击下方按钮开启螺旋演进：</p>
              <button
                onClick={onAutoFix}
                disabled={isIterating}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xl shadow-indigo-900/40 transition-all hover:scale-105 active:scale-95 disabled:scale-100 disabled:shadow-none"
              >
                {isIterating ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Zap size={18} />
                )}
                {isIterating ? "正在努力演进中..." : "执行螺旋优化 (Spiral Fix)"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 py-20">
            <Activity size={56} className="opacity-20 mb-6 animate-pulse" />
            <p className="text-center max-w-xs text-sm leading-relaxed">
              点击侧边栏下方的<strong className="text-muse-400">“深度评估”</strong>按钮。<br /><br />
              AI 将穿透表象，从<strong className="text-muse-400">逻辑自洽</strong>、<strong className="text-muse-400">冲突强度</strong>与<strong className="text-muse-400">节奏张力</strong>维度进行全书审计，并给出可落地的重写建议。
            </p>
          </div>
        )}
      </>
    );
  }

  // OPTIMIZE sub-tab
  return (
    <div className="space-y-6 animate-fade-in">
      {selectedText && (
        <div className="bg-muse-900/20 border border-muse-500/30 p-3 rounded-lg mb-4">
          <div className="text-xs text-muse-400 font-bold mb-1 flex items-center gap-1"><MousePointer2 size={12} /> 正在针对选区操作</div>
          <div className="text-xs text-slate-400 line-clamp-2 italic">"{selectedText}"</div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2"><RefreshCw size={16} /> 快捷重写指令</h3>
        <div className="grid grid-cols-1 gap-2">
          {REWRITE_OPTIONS.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => onRewrite(opt.prompt, `Rewrite: ${opt.label}`)}
              className="text-left px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 hover:text-white transition-all group"
            >
              <div className="font-medium text-slate-200 group-hover:text-muse-400">{opt.label}</div>
              <div className="text-xs text-slate-500 mt-1">{opt.prompt}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800">
        <h3 className="text-sm font-bold text-white mb-2">自定义重写</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={customRewritePrompt}
            onChange={(e) => onCustomRewritePromptChange(e.target.value)}
            placeholder="例如：把结局改成悲剧，让主角牺牲..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:border-muse-500 outline-none"
          />
          <button
            onClick={() => onRewrite(customRewritePrompt, `Custom: ${customRewritePrompt}`)}
            disabled={!customRewritePrompt}
            className="bg-muse-700 hover:bg-muse-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            执行
          </button>
        </div>
      </div>
    </div>
  );
};
