import React, { useMemo } from 'react';
import { ProjectState } from '@/types';
import { BarChart3, BookOpen, Users, Globe, Clock, Trophy, TrendingUp, Target, Flame, Star } from 'lucide-react';

interface WritingStatsProps {
    project: ProjectState;
}

const MILESTONES = [
    { threshold: 1000, label: '新手村毕业', icon: '🌱', color: 'text-emerald-400' },
    { threshold: 5000, label: '初露锋芒', icon: '⚔️', color: 'text-blue-400' },
    { threshold: 10000, label: '笔耕不辍', icon: '📖', color: 'text-indigo-400' },
    { threshold: 20000, label: '中篇成型', icon: '📚', color: 'text-purple-400' },
    { threshold: 50000, label: '长篇巨制', icon: '🏰', color: 'text-amber-400' },
    { threshold: 100000, label: '传世之作', icon: '👑', color: 'text-yellow-300' },
    { threshold: 200000, label: '封神之路', icon: '🔥', color: 'text-red-400' },
];

export const WritingStats: React.FC<WritingStatsProps> = ({ project }) => {
    const stats = useMemo(() => {
        const chapters = project.chapters || [];
        const drafts = project.drafts || [];
        const characters = project.characters || [];
        const worldSettings = project.worldSettings || [];
        const echoes = project.echoes || [];
        const timeline = project.timeline || [];

        // Word counts
        const chapterWords = chapters.reduce((sum, ch) => sum + ch.content.length, 0);
        const draftWords = drafts.reduce((sum, d) => sum + d.content.length, 0);
        const totalWords = chapterWords + draftWords;

        // Chapter stats
        const avgChapterWords = chapters.length > 0 ? Math.round(chapterWords / chapters.length) : 0;
        const longestChapter = chapters.reduce((max, ch) => Math.max(max, ch.content.length), 0);

        // Activity - days since last modification
        const lastModified = project.lastModified || Date.now();
        const daysSinceUpdate = Math.floor((Date.now() - lastModified) / (1000 * 60 * 60 * 24));

        // Milestone progress
        const currentMilestone = MILESTONES.filter(m => totalWords >= m.threshold).pop();
        const nextMilestone = MILESTONES.find(m => totalWords < m.threshold);
        const progress = nextMilestone
            ? ((totalWords - (currentMilestone?.threshold || 0)) / (nextMilestone.threshold - (currentMilestone?.threshold || 0))) * 100
            : 100;

        return {
            totalWords,
            chapterWords,
            draftWords,
            chapterCount: chapters.length,
            draftCount: drafts.length,
            characterCount: characters.length,
            worldSettingCount: worldSettings.length,
            echoCount: echoes.length,
            timelineCount: timeline.length,
            avgChapterWords,
            longestChapter,
            daysSinceUpdate,
            currentMilestone,
            nextMilestone,
            progress,
        };
    }, [project]);

    const StatCard = ({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) => (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-start gap-3 hover:bg-slate-800/80 transition-colors">
            <div className={`p-2 rounded-lg bg-opacity-20 ${color.replace('text-', 'bg-')}`}>
                <Icon size={18} className={color} />
            </div>
            <div>
                <div className="text-xl font-bold text-white font-mono">{typeof value === 'number' ? value.toLocaleString() : value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{label}</div>
                {sub && <div className="text-[10px] text-slate-600 mt-1">{sub}</div>}
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Milestone Hero */}
            <div className="bg-gradient-to-r from-slate-900 via-muse-900/20 to-slate-900 border border-slate-700 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-muse-600/5 to-purple-600/5" />
                <div className="relative flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Trophy size={24} className="text-amber-400" />
                            <h3 className="font-bold text-white text-lg">
                                {stats.currentMilestone ? `${stats.currentMilestone.icon} ${stats.currentMilestone.label}` : '🌱 创作之旅开始'}
                            </h3>
                        </div>
                        <p className="text-sm text-slate-400">
                            总字数: <span className="text-white font-mono font-bold text-lg">{stats.totalWords.toLocaleString()}</span> 字
                        </p>
                    </div>
                    {stats.nextMilestone && (
                        <div className="text-right">
                            <div className="text-xs text-slate-500 mb-1">
                                下一里程碑: {stats.nextMilestone.icon} {stats.nextMilestone.label}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                                还需 {(stats.nextMilestone.threshold - stats.totalWords).toLocaleString()} 字
                            </div>
                        </div>
                    )}
                </div>
                {/* Progress Bar */}
                <div className="mt-4 relative">
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-muse-500 to-purple-500 rounded-full transition-all duration-1000 relative"
                            style={{ width: `${Math.min(100, stats.progress)}%` }}
                        >
                            <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
                        </div>
                    </div>
                    {/* Milestone markers */}
                    <div className="flex justify-between mt-2">
                        {MILESTONES.slice(0, 5).map(m => (
                            <div
                                key={m.threshold}
                                className={`text-center ${stats.totalWords >= m.threshold ? 'opacity-100' : 'opacity-30'}`}
                            >
                                <span className="text-sm">{m.icon}</span>
                                <div className="text-[9px] text-slate-500 mt-0.5">{(m.threshold / 1000)}k</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Stat Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={BookOpen} label="正文章节" value={stats.chapterCount} sub={`共 ${stats.chapterWords.toLocaleString()} 字`} color="text-emerald-400" />
                <StatCard icon={Target} label="草稿存档" value={stats.draftCount} sub={`共 ${stats.draftWords.toLocaleString()} 字`} color="text-blue-400" />
                <StatCard icon={Users} label="角色数量" value={stats.characterCount} color="text-purple-400" />
                <StatCard icon={Globe} label="世界设定" value={stats.worldSettingCount} color="text-cyan-400" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={TrendingUp} label="平均章节字数" value={stats.avgChapterWords} color="text-amber-400" />
                <StatCard icon={Flame} label="最长章节" value={stats.longestChapter.toLocaleString() + ' 字'} color="text-red-400" />
                <StatCard icon={Star} label="命运回响" value={stats.echoCount} sub="已捕获的状态变化" color="text-indigo-400" />
                <StatCard icon={Clock} label="最近更新" value={stats.daysSinceUpdate === 0 ? '今天' : `${stats.daysSinceUpdate} 天前`} color="text-slate-400" />
            </div>

            {/* Milestone History */}
            <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5">
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <BarChart3 size={16} className="text-muse-400" /> 里程碑成就
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {MILESTONES.map(m => {
                        const achieved = stats.totalWords >= m.threshold;
                        return (
                            <div
                                key={m.threshold}
                                className={`p-3 rounded-lg border text-center transition-all ${achieved
                                        ? 'bg-slate-800/80 border-slate-600 shadow-lg'
                                        : 'bg-slate-900/30 border-slate-800 opacity-40'
                                    }`}
                            >
                                <div className="text-2xl mb-1">{m.icon}</div>
                                <div className={`text-xs font-bold ${achieved ? m.color : 'text-slate-600'}`}>{m.label}</div>
                                <div className="text-[10px] text-slate-500 mt-1">{(m.threshold / 1000).toLocaleString()}k 字</div>
                                {achieved && <div className="text-[10px] text-emerald-500 mt-1">✓ 已达成</div>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
