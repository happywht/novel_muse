import React from 'react';
import {
    Activity, Clock, User, Globe, Sparkles,
    Inbox, CheckCircle, Trash2, ChevronRight, History, Loader2, ArrowRight,
    Network, Search, FileText, List
} from 'lucide-react';
import { Echo } from '@/types';
import { useEchoChamber } from './EchoChamberContext';

/**
 * Echo 事件流组件
 *
 * 职责：
 * - 显示 Echo 事件列表
 * - 提供采纳/拒绝操作
 * - 切换收件箱/历史视图
 * - 推演蝴蝶效应
 */
export const EchoEventFeed: React.FC = () => {
    const {
        project,
        viewFilter,
        setViewFilter,
        filteredEchoes,
        selectedEchoId,
        setSelectedEchoId,
        handleDeduceFuture,
        isDeducing,
        setShowGraphPanel,
        showGraphPanel,
        setShowDeepReview,
        setShowIntegrityReport,
        setShowBatchHistory,
        loadBatchOperationHistory,
        batchOperationHistory,
        useBackend,
        handleAcceptEchoToGraph,
        handleAction
    } = useEchoChamber();

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ACCEPTED': return <CheckCircle size={14} className="text-emerald-400" />;
            case 'REJECTED': return <Trash2 size={14} className="text-rose-400" />;
            case 'ARCHIVED': return <History size={14} className="text-slate-500" />;
            default: return <Clock size={14} className="text-amber-400" />;
        }
    };

    return (
        <div className="flex-[1.5] flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/30">
                <div className="flex items-center gap-4">
                    <h2 className="text-lg font-serif font-bold flex items-center gap-2 text-white">
                        <Activity size={20} className="text-muse-400" /> 命运回响 (Fate Echoes)
                    </h2>

                    <div className="flex bg-slate-800 rounded-lg p-1 ml-4 shadow-inner">
                        <button
                            onClick={() => setViewFilter('PENDING')}
                            className={`px-3 py-1 text-xs rounded-md transition-all flex items-center gap-1.5 ${viewFilter === 'PENDING' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <Inbox size={14} /> 收件箱 {project.echoes.filter(e => e.status === 'PENDING').length > 0 &&
                                <span className="bg-muse-600 text-[10px] px-1.5 rounded-full font-bold">
                                    {project.echoes.filter(e => e.status === 'PENDING').length}
                                </span>}
                        </button>
                        <button
                            onClick={() => setViewFilter('HISTORY')}
                            className={`px-3 py-1 text-xs rounded-md transition-all flex items-center gap-1.5 ${viewFilter === 'HISTORY' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
                        >
                            <History size={14} /> 历史流水
                        </button>
                    </div>
                </div>

                <button
                    onClick={handleDeduceFuture}
                    disabled={isDeducing}
                    className="bg-purple-900/50 hover:bg-purple-800 text-purple-200 border border-purple-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                    {isDeducing ? <Loader2 size={14} className="animate-spin" /> : <><Sparkles size={16} /> <span className="text-xs font-bold">推演蝴蝶效应</span></>}
                </button>

                <button
                    onClick={() => setShowGraphPanel(!showGraphPanel)}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
                        showGraphPanel
                            ? 'bg-muse-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                >
                    <Network size={16} />
                    <span className="text-xs font-bold">图谱查询</span>
                </button>

                <button
                    onClick={() => setShowDeepReview(true)}
                    className="bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-lg active:scale-95"
                >
                    <Search size={16} />
                    <span className="text-xs font-bold">深度审核</span>
                </button>

                <button
                    onClick={() => setShowIntegrityReport(true)}
                    className="bg-amber-900/50 hover:bg-amber-800 text-amber-200 border border-amber-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-lg active:scale-95"
                >
                    <FileText size={16} />
                    <span className="text-xs font-bold">完整性报告</span>
                </button>

                <button
                    onClick={async () => {
                        setShowBatchHistory(true);
                        if (useBackend) {
                            await loadBatchOperationHistory();
                        }
                    }}
                    className={`bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-lg active:scale-95 relative ${batchOperationHistory.length > 0 ? 'ring-1 ring-muse-500/50' : ''}`}
                    title="查看批量操作历史并撤销"
                >
                    <List size={16} />
                    <span className="text-xs font-bold">操作历史</span>
                    {batchOperationHistory.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-muse-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                            {batchOperationHistory.length}
                        </span>
                    )}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {filteredEchoes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50">
                        <Inbox size={48} className="mb-4" />
                        <p className="text-sm">暂无待处理回响。开始创作以捕捉命运变迁。</p>
                    </div>
                ) : (
                    filteredEchoes.map((echo) => (
                        <div
                            key={echo.id}
                            onClick={() => setSelectedEchoId(echo.id)}
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
                                            {getStatusIcon(echo.status)} 实录回响 - {new Date(echo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>

                                {viewFilter === 'PENDING' && (
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAcceptEchoToGraph(echo.id);
                                            }}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-lg shadow-lg shadow-emerald-900/20 transition-all active:scale-90"
                                            title="采纳并同步到图谱"
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleAction(echo.id, 'REJECTED'); }}
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
                                                                        className={`h-full rounded-full ${t.weight > 70 ? 'bg-rose-500' : t.weight > 40 ? 'bg-amber-500' : 'bg-blue-500'}`}
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
                                                                {t.trajectory === 'rising' ? '^' : t.trajectory === 'falling' ? 'v' : '->'}
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
        </div>
    );
};
