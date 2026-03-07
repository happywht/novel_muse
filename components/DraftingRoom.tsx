import React, { useState } from 'react';
import { ProjectState, Character, WorldSetting, Draft, Chapter, StateChangeRecommendation, Echo } from '../types';
import { generateSceneFromIngredients, analyzeStateChanges, PacingMode, polishDraft, PolishMode, extractEchoesFromText, summarizeChapter, extractKnowledgeTriples, verifyLogicConflicts, LogicConflict, generateTwistHooks, buildTieredMemory, rewriteLocalText, rewritePlot } from '../services/geminiService';
import { Loader } from './Loader';
import { PenTool, MapPin, Users, Zap, Plus, FileText, Trash2, Clipboard, Save, RefreshCw, GitCommit, ArrowRight, Check, Globe, Book, Archive, Layout, Sidebar, X, User, Wand2, Gauge, Flame, Feather, Eye, Clapperboard, Brain, ScanSearch, Sparkles, AlertTriangle, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { DraftEditor } from './DraftingRoom/DraftEditor';
import { recalculateChapterOrders } from '../utils/chapterUtils';
import { useProjectStore } from '../store/useProjectStore';

interface DraftingRoomProps {
    project: ProjectState;
    updateProject: (data: Partial<ProjectState>) => void;
}

type ViewMode = 'FORGE' | 'MANUSCRIPT';

const ContinuityBanner: React.FC<{ project: ProjectState, activeChapterId: string | null }> = ({ project, activeChapterId }) => {
    if (!activeChapterId) return null;

    const sortedChapters = [...(project.chapters || [])].sort((a, b) => a.order - b.order);
    const currentIndex = sortedChapters.findIndex(c => c.id === activeChapterId);

    if (currentIndex <= 0) return null;

    // Check for empty chapters before this one
    const precedingChapters = sortedChapters.slice(0, currentIndex);
    const emptyChapters = precedingChapters.filter(c => !c.content || c.content.trim().length < 50);

    if (emptyChapters.length > 0) {
        return (
            <div className="bg-amber-900/30 border border-amber-500/30 p-3 rounded-xl flex items-start gap-3 mb-4 animate-in slide-in-from-top-2 duration-300">
                <div className="mt-0.5"><AlertTriangle className="text-amber-500" size={16} /></div>
                <div className="flex-1">
                    <p className="text-amber-200 text-xs font-bold">检测到叙事断层 (Continuity Gap)</p>
                    <p className="text-amber-400/80 text-[10px] leading-relaxed mt-0.5">
                        前序章节（如：{emptyChapters.slice(0, 2).map(c => `"${c.title}"`).join(', ')}{emptyChapters.length > 2 ? ' 等' : ''}）内容缺失。
                        这会导致 AI 无法继承之前的关键伏笔或状态变更，建议先补全前文。
                    </p>
                </div>
            </div>
        );
    }

    return null;
};

export const DraftingRoom: React.FC<DraftingRoomProps> = ({ project, updateProject }) => {
    const fetchChapterContent = useProjectStore(state => state.fetchChapterContent);
    const isLoading = useProjectStore(state => state.isLoading);
    const updateChapterSummary = useProjectStore(state => state.updateChapterSummary);
    const setIsLoading = useProjectStore(state => state.setIsLoading);
    const activePlotNodeId = useProjectStore(state => state.activePlotNodeId);
    const setActivePlotNodeId = useProjectStore(state => state.setActivePlotNodeId);
    const activeChapterId = useProjectStore(state => state.activeChapterId);
    const setActiveChapterId = useProjectStore(state => state.setActiveChapterId);
    const isSaving = useProjectStore(state => state.isSaving);
    const useBackend = useProjectStore(state => state.useBackend);
    const [viewMode, setViewMode] = useState<ViewMode>('FORGE');
    const [showReference, setShowReference] = useState(false);
    const [showAdvancedParams, setShowAdvancedParams] = useState(false); // NEW: Toggle advanced params

    // Inputs
    const [selectedChars, setSelectedChars] = useState<string[]>([]);
    const [selectedLocationId, setSelectedLocationId] = useState<string>('');
    const [plotBeat, setPlotBeat] = useState('');
    const [pacing, setPacing] = useState<PacingMode>('BALANCED');
    const [targetWordCount, setTargetWordCount] = useState<number>(3000);
    const [povCharId, setPovCharId] = useState<string>(''); // POV Character

    // State
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLocalRewriting, setIsLocalRewriting] = useState(false); // NEW
    const [isPolishing, setIsPolishing] = useState(false);
    const [showPolishMenu, setShowPolishMenu] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');
    const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

    // Sync State
    const [isAnalyzingState, setIsAnalyzingState] = useState(false);

    // Manuscript Editing State
    const [isEditingManuscript, setIsEditingManuscript] = useState(false);
    const [editingContent, setEditingContent] = useState('');

    // Echo Extraction State
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedEchoes, setExtractedEchoes] = useState<Echo[]>([]);

    // Logic Audit State
    const [isAuditingLogic, setIsAuditingLogic] = useState(false);
    const [logicConflicts, setLogicConflicts] = useState<LogicConflict[]>([]);

    // Twist Agent State
    const [isGeneratingTwists, setIsGeneratingTwists] = useState(false);
    const [suggestedTwists, setSuggestedTwists] = useState<string[]>([]);
    const [activeTwist, setActiveTwist] = useState<string>('');

    // Auto-fetch chapter content when selected
    React.useEffect(() => {
        if (activeChapterId && viewMode === 'MANUSCRIPT') {
            fetchChapterContent(activeChapterId);
        }
    }, [activeChapterId, viewMode, fetchChapterContent]);

    // NEW: Handle bridge from Plot Weaver
    React.useEffect(() => {
        if (activePlotNodeId) {
            const node = project.plotNodes.find(n => n.id === activePlotNodeId);
            if (node) {
                setPlotBeat(node.content);
                setSelectedChars(node.relatedCharacters || []);
                setSelectedLocationId(node.relatedLocations?.[0] || ''); // Take first location as primary

                // Clear the trigger so it doesn't re-run if we navigate back and forth
                setActivePlotNodeId(null);

                // Switch to Forge view just in case
                setViewMode('FORGE');
            }
        }
    }, [activePlotNodeId, project.plotNodes, setActivePlotNodeId]);

    // NEW: Handle bridge from Chapter Outliner
    React.useEffect(() => {
        if (activeChapterId) {
            const chapter = project.chapters.find(c => c.id === activeChapterId);
            if (chapter) {
                // If chapter has a summary, use it as the plot beat for generation
                if (chapter.summary) {
                    setPlotBeat(chapter.summary);
                }

                // If it has specific POV, set it
                if (chapter.expectedPOV) {
                    const char = project.characters.find(c => c.name.includes(chapter.expectedPOV!) || chapter.expectedPOV!.includes(c.name));
                    if (char) setPovCharId(char.id);
                }

                // If it belongs to a plot node, select related characters and location
                if (chapter.plotNodeId) {
                    const node = project.plotNodes.find(n => n.id === chapter.plotNodeId);
                    if (node) {
                        setSelectedChars(node.relatedCharacters || []);
                        setSelectedLocationId(node.relatedLocations?.[0] || '');
                    }
                }
            }
        }
    }, [activeChapterId, project.chapters, project.characters, project.plotNodes]);

    // NEW: Sync target word count with profile
    React.useEffect(() => {
        if (project.creativeSettings.promptProfile === 'WEB_NOVEL' && targetWordCount === 3000) {
            setTargetWordCount(5000);
        } else if (project.creativeSettings.promptProfile === 'LITERARY' && targetWordCount === 5000) {
            setTargetWordCount(3000);
        }
    }, [project.creativeSettings.promptProfile]);

    const toggleCharSelection = (id: string) => {
        setSelectedChars(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const getRollingSummary = () => {
        if (!project.chapters || project.chapters.length === 0) return undefined;

        const sortedChapters = [...project.chapters].sort((a, b) => a.order - b.order);
        const currentIndex = sortedChapters.findIndex(c => c.id === activeChapterId);

        // If no active chapter or it's the first one, we might still want summaries from all chapters if we're at the end
        const precedingChapters = currentIndex >= 0
            ? sortedChapters.slice(0, currentIndex)
            : sortedChapters;

        const summaries = precedingChapters
            .filter(c => c.summary && c.summary.trim() !== "")
            .map(c => `[第 ${c.order} 章: ${c.title}]\n${c.summary}`)
            .join('\n\n');

        return summaries || undefined;
    };

    const getPrecedingContext = () => {
        if (!project.chapters || project.chapters.length === 0) return undefined;

        // Sort chapters by order to ensure chronological sequence
        const sortedChapters = [...project.chapters].sort((a, b) => a.order - b.order);

        // Find current chapter index
        const currentIndex = sortedChapters.findIndex(c => c.id === activeChapterId);

        if (currentIndex <= 0) {
            // If no active chapter or it's the first one, fallback to last available if activeChapterId is null
            if (!activeChapterId) {
                const last = sortedChapters[sortedChapters.length - 1];
                return last?.content?.slice(-2000);
            }
            return undefined;
        }

        // Get the immediately preceding chapter
        const prevChapter = sortedChapters[currentIndex - 1];
        return prevChapter.content ? prevChapter.content.slice(-2000) : undefined;
    };

    const handleGenerate = async () => {
        if (!plotBeat.trim()) {
            alert("请输入或选择一个情节目标");
            return;
        }
        setIsGenerating(true);
        setExtractedEchoes([]); // Clear previous echoes

        try {
            const activeCharacters = (project.characters || []).filter(c => selectedChars.includes(c.id));
            const activeLocation = (project.worldSettings || []).find(w => w.id === selectedLocationId) || null;
            const previousContext = getPrecedingContext();
            const rollingSummary = getRollingSummary();

            const povCharName = povCharId ? (project.characters || []).find(c => c.id === povCharId)?.name : undefined;

            const result = await generateSceneFromIngredients(
                project.genre,
                plotBeat,
                activeCharacters,
                activeLocation,
                project.worldSettings || [],
                project.creativeSettings,
                previousContext,
                pacing,
                project.echoes || [],
                targetWordCount,
                povCharName,
                rollingSummary,
                activeChapterId || undefined,
                activeTwist || undefined
            );

            // Format raw text with line breaks into HTML paragraphs for Tiptap
            const formattedResult = result
                .split('\n')
                .filter(p => p.trim() !== '')
                .map(p => `<p>${p.trim()}</p>`)
                .join('');

            setGeneratedContent(formattedResult);
            setActiveDraftId(null); // It's a fresh unsaved generation

            // Auto-trigger state analysis after generation
            triggerStateAnalysis(result, activeCharacters);

            // Auto-trigger logic audit after generation
            triggerLogicAudit(result);

        } catch (e) {
            alert("生成失败，请检查网络或 API Key");
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
            // Re-trigger analysis as content changed significantly
            const activeCharacters = (project.characters || []).filter(c => selectedChars.includes(c.id));
            triggerStateAnalysis(result, activeCharacters);
        } catch (e) {
            alert("润色失败，请重试");
        } finally {
            setIsPolishing(false);
        }
    };

    // NEW: Handle local rewrites from Tiptap Editor
    const handleLocalRewrite = async (targetText: string, instruction: string, contextBefore: string, contextAfter: string, applyRewrite: (newText: string) => void) => {
        setIsLocalRewriting(true);
        try {
            const rewrittenText = await rewriteLocalText(
                project.genre,
                targetText,
                contextBefore,
                contextAfter,
                instruction,
                project.creativeSettings
            );

            // Apply the AI response directly into the editor
            applyRewrite(rewrittenText);

        } catch (e) {
            console.error("Local rewrite failed:", e);
            alert("局部重写失败，请重试");
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

                // NEW: Push to project store so they appear in Echo Chamber
                updateProject({ echoes: [...(project.echoes || []), ...(newEchoes as Echo[])] });

                // Still keep local state for immediate feedback in the Forge view
                setExtractedEchoes(newEchoes as Echo[]);
            }
        } catch (e) {
            console.error("State analysis failed", e);
        } finally {
            setIsAnalyzingState(false);
        }
    };

    const triggerLogicAudit = async (content: string) => {
        if (!useBackend) return; // Only audit if backend (Neo4j) is available
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

    const handleGenerateTwists = async () => {
        setIsGeneratingTwists(true);
        setSuggestedTwists([]);
        try {
            const activeCharacters = (project.characters || []).filter(c => selectedChars.includes(c.id));
            const currentChapter = activeChapterId ? project.chapters.find(c => c.id === activeChapterId) : null;
            const currentOrder = currentChapter ? currentChapter.order : (project.chapters.length > 0 ? Math.max(...project.chapters.map(c => c.order)) + 1 : 1);

            const context = buildTieredMemory(
                project.chapters,
                currentOrder,
                project.plotOutline || "",
                activeCharacters,
                project.worldSettings || [],
                project.echoes || []
            );

            const hooks = await generateTwistHooks(context, plotBeat);
            setSuggestedTwists(hooks);
        } catch (e) {
            console.error("Twist generation failed", e);
        } finally {
            setIsGeneratingTwists(false);
        }
    };

    const handleExtractEchoes = async () => {
        if (!generatedContent) return;
        setIsExtracting(true);
        try {
            const activeCharacters = (project.characters || []).filter(c => selectedChars.includes(c.id));
            const newEchoes = await extractEchoesFromText(generatedContent, activeCharacters, project.worldSettings || []);
            const echoesWithIds = newEchoes.map(e => ({
                ...e,
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            }));

            // Push to project store
            updateProject({ echoes: [...(project.echoes || []), ...echoesWithIds] });

            setExtractedEchoes(echoesWithIds);
        } catch (e) {
            console.error("Echo extraction failed", e);
            alert("提取状态变更失败");
        } finally {
            setIsExtracting(false);
        }
    };

    const handleAddEcho = (echo: Echo) => {
        // Update the echo status in the global store
        const updatedEchoes = project.echoes.map(e =>
            e.id === echo.id ? { ...e, status: 'ACCEPTED' as const, timestamp: Date.now() } : e
        );
        updateProject({ echoes: updatedEchoes });

        // Remove from local feedback list
        setExtractedEchoes(prev => prev.filter(e => e.id !== echo.id));
    };

    const handleSaveDraft = () => {
        if (!generatedContent) return;

        console.log("💾 Saving draft...");
        const newDraft: Draft = {
            id: Date.now().toString(),
            title: plotBeat.slice(0, 20) + (plotBeat.length > 20 ? '...' : '') || "未命名草稿",
            content: generatedContent,
            relatedPlotPoint: plotBeat,
            lastModified: Date.now()
        };

        const updatedDrafts = [newDraft, ...(project.drafts || [])];
        updateProject({ drafts: updatedDrafts });
        setActiveDraftId(newDraft.id);
        alert("草稿已保存到本地。");
    };

    const handleCommitToManuscript = () => {
        if (!generatedContent) return;

        const isUpdatingExisting = !!activeChapterId && (viewMode === 'MANUSCRIPT' || project.chapters.some(c => c.id === activeChapterId));

        const confirmMsg = isUpdatingExisting
            ? "确定要将此内容更新到当前章节正文中吗？"
            : "确定要将此草稿采纳为正式章节吗？\n这将把它加入到正文列表中，作为后续生成的上下文参考。";

        if (!confirm(confirmMsg)) return;

        let updatedChapters: Chapter[] = [];
        let newChapter: Chapter | null = null;

        if (isUpdatingExisting) {
            // Update existing chapter
            updatedChapters = project.chapters.map(c =>
                c.id === activeChapterId
                    ? { ...c, content: generatedContent, lastModified: Date.now() }
                    : c
            );
        } else {
            // Create new chapter
            newChapter = {
                id: Date.now().toString(),
                title: activeDraftId
                    ? project.drafts.find(d => d.id === activeDraftId)?.title || "新章节"
                    : plotBeat.slice(0, 20) || "新章节",
                content: generatedContent,
                order: (project.chapters || []).length + 1,
                lastModified: Date.now()
            };
            updatedChapters = [...(project.chapters || []), newChapter];
        }

        const updatedChaptersWithNewOne = updatedChapters;
        updateProject({
            chapters: recalculateChapterOrders(updatedChaptersWithNewOne, project.plotNodes)
        });

        if (!isUpdatingExisting) {
            setActiveChapterId(newChapter.id);
        }

        alert(isUpdatingExisting ? "章节内容已更新！" : "已成功采纳为正文！");
        setViewMode('MANUSCRIPT');

        // Trigger background summarization
        const targetChapterId = isUpdatingExisting ? (activeChapterId as string) : newChapter.id;
        const targetChapterTitle = isUpdatingExisting
            ? project.chapters.find(c => c.id === activeChapterId)?.title || "当前章节"
            : (newChapter?.title || "新章节");

        console.log("📝 Generating chapter summary in background...");
        summarizeChapter(targetChapterTitle, generatedContent, project.creativeSettings).then(summary => {
            console.log("✅ Summary generated:", summary);
            updateChapterSummary(targetChapterId, summary);
        }).catch(err => {
            console.error("Failed to generate summary:", err);
        });
    };

    const loadDraft = (draft: Draft) => {
        setGeneratedContent(draft.content);
        setPlotBeat(draft.relatedPlotPoint || '');
        setActiveDraftId(draft.id);
    };

    const deleteDraft = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const updatedDrafts = (project.drafts || []).filter(d => d.id !== id);
        updateProject({ drafts: updatedDrafts });
        if (activeDraftId === id) {
            setGeneratedContent('');
            setActiveDraftId(null);
        }
    };

    const handleDeleteChapter = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm("确定要删除此章节吗？此操作不可恢复。")) return;

        const updatedChapters = (project.chapters || []).filter(c => c.id !== id);
        updateProject({
            chapters: recalculateChapterOrders(updatedChapters, project.plotNodes)
        });
        if (activeChapterId === id) {
            setActiveChapterId(updatedChapters.length > 0 ? updatedChapters[0].id : null);
        }
    };

    // Calculate active world context items for display
    const totalRuleCount = (project.worldSettings || []).filter(w => w.id !== selectedLocationId).length;
    // If count is large, we show a dynamic message
    const isDynamicContext = totalRuleCount > 20;

    return (
        <div className="flex h-[calc(100vh-140px)] gap-6 animate-fade-in relative">
            {/* Mode Switcher */}
            <div className="absolute top-0 right-0 z-20 flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                <button
                    onClick={() => setViewMode('FORGE')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${viewMode === 'FORGE' ? 'bg-muse-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    <PenTool size={14} /> 自动工坊 (Forge)
                </button>
                <button
                    onClick={() => setViewMode('MANUSCRIPT')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${viewMode === 'MANUSCRIPT' ? 'bg-muse-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                >
                    <Book size={14} /> 正文归档 (Manuscript)
                </button>
                <div className="w-px h-6 bg-slate-700 mx-1"></div>
                <button
                    onClick={() => setShowReference(!showReference)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${showReference ? 'bg-muse-900 text-muse-300 shadow' : 'text-slate-400 hover:text-white'}`}
                    title="打开设定参考侧边栏"
                >
                    <Sidebar size={14} />
                </button>
            </div>

            {/* Omniscient Sidebar */}
            <div
                className={`fixed right-0 top-16 bottom-0 bg-slate-900 border-l border-slate-700 shadow-2xl z-40 transition-all duration-300 transform ${showReference ? 'translate-x-0 w-80' : 'translate-x-full w-0'}`}
            >
                <div className="flex flex-col h-full w-80">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                        <h3 className="font-bold text-white flex items-center gap-2"><Sidebar size={18} /> 设定全知视角</h3>
                        <button onClick={() => setShowReference(false)}><X size={18} className="text-slate-400 hover:text-white" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        <div>
                            <h4 className="text-muse-400 text-xs font-bold uppercase mb-2 flex items-center gap-1"><User size={12} /> 核心角色</h4>
                            {(project.characters || []).length === 0 && <p className="text-slate-600 text-xs">暂无角色。</p>}
                            <div className="space-y-3">
                                {(project.characters || []).map(c => (
                                    <div key={c.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                        <div className="flex justify-between">
                                            <span className="text-slate-200 font-bold text-sm">{c.name}</span>
                                            <span className="text-xs text-slate-500">{c.role}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1 line-clamp-3">{c.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-muse-400 text-xs font-bold uppercase mb-2 flex items-center gap-1"><Globe size={12} /> 世界观设定</h4>
                            {(project.worldSettings || []).length === 0 && <p className="text-slate-600 text-xs">暂无设定。</p>}
                            <div className="space-y-3">
                                {(project.worldSettings || []).map(w => (
                                    <div key={w.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                        <div className="flex justify-between">
                                            <span className="text-slate-200 font-bold text-sm">{w.title}</span>
                                            <span className="text-xs text-slate-500 truncate max-w-[80px]">{w.category}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1 line-clamp-3">{w.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {viewMode === 'FORGE' ? (
                <>
                    {/* Left: Director's Console */}
                    <div className="w-1/3 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2 pt-10">

                        <ContinuityBanner project={project} activeChapterId={activeChapterId} />

                        {/* Logic Conflict Alerts */}
                        {logicConflicts.length > 0 && (
                            <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl space-y-3 animate-pulse">
                                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                                    <AlertTriangle size={18} />
                                    发现故事逻辑冲突 (Logic Conflicts)
                                </div>
                                <div className="space-y-2">
                                    {logicConflicts.map((c, i) => (
                                        <div key={i} className="text-xs text-red-200/80 bg-red-900/30 p-2 rounded border border-red-500/20">
                                            {c.description}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setLogicConflicts([])}
                                    className="text-[10px] text-red-400 hover:text-red-300 underline"
                                >
                                    忽略所有警告
                                </button>
                            </div>
                        )}

                        {/* Step 1: Plot Beat */}
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <div className="flex items-center justify-between mb-3 text-muse-300 font-bold">
                                <div className="flex items-center gap-2">
                                    <Zap size={18} />
                                    <h3>1. 设定情节目标 (Beat)</h3>
                                </div>
                                <button
                                    onClick={handleGenerateTwists}
                                    disabled={isGeneratingTwists}
                                    className="flex items-center gap-1 text-[10px] bg-muse-900/40 hover:bg-muse-800 text-muse-300 px-2 py-1 rounded border border-muse-500/30 transition-all"
                                    title="生成灵感反转"
                                >
                                    {isGeneratingTwists ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                    灵感跳跃
                                </button>
                            </div>

                            {suggestedTwists.length > 0 && (
                                <div className="mb-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {suggestedTwists.map((twist, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setActiveTwist(activeTwist === twist ? '' : twist)}
                                            className={`text-[11px] p-2 rounded border cursor-pointer transition-all ${activeTwist === twist ? 'bg-muse-700/50 border-muse-400 text-white shadow-lg' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-muse-600/50'}`}
                                        >
                                            {twist}
                                        </div>
                                    ))}
                                </div>
                            )}
                            <textarea
                                value={plotBeat}
                                onChange={(e) => setPlotBeat(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:ring-1 focus:ring-muse-500 outline-none resize-none h-24"
                                placeholder="例如：主角在废弃地铁站遭遇赏金猎人，双方发生激烈枪战，最终主角负伤逃脱..."
                            />
                        </div>

                        {/* Step 2: Cast Selection */}
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <div className="flex items-center gap-2 mb-3 text-muse-300 font-bold">
                                <Users size={18} />
                                <h3>2. 选择登场角色 (Cast)</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(project.characters || []).length === 0 && <p className="text-xs text-slate-500">暂无角色，请去灵魂熔炉创建。</p>}
                                {(project.characters || []).map(char => (
                                    <button
                                        key={char.id}
                                        onClick={() => toggleCharSelection(char.id)}
                                        className={`px-3 py-1.5 rounded-full text-xs border transition-all flex items-center gap-1 ${selectedChars.includes(char.id)
                                            ? 'bg-muse-600 border-muse-500 text-white'
                                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                            }`}
                                    >
                                        {selectedChars.includes(char.id) && <Plus size={10} className="rotate-45" />}
                                        {char.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Expandable Advanced Params Panel */}
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <button
                                onClick={() => setShowAdvancedParams(!showAdvancedParams)}
                                className="w-full flex justify-between items-center text-slate-400 hover:text-white"
                            >
                                <div className="flex items-center gap-2 font-bold font-serif text-sm">
                                    <Sparkles size={16} className={showAdvancedParams ? "text-muse-400" : ""} />
                                    高级生信参数控制 (Advanced Directives)
                                </div>
                                <div className={`transition-transform ${showAdvancedParams ? 'rotate-180' : ''}`}>▼</div>
                            </button>

                            {showAdvancedParams && (
                                <div className="mt-4 pt-4 border-t border-slate-700 space-y-4 animate-fade-in custom-scrollbar">
                                    {/* Step 2.5: POV Mode */}
                                    {selectedChars.length > 0 && (
                                        <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 p-3 rounded-xl border border-indigo-500/20">
                                            <div className="flex justify-between items-center mb-2">
                                                <h3 className="text-xs text-indigo-300 font-bold flex items-center gap-1"><Eye size={14} /> 限制性视角锁定 (POV)</h3>
                                            </div>
                                            <select
                                                value={povCharId}
                                                onChange={(e) => setPovCharId(e.target.value)}
                                                className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                                            >
                                                <option value="">-- 全知上帝视角 --</option>
                                                {(project.characters || []).filter(c => selectedChars.includes(c.id)).map(char => (
                                                    <option key={char.id} value={char.id}>👁️ {char.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Location Selection */}
                                    <div className="space-y-2">
                                        <h3 className="text-xs text-slate-400 font-bold flex items-center gap-1"><MapPin size={14} /> 强制锚定场景维度 (Location)</h3>
                                        <select
                                            value={selectedLocationId}
                                            onChange={(e) => setSelectedLocationId(e.target.value)}
                                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-slate-300 text-xs focus:ring-1 focus:ring-muse-500 outline-none"
                                        >
                                            <option value="">-- 无 (由 AI 自主决定) --</option>
                                            {(project.worldSettings || []).map(w => (
                                                <option key={w.id} value={w.id}>[{w.category}] {w.title}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Pacing Control */}
                                    <div className="space-y-2 pt-2">
                                        <h3 className="text-xs text-slate-400 font-bold flex items-center gap-1"><Gauge size={14} /> 叙事节奏控制 (Pacing)</h3>
                                        <div className="flex justify-between items-center gap-1">
                                            <button
                                                onClick={() => setPacing('SLOW_BURN')}
                                                className={`flex-1 py-1.5 text-[10px] font-medium rounded-lg flex flex-col items-center transition-all ${pacing === 'SLOW_BURN' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/30' : 'bg-slate-900/50 text-slate-500 hover:bg-slate-700/50'}`}
                                            >铺垫蓄力
                                            </button>
                                            <button
                                                onClick={() => setPacing('BALANCED')}
                                                className={`flex-1 py-1.5 text-[10px] font-medium rounded-lg flex flex-col items-center transition-all ${pacing === 'BALANCED' ? 'bg-muse-900/50 text-muse-300 border border-muse-500/30' : 'bg-slate-900/50 text-slate-500 hover:bg-slate-700/50'}`}
                                            >平衡推进
                                            </button>
                                            <button
                                                onClick={() => setPacing('CLIMAX')}
                                                className={`flex-1 py-1.5 text-[10px] font-medium rounded-lg flex flex-col items-center transition-all ${pacing === 'CLIMAX' ? 'bg-rose-900/50 text-rose-300 border border-rose-500/30' : 'bg-slate-900/50 text-slate-500 hover:bg-slate-700/50'}`}
                                            >高潮爆发
                                            </button>
                                        </div>
                                    </div>

                                    {/* Word Count Slider */}
                                    <div className="space-y-2 pt-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-slate-400 font-bold flex items-center gap-1"><FileText size={14} /> 目标体量</span>
                                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-900 rounded font-mono text-muse-400">{targetWordCount} 字</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1000"
                                            max="5000"
                                            step="500"
                                            value={targetWordCount}
                                            onChange={(e) => setTargetWordCount(parseInt(e.target.value))}
                                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-muse-500"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full bg-gradient-to-r from-muse-600 to-indigo-600 hover:from-muse-500 hover:to-indigo-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-muse-900/50 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 mt-2"
                        >
                            {isGenerating ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <PenTool size={20} />}
                            <span>AI 自动撰写场景草稿</span>
                        </button>

                        {/* Draft History List */}
                        <div className="mt-2">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">草稿箱 (Drafts)</h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                {(project.drafts || []).length === 0 && <p className="text-xs text-slate-600 italic">暂无草稿。</p>}
                                {(project.drafts || []).map(draft => (
                                    <div
                                        key={draft.id}
                                        onClick={() => loadDraft(draft)}
                                        className={`p-2 rounded-lg border cursor-pointer group flex justify-between items-start transition-all ${activeDraftId === draft.id ? 'bg-muse-900/30 border-muse-500/50' : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800'}`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`text-xs font-medium truncate ${activeDraftId === draft.id ? 'text-muse-300' : 'text-slate-300'}`}>{draft.title}</h4>
                                        </div>
                                        <button
                                            onClick={(e) => deleteDraft(e, draft.id)}
                                            className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right: The Stage (Editor) */}
                    <div className="w-2/3 flex flex-col gap-4 pt-10">
                        <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 flex flex-col relative overflow-hidden">
                            <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center z-20 relative">
                                <h2 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                                    <FileText size={18} className="text-muse-400" />
                                    场景预览
                                    {useBackend && (
                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ml-2 ${isSaving ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'}`}>
                                            {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Cloud size={10} />}
                                            {isSaving ? '云端同步中...' : '已安全同步至云端'}
                                        </div>
                                    )}
                                </h2>
                                <div className="flex gap-2 relative">
                                    {/* Polish Tool */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowPolishMenu(!showPolishMenu)}
                                            disabled={!generatedContent || isGenerating || isPolishing}
                                            className={`text-xs px-3 py-1.5 rounded border transition-colors flex items-center gap-1 font-medium ${showPolishMenu ? 'bg-purple-900 text-purple-200 border-purple-500' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'}`}
                                            title="文学润色引擎"
                                        >
                                            <Wand2 size={12} /> 润色精修
                                        </button>

                                        {showPolishMenu && (
                                            <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden animate-fade-in z-30">
                                                <div className="px-3 py-2 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-700">选择润色镜头</div>
                                                <button onClick={() => handlePolish('SENSORY')} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                                                    <Eye size={14} className="text-emerald-400" /> 五感增强
                                                </button>
                                                <button onClick={() => handlePolish('CINEMATIC')} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                                                    <Clapperboard size={14} className="text-amber-400" /> 镜头语言
                                                </button>
                                                <button onClick={() => handlePolish('PSYCHOLOGICAL')} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                                                    <Brain size={14} className="text-indigo-400" /> 心理侧写
                                                </button>
                                                <button onClick={() => handlePolish('MINIMALIST')} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                                                    <Feather size={14} className="text-slate-400" /> 极简张力
                                                </button>
                                                <button onClick={() => handlePolish('WEB_MEME')} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                                                    <Zap size={14} className="text-amber-400" /> 网文网感
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-px h-6 bg-slate-700 mx-1"></div>

                                    <button
                                        onClick={() => navigator.clipboard.writeText(generatedContent)}
                                        disabled={!generatedContent}
                                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded border border-slate-700 transition-colors flex items-center gap-1"
                                    >
                                        <Clipboard size={12} /> 复制
                                    </button>
                                    <button
                                        onClick={handleSaveDraft}
                                        disabled={!generatedContent}
                                        className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded border border-slate-600 transition-colors flex items-center gap-1"
                                    >
                                        <Save size={12} /> 保存
                                    </button>
                                    <button
                                        onClick={handleCommitToManuscript}
                                        disabled={!generatedContent}
                                        className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded border border-emerald-600 transition-colors flex items-center gap-1 shadow-lg font-bold"
                                        title="将此草稿转为正式正文，AI 在下次生成时将参考它"
                                    >
                                        <Check size={12} /> 采纳
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-hidden relative border-t border-slate-800">
                                <DraftEditor
                                    content={generatedContent}
                                    onChange={setGeneratedContent}
                                    onRewriteSelection={handleLocalRewrite}
                                    isProcessing={isLocalRewriting}
                                />
                            </div>

                            {/* Auto-Echo Capture Section (Moved below editor) */}
                            {generatedContent && (
                                <div className="bg-slate-950/50 p-4 border-t border-slate-800">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                            <ScanSearch className="text-muse-400" size={14} />
                                            命运回响 (状态提取)
                                        </h3>
                                        <button
                                            onClick={handleExtractEchoes}
                                            disabled={isExtracting}
                                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50 border border-slate-700"
                                        >
                                            {isExtracting ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                            提取状态变更
                                        </button>
                                    </div>

                                    {extractedEchoes.length > 0 && (
                                        <div className="space-y-2 mt-2 max-h-32 overflow-y-auto custom-scrollbar">
                                            {extractedEchoes.map(echo => (
                                                <div key={echo.id} className="bg-slate-800/80 p-2 rounded border border-slate-700 flex gap-2 items-start">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${echo.type === 'CHARACTER' ? 'bg-indigo-900/50 text-indigo-300' : 'bg-emerald-900/50 text-emerald-300'}`}>
                                                                {echo.type === 'CHARACTER' ? '人物' : '世界'}
                                                            </span>
                                                            <span className="font-bold text-slate-300 text-xs truncate">{echo.targetName}</span>
                                                        </div>
                                                        <p className="text-muse-300 text-xs mt-1">{echo.description}</p>
                                                    </div>
                                                    <div className="flex gap-1 shrink-0">
                                                        <button onClick={() => handleAddEcho(echo)} className="text-emerald-500 hover:text-emerald-400 p-1"><Check size={14} /></button>
                                                        <button onClick={() => setExtractedEchoes(prev => prev.filter(e => e.id !== echo.id))} className="text-slate-500 hover:text-red-400 p-1"><X size={14} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {(isGenerating || isPolishing) && (
                                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-30">
                                    <Loader text={isPolishing ? "AI 正在进行文学润色与精修..." : "AI 正在深度思考并撰写正文..."} />
                                </div>
                            )}
                        </div>

                        {
                            isAnalyzingState && (
                                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center justify-center gap-2 text-xs text-slate-400 animate-pulse">
                                </div>
                            )}
                    </div>
                </>
            ) : (
                /* MANUSCRIPT VIEW MODE */
                <div className="w-full flex h-full gap-6 pt-10">
                    {/* Left: Chapter List */}
                    <div className="w-1/4 bg-slate-800/50 border border-slate-700 rounded-xl flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-700 bg-slate-900/50">
                            <h3 className="font-bold text-white flex items-center gap-2"><Book size={18} className="text-muse-400" /> 正文目录</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {(project.chapters || []).length === 0 && <p className="text-slate-500 text-xs p-4 text-center">暂无正文章节。请去工坊采纳草稿。</p>}
                            {[...(project.chapters || [])]
                                .sort((a, b) => a.order - b.order)
                                .map((chapter, idx) => (
                                    <div
                                        key={chapter.id}
                                        onClick={() => setActiveChapterId(chapter.id)}
                                        className={`p-3 rounded-lg cursor-pointer transition-colors group relative ${activeChapterId === chapter.id ? 'bg-muse-900/50 text-muse-200 border border-muse-500/30' : 'text-slate-300 hover:bg-slate-700/50 border border-transparent'}`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-bold opacity-50">#{idx + 1}</span>
                                            <span className="text-[10px] text-slate-500">{new Date(chapter.lastModified).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="font-medium text-sm truncate pr-6">{chapter.title}</h4>

                                        <button
                                            onClick={(e) => handleDeleteChapter(e, chapter.id)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                            title="删除章节"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                        </div>
                    </div>

                    {/* Right: Reader */}
                    <div className="w-3/4 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
                        {activeChapterId ? (
                            (() => {
                                const chapter = (project.chapters || []).find(c => c.id === activeChapterId);
                                if (!chapter) return null;

                                const hasContent = chapter.content && chapter.content.trim() !== "";

                                return (
                                    <>
                                        <div className="p-6 border-b border-slate-800 bg-slate-950/30 flex justify-between items-end">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3">
                                                    <h2 className="text-3xl font-serif font-bold text-white">{chapter.title}</h2>
                                                    {isEditingManuscript && <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">编辑模式</span>}
                                                </div>
                                                <p className="text-sm text-slate-500 mt-2">字数统计: {hasContent ? chapter.content.length : 0} 字 · 最后修改: {new Date(chapter.lastModified).toLocaleString()}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {!isEditingManuscript ? (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setIsEditingManuscript(true);
                                                                setEditingContent(chapter.content || '');
                                                            }}
                                                            className="text-xs bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-2"
                                                        >
                                                            <PenTool size={14} className="text-muse-400" /> 编辑正文
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm("确定要放弃本地缓存，重试从云端加载吗？")) {
                                                                    // We need to clear local content first to trigger fetch
                                                                    updateProject({
                                                                        chapters: project.chapters.map(c =>
                                                                            c.id === chapter.id ? { ...c, content: '' } : c
                                                                        )
                                                                    });
                                                                    fetchChapterContent(chapter.id);
                                                                }
                                                            }}
                                                            className="text-xs bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-slate-500 hover:text-sky-400 transition-colors flex items-center gap-2"
                                                            title="从数据库强制拉取内容"
                                                        >
                                                            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                                                        </button>
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(chapter.content)}
                                                            disabled={!hasContent}
                                                            className="text-xs bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-slate-300 hover:text-white disabled:opacity-50"
                                                        >
                                                            <Clipboard size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                const updatedChapters = project.chapters.map(c =>
                                                                    c.id === chapter.id
                                                                        ? { ...c, content: editingContent, lastModified: Date.now() }
                                                                        : c
                                                                );
                                                                updateProject({ chapters: updatedChapters });
                                                                setIsEditingManuscript(false);
                                                            }}
                                                            className="text-xs bg-emerald-600 px-4 py-1.5 rounded text-white hover:bg-emerald-500 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-900/40"
                                                        >
                                                            <Save size={14} /> 保存修改
                                                        </button>
                                                        <button
                                                            onClick={() => setIsEditingManuscript(false)}
                                                            className="text-xs bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-slate-400 hover:text-white"
                                                        >
                                                            取消
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar prose prose-invert prose-lg max-w-none font-serif leading-loose text-slate-300 relative">
                                            {isEditingManuscript ? (
                                                <div className="h-full flex flex-col p-8 bg-slate-950/20">
                                                    <textarea
                                                        value={editingContent}
                                                        onChange={(e) => setEditingContent(e.target.value)}
                                                        className="w-full flex-1 bg-transparent border-none focus:ring-0 text-slate-200 text-lg font-serif leading-loose resize-none custom-scrollbar"
                                                        placeholder="点击此处开始校对或补全正文内容..."
                                                    />
                                                </div>
                                            ) : (
                                                <div className="p-8">
                                                    {hasContent ? (
                                                        <MarkdownRenderer content={chapter.content} />
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center h-full space-y-4 py-20 bg-slate-950/10 rounded-2xl border border-dashed border-slate-800">
                                                            {isLoading ? (
                                                                <>
                                                                    <RefreshCw className="animate-spin text-muse-500" size={32} />
                                                                    <p className="text-slate-500 animate-pulse">正在从卷轴中提取文字...</p>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-600 mb-2">
                                                                        <FileText size={32} />
                                                                    </div>
                                                                    <p className="text-slate-500">此卷轴尚未记录任何文字</p>
                                                                    <button
                                                                        onClick={() => {
                                                                            setIsEditingManuscript(true);
                                                                            setEditingContent('');
                                                                        }}
                                                                        className="text-xs text-muse-400 hover:text-muse-300 underline underline-offset-4"
                                                                    >
                                                                        立即开始书写
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );
                            })()
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-600">
                                <Book size={64} className="opacity-20 mb-4" />
                                <p>选择左侧章节进行阅读或校对</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
