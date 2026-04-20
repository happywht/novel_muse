import React, { useState, useMemo, useEffect } from 'react';
import { ProjectState, Character, WorldSetting, Echo, AppSection } from '@/types';
import { deduceWorldConsequences, consolidateMemory } from '@/services/geminiService';
import {
    fetchRelationshipTimeline,
    fetchEchoForeshadowing,
    detectContradictions,
    API_BASE
} from '@/services/apiService';
import { EchoDeepReview } from './components/EchoDeepReview';
import { EchoIntegrityReport } from './components/EchoIntegrityReport';
import { useProjectStore } from '@/store';
import { useToast } from '@/hooks/useToast';
import { useAdvancedMode } from '@/hooks/useAdvancedMode';

// Sub-components
import { EchoChamberHeader } from './EchoChamber/EchoChamberHeader';
import { GraphQueryPanel } from './EchoChamber/GraphQueryPanel';
import { EchoFeed } from './EchoChamber/EchoFeed';
import { EntityDetailPanel } from './EchoChamber/EntityDetailPanel';
import { BatchOperationHistoryModal } from './EchoChamber/BatchOperationHistoryModal';

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
    const { isAdvanced } = useAdvancedMode();

    // UI State
    const [selectedEchoId, setSelectedEchoId] = useState<string | null>(null);
    const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
    const [viewFilter, setViewFilter] = useState<ViewFilter>('PENDING');

    // Loading States
    const [isDeducing, setIsDeducing] = useState(false);
    const [isConsolidating, setIsConsolidating] = useState(false);

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

    // Modal States
    const [showDeepReview, setShowDeepReview] = useState(false);
    const [showIntegrityReport, setShowIntegrityReport] = useState(false);
    const [showBatchHistory, setShowBatchHistory] = useState(false);
    const [undoingOperationId, setUndoingOperationId] = useState<string | null>(null);

    // Store
    const {
        batchOperationHistory,
        loadBatchOperationHistory,
        undoLastBatchOperation,
        useBackend
    } = useProjectStore();

    // --- Data Processing ---

    const filteredEchoes = useMemo(() => {
        return project.echoes
            .filter(e => {
                if (viewFilter === 'PENDING') {
                    return e.status === 'PENDING';
                } else {
                    return e.status === 'ACCEPTED' || e.status === 'ARCHIVED';
                }
            })
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [project.echoes, viewFilter]);

    const selectedEcho = useMemo(() =>
        project.echoes.find(e => e.id === selectedEchoId) || null
        , [project.echoes, selectedEchoId]);

    const effectiveTargetId = selectedEcho?.targetId || selectedEntityId;

    const targetEntity = useMemo(() => {
        if (!effectiveTargetId) return null;
        const char = project.characters.find(c => c.id === effectiveTargetId);
        if (char) return { data: char, type: 'CHARACTER' as const };
        const setting = project.worldSettings.find(w => w.id === effectiveTargetId);
        if (setting) return { data: setting, type: 'WORLD' as const };
        return null;
    }, [project, effectiveTargetId]);

    const entityHistory = useMemo(() => {
        if (!effectiveTargetId) return [];
        return project.echoes
            .filter(e => e.targetId === effectiveTargetId && e.status !== 'REJECTED')
            .sort((a, b) => b.timestamp - a.timestamp);
    }, [project.echoes, effectiveTargetId]);

    const consolidationCandidates = useMemo(() =>
        entityHistory.filter(e => e.status === 'ACCEPTED')
        , [entityHistory]);

    const pendingEchoCount = useMemo(() =>
        project.echoes.filter(e => e.status === 'PENDING').length,
        [project.echoes]
    );

    // --- Graph Query Handlers ---

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

    // --- Echo Action Handlers ---

    const handleAcceptEchoToGraph = async (echoId: string) => {
        try {
            const response = await fetch(`${API_BASE}/graph/${project.id}/echoes/${echoId}/accept`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error('Failed to accept echo to graph');

            handleAction(echoId, 'ACCEPTED');
            toast.success('Echo已采纳并同步到图谱');
        } catch (err) {
            console.error('Failed to accept echo:', err);
            toast.error('同步到图谱失败');
        }
    };

    const handleAction = (echoId: string, status: 'ACCEPTED' | 'REJECTED') => {
        const updatedEchoes = project.echoes.map(e =>
            e.id === echoId ? { ...e, status } : e
        );
        updateProject({ echoes: updatedEchoes });

        if (status === 'ACCEPTED') {
            const eco = project.echoes.find(e => e.id === echoId);
            if (eco) setSelectedEntityId(eco.targetId);
        }
    };

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

    // --- Special Operations ---

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
                status: 'PENDING',
                timestamp: Date.now()
            }));

            updateProject({ echoes: [...project.echoes, ...newEchoes] });
            setViewFilter('PENDING');
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

            import('@/services/apiService').then(({ syncProject }) => {
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

    const handleUndoBatchOperation = async (operationId: string) => {
        setUndoingOperationId(operationId);
        try {
            await undoLastBatchOperation(operationId);
        } catch (err) {
            console.error('Failed to undo:', err);
            toast.error('撤销失败，请重试');
            throw err;
        } finally {
            setUndoingOperationId(null);
        }
    };

    const handleOpenBatchHistory = async () => {
        setShowBatchHistory(true);
        if (useBackend) {
            await loadBatchOperationHistory();
        }
    };

    // --- Render ---

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6 relative animate-fade-in text-slate-200">
            {/* Left: Events Feed */}
            <div className="flex-[1.5] flex flex-col bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <EchoChamberHeader
                    viewFilter={viewFilter}
                    setViewFilter={setViewFilter}
                    isDeducing={isDeducing}
                    onDeduceFuture={handleDeduceFuture}
                    showGraphPanel={showGraphPanel}
                    onToggleGraphPanel={() => setShowGraphPanel(!showGraphPanel)}
                    isAdvanced={isAdvanced}
                    onOpenDeepReview={() => setShowDeepReview(true)}
                    onOpenIntegrityReport={() => setShowIntegrityReport(true)}
                    onOpenBatchHistory={handleOpenBatchHistory}
                    pendingEchoCount={pendingEchoCount}
                    batchOperationHistoryCount={batchOperationHistory.length}
                />

                {showGraphPanel && (
                    <GraphQueryPanel
                        characters={project.characters}
                        selectedChar1Id={selectedChar1Id}
                        selectedChar2Id={selectedChar2Id}
                        onChar1Change={setSelectedChar1Id}
                        onChar2Change={setSelectedChar2Id}
                        onLoadTimeline={loadRelationshipTimeline}
                        onLoadForeshadowing={loadForeshadowing}
                        onLoadContradictions={loadContradictions}
                        relationshipTimeline={relationshipTimeline}
                        foreshadowingList={foreshadowingList}
                        contradictions={contradictions}
                        isLoadingTimeline={isLoadingTimeline}
                        isLoadingForeshadowing={isLoadingForeshadowing}
                        isLoadingContradictions={isLoadingContradictions}
                    />
                )}

                <EchoFeed
                    echoes={filteredEchoes}
                    selectedEchoId={selectedEchoId}
                    viewFilter={viewFilter}
                    onSelectEcho={setSelectedEchoId}
                    onAcceptEcho={handleAcceptEchoToGraph}
                    onRejectEcho={(echoId) => handleAction(echoId, 'REJECTED')}
                />
            </div>

            {/* Right: Details & Memory Lane */}
            <EntityDetailPanel
                targetEntity={targetEntity}
                entityHistory={entityHistory}
                consolidationCandidates={consolidationCandidates}
                isConsolidating={isConsolidating}
                onClose={() => setSelectedEntityId(null)}
                onConsolidateMemory={handleConsolidateMemory}
            />


            {/* Deep Review Panel - Advanced Mode Only */}
            {isAdvanced && (
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
            )}

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
            <BatchOperationHistoryModal
                isOpen={showBatchHistory}
                onClose={() => setShowBatchHistory(false)}
                useBackend={useBackend}
                batchOperationHistory={batchOperationHistory}
                undoingOperationId={undoingOperationId}
                onUndo={handleUndoBatchOperation}
            />
        </div>
    );
};
