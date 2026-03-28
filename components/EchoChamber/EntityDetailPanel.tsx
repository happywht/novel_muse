import React from 'react';
import { X, Brain, Zap, PlayCircle, Loader2 } from 'lucide-react';
import { Character, WorldSetting, Echo } from '../../types';

interface EntityDetailPanelProps {
    targetEntity: {
        data: Character | WorldSetting;
        type: 'CHARACTER' | 'WORLD';
    } | null;
    entityHistory: Echo[];
    consolidationCandidates: Echo[];
    isConsolidating: boolean;
    onClose: () => void;
    onConsolidateMemory: () => void;
}

export const EntityDetailPanel: React.FC<EntityDetailPanelProps> = ({
    targetEntity,
    entityHistory,
    consolidationCandidates,
    isConsolidating,
    onClose,
    onConsolidateMemory
}) => {
    if (!targetEntity) return null;

    return (
        <div className={`w-1/3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden transition-all duration-300 ${targetEntity ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {/* Entity Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-950/20">
                <div className="flex justify-between items-start mb-4">
                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${targetEntity.type === 'CHARACTER' ? 'bg-indigo-900 text-indigo-300 shadow-lg' : 'bg-emerald-900 text-emerald-300 shadow-lg'}`}>
                        {targetEntity.type === 'CHARACTER' ? 'Character' : 'World Lore'}
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <h2 className="text-3xl font-serif font-bold text-white mb-2 leading-tight">
                    {(targetEntity.data as any).name || (targetEntity.data as any).title}
                </h2>

                <div className="flex items-center justify-between mt-4">
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span className="flex items-center gap-1.5"><Brain size={14} className="text-amber-500" /> 已积累记忆: {consolidationCandidates.length}</span>
                    </div>

                    {consolidationCandidates.length > 0 && (
                        <button
                            onClick={onConsolidateMemory}
                            disabled={isConsolidating}
                            className={`text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all shadow-lg ${consolidationCandidates.length >= 3
                                ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                }`}
                            title={consolidationCandidates.length >= 3 ? "固化记忆至长期档案" : "积累 3 条以上记忆后可固化"}
                        >
                            {isConsolidating ? <Loader2 size={14} className="animate-spin" /> : <><Brain size={14} /> 记忆固化</>}
                        </button>
                    )}
                </div>
            </div>

            {/* History Timeline */}
            <div className="flex-1 overflow-y-auto p-6 relative custom-scrollbar bg-slate-950/10">
                {/* Vertical line helper */}
                <div className="absolute left-9 top-6 bottom-6 w-px bg-slate-800/60 shadow-[1px_0_0_rgba(0,0,0,0.5)]"></div>

                <div className="space-y-8 relative">
                    {/* Base Profile */}
                    <div className="relative pl-8">
                        <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center z-10 shadow-lg">
                            <PlayCircle size={14} className="text-slate-400" />
                        </div>
                        <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                            <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">长期记忆 (Archive)</div>
                            <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap italic">
                                {targetEntity.type === 'CHARACTER'
                                    ? (targetEntity.data as Character).description
                                    : (targetEntity.data as WorldSetting).content}
                            </p>
                        </div>
                    </div>

                    {/* History Items */}
                    {entityHistory.length === 0 ? (
                        <div className="pl-8 text-xs text-slate-600 italic">尚未在时间长河中泛起波澜。</div>
                    ) : (
                        entityHistory.map((item, idx) => (
                            <div key={item.id} className={`relative pl-8 transition-opacity ${item.status === 'ARCHIVED' ? 'opacity-40 hover:opacity-100' : ''}`}>
                                <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border flex items-center justify-center z-10 shadow-lg transition-colors ${item.status === 'ACCEPTED' ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400' :
                                    item.status === 'REJECTED' ? 'bg-rose-900/50 border-rose-500 text-rose-400' :
                                        item.status === 'ARCHIVED' ? 'bg-slate-800 border-slate-700 text-slate-500' :
                                            'bg-amber-900/50 border-amber-500 text-amber-400'
                                    }`}>
                                    <Zap size={10} />
                                </div>
                                <div className={`p-4 rounded-xl border ${item.status === 'ACCEPTED' ? 'bg-emerald-900/5 border-emerald-900/30' :
                                    item.status === 'REJECTED' ? 'bg-rose-900/5 border-rose-900/30' :
                                        'bg-slate-800/30 border-slate-700/50'
                                    }`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] text-slate-500 font-mono">{new Date(item.timestamp).toLocaleDateString()}</span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${item.status === 'ACCEPTED' ? 'text-emerald-500' :
                                            item.status === 'REJECTED' ? 'text-rose-500' :
                                                'text-slate-500'
                                            }`}>
                                            {item.status}
                                        </span>
                                    </div>
                                    <h4 className="text-xs font-bold text-slate-200 mb-1">{item.description}</h4>
                                    <p className="text-[10px] text-slate-500 leading-relaxed italic">"{item.reason}"</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
