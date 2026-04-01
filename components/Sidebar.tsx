import React, { useState } from 'react';
import { AppSection } from '../types';
import {
    Feather, Globe, Users, BookOpen, PenTool, Activity,
    GitBranch, BarChart3, Settings, Wand2, HelpCircle,
    ChevronLeft, ChevronRight, Sparkles, Home, LayoutGrid,
    FileCode // NEW: template editor icon
} from 'lucide-react';

interface SidebarProps {
    activeSection: AppSection;
    setActiveSection: (section: AppSection) => void;
    onOpenSettings: () => void;
    onOpenPromptTuner: () => void;
    onOpenGuide: () => void;
    hasCharEchoes?: boolean;
    hasWorldEchoes?: boolean;
}

interface NavItem {
    id: AppSection;
    label: string;
    shortLabel: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    activeGlow: string;
}

const NAV_ITEMS: NavItem[] = [
    {
        id: AppSection.DASHBOARD,
        label: '创世纪 Genesis',
        shortLabel: '创世',
        icon: Feather,
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/15',
        activeGlow: 'shadow-amber-500/20',
    },
    {
        // NEW: Extracted Creative Compass
        id: AppSection.CREATIVE_COMPASS,
        label: '创作罗盘 Compass',
        shortLabel: '罗盘',
        icon: Wand2, // Reusing wand for now, or use Compass if it existed.
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/15',
        activeGlow: 'shadow-orange-500/20',
    },
    {
        id: AppSection.WORLD,
        label: '万象织机 World',
        shortLabel: '世界',
        icon: Globe,
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/15',
        activeGlow: 'shadow-emerald-500/20',
    },
    {
        id: AppSection.CHARACTERS,
        label: '灵魂熔炉 Cast',
        shortLabel: '角色',
        icon: Users,
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/15',
        activeGlow: 'shadow-violet-500/20',
    },
    {
        id: AppSection.PLOT,
        label: '情节罗盘 Plot',
        shortLabel: '剧情',
        icon: BookOpen,
        color: 'text-sky-400',
        bgColor: 'bg-sky-500/15',
        activeGlow: 'shadow-sky-500/20',
    },
    {
        id: AppSection.OUTLINER,
        label: '章节规划 Outliner',
        shortLabel: '规划',
        icon: LayoutGrid,
        color: 'text-indigo-400',
        bgColor: 'bg-indigo-500/15',
        activeGlow: 'shadow-indigo-500/20',
    },
    {
        id: AppSection.DRAFTING,
        label: '自动工坊 Forge',
        shortLabel: '工坊',
        icon: PenTool,
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/15',
        activeGlow: 'shadow-rose-500/20',
    },
    {
        id: AppSection.ECHOES,
        label: '命运回响 Echoes',
        shortLabel: '回响',
        icon: Activity,
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/15',
        activeGlow: 'shadow-cyan-500/20',
    },
    {
        id: AppSection.GRAPH,
        label: '星图引擎 Graph',
        shortLabel: '星图',
        icon: GitBranch,
        color: 'text-indigo-400',
        bgColor: 'bg-indigo-500/15',
        activeGlow: 'shadow-indigo-500/20',
    },
    // NEW: 模板编辑器导航项
    {
        id: AppSection.TEMPLATE_EDITOR,
        label: '模板编辑器 Template',
        shortLabel: '模板',
        icon: FileCode,
        color: 'text-teal-400',
        bgColor: 'bg-teal-500/15',
        activeGlow: 'shadow-teal-500/20',
    }
];

