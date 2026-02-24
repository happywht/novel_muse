import React, { useState, useRef } from 'react';
import { ProjectState, PlotVersion, AppSection } from '../types';
import { analyzePlot, expandScene, generatePlotFromContext, rewritePlot, analyzePlotRhythm, PlotRhythmPoint } from '../services/geminiService';
import { Loader } from './Loader';
import { GitBranch, Activity, AlertTriangle, LayoutTemplate, Wand2, Info, X, CheckCircle, AlertCircle, History, Zap, Save, Sidebar, User, Globe, FileText, LayoutGrid, TrendingUp, Lightbulb, BookOpen, Map, Swords, Crown, Plus, Check, RotateCcw, Edit2, Tag } from 'lucide-react';
import { PlotAnalysisPanel } from './PlotWeaver/PlotAnalysisPanel';
import { PlotRhythmChart } from './PlotWeaver/PlotRhythmChart';
import { PlotHistorySidebar } from './PlotWeaver/PlotHistorySidebar';
import { PlotStructureAssistant } from './PlotWeaver/PlotStructureAssistant';

import { useProjectStore } from '../store/useProjectStore';

interface PlotWeaverProps {
    project: ProjectState;
    updateProject: (data: Partial<ProjectState>) => void;
}

type TabMode = 'ANALYSIS' | 'OPTIMIZE' | 'RHYTHM' | 'STRUCTURE' | 'CARDS';
type ViewMode = 'TEXT' | 'CARDS';

const STRUCTURE_TEMPLATES = [
    {
        name: "救猫咪 (Save the Cat)",
        icon: BookOpen,
        color: "from-rose-500/20 to-rose-600/5 border-rose-500/30 hover:border-rose-400/60",
        accentColor: "text-rose-400",
        description: "好莱坞经典的15节拍叙事结构，适合商业化、高可读性的故事。",
        content: "1. 开场画面 (Opening Image): \n2. 主题呈现 (Theme Stated): \n3. 铺垫 (Set-up): \n4. 催化剂 (Catalyst): \n5. 争辩 (Debate): \n6. 进入第二幕 (Break into Two): \n7. B故事 (B Story): \n8. 游戏时间 (Fun and Games): \n9. 中点 (Midpoint): \n10. 坏人逼近 (Bad Guys Close In): \n11. 一无所有 (All Is Lost): \n12. 灵魂黑夜 (Dark Night of the Soul): \n13. 进入第三幕 (Break into Three): \n14. 结局 (Finale): \n15. 终场画面 (Final Image):"
    },
    {
        name: "英雄之旅 (Hero's Journey)",
        icon: Map,
        color: "from-amber-500/20 to-amber-600/5 border-amber-500/30 hover:border-amber-400/60",
        accentColor: "text-amber-400",
        description: "约瑟夫·坎贝尔的经典12阶段原型旅程，适合奇幻与冒险题材。",
        content: "1. 平凡世界: \n2. 冒险召唤: \n3. 拒绝召唤: \n4. 遇见导师: \n5. 跨越门槛: \n6. 试炼、盟友与敌人: \n7. 接近洞穴深处: \n8. 严峻考验 (磨难): \n9. 获得嘉奖 (宝剑): \n10. 归路: \n11. 复活 (高潮): \n12. 满载而归:"
    },
    {
        name: "三幕式结构 (Three Act)",
        icon: Swords,
        color: "from-sky-500/20 to-sky-600/5 border-sky-500/30 hover:border-sky-400/60",
        accentColor: "text-sky-400",
        description: "最经典的戏剧理论框架：铺垫、对抗、结局。简洁有力。",
        content: "第一幕 (铺垫): \n- 激励事件: \n- 情节点一: \n\n第二幕 (对抗): \n- 试图解决问题: \n- 中点转折: \n- 一无所有时刻: \n- 情节点二: \n\n第三幕 (结局): \n- 高潮对决: \n- 新的平衡:"
    },
    {
        name: "网文黄金三章",
        icon: Crown,
        color: "from-violet-500/20 to-violet-600/5 border-violet-500/30 hover:border-violet-400/60",
        accentColor: "text-violet-400",
        description: "网络文学的黄金法则：前三章定生死，快速抓住读者。",
        content: "第一章：引入主角与冲突\n第二章：建立世界观与背景\n第三章：埋下伏笔与揭示秘密"
    },
];

