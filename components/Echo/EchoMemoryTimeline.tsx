import React from 'react';
import { X, Clock, User, Globe, Sparkles, CheckCircle,
    Trash2, ChevronRight, PlayCircle, Brain, History, Loader2
} from 'lucide-react';
import { useEchoChamber } from './EchoChamberContext';
import { Character, WorldSetting } from '../../types';

/**
 * 记忆时间线组件
 *
 * 职责：
 * - 显示实体的历史 Echo 记录
 * - 显示记忆固化功能
 * - 渲染实体详情面板
 */
export const EchoMemoryTimeline: React.FC = () => {
    const {
        targetEntity,
        entityHistory,
        consolidationCandidates,
        isConsolidating,
        handleConsolidateMemory
    } = useEchoChamber();

    if (!targetEntity || consolidationCandidates.length === 0) return null;

    return (
        <div className="flex-1/3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
            {/* Entity Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-950/20">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                            targetEntity.type === 'CHARACTER'
                                ? 'bg-indigo-900 text-indigo-300 shadow-lg'
                                : 'bg-emerald-900 text-emerald-300 shadow-lg'
                        }`}>
                            {targetEntity.type === 'CHARACTER' ? '角色' : '世界'}
                        </span>
                        <h2 className="text-3xl font-serif font-bold text-white mb-2 leading-tight mt-2">
                            {(targetEntity.data as any).name || (targetEntity.data as any).title}
                        </h2>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4">
                    <div className="text-xs text-slate-500 flex items-center gap-3">
                        <span className="flex items-center gap-1.5">
                            <Brain size={14} className="text-amber-500" />
                            已积累记忆: {consolidationCandidates.length}
                        </span>
                    </div>
                    <button
                        onClick={handleConsolidateMemory}
                        disabled={isConsolidating}
                        className={`text-[10px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all shadow-lg ${
                            consolidationCandidates.length >= 3
                                ? 'bg-amber-600 hover:bg-amber-500 text-white animate-pulse'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                        title={consolidationCandidates.length >= 3 ? "固化记忆至长期档案" : "积累 3 条以上记忆后可固化"}
                    >
                        {isConsolidating ? (
                            <Loader2 size={12} className="animate-spin" />
                        ) : (
                            <Sparkles size={12} />
                        )}
                        固化记忆
                    </button>
                </div>
            </div>

            {/* Base Profile */}
            <div className="relative pl-8 p-4">
                <div className="absolute left-2 top-1 w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center z-10 shadow-lg">
                    <PlayCircle size={14} className="text-slate-400" />
                </div>
                <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                    <div className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-widest">
                        长期记忆 (Archive)
                    </div>
                </div>

                {/* History Items */}
                {entityHistory.length === 0 ? (
                    <div className="pl-8 text-xs text-slate-600 italic">尚未在时间长河中泛起波澜。</div>
                ) : (
                    entityHistory.map((item, idx) => (
                        <div
                            key={item.id}
                            className={`relative pl-8 transition-opacity mt-2 ${
                                item.status === 'ARCHIVED' ? 'opacity-40 hover:opacity-100' : ''
                            }`}
                        >
                            <div className={`absolute left-2 top-1 w-6 h-6 rounded-full border flex items-center justify-center z-10 shadow-lg ${
                                item.status === 'ACCEPTED'
                                    ? 'bg-emerald-900/50 border-emerald-500 text-emerald-400'
                                    : item.status === 'REJECTED'
                                        ? 'bg-rose-900/50 border-rose-500 text-rose-400'
                                        : 'bg-slate-800 border-slate-700 text-slate-500'
                            }`}>
                                {item.status === 'ACCEPTED' ? (
                                    <CheckCircle size={12} />
                                ) : item.status === 'REJECTED' ? (
                                    <Trash2 size={12} />
                                ) : (
                                    <Clock size={12} />
                                )}
                            </div>
                            <div className={`p-4 rounded-xl border ${
                                item.status === 'ACCEPTED'
                                    ? 'bg-emerald-900/5 border-emerald-900/30'
                                    : item.status === 'REJECTED'
                                        ? 'bg-rose-900/5 border-rose-900/30'
                                        : 'bg-slate-800/30 border-slate-700/50'
                            }`}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] text-slate-500 font-mono">
                                        {new Date(item.timestamp).toLocaleDateString()}
                                    </span>
                                    <span className={`text-[9px] px-1.5 rounded font-bold uppercase ${
                                        item.status === 'ACCEPTED'
                                            ? 'text-emerald-500 bg-emerald-900/30'
                                            : item.status === 'REJECTED'
                                                ? 'text-rose-500 bg-rose-900/30'
                                                : 'text-slate-500 bg-slate-800'
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
    );
};
