import React, { useState, useMemo, useEffect } from 'react';
import { ProjectState, Character, WorldSetting, Echo, AppSection } from '../types';
import {
    X, Activity, Clock, User, Globe, Sparkles,
    Filter, Zap, PlayCircle, Brain, CheckCircle,
    Trash2, ChevronRight, Inbox, History, Search, Loader2, ArrowRight,
    Network, AlertTriangle, GitBranch, Users, ClipboardCheck, FileText,
    RotateCcw, List
} from 'lucide-react';
import { deduceWorldConsequences, consolidateMemory } from '../services/geminiService';
import {
    fetchRelationshipTimeline,
    fetchEchoForeshadowing,
    detectContradictions,
    API_BASE,
    BatchOperationHistoryItem
} from '../services/apiService';
import { EchoDeepReview } from './Echo/EchoDeepReview';
import { EchoIntegrityReport } from './Echo/EchoIntegrityReport';
import { PromptPanel } from './PromptPanel';
import { useProjectStore } from '../store/useProjectStore';
import { useToast } from '../hooks/useToast';
import { RELATIONSHIP_CONFIG } from '../config/constants';

interface EchoChamberProps {
    project: ProjectState;
    updateProject: (data: Partial<ProjectState>) => void;
}

type ViewFilter = 'PENDING' | 'HISTORY';

// Graph Query State Types
interface RelationshipTimelineItem {
    timestamp: number;
    echoId: string;
    relation: string;
    trajectory: string;
    weight: number;
    description: string;
}

interface ForeshadowingItem {
    subject: string;
    relation: string;
    object: string;
    echoId: string;
    createdAt: number;
    relatedChapter?: string;
}

interface ContradictionItem {
    type: 'RELATIONSHIP_CONFLICT' | 'STATE_MISMATCH' | 'TEMPORAL_ERROR';
    description: string;
    entities: string[];
    conflictingEchoes: string[];
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
}

