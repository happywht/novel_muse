import React from 'react';
import { X, User, Globe } from 'lucide-react';
import { usePlotCard } from './PlotCardContext';

export const PlotCardEntitySelector: React.FC = () => {
  const { node, project, showEntitySelector, setShowEntitySelector, toggleEntityRelation } =
    usePlotCard();

  if (!showEntitySelector || showEntitySelector.id !== node.id) return null;

  return (
    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg animate-fade-in relative mt-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
          {showEntitySelector.type === 'CHARACTER' ? (
            <>
              <User size={10} /> 选择登场角色
            </>
          ) : (
            <>
              <Globe size={10} /> 选择发生地点
            </>
          )}
        </span>
        <button
          onClick={() => setShowEntitySelector(null)}
          className="text-slate-600 hover:text-slate-300"
        >
          <X size={10} />
        </button>
      </div>
      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
        {showEntitySelector.type === 'CHARACTER' ? (
          project.characters.length > 0 ? (
            project.characters.map((c) => (
              <button
                key={c.id}
                onClick={() => toggleEntityRelation(node.id, 'CHARACTER', c.id)}
                className={`text-[10px] px-2 py-1 rounded-full border transition-all ${node.relatedCharacters?.includes(c.id) ? 'bg-muse-900/50 border-muse-500 text-muse-300 shadow-sm shadow-muse-500/20' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
              >
                {c.name}
              </button>
            ))
          ) : (
            <p className="text-[10px] text-slate-600 italic">暂无角色设定</p>
          )
        ) : project.worldSettings.filter(
            (w) => w.category === 'Geography' || w.category === 'Other'
          ).length > 0 ? (
          project.worldSettings
            .filter((w) => w.category === 'Geography' || w.category === 'Other')
            .map((w) => (
              <button
                key={w.id}
                onClick={() => toggleEntityRelation(node.id, 'LOCATION', w.id)}
                className={`text-[10px] px-2 py-1 rounded-full border transition-all ${node.relatedLocations?.includes(w.id) ? 'bg-emerald-900/50 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
              >
                {w.title}
              </button>
            ))
        ) : (
          <p className="text-[10px] text-slate-600 italic">暂无地点设定</p>
        )}
      </div>
    </div>
  );
};
