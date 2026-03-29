import React from 'react';
import { Swords } from 'lucide-react';
import { usePlotCard } from './PlotCardContext';

export const PlotCardBody: React.FC = () => {
  const { node, handleUpdateCard } = usePlotCard();

  return (
    <>
      <textarea
        value={node.content}
        onChange={(e) => handleUpdateCard(node.id, { content: e.target.value })}
        className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-sm text-slate-400 focus:text-slate-200 focus:border-muse-500/50 outline-none resize-none font-serif min-h-[100px] transition-all"
        placeholder="描述这段剧情的发生、冲突与转折..."
      />

      {/* 修罗场强度指示器 */}
      {node.conflictScenario && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Swords size={12} className="text-red-500" />
            <span className="text-[10px] text-red-400 font-bold">
              强度 {node.conflictScenario.intensity}/10
            </span>
          </div>
          <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
              style={{ width: `${(node.conflictScenario.intensity / 10) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
            {node.conflictScenario.stakes}
          </span>
        </div>
      )}
    </>
  );
};
