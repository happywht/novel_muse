import React from 'react';
import { ProjectState, Character, PolishMode, Echo } from '../../../types';
import {
    generateSceneFromIngredients, polishDraft, rewriteLocalText,
    analyzeStateChanges, extractKnowledgeTriples, verifyLogicConflicts
} from '../../../services/geminiService';
import {
    fetchForgeContext, fetchUnresolvedForeshadowing, fetchRelatedSubgraph,
    fetchPhysicalStatus, ForgeGraphContext
} from '../../../services/apiService';
import { useToast } from '../../../hooks/useToast';
import { CREATIVE_CONFIG } from '../../../config/constants';

interface UseForgeGenerationProps {
    project: ProjectState;
    updateProject: (data: Partial<ProjectState>) => void;
    useBackend: boolean;
    activeBranchId: string;
    activeChapterId: string | null;
    effectiveCreativeSettings: any;
    selectedChars: string[];
    selectedSettingIds: string[];
    localPlotNodeId: string | null;
    useGraphContext: boolean;
    activeTwist: string;
    povCharId: string;
    plotBeat: string;
    pacing: 'SLOW_BURN' | 'BALANCED' | 'CLIMAX';
    targetWordCount: number;
}

/**
 * Forge 生成相关逻辑 Hook
 *
 * 职责：
 * - 内容生成（场景、章节）
 * - 内容润色
 * - 局部重写
 * - 状态变化分析
 * - Echo 提取
 * - 逻辑审计
 */
export const useForgeGeneration = ({
    project,
    updateProject,
    useBackend,
    activeBranchId,
    activeChapterId,
    effectiveCreativeSettings,
    selectedChars,
    selectedSettingIds,
    localPlotNodeId,
    useGraphContext,
    activeTwist,
    povCharId,
    plotBeat,
    pacing,
    targetWordCount
}: UseForgeGenerationProps) => {
    const { toast } = useToast();

    // State
    const [generatedContent, setGeneratedContent] = React.useState('');
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [isPolishing, setIsPolishing] = React.useState(false);
    const [isLocalRewriting, setIsLocalRewriting] = React.useState(false);
    const [isAnalyzingState, setIsAnalyzingState] = React.useState(false);
    const [isExtracting, setIsExtracting] = React.useState(false);
    const [extractedEchoes, setExtractedEchoes] = React.useState<Echo[]>([]);
    const [isFetchingGraphContext, setIsFetchingGraphContext] = React.useState(false);
    const [forgeGraphContext, setForgeGraphContext] = React.useState<ForgeGraphContext | null>(null);

    // Logic Audit State
    const [isAuditingLogic, setIsAuditingLogic] = React.useState(false);
    const [logicConflicts, setLogicConflicts] = React.useState<any[]>([]);

    /**
     * 触发状态变化分析
     */
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
                    confidence: c.confidence,
                    extractionEvidence: c.extractionEvidence
                }));
                updateProject({ echoes: [...(project.echoes || []), ...(newEchoes as Echo[])] });
            }
        } finally {
            setIsAnalyzingState(false);
        }
    };

    /**
     * 触发逻辑审计
     */
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

    /**
     * 生成内容
     */
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
                    const firstLocationId = selectedSettingIds.length > 0 ? selectedSettingIds[0] : undefined;
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

            triggerStateAnalysis(result, activeCharacters);
            // 自动触发逻辑审计
            triggerLogicAudit(result);
        } catch (e) {
            toast.error("生成失败");
        } finally {
            setIsGenerating(false);
        }
    };

    /**
     * 润色内容
     */
    const handlePolish = async (mode: PolishMode) => {
        if (!generatedContent) return;
        setIsPolishing(true);
        try {
            const result = await polishDraft(generatedContent, mode, effectiveCreativeSettings);
            setGeneratedContent(result);
            const activeCharacters = (project.characters || []).filter(c => selectedChars.includes(c.id));
            triggerStateAnalysis(result, activeCharacters);
        } catch (e) {
            toast.error("润色失败");
        } finally {
            setIsPolishing(false);
        }
    };

    /**
     * 局部重写
     */
    const handleLocalRewrite = async (
        targetText: string,
        instruction: string,
        contextBefore: string,
        contextAfter: string,
        applyRewrite: (newText: string) => void
    ) => {
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

    /**
     * 提取 Echoes
     */
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
                confidence: c.confidence,
                extractionEvidence: c.extractionEvidence
            })) as Echo[]);
        } finally {
            setIsExtracting(false);
        }
    };

    /**
     * 手动触发逻辑验证
     */
    const handleVerifyLogic = () => {
        if (generatedContent) {
            triggerLogicAudit(generatedContent);
        }
    };

    /**
     * 添加 Echo
     */
    const handleAddEcho = (echo: Echo) => {
        updateProject({ echoes: [...(project.echoes || []), { ...echo, status: 'ACCEPTED' }] });
        setExtractedEchoes(prev => prev.filter(e => e.id !== echo.id));
    };

    return {
        // State
        generatedContent,
        setGeneratedContent,
        isGenerating,
        isPolishing,
        isLocalRewriting,
        isAnalyzingState,
        isExtracting,
        extractedEchoes,
        setExtractedEchoes,
        isFetchingGraphContext,
        forgeGraphContext,
        isAuditingLogic,
        logicConflicts,
        setLogicConflicts,

        // Handlers
        handleGenerate,
        handlePolish,
        handleLocalRewrite,
        handleExtractEchoes,
        handleAddEcho,
        handleVerifyLogic,
        triggerStateAnalysis,
        triggerLogicAudit
    };
};
