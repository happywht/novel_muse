import React, { useState, useMemo } from 'react';
import { ProjectState, PlotNode, Chapter, AppSection } from '../../types';
import {
    LayoutGrid,
    BookOpen,
    Sparkles,
    Plus,
    PenTool,
    ChevronRight,
    User,
    Trash2,
    Calendar,
    ArrowRight
} from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';
import { splitPlotNodeIntoChapters, regenerateChapterOutline } from '../../services/geminiService';
import { Loader2, RefreshCw } from 'lucide-react'; // For loading state

// --- Utility for Global Chapter Reordering ---
const recalculateChapterOrders = (chapters: Chapter[], plotNodes: PlotNode[]): Chapter[] => {
    const nodeOrderMap = new Map(plotNodes.map(node => [node.id, node.order]));

    const sorted = [...chapters].sort((a, b) => {
        const orderA = a.plotNodeId ? (nodeOrderMap.get(a.plotNodeId) ?? 9999) : 9999;
        const orderB = b.plotNodeId ? (nodeOrderMap.get(b.plotNodeId) ?? 9999) : 9999;

        if (orderA !== orderB) {
            return orderA - orderB;
        }

        return a.order - b.order;
    });

    return sorted.map((ch, idx) => ({ ...ch, order: idx }));
};

interface ChapterOutlinerProps {
    project: ProjectState;
    updateProject: (data: Partial<ProjectState>) => void;
}

