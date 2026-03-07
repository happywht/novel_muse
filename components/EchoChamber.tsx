import React, { useState, useMemo } from 'react';
import { ProjectState, Character, WorldSetting, Echo } from '../types';
import {
    X, Activity, Clock, User, Globe, Sparkles,
    Filter, Zap, PlayCircle, Brain, CheckCircle,
    Trash2, ChevronRight, Inbox, History, Search, Loader2, ArrowRight
} from 'lucide-react';
import { deduceWorldConsequences, consolidateMemory } from '../services/geminiService';

interface EchoChamberProps {
    project: ProjectState;
    updateProject: (data: Partial<ProjectState>) => void;
}

type ViewFilter = 'PENDING' | 'HISTORY';

export const EchoChamber: React.FC<EchoChamberProps> = ({ project, updateProject }) => {
    const [selectedEchoId, setSelectedEchoId] = useState<string | null>(null);
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
    const [viewFilter, setViewFilter] = useState<ViewFilter>('PENDING');
    const [isDeducing, setIsDeducing] = useState(false);
    const [isConsolidating, setIsConsolidating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // --- Data Processing ---

    // Echoes for the main feed
    const filteredEchoes = useMemo(() => {
        return project.echoes
            .filter(e => {
                if (viewFilter === 'PENDING') {
                    return e.status === 'PENDING' || e.status === 'PREDICTION';
                } else {
                    return e.status === 'ACCEPTED' || e.status === 'REJECTED' || e.status === 'ARCHIVED';
                }
            })
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [project.echoes, viewFilter]);

    // Selected Echo
    const selectedEcho = useMemo(() =>
        project.echoes.find(e => e.id === selectedEchoId) || null
        , [project.echoes, selectedEchoId]);

    // Effective Target Entity (either from selected echo or manual selection)
    const effectiveTargetId = selectedEcho?.targetId || selectedEntityId;

    const targetEntity = useMemo(() => {
        if (!effectiveTargetId) return null;
        const char = project.characters.find(c => c.id === effectiveTargetId);
        if (char) return { data: char, type: 'CHARACTER' as const };
        const setting = project.worldSettings.find(w => w.id === effectiveTargetId);
        if (setting) return { data: setting, type: 'WORLD' as const };
        return null;
    }, [project, effectiveTargetId]);

    // Entity's full echo history
    const entityHistory = useMemo(() => {
        if (!effectiveTargetId) return [];
        return project.echoes
            .filter(e => e.targetId === effectiveTargetId)
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [project.echoes, effectiveTargetId]);

    const consolidationCandidates = useMemo(() =>
        entityHistory.filter(e => e.status === 'ACCEPTED')
        , [entityHistory]);

    // --- Handlers ---

    const handleAction = (echoId: string, status: 'ACCEPTED' | 'REJECTED') => {
        const updatedEchoes = project.echoes.map(e =>
            e.id === echoId ? { ...e, status } : e
        );
        updateProject({ echoes: updatedEchoes });

        // If accepted, add to selected entity view immediately for feedback
        if (status === 'ACCEPTED') {
            const eco = project.echoes.find(e => e.id === echoId);
            if (eco) setSelectedEntityId(eco.targetId);
        }
    };

    const handleDeduceFuture = async () => {
        setIsDeducing(true);
        try {
            const recommendations = await deduceWorldConsequences(
                project.echoes,
                project.characters,
                project.worldSettings,
                project.genre
            );

            const newEchoes: Echo[] = recommendations.map(rec => ({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                targetId: rec.targetId,
                targetName: rec.targetName,
                type: rec.targetType,
                description: rec.suggestedUpdate,
                reason: rec.reason,
                status: 'PREDICTION',
                timestamp: Date.now()
            }));

            updateProject({ echoes: [...project.echoes, ...newEchoes] });
            setViewFilter('PENDING'); // Ensure we see the results
        } catch (e) {
            console.error(e);
            alert("推演失败");
        } finally {
            setIsDeducing(false);
        }
    };

    const handleConsolidateMemory = async () => {
        if (!targetEntity || consolidationCandidates.length === 0) return;
        setIsConsolidating(true);
        try {
            const currentDesc = targetEntity.type === 'CHARACTER'
                ? (targetEntity.data as Character).description
                : (targetEntity.data as WorldSetting).content;

            const newDesc = await consolidateMemory(
                (targetEntity.data as any).name || (targetEntity.data as any).title || 'Unknown',
                targetEntity.type,
                currentDesc,
                consolidationCandidates
            );

            let updatedCharacters = [...project.characters];
            let updatedWorldSettings = [...project.worldSettings];

            if (targetEntity.type === 'CHARACTER') {
                updatedCharacters = updatedCharacters.map(c =>
                    c.id === effectiveTargetId ? { ...c, description: newDesc } : c
                );
            } else {
                updatedWorldSettings = updatedWorldSettings.map(w =>
                    w.id === effectiveTargetId ? { ...w, content: newDesc } : w
                );
            }

            const updatedEchoes = project.echoes.map(e =>
                consolidationCandidates.find(c => c.id === e.id)
                    ? { ...e, status: 'ARCHIVED' as const }
                    : e
            );

            const updatedProjectData = {
                ...project,
                characters: updatedCharacters,
                worldSettings: updatedWorldSettings,
                echoes: updatedEchoes
            };

            updateProject(updatedProjectData);

            // Trigger sync
            import('../services/apiService').then(({ syncProject }) => {
                syncProject(updatedProjectData).catch(err => {
                    console.error("Failed to sync consolidated memory:", err);
                });
            });

            alert("记忆固化完成！短期记忆已转化为长期档案。");
        } catch (e) {
            console.error(e);
            alert("记忆固化失败");
        } finally {
            setIsConsolidating(false);
        }
    };

    // --- Render Helpers ---

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ACCEPTED': return <CheckCircle size={14} className="text-emerald-400" />;
            case 'REJECTED': return <X size={14} className="text-rose-400" />;
            case 'PREDICTION': return <Sparkles size={14} className="text-purple-400" />;
            case 'ARCHIVED': return <History size={14} className="text-slate-500" />;
            default: return <Clock size={14} className="text-amber-400" />;
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6 relative animate-fade-in text-slate-200">
            {/* Left: Events Feed */}
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
                                <Inbox size={14} /> 收件箱 {project.echoes.filter(e => e.status === 'PENDING' || e.status === 'PREDICTION').length > 0 &&
                                    <span className="bg-muse-600 text-[10px] px-1.5 rounded-full font-bold">
                                        {project.echoes.filter(e => e.status === 'PENDING' || e.status === 'PREDICTION').length}
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
                                                {getStatusIcon(echo.status)} {echo.status === 'PREDICTION' ? '未来推演' : '实录回响'} • {new Date(echo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>

                                    {viewFilter === 'PENDING' && (
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleAction(echo.id, 'ACCEPTED'); }}
                                                className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-lg shadow-lg shadow-emerald-900/20 transition-all active:scale-90"
                                                title="采纳"
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
                                        “{echo.reason}”
                                    </div>

                                    {/* NEW: Display Triples */}
                                    {echo.triples && echo.triples.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {echo.triples.map((t, i) => (
                                                <div key={i} className="flex items-center gap-1 bg-muse-900/40 border border-muse-500/20 px-2 py-1 rounded text-[10px] text-muse-200">
                                                    <span className="font-bold opacity-70">{t.subject}</span>
                                                    <ArrowRight size={10} className="text-muse-500" />
                                                    <span className="text-muse-400">[{t.relation}]</span>
                                                    <ArrowRight size={10} className="text-muse-500" />
                                                    <span className="font-bold opacity-70">{t.object}</span>
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

            {/* Right: Details & Memory Lane */}
            <div className={`w-1/3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden transition-all duration-300 ${targetEntity ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {targetEntity && (
                    <>
                        {/* Entity Header */}
                        <div className="p-6 border-b border-slate-800 bg-slate-950/20">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${targetEntity.type === 'CHARACTER' ? 'bg-indigo-900 text-indigo-300 shadow-lg' : 'bg-emerald-900 text-emerald-300 shadow-lg'}`}>
                                    {targetEntity.type === 'CHARACTER' ? 'Character' : 'World Lore'}
                                </div>
                                <button onClick={() => setSelectedEntityId(null)} className="text-slate-500 hover:text-white">
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
                                        onClick={handleConsolidateMemory}
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
                                                <p className="text-[10px] text-slate-500 leading-relaxed italic">“{item.reason}”</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
