import React, { useState, useMemo } from 'react';
import {
    Rocket, Sparkles, Wand2, BookOpen, AlertCircle, CheckCircle,
    X, Zap, Target, Download, Copy, Check, ArrowRight
} from 'lucide-react';
import { ProjectState } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Loader } from './Loader';

interface DashboardProps {
    project: ProjectState;
    updateProject: (updates: Partial<ProjectState>) => void;
    onImportProject: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ project, updateProject, onImportProject }) => {
    const [brainstormInput, setBrainstormInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestion, setSuggestion] = useState('');
    const [isKickstarting, setIsKickstarting] = useState(false);
    const [kickstartStep, setKickstartStep] = useState(0);
    const [kickstartStatus, setKickstartStatus] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    // Calculate total words across all chapters and drafts
    const totalWords = useMemo(() => {
        const chapterWords = project.chapters.reduce((sum, ch) => sum + ch.content.length, 0);
        const draftWords = (project.drafts || []).reduce((sum, dr) => sum + dr.content.length, 0);
        return chapterWords + draftWords;
    }, [project.chapters, project.drafts]);

    const handleBrainstorm = async () => {
        if (!brainstormInput.trim()) return;
        setIsGenerating(true);
        try {
            // Mock brainstorm logic
            await new Promise(resolve => setTimeout(resolve, 1500));
            setSuggestion(`### 灵感建议\n\n根据你的输入"${brainstormInput}"，我建议增加一个具有逆向思维的角色，他能够看到事物的负面空间...`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveIdea = () => {
        if (!suggestion) return;
        updateProject({
            worldSettings: [...project.worldSettings, {
                id: Date.now().toString(),
                category: 'Other',
                title: 'AI 灵感记录',
                content: suggestion
            }]
        });
        setSuggestion('');
        setBrainstormInput('');
    };

    const requestKickstart = () => {
        if (!project.premise) return;
        setShowConfirmModal(true);
    };

    const executeKickstart = async () => {
        setShowConfirmModal(false);
        setIsKickstarting(true);
        setKickstartStep(1);
        setKickstartStatus('正在推演核心角色...');

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            setKickstartStep(2);
            setKickstartStatus('正在构建世界观设定...');

            await new Promise(resolve => setTimeout(resolve, 2500));
            setKickstartStep(3);
            setKickstartStatus('正在生成剧情大纲...');

            await new Promise(resolve => setTimeout(resolve, 3000));
            setKickstartStatus('创世纪完成！');
            await new Promise(resolve => setTimeout(resolve, 1000));
        } finally {
            setIsKickstarting(false);
            setKickstartStep(0);
        }
    };

    const handleExportBible = async () => {
        setIsExporting(true);
        try {
            const content = `# ${project.title} - 小说设定集 (The Bible)\n\n## 核心梗概\n${project.premise}\n\n... (更多内容)`;
            const blob = new Blob([content], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${project.title || 'novel'}_bible.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } finally {
            setIsExporting(false);
        }
    };

    const handleCopyBible = async () => {
        const content = `# ${project.title} - 小说设定集\n\n## 核心梗概\n${project.premise}`;
        await navigator.clipboard.writeText(content);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 animate-fade-in relative px-4 pb-20">
            {/* ── Hero: Project Identity Card ── */}
            <div className="bg-gradient-to-br from-amber-900/20 via-slate-900 to-slate-900 rounded-2xl border border-amber-500/15 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-lg shadow-amber-500/5">
                                <Rocket className="text-amber-400" size={24} />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    value={project.title}
                                    onChange={(e) => updateProject({ title: e.target.value })}
                                    className="bg-transparent text-2xl font-black text-white outline-none focus:ring-b-2 focus:ring-amber-500/50 w-full placeholder-slate-700"
                                    placeholder="输入你的巨著书名..."
                                />
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold uppercase tracking-tighter">
                                        Novel Architect v2.0
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-medium">
                                        Last Sync: {new Date().toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopyBible}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700/50 text-xs font-bold"
                        >
                            {copySuccess ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            {copySuccess ? '已复制' : '复制设定集'}
                        </button>
                        <button
                            onClick={handleExportBible}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-all border border-amber-500/20 text-xs font-bold shadow-lg shadow-amber-500/5"
                        >
                            <Download size={14} />
                            导出 Bible (.md)
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Main body with 3 columns ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                {/* Column 1: Premise (5/12) */}
                <div className="lg:col-span-5 space-y-5">
                    <div className="bg-slate-800/40 rounded-xl border border-slate-700/60 p-5 space-y-3 h-full flex flex-col">
                        <label className="flex items-center gap-2 text-xs font-semibold text-amber-400/80 uppercase tracking-wider">
                            <BookOpen size={14} /> 核心梗概
                        </label>
                        <textarea
                            value={project.premise}
                            onChange={(e) => updateProject({ premise: e.target.value })}
                            className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-lg p-4 text-white focus:ring-1 focus:ring-amber-500/40 outline-none placeholder-slate-600 resize-none font-serif leading-relaxed custom-scrollbar min-h-[220px] text-sm"
                            placeholder="你的故事是关于什么的？细节越丰富，AI 辅助效果越好。"
                        />
                    </div>
                </div>

                {/* Column 2: AI Actions (4/12) */}
                <div className="lg:col-span-4 space-y-5">
                    {/* AI Brainstorm */}
                    <div className="bg-gradient-to-br from-amber-900/15 to-slate-900 rounded-xl border border-amber-500/20 p-5 flex flex-col min-h-[280px] h-full">
                        <div className="flex items-center gap-2 mb-3 text-amber-300 text-xs font-semibold uppercase tracking-wider">
                            <Sparkles size={14} />
                            <span>AI 灵感火花</span>
                        </div>

                        {!suggestion && !isGenerating && (
                            <div className="flex-1 flex flex-col justify-center">
                                <textarea
                                    value={brainstormInput}
                                    onChange={(e) => setBrainstormInput(e.target.value)}
                                    className="w-full bg-slate-950/40 border border-amber-500/15 rounded-lg p-3 text-sm text-slate-200 focus:ring-1 focus:ring-amber-400/40 outline-none resize-none mb-3"
                                    rows={4}
                                    placeholder="输入一个关键词或场景片断..."
                                />
                                <button
                                    onClick={handleBrainstorm}
                                    className="w-full bg-amber-600/80 hover:bg-amber-500 text-white py-2 rounded-lg transition-colors font-medium text-sm flex items-center justify-center gap-2"
                                >
                                    <Zap size={14} /> 点燃灵感
                                </button>
                            </div>
                        )}

                        {isGenerating && (
                            <div className="flex-1 flex items-center justify-center">
                                <Loader text="缪斯女神正在思考..." />
                            </div>
                        )}

                        {suggestion && !isGenerating && (
                            <div className="flex-1 overflow-y-auto max-h-[350px] pr-1 custom-scrollbar flex flex-col">
                                <div className="bg-slate-950/40 rounded-lg p-3 text-sm flex-1 mb-3">
                                    <MarkdownRenderer content={suggestion} />
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => setSuggestion('')}
                                        className="flex-1 bg-slate-700/60 hover:bg-slate-600 text-white py-1.5 rounded-lg text-xs transition-colors"
                                    >
                                        清除
                                    </button>
                                    <button
                                        onClick={handleSaveIdea}
                                        className="flex-1 bg-amber-700/80 hover:bg-amber-600 text-white py-1.5 rounded-lg text-xs transition-colors font-medium flex items-center justify-center gap-1"
                                    >
                                        <Target size={12} /> 采纳此创意
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 3: Stats & Kickstart (3/12) */}
                <div className="lg:col-span-3 space-y-5">
                    {/* Quick Brief */}
                    <div className="bg-slate-800/20 rounded-xl border border-slate-700/40 p-5 space-y-4">
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">创作简略 (Brief)</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 uppercase">总字数</div>
                                <div className="text-xl font-mono text-white tracking-tight">{totalWords.toLocaleString()}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 uppercase">正式章节</div>
                                <div className="text-xl font-mono text-white tracking-tight">{project.chapters.length}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 uppercase">核心角色</div>
                                <div className="text-xl font-mono text-amber-400 tracking-tight">{project.characters.length}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 uppercase">世界设定</div>
                                <div className="text-xl font-mono text-sky-400 tracking-tight">{project.worldSettings.length}</div>
                            </div>
                        </div>
                    </div>

                    {/* Kickstart */}
                    <div className="bg-slate-800/40 rounded-xl border border-slate-700/60 p-5 relative overflow-hidden flex-1 flex flex-col">
                        <div className="relative z-10 flex-1 flex flex-col justify-center">
                            {!isKickstarting ? (
                                <div className="text-center space-y-3 py-2">
                                    <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/20">
                                        <Rocket className="text-indigo-400" size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-sm">一键创世纪</h3>
                                        <p className="text-[10px] text-slate-500 mt-1 max-w-[180px] mx-auto leading-relaxed">
                                            基于梗概推演全套人设、世界观与剧情大纲
                                        </p>
                                    </div>
                                    <button
                                        onClick={requestKickstart}
                                        disabled={!project.premise}
                                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-2 rounded-xl font-medium text-xs transition-all shadow-lg shadow-indigo-900/30 flex items-center gap-2 mx-auto"
                                    >
                                        ✨ 启动
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-fade-in py-2">
                                    {/* Step indicators */}
                                    <div className="flex items-center gap-1.5 justify-center">
                                        {[
                                            { step: 1, label: '角色', icon: '👤' },
                                            { step: 2, label: '世界', icon: '🌍' },
                                            { step: 3, label: '大纲', icon: '📈' },
                                        ].map((s, idx) => (
                                            <React.Fragment key={s.step}>
                                                <div className={`flex flex-col items-center gap-1 transition-all duration-500 ${kickstartStep >= s.step ? 'opacity-100' : 'opacity-30'}`}>
                                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all duration-500 ${kickstartStep > s.step ? 'bg-emerald-500/20 text-emerald-400' :
                                                        kickstartStep === s.step ? 'bg-indigo-500/20 text-indigo-400 animate-pulse' :
                                                            'bg-slate-800 text-slate-600'
                                                        }`}>
                                                        {kickstartStep > s.step ? <CheckCircle size={14} /> : s.icon}
                                                    </div>
                                                </div>
                                                {idx < 2 && (
                                                    <div className={`w-3 h-0.5 rounded-full transition-all duration-500 ${kickstartStep > s.step ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 justify-center text-white">
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span className="text-[10px] truncate max-w-[120px]">{kickstartStatus}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-900/0 via-indigo-500/[0.03] to-indigo-900/0 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl transform transition-all scale-100">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Rocket className="text-indigo-400" size={24} />
                                启动深度创世纪？
                            </h3>
                            <button onClick={() => setShowConfirmModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="text-slate-300 text-sm leading-relaxed mb-6 space-y-3 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                            <p className="font-medium text-slate-200">这将基于您的<strong className="text-orange-300">创作罗盘</strong>设置，进行深度初始化：</p>
                            <ul className="space-y-1 ml-1 text-xs">
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-400 mt-0.5">•</span>
                                    <span>生成 <strong>6 位</strong> 核心角色 (主角/反派/导师/配角)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-400 mt-0.5">•</span>
                                    <span>逐项生成 <strong>5 大类</strong> 世界观设定</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-400 mt-0.5">•</span>
                                    <span>推演<strong>完整剧情大纲</strong></span>
                                </li>
                            </ul>
                            <p className="text-[10px] text-amber-400/80 pt-2 border-t border-slate-700/50 mt-2 flex items-center gap-1">
                                <AlertCircle size={12} />
                                <span>全过程可能需要 1-2 分钟，请勿关闭页面。</span>
                            </p>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-medium"
                            >
                                取消
                            </button>
                            <button
                                onClick={executeKickstart}
                                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/50 text-xs flex items-center gap-2"
                            >
                                确认启动 <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
