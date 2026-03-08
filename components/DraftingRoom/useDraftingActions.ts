import React from 'react';
import { useProjectStore } from '../../store/useProjectStore';
import {
    ProjectState, Character, WorldSetting, Draft, Echo,
    KnowledgeTriple, NarrativeInsight, PolishMode, ViewMode
} from '../../types';
import {
    generateSceneFromIngredients, polishDraft, rewriteLocalText,
    analyzeStateChanges, generateTwistHooks, extractKnowledgeTriples,
    verifyLogicConflicts, summarizeChapter
} from '../../services/geminiService';
import {
    fetchUnresolvedForeshadowing, fetchRelatedSubgraph,
    fetchPhysicalStatus, mergeBranchApi,
    fetchFactions, simulatePropagation,
    fetchNarrativeInsights, patchProject
} from '../../services/apiService';

interface UseDraftingActionsProps {
    project: ProjectState;
    updateProject: (data: Partial<ProjectState>) => void;
    activeBranchId: string;
    useBackend: boolean;
    activePlotNodeId: string | null;
    setActivePlotNodeId: (id: string | null) => void;
    activeChapterId: string | null;
    setActiveChapterId: (id: string | null) => void;
    fetchChapterContent: (id: string) => void;
}

export const useDraftingActions = ({
    project,
    updateProject,
    activeBranchId,
    useBackend,
    activePlotNodeId,
    setActivePlotNodeId,
    activeChapterId,
    setActiveChapterId,
    fetchChapterContent
}: UseDraftingActionsProps) => {
    // UI State
    const [viewMode, setViewMode] = React.useState<ViewMode>('FORGE');
    const [plotBeat, setPlotBeat] = React.useState('');
    const [showReference, setShowReference] = React.useState(false);
    const [selectedChars, setSelectedChars] = React.useState<string[]>([]);
    const [selectedLocationId, setSelectedLocationId] = React.useState('');
    const [generatedContent, setGeneratedContent] = React.useState('');
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [activeDraftId, setActiveDraftId] = React.useState<string | null>(null);
    const [showAdvancedParams, setShowAdvancedParams] = React.useState(false);
    const [pacing, setPacing] = React.useState<'SLOW_BURN' | 'BALANCED' | 'CLIMAX'>('BALANCED');
    const [targetWordCount, setTargetWordCount] = React.useState(3000);
    const [povCharId, setPovCharId] = React.useState('');
    const [isPolishing, setIsPolishing] = React.useState(false);
    const [showPolishMenu, setShowPolishMenu] = React.useState(false);
    const [isLocalRewriting, setIsLocalRewriting] = React.useState(false);
    const [isAnalyzingState, setIsAnalyzingState] = React.useState(false);
    const [isExtracting, setIsExtracting] = React.useState(false);
    const [localPlotNodeId, setLocalPlotNodeId] = React.useState<string | null>(null);
    const [extractedEchoes, setExtractedEchoes] = React.useState<Echo[]>([]);
    const [suggestedTwists, setSuggestedTwists] = React.useState<string[]>([]);
    const [isGeneratingTwists, setIsGeneratingTwists] = React.useState(false);
    const [activeTwist, setActiveTwist] = React.useState('');
    const [narrativeInsights, setNarrativeInsights] = React.useState<NarrativeInsight[]>([]);
    const [isFetchingInsights, setIsFetchingInsights] = React.useState(false);
    const [pendingForeshadowing, setPendingForeshadowing] = React.useState<KnowledgeTriple[]>([]);
    const [isFetchingForeshadowing, setIsFetchingForeshadowing] = React.useState(false);
    const [isMergingBranch, setIsMergingBranch] = React.useState(false);
    const [isEditingManuscript, setIsEditingManuscript] = React.useState(false);
    const [editingContent, setEditingContent] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);

    // Phase 5 States
    const [factions, setFactions] = React.useState<any[]>([]);
    const [isFetchingFactions, setIsFetchingFactions] = React.useState(false);
    const [showFactionPanel, setShowFactionPanel] = React.useState(false);
    const [showButterflyPanel, setShowButterflyPanel] = React.useState(false);
    const [propagationRisks, setPropagationRisks] = React.useState<any[]>([]);
    const [isSimulatingPropagation, setIsSimulatingPropagation] = React.useState(false);

    // Task 2.2: Branching Sandbox State
    const [availableBranches, setAvailableBranches] = React.useState<string[]>(
        project.availableBranches || ['main']
    );

    // Logic Audit State
    const [isAuditingLogic, setIsAuditingLogic] = React.useState(false);
    const [logicConflicts, setLogicConflicts] = React.useState<any[]>([]);

    // Effects for Bridge and Initialization
    React.useEffect(() => {
        if (activePlotNodeId) {
            const node = project.plotNodes.find(n => n.id === activePlotNodeId);
            if (node) {
                setPlotBeat(node.content);
                setSelectedChars(node.relatedCharacters || []);
                setSelectedLocationId(node.relatedLocations?.[0] || '');
                setLocalPlotNodeId(node.id);
                setActivePlotNodeId(null);
                setViewMode('FORGE');
                handleFetchForeshadowing();
            }
        }
    }, [activePlotNodeId, project.plotNodes]);

    React.useEffect(() => {
        if (useBackend) handleFetchForeshadowing();
    }, [useBackend]);

    React.useEffect(() => {
        if (activeChapterId) {
            const chapter = project.chapters.find(c => c.id === activeChapterId);
            if (chapter) {
                if (chapter.summary) setPlotBeat(chapter.summary);
                if (chapter.expectedPOV) {
                    const char = project.characters.find(c => c.name.includes(chapter.expectedPOV!) || chapter.expectedPOV!.includes(c.name));
                    if (char) setPovCharId(char.id);
                }
                if (chapter.plotNodeId) {
                    const node = project.plotNodes.find(n => n.id === chapter.plotNodeId);
                    if (node) {
                        setSelectedChars(node.relatedCharacters || []);
                        setSelectedLocationId(node.relatedLocations?.[0] || '');
                    }
                }
            }
        }
    }, [activeChapterId, project.chapters]);

    React.useEffect(() => {
        if (project.creativeSettings.promptProfile === 'WEB_NOVEL' && targetWordCount === 3000) setTargetWordCount(5000);
        else if (project.creativeSettings.promptProfile === 'LITERARY' && targetWordCount === 5000) setTargetWordCount(3000);
    }, [project.creativeSettings.promptProfile]);

    // Handlers
    const toggleCharSelection = (id: string) => {
        setSelectedChars(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    const handleFetchForeshadowing = async () => {
        if (!useBackend) return;
        setIsFetchingForeshadowing(true);
        try {
            const hooks = await fetchUnresolvedForeshadowing(project.id, activeBranchId);
            setPendingForeshadowing(hooks);
        } catch (err) {
            console.error(err);
        } finally {
            setIsFetchingForeshadowing(false);
        }
    };

    const handleFetchInsights = async () => {
        if (!useBackend) return;
        setIsFetchingInsights(true);
        try {
            const insights = await fetchNarrativeInsights(project.id, activeBranchId);
            setNarrativeInsights(insights);
        } catch (err) {
            console.error(err);
        } finally {
            setIsFetchingInsights(false);
        }
    };

    const handleGenerateTwists = async () => {
        if (!plotBeat || !useBackend) return;
        setIsGeneratingTwists(true);
        try {
            const context = project.chapters.slice(-3).map(c => c.content || c.summary).join('\\n\\n');
            const twists = await generateTwistHooks(context, plotBeat);
            setSuggestedTwists(twists);
        } catch (err) {
            console.error(err);
        } finally {
            setIsGeneratingTwists(false);
        }
    };

    const handleMergeBranch = async () => {
        if (activeBranchId === 'main' || !useBackend) return;
        if (!confirm(`确定要将分支 ${activeBranchId} 合并回主线吗？这可能会覆盖主线的部分数据。`)) return;
        setIsMergingBranch(true);
        try {
            await mergeBranchApi(project.id, activeBranchId);
            alert("合并成功！");
        } catch (err) {
            alert("合并失败: " + (err as Error).message);
        } finally {
            setIsMergingBranch(false);
        }
    };

    const handleGenerate = async () => {
        if (!plotBeat.trim()) {
            alert("请输入或选择一个情节目标");
            return;
        }
        setIsGenerating(true);
        setExtractedEchoes([]);
        try {
            const activeCharacters = (project.characters || []).filter(c => selectedChars.includes(c.id));
            const activeLocation = (project.worldSettings || []).find(w => w.id === selectedLocationId) || null;

            const sortedChapters = [...project.chapters].sort((a, b) => a.order - b.order);
            const currentIndex = sortedChapters.findIndex(c => c.id === activeChapterId);
            const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : (currentIndex < 0 ? sortedChapters[sortedChapters.length - 1] : null);
            const previousContext = prevChapter?.content?.slice(-2000);

            const rollingSummary = sortedChapters.slice(0, currentIndex >= 0 ? currentIndex : sortedChapters.length)
                .filter(c => c.summary && c.summary.trim() !== "")
                .map(c => `[第 ${c.order} 章: ${c.title}]\n${c.summary}`)
                .join('\n\n') || undefined;

            const povCharName = povCharId ? (project.characters || []).find(c => c.id === povCharId)?.name : undefined;

            let graphContext = undefined;
            let physicalStatus = [];
            let unresolvedForeshadowing = [];

            if (useBackend) {
                const anchors = [...activeCharacters.map(c => c.name), ...(activeLocation ? [activeLocation.title] : [])];
                const promises: Promise<any>[] = [fetchUnresolvedForeshadowing(project.id, activeBranchId)];
                if (anchors.length > 0) {
                    promises.push(fetchRelatedSubgraph(project.id, anchors, activeBranchId));
                    promises.push(fetchPhysicalStatus(project.id, anchors, activeBranchId));
                }
                const results = await Promise.all(promises);
                unresolvedForeshadowing = results[0];
                if (anchors.length > 0) {
                    graphContext = results[1];
                    physicalStatus = results[2];
                }
            }

            const result = await generateSceneFromIngredients(
                project.genre, plotBeat, activeCharacters, activeLocation, project.worldSettings || [],
                project.creativeSettings, previousContext, pacing, project.echoes || [],
                targetWordCount, povCharName, rollingSummary, activeChapterId || undefined,
                activeTwist || undefined, graphContext, physicalStatus, unresolvedForeshadowing
            );

            const formattedResult = result.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p.trim()}</p>`).join('');
            setGeneratedContent(formattedResult);
            setActiveDraftId(null);

            triggerStateAnalysis(result, activeCharacters);
            // 自动触发逻辑审计
            triggerLogicAudit(result);
        } catch (e) {
            alert("生成失败");
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePolish = async (mode: PolishMode) => {
        if (!generatedContent) return;
        setIsPolishing(true);
        setShowPolishMenu(false);
        try {
            const result = await polishDraft(generatedContent, mode, project.creativeSettings);
            setGeneratedContent(result);
            const activeCharacters = (project.characters || []).filter(c => selectedChars.includes(c.id));
            triggerStateAnalysis(result, activeCharacters);
        } catch (e) {
            alert("润色失败");
        } finally {
            setIsPolishing(false);
        }
    };

    const handleLocalRewrite = async (targetText: string, instruction: string, contextBefore: string, contextAfter: string, applyRewrite: (newText: string) => void) => {
        setIsLocalRewriting(true);
        try {
            const rewrittenText = await rewriteLocalText(
                project.genre, targetText, contextBefore, contextAfter, instruction, project.creativeSettings
            );
            applyRewrite(rewrittenText);
        } catch (e) {
            alert("局部重写失败");
        } finally {
            setIsLocalRewriting(false);
        }
    };

    const triggerStateAnalysis = async (content: string, chars: Character[]) => {
        setIsAnalyzingState(true);
        try {
            const changes = await analyzeStateChanges(content, chars, project.worldSettings || []);
            if (changes.length > 0) {
                const newEchoes = changes.map(c => ({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    type: c.targetType,
                    targetId: c.targetId,
                    targetName: c.targetName,
                    description: c.suggestedUpdate,
                    reason: c.reason,
                    status: 'PENDING' as const,
                    timestamp: Date.now()
                }));
                updateProject({ echoes: [...(project.echoes || []), ...(newEchoes as Echo[])] });
            }
        } finally {
            setIsAnalyzingState(false);
        }
    };

    const handleExtractEchoes = async () => {
        if (!generatedContent) return;
        setIsExtracting(true);
        try {
            const chars = (project.characters || []).filter(c => selectedChars.includes(c.id));
            const changes = await analyzeStateChanges(generatedContent, chars, project.worldSettings || []);
            setExtractedEchoes(changes.map(c => ({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                type: c.targetType,
                targetId: c.targetId,
                targetName: c.targetName,
                description: c.suggestedUpdate,
                reason: c.reason,
                status: 'PENDING' as const,
                timestamp: Date.now()
            })) as Echo[]);
        } finally {
            setIsExtracting(false);
        }
    };

    const handleAddEcho = (echo: Echo) => {
        updateProject({ echoes: [...(project.echoes || []), { ...echo, status: 'ACCEPTED' }] });
        setExtractedEchoes(prev => prev.filter(e => e.id !== echo.id));
    };

    const handleSaveDraft = async () => {
        if (!generatedContent) return;
        setIsSaving(true);
        try {
            const title = plotBeat.slice(0, 20) || `草稿 ${new Date().toLocaleTimeString()}`;
            const newDraft: Draft = {
                id: activeDraftId || Date.now().toString(),
                title,
                content: generatedContent,
                lastModified: Date.now()
            };
            const updatedDrafts = activeDraftId
                ? project.drafts.map(d => d.id === activeDraftId ? newDraft : d)
                : [...(project.drafts || []), newDraft];

            updateProject({ drafts: updatedDrafts });
            setActiveDraftId(newDraft.id);
            if (useBackend) await patchProject(project.id, { drafts: updatedDrafts });
        } finally {
            setIsSaving(false);
        }
    };

    const loadDraft = (draft: Draft) => {
        setGeneratedContent(draft.content);
        setActiveDraftId(draft.id);
        setPlotBeat(draft.title);
    };

    const deleteDraft = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("确定要删除此草稿吗？")) {
            updateProject({ drafts: project.drafts.filter(d => d.id !== id) });
            if (activeDraftId === id) setActiveDraftId(null);
        }
    };

    const handleCommitToManuscript = async () => {
        if (!generatedContent) return;

        // 智能推断目标章节
        // 1. 优先使用当前正在编辑的章节
        let targetChapter = activeChapterId ? project.chapters.find(c => c.id === activeChapterId) : null;

        // 2. 其次查看当前情节节点是否已关联章节 (针对从大纲跳转过来的情况)
        if (!targetChapter && localPlotNodeId) {
            targetChapter = project.chapters.find(c => c.plotNodeId === localPlotNodeId);
        }

        let order: number;
        let chapterIdToUpdate: string | null = null;

        if (targetChapter) {
            if (!confirm(`确定要将此内容采纳至 [第 ${targetChapter.order} 章: ${targetChapter.title}] 吗？`)) return;
            order = targetChapter.order;
            chapterIdToUpdate = targetChapter.id;
        } else {
            const index = prompt("该草稿未关联到特定章节。请输入章节序号 (1, 2, 3...) 或回车新增最后一章", (project.chapters?.length + 1).toString());
            if (index === null) return;
            order = parseInt(index) || (project.chapters?.length + 1);

            // 检查输入的序号是否已存在，如果存在则进入更新模式
            const conflict = project.chapters.find(c => c.order === order);
            if (conflict) {
                if (!confirm(`第 ${order} 章已存在，是否覆盖该章内容？`)) return;
                chapterIdToUpdate = conflict.id;
                targetChapter = conflict; // Set targetChapter if found via index
            }
        }

        setIsSaving(true);
        const newChapterId = Date.now().toString();
        try {
            // 决定标题：如果已有章节且标题不是默认的“第x章”，则保留原标题；否则使用情节摘要的前30个字
            let title = (targetChapter && !targetChapter.title.startsWith('第'))
                ? targetChapter.title
                : (plotBeat.slice(0, 30) || `第 ${order} 章`);

            const content = generatedContent;

            // 智能摘要：在后台生成真正的剧情摘要，而不是简单复用情节目标
            let summary = plotBeat; // 初始使用情节目标作为兜底
            try {
                // 如果启用了后端，异步获取一个 AI 总结的摘要
                if (useBackend && content) {
                    console.log("Generating silent summary...");
                    summarizeChapter(title, content, project.creativeSettings).then(aiSummary => {
                        if (aiSummary && aiSummary !== "摘要生成失败。") {
                            // 再次更新项目以填入真正的摘要
                            const finalChapters = useProjectStore.getState().project.chapters.map(c =>
                                (c.id === (chapterIdToUpdate || newChapterId)) ? { ...c, summary: aiSummary } : c
                            );
                            updateProject({ chapters: finalChapters });
                            if (useBackend) patchProject(project.id, { chapters: finalChapters });
                        }
                    });
                }
            } catch (sumErr) {
                console.warn("Silent summary generation failed", sumErr);
            }

            let updatedChapters;
            if (chapterIdToUpdate) {
                // 更新现有章节 (保持 ID 不变)
                updatedChapters = project.chapters.map(c => c.id === chapterIdToUpdate ? {
                    ...c,
                    title,
                    content,
                    summary,
                    lastModified: Date.now(),
                    plotNodeId: localPlotNodeId || c.plotNodeId // 保留或更新关联关系
                } : c);
            } else {
                // 新增章节
                const newChapter = {
                    id: newChapterId,
                    title,
                    content,
                    order,
                    lastModified: Date.now(),
                    summary,
                    expectedPOV: povCharId ? (project.characters.find(c => c.id === povCharId)?.name) : undefined,
                    plotNodeId: localPlotNodeId || undefined
                };
                updatedChapters = [...(project.chapters || []), newChapter].sort((a, b) => a.order - b.order);
            }

            updateProject({ chapters: updatedChapters });
            if (useBackend) await patchProject(project.id, { chapters: updatedChapters });

            alert("已成功采纳至正文！");
            setViewMode('MANUSCRIPT');
            if (chapterIdToUpdate) setActiveChapterId(chapterIdToUpdate);
            else {
                // 如果是新增的，找到刚加进那个
                const justAdded = updatedChapters.find(c => c.order === order);
                if (justAdded) setActiveChapterId(justAdded.id);
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteChapter = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("确定要删除此章节吗？此操作不可撤销。")) {
            updateProject({ chapters: project.chapters.filter(c => c.id !== id) });
            if (activeChapterId === id) setActiveChapterId(null);
        }
    };

    // Phase 5 Factions
    const handleFetchFactionsLocal = async () => {
        if (!useBackend) return;
        setIsFetchingFactions(true);
        try {
            const data = await fetchFactions(project.id);
            setFactions(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsFetchingFactions(false);
        }
    };

    const handleSimulatePropagationLocal = async (targetName: string, changeDescription: string) => {
        setIsSimulatingPropagation(true);
        setShowButterflyPanel(true);
        try {
            const risks = await simulatePropagation(project.id, targetName, changeDescription);
            setPropagationRisks(risks);
        } catch (err) {
            console.error(err);
            alert("模拟失败");
        } finally {
            setIsSimulatingPropagation(false);
        }
    };

    // Task 2.2: Branch Sandbox Handlers
    const handleCreateBranch = () => {
        const name = prompt("输入新分支名称 (例如: '主角黑化', '全员存活'):");
        if (name) {
            const newBranches = [...availableBranches, name];
            setAvailableBranches(newBranches);
            updateProject({ availableBranches: newBranches, activeBranchId: name });
            // 切换到新分支后刷新上下文
            handleFetchForeshadowing();
            handleFetchInsights();
        }
    };

    const handleSwitchBranch = (branchId: string) => {
        updateProject({ activeBranchId: branchId });
        // 分支切换时自动刷新伏笔和洞察
        handleFetchForeshadowing();
        handleFetchInsights();
    };

    const handleDeleteBranch = (e: React.MouseEvent, branchId: string) => {
        e.stopPropagation();
        if (branchId === 'main') return;
        if (confirm(`确定要删除分歧 "${branchId}" 吗？该分支下未合并的专属数据将丢失。此操作无法撤销。`)) {
            const newBranches = availableBranches.filter(b => b !== branchId);
            setAvailableBranches(newBranches);
            updateProject({ availableBranches: newBranches });
            if (activeBranchId === branchId) {
                handleSwitchBranch('main');
            }
        }
    };

    // Logic Audit Handlers
    const triggerLogicAudit = async (content: string) => {
        if (!useBackend) return;
        setIsAuditingLogic(true);
        setLogicConflicts([]);
        try {
            const triples = await extractKnowledgeTriples(content);
            if (triples.length > 0) {
                const conflicts = await verifyLogicConflicts(project.id, triples);
                setLogicConflicts(conflicts);
            }
        } catch (e) {
            console.error("Logic Audit failed:", e);
        } finally {
            setIsAuditingLogic(false);
        }
    };

    const handleVerifyLogic = () => {
        if (generatedContent) {
            triggerLogicAudit(generatedContent);
        }
    };

    return {
        // State
        viewMode, setViewMode,
        plotBeat, setPlotBeat,
        selectedChars, toggleCharSelection,
        selectedLocationId, setSelectedLocationId,
        generatedContent, setGeneratedContent,
        isGenerating,
        isSaving,
        activeDraftId,
        showAdvancedParams, setShowAdvancedParams,
        pacing, setPacing,
        targetWordCount, setTargetWordCount,
        povCharId, setPovCharId,
        isPolishing,
        showPolishMenu, setShowPolishMenu,
        isLocalRewriting,
        isAnalyzingState,
        isExtracting,
        extractedEchoes, setExtractedEchoes,
        suggestedTwists,
        isGeneratingTwists,
        activeTwist, setActiveTwist,
        narrativeInsights, setNarrativeInsights,
        isFetchingInsights,
        pendingForeshadowing, setPendingForeshadowing,
        isFetchingForeshadowing,
        isMergingBranch,
        isEditingManuscript, setIsEditingManuscript,
        editingContent, setEditingContent,
        isLoading,

        // Phase 5
        factions, isFetchingFactions, handleFetchFactions: handleFetchFactionsLocal,
        showFactionPanel, setShowFactionPanel,
        showButterflyPanel, setShowButterflyPanel,
        propagationRisks, isSimulatingPropagation,
        handleSimulatePropagation: handleSimulatePropagationLocal,

        // Task 2.2: Branching Sandbox
        availableBranches,
        handleCreateBranch,
        handleSwitchBranch,
        handleDeleteBranch,

        // Logic Audit
        isAuditingLogic,
        logicConflicts,
        setLogicConflicts,
        handleVerifyLogic,

        // Reference Sidebar
        showReference, setShowReference,

        // Handlers
        handleGenerate,
        handlePolish,
        handleLocalRewrite,
        handleExtractEchoes,
        handleAddEcho,
        handleSaveDraft,
        loadDraft,
        deleteDraft,
        handleCommitToManuscript,
        handleDeleteChapter,
        handleFetchForeshadowing,
        handleFetchInsights,
        handleGenerateTwists,
        handleMergeBranch
    };
};
