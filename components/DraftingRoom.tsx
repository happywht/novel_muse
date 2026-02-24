import React, { useState } from 'react';
import { ProjectState, Character, WorldSetting, Draft, Chapter, StateChangeRecommendation, Echo } from '../types';
import { generateSceneFromIngredients, analyzeStateChanges, PacingMode, polishDraft, PolishMode, extractEchoesFromText } from '../services/geminiService';
import { Loader } from './Loader';
import { PenTool, MapPin, Users, Zap, Plus, FileText, Trash2, Clipboard, Save, RefreshCw, GitCommit, ArrowRight, Check, Globe, Book, Archive, Layout, Sidebar, X, User, Wand2, Gauge, Flame, Feather, Eye, Clapperboard, Brain, ScanSearch, Sparkles } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface DraftingRoomProps {
    project: ProjectState;
    updateProject: (data: Partial<ProjectState>) => void;
}

type ViewMode = 'FORGE' | 'MANUSCRIPT';

import { useProjectStore } from '../store/useProjectStore';

export const DraftingRoom: React.FC<DraftingRoomProps> = ({ project, updateProject }) => {
    const fetchChapterContent = useProjectStore(state => state.fetchChapterContent);
    const isLoading = useProjectStore(state => state.isLoading);
    const activePlotNodeId = useProjectStore(state => state.activePlotNodeId);
    const setActivePlotNodeId = useProjectStore(state => state.setActivePlotNodeId);
    const [viewMode, setViewMode] = useState<ViewMode>('FORGE');
    const [showReference, setShowReference] = useState(false);

    // Inputs
    const [selectedChars, setSelectedChars] = useState<string[]>([]);
    const [selectedLocationId, setSelectedLocationId] = useState<string>('');
    const [plotBeat, setPlotBeat] = useState('');
    const [pacing, setPacing] = useState<PacingMode>('BALANCED');
    const [targetWordCount, setTargetWordCount] = useState<number>(3000);
    const [povCharId, setPovCharId] = useState<string>(''); // POV Character

    // State
    const [isGenerating, setIsGenerating] = useState(false);
    const [isPolishing, setIsPolishing] = useState(false);
    const [showPolishMenu, setShowPolishMenu] = useState(false);
    const [generatedContent, setGeneratedContent] = useState('');
    const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

    // Sync State
    const [isAnalyzingState, setIsAnalyzingState] = useState(false);

    // Echo Extraction State
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractedEchoes, setExtractedEchoes] = useState<Echo[]>([]);

    // Manuscript State
    const [activeChapterId, setActiveChapterId] = useState<string | null>(null);

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

    const toggleCharSelection = (id: string) => {
        setSelectedChars(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const getLastStoryContext = () => {
        if (!project.chapters || project.chapters.length === 0) return undefined;
        // Get the last chapter
        const lastChapter = project.chapters[project.chapters.length - 1];
        // Return last 2000 chars roughly
        return lastChapter.content.slice(-2000);
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
            const previousContext = getLastStoryContext();

            const result = await generateSceneFromIngredients(
                project.genre,
                plotBeat + (povCharId ? `\n\n【视角指令】请以 ${(project.characters || []).find(c => c.id === povCharId)?.name || '主角'} 的第一人称或限制性第三人称视角进行叙事。只展现该角色能感知到的信息，用其独特的思维方式和语言风格来表达。` : ''),
                activeCharacters,
                activeLocation,
                project.worldSettings || [],
                project.creativeSettings,
                previousContext,
                pacing,
                project.echoes || [],
                targetWordCount
            );

            setGeneratedContent(result);
            setActiveDraftId(null); // It's a fresh unsaved generation

            // Auto-trigger state analysis after generation
            triggerStateAnalysis(result, activeCharacters);

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

        if (!confirm("确定要将此草稿采纳为正式章节吗？\n这将把它加入到正文列表中，作为后续生成的上下文参考。")) return;

        console.log("📝 Committing to manuscript...");
        const newChapter: Chapter = {
            id: Date.now().toString(),
            title: activeDraftId
                ? project.drafts.find(d => d.id === activeDraftId)?.title || "新章节"
                : plotBeat.slice(0, 20) || "新章节",
            content: generatedContent,
            order: (project.chapters || []).length + 1,
            lastModified: Date.now()
        };

        // Add to chapters
        const updatedChapters = [...(project.chapters || []), newChapter];
        updateProject({ chapters: updatedChapters });

        console.log("✅ Successfully committed. Current chapters:", updatedChapters.length);
        alert("已成功采纳为正文！你可以去 '正文归档' 模式查看，或者继续撰写下一章。");
        setViewMode('MANUSCRIPT');
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

                        {/* Step 1: Plot Beat */}
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <div className="flex items-center gap-2 mb-3 text-muse-300 font-bold">
                                <Zap size={18} />
                                <h3>1. 设定情节目标 (Beat)</h3>
                            </div>
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

                        {/* Step 2.5: POV Mode */}
                        {selectedChars.length > 0 && (
                            <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 p-4 rounded-xl border border-indigo-500/20">
                                <div className="flex items-center gap-2 mb-3 text-indigo-300 font-bold">
                                    <Eye size={18} />
                                    <h3>视角模式 (POV)</h3>
                                    <span className="text-[10px] px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded-full border border-indigo-500/30 ml-auto">NEW</span>
                                </div>
                                <select
                                    value={povCharId}
                                    onChange={(e) => setPovCharId(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">-- 全知视角（上帝视角） --</option>
                                    {(project.characters || []).filter(c => selectedChars.includes(c.id)).map(char => (
                                        <option key={char.id} value={char.id}>
                                            👁️ {char.name} 的视角 ({char.role})
                                        </option>
                                    ))}
                                </select>
                                {povCharId && (
                                    <p className="text-[10px] text-indigo-400/70 mt-2 italic">
                                        AI 将以 {(project.characters || []).find(c => c.id === povCharId)?.name} 的认知边界和语言风格进行叙事
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Step 3: Location Selection */}
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                            <div className="flex items-center gap-2 mb-3 text-muse-300 font-bold">
                                <MapPin size={18} />
                                <h3>3. 选择场景地点 (Location)</h3>
                            </div>
                            <select
                                value={selectedLocationId}
                                onChange={(e) => setSelectedLocationId(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-sm focus:ring-1 focus:ring-muse-500 outline-none"
                            >
                                <option value="">-- 不指定地点 (由 AI 决定) --</option>
                                {(project.worldSettings || []).map(w => (
                                    <option key={w.id} value={w.id}>
                                        [{w.category}] {w.title}
                                    </option>
                                ))}
                            </select>
                            {selectedLocationId && (
                                <p className="text-xs text-slate-500 mt-2 line-clamp-2 bg-slate-900/50 p-2 rounded">
                                    {(project.worldSettings || []).find(w => w.id === selectedLocationId)?.content}
                                </p>
                            )}
                        </div>

                        {/* Context Indicator */}
                        <div className="space-y-2">
                            {/* Global Context Indicator */}
                            <div className={`bg-slate-900/50 p-3 rounded-xl border flex items-center gap-3 transition-colors ${isDynamicContext ? 'border-muse-500/50 bg-muse-900/20' : 'border-slate-800'}`}>
                                <div className={`p-2 rounded-lg ${isDynamicContext ? 'bg-muse-500 text-white animate-pulse' : 'bg-muse-900/50 text-muse-400'}`}>
                                    <Globe size={16} />
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-xs font-bold uppercase ${isDynamicContext ? 'text-muse-300' : 'text-slate-300'}`}>
                                        {isDynamicContext ? '智能相关性筛选已激活' : '全局世界观法则'}
                                    </h4>
                                    <p className="text-[10px] text-slate-500">
                                        {isDynamicContext
                                            ? `AI 正基于剧情关键词动态筛选最相关的 20 条设定 (共 ${totalRuleCount} 条)`
                                            : `AI 将参考库中所有 ${totalRuleCount} 条世界观设定`
                                        }
                                    </p>
                                </div>
                                <Check size={16} className="text-emerald-500/50" />
                            </div>

                            {/* Manuscript Continuity Indicator */}
                            {(project.chapters || []).length > 0 && (
                                <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800 flex items-center gap-3 border-l-4 border-l-amber-500/50">
                                    <div className="p-2 bg-amber-900/20 rounded-lg text-amber-400">
                                        <Archive size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-xs font-bold text-slate-300 uppercase">正文连贯性引擎</h4>
                                        <p className="text-[10px] text-slate-500">
                                            AI 已读取上一章最后 2000 字，确保剧情无缝衔接。
                                        </p>
                                    </div>
                                    <Check size={16} className="text-emerald-500/50" />
                                </div>
                            )}
                        </div>

                        {/* Pacing Control (New) */}
                        <div className="bg-slate-800/50 p-2 rounded-xl border border-slate-700 flex flex-col gap-3">
                            <div className="flex justify-between items-center gap-1">
                                <button
                                    onClick={() => setPacing('SLOW_BURN')}
                                    className={`flex-1 py-2 text-xs font-medium rounded-lg flex flex-col items-center gap-1 transition-all ${pacing === 'SLOW_BURN' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/30' : 'text-slate-500 hover:bg-slate-700'}`}
                                    title="铺垫/慢热：侧重氛围描写和心理活动"
                                >
                                    <Feather size={14} /> 铺垫蓄力
                                </button>
                                <button
                                    onClick={() => setPacing('BALANCED')}
                                    className={`flex-1 py-2 text-xs font-medium rounded-lg flex flex-col items-center gap-1 transition-all ${pacing === 'BALANCED' ? 'bg-muse-900/50 text-muse-300 border border-muse-500/30' : 'text-slate-500 hover:bg-slate-700'}`}
                                    title="平衡推进：标准的叙事节奏"
                                >
                                    <Gauge size={14} /> 剧情推进
                                </button>
                                <button
                                    onClick={() => setPacing('CLIMAX')}
                                    className={`flex-1 py-2 text-xs font-medium rounded-lg flex flex-col items-center gap-1 transition-all ${pacing === 'CLIMAX' ? 'bg-rose-900/50 text-rose-300 border border-rose-500/30' : 'text-slate-500 hover:bg-slate-700'}`}
                                    title="高潮/爆发：快节奏，侧重动作和冲突"
                                >
                                    <Flame size={14} /> 高潮爆发
                                </button>
                            </div>

                            {/* Word Count Slider */}
                            <div className="px-2 pb-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1"><FileText size={12} /> 目标字数</span>
                                    <span className="text-xs font-mono text-muse-400">{targetWordCount} 字</span>
                                </div>
                                <input
                                    type="range"
                                    min="1000"
                                    max="10000"
                                    step="500"
                                    value={targetWordCount}
                                    onChange={(e) => setTargetWordCount(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-muse-500 hover:accent-muse-400"
                                />
                                <div className="flex justify-between text-[10px] text-slate-600 mt-1 font-mono">
                                    <span>1k</span>
                                    <span>5k</span>
                                    <span>10k</span>
                                </div>
                            </div>
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className="w-full bg-gradient-to-r from-muse-600 to-indigo-600 hover:from-muse-500 hover:to-indigo-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-muse-900/50 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                        >
                            {isGenerating ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <PenTool size={20} />}
                            <span>AI 自动撰写场景</span>
                        </button>

                        {/* Draft History List */}
                        <div className="mt-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">草稿箱 (Drafts)</h3>
                            <div className="space-y-2">
                                {(project.drafts || []).length === 0 && <p className="text-xs text-slate-600 italic">暂无草稿。</p>}
                                {(project.drafts || []).map(draft => (
                                    <div
                                        key={draft.id}
                                        onClick={() => loadDraft(draft)}
                                        className={`p-3 rounded-lg border cursor-pointer group flex justify-between items-start transition-all ${activeDraftId === draft.id ? 'bg-muse-900/30 border-muse-500/50' : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800'}`}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <h4 className={`text-sm font-medium truncate ${activeDraftId === draft.id ? 'text-muse-300' : 'text-slate-300'}`}>{draft.title}</h4>
                                            <p className="text-[10px] text-slate-500 mt-1">{new Date(draft.lastModified).toLocaleString()}</p>
                                        </div>
                                        <button
                                            onClick={(e) => deleteDraft(e, draft.id)}
                                            className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 size={14} />
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

                            <div className="flex-1 p-8 overflow-y-auto custom-scrollbar prose prose-invert prose-slate max-w-none leading-loose font-serif text-lg">
                                {generatedContent ? (
                                    <>
                                        <MarkdownRenderer content={generatedContent} />

                                        {/* Auto-Echo Capture Section */}
                                        <div className="mt-12 pt-8 border-t border-slate-700/50">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                    <ScanSearch className="text-muse-400" size={20} />
                                                    命运回响 (状态提取)
                                                </h3>
                                                <button
                                                    onClick={handleExtractEchoes}
                                                    disabled={isExtracting}
                                                    className="text-xs bg-muse-600 hover:bg-muse-500 text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                                                >
                                                    {isExtracting ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                                    提取状态变更
                                                </button>
                                            </div>

                                            {extractedEchoes.length > 0 ? (
                                                <div className="space-y-3">
                                                    <p className="text-xs text-slate-400">AI 从正文中提取了以下潜在的持久化状态变更，请审核并采纳：</p>
                                                    {extractedEchoes.map(echo => (
                                                        <div key={echo.id} className="bg-slate-800/80 p-4 rounded-xl border border-slate-700 flex gap-4 items-start shadow-lg">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${echo.type === 'CHARACTER' ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700' : 'bg-emerald-900/50 text-emerald-300 border border-emerald-700'}`}>
                                                                        {echo.type === 'CHARACTER' ? '人物' : '世界'}
                                                                    </span>
                                                                    <span className="font-bold text-slate-200 text-sm">{echo.targetName}</span>
                                                                </div>
                                                                <p className="text-muse-300 font-medium text-sm mt-2">变更: {echo.description}</p>
                                                                <p className="text-xs text-slate-500 mt-1 italic mt-2 border-l-2 border-slate-600 pl-2">依据: "{echo.reason}"</p>
                                                            </div>
                                                            <div className="flex flex-col gap-2">
                                                                <button
                                                                    onClick={() => handleAddEcho(echo)}
                                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg flex items-center justify-center transition-colors shadow-lg shadow-emerald-900/20"
                                                                    title="采纳并写入记忆库"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => setExtractedEchoes(prev => prev.filter(e => e.id !== echo.id))}
                                                                    className="bg-slate-700 hover:bg-slate-600 text-slate-300 p-2 rounded-lg flex items-center justify-center transition-colors"
                                                                    title="忽略此条"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-6 text-center text-slate-500 flex flex-col items-center">
                                                    <ScanSearch size={32} className="opacity-20 mb-2" />
                                                    <p className="text-sm">尚未提取状态变更。如果刚生成的正文包含了角色受伤、物品获得等重要变动，请点击右上方按钮提取。</p>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4">
                                        <Zap size={48} className="opacity-20" />
                                        <div className="text-center">
                                            <p className="font-medium text-slate-400">准备就绪</p>
                                            <p className="text-sm mt-1">请在左侧配置原料，让 AI 为您生成初稿。</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {(isGenerating || isPolishing) && (
                                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-30">
                                    <Loader text={isPolishing ? "AI 正在进行文学润色与精修..." : "AI 正在深度思考并撰写正文..."} />
                                </div>
                            )}
                        </div>

                        {isAnalyzingState && (
                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 flex items-center justify-center gap-2 text-xs text-slate-400 animate-pulse">
                                <RefreshCw size={12} className="animate-spin" />
                                正在后台观测世界线的变动...
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
                            {(project.chapters || []).map((chapter, idx) => (
                                <div
                                    key={chapter.id}
                                    onClick={() => setActiveChapterId(chapter.id)}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors ${activeChapterId === chapter.id ? 'bg-muse-900/50 text-muse-200 border border-muse-500/30' : 'text-slate-300 hover:bg-slate-700/50 border border-transparent'}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold opacity-50">#{idx + 1}</span>
                                        <span className="text-[10px] text-slate-500">{new Date(chapter.lastModified).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-medium text-sm truncate">{chapter.title}</h4>
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
                                            <div>
                                                <h2 className="text-3xl font-serif font-bold text-white">{chapter.title}</h2>
                                                <p className="text-sm text-slate-500 mt-2">字数统计: {hasContent ? chapter.content.length : 0} 字</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(chapter.content)}
                                                    disabled={!hasContent}
                                                    className="text-xs bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-slate-300 hover:text-white disabled:opacity-50"
                                                >
                                                    复制全文
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 prose prose-invert prose-lg max-w-none font-serif leading-loose text-slate-300 relative">
                                            {hasContent ? (
                                                <MarkdownRenderer content={chapter.content} />
                                            ) : (
                                                <div className="flex flex-col items-center justify-center h-full space-y-4">
                                                    <RefreshCw className="animate-spin text-muse-500" size={32} />
                                                    <p className="text-slate-500 animate-pulse">正在加载卷轴内容...</p>
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