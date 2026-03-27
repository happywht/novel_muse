import React, { useState } from 'react';
import { ProjectState, CreativeSettings } from '../types';
import { BookOpen, Sparkles, Sliders } from 'lucide-react';
import { GENRE_RULES } from '../config/genreRules';

interface StyleProfile {
    avgSentenceLength: number;
    sentenceLengthStdDev: number;
    avgParagraphLength: number;
    vocabularyDiversity: number;
    topPatterns: string[];
    rhetoricalFeatures: string[];
}

interface CreativeCompassViewProps {
    project: ProjectState;
    updateProject: (data: Partial<ProjectState>) => void;
}

export const CreativeCompassView: React.FC<CreativeCompassViewProps> = ({ project, updateProject }) => {
    const [styleProfile, setStyleProfile] = useState<StyleProfile | null>(null);

    const handleUpdateSettings = (key: keyof CreativeSettings, value: string | number | string[]) => {
        updateProject({
            creativeSettings: {
                ...project.creativeSettings,
                [key]: value
            }
        });
    };

    const toggleStyleTag = (tag: string) => {
        const currentTags = project.creativeSettings.styleTags || [];
        const newTags = currentTags.includes(tag)
            ? currentTags.filter(t => t !== tag)
            : [...currentTags, tag];
        handleUpdateSettings('styleTags', newTags);
    };

    const PREDEFINED_STYLES = project.creativeSettings.promptProfile === 'WEB_NOVEL'
        ? ['短句断句', '直接干脆', '对话密集', '侧重表情', '轻松吐槽', '杀伐果断']
        : ['词藻华丽', '极简白描', '电影镜头', '心理测写', '动作剥析', '留白艺术'];

    return (
        <div className="h-full flex flex-col bg-[#0f172a] animate-fade-in relative z-10 p-6 overflow-y-auto custom-scrollbar">
            <div className="mb-8">
                <h2 className="text-2xl font-serif font-bold text-white mb-2 flex items-center gap-3">
                    <Sparkles className="text-orange-400" />
                    创作罗盘 Creative Compass
                </h2>
                <p className="text-slate-400 text-sm max-w-2xl">
                    宏观把控作品基调，微观调校 AI 笔触与描写倾向。在此设定的罗盘指向将深刻影响整个宇宙的情节推演与文本生成。
                </p>
            </div>

            <div className="bg-slate-800/40 rounded-2xl border border-slate-700/60 p-6 shadow-xl backdrop-blur-sm max-w-7xl">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Sliders size={16} className="text-orange-400" />
                        全局笔触调校板
                    </h3>
                </div>

                <div className="space-y-8">
                    {/* Top Row: Macro, Tone, Temperature (3 columns) */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Macro Profile */}
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">
                                宏观预设画风 (Macro Profile)
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleUpdateSettings('promptProfile', 'WEB_NOVEL')}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${project.creativeSettings.promptProfile === 'WEB_NOVEL' ? 'bg-orange-500/20 border-orange-500/50 text-orange-200 shadow-lg shadow-orange-500/10' : 'bg-slate-900/60 border-slate-700/50 text-slate-500 hover:border-slate-600'}`}
                                >
                                    <Sparkles size={20} className={project.creativeSettings.promptProfile === 'WEB_NOVEL' ? 'text-orange-400 mb-2' : 'text-slate-600 mb-2'} />
                                    <span className="text-sm font-bold mb-1">精品网文模式</span>
                                    <span className="text-[10px] text-center opacity-70 leading-relaxed">节奏极快 / 强爽感<br />简单直接</span>
                                </button>
                                <button
                                    onClick={() => handleUpdateSettings('promptProfile', 'LITERARY')}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${project.creativeSettings.promptProfile === 'LITERARY' ? 'bg-sky-500/20 border-sky-500/50 text-sky-200 shadow-lg shadow-sky-500/10' : 'bg-slate-900/60 border-slate-700/50 text-slate-500 hover:border-slate-600'}`}
                                >
                                    <BookOpen size={20} className={project.creativeSettings.promptProfile === 'LITERARY' ? 'text-sky-400 mb-2' : 'text-slate-600 mb-2'} />
                                    <span className="text-sm font-bold mb-1">传统文学模式</span>
                                    <span className="text-[10px] text-center opacity-70 leading-relaxed">环境暗示 / 心理微操<br />留白艺术</span>
                                </button>
                            </div>
                        </div>

                        {/* Tone & Temperature */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">
                                    显性基调 (Tone)
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['黑暗', '史诗', '悬疑', '治愈', '幽默', '废土'].map(tone => (
                                        <button
                                            key={tone}
                                            onClick={() => handleUpdateSettings('tone', tone)}
                                            className={`text-sm py-2 rounded-lg border transition-all ${project.creativeSettings.tone === tone ? 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm shadow-orange-500/10' : 'bg-slate-900/60 text-slate-400 border-slate-700/50 hover:border-slate-600 hover:bg-slate-800'}`}
                                        >
                                            {tone}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        创意脱缰度 (Temp)
                                    </label>
                                    <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
                                        {project.creativeSettings.creativity.toFixed(1)}
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="0.1" max="1.0" step="0.1"
                                    value={project.creativeSettings.creativity}
                                    onChange={(e) => handleUpdateSettings('creativity', parseFloat(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500 mt-2"
                                />
                            </div>
                        </div>

                        {/* Style Tags & Target */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-3 uppercase tracking-wider">
                                    微观技法标签与受众
                                </label>
                                <div className="flex flex-wrap gap-2 mb-3 bg-slate-900/30 p-3 rounded-xl border border-slate-800/80">
                                    {PREDEFINED_STYLES.map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => toggleStyleTag(tag)}
                                            className={`text-xs px-2.5 py-1 rounded-md border transition-all ${(project.creativeSettings.styleTags || []).includes(tag)
                                                ? 'bg-orange-500/20 border-orange-500/50 text-orange-300 shadow-sm shadow-orange-500/10'
                                                : 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    value={project.creativeSettings.targetAudience}
                                    onChange={(e) => handleUpdateSettings('targetAudience', e.target.value)}
                                    className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg p-2.5 text-sm text-white focus:ring-1 focus:ring-orange-500/50 focus:border-orange-500/50 outline-none placeholder-slate-600 transition-all"
                                    placeholder="预想受众：硬科幻老饕..."
                                />
                                <div className="mt-3">
                                    <label className="block text-[10px] font-medium text-slate-500 mb-2 uppercase tracking-wider">
                                        题材规则 (Genre Rules)
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {Object.values(GENRE_RULES).map(rule => (
                                            <button
                                                key={rule.id}
                                                onClick={() => updateProject({ genre: rule.id === project.genre ? '' : rule.id })}
                                                className={`text-[10px] px-2 py-1 rounded-md border transition-all ${
                                                    project.genre === rule.id
                                                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-sm'
                                                        : 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-slate-300'
                                                }`}
                                            >
                                                {rule.name}
                                            </button>
                                        ))}
                                    </div>
                                    {project.genre && GENRE_RULES[project.genre] && (
                                        <div className="mt-2 text-[9px] text-cyan-400/60 bg-cyan-900/15 p-2 rounded border border-cyan-500/15">
                                            已激活：疲劳词{GENRE_RULES[project.genre].fatigueWords.length}个、禁忌{GENRE_RULES[project.genre].taboos.length}条、语言铁律{GENRE_RULES[project.genre].languageRules.length}条
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Few-Shot (Full width) */}
                    <div className="pt-4 border-t border-slate-700/40">
                        <div className="flex items-center justify-between mb-4">
                            <label className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                                <Sparkles size={14} />
                                Few-Shot 笔迹对齐范本 (优先级最高)
                            </label>
                            <span className="text-[11px] text-slate-500 font-medium italic">
                                AI 将极力模仿参考文本的句式长短、标点习惯与用词倾向
                            </span>
                        </div>
                        <textarea
                            value={project.creativeSettings.referenceText || ''}
                            onChange={(e) => handleUpdateSettings('referenceText', e.target.value)}
                            className="w-full min-h-[220px] bg-slate-900/80 border border-slate-700/50 rounded-2xl p-6 text-base text-amber-100/90 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 outline-none placeholder-slate-700 custom-scrollbar resize-none transition-all shadow-inner leading-relaxed font-serif"
                            placeholder="举例：&#13;&#10;“风滚草越过生锈的轨道。他没有拔枪，只是压了压帽檐。阳光很毒，毒得像酒馆里那个女人的眼神。除了风声，只有秒针走动的声音——滴答，滴答。”&#13;&#10;(AI 吸收后生成的正文，会自然带上这种极简硬汉风)"
                        />
                        {styleProfile && (
                            <div className="mt-4 bg-emerald-900/15 border border-emerald-500/25 rounded-xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold text-emerald-400">文风指纹报告</span>
                                    <button onClick={() => setStyleProfile(null)} className="text-[10px] text-emerald-500 hover:text-emerald-400">收起</button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                                    <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                                        <div className="text-lg font-bold text-emerald-300">{styleProfile.avgSentenceLength}</div>
                                        <div className="text-[9px] text-slate-500">平均句长</div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                                        <div className="text-lg font-bold text-emerald-300">{styleProfile.sentenceLengthStdDev}</div>
                                        <div className="text-[9px] text-slate-500">句长标准差</div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                                        <div className="text-lg font-bold text-emerald-300">{styleProfile.avgParagraphLength}</div>
                                        <div className="text-[9px] text-slate-500">平均段长</div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                                        <div className="text-lg font-bold text-emerald-300">{(styleProfile.vocabularyDiversity * 100).toFixed(1)}%</div>
                                        <div className="text-[9px] text-slate-500">词汇多样性</div>
                                    </div>
                                </div>
                                {styleProfile.topPatterns.length > 0 && (
                                    <div className="text-[10px] text-slate-400 mb-2">
                                        <span className="text-slate-500">高频句首：</span>
                                        {styleProfile.topPatterns.map((p, i) => <span key={i} className="ml-2 text-emerald-300/70 bg-emerald-900/20 px-1.5 py-0.5 rounded">{p}</span>)}
                                    </div>
                                )}
                                {styleProfile.rhetoricalFeatures.length > 0 && (
                                    <div className="text-[10px] text-slate-400">
                                        <span className="text-slate-500">修辞特征：</span>
                                        {styleProfile.rhetoricalFeatures.map((f, i) => <span key={i} className="ml-2 text-amber-300/70 bg-amber-900/20 px-1.5 py-0.5 rounded">{f}</span>)}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};