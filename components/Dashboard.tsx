import React, { useState, useMemo, useEffect } from 'react';
import {
    Rocket, Sparkles, Wand2, BookOpen, AlertCircle, CheckCircle,
    X, Zap, Target, Download, Copy, Check, ArrowRight, GitBranch,
    Clock, Users, Globe, FileText, Lightbulb, TrendingUp
} from 'lucide-react';
import { ProjectState, WorldSetting, NarrativeInsight } from '@/types';
import { generateText, batchGenerateCharacters, batchGenerateWorldSettingsByCategory, generatePlotFromContext } from '@/services/geminiService';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { Loader } from '@/components/ui/Loader';
import {
    fetchGraph, fetchNarrativeInsights, fetchProjectStatistics,
    ProjectStatistics, GraphData
} from '@/services/apiService';
import { useToast } from '@/hooks/useToast';
import { useProjectStore } from '@/store';

interface DashboardProps {
    project: ProjectState;
    updateProject: (updates: Partial<ProjectState>) => void;
    onImportProject: () => void;
}

const WORLD_CATEGORIES: WorldSetting['category'][] = ['Geography', 'Magic/Tech', 'Society', 'History', 'Other'];

export const Dashboard: React.FC<DashboardProps> = ({ project: propProject, updateProject, onImportProject }) => {
    const { toast } = useToast();

    // 直接从 store 获取最新的 project 数据，确保统计数据实时更新
    const storeProject = useProjectStore(state => state.project);
    // 使用 store 中的最新数据用于显示，props 中的数据用于操作
    const project = storeProject;
    const [brainstormInput, setBrainstormInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [suggestion, setSuggestion] = useState('');
    const [isKickstarting, setIsKickstarting] = useState(false);
    const [kickstartStep, setKickstartStep] = useState(0);
    const [kickstartStatus, setKickstartStatus] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    // 图谱和统计数据状态
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [narrativeInsights, setNarrativeInsights] = useState<NarrativeInsight[]>([]);
    const [statistics, setStatistics] = useState<ProjectStatistics | null>(null);
    const [isLoadingStats, setIsLoadingStats] = useState(false);

    // 获取图谱数据和叙事洞察
    useEffect(() => {
        if (project.id) {
            setIsLoadingStats(true);

            // 并行获取统计数据、图谱数据和叙事洞察
            Promise.all([
                fetchProjectStatistics(project.id).catch(err => {
                    console.warn('Failed to fetch statistics:', err);
                    return null;
                }),
                fetchGraph(project.id).catch(err => {
                    console.warn('Failed to fetch graph:', err);
                    return null;
                }),
                fetchNarrativeInsights(project.id).catch(err => {
                    console.warn('Failed to fetch narrative insights:', err);
                    return [];
                })
            ]).then(([stats, graph, insights]) => {
                if (stats) setStatistics(stats);
                if (graph) setGraphData(graph);
                if (insights) setNarrativeInsights(insights);
            }).finally(() => {
                setIsLoadingStats(false);
            });
        }
    }, [project.id, project.lastModified]);

    // 使用真实的 lastModified 时间
    const lastSyncTime = useMemo(() => {
        const timestamp = statistics?.lastModified || project.lastModified;
        return timestamp ? new Date(timestamp).toLocaleTimeString() : '--:--:--';
    }, [statistics?.lastModified, project.lastModified]);

    // 使用统计数据或本地计算作为回退
    const displayStats = useMemo(() => {
        if (statistics) {
            return {
                totalWords: statistics.totalWords,
                chapterCount: statistics.chapterCount,
                characterCount: statistics.characterCount,
                worldSettingCount: statistics.worldSettingCount,
                plotNodeCount: statistics.plotNodeCount,
                echoCount: statistics.echoCount,
                pendingEchoCount: statistics.pendingEchoCount,
                relationshipCount: statistics.relationshipCount,
                timelineCount: statistics.timelineCount
            };
        }
        // 回退到本地计算
        const chapterWords = project.chapters.reduce((sum, ch) => sum + ch.content.length, 0);
        const draftWords = (project.drafts || []).reduce((sum, dr) => sum + dr.content.length, 0);
        return {
            totalWords: chapterWords + draftWords,
            chapterCount: project.chapters.length,
            characterCount: project.characters.length,
            worldSettingCount: project.worldSettings.length,
            plotNodeCount: project.plotNodes.length,
            echoCount: project.echoes.length,
            pendingEchoCount: project.echoes.filter(e => e.status === 'PENDING').length,
            relationshipCount: graphData?.edges?.length || 0,
            timelineCount: project.timeline?.length || 0
        };
    }, [statistics, project, graphData]);

    const handleBrainstorm = async () => {
        if (!brainstormInput.trim()) return;
        setIsGenerating(true);
        try {
        const prompt = `基于"${brainstormInput}"，为小说创作提供1个最精彩的创意灵感。

        请按照以下格式输出：
        【书名】（起一个吸引人的书名）
        【核心梗概】（100字左右的故事核心）
        【类型】（如：历史悬疑、科幻冒险、都市情感等）
        【详细创意】（包含核心创意概念、对角色/剧情/世界观的影响、具体实现建议）

        要求：
        1. 必须严格包含【书名】、【核心梗概】、【类型】、【详细创意】四个部分
        2. 每个标记后面直接跟内容，不要换行
        3. 内容要具体、有创意、可执行`;
            
            const result = await generateText(prompt, 'generateText');
            setSuggestion(result);
        } catch (error) {
            console.error('Brainstorm error:', error);
            setSuggestion('### 错误\n\n生成灵感时出错，请重试。');
        } finally {
            setIsGenerating(false);
        }
    };

        const handleSaveIdea = () => {
        if (!suggestion) return;
        
        // 解析AI生成的建议，提取关键信息
        const updates: Partial<ProjectState> = {};
        
        // 提取书名 - 支持多种格式
        const titleMatch = suggestion.match(/【书名】\s*[:：]?\s*([^\n]+)/i) || 
                          suggestion.match(/书名[:：]\s*([^\n]+)/i);
        if (titleMatch) {
            updates.title = titleMatch[1].trim().replace(/^[:：]\s*/, '');
        }
        
        // 提取核心梗概 - 支持多种格式
        const premiseMatch = suggestion.match(/【核心梗概】\s*[:：]?\s*([\s\S]+?)(?=\n【|$)/i) || 
                            suggestion.match(/核心梗概[:：]\s*([\s\S]+?)(?=\n【|$)/i);
        if (premiseMatch) {
            updates.premise = premiseMatch[1].trim().replace(/^[:：]\s*/, '');
        }
        
        // 提取类型 - 支持多种格式
        const genreMatch = suggestion.match(/【类型】\s*[:：]?\s*([^\n]+)/i) || 
                          suggestion.match(/类型[:：]\s*([^\n]+)/i);
        if (genreMatch) {
            updates.genre = genreMatch[1].trim().replace(/^[:：]\s*/, '');
        }
        
        // 同时将完整建议保存到worldSettings供参考
        updates.worldSettings = [...project.worldSettings, {
            id: Date.now().toString(),
            category: 'Other',
            title: `AI灵感记录: ${brainstormInput.substring(0, 30)}...`,
            content: suggestion
        }];
        
        // 应用所有更新
        updateProject(updates);
        
        // 显示结果
        const resultMsg = `更新完成！\n\n书名: ${updates.title || '未提取到'}\n核心梗概: ${updates.premise ? updates.premise.substring(0, 50) + '...' : '未提取到'}\n类型: ${updates.genre || '未提取到'}`;
        toast.success(resultMsg, 6000);

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
            // 1. 生成核心角色
            console.log('【创世纪】========== 开始生成角色 ==========');
            console.log('【创世纪】前提:', project.premise);
            console.log('【创世纪】类型:', project.genre);
            console.log('【创世纪】创意设置:', project.creativeSettings);
            
            const characters = await batchGenerateCharacters(project.premise, project.genre, project.creativeSettings);
            
            console.log('【创世纪】原始生成结果:', characters);
            console.log('【创世纪】结果类型:', typeof characters);
            console.log('【创世纪】结果是否为数组:', Array.isArray(characters));
            console.log('【创世纪】数组长度:', characters ? characters.length : 'N/A');
            
            if (!characters) {
                console.error('【创世纪】致命错误：batchGenerateCharacters返回null或undefined');
                throw new Error('角色生成失败：返回值为null或undefined');
            }
            
            if (!Array.isArray(characters)) {
                console.error('【创世纪】致命错误：batchGenerateCharacters返回的不是数组，类型:', typeof characters);
                throw new Error(`角色生成失败：返回类型为${typeof characters}，期望数组`);
            }
            
            if (characters.length === 0) {
                console.error('【创世纪】警告：batchGenerateCharacters返回空数组');
                toast.warning('未生成任何角色');
            }
            
            // 为生成的角色添加ID和所有必需字段
            console.log('【创世纪】为角色添加ID...');
            const charactersWithId = characters.map((char, index) => {
                console.log(`【创世纪】处理角色${index}:`, char);

                // 确保所有必需字段都存在
                if (!char.name) {
                    console.error(`【创世纪】警告：角色${index}缺少name字段`);
                    char.name = '未命名角色';
                }
                if (!char.role) {
                    console.warn(`【创世纪】警告：角色${index}缺少role字段`);
                    char.role = '未知';
                }
                if (!char.archetype) {
                    console.log(`【创世纪】角色${index} archetype为空，设置默认值`);
                    char.archetype = char.role || '';
                }

                // 修复: 如果没有description，从其他字段组合生成
                if (!char.description) {
                    const descParts: string[] = [];
                    if (char.desire) descParts.push(`【欲望】${char.desire}`);
                    if (char.fear) descParts.push(`【恐惧】${char.fear}`);
                    if (char.signature) descParts.push(`【特征】${char.signature}`);
                    if (char.contrast) descParts.push(`【反差】${char.contrast}`);
                    if (char.weakness) descParts.push(`【弱点】${char.weakness}`);

                    char.description = descParts.length > 0
                        ? descParts.join('\n')
                        : (char.contrast || char.signature || '暂无描述');
                    console.log(`【创世纪】角色${index} 自动生成description:`, char.description);
                }

                const charWithId = {
                    ...char,
                    id: `char_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`,
                    physicalStatus: '健康',
                    foreshadowingHooks: [],
                    lastModified: Date.now()
                };
                console.log(`【创世纪】角色${index}处理后:`, charWithId);
                return charWithId;
            });
            
            console.log('【创世纪】准备更新的角色数组:', charactersWithId);
            console.log('【创世纪】当前项目角色数:', project.characters.length);
            
            const newCharacters = [...project.characters, ...charactersWithId];
            console.log('【创世纪】更新后的总角色数:', newCharacters.length);
            
            updateProject({ characters: newCharacters });
            console.log('【创世纪】updateProject调用完成');
            
            setKickstartStep(2);
            setKickstartStatus('正在构建世界观设定...');

            // 2. 生成世界观设定
            console.log('【创世纪】========== 开始生成世界观设定 ==========');
            
            const worldPromises = WORLD_CATEGORIES.map(async (category) => {
                console.log(`【创世纪】开始生成分类: ${category}`);
                const settings = await batchGenerateWorldSettingsByCategory(
                    project.premise,
                    project.genre,
                    category,
                    3,
                    project.creativeSettings
                );
                console.log(`【创世纪】分类${category}原始结果:`, settings);
                return { settings, category };
            });
            
            const worldResults = await Promise.all(worldPromises);
            console.log('【创世纪】所有分类生成完成:', worldResults);
            
            const allWorldSettings = worldResults.flatMap(result => {
                console.log(`【创世纪】处理分类: ${result.category}`);
                if (!result.settings) {
                    console.error(`【创世纪】错误: ${result.category} 返回null或undefined`);
                    return [];
                }
                if (!Array.isArray(result.settings)) {
                    console.error(`【创世纪】错误: ${result.category} 返回的不是数组, 类型:`, typeof result.settings);
                    return [];
                }
                if (result.settings.length === 0) {
                    console.warn(`【创世纪】警告: ${result.category} 返回空数组`);
                }
                return result.settings.map(setting => {
                    console.log(`【创世纪】处理设定:`, setting);
                    return {
                        ...setting,
                        category: result.category as WorldSetting['category']
                    };
                });
            });
            
            console.log('【创世纪】所有设定合并后:', allWorldSettings);
            
            // 为生成的世界观设定添加唯一ID
            console.log('【创世纪】为世界观设定添加ID...');
            const worldSettingsWithId = allWorldSettings.map((setting, index) => {
                // 确保所有必需字段都存在
                if (!setting.title) {
                    console.error(`【创世纪】警告：设定${index}缺少title字段`);
                    setting.title = '未命名设定';
                }
                if (!setting.content) {
                    console.error(`【创世纪】警告：设定${index}缺少content字段`);
                    setting.content = '暂无内容';
                }
                
                const id = `world_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`;
                console.log(`【创世纪】设定${index} ID: ${id}`);
                return {
                    ...setting,
                    id,
                    lastModified: Date.now()
                };
            });
            
            console.log('【创世纪】最终世界观设定数组:', worldSettingsWithId);
            console.log('【创世纪】当前项目世界观数:', project.worldSettings.length);

            const newWorldSettings = [...project.worldSettings, ...worldSettingsWithId];
            console.log('【创世纪】更新后的总世界观数:', newWorldSettings.length);

            updateProject({ worldSettings: newWorldSettings });
            console.log('【创世纪】世界观设定updateProject调用完成');

            // 修复: 删除了重复的 updateProject 调用

            setKickstartStep(3);
            setKickstartStatus('正在生成剧情大纲...');

            // 修复: 使用最新状态生成剧情
            // 从 useProjectStore 获取最新状态，而非闭包中的旧 project
            const { useProjectStore } = await import('@/store');
            const latestProject = useProjectStore.getState().project;

            console.log('【创世纪】使用最新状态生成剧情');
            console.log('【创世纪】最新角色数:', latestProject.characters.length);
            console.log('【创世纪】最新世界观数:', latestProject.worldSettings.length);

            const plotNodes = await generatePlotFromContext(
                latestProject.premise,
                latestProject.genre,
                latestProject.characters,  // 使用最新的角色列表
                latestProject.worldSettings,  // 使用最新的世界观设定
                latestProject.creativeSettings
            );

            console.log('【创世纪】生成的剧情节点数:', plotNodes.length);
            updateProject({ plotNodes: [...latestProject.plotNodes, ...plotNodes] });

            setKickstartStatus('创世纪完成！');

            // 显示成功摘要
            const summary = `创世纪完成！\n\n✅ 生成角色: ${charactersWithId.length} 个\n✅ 生成世界观: ${worldSettingsWithId.length} 个\n✅ 生成剧情节点: ${plotNodes.length} 个`;
            console.log(summary);

            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error: any) {
            console.error('【创世纪】捕获到错误:', error);

            // 修复: 提供更详细的错误信息
            let errorMessage = '创世纪失败，请重试。';

            if (error?.message?.includes('角色')) {
                errorMessage = `角色生成失败: ${error.message}`;
            } else if (error?.message?.includes('世界观') || error?.message?.includes('设定')) {
                errorMessage = `世界观生成失败: ${error.message}`;
            } else if (error?.message?.includes('剧情')) {
                errorMessage = `剧情生成失败: ${error.message}`;
            } else if (error?.message) {
                errorMessage = `创世纪失败: ${error.message}`;
            }

            setKickstartStatus(errorMessage);
            toast.error(errorMessage, 6000);  // 向用户显示具体错误
            await new Promise(resolve => setTimeout(resolve, 3000));
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
                                        Last Sync: {lastSyncTime}
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
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">创作简略 (Brief)</div>
                            {isLoadingStats && (
                                <div className="w-3 h-3 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                                    <FileText size={10} /> 总字数
                                </div>
                                <div className="text-xl font-mono text-white tracking-tight">{displayStats.totalWords.toLocaleString()}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                                    <BookOpen size={10} /> 正式章节
                                </div>
                                <div className="text-xl font-mono text-white tracking-tight">{displayStats.chapterCount}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                                    <Users size={10} /> 核心角色
                                </div>
                                <div className="text-xl font-mono text-amber-400 tracking-tight">{displayStats.characterCount}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                                    <Globe size={10} /> 世界设定
                                </div>
                                <div className="text-xl font-mono text-sky-400 tracking-tight">{displayStats.worldSettingCount}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                                    <TrendingUp size={10} /> 剧情节点
                                </div>
                                <div className="text-xl font-mono text-purple-400 tracking-tight">{displayStats.plotNodeCount}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                                    <GitBranch size={10} /> 关系数
                                </div>
                                <div className="text-xl font-mono text-emerald-400 tracking-tight">{displayStats.relationshipCount}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                                    <Lightbulb size={10} /> Echo待处理
                                </div>
                                <div className="text-xl font-mono text-orange-400 tracking-tight">{displayStats.pendingEchoCount}/{displayStats.echoCount}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[10px] text-slate-500 uppercase flex items-center gap-1">
                                    <Clock size={10} /> Timeline事件
                                </div>
                                <div className="text-xl font-mono text-cyan-400 tracking-tight">{displayStats.timelineCount}</div>
                            </div>
                        </div>
                    </div>

                    {/* Narrative Insights */}
                    {narrativeInsights.length > 0 && (
                        <div className="bg-slate-800/20 rounded-xl border border-slate-700/40 p-4 space-y-3">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <Sparkles size={12} className="text-amber-400" /> 叙事洞察
                            </div>
                            <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                {narrativeInsights.slice(0, 3).map((insight, index) => (
                                    <div key={index} className="bg-slate-900/50 rounded-lg p-3 text-xs">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                insight.type === 'ALLIANCE_POTENTIAL' ? 'bg-emerald-500/20 text-emerald-400' :
                                                insight.type === 'CONFLICT_WARNING' ? 'bg-red-500/20 text-red-400' :
                                                insight.type === 'SECRET_CONNECTION' ? 'bg-purple-500/20 text-purple-400' :
                                                'bg-blue-500/20 text-blue-400'
                                            }`}>
                                                {insight.type === 'ALLIANCE_POTENTIAL' ? '联盟潜力' :
                                                 insight.type === 'CONFLICT_WARNING' ? '冲突预警' :
                                                 insight.type === 'SECRET_CONNECTION' ? '隐秘关联' : '派系变动'}
                                            </span>
                                        </div>
                                        <p className="text-slate-300 leading-relaxed">{insight.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

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