interface ToolItem {
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    color: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
    activeSection,
    setActiveSection,
    onOpenSettings,
    onOpenPromptTuner,
    onOpenGuide,
    hasCharEchoes,
    hasWorldEchoes,
}) => {
    const [expanded, setExpanded] = useState(false);

    const tools: ToolItem[] = [
        { label: '全局设置', icon: Settings, onClick: onOpenSettings, color: 'text-slate-400' },
        { label: 'AI 调教台', icon: Wand2, onClick: onOpenPromptTuner, color: 'text-purple-400' },
        { label: '使用说明', icon: HelpCircle, onClick: onOpenGuide, color: 'text-slate-400' },
    ];

    const hasEcho = (id: AppSection) => {
        if (id === AppSection.CHARACTERS && hasCharEchoes) return true;
        if (id === AppSection.WORLD && hasWorldEchoes) return true;
        return false;
    };

    return (
        <aside
            className={`fixed left-0 top-0 bottom-0 z-50 flex flex-col bg-slate-950 border-r border-slate-800/80 transition-all duration-300 ease-in-out ${expanded ? 'w-52' : 'w-[68px]'
                }`}
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
        >
            {/* Logo */}
            <div className="h-14 flex items-center px-4 border-b border-slate-800/80 gap-3 shrink-0">
                <div className="w-9 h-9 bg-gradient-to-tr from-muse-600 to-muse-400 rounded-xl flex items-center justify-center shadow-lg shadow-muse-500/20 shrink-0">
                    <Sparkles className="text-white" size={18} />
                </div>
                <div
                    className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                        }`}
                >
                    <h1 className="font-serif font-bold text-sm text-white tracking-tight leading-tight">
                        Muse
                    </h1>
                    <span className="text-[10px] text-slate-500 font-mono">小说架构师</span>
                </div>
            </div>

            {/* Project Lobby Entry */}
            <div className="py-2 px-2 border-b border-slate-800/80">
                <button
                    onClick={() => setActiveSection(AppSection.LOBBY)}
                    className={`group relative w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${expanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
                        } ${activeSection === AppSection.LOBBY
                            ? 'bg-slate-800 text-white shadow-md'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    title={expanded ? undefined : '返回项目大厅'}
                >
                    <div className="p-1.5 rounded-lg">
                        <Home size={18} />
                    </div>
                    <span
                        className={`text-sm font-bold whitespace-nowrap transition-all duration-300 overflow-hidden ${expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                            }`}
                    >
                        项目大厅
                    </span>
                </button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto custom-scrollbar">
                {NAV_ITEMS.map((item) => {
                    const isActive = activeSection === item.id;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`group relative w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${expanded ? 'px-3 py-2.5' : 'px-0 py-2.5 justify-center'
                                } ${isActive
                                    ? `${item.bgColor} ${item.color} shadow-md ${item.activeGlow}`
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                                }`}
                            title={expanded ? undefined : item.label}
                        >
                            <div
                                className={`relative shrink-0 p-1.5 rounded-lg transition-colors ${isActive ? item.bgColor : 'group-hover:bg-slate-800'
                                    }`}
                            >
                                <Icon size={18} />
                                {/* Echo dot */}
                                {hasEcho(item.id) && (
                                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                                )}
                            </div>

                            <span
                                className={`text-sm font-medium whitespace-nowrap transition-all duration-300 overflow-hidden ${expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                                    }`}
                            >
                                {item.label}
                            </span>

                            {/* Active indicator bar */}
                            {isActive && (
                                <div
                                    className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full ${item.color.replace('text-', 'bg-')}`}
                                />
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Divider */}
            <div className="mx-3 border-t border-slate-800/80" />

            {/* Bottom Tools */}
            <div className="py-3 px-2 space-y-1 shrink-0">
                {tools.map((tool) => {
                    const Icon = tool.icon;
                    const isPromptTuner = tool.label === 'AI 调教台';
                    return (
                        <div key={tool.label} className="relative group/tool">
                            <button
                                onClick={tool.onClick}
                                className={`w-full flex items-center gap-3 rounded-xl transition-all duration-200 ${expanded ? 'px-3 py-2' : 'px-0 py-2 justify-center'
                                    } text-slate-500 hover:text-slate-300 hover:bg-slate-800/50`}
                                title={!expanded ? (isPromptTuner ? 'AI 调教台 (已迁移至创作罗盘)' : tool.label) : undefined}
                            >
                                <div className="relative shrink-0 p-1.5 rounded-lg group-hover/tool:bg-slate-800 transition-colors">
                                    <Icon size={16} className={tool.color} />
                                    {/* PromptTuner 收起状态时的小圆点提示 */}
                                    {isPromptTuner && !expanded && (
                                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 rounded-full animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                                    )}
                                </div>
                                <span
                                    className={`text-xs font-medium whitespace-nowrap transition-all duration-300 overflow-hidden ${expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0'
                                        }`}
                                >
                                    {tool.label}
                                </span>
                                {/* PromptTuner 迁移提示 Badge */}
                                {isPromptTuner && expanded && (
                                    <span className="ml-auto px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 rounded border border-amber-500/30 whitespace-nowrap">
                                        已迁移
                                    </span>
                                )}
                            </button>
                            {/* PromptTuner 展开状态时的悬停提示 */}
                            {isPromptTuner && expanded && (
                                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-slate-800 text-[11px] text-slate-300 rounded-lg shadow-xl opacity-0 group-hover/tool:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-slate-700">
                                    功能已迁移至「创作罗盘」，将在后续版本移除
                                    <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Collapse Toggle */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="h-10 flex items-center justify-center border-t border-slate-800/80 text-slate-600 hover:text-slate-400 hover:bg-slate-900 transition-colors shrink-0"
            >
                {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
        </aside>
    );
};
