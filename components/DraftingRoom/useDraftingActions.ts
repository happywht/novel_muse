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
import { validatePostWrite, formatViolations, type PostWriteViolation } from '../../services/validators/postWriteValidator';
import { analyzeAITells, type AITellResult } from '../../services/validators/aiTellDetector';
import { getPostWriteOptionsFromGenre } from '../../config/genreRules';
import {
    fetchUnresolvedForeshadowing, fetchRelatedSubgraph,
    fetchPhysicalStatus, mergeBranchApi,
    fetchFactions, simulatePropagation,
    fetchNarrativeInsights, patchProject,
    fetchForgeContext, syncForgeResult, ForgeGraphContext
} from '../../services/apiService';
import { useToast } from '../../hooks/useToast';
import { CREATIVE_CONFIG } from '../../config/constants';

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
    const { toast } = useToast();

    // UI State
    const [viewMode, setViewMode] = React.useState<ViewMode>('FORGE');
    const [plotBeat, setPlotBeat] = React.useState('');
    const [showReference, setShowReference] = React.useState(false);
    const [selectedChars, setSelectedChars] = React.useState<string[]>([]);
    const [selectedSettingIds, setSelectedSettingIds] = React.useState<string[]>([]);
    const [generatedContent, setGeneratedContent] = React.useState('');
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [activeDraftId, setActiveDraftId] = React.useState<string | null>(null);
    const [showAdvancedParams, setShowAdvancedParams] = React.useState(false);
    const [pacing, setPacing] = React.useState<'SLOW_BURN' | 'BALANCED' | 'CLIMAX'>('BALANCED');
    const [targetWordCount, setTargetWordCount] = React.useState<number>(CREATIVE_CONFIG.DEFAULT_TARGET_WORD_COUNT);
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

    // Local Scene Style Palette Overrides
    const [localStyleTags, setLocalStyleTags] = React.useState<string[]>([]);
    const [localReferenceText, setLocalReferenceText] = React.useState<string>('');


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

    // Post-write Validation State (from InkOS)
    const [postWriteViolations, setPostWriteViolations] = React.useState<ReadonlyArray<PostWriteViolation>>([]);
    const [aiTellResult, setAiTellResult] = React.useState<AITellResult | null>(null);

    // Forge Graph Context State
    const [useGraphContext, setUseGraphContext] = React.useState(true);
    const [isFetchingGraphContext, setIsFetchingGraphContext] = React.useState(false);
    const [forgeGraphContext, setForgeGraphContext] = React.useState<ForgeGraphContext | null>(null);
    const [isSyncingToGraph, setIsSyncingToGraph] = React.useState(false);

    // Computed Settings
    const effectiveCreativeSettings = {
        ...project.creativeSettings,
        styleTags: localStyleTags.length > 0 ? localStyleTags : project.creativeSettings.styleTags,
        referenceText: localReferenceText.trim() !== '' ? localReferenceText : project.creativeSettings.referenceText
    };

    // Effects for Bridge and Initialization
    React.useEffect(() => {
        if (activePlotNodeId) {
            const node = project.plotNodes.find(n => n.id === activePlotNodeId);
            if (node) {
                setPlotBeat(node.content);
                setSelectedChars(node.relatedCharacters || []);
                setSelectedSettingIds(node.relatedLocations || []);
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
                        setSelectedSettingIds(node.relatedLocations || []);
                    }
                }
            }
        }
    }, [activeChapterId, project.chapters]);

    React.useEffect(() => {
        if (project.creativeSettings.promptProfile === 'WEB_NOVEL' && targetWordCount === CREATIVE_CONFIG.DEFAULT_TARGET_WORDS.LITERARY) setTargetWordCount(CREATIVE_CONFIG.DEFAULT_TARGET_WORDS.WEB_NOVEL);
        else if (project.creativeSettings.promptProfile === 'LITERARY' && targetWordCount === CREATIVE_CONFIG.DEFAULT_TARGET_WORDS.WEB_NOVEL) setTargetWordCount(CREATIVE_CONFIG.DEFAULT_TARGET_WORDS.LITERARY);
    }, [project.creativeSettings.promptProfile]);

    // Handlers
    const toggleCharSelection = (id: string) => {
        setSelectedChars(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    };

    const toggleSettingSelection = (id: string) => {
        setSelectedSettingIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
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
            toast.success("合并成功！");
        } catch (err) {
            toast.error("合并失败: " + (err as Error).message);
        } finally {
            setIsMergingBranch(false);
        }
    };

    const handleGenerate = async () => {
        if (!plotBeat.trim()) {
            toast.warning("请输入或选择一个情节目标");
            return;
        }
        setIsGenerating(true);
        setExtractedEchoes([]);
        try {
            const activeCharacters = (project.characters || []).filter(c => selectedChars.includes(c.id));
            const activeSettings = (project.worldSettings || []).filter(w => selectedSettingIds.includes(w.id));

            const sortedChapters = [...project.chapters].sort((a, b) => a.order - b.order);
            const currentIndex = sortedChapters.findIndex(c => c.id === activeChapterId);
            const prevChapter = currentIndex > 0 ? sortedChapters[currentIndex - 1] : (currentIndex < 0 ? sortedChapters[sortedChapters.length - 1] : null);
            const previousContext = prevChapter?.content?.slice(-CREATIVE_CONFIG.PREVIOUS_CONTEXT_LENGTH);

            const rollingSummary = sortedChapters.slice(0, currentIndex >= 0 ? currentIndex : sortedChapters.length)
                .filter(c => c.summary && c.summary.trim() !== "")
                .map(c => `[第 ${c.order} 章: ${c.title}]\n${c.summary}`)
                .join('\n\n') || undefined;

            const povCharName = povCharId ? (project.characters || []).find(c => c.id === povCharId)?.name : undefined;

            let graphContext = undefined;
            let physicalStatus = [];
            let unresolvedForeshadowing = [];

            // 使用新的Forge图谱上下文API（如果启用）
            if (useBackend && useGraphContext) {
                setIsFetchingGraphContext(true);
                try {
                    // 获取选中的第一个地点ID（如果有）
                    const firstLocationId = selectedSettingIds.length > 0 ? selectedSettingIds[0] : undefined;

                    // 调用统一的Forge上下文API
                    const forgeContext = await fetchForgeContext(project.id, {
                        characterIds: selectedChars,
                        locationId: firstLocationId,
                        plotNodeId: localPlotNodeId || undefined
                    });

                    setForgeGraphContext(forgeContext);

                    // 构建图谱上下文字符串（用于AI生成）
                    const contextParts: string[] = [];

                    // 角色状态
                    if (forgeContext.characters.length > 0) {
                        contextParts.push('\n【角色当前状态】');
                        forgeContext.characters.forEach(char => {
                            contextParts.push(`- ${char.name} (${char.role}): ${char.physicalStatus}`);
                            if (char.location) contextParts.push(`  位置: ${char.location}`);
                            if (char.desire) contextParts.push(`  核心欲望: ${char.desire}`);
                            if (char.fear) contextParts.push(`  核心恐惧: ${char.fear}`);
                            if (char.weakness) contextParts.push(`  弱点: ${char.weakness}`);
                            if (char.signature) contextParts.push(`  标志特征: ${char.signature}`);
                            if (char.relationships && char.relationships.length > 0) {
                                char.relationships.forEach(rel => {
                                    contextParts.push(`  与 ${rel.targetName}: ${rel.type} (权重: ${rel.weight})${rel.trajectory ? ` [${rel.trajectory}]` : ''}`);
                                });
                            }
                        });
                    }

                    // 未回收伏笔
                    if (forgeContext.unresolvedForeshadowing.length > 0) {
                        contextParts.push('\n【待回收伏笔】');
                        forgeContext.unresolvedForeshadowing.forEach(f => {
                            contextParts.push(`- ${f.subject} ${f.relation} ${f.object} [状态: ${f.status}]`);
                        });
                    }

                    // 地点上下文
                    if (forgeContext.locationContext) {
                        contextParts.push('\n【场景设定】');
                        contextParts.push(`[${forgeContext.locationContext.category}] ${forgeContext.locationContext.title}: ${forgeContext.locationContext.content}`);
                    }

                    // 情节上下文
                    if (forgeContext.plotContext) {
                        contextParts.push('\n【情节背景】');
                        const relatedChars = forgeContext.plotContext.relatedCharacters.length > 0
                            ? ` (涉及: ${forgeContext.plotContext.relatedCharacters.join(', ')})`
                            : '';
                        contextParts.push(`${forgeContext.plotContext.title}${relatedChars}: ${forgeContext.plotContext.content}`);
                    }

                    graphContext = contextParts.join('\n');
                    physicalStatus = forgeContext.characters;
                    unresolvedForeshadowing = forgeContext.unresolvedForeshadowing;
                } catch (err) {
                    console.error('Failed to fetch forge context, falling back to legacy APIs:', err);
                    // 降级到旧的API
                    const anchors = [...activeCharacters.map(c => c.name), ...activeSettings.map(s => s.title)];
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
                } finally {
                    setIsFetchingGraphContext(false);
                }
            } else if (useBackend) {
                // 旧逻辑：分别调用各个API
                const anchors = [...activeCharacters.map(c => c.name), ...activeSettings.map(s => s.title)];
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
                project.genre, plotBeat, activeCharacters, activeSettings, project.worldSettings || [],
                effectiveCreativeSettings, previousContext, pacing, project.echoes || [],
                targetWordCount, povCharName, rollingSummary, activeChapterId || undefined,
                activeTwist || undefined, graphContext, physicalStatus, unresolvedForeshadowing
            );

            const formattedResult = result.split('\n').filter(p => p.trim() !== '').map(p => `<p>${p.trim()}</p>`).join('');
            setGeneratedContent(formattedResult);
            setActiveDraftId(null);

            triggerStateAnalysis(result, activeCharacters);
            // 自动触发逻辑审计
            triggerLogicAudit(result);
            // 自动触发写后验证 + AI痕迹检测（零LLM成本）
            triggerPostWriteValidation(result);
        } catch (e) {
            toast.error("生成失败");
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePolish = async (mode: PolishMode) => {
        if (!generatedContent) return;
        setIsPolishing(true);
        setShowPolishMenu(false);
        try {
            const result = await polishDraft(generatedContent, mode, effectiveCreativeSettings);
            setGeneratedContent(result);
            const activeCharacters = (project.characters || []).filter(c => selectedChars.includes(c.id));
            triggerStateAnalysis(result, activeCharacters);
            triggerPostWriteValidation(result);
        } catch (e) {
            toast.error("润色失败");
        } finally {
            setIsPolishing(false);
        }
    };

    const handleLocalRewrite = async (targetText: string, instruction: string, contextBefore: string, contextAfter: string, applyRewrite: (newText: string) => void) => {
        setIsLocalRewriting(true);
        try {
            const rewrittenText = await rewriteLocalText(
                project.genre, targetText, contextBefore, contextAfter, instruction, effectiveCreativeSettings
            );
            applyRewrite(rewrittenText);
        } catch (e) {
            toast.error("局部重写失败");
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
                    timestamp: Date.now(),
                    // MVP: 准确性提升字段
                    confidence: c.confidence,
                    extractionEvidence: c.extractionEvidence
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
                timestamp: Date.now(),
                // MVP: 准确性提升字段
                confidence: c.confidence,
                extractionEvidence: c.extractionEvidence
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
            const title = plotBeat.slice(0, CREATIVE_CONFIG.PLOT_BEAT_TITLE_LENGTH) || `草稿 ${new Date().toLocaleTimeString()}`;
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
            // 决定标题：如果已有章节且标题不是默认的”第x章”，则保留原标题；否则使用情节摘要的前30个字
            let title = (targetChapter && !targetChapter.title.startsWith('第'))
                ? targetChapter.title
                : (plotBeat.slice(0, CREATIVE_CONFIG.CHAPTER_TITLE_LENGTH) || `第 ${order} 章`);

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

            // 自动同步到图谱（如果启用了图谱上下文）
            const finalChapterId = chapterIdToUpdate || newChapterId;
            if (useGraphContext && extractedEchoes.length > 0) {
                handleSyncToGraph(finalChapterId);
            }

            toast.success("已成功采纳至正文！");
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

    /**
     * 同步Forge生成结果到知识图谱
     */
    const handleSyncToGraph = async (chapterId: string) => {
        if (!useBackend || !useGraphContext) return;

        setIsSyncingToGraph(true);
        try {
            // 准备同步数据
            const echoesToSync = extractedEchoes.filter(e => e.status === 'ACCEPTED');
            const physicalStatusUpdates = echoesToSync
                .filter(e => e.type === 'CHARACTER')
                .map(e => ({
                    characterId: e.targetId || '',
                    characterName: e.targetName,
                    status: e.description,
                    reason: e.reason,
                }));

            await syncForgeResult(project.id, {
                chapterId,
                echoes: echoesToSync.map(e => ({
                    id: e.id,
                    targetId: e.targetId,
                    targetName: e.targetName,
                    targetType: e.type,
                    description: e.description,
                    reason: e.reason,
                    triples: [], // 可以从Echo中提取知识三元组
                })),
                physicalStatusUpdates,
            });

            // 清空已同步的Echo
            setExtractedEchoes(prev => prev.filter(e => e.status !== 'ACCEPTED'));

            console.log('Forge结果已成功同步到知识图谱');
        } catch (error) {
            console.error('同步到图谱失败:', error);
            toast.error('同步到图谱失败，请查看控制台了解详情');
        } finally {
            setIsSyncingToGraph(false);
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
            toast.error("模拟失败");
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

    // Post-write validation + AI-tell detection (zero LLM cost, from InkOS)
    const triggerPostWriteValidation = (content: string) => {
        // Strip HTML tags for validation
        const plainText = content.replace(/<[^>]+>/g, '');
        const genreOptions = getPostWriteOptionsFromGenre(project.genre);
        const violations = validatePostWrite(plainText, genreOptions);
        setPostWriteViolations(violations);
        const aiResult = analyzeAITells(plainText);
        setAiTellResult(aiResult);
    };

    const clearValidationResults = () => {
        setPostWriteViolations([]);
        setAiTellResult(null);
    };

    return {
        // State
        viewMode, setViewMode,
        plotBeat, setPlotBeat,
        selectedChars, toggleCharSelection,
        selectedSettingIds, toggleSettingSelection,
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

        // Local Style Overrides
        localStyleTags, setLocalStyleTags,
        localReferenceText, setLocalReferenceText,

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

        // Post-write Validation (from InkOS)
        postWriteViolations,
        aiTellResult,
        clearValidationResults,

        // Forge Graph Context
        useGraphContext, setUseGraphContext,
        isFetchingGraphContext,
        forgeGraphContext,
        isSyncingToGraph,
        handleSyncToGraph,

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
