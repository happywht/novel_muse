import React from 'react';
import { Users, X, RefreshCw } from 'lucide-react';
import { Faction } from '@/types';

interface FactionPanelProps {
    factions: Faction[];
    isLoading: boolean;
    onClose: () => void;
}

/**
 * Task 5.1: Faction Dynamics Panel
 * Extracted from DraftingRoom.tsx
 */
export const FactionPanel: React.FC<FactionPanelProps> = ({ factions, isLoading, onClose }) => {
    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 w-full max-w-2xl border border-indigo-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="text-indigo-400" size={18} />
                        <h2 className="text-lg font-bold text-slate-100">势力版图 (Faction Dynamics)</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <RefreshCw className="text-indigo-500 animate-spin" size={32} />
                            <p className="text-slate-400">正在通过关系权重计算势力聚类...</p>
                        </div>
                    ) : factions.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            暂无势力划分，可能是角色间关系较为疏离。
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {factions.map((faction, j) => (
                                <div key={j} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-bold text-indigo-300">阵营 {j + 1}</h3>
                                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">{faction.members.length} 成员</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {faction.members.map((member, k) => (
                                            <span key={k} className="bg-indigo-900/30 text-indigo-200 px-3 py-1 rounded-full text-xs border border-indigo-500/20">
                                                {member}
                                            </span>
                                        ))}
                                    </div>
                                    {faction.dominantTone && (
                                        <div className="mt-3 pt-3 border-t border-slate-700/50">
                                            <p className="text-[10px] text-slate-500">势力特征：<span className="text-slate-300">{faction.dominantTone}</span></p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-slate-800 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all transform active:scale-95 shadow-lg shadow-indigo-900/20">
                        了解
                    </button>
                </div>
            </div>
        </div>
    );
};