export const EchoChamber: React.FC<EchoChamberProps> = ({ project, updateProject }) => {
    const { toast } = useToast();
    const [selectedEchoId, setSelectedEchoId] = useState<string | null>(null);
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
    const [viewFilter, setViewFilter] = useState<ViewFilter>('PENDING');
    const [isDeducing, setIsDeducing] = useState(false);
    const [isConsolidating, setIsConsolidating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Graph Query States
    const [selectedChar1Id, setSelectedChar1Id] = useState<string | null>(null);
    const [selectedChar2Id, setSelectedChar2Id] = useState<string | null>(null);
    const [relationshipTimeline, setRelationshipTimeline] = useState<RelationshipTimelineItem[]>([]);
    const [foreshadowingList, setForeshadowingList] = useState<ForeshadowingItem[]>([]);
    const [contradictions, setContradictions] = useState<ContradictionItem[]>([]);
    const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
    const [isLoadingForeshadowing, setIsLoadingForeshadowing] = useState(false);
    const [isLoadingContradictions, setIsLoadingContradictions] = useState(false);
    const [showGraphPanel, setShowGraphPanel] = useState(false);

    // Deep Review & Integrity Report States
    const [showDeepReview, setShowDeepReview] = useState(false);
    const [showIntegrityReport, setShowIntegrityReport] = useState(false);

    // Batch Operation History States
    const [showBatchHistory, setShowBatchHistory] = useState(false);
    const [undoingOperationId, setUndoingOperationId] = useState<string | null>(null);

    // Get batch operation history and actions from store
    const {
        batchOperationHistory,
        loadBatchOperationHistory,
        undoLastBatchOperation,
        useBackend
    } = useProjectStore();

    // --- Data Processing ---

    // Echoes for the main feed
    const filteredEchoes = useMemo(() => {
        return project.echoes
            .filter(e => {
                if (viewFilter === 'PENDING') {
                    return e.status === 'PENDING' || e.status === 'PREDICTION';
                } else {
                    return e.status === 'ACCEPTED' || e.status === 'ARCHIVED';
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
            .filter(e => e.targetId === effectiveTargetId && e.status !== 'REJECTED')
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [project.echoes, effectiveTargetId]);

    const consolidationCandidates = useMemo(() =>
        entityHistory.filter(e => e.status === 'ACCEPTED')
        , [entityHistory]);

    // --- Graph Query Handlers ---

    // Load foreshadowing on mount
    useEffect(() => {
        if (showGraphPanel && foreshadowingList.length === 0) {
            loadForeshadowing();
        }
    }, [showGraphPanel]);

    const loadForeshadowing = async () => {
        setIsLoadingForeshadowing(true);
        try {
            const result = await fetchEchoForeshadowing(project.id);
            setForeshadowingList(result);
        } catch (err) {
            console.error('Failed to load foreshadowing:', err);
        } finally {
            setIsLoadingForeshadowing(false);
        }
    };

    const loadRelationshipTimeline = async () => {
        if (!selectedChar1Id || !selectedChar2Id) {
            toast.warning('请选择两个角色');
            return;
        }
        if (selectedChar1Id === selectedChar2Id) {
            toast.warning('请选择两个不同的角色');
            return;
        }

        setIsLoadingTimeline(true);
        try {
            const result = await fetchRelationshipTimeline(project.id, selectedChar1Id, selectedChar2Id);
            setRelationshipTimeline(result);
        } catch (err) {
            console.error('Failed to load relationship timeline:', err);
            toast.error('加载关系时间线失败');
        } finally {
            setIsLoadingTimeline(false);
        }
    };

    const loadContradictions = async () => {
        setIsLoadingContradictions(true);
        try {
            const result = await detectContradictions(project.id);
            setContradictions(result);
        } catch (err) {
            console.error('Failed to detect contradictions:', err);
            toast.error('矛盾检测失败');
        } finally {
            setIsLoadingContradictions(false);
        }
    };

    const handleAcceptEchoToGraph = async (echoId: string) => {
        try {
            const response = await fetch(`${API_BASE}/graph/${project.id}/echoes/${echoId}/accept`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error('Failed to accept echo to graph');

            // Update local state
            handleAction(echoId, 'ACCEPTED');
            toast.success('Echo已采纳并同步到图谱');
        } catch (err) {
            console.error('Failed to accept echo:', err);
            toast.error('同步到图谱失败');
        }
    };

    // Deep Review Handlers
    const handleAcceptEcho = (echo: Echo) => {
        handleAction(echo.id, 'ACCEPTED');
    };

    const handleRejectEcho = (echo: Echo) => {
        handleAction(echo.id, 'REJECTED');
    };

    const handleBatchAccept = (echoes: Echo[]) => {
        const updatedEchoes = project.echoes.map(e =>
            echoes.find(selected => selected.id === e.id)
                ? { ...e, status: 'ACCEPTED' as const }
                : e
        );
        updateProject({ echoes: updatedEchoes });
    };

    const handleBatchReject = (echoes: Echo[]) => {
        const updatedEchoes = project.echoes.map(e =>
            echoes.find(selected => selected.id === e.id)
                ? { ...e, status: 'REJECTED' as const }
                : e
        );
        updateProject({ echoes: updatedEchoes });
    };

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
                project.id,
                project.activeBranchId || 'main',
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
            toast.error("推演失败");
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

            toast.success("记忆固化完成！短期记忆已转化为长期档案。");
        } catch (e) {
            console.error(e);
            toast.error("记忆固化失败");
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

                {/* Graph Query Panel */}
                {showGraphPanel && (
                    <div className="border-b border-slate-800 bg-slate-950/20 p-4 space-y-4">
                        {/* Relationship Timeline Section */}
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                <Users size={16} className="text-muse-400" />
                                关系时间线
                            </h3>
                            <div className="flex gap-2 mb-3">
                                <select
                                    value={selectedChar1Id || ''}
                                    onChange={(e) => setSelectedChar1Id(e.target.value || null)}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300"
                                >
                                    <option value="">选择角色1</option>
                                    {project.characters.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedChar2Id || ''}
                                    onChange={(e) => setSelectedChar2Id(e.target.value || null)}
                                    className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-300"
                                >
                                    <option value="">选择角色2</option>
                                    {project.characters.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={loadRelationshipTimeline}
                                    disabled={isLoadingTimeline || !selectedChar1Id || !selectedChar2Id}
                                    className="bg-muse-600 hover:bg-muse-500 disabled:bg-slate-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-all"
                                >
                                    {isLoadingTimeline ? <Loader2 size={12} className="animate-spin" /> : '查询'}
                                </button>
                            </div>

                            {relationshipTimeline.length > 0 && (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {relationshipTimeline.map((item, idx) => (
                                        <div key={idx} className="bg-slate-900/50 p-2 rounded border border-slate-800 text-xs">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-muse-400 font-bold">{item.relation}</span>
                                                <span className="text-slate-500">{new Date(item.timestamp).toLocaleDateString()}</span>
                                            </div>
                                            <p className="text-slate-400">{item.description}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${
                                                            item.weight > RELATIONSHIP_CONFIG.HIGH_WEIGHT_THRESHOLD ? 'bg-rose-500' :
                                                            item.weight > RELATIONSHIP_CONFIG.MEDIUM_WEIGHT_THRESHOLD ? 'bg-amber-500' : 'bg-blue-500'
                                                        }`}
                                                        style={{ width: `${item.weight}%` }}
                                                    />
                                                </div>
                                                <span className={`text-[8px] px-1 rounded font-bold ${
                                                    item.trajectory === 'rising' ? 'bg-emerald-500/20 text-emerald-400' :
                                                    item.trajectory === 'falling' ? 'bg-rose-500/20 text-rose-400' :
                                                    'bg-slate-700 text-slate-400'
                                                }`}>
                                                    {item.trajectory === 'rising' ? '↑ 上升' : item.trajectory === 'falling' ? '↓ 下降' : '→ 稳定'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Foreshadowing Section */}
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <GitBranch size={16} className="text-amber-400" />
                                    未回收伏笔 ({foreshadowingList.length})
                                </h3>
                                <button
                                    onClick={loadForeshadowing}
                                    disabled={isLoadingForeshadowing}
                                    className="text-[10px] text-slate-400 hover:text-white"
                                >
                                    {isLoadingForeshadowing ? <Loader2 size={12} className="animate-spin" /> : '刷新'}
                                </button>
                            </div>

                            {foreshadowingList.length > 0 ? (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {foreshadowingList.map((item, idx) => (
                                        <div key={idx} className="bg-amber-900/10 border border-amber-500/20 p-2 rounded text-xs">
                                            <div className="flex items-center gap-1 text-amber-300 mb-1">
                                                <span className="font-bold">{item.subject}</span>
                                                <ArrowRight size={10} className="text-amber-500" />
                                                <span className="text-amber-400">[{item.relation}]</span>
                                                <ArrowRight size={10} className="text-amber-500" />
                                                <span className="font-bold">{item.object}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-500 text-[10px]">
                                                <span>来源: {item.relatedChapter || '未知章节'}</span>
                                                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-500 text-center py-4">暂未发现未回收的伏笔</p>
                            )}
                        </div>

                        {/* Contradiction Detection Section */}
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <AlertTriangle size={16} className="text-rose-400" />
                                    矛盾检测
                                </h3>
                                <button
                                    onClick={loadContradictions}
                                    disabled={isLoadingContradictions}
                                    className="bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 text-white px-3 py-1 rounded text-xs font-bold transition-all"
                                >
                                    {isLoadingContradictions ? <Loader2 size={12} className="animate-spin" /> : '检测矛盾'}
                                </button>
                            </div>

                            {contradictions.length > 0 && (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {contradictions.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className={`p-2 rounded border text-xs ${
                                                item.severity === 'HIGH' ? 'bg-rose-900/20 border-rose-500/50' :
                                                item.severity === 'MEDIUM' ? 'bg-amber-900/20 border-amber-500/50' :
                                                'bg-slate-900/20 border-slate-700/50'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`font-bold ${
                                                    item.severity === 'HIGH' ? 'text-rose-400' :
                                                    item.severity === 'MEDIUM' ? 'text-amber-400' :
                                                    'text-slate-400'
                                                }`}>
                                                    {item.severity === 'HIGH' ? '🔴 严重' :
                                                     item.severity === 'MEDIUM' ? '🟡 中等' : '🟢 轻微'}
                                                </span>
                                                <span className="text-slate-500 text-[10px]">
                                                    {item.type.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            <p className="text-slate-300 mb-1">{item.description}</p>
                                            <div className="text-slate-500 text-[10px]">
                                                涉及实体: {item.entities.join(', ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

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

                                    {/* NEW: Display Triples with Weight & Trajectory */}
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
                                                <p className="text-[10px] text-slate-500 leading-relaxed italic">"{item.reason}"</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Right Sidebar: Prompt Panel */}
            <div className="w-72 flex-shrink-0">
                <PromptPanel moduleId={AppSection.ECHOES} />
            </div>

            {/* Deep Review Panel */}
            <EchoDeepReview
                isOpen={showDeepReview}
                onClose={() => setShowDeepReview(false)}
                echoes={project.echoes}
                chapters={project.chapters}
                characters={project.characters}
                worldSettings={project.worldSettings}
                onAccept={handleAcceptEcho}
                onReject={handleRejectEcho}
                onBatchAccept={handleBatchAccept}
                onBatchReject={handleBatchReject}
            />

            {/* Integrity Report Panel */}
            <EchoIntegrityReport
                isOpen={showIntegrityReport}
                onClose={() => setShowIntegrityReport(false)}
                onConfirm={() => setShowIntegrityReport(false)}
                echoes={project.echoes}
                characters={project.characters}
                worldSettings={project.worldSettings}
                chapters={project.chapters}
            />

            {/* Batch Operation History Modal */}
            {showBatchHistory && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-fade-in"
                    onClick={() => setShowBatchHistory(false)}
                >
                    <div
                        className="w-[500px] max-h-[70vh] bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <List className="text-muse-400" size={20} />
                                <h2 className="text-lg font-bold text-white">批量操作历史</h2>
                            </div>
                            <button
                                onClick={() => setShowBatchHistory(false)}
                                className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            {!useBackend ? (
                                <div className="text-center py-8 text-slate-500">
                                    <AlertTriangle size={32} className="mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">批量操作历史需要后端支持</p>
                                    <p className="text-xs mt-1">请启用后端服务以使用此功能</p>
                                </div>
                            ) : batchOperationHistory.length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    <History size={32} className="mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">暂无批量操作历史</p>
                                    <p className="text-xs mt-1">最近的批量操作记录将显示在这里</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {batchOperationHistory.map((item: BatchOperationHistoryItem) => (
                                        <div
                                            key={item.id}
                                            className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-all"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {item.operation === 'BATCH_ACCEPT' ? (
                                                        <CheckCircle size={16} className="text-emerald-400" />
                                                    ) : (
                                                        <Trash2 size={16} className="text-rose-400" />
                                                    )}
                                                    <span className={`text-sm font-bold ${
                                                        item.operation === 'BATCH_ACCEPT' ? 'text-emerald-400' : 'text-rose-400'
                                                    }`}>
                                                        {item.operation === 'BATCH_ACCEPT' ? '批量采纳' : '批量拒绝'}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(item.timestamp).toLocaleString('zh-CN', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-slate-400">
                                                    影响 <span className="font-bold text-slate-300">{item.echoCount}</span> 条 Echo
                                                </div>

                                                {item.canUndo && (
                                                    <button
                                                        onClick={async () => {
                                                            if (undoingOperationId === item.id) return;

                                                            setUndoingOperationId(item.id);
                                                            try {
                                                                await undoLastBatchOperation(item.id);
                                                                // 成功后关闭弹窗
                                                                setShowBatchHistory(false);
                                                            } catch (err) {
                                                                console.error('Failed to undo:', err);
                                                                toast.error('撤销失败，请重试');
                                                            } finally {
                                                                setUndoingOperationId(null);
                                                            }
                                                        }}
                                                        disabled={undoingOperationId === item.id}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                                            undoingOperationId === item.id
                                                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                                : 'bg-amber-900/50 hover:bg-amber-800 text-amber-200 border border-amber-500/30 active:scale-95'
                                                        }`}
                                                    >
                                                        {undoingOperationId === item.id ? (
                                                            <>
                                                                <Loader2 size={12} className="animate-spin" />
                                                                撤销中...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <RotateCcw size={12} />
                                                                撤销
                                                            </>
                                                        )}
                                                    </button>
                                                )}

                                                {!item.canUndo && (
                                                    <span className="text-xs text-slate-600 px-3 py-1.5">
                                                        已过期
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
                            <p className="text-xs text-slate-500 text-center">
                                批量操作在 5 分钟内可撤销
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
