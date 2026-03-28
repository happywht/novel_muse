import React from 'react';
import {
    User, Globe, CheckCircle, Trash2, ChevronRight, Inbox, Clock, ArrowRight
} from 'lucide-react';
import { Echo } from '../../types';
import { RELATIONSHIP_CONFIG } from '../../config/constants';

interface EchoFeedProps {
    echoes: Echo[];
    selectedEchoId: string | null;
    viewFilter: 'PENDING' | 'HISTORY';
    onSelectEcho: (echoId: string) => void;
    onAcceptEcho: (echoId: string) => void;
    onRejectEcho: (echoId: string) => void;
}

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'ACCEPTED': return <CheckCircle size={14} className="text-emerald-400" />;
        case 'REJECTED': return <span className="text-rose-400">✕</span>;
        case 'ARCHIVED': return <span className="text-slate-500">⏱</span>;
        default: return <Clock size={14} className="text-amber-400" />;
    }
};

export const EchoFeed: React.FC<EchoFeedProps> = ({
    echoes,
    selectedEchoId,
    viewFilter,
    onSelectEcho,
    onAcceptEcho,
    onRejectEcho
}) => {
    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {echoes.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                    <Inbox size={48} className="mb-4" />
                    <p className="text-sm">暂无待处理回响。开始创作以捕捉命运变迁。</p>
                </div>
            ) : (
                echoes.map((echo) => (
                    <div
                        key={echo.id}
                        onClick={() => onSelectEcho(echo.id)}
                        className={`group p-4 rounded-xl border transition-all cursor-pointer relative ${selectedEchoId === echo.id
                            ? 'bg-slate-800 border-muse-500/50 shadow-xl'
                            : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                            }`}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${echo.type === 'CHARACTER' ? 'bg-indigo-900/30 text-indigo-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                                    {echo.type === 'CHARACTER' ? <User size={18} /> : <Globe size={18} />}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white group-hover:text-muse-300 transition-colors">
                                        {echo.targetName}
                                    </h3>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                                        {getStatusIcon(echo.status)} 实录回响 • {new Date(echo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>

                            {viewFilter === 'PENDING' && (
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAcceptEcho(echo.id);
                                        }}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-lg shadow-lg shadow-emerald-900/20 transition-all active:scale-90"
                                        title="采纳并同步到图谱"
                                    >
                                        <CheckCircle size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRejectEcho(echo.id); }}
                                        className="bg-slate-700 hover:bg-rose-900/50 text-slate-300 hover:text-rose-200 p-1.5 rounded-lg transition-all active:scale-90"
                                        title="忽略"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="pl-11">
                            <p className="text-sm text-slate-300 leading-relaxed font-bold">
                                {echo.description}
                            </p>
                            <div className="mt-2 text-xs text-slate-500 border-l-2 border-slate-800 pl-3 py-1 italic">
                                "{echo.reason}"
                            </div>

                            {/* Display Triples with Weight & Trajectory */}
                            {echo.triples && echo.triples.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {echo.triples.map((t, i) => (
                                        <div key={i} className="flex flex-col gap-1 bg-slate-900/80 border border-muse-500/20 p-2 rounded text-[10px]">
                                            <div className="flex items-center gap-1 text-muse-200">
                                                <span className="font-bold opacity-70">{t.subject}</span>
                                                <ArrowRight size={10} className="text-muse-500" />
                                                <span className="text-muse-400">[{t.relation}]</span>
                                                <ArrowRight size={10} className="text-muse-500" />
                                                <span className="font-bold opacity-70">{t.object}</span>
                                            </div>

                                            {/* Quantitative Feedback */}
                                            {(t.weight !== undefined || t.trajectory) && (
                                                <div className="flex items-center gap-2 border-t border-slate-800 mt-1 pt-1">
                                                    {t.weight !== undefined && (
                                                        <div className="flex items-center gap-1.5 flex-1" title={`强度: ${t.weight}`}>
                                                            <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full ${t.weight > RELATIONSHIP_CONFIG.HIGH_WEIGHT_THRESHOLD ? 'bg-rose-500' : t.weight > RELATIONSHIP_CONFIG.MEDIUM_WEIGHT_THRESHOLD ? 'bg-amber-500' : 'bg-blue-500'}`}
                                                                    style={{ width: `${t.weight}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[8px] text-slate-500 font-mono">{t.weight}</span>
                                                        </div>
                                                    )}
                                                    {t.trajectory && (
                                                        <span className={`text-[8px] px-1 rounded font-bold uppercase ${t.trajectory === 'rising' ? 'bg-emerald-500/20 text-emerald-400' :
                                                            t.trajectory === 'falling' ? 'bg-rose-500/20 text-rose-400' :
                                                                'bg-slate-700 text-slate-400'
                                                            }`}>
                                                            {t.trajectory === 'rising' ? '↑' : t.trajectory === 'falling' ? '↓' : '→'}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedEchoId === echo.id && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-muse-500/30">
                                <ChevronRight size={24} />
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};
