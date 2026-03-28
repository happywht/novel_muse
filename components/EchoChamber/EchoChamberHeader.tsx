import React from 'react';
import {
    Activity, Inbox, History, Sparkles, Network, Search, FileText, List, Loader2
} from 'lucide-react';

interface EchoChamberHeaderProps {
    viewFilter: 'PENDING' | 'HISTORY';
    setViewFilter: (filter: 'PENDING' | 'HISTORY') => void;
    isDeducing: boolean;
    onDeduceFuture: () => void;
    showGraphPanel: boolean;
    onToggleGraphPanel: () => void;
    isAdvanced: boolean;
    onOpenDeepReview: () => void;
    onOpenIntegrityReport: () => void;
    onOpenBatchHistory: () => void;
    pendingEchoCount: number;
    batchOperationHistoryCount: number;
}

export const EchoChamberHeader: React.FC<EchoChamberHeaderProps> = ({
    viewFilter,
    setViewFilter,
    isDeducing,
    onDeduceFuture,
    showGraphPanel,
    onToggleGraphPanel,
    isAdvanced,
    onOpenDeepReview,
    onOpenIntegrityReport,
    onOpenBatchHistory,
    pendingEchoCount,
    batchOperationHistoryCount
}) => {
    return (
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
                        <Inbox size={14} /> 收件箱 {pendingEchoCount > 0 &&
                            <span className="bg-muse-600 text-[10px] px-1.5 rounded-full font-bold">
                                {pendingEchoCount}
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

            <div className="flex items-center gap-3">
                <button
                    onClick={onDeduceFuture}
                    disabled={isDeducing}
                    className="bg-purple-900/50 hover:bg-purple-800 text-purple-200 border border-purple-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                    {isDeducing ? <Loader2 size={14} className="animate-spin" /> : <><Sparkles size={16} /> <span className="text-xs font-bold">推演蝴蝶效应</span></>}
                </button>

                <button
                    onClick={onToggleGraphPanel}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
                        showGraphPanel
                            ? 'bg-muse-600 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                >
                    <Network size={16} />
                    <span className="text-xs font-bold">图谱查询</span>
                </button>

                {isAdvanced && (
                    <button
                        onClick={onOpenDeepReview}
                        className="bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-lg active:scale-95"
                    >
                        <Search size={16} />
                        <span className="text-xs font-bold">深度审核</span>
                    </button>
                )}

                <button
                    onClick={onOpenIntegrityReport}
                    className="bg-amber-900/50 hover:bg-amber-800 text-amber-200 border border-amber-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-lg active:scale-95"
                >
                    <FileText size={16} />
                    <span className="text-xs font-bold">完整性报告</span>
                </button>

                <button
                    onClick={onOpenBatchHistory}
                    className={`bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all shadow-lg active:scale-95 relative ${batchOperationHistoryCount > 0 ? 'ring-1 ring-muse-500/50' : ''}`}
                    title="查看批量操作历史并撤销"
                >
                    <List size={16} />
                    <span className="text-xs font-bold">操作历史</span>
                    {batchOperationHistoryCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-muse-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                            {batchOperationHistoryCount}
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
};
