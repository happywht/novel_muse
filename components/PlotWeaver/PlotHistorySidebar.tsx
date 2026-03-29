import React from 'react';
import { X } from 'lucide-react';
import { PlotVersion } from '../../types';

interface PlotHistorySidebarProps {
  plotHistory: PlotVersion[];
  onRestore: (entry: PlotVersion) => void;
  onClose: () => void;
}

export const PlotHistorySidebar: React.FC<PlotHistorySidebarProps> = ({
  plotHistory,
  onRestore,
  onClose,
}) => {
  return (
    <div className="absolute top-0 right-0 w-72 h-full bg-slate-800 border-l border-slate-700 shadow-2xl z-20 overflow-y-auto custom-scrollbar animate-fade-in">
      <div className="p-3 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 sticky top-0">
        <span className="text-xs font-bold text-slate-400 uppercase">版本历史 (Plot Timeline)</span>
        <button onClick={onClose}>
          <X size={14} className="text-slate-500 hover:text-white" />
        </button>
      </div>
      {plotHistory.length === 0 && (
        <div className="p-4 text-center text-xs text-slate-500">暂无历史记录</div>
      )}
      {plotHistory.map((ver) => (
        <div key={ver.id} className="p-3 border-b border-slate-700/50 hover:bg-slate-700/50 group">
          <div className="flex justify-between items-start mb-1">
            <span className="text-xs text-muse-400 font-mono">
              {new Date(ver.timestamp).toLocaleString()}
            </span>
            <button
              onClick={() => onRestore(ver)}
              className="text-xs bg-slate-700 hover:bg-muse-600 text-slate-300 hover:text-white px-2 py-0.5 rounded transition-colors"
            >
              恢复
            </button>
          </div>
          <p className="text-sm text-white font-bold mb-1">{ver.note}</p>
          <p className="text-[10px] text-slate-500 mt-1 line-clamp-3 bg-slate-900/50 p-2 rounded border border-slate-700/30 font-serif">
            {ver.content.substring(0, 80)}...
          </p>
        </div>
      ))}
    </div>
  );
};
