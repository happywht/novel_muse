import React from 'react';
import { Zap, X, RefreshCw } from 'lucide-react';
import { PropagationRisk } from '../../types';

interface ButterflyPanelProps {
  risks: PropagationRisk[];
  isLoading: boolean;
  onClose: () => void;
}

/**
 * Task 5.2: Butterfly Effect Preview Panel
 * Extracted from DraftingRoom.tsx
 */
export const ButterflyPanel: React.FC<ButterflyPanelProps> = ({ risks, isLoading, onClose }) => {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
      <div className="bg-slate-900 w-full max-w-2xl border border-muse-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="text-muse-400" size={18} />
            <h2 className="text-lg font-bold text-slate-100">
              蝴蝶效应预演 (Butterfly Effect Preview)
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <RefreshCw className="text-muse-500 animate-spin" size={32} />
              <p className="text-slate-400 animate-pulse">
                正在利用图谱势能传播算法预测影响趋势...
              </p>
            </div>
          ) : risks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">没有检测到显著的连带影响。</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {risks.map((risk, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border flex flex-col gap-2 ${
                    risk.impact === 'POSITIVE'
                      ? 'bg-emerald-900/20 border-emerald-500/30'
                      : risk.impact === 'NEGATIVE'
                        ? 'bg-rose-900/20 border-rose-500/30'
                        : 'bg-slate-800/50 border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">{risk.targetName}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        risk.impact === 'POSITIVE'
                          ? 'bg-emerald-500 text-emerald-950'
                          : risk.impact === 'NEGATIVE'
                            ? 'bg-rose-500 text-rose-950'
                            : 'bg-slate-500 text-slate-950'
                      }`}
                    >
                      {risk.impact === 'POSITIVE'
                        ? '正面'
                        : risk.impact === 'NEGATIVE'
                          ? '负面'
                          : '中性'}
                    </span>
                  </div>
                  <div className="w-full bg-black/30 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-1000 ${
                        risk.impact === 'POSITIVE'
                          ? 'bg-emerald-500'
                          : risk.impact === 'NEGATIVE'
                            ? 'bg-rose-500'
                            : 'bg-slate-500'
                      }`}
                      style={{ width: `${Math.max(10, risk.magnitude)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed italic line-clamp-3">
                    "{risk.reason}"
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-muse-600 hover:bg-muse-500 text-white rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-muse-900/20"
          >
            已查阅
          </button>
        </div>
      </div>
    </div>
  );
};