export const ChapterOutliner: React.FC<ChapterOutlinerProps> = ({ project, updateProject }) => {
    const { setActiveSection, setActiveChapterId } = useProjectStore();
    const [selectedPlotNodeId, setSelectedPlotNodeId] = useState<string | null>(
        project.plotNodes.length > 0 ? project.plotNodes[0].id : null
    );
    const [isGenerating, setIsGenerating] = useState(false);
    const [fissionCount, setFissionCount] = useState<number | 'AUTO'>('AUTO');
    const [regeneratingChapterId, setRegeneratingChapterId] = useState<string | null>(null);

    const selectedPlotNode = useMemo(() =>
        project.plotNodes.find(n => n.id === selectedPlotNodeId),
        [project.plotNodes, selectedPlotNodeId]);

    const relatedChapters = useMemo(() =>
        project.chapters.filter(c => c.plotNodeId === selectedPlotNodeId)
            .sort((a, b) => a.order - b.order),
        [project.chapters, selectedPlotNodeId]);

    const handleAddChapter = () => {
        if (!selectedPlotNodeId) return;

        const newChapter: Chapter = {
            id: Date.now().toString(),
            title: `新章节 ${relatedChapters.length + 1}`,
            content: '',
            summary: '',
            expectedPOV: '未设定',
            plotNodeId: selectedPlotNodeId,
            order: project.chapters.length,
            lastModified: Date.now()
        };

        const newChapterList = [...project.chapters, newChapter];
        updateProject({
            chapters: recalculateChapterOrders(newChapterList, project.plotNodes)
        });
    };

    const handleUpdateChapter = (id: string, updates: Partial<Chapter>) => {
        updateProject({
            chapters: project.chapters.map(c => c.id === id ? { ...c, ...updates, lastModified: Date.now() } : c)
        });
    };

    const handleDeleteChapter = (id: string) => {
        if (window.confirm('确定要删除这个章节规划吗？')) {
            const filtered = project.chapters.filter(c => c.id !== id);
            updateProject({
                chapters: recalculateChapterOrders(filtered, project.plotNodes)
            });
        }
    };

    const handleRegenerateChapter = async (chapterId: string) => {
        if (!selectedPlotNode || regeneratingChapterId || isGenerating) return;

        const chapterIndex = relatedChapters.findIndex(c => c.id === chapterId);
        if (chapterIndex === -1) return;

        const chapterToRewrite = relatedChapters[chapterIndex];
        const previousChapter = chapterIndex > 0 ? relatedChapters[chapterIndex - 1] : null;
        const nextChapter = chapterIndex < relatedChapters.length - 1 ? relatedChapters[chapterIndex + 1] : null;

        setRegeneratingChapterId(chapterId);
        try {
            const fullPlotSummary = project.plotNodes.map(n => n.content).join('\n\n');
            const regeneratedOutline = await regenerateChapterOutline(
                project.genre,
                fullPlotSummary,
                selectedPlotNode,
                chapterToRewrite,
                previousChapter,
                nextChapter,
                project.characters,
                project.worldSettings,
                project.creativeSettings,
                project.echoes || []
            );

            if (regeneratedOutline) {
                handleUpdateChapter(chapterId, {
                    title: regeneratedOutline.title,
                    summary: regeneratedOutline.summary,
                    expectedPOV: regeneratedOutline.expectedPOV
                });
            } else {
                alert("局部重写未能生成有效内容，请重试。");
            }
        } catch (error) {
            console.error("Regenerate Error:", error);
            alert("局部重写失败，请检查网络或配置后重试。");
        } finally {
            setRegeneratingChapterId(null);
        }
    };

    const handleGoToDraft = (chapterId: string) => {
        setActiveChapterId(chapterId);
        setActiveSection(AppSection.DRAFTING);
    };

    const handleFission = async () => {
        if (!selectedPlotNode || isGenerating) return;

        setIsGenerating(true);
        try {
            const fullPlotSummary = project.plotNodes.map(n => n.content).join('\n\n');
            const newOutlines = await splitPlotNodeIntoChapters(
                project.genre,
                fullPlotSummary,
                selectedPlotNode,
                project.characters,
                project.worldSettings,
                project.creativeSettings,
                project.echoes || [],
                fissionCount
            );

            if (newOutlines.length > 0) {
                const newChapters: Chapter[] = newOutlines.map((outline, idx) => ({
                    id: `${Date.now()}-${idx}`,
                    title: outline.title,
                    content: '',
                    summary: outline.summary,
                    expectedPOV: outline.expectedPOV,
                    plotNodeId: selectedPlotNode.id,
                    order: project.chapters.length + idx, // Will be reordered
                    lastModified: Date.now()
                }));

                const newChapterList = [...project.chapters, ...newChapters];
                updateProject({
                    chapters: recalculateChapterOrders(newChapterList, project.plotNodes)
                });
            }
        } catch (error) {
            console.error("Fission Error:", error);
            alert("生成章节细纲失败，请检查网络或配置后重试。");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-120px)] gap-6 animate-fade-in">
            {/* Left Panel: Plot Beat Index */}
            <div className="w-72 flex flex-col bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden backdrop-blur-sm">
                <div className="p-4 border-b border-slate-800/60 bg-slate-900/20">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <BookOpen size={14} className="text-sky-400" /> 情节节点索引
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {project.plotNodes.length === 0 ? (
                        <div className="p-4 text-center">
                            <p className="text-xs text-slate-500 italic">暂无情节卡片，请先在情节罗盘中创建。</p>
                        </div>
                    ) : (
                        project.plotNodes.map(node => (
                            <button
                                key={node.id}
                                onClick={() => setSelectedPlotNodeId(node.id)}
                                className={`w-full text-left p-3 rounded-xl transition-all group ${selectedPlotNodeId === node.id
                                    ? 'bg-sky-500/10 border border-sky-500/30'
                                    : 'hover:bg-slate-800/50 border border-transparent text-slate-400 hover:text-slate-200'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${selectedPlotNodeId === node.id ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-500'
                                        }`}>
                                        BEAT {node.order + 1}
                                    </span>
                                </div>
                                <h4 className={`text-sm font-bold truncate ${selectedPlotNodeId === node.id ? 'text-sky-100' : ''}`}>
                                    {node.title || "未命名节点"}
                                </h4>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Right Area: Chapter Fission */}
            <div className="flex-1 flex flex-col min-w-0">
                {selectedPlotNode ? (
                    <>
                        {/* Selected Beat Header */}
                        <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-6 mb-6 backdrop-blur-sm relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-sky-500/50" />
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-sky-400 uppercase tracking-widest">当前处理的情节</span>
                                        <ChevronRight size={12} className="text-slate-600" />
                                        <span className="text-xs font-medium text-slate-500">{selectedPlotNode.title}</span>
                                    </div>
                                    <h2 className="text-2xl font-serif font-bold text-white">{selectedPlotNode.title || "未命名情节"}</h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={fissionCount}
                                        onChange={(e) => setFissionCount(e.target.value === 'AUTO' ? 'AUTO' : Number(e.target.value))}
                                        className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-2 py-2 outline-none focus:border-sky-500"
                                        disabled={isGenerating}
                                    >
                                        <option value="AUTO">AI 智能决定</option>
                                        <option value={1}>裂变 1 章</option>
                                        <option value={2}>裂变 2 章</option>
                                        <option value={3}>裂变 3 章</option>
                                        <option value={4}>裂变 4 章</option>
                                        <option value={5}>裂变 5 章</option>
                                    </select>
                                    <button
                                        onClick={handleFission}
                                        disabled={isGenerating}
                                        className={`bg-sky-500 hover:bg-sky-400 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-sky-500/20 ${isGenerating ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                                        {isGenerating ? '正在排布章节...' : '✨ AI 裂变章节细纲'}
                                    </button>
                                </div>
                            </div>
                            <p className="text-slate-400 text-sm leading-relaxed font-serif line-clamp-2 italic">
                                "{selectedPlotNode.content || "暂无描述..."}"
                            </p>
                        </div>

                        {/* Chapters Grid */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6">
                                {relatedChapters.map((chapter, idx) => (
                                    <div key={chapter.id} className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 hover:border-violet-500/40 transition-all flex flex-col group relative">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-xs">
                                                    {idx + 1}
                                                </div>
                                                <input
                                                    className="bg-transparent text-lg font-bold text-slate-200 border-none focus:ring-0 p-0 w-full"
                                                    value={chapter.title}
                                                    onChange={(e) => handleUpdateChapter(chapter.id, { title: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleRegenerateChapter(chapter.id)}
                                                    disabled={regeneratingChapterId === chapter.id}
                                                    className={`text-slate-600 hover:text-sky-400 p-1 rounded-md transition-colors ${regeneratingChapterId === chapter.id ? 'opacity-50 cursor-not-allowed text-sky-400' : ''}`}
                                                    title="局部重写此纲要"
                                                >
                                                    <RefreshCw size={16} className={regeneratingChapterId === chapter.id ? "animate-spin" : ""} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteChapter(chapter.id)}
                                                    className="text-slate-600 hover:text-rose-400 p-1 rounded-md transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-4 flex-1">
                                            <div>
                                                <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                                                    <Calendar size={12} /> 章节细纲内容
                                                </label>
                                                <textarea
                                                    className="w-full bg-slate-950/50 border border-slate-800/50 rounded-xl p-3 text-sm text-slate-300 font-serif leading-relaxed h-32 focus:border-violet-500/30 transition-all outline-none resize-none"
                                                    placeholder="这个章节具体要写什么？包含哪些关键反转或对话？"
                                                    value={chapter.summary}
                                                    onChange={(e) => handleUpdateChapter(chapter.id, { summary: e.target.value })}
                                                />
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="flex-1">
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1.5">
                                                        <User size={12} /> 视角人物 (POV)
                                                    </label>
                                                    <input
                                                        className="w-full bg-slate-950/50 border border-slate-800/50 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-violet-500/30 transition-all outline-none"
                                                        placeholder="例如：林默"
                                                        value={chapter.expectedPOV}
                                                        onChange={(e) => handleUpdateChapter(chapter.id, { expectedPOV: e.target.value })}
                                                    />
                                                </div>
                                                <div className="pt-5">
                                                    <button
                                                        onClick={() => handleGoToDraft(chapter.id)}
                                                        className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border border-slate-700/50 group-hover:bg-violet-600 group-hover:text-white group-hover:border-violet-500 group-hover:shadow-lg group-hover:shadow-violet-600/20"
                                                    >
                                                        <PenTool size={14} /> ✍️ 去写正文
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {/* Add Chapter Button Card */}
                                <button
                                    onClick={handleAddChapter}
                                    className="border-2 border-dashed border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 text-slate-500 hover:text-sky-400 hover:border-sky-500/50 hover:bg-sky-500/5 transition-all group"
                                >
                                    <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:scale-110 transition-transform">
                                        <Plus size={24} />
                                    </div>
                                    <span className="font-bold text-sm tracking-wide">添加新章节规划</span>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/20 border border-slate-800/40 rounded-3xl p-12 text-center">
                        <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 text-slate-600">
                            <LayoutGrid size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-300 mb-2">欢迎来到章节细纲规划器</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-8">
                            在这里，你可以将宏观的情节卡片裂变为具体的章节。请从左侧选择一个情节节点开始规划。
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
