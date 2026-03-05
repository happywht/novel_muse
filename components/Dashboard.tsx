import React, { useState } from 'react';
import { ProjectState, WorldSetting, CreativeSettings } from '../types';
import { generateText, batchGenerateCharacters, batchGenerateWorldSettingsByCategory, generatePlotFromContext } from '../services/geminiService';
import { Loader } from './Loader';
import { BookOpen, Sparkles, Target, Rocket, CheckCircle, ArrowRight, AlertCircle, X, Sliders, Zap, FileText, Clipboard } from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface DashboardProps {
    project: ProjectState;
    updateProject: (data: Partial<ProjectState>) => void;
    onImportProject?: () => void;
}

const WORLD_CATEGORIES: WorldSetting['category'][] = ['Geography', 'Magic/Tech', 'Society', 'History', 'Other'];

export const Dashboard: React.FC<DashboardProps> = ({ project, updateProject }) => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [brainstormInput, setBrainstormInput] = useState('');
    const [suggestion, setSuggestion] = useState('');

    // Kickstart State
    const [isKickstarting, setIsKickstarting] = useState(false);
    const [kickstartStep, setKickstartStep] = useState(0); // 0: Idle, 1: Chars, 2: World, 3: Plot
    const [kickstartStatus, setKickstartStatus] = useState('');

    // UI States for Modal and Toast
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [toast, setToast] = useState<{ msg: string, type: 'error' | 'success' } | null>(null);

    const showToast = (msg: string, type: 'error' | 'success' = 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleUpdateSettings = (key: keyof CreativeSettings, value: string | number) => {
        updateProject({
            creativeSettings: {
                ...project.creativeSettings,
                [key]: value
            }
        });
    };

    const handleBrainstorm = async () => {
        if (!brainstormInput.trim()) return;
        setIsGenerating(true);
        try {
            const prompt = `我有一个关于小说的初步想法： "${brainstormInput}". 
      请帮我进行结构化的头脑风暴，包含以下内容：
      1. 潜在的流派类型 (Genre) 和基调 (Tone)
      2. 3个可能的核心冲突 (Core Conflicts)
      3. 一个建议的吸引人的标题 (Title)
      4. 一个简短的“电梯游说”简介 (Premise/Elevator Pitch)
      请使用中文清晰地格式化输出。`;

            const result = await generateText(prompt, "你是一位畅销小说编辑和创意缪斯。", project.creativeSettings);
            setSuggestion(result);

            const titleMatch = result.match(/(?:Title|标题)[:：]\s*(.*)/i);
            if (titleMatch && titleMatch[1] && !project.title) {
                updateProject({ title: titleMatch[1].replace(/\*\*/g, '').trim() });
            }

        } catch (e) {
            setSuggestion("生成灵感时出错，请检查您的 API Key。");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveIdea = () => {
        if (!suggestion) return;
        const separator = project.premise ? "\n\n---\n\n" : "";
        const newPremise = `${project.premise}${separator}${suggestion}`;
        updateProject({ premise: newPremise });
        setSuggestion('');
        setBrainstormInput('');
    };



    const generateMarkdownContent = () => {
        const { title, genre, premise, creativeSettings, characters, worldSettings, plotOutline, drafts, chapters, timeline } = project;

        let md = `# ${title || '未命名项目'} — 创作设定集\n\n`;
        md += `> 📅 导出时间: ${new Date().toLocaleString()}  \n`;
        md += `> 🛠️ 创作工具: Muse 小说架构师\n\n`;

        // ── Overview ──
        md += `## 📜 基础信息\n\n`;
        md += `| 属性 | 内容 |\n|------|------|\n`;
        md += `| **类型流派** | ${genre || '未定义'} |\n`;
        md += `| **叙事基调** | ${creativeSettings.tone} |\n`;
        md += `| **文字风格** | ${creativeSettings.style} |\n`;
        md += `| **目标受众** | ${creativeSettings.targetAudience || '通用'} |\n`;
        md += `| **创意温度** | ${creativeSettings.creativity} |\n\n`;
        md += `### 核心梗概\n\n${premise || '*暂无*'}\n\n---\n\n`;

        // ── Characters ──
        md += `## 👥 人物志 (${characters.length} 位角色)\n\n`;
        if (characters.length === 0) md += `*暂无角色数据*\n\n`;
        characters.forEach(char => {
            md += `### ${char.name}\n\n`;
            md += `> **身份**: ${char.role} | **原型**: ${char.archetype || '未定义'}\n\n`;
            md += `${char.description}\n\n`;
            if (char.relationships) {
                md += `**🔗 关系与羁绊**:\n\n${char.relationships}\n\n`;
            }
            md += `---\n\n`;
        });

        // ── World Settings ──
        md += `## 🌍 世界观 (${worldSettings.length} 条设定)\n\n`;
        if (worldSettings.length === 0) md += `*暂无世界观设定*\n\n`;
        WORLD_CATEGORIES.forEach(cat => {
            const items = worldSettings.filter(w => w.category === cat);
            if (items.length > 0) {
                md += `### ${cat}\n\n`;
                items.forEach(item => {
                    md += `#### ${item.title}\n\n${item.content}\n\n`;
                });
            }
        });
        md += `---\n\n`;

        // ── Plot Outline ──
        md += `## 📈 剧情大纲\n\n`;
        md += plotOutline ? `${plotOutline}\n\n` : `*暂无剧情大纲*\n\n`;
        md += `---\n\n`;

        // ── Chapters (sorted by order) ──
        const sortedChapters = [...chapters].sort((a, b) => a.order - b.order);
        if (sortedChapters.length > 0) {
            md += `## 📖 正式章节 (${sortedChapters.length} 章)\n\n`;
            sortedChapters.forEach(ch => {
                md += `### 第${ch.order}章：${ch.title}\n\n`;
                md += `${ch.content}\n\n`;
                md += `---\n\n`;
            });
        }

        // ── Drafts ──
        if (drafts.length > 0) {
            md += `## 📝 草稿箱 (${drafts.length} 篇)\n\n`;
            drafts.forEach(d => {
                md += `### ${d.title}\n\n`;
                if (d.relatedPlotPoint) md += `> 关联情节点: ${d.relatedPlotPoint}\n\n`;
                md += `${d.content}\n\n---\n\n`;
            });
        }

        // ── Timeline ──
        if (timeline.length > 0) {
            md += `## 🕰️ 世界时间线 (${timeline.length} 个事件)\n\n`;
            const sortedTimeline = [...timeline].sort((a, b) => a.timestamp - b.timestamp);
            sortedTimeline.forEach(evt => {
                md += `- **[${evt.worldDate}]** ${evt.title} — ${evt.description}\n`;
            });
            md += `\n`;
        }

        return md;
    };

    const handleExportMarkdown = () => {
        const mdContent = generateMarkdownContent();
        const blob = new Blob([mdContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${project.title || 'novel_project'}_Bible.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("设定集已导出为 Markdown", 'success');
    };

    const handleCopyMarkdown = () => {
        const mdContent = generateMarkdownContent();
        navigator.clipboard.writeText(mdContent);
        showToast("Markdown 内容已复制到剪贴板", 'success');
    };

    // Triggered by button click
    const requestKickstart = () => {
        if (!project.premise) {
            showToast("请先在左侧填写核心梗概 (Premise)，或使用 AI 灵感火花生成一个。", 'error');
            return;
        }
        setShowConfirmModal(true);
    };

    // Actual execution Logic
    const executeKickstart = async () => {
        setShowConfirmModal(false);
        setIsKickstarting(true);
        const genre = project.genre || "通俗小说";

        try {
            // Step 1: Characters (Heavy batch)
            setKickstartStep(1);
            setKickstartStatus("第一步：正在招募 6 位核心演员 (Soul Forge)...");
            const newChars = await batchGenerateCharacters(project.premise, genre, project.creativeSettings);
            const formattedChars = newChars.map(c => ({ ...c, id: Date.now().toString() + Math.random(), archetype: 'Initial' }));
            const updatedChars = [...project.characters, ...formattedChars];
            updateProject({ characters: updatedChars });

            // Step 2: World (Parallel execution for each category)
            setKickstartStep(2);
            setKickstartStatus("第二步：正在全景构建世界舞台 (World Loom)...");

            // Fire off requests for all categories in parallel
            const worldPromises = WORLD_CATEGORIES.map(category =>
                batchGenerateWorldSettingsByCategory(project.premise, genre, category, project.creativeSettings)
            );

            const worldResults = await Promise.all(worldPromises);
            // Flatten the array of arrays
            const newWorlds = worldResults.flat();

            const formattedWorlds = newWorlds.map(w => ({ ...w, id: Date.now().toString() + Math.random() }));
            const updatedWorlds = [...project.worldSettings, ...formattedWorlds];
            updateProject({ worldSettings: updatedWorlds });

            // Step 3: Plot (using new heavy context)
            setKickstartStep(3);
            setKickstartStatus("第三步：正在基于庞大设定推演大纲 (Plot Weaver)...");
            const newPlot = await generatePlotFromContext(project.premise, genre, updatedChars, updatedWorlds, project.creativeSettings);
            const plotString = newPlot.map(p => `### ${p.title}\n\n${p.content}`).join('\n\n---\n\n');
            updateProject({ plotOutline: plotString });

            setKickstartStatus("宏大叙事构建完成！");
            setTimeout(() => {
                setIsKickstarting(false);
                setKickstartStep(0);
                setKickstartStatus('');
                showToast(`初始化成功！新增 ${formattedChars.length} 角色, ${formattedWorlds.length} 世界观设定。`, 'success');
            }, 1500);

        } catch (e) {
            console.error(e);
            setKickstartStatus("初始化过程中遇到错误，请检查网络或 API Key。");
            showToast("初始化失败，请重试。", 'error');
            setTimeout(() => {
                setIsKickstarting(false);
                setKickstartStep(0);
            }, 3000);
        }
    };

    // Quick stats
    const totalWords = (project.chapters || []).reduce((s, c) => s + c.content.length, 0)
        + (project.drafts || []).reduce((s, d) => s + d.content.length, 0);

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in relative">
            {/* ── Hero: Project Identity Card ── */}
            <div className="bg-gradient-to-br from-amber-900/20 via-slate-900 to-slate-900 rounded-2xl border border-amber-500/15 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                <div className="relative flex flex-col md:flex-row gap-6">
                    {/* Left: Title & Genre */}
                    <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-widest">
                            <Sparkles size={14} />
                            <span>创世纪 · 项目概览</span>
                        </div>
                        <input
                            type="text"
                            value={project.title}
                            onChange={(e) => updateProject({ title: e.target.value })}
                            className="w-full bg-transparent text-3xl font-serif font-bold text-white placeholder-slate-600 outline-none border-b border-transparent hover:border-slate-700 focus:border-amber-500/50 transition-colors pb-1"
                            placeholder="无题·杰作"
                        />
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">流派</span>
                                <input
                                    type="text"
                                    value={project.genre}
                                    onChange={(e) => updateProject({ genre: e.target.value })}
                                    className="bg-slate-800/60 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-amber-500/50 outline-none placeholder-slate-600 w-40"
                                    placeholder="赛博朋克"
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopyMarkdown}
                                    className="bg-slate-800/40 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 px-3 py-1 rounded-lg border border-slate-700/30 transition-colors flex items-center gap-1.5 text-[10px]"
                                >
                                    <Clipboard size={12} /> 复制设定集
                                </button>
                                <button
                                    onClick={handleExportMarkdown}
                                    className="bg-slate-800/40 hover:bg-slate-700/60 text-slate-400 hover:text-slate-200 px-3 py-1 rounded-lg border border-slate-700/30 transition-colors flex items-center gap-1.5 text-[10px]"
                                >
                                    <FileText size={12} /> 导出 .muse
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Two-column body ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: Core Settings (3/5) */}
                <div className="lg:col-span-3 space-y-5">
                    {/* Premise */}
                    <div className="bg-slate-800/40 rounded-xl border border-slate-700/60 p-5 space-y-3">
                        <label className="flex items-center gap-2 text-xs font-semibold text-amber-400/80 uppercase tracking-wider">
                            <BookOpen size={14} /> 核心梗概
                        </label>
                        <textarea
                            value={project.premise}
                            onChange={(e) => updateProject({ premise: e.target.value })}
                            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg p-4 text-white focus:ring-1 focus:ring-amber-500/40 outline-none placeholder-slate-600 resize-none font-serif leading-relaxed custom-scrollbar min-h-[140px] text-sm"
                            placeholder="你的故事是关于什么的？细节越丰富，AI 辅助效果越好。"
                        />
                    </div>

                    {/* Creative Compass */}
                    <div className="bg-slate-800/40 rounded-xl border border-slate-700/60 p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Sliders size={16} className="text-amber-400" />
                            <h3 className="font-semibold text-white text-sm">创作罗盘</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-medium text-slate-500 mb-3 uppercase tracking-wider">AI 创作模型 (Prompt Pack)</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleUpdateSettings('promptProfile', 'WEB_NOVEL')}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${project.creativeSettings.promptProfile === 'WEB_NOVEL' ? 'bg-amber-500/20 border-amber-500/50 text-amber-200' : 'bg-slate-900/60 border-slate-700/50 text-slate-500 hover:border-slate-600'}`}
                                    >
                                        <Zap size={18} className={project.creativeSettings.promptProfile === 'WEB_NOVEL' ? 'text-amber-400 mb-1' : 'text-slate-600 mb-1'} />
                                        <span className="text-sm font-bold">精品网文模式</span>
                                        <span className="text-[10px] opacity-60">爽感爆发 / 对话驱动 / 节奏极快</span>
                                    </button>
                                    <button
                                        onClick={() => handleUpdateSettings('promptProfile', 'LITERARY')}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${project.creativeSettings.promptProfile === 'LITERARY' ? 'bg-sky-500/20 border-sky-500/50 text-sky-200' : 'bg-slate-900/60 border-slate-700/50 text-slate-500 hover:border-slate-600'}`}
                                    >
                                        <BookOpen size={18} className={project.creativeSettings.promptProfile === 'LITERARY' ? 'text-sky-400 mb-1' : 'text-slate-600 mb-1'} />
                                        <span className="text-sm font-bold">传统文学模式</span>
                                        <span className="text-[10px] opacity-60">文笔细腻 / 环境描写 / 情感共鸣</span>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-slate-500 mb-2 uppercase tracking-wider">叙事基调</label>
                                <div className="grid grid-cols-3 gap-1.5">
                                    {['黑暗', '幽默', '史诗', '悬疑', '治愈', '平衡'].map(tone => (
                                        <button
                                            key={tone}
                                            onClick={() => handleUpdateSettings('tone', tone)}
                                            className={`text-xs py-1.5 rounded-lg border transition-all ${project.creativeSettings.tone === tone ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-900/60 text-slate-400 border-slate-700/50 hover:border-slate-600'}`}
                                        >
                                            {tone}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-slate-500 mb-2 uppercase tracking-wider">创意温度: {project.creativeSettings.creativity}</label>
                                <input
                                    type="range"
                                    min="0.1" max="1.0" step="0.1"
                                    value={project.creativeSettings.creativity}
                                    onChange={(e) => handleUpdateSettings('creativity', parseFloat(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                />
                                <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                                    <span>严谨保守</span>
                                    <span>天马行空</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-slate-500 mb-2 uppercase tracking-wider">文字风格</label>
                                <input
                                    type="text"
                                    value={project.creativeSettings.style}
                                    onChange={(e) => handleUpdateSettings('style', e.target.value)}
                                    className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-amber-500/40 outline-none placeholder-slate-600"
                                    placeholder="例如：华丽辞藻、极简主义..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-medium text-slate-500 mb-2 uppercase tracking-wider">目标受众</label>
                                <input
                                    type="text"
                                    value={project.creativeSettings.targetAudience}
                                    onChange={(e) => handleUpdateSettings('targetAudience', e.target.value)}
                                    className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg p-2 text-sm text-white focus:ring-1 focus:ring-amber-500/40 outline-none placeholder-slate-600"
                                    placeholder="例如：青少年、硬科幻迷..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Actions (2/5) */}
                <div className="lg:col-span-2 space-y-5">
                    {/* AI Brainstorm */}
                    <div className="bg-gradient-to-br from-amber-900/15 to-slate-900 rounded-xl border border-amber-500/20 p-5 flex flex-col min-h-[280px]">
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
                                    rows={3}
                                    placeholder="例如：一个能通过与鬼魂对话破案的侦探..."
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
                            <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar flex flex-col">
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

                    {/* Kickstart */}
                    <div className="bg-slate-800/40 rounded-xl border border-slate-700/60 p-5 relative overflow-hidden">
                        <div className="relative z-10">
                            {!isKickstarting ? (
                                <div className="text-center space-y-3">
                                    <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-indigo-500/20">
                                        <Rocket className="text-indigo-400" size={22} />
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-sm">一键创世纪</h3>
                                        <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] mx-auto">
                                            深度生成 6 位角色 + 10 条世界观 + 完整大纲
                                        </p>
                                    </div>
                                    <button
                                        onClick={requestKickstart}
                                        disabled={!project.premise}
                                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-5 py-2 rounded-xl font-medium text-sm transition-all shadow-lg shadow-indigo-900/30 flex items-center gap-2 mx-auto"
                                    >
                                        ✨ 启动
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-fade-in">
                                    {/* Step indicators */}
                                    <div className="flex items-center gap-2">
                                        {[
                                            { step: 1, label: '角色', icon: '👤' },
                                            { step: 2, label: '世界', icon: '🌍' },
                                            { step: 3, label: '大纲', icon: '📈' },
                                        ].map((s, idx) => (
                                            <React.Fragment key={s.step}>
                                                <div className={`flex-1 flex flex-col items-center gap-1 transition-all duration-500 ${kickstartStep >= s.step ? 'opacity-100' : 'opacity-30'}`}>
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all duration-500 ${kickstartStep > s.step ? 'bg-emerald-500/20 text-emerald-400' :
                                                        kickstartStep === s.step ? 'bg-indigo-500/20 text-indigo-400 animate-pulse' :
                                                            'bg-slate-800 text-slate-600'
                                                        }`}>
                                                        {kickstartStep > s.step ? <CheckCircle size={16} /> : s.icon}
                                                    </div>
                                                    <span className="text-[9px] text-slate-500">{s.label}</span>
                                                </div>
                                                {idx < 2 && (
                                                    <div className={`w-8 h-0.5 rounded-full transition-all duration-500 ${kickstartStep > s.step ? 'bg-emerald-500/40' : 'bg-slate-800'}`} />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-2 justify-center text-sm text-white">
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span className="text-xs">{kickstartStatus}</span>
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
                            <p className="font-medium text-slate-200">这将基于您的<strong className="text-muse-300">创作罗盘</strong>设置，进行深度初始化：</p>
                            <ul className="space-y-1 ml-1">
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-400 mt-0.5">•</span>
                                    <span>生成 <strong>6 位</strong> 核心角色 (主角/反派/导师/配角)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-400 mt-0.5">•</span>
                                    <span>逐项生成 <strong>5 大类</strong> 世界观设定 (每类 2-3 条)</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-indigo-400 mt-0.5">•</span>
                                    <span>基于以上庞大内容，推演<strong>完整剧情大纲</strong></span>
                                </li>
                            </ul>
                            <p className="text-xs text-amber-400/80 pt-2 border-t border-slate-700/50 mt-2 flex items-center gap-1">
                                <AlertCircle size={12} />
                                <span>全过程可能需要 1-2 分钟，请勿关闭页面。</span>
                            </p>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
                            >
                                取消
                            </button>
                            <button
                                onClick={executeKickstart}
                                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-900/50 text-sm flex items-center gap-2"
                            >
                                确认启动 <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 transition-all animate-fade-in font-medium text-sm flex items-center gap-2 border ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-200' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-200'}`}>
                    {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                    <span>{toast.msg}</span>
                </div>
            )}
        </div>
    );
};