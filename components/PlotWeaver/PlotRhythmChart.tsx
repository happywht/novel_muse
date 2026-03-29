import React from 'react';
import { Activity, Flag, ChevronRight, AlertCircle } from 'lucide-react';
import { PlotNode, ProjectState, BeatTag } from '../../types';
import { BEAT_TAGS } from './constants';

interface PlotRhythmChartProps {
  project: ProjectState;
  onAnalyzeRhythm: () => void;
  isAnalyzingRhythm: boolean;
}

export const PlotRhythmChart: React.FC<PlotRhythmChartProps> = ({
  project,
  onAnalyzeRhythm,
  isAnalyzingRhythm,
}) => {
  const taggedNodes = project.plotNodes.filter((n) => n.beatTag).sort((a, b) => a.order - b.order);

  if (taggedNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-600 animate-fade-in p-6 text-center">
        <Flag size={48} className="opacity-20 mb-4" />
        <h3 className="text-white font-bold mb-2">叙事节奏线尚未开启</h3>
        <p className="text-sm mb-6 leading-relaxed">
          在左侧情节卡片上点击“Flag”图标，标记关键叙事点（如：激励事件、中点、高潮等），即可生成可视化的结构脉络。
        </p>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-left w-full max-w-xs">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-400">
            <AlertCircle size={12} /> 提示
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            相比 AI 生成的伪分值，手动标记的节奏点更能准确反映您对故事结构的掌控。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col animate-fade-in h-full overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-widest italic">
          <Activity className="text-muse-400" size={16} /> Beat Timeline / 节奏线
        </h3>
        <div className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-1 rounded">
          已标记 {taggedNodes.length} 个核心点
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
        <div className="relative pl-8 border-l border-slate-800 space-y-8 ml-2">
          {taggedNodes.map((node, idx) => {
            const tag = BEAT_TAGS.find((t) => t.id === node.beatTag);
            return (
              <div key={node.id} className="relative group">
                {/* Timeline Dot */}
                <div
                  className={`absolute -left-[41px] top-1 w-4 h-4 rounded-full border-2 border-slate-900 shadow-xl transition-transform group-hover:scale-125 z-10 ${tag ? tag.activeColor : 'bg-slate-700'}`}
                />

                {/* Connector line for next node (optional visual) */}
                {idx < taggedNodes.length - 1 && (
                  <div className="absolute -left-[34px] top-5 bottom-[-32px] w-[2px] bg-gradient-to-b from-slate-800 to-transparent opacity-50" />
                )}

                <div className="bg-slate-900/80 border border-slate-800/50 rounded-xl p-4 transition-all hover:bg-slate-800/80 hover:border-muse-500/30 group-hover:translate-x-1 shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${tag?.color}`}
                    >
                      {tag?.label}
                    </span>
                    <ChevronRight size={10} className="text-slate-600" />
                    <h4 className="text-xs font-bold text-slate-200 truncate">
                      {node.title || '未命名情节'}
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-serif">
                    {node.content || '暂无描述...'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