export const PlotWeaver: React.FC<PlotWeaverProps> = ({ project, updateProject }) => {
    // --- Core State ---
    const [analysis, setAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGeneratingPlot, setIsGeneratingPlot] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveNote, setSaveNote] = useState('');
    const [showReference, setShowReference] = useState(false);

    // --- Tab & View ---
    const [activeTab, setActiveTab] = useState<TabMode>('CARDS');

    // Migration Effect: Convert old text outline to cards automatically
    React.useEffect(() => {
        if (project.plotOutline && project.plotOutline.trim() && project.plotNodes.length === 0) {
            console.log("Migrating legacy plot outline to cards...");
            const legacyBeats = project.plotOutline.split(/\n\n+/).filter(b => b.trim().length > 0);
            const newNodes = legacyBeats.map((beat, idx) => ({
                id: `migrated-${idx}-${Date.now()}`,
                title: beat.split('\n')[0].substring(0, 30).trim() || `情节点 ${idx + 1}`,
                content: beat,
                order: idx,
                relatedCharacters: [],
                relatedLocations: []
            }));
            updateProject({
                plotNodes: newNodes,
                plotOutline: '' // Clean up legacy field after migration
            });
            showToast("检测到旧版大纲，已自动为您转换为情节卡片！", "success");
        }
    }, []);

    // --- Optimization State ---
    const [customRewritePrompt, setCustomRewritePrompt] = useState('');

    // --- Rhythm State ---
    const [rhythmData, setRhythmData] = useState<PlotRhythmPoint[]>([]);
    const [isAnalyzingRhythm, setIsAnalyzingRhythm] = useState(false);

    // --- Selection State ---
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [selectedText, setSelectedText] = useState('');
    const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);

    // --- UI States ---
    const [pendingAction, setPendingAction] = useState<{ type: 'GENERATE' | 'TEMPLATE' | 'RESTORE'; payload?: any } | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

    // --- Iterative Drafting States (Stage B) ---
    const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
    const [draftNodeContent, setDraftNodeContent] = useState<string | null>(null);
    const [iterationFeedback, setIterationFeedback] = useState('');
    const [isIterating, setIsIterating] = useState(false);

    const { setActiveSection, setActivePlotNodeId } = useProjectStore();
    const plotOutline = project.plotOutline || '';

    // ========================
    // Shared Logic / Helpers
    // ========================

    const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const updatePlotWithHistory = (newContent: string, note: string) => {
        const historyEntry: PlotVersion = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            content: plotOutline,
            note: note || '自动保存',
        };
        const newHistory = plotOutline ? [historyEntry, ...project.plotHistory].slice(0, 20) : project.plotHistory;
        updateProject({ plotOutline: newContent, plotHistory: newHistory });
    };

    const handleManualSave = () => {
        if (!plotOutline.trim()) { showToast("大纲内容为空，无法保存。", 'error'); return; }
        const historyEntry: PlotVersion = {
            id: Date.now().toString(), timestamp: Date.now(), content: plotOutline, note: saveNote || "手动存档"
        };
        const newHistory = [historyEntry, ...project.plotHistory].slice(0, 20);
        updateProject({ plotHistory: newHistory });
        setSaveNote(''); setShowSaveModal(false); showToast("已保存为历史版本", 'success');
    };

    // --- Selection ---
    const handleTextSelect = () => {
        if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;
            if (start !== end) {
                setSelectedText(textareaRef.current.value.substring(start, end));
                setSelectionRange({ start, end });
            } else {
                setSelectedText(''); setSelectionRange(null);
            }
        }
    };

    // --- AI Handlers ---
    const handleAnalyze = async () => {
        if (!fullContent.trim()) return;
        setIsAnalyzing(true); setActiveTab('ANALYSIS');
        try {
            const result = await analyzePlot(project.premise, fullContent, project.characters, project.worldSettings, project.creativeSettings, project.echoes);
            setAnalysis(result);
        } catch (e) { console.error(e); showToast("分析失败，请重试。", 'error'); }
        finally { setIsAnalyzing(false); }
    };

    const handleAnalyzeRhythm = async () => {
        if (!fullContent.trim()) { showToast("请先填写大纲内容", 'error'); return; }
        setIsAnalyzingRhythm(true);
        try { const data = await analyzePlotRhythm(fullContent); setRhythmData(data); }
        catch (e) { console.error(e); showToast("节奏分析失败", 'error'); }
        finally { setIsAnalyzingRhythm(false); }
    };

    const handleGeneratePlotClick = () => {
        if (!project.premise) { showToast("请先完善小说核心梗概。", 'error'); return; }
        if (plotOutline) { setPendingAction({ type: 'GENERATE' }); }
        else { performGeneratePlot(); }
    };

    const performGeneratePlot = async (template?: string) => {
        setPendingAction(null); setIsGeneratingPlot(true);
        const label = template ? "AI 模版填充" : "AI 智能生成";
        try {
            const result = await generatePlotFromContext(project.premise, project.genre, project.characters, project.worldSettings, project.creativeSettings, template, project.echoes);
            updatePlotWithHistory(result, label);
        } catch (e) { console.error(e); showToast("生成失败，请重试。", 'error'); }
        finally { setIsGeneratingPlot(false); }
    };

    const handleRewrite = async (prompt: string, label: string) => {
        if (!plotOutline) return;
        setIsGeneratingPlot(true);
        try {
            if (selectedText && selectionRange) {
                const result = await rewritePlot(selectedText, prompt, project.genre, project.characters, project.worldSettings, project.creativeSettings, project.echoes);
                const before = plotOutline.substring(0, selectionRange.start);
                const after = plotOutline.substring(selectionRange.end);
                updatePlotWithHistory(before + result + after, `${label} (局部)`);
                showToast("局部重写完成！", "success");
            } else {
                const result = await rewritePlot(plotOutline, prompt, project.genre, project.characters, project.worldSettings, project.creativeSettings, project.echoes);
                updatePlotWithHistory(result, label);
                showToast("全局重写完成！", "success");
            }
        } catch (e) { showToast("重写失败", "error"); }
        finally { setIsGeneratingPlot(false); }
    };

    const handleAutoFix = async () => {
        if (!analysis) { showToast("请先点击'分析'按钮生成诊断报告。", "error"); setActiveTab('ANALYSIS'); return; }
        handleRewrite(`请根据以下的分析报告，修正剧情中的逻辑漏洞和节奏问题：\n${analysis}`, "基于分析报告的智能修复");
    };

    const handleRestoreHistory = (entry: PlotVersion) => {
        if (plotOutline) { setPendingAction({ type: 'RESTORE', payload: entry }); }
        else { performRestore(entry); }
    };

    const performRestore = (entry: PlotVersion) => {
        updatePlotWithHistory(entry.content, `还原自: ${entry.note}`);
        setPendingAction(null); setShowHistory(false);
    };

    const confirmAction = () => {
        if (pendingAction?.type === 'GENERATE') {
            const template = typeof pendingAction.payload === 'string' ? pendingAction.payload : undefined;
            performGeneratePlot(template);
        } else if (pendingAction?.type === 'TEMPLATE') {
            performApplyTemplate(pendingAction.payload);
        } else if (pendingAction?.type === 'RESTORE') {
            performRestore(pendingAction.payload);
        }
    };

    // --- Plot Nodes Handlers ---
    const handleAddCard = () => {
        const newNode = {
            id: Date.now().toString(),
            title: `情节点 ${project.plotNodes.length + 1}`,
            content: '',
            order: project.plotNodes.length,
        };
        updateProject({ plotNodes: [...project.plotNodes, newNode] });
    };

    const handleUpdateCard = (id: string, updates: Partial<any>) => {
        const newNodes = project.plotNodes.map(n => n.id === id ? { ...n, ...updates } : n);
        updateProject({ plotNodes: newNodes });
    };

    const handleRemoveCard = (id: string) => {
        const newNodes = project.plotNodes.filter(n => n.id !== id).map((n, idx) => ({ ...n, order: idx }));
        updateProject({ plotNodes: newNodes });
        if (editingNodeId === id) setEditingNodeId(null);
    };

    // --- Iterative Drafting Logic (Stage B) ---
    const handleGenerateNodeAI = async (nodeId: string) => {
        const node = project.plotNodes.find(n => n.id === nodeId);
        if (!node) return;

        setIsIterating(true);
        setEditingNodeId(nodeId);
        try {
            const prompt = `基于小说核心梗概: "${project.premise}" 和类型: "${project.genre}".
            请扩写并精炼以下情节点。
            当前标题: ${node.title}
            当前内容梗概: ${node.content}
            
            要求：通过动作、对话和感官细节来扩充，保持叙事节奏，并确保符合整体风格。`;

            const result = await generateText(prompt, 'plot_weaving', project.creativeSettings);
            setDraftNodeContent(result);
        } catch (e) {
            console.error(e);
            showToast("生成失败", 'error');
        } finally {
            setIsIterating(false);
        }
    };

    const handleIterateNode = async () => {
        if (!editingNodeId || !draftNodeContent || !iterationFeedback.trim()) return;
        setIsIterating(true);
        try {
            const prompt = `
            【当前草稿内容】:
            ${draftNodeContent}

            【用户反馈意见】:
            ${iterationFeedback}
            
            请根据反馈重写并优化这段情节描述。保持风格一致。`;

            const newContent = await generateText(prompt, 'iteration_refinement', project.creativeSettings);
            setDraftNodeContent(newContent);
            setIterationFeedback('');
        } catch (e) {
            console.error(e);
            showToast("迭代失败", 'error');
        } finally {
            setIsIterating(false);
        }
    };

    const handleAcceptDraftNode = () => {
        if (!editingNodeId || draftNodeContent === null) return;
        handleUpdateCard(editingNodeId, { content: draftNodeContent });
        setDraftNodeContent(null);
        setEditingNodeId(null);
        showToast("剧情已更新并采纳", 'success');
    };

    // Aggregation: Collect all card content into a single string for legacy AI analysis
    const fullContent = project.plotNodes
        .sort((a, b) => a.order - b.order)
        .map(n => `### ${n.title}\n${n.content}`)
        .join('\n\n');

    const handleQuickDraft = (nodeId: string) => {
        setActivePlotNodeId(nodeId);
        setActiveSection(AppSection.DRAFTING);
    };

    // --- Template Selection Handler ---
    const handleSelectTemplate = (template: typeof STRUCTURE_TEMPLATES[0]) => {
        if (project.plotNodes.length > 0) {
            setPendingAction({ type: 'TEMPLATE', payload: template.content });
        } else {
            performApplyTemplate(template.content);
        }
    };

    const performApplyTemplate = (content: string) => {
        const sections = content.split('\n').filter(s => s.trim());
        const newNodes = sections.map((section, idx) => ({
            id: `tpl-${idx}-${Date.now()}`,
            title: section.split(':')[0].trim() || `节拍 ${idx + 1}`,
            content: section.split(':')[1]?.trim() || '',
            order: idx,
            relatedCharacters: [],
            relatedLocations: []
        }));
        updateProject({ plotNodes: newNodes });
        setPendingAction(null);
        showToast("模版应用成功，请填充剧情细节。", "success");
    };

    const beats = project.plotNodes.map(n => n.content);

    // ========================
    // Tab definitions
    // ========================
    const tabItems = [
        { id: 'CARDS' as TabMode, label: '情节看板', icon: LayoutGrid },
        { id: 'ANALYSIS' as TabMode, label: '诊断报告', icon: AlertTriangle },
        { id: 'OPTIMIZE' as TabMode, label: '优化与重写', icon: Zap },
        { id: 'RHYTHM' as TabMode, label: '节奏视图', icon: TrendingUp },
        { id: 'STRUCTURE' as TabMode, label: '结构助手', icon: Lightbulb },
    ];

    // ========================
    // Render
    // ========================
    return (
        <div className="flex h-[calc(100vh-140px)] gap-6 relative">
            {/* Reference Sidebar (Collapsible) */}
            <div
                className={`fixed right-0 top-16 bottom-0 bg-slate-900 border-l border-slate-700 shadow-2xl z-40 transition-all duration-300 transform ${showReference ? 'translate-x-0 w-80' : 'translate-x-full w-0'}`}
            >
                <div className="flex flex-col h-full w-80">
                    <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                        <h3 className="font-bold text-white flex items-center gap-2"><Sidebar size={18} /> 设定参考</h3>
                        <button onClick={() => setShowReference(false)}><X size={18} className="text-slate-400 hover:text-white" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                        <div>
                            <h4 className="text-muse-400 text-xs font-bold uppercase mb-2 flex items-center gap-1"><User size={12} /> 核心角色</h4>
                            {project.characters.length === 0 && <p className="text-slate-600 text-xs">暂无角色。</p>}
                            <div className="space-y-3">
                                {project.characters.map(c => (
                                    <div key={c.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                        <div className="flex justify-between"><span className="text-slate-200 font-bold text-sm">{c.name}</span><span className="text-xs text-slate-500">{c.role}</span></div>
                                        <p className="text-xs text-slate-400 mt-1 line-clamp-3">{c.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-muse-400 text-xs font-bold uppercase mb-2 flex items-center gap-1"><Globe size={12} /> 世界观设定</h4>
                            {project.worldSettings.length === 0 && <p className="text-slate-600 text-xs">暂无设定。</p>}
                            <div className="space-y-3">
                                {project.worldSettings.map(w => (
                                    <div key={w.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                        <div className="flex justify-between"><span className="text-slate-200 font-bold text-sm">{w.title}</span><span className="text-xs text-slate-500 truncate max-w-[80px]">{w.category}</span></div>
                                        <p className="text-xs text-slate-400 mt-1 line-clamp-3">{w.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== Left Side: Editor ===== */}
            <div className="w-1/2 flex flex-col space-y-4">
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 flex-1 flex flex-col relative">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-serif font-bold text-white flex items-center gap-2">
                            <GitBranch className="text-muse-400" size={20} /> 剧情大纲
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowReference(!showReference)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all border ${showReference ? 'bg-muse-900 border-muse-500 text-muse-300' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}`}
                                title="查看参考资料"
                            ><Sidebar size={16} /> <span className="hidden xl:inline">参考</span></button>
                            <button
                                onClick={() => setShowSaveModal(true)}
                                className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all border border-slate-600 disabled:opacity-50"
                                title="保存当前版本"
                            ><Save size={16} /> 存版本</button>
                            <button
                                onClick={() => setShowHistory(!showHistory)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all border ${showHistory ? 'bg-muse-900 border-muse-500 text-muse-300' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}`}
                                title="历史版本时光机"
                            ><History size={16} /></button>
                            <button
                                onClick={handleGeneratePlotClick}
                                disabled={isGeneratingPlot}
                                className="bg-muse-800 hover:bg-muse-700 text-muse-200 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-all border border-muse-700"
                                title="AI 智能演绎大纲"
                            ><Wand2 size={16} /> <span className="hidden xl:inline">自由生成</span></button>
                        </div>
                    </div>

                    {/* Editor Area */}
                    <div className="relative flex-1 flex flex-col overflow-hidden">
                        {/* ★ Empty State: Template Selection Cards ★ */}
                        {project.plotNodes.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
                                <LayoutTemplate size={40} className="text-slate-600 mb-4 opacity-40" />
                                <h3 className="text-lg font-serif font-bold text-slate-300 mb-2">选择叙事骨架，开始创作</h3>
                                <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
                                    选择一个经典结构模版，AI 将基于您的小说设定自动填充骨架，或者直接在此添加情节卡片。
                                </p>
                                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                                    {STRUCTURE_TEMPLATES.map((t, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSelectTemplate(t)}
                                            className={`relative text-left p-4 rounded-xl border bg-gradient-to-br transition-all duration-200 hover:scale-[1.02] hover:shadow-lg group ${t.color}`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <t.icon size={18} className={t.accentColor} />
                                                <span className={`font-bold text-sm ${t.accentColor}`}>{t.name}</span>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">{t.description}</p>
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={handleAddCard}
                                    className="mt-4 text-xs text-slate-500 hover:text-muse-400 transition-colors underline underline-offset-4"
                                >
                                    跳过模版，直接手动添加情节 →
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 p-1 pb-20">
                                {project.plotNodes.length > 0 ? (
                                    <>
                                        {project.plotNodes.sort((a, b) => a.order - b.order).map((node, idx) => (
                                            <div key={node.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-muse-500/30 transition-all group relative">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-700">
                                                        {idx + 1}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={node.title}
                                                        onChange={(e) => handleUpdateCard(node.id, { title: e.target.value })}
                                                        className="bg-transparent border-none text-white font-bold text-lg focus:ring-0 w-full placeholder:text-slate-700"
                                                        placeholder="输入情节标题..."
                                                    />
                                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                                        <button
                                                            onClick={() => handleRemoveCard(node.id)}
                                                            className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                                            title="删除卡片"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <textarea
                                                    value={node.content}
                                                    onChange={(e) => handleUpdateCard(node.id, { content: e.target.value })}
                                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-sm text-slate-400 focus:text-slate-200 focus:border-muse-500/50 outline-none resize-none font-serif min-h-[100px] transition-all"
                                                    placeholder="描述这段剧情的发生、冲突与转折..."
                                                />
                                                <div className="mt-3 flex justify-between items-center">
                                                    <div className="flex gap-2">
                                                        <button
                                                            className="flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-muse-400 px-2 py-1 rounded transition-colors"
                                                            title="关联角色"
                                                        >
                                                            <User size={10} /> {node.relatedCharacters?.length || 0}
                                                        </button>
                                                        <button
                                                            className="flex items-center gap-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-muse-400 px-2 py-1 rounded transition-colors"
                                                            title="关联场景"
                                                        >
                                                            <Globe size={10} /> {node.relatedLocations?.length || 0}
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => handleQuickDraft(node.id)}
                                                        className="px-3 py-1 bg-muse-600/20 hover:bg-muse-600 border border-muse-600/30 text-muse-400 hover:text-white text-xs rounded-lg transition-all flex items-center gap-1"
                                                    >
                                                        <Zap size={12} /> 一键开写
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={handleAddCard}
                                            className="w-full py-8 border-2 border-dashed border-slate-800 rounded-xl text-slate-600 hover:text-muse-400 hover:border-muse-500/50 hover:bg-muse-500/5 transition-all flex flex-col items-center gap-2 group"
                                        >
                                            <div className="w-10 h-10 rounded-full border-2 border-slate-800 group-hover:border-muse-500/50 flex items-center justify-center">
                                                <LayoutGrid size={20} />
                                            </div>
                                            <span className="text-sm font-medium">添加新情节卡片</span>
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-12">
                                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center text-slate-600">
                                            <LayoutGrid size={40} />
                                        </div>
                                        <div className="max-w-xs">
                                            <h3 className="text-lg font-bold text-white mb-2">开始构建你的故事</h3>
                                            <p className="text-sm text-slate-500 leading-relaxed">
                                                使用上方的“自由生成”通过 AI 开启灵感，或者点击下方按钮手动添加情节。
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleAddCard}
                                            className="bg-muse-600 hover:bg-muse-500 text-white px-6 py-3 rounded-xl font-bold shadow-xl shadow-muse-900/20 transition-all flex items-center gap-2"
                                        >
                                            <Plus size={18} /> 添加第一张情节卡片
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Status Bar */}
                        {plotOutline.trim() && (
                            <div className="absolute bottom-4 right-4 pointer-events-none opacity-80">
                                <div className="bg-slate-800/90 text-xs text-slate-400 px-3 py-1.5 rounded-full border border-slate-700 flex items-center gap-2 shadow-lg backdrop-blur-sm">
                                    <Info size={12} className="text-muse-400" />
                                    <span>AI 已连接: {project.characters.length} 角色 · {project.worldSettings.length} 设定</span>
                                </div>
                            </div>
                        )}

                        {/* Selection Context Menu (Removed as card centric) */}
                        {selectedText && (
                            <div className="absolute bottom-16 right-4 bg-slate-800 border border-muse-500/50 shadow-2xl rounded-lg p-2 flex flex-col gap-1 animate-fade-in z-30">
                                <div className="text-[10px] text-slate-500 px-2 uppercase font-bold mb-1">已选中 {selectedText.length} 字</div>
                                <button
                                    onClick={() => { setActiveTab('OPTIMIZE'); setCustomRewritePrompt("润色这段文字，使其更具画面感"); }}
                                    className="text-xs text-left px-3 py-2 hover:bg-slate-700 rounded text-slate-200 flex items-center gap-2"
                                ><Zap size={12} /> 局部润色</button>
                            </div>
                        )}

                        {/* Loading Overlay */}
                        {isGeneratingPlot && (
                            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg">
                                <Loader text="AI 正在推演命运的齿轮..." />
                            </div>
                        )}

                        {/* History Overlay */}
                        {showHistory && (
                            <PlotHistorySidebar
                                plotHistory={project.plotHistory}
                                onRestore={handleRestoreHistory}
                                onClose={() => setShowHistory(false)}
                            />
                        )}
                    </div>
                </div>

                {/* Analysis Trigger Button */}
                <div className="flex justify-end gap-2 px-2">
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !plotOutline}
                        className="bg-muse-600 hover:bg-muse-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 transition-all shadow-md shadow-muse-900/20"
                    >
                        <Activity size={16} /> 执行深度评估 (Analysis)
                    </button>
                </div>
            </div>

            {/* ===== Right Side: Panels ===== */}
            <div className="w-1/2 bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden relative">
                {/* Tab Bar */}
                <div className="flex border-b border-slate-800 bg-slate-900/50">
                    {tabItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === item.id
                                ? 'text-muse-400 border-b-2 border-muse-500 bg-muse-900/10'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            <item.icon size={16} /> {item.label}
                        </button>
                    ))}
                </div>

                {/* Panel Content */}
                <div className="flex-1 p-6 overflow-y-auto custom-scrollbar relative">
                    {(activeTab === 'ANALYSIS' || activeTab === 'OPTIMIZE') && (
                        <PlotAnalysisPanel
                            analysis={analysis}
                            selectedText={selectedText}
                            customRewritePrompt={customRewritePrompt}
                            onCustomRewritePromptChange={setCustomRewritePrompt}
                            onRewrite={handleRewrite}
                            onAutoFix={handleAutoFix}
                            activeSubTab={activeTab}
                        />
                    )}

                    {activeTab === 'RHYTHM' && (
                        <PlotRhythmChart
                            rhythmData={rhythmData}
                            isAnalyzingRhythm={isAnalyzingRhythm}
                            hasPlotOutline={!!plotOutline.trim()}
                            onAnalyzeRhythm={handleAnalyzeRhythm}
                        />
                    )}

                    {activeTab === 'STRUCTURE' && (
                        <PlotStructureAssistant
                            premise={project.premise}
                            genre={project.genre}
                            plotOutline={fullContent}
                            selectedText={selectedText}
                            characters={project.characters}
                            worldSettings={project.worldSettings}
                            creativeSettings={project.creativeSettings}
                            echoes={project.echoes}
                        />
                    )}

                    {/* Global Loading Overlay for Right Panels */}
                    {(isAnalyzing || isAnalyzingRhythm) && (
                        <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-20">
                            <Loader text={isAnalyzing ? "正在进行逻辑审计..." : "正在分析剧情节奏..."} />
                        </div>
                    )}
                </div>
            </div>

            {/* ===== Modals ===== */}

            {/* Save Version Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Save className="text-muse-400" size={20} /> 保存历史版本
                            </h3>
                            <button onClick={() => setShowSaveModal(false)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm text-slate-400 mb-1">版本备注</label>
                                <input
                                    type="text" value={saveNote}
                                    onChange={(e) => setSaveNote(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-muse-500 outline-none"
                                    placeholder="例如：第一稿、增加反转后..."
                                />
                            </div>
                            <p className="text-xs text-slate-500">此操作将当前的大纲内容归档，方便日后回溯。</p>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm">取消</button>
                            <button onClick={handleManualSave} className="px-4 py-2 rounded-lg bg-muse-600 hover:bg-muse-500 text-white font-medium shadow-lg text-sm">确认存档</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {pendingAction && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <AlertTriangle className="text-amber-400" size={20} />
                                {pendingAction.type === 'GENERATE' && plotOutline ? '覆盖确认' : '操作确认'}
                            </h3>
                            <button onClick={() => setPendingAction(null)} className="text-slate-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="text-slate-300 text-sm mb-6">
                            {pendingAction.type === 'GENERATE' && plotOutline && (
                                <p>当前剧情大纲不为空。继续操作将<strong>覆盖现有内容</strong>，旧版本将自动保存至历史记录。是否继续？</p>
                            )}
                            {pendingAction.type === 'RESTORE' && (
                                <p>确定要回滚到此历史版本吗？当前进度将保存为新的历史记录。</p>
                            )}
                            {pendingAction.type === 'GENERATE' && !plotOutline && (
                                <p>即将在空大纲上生成内容。确定开始吗？</p>
                            )}
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setPendingAction(null)} className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm">取消</button>
                            <button onClick={confirmAction} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium shadow-lg text-sm">确认</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 transition-all animate-fade-in font-medium text-sm flex items-center gap-2 border ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-200' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-200'}`}>
                    {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                    <span>{toast.msg}</span>
                </div>
            )}
        </div>
    );
};
