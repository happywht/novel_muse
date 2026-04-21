import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Brain, X, Zap, Sparkles, RefreshCw,
    Loader2, Users, Plus, Eye, MapPin, Gauge, FileText,
    PenTool, Trash2, AlertTriangle, Network, Sliders,
    ChevronLeft, ChevronRight, Search, ChevronDown, ChevronUp,
    Settings, Layers
} from 'lucide-react';
import { ProjectState, Character, WorldSetting, Draft, KnowledgeTriple, NarrativeInsight } from '@/types';
import { ContinuityBanner } from '@/components/modules/shared/panels/ContinuityBanner';

// ============================================
// Types
// ============================================

interface ForgeSidebarProps {
    project: ProjectState;
    actions: any;
}

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    onClear?: () => void;
}

interface SectionHeaderProps {
    icon: React.ReactNode;
    title: string;
    badge?: React.ReactNode;
    actions?: React.ReactNode;
    collapsible?: boolean;
    collapsed?: boolean;
    onToggle?: () => void;
}

interface TagButtonProps {
    tag: string;
    isSelected: boolean;
    onClick: () => void;
}

// ============================================
// Utility: Debounce Hook
// ============================================

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

// ============================================
// Sub-Components
// ============================================

const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder, onClear }) => (
    <div className="relative group">
        <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-muse-400 transition-colors duration-200"
        />
        <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-11 pr-10 py-3.5 bg-gradient-to-r from-slate-800/90 to-slate-900/90 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-muse-500/40 focus:border-muse-500/60 shadow-inner shadow-slate-900/50 outline-none transition-all duration-200 hover:border-slate-600"
        />
        {value && (
            <button
                onClick={onClear}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-lg p-1 transition-all duration-200"
            >
                <X size={14} />
            </button>
        )}
    </div>
);

const SectionHeader: React.FC<SectionHeaderProps> = ({
    icon,
    title,
    badge,
    actions,
    collapsible,
    collapsed,
    onToggle
}) => (
    <div
        className={`flex items-center justify-between ${
            collapsible
                ? 'cursor-pointer hover:bg-gradient-to-r hover:from-muse-500/10 hover:to-transparent -mx-4 px-5 py-2 rounded-xl transition-all duration-200'
                : ''
        }`}
        onClick={collapsible ? onToggle : undefined}
    >
        <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-muse-500/10 text-muse-300">
                {icon}
            </div>
            <h3 className="text-sm font-bold text-muse-200">{title}</h3>
            {badge}
        </div>
        <div className="flex items-center gap-2">
            {actions}
            {collapsible && (
                <span className="text-slate-400 hover:text-slate-200 transition-colors">
                    {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </span>
            )}
        </div>
    </div>
);

const TagButton: React.FC<TagButtonProps> = ({ tag, isSelected, onClick }) => (
    <button
        onClick={onClick}
        className={`text-[10px] px-3 py-1 rounded-lg border transition-all duration-200 ${
            isSelected
                ? 'bg-gradient-to-r from-amber-500/25 to-amber-500/15 border-amber-500/50 text-amber-200 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-muse-500/40 hover:bg-muse-500/10 hover:text-muse-200 hover:shadow-md'
        }`}
    >
        {tag}
    </button>
);

const CharacterChip: React.FC<{
    character: Character;
    isSelected: boolean;
    onToggle: () => void;
}> = ({ character, isSelected, onToggle }) => (
    <button
        onClick={onToggle}
        className={`px-4 py-2 rounded-full text-xs border transition-all duration-200 flex items-center gap-2 ${
            isSelected
                ? 'bg-gradient-to-r from-muse-500 to-muse-600 border-muse-400 text-white shadow-lg shadow-muse-500/30'
                : 'bg-slate-800/70 border-slate-700/50 text-slate-400 hover:border-muse-500/50 hover:bg-muse-500/10 hover:text-muse-200 hover:shadow-md'
        }`}
    >
        {isSelected && <Plus size={12} className="rotate-45" />}
        <span className="font-medium">{character.name}</span>
    </button>
);

const SettingChip: React.FC<{
    setting: WorldSetting;
    isSelected: boolean;
    onToggle: () => void;
}> = ({ setting, isSelected, onToggle }) => (
    <button
        onClick={onToggle}
        className={`px-4 py-2 rounded-full text-xs border transition-all duration-200 flex items-center gap-2 ${
            isSelected
                ? 'bg-gradient-to-r from-muse-500 to-muse-600 border-muse-400 text-white shadow-lg shadow-muse-500/30'
                : 'bg-slate-800/70 border-slate-700/50 text-slate-400 hover:border-muse-500/50 hover:bg-muse-500/10 hover:text-muse-200 hover:shadow-md'
        }`}
    >
        {isSelected && <Plus size={12} className="rotate-45" />}
        <span className="opacity-50 mr-1">[{setting.category}]</span>
        <span className="font-medium">{setting.title}</span>
    </button>
);

const PacingButton: React.FC<{
    label: string;
    value: string;
    currentValue: string;
    colorClass: string;
    onClick: () => void;
}> = ({ label, value, currentValue, colorClass, onClick }) => (
    <button
        onClick={onClick}
        className={`flex-1 py-2 text-[10px] font-medium rounded-lg flex flex-col items-center transition-all duration-200 ${
            value === currentValue
                ? colorClass
                : 'bg-slate-900/50 text-slate-500 hover:bg-slate-700/50'
        }`}
    >
        {label}
    </button>
);

const AlertPanel: React.FC<{
    type: 'error' | 'warning' | 'info';
    title: string;
    count?: number;
    onClear: () => void;
    children: React.ReactNode;
}> = ({ type, title, count, onClear, children }) => {
    const colorMap = {
        error: {
            bg: 'bg-red-900/20',
            border: 'border-red-500/50',
            text: 'text-red-400',
            contentBg: 'bg-red-900/30',
            contentBorder: 'border-red-500/20'
        },
        warning: {
            bg: 'bg-orange-900/20',
            border: 'border-orange-500/40',
            text: 'text-orange-400',
            contentBg: 'bg-orange-900/20',
            contentBorder: 'border-orange-500/20'
        },
        info: {
            bg: 'bg-cyan-900/15',
            border: 'border-cyan-500/30',
            text: 'text-cyan-400',
            contentBg: 'bg-cyan-900/15',
            contentBorder: 'border-cyan-500/15'
        }
    };

    const colors = colorMap[type];

    return (
        <div className={`${colors.bg} border ${colors.border} p-4 rounded-xl space-y-3 mb-4 animate-in slide-in-from-top-2 duration-300`}>
            <div className="flex items-center justify-between">
                <div className={`flex items-center gap-2 ${colors.text} font-bold text-sm`}>
                    <AlertTriangle size={16} />
                    {title} {count !== undefined && `(${count})`}
                </div>
                <button
                    onClick={onClear}
                    className={`text-[10px] ${colors.text} hover:opacity-80 underline`}
                >
                    清除
                </button>
            </div>
            {children}
        </div>
    );
};

const DraftCard: React.FC<{
    draft: Draft;
    isActive: boolean;
    onLoad: () => void;
    onDelete: (e: React.MouseEvent) => void;
}> = ({ draft, isActive, onLoad, onDelete }) => (
    <div
        onClick={onLoad}
        className={`p-5 rounded-2xl border cursor-pointer group flex justify-between items-start transition-all duration-200 ${
            isActive
                ? 'bg-gradient-to-br from-muse-500/20 to-muse-600/10 border-muse-500/50 shadow-xl shadow-muse-900/30'
                : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-700/40 hover:border-muse-500/30 hover:shadow-lg hover:-translate-y-0.5'
        }`}
    >
        <div className="flex-1 min-w-0">
            <h4 className={`text-sm font-bold truncate mb-1.5 ${
                isActive ? 'text-muse-200' : 'text-slate-200'
            }`}>
                {draft.title}
            </h4>
            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <FileText size={10} />
                {new Date(draft.lastModified).toLocaleDateString()}
            </p>
        </div>
        <button
            onClick={onDelete}
            className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200"
        >
            <Trash2 size={14} />
        </button>
    </div>
);

// ============================================
// Empty State Component
// ============================================

const EmptyState: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}> = ({ icon, title, description, action }) => (
    <div className="flex flex-col items-center justify-center py-6 px-4 text-center animate-in fade-in duration-300">
        <div className="w-12 h-12 rounded-xl bg-slate-800/50 flex items-center justify-center mb-3 text-slate-500">
            {icon}
        </div>
        <h4 className="text-sm font-medium text-slate-400 mb-1">{title}</h4>
        <p className="text-xs text-slate-500 max-w-[200px] leading-relaxed">{description}</p>
        {action && (
            <button
                onClick={action.onClick}
                className="mt-3 px-3 py-1.5 text-xs bg-muse-600/20 hover:bg-muse-600/30 text-muse-400 rounded-lg border border-muse-500/20 transition-all duration-200"
            >
                {action.label}
            </button>
        )}
    </div>
);

// ============================================
// Loading Skeleton Component
// ============================================

const LoadingSkeleton: React.FC<{
    lines?: number;
    className?: string;
}> = ({ lines = 3, className = '' }) => (
    <div className={`space-y-2 animate-pulse ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
            <div
                key={i}
                className={`h-4 bg-slate-700/50 rounded ${
                    i === 0 ? 'w-3/4' : i === 1 ? 'w-full' : 'w-2/3'
                }`}
            />
        ))}
    </div>
);

// ============================================
// Floating Tooltip Component
// ============================================

const FloatingTooltip: React.FC<{
    content: string;
    children: React.ReactNode;
}> = ({ content, children }) => (
    <div className="relative group/tooltip">
        {children}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-[10px] text-slate-300 rounded-md shadow-lg border border-slate-700/50 opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
            {content}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900" />
        </div>
    </div>
);

// ============================================
// Main Component
// ============================================

export const ForgeSidebar: React.FC<ForgeSidebarProps> = ({ project, actions }) => {
    const {
        narrativeInsights,
        setNarrativeInsights,
        plotBeat,
        setPlotBeat,
        handleFetchInsights,
        isFetchingInsights,
        useBackend,
        handleGenerateTwists,
        isGeneratingTwists,
        suggestedTwists,
        activeTwist,
        setActiveTwist,
        pendingForeshadowing,
        handleFetchForeshadowing,
        isFetchingForeshadowing,
        setPendingForeshadowing,
        selectedChars,
        toggleCharSelection,
        showAdvancedParams,
        setShowAdvancedParams,
        povCharId,
        setPovCharId,
        selectedSettingIds,
        toggleSettingSelection,
        pacing,
        setPacing,
        targetWordCount,
        setTargetWordCount,
        isFetchingFactions,
        handleFetchFactions,
        setShowFactionPanel,
        handleGenerate,
        isGenerating,
        activeDraftId,
        loadDraft,
        deleteDraft,
        logicConflicts,
        setLogicConflicts,
        useGraphContext,
        setUseGraphContext,
        isFetchingGraphContext,
        isSyncingToGraph,
    } = actions;

    // ============================================
    // State Management
    // ============================================

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [characterSearch, setCharacterSearch] = useState('');
    const [settingSearch, setSettingSearch] = useState('');
    const [isAnchorSectionCollapsed, setIsAnchorSectionCollapsed] = useState(false);

    // Debounced search values for performance
    const debouncedCharSearch = useDebounce(characterSearch, 150);
    const debouncedSettingSearch = useDebounce(settingSearch, 150);

    // ============================================
    // Computed Values
    // ============================================

    const filteredCharacters = useMemo(() => {
        const chars = project.characters || [];
        if (!debouncedCharSearch.trim()) {
            return chars.filter(char => selectedChars.includes(char.id));
        }
        const searchLower = debouncedCharSearch.toLowerCase();
        return chars.filter(
            char =>
                selectedChars.includes(char.id) ||
                char.name.toLowerCase().includes(searchLower)
        );
    }, [project.characters, debouncedCharSearch, selectedChars]);

    const filteredSettings = useMemo(() => {
        const settings = project.worldSettings || [];
        if (!debouncedSettingSearch.trim()) {
            return settings.filter(setting => selectedSettingIds?.includes(setting.id));
        }
        const searchLower = debouncedSettingSearch.toLowerCase();
        return settings.filter(
            setting =>
                selectedSettingIds?.includes(setting.id) ||
                setting.title.toLowerCase().includes(searchLower) ||
                setting.category?.toLowerCase().includes(searchLower)
        );
    }, [project.worldSettings, debouncedSettingSearch, selectedSettingIds]);

    // ============================================
    // Callbacks
    // ============================================

    const handleClearCharSearch = useCallback(() => setCharacterSearch(''), []);
    const handleClearSettingSearch = useCallback(() => setSettingSearch(''), []);

    // ============================================
    // Render
    // ============================================

    return (
        <div
            className={`relative flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pt-10 pb-10 transition-all duration-500 ease-out ${
                isSidebarCollapsed ? 'w-16' : 'w-1/3 min-w-[320px] max-w-[400px]'
            }`}
        >
            {/* Sidebar Collapse Toggle */}
            <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="absolute top-2 right-2 z-50 p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 transition-all duration-200 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600/50 group"
                title={isSidebarCollapsed ? '展开侧边栏' : '折叠侧边栏'}
            >
                <div className="relative">
                    {isSidebarCollapsed ? (
                        <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    ) : (
                        <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
                    )}
                </div>
            </button>

            {/* Collapsed State - Icon Only */}
            {isSidebarCollapsed && (
                <div className="flex flex-col items-center gap-3 mt-8 animate-in fade-in duration-300">
                    <FloatingTooltip content="AI 自动撰写场景草稿">
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating}
                            className={`p-4 rounded-xl shadow-lg transition-all duration-200 group ${
                                isGenerating
                                    ? 'bg-slate-700 shadow-none'
                                    : 'bg-gradient-to-r from-muse-600 to-indigo-600 hover:from-muse-500 hover:to-indigo-500 shadow-muse-900/50 hover:shadow-muse-800/60 hover:scale-105 active:scale-95'
                            } ${isGenerating ? 'opacity-60' : ''}`}
                        >
                            {isGenerating ? (
                                <div className="relative w-5 h-5">
                                    <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                                    <div className="absolute inset-0 animate-ping w-5 h-5 border border-white/20 rounded-full opacity-75" />
                                </div>
                            ) : (
                                <PenTool size={20} className="text-white group-hover:rotate-12 transition-transform duration-200" />
                            )}
                        </button>
                    </FloatingTooltip>
                    <div className="flex flex-col gap-2.5 py-2 border-t border-slate-700/50 mt-2">
                        <FloatingTooltip content="参数设置">
                            <div className="p-2 rounded-lg bg-slate-800/50 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                                <Settings size={14} />
                            </div>
                        </FloatingTooltip>
                        <FloatingTooltip content="角色选择">
                            <div className="p-2 rounded-lg bg-slate-800/50 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                                <Users size={14} />
                            </div>
                        </FloatingTooltip>
                        <FloatingTooltip content="草稿箱">
                            <div className="p-2 rounded-lg bg-slate-800/50 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer">
                                <Layers size={14} />
                            </div>
                        </FloatingTooltip>
                    </div>
                </div>
            )}

            {/* Expanded Content */}
            {!isSidebarCollapsed && (
                <div className="space-y-4 animate-in fade-in duration-300">
                    {/* Logic Conflict Alerts */}
                    {logicConflicts.length > 0 && (
                        <AlertPanel
                            type="error"
                            title="故事逻辑冲突"
                            count={logicConflicts.length}
                            onClear={() => setLogicConflicts([])}
                        >
                            <div className="space-y-2">
                                {logicConflicts.map((c, i) => (
                                    <div
                                        key={i}
                                        className="text-xs text-red-200/80 bg-red-900/30 p-2 rounded border border-red-500/20"
                                    >
                                        {c.description}
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={() => setLogicConflicts([])}
                                className="text-[10px] text-red-400 hover:text-red-300 underline mt-2"
                            >
                                忽略所有警告
                            </button>
                        </AlertPanel>
                    )}

                    {/* Post-write Validation Results */}
                    {actions.postWriteViolations && actions.postWriteViolations.length > 0 && (
                        <AlertPanel
                            type="warning"
                            title="写后质检"
                            count={actions.postWriteViolations.length}
                            onClear={() => actions.clearValidationResults?.()}
                        >
                            <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                {actions.postWriteViolations.map((v, i) => (
                                    <div
                                        key={i}
                                        className={`text-[10px] p-2 rounded border ${
                                            v.severity === 'error'
                                                ? 'bg-red-900/30 border-red-500/30 text-red-200'
                                                : 'bg-orange-900/20 border-orange-500/20 text-orange-200'
                                        }`}
                                    >
                                        <span className="font-bold">[{v.rule}]</span> {v.description}
                                        <div className="text-slate-400 mt-0.5">&rarr; {v.suggestion}</div>
                                    </div>
                                ))}
                            </div>
                        </AlertPanel>
                    )}

                    {/* AI-Tell Detection Result */}
                    {actions.aiTellResult && actions.aiTellResult.issues.length > 0 && (
                        <AlertPanel
                            type="info"
                            title={`AI痕迹检测 (风险 ${actions.aiTellResult.aiScore}/100)`}
                            onClear={() => actions.clearValidationResults?.()}
                        >
                            {actions.aiTellResult.aiScore >= 30 && (
                                <div className="text-[10px] text-cyan-300/70 bg-cyan-900/30 p-2 rounded border border-cyan-500/20 mb-2">
                                    提示：可使用「反AI润色」模式降低AI痕迹
                                </div>
                            )}
                            <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                                {actions.aiTellResult.issues.map((issue, i) => (
                                    <div
                                        key={i}
                                        className="text-[10px] p-2 rounded border bg-cyan-900/15 border-cyan-500/15 text-cyan-200"
                                    >
                                        <span className="font-bold">[{issue.category}]</span> {issue.description}
                                        <div className="text-slate-400 mt-0.5">&rarr; {issue.suggestion}</div>
                                    </div>
                                ))}
                            </div>
                        </AlertPanel>
                    )}

                    {/* Continuity Gap Warnings */}
                    <ContinuityBanner project={project} activeChapterId={actions.activeChapterId} />

                    {/* Narrative Insights Panel */}
                    {narrativeInsights.length > 0 && (
                        <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2 text-purple-300 text-xs font-bold">
                                    <Brain size={14} />
                                    <span>图谱叙事洞察 ({narrativeInsights.length})</span>
                                </div>
                                <button
                                    onClick={() => setNarrativeInsights([])}
                                    className="text-purple-500 hover:text-purple-400 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                {narrativeInsights.map((insight, idx) => (
                                    <div
                                        key={idx}
                                        className="bg-slate-900/50 p-2 rounded border border-purple-500/10 group hover:border-purple-500/30 transition-all cursor-pointer"
                                        onClick={() =>
                                            setPlotBeat(
                                                prev => prev + (prev ? '\n\n' : '') + `[洞察: ${insight.description}]`
                                            )
                                        }
                                    >
                                        <div className="flex justify-between items-start">
                                            <span
                                                className={`text-[9px] px-1.5 py-0.5 rounded ${
                                                    insight.type === 'CONFLICT_WARNING'
                                                        ? 'bg-red-500/20 text-red-400'
                                                        : insight.type === 'ALLIANCE_POTENTIAL'
                                                          ? 'bg-green-500/20 text-green-400'
                                                          : 'bg-blue-500/20 text-blue-400'
                                                }`}
                                            >
                                                {insight.type}
                                            </span>
                                            <span className="text-[9px] text-slate-500 uppercase">
                                                {insight.logic}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-300 mt-1.5 leading-relaxed">
                                            {insight.description}
                                        </p>
                                        <div className="flex flex-wrap gap-1 mt-1.5 font-mono text-[8px] text-slate-500">
                                            {insight.involvedEntities.map((e, i) => (
                                                <span key={i} className="bg-slate-800 px-1.5 py-0.5 rounded">
                                                    {e}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 1: Plot Beat Area */}
                    <section className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50 space-y-4">
                        <SectionHeader
                            icon={<Zap size={18} />}
                            title="1. 设定情节目标 (Plot Beat)"
                            actions={
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleFetchInsights}
                                        disabled={isFetchingInsights || !useBackend}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                                            isFetchingInsights
                                                ? 'bg-purple-900/50 text-purple-300'
                                                : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20'
                                        }`}
                                        title="图谱洞察: 基于目前世界观中的角色互动与情报，由AI推断潜在的矛盾或冲突爆发点"
                                    >
                                        {isFetchingInsights ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : (
                                            <Brain size={12} />
                                        )}
                                        <span>图谱洞察</span>
                                    </button>
                                    <button
                                        onClick={handleGenerateTwists}
                                        disabled={isGeneratingTwists || !useBackend || !plotBeat.trim()}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${
                                            isGeneratingTwists
                                                ? 'bg-indigo-900/50 text-indigo-300'
                                                : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
                                        } ${!plotBeat.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        title={
                                            !plotBeat.trim()
                                                ? '请先在下方输入前提情节目标，AI才可发散反转可能'
                                                : '灵感跳跃: 基于现有情节目标，由AI提供意外转折的演变建议'
                                        }
                                    >
                                        {isGeneratingTwists ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : (
                                            <Sparkles size={12} />
                                        )}
                                        <span>灵感跳跃</span>
                                    </button>
                                </div>
                            }
                        />

                        <textarea
                            value={plotBeat}
                            onChange={(e) => setPlotBeat(e.target.value)}
                            className="w-full bg-slate-900/80 border border-slate-700/50 rounded-lg p-3 text-white text-sm focus:ring-1 focus:ring-muse-500/50 focus:border-muse-500/50 outline-none resize-none h-24 transition-all placeholder:text-slate-600"
                            placeholder="例如：主角在废弃地铁站遭遇赏金猎人，双方发生激烈枪战，最终主角负伤逃脱..."
                        />

                        {/* Twist Suggestions */}
                        {suggestedTwists.length > 0 && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-2 text-indigo-400 text-[11px] font-bold">
                                    <Sparkles size={14} />
                                    <span>灵感反转建议</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {suggestedTwists.map((twist, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => setActiveTwist(activeTwist === twist ? '' : twist)}
                                            className={`text-[11px] p-2.5 rounded-lg border cursor-pointer transition-all duration-200 ${
                                                activeTwist === twist
                                                    ? 'bg-muse-700/50 border-muse-400 text-white shadow-lg shadow-muse-900/20'
                                                    : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:border-muse-600/50 hover:bg-slate-900/80'
                                            }`}
                                        >
                                            {twist}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Foreshadowing Display */}
                        {pendingForeshadowing.length > 0 && (
                            <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-xl p-3 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2 text-indigo-300 text-[11px] font-bold">
                                        <Sparkles size={14} className="text-indigo-400" />
                                        <span>契诃夫之枪: 待回收伏笔 ({pendingForeshadowing.length})</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleFetchForeshadowing}
                                            className="text-indigo-500 hover:text-indigo-400 transition-colors"
                                            title="刷新伏笔"
                                        >
                                            <RefreshCw size={12} className={isFetchingForeshadowing ? 'animate-spin' : ''} />
                                        </button>
                                        <button
                                            onClick={() => setPendingForeshadowing([])}
                                            className="text-indigo-500 hover:text-indigo-400 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                                    {pendingForeshadowing.map((hook, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-slate-900/50 p-2 rounded border border-indigo-500/10 group hover:border-indigo-500/30 transition-all cursor-pointer"
                                            onClick={() =>
                                                setPlotBeat(
                                                    prev =>
                                                        prev +
                                                        (prev ? '\n\n' : '') +
                                                        `[填坑: ${hook.subject} ${hook.relation} ${hook.object}]`
                                                )
                                            }
                                        >
                                            <span className="text-[10px] text-indigo-200">
                                                <span className="text-indigo-500 font-medium">HOOK:</span>{' '}
                                                {hook.subject} {hook.relation} {hook.object}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[9px] text-slate-500 mt-2 italic text-center">
                                    点击伏笔卡片将其快捷加入情节目标
                                </p>
                            </div>
                        )}
                    </section>

                    {/* Step 2: Cast Selection */}
                    <section className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                        <SectionHeader
                            icon={<Users size={18} />}
                            title="2. 选择登场角色 (Cast)"
                            badge={
                                selectedChars.length > 0 && (
                                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-muse-600/30 text-muse-300 rounded">
                                        {selectedChars.length}
                                    </span>
                                )
                            }
                        />

                        <div className="mt-3 space-y-3">
                            <SearchInput
                                value={characterSearch}
                                onChange={setCharacterSearch}
                                placeholder="搜索角色名称..."
                                onClear={handleClearCharSearch}
                            />

                            <div className="flex flex-wrap gap-2">
                                {(project.characters || []).length === 0 ? (
                                    <EmptyState
                                        icon={<Users size={20} />}
                                        title="暂无角色"
                                        description="请先前往灵魂熔炉创建角色"
                                    />
                                ) : filteredCharacters.length === 0 && characterSearch ? (
                                    <div className="w-full py-4 text-center">
                                        <Search size={16} className="mx-auto text-slate-600 mb-2" />
                                        <p className="text-xs text-slate-500">未找到匹配 "{characterSearch}" 的角色</p>
                                    </div>
                                ) : (
                                    filteredCharacters.map(char => (
                                        <CharacterChip
                                            key={char.id}
                                            character={char}
                                            isSelected={selectedChars.includes(char.id)}
                                            onToggle={() => toggleCharSelection(char.id)}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Parameters Panel */}
                    <section className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
                        <div className="border-b border-slate-700/50 bg-slate-800/30 px-5 py-3">
                            <div className="flex items-center gap-2 text-white font-medium text-xs">
                                <Sliders size={14} />
                                参数
                            </div>
                        </div>

                        <div className="p-5 space-y-5">
                            {/* POV Mode */}
                            {selectedChars.length > 0 && (
                                <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 p-4 rounded-xl border border-indigo-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Eye size={14} className="text-indigo-400" />
                                        <h3 className="text-xs text-indigo-300 font-bold">限制性视角锁定 (POV)</h3>
                                    </div>
                                    <select
                                        value={povCharId}
                                        onChange={(e) => setPovCharId(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg p-2.5 text-slate-300 text-xs focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all cursor-pointer"
                                    >
                                        <option value="">-- 全知上帝视角 --</option>
                                        {(project.characters || [])
                                            .filter(c => selectedChars.includes(c.id))
                                            .map(char => (
                                                <option key={char.id} value={char.id}>
                                                    {char.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            )}

                            {/* Location Selection */}
                            <div className="space-y-3">
                                <button
                                    onClick={() => setIsAnchorSectionCollapsed(!isAnchorSectionCollapsed)}
                                    className="w-full flex items-center justify-between text-xs text-slate-400 font-bold hover:text-slate-300 transition-colors py-1"
                                >
                                    <div className="flex items-center gap-2">
                                        <MapPin size={14} />
                                        强制锚定场景/设定
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {selectedSettingIds && selectedSettingIds.length > 0 && (
                                            <span className="text-[10px] px-1.5 py-0.5 bg-muse-600/30 text-muse-300 rounded">
                                                {selectedSettingIds.length}
                                            </span>
                                        )}
                                        {isAnchorSectionCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                                    </div>
                                </button>

                                {!isAnchorSectionCollapsed && (
                                    <div className="space-y-3 animate-in fade-in duration-200">
                                        <SearchInput
                                            value={settingSearch}
                                            onChange={setSettingSearch}
                                            placeholder="搜索场景/设定..."
                                            onClear={handleClearSettingSearch}
                                        />

                                        <div className="flex flex-wrap gap-2">
                                            {(project.worldSettings || []).length === 0 ? (
                                                <EmptyState
                                                    icon={<MapPin size={20} />}
                                                    title="暂无世界设定"
                                                    description="请先前往灵魂熔炉创建世界设定"
                                                />
                                            ) : filteredSettings.length === 0 && settingSearch ? (
                                                <div className="w-full py-4 text-center">
                                                    <Search size={16} className="mx-auto text-slate-600 mb-2" />
                                                    <p className="text-xs text-slate-500">未找到匹配 "{settingSearch}" 的设定</p>
                                                </div>
                                            ) : (
                                                filteredSettings.map(setting => (
                                                    <SettingChip
                                                        key={setting.id}
                                                        setting={setting}
                                                        isSelected={selectedSettingIds?.includes(setting.id) || false}
                                                        onToggle={() => toggleSettingSelection(setting.id)}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Pacing Control */}
                            <div className="space-y-3 pt-3 border-t border-slate-700/50">
                                <h3 className="text-xs text-slate-400 font-bold flex items-center gap-2">
                                    <Gauge size={14} />
                                    叙事节奏控制 (Pacing)
                                </h3>
                                <div className="flex gap-2">
                                    <PacingButton
                                        label="铺垫蓄力"
                                        value="SLOW_BURN"
                                        currentValue={pacing}
                                        colorClass="bg-emerald-900/50 text-emerald-300 border border-emerald-500/30"
                                        onClick={() => setPacing('SLOW_BURN')}
                                    />
                                    <PacingButton
                                        label="平衡推进"
                                        value="BALANCED"
                                        currentValue={pacing}
                                        colorClass="bg-muse-900/50 text-muse-300 border border-muse-500/30"
                                        onClick={() => setPacing('BALANCED')}
                                    />
                                    <PacingButton
                                        label="高潮爆发"
                                        value="CLIMAX"
                                        currentValue={pacing}
                                        colorClass="bg-rose-900/50 text-rose-300 border border-rose-500/30"
                                        onClick={() => setPacing('CLIMAX')}
                                    />
                                </div>
                            </div>

                            {/* Word Count Slider */}
                            <div className="space-y-3 pt-3 border-t border-slate-700/50">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-slate-400 font-bold flex items-center gap-2">
                                        <FileText size={14} />
                                        目标体量
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 bg-slate-900/80 rounded font-mono text-muse-400 border border-slate-700/50">
                                        {targetWordCount} 字
                                    </span>
                                </div>
                                <input
                                    type="range"
                                    min="1000"
                                    max="5000"
                                    step="500"
                                    value={targetWordCount}
                                    onChange={(e) => setTargetWordCount(parseInt(e.target.value))}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-muse-500"
                                />
                                <div className="flex justify-between text-[9px] text-slate-600">
                                    <span>1000</span>
                                    <span>3000</span>
                                    <span>5000</span>
                                </div>
                            </div>

                            {/* Local Scene Palette */}
                            <div className="space-y-3 pt-3 border-t border-slate-700/50">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-bold flex items-center gap-2 text-amber-300/80">
                                        <Sparkles size={14} className="text-amber-400" />
                                        场景专属调色盘
                                    </h3>
                                    <span className="text-[9px] px-1.5 py-0.5 border border-amber-500/20 bg-amber-500/10 rounded text-amber-400">
                                        临时覆盖
                                    </span>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-medium text-slate-500 mb-2 uppercase tracking-wider">
                                        临时特写技法
                                    </label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {['战斗高燃', '极快节奏', '细腻心理', '恐怖氛围', '动作切片', '插科打诨'].map(
                                            tag => (
                                                <TagButton
                                                    key={tag}
                                                    tag={tag}
                                                    isSelected={actions.localStyleTags?.includes(tag) || false}
                                                    onClick={() =>
                                                        actions.setLocalStyleTags((prev: string[]) =>
                                                            prev.includes(tag)
                                                                ? prev.filter(t => t !== tag)
                                                                : [...prev, tag]
                                                        )
                                                    }
                                                />
                                            )
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[9px] font-medium text-slate-500 mb-2 uppercase tracking-wider">
                                        场景范文注入 (Few-Shot)
                                    </label>
                                    <textarea
                                        value={actions.localReferenceText}
                                        onChange={(e) => actions.setLocalReferenceText(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700/50 rounded-lg p-3 text-amber-100/80 text-[10px] focus:ring-1 focus:ring-amber-500/50 outline-none custom-scrollbar resize-none min-h-[60px] transition-all placeholder:text-slate-600"
                                        placeholder="输入一段经典的场景描写，AI 将在本次生成中全力模仿它的句式、节奏和情绪..."
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Faction Dynamics Button */}
                    {useBackend && (
                        <button
                            onClick={() => {
                                handleFetchFactions();
                                setShowFactionPanel(true);
                            }}
                            disabled={isFetchingFactions}
                            className="w-full bg-indigo-900/30 hover:bg-indigo-800/40 text-indigo-300 py-3 rounded-xl font-bold border border-indigo-500/20 flex items-center justify-center gap-2 transition-all duration-200 text-sm disabled:opacity-50"
                        >
                            {isFetchingFactions ? (
                                <RefreshCw size={14} className="animate-spin" />
                            ) : (
                                <Users size={14} />
                            )}
                            势力版图
                        </button>
                    )}

                    {/* Graph Context Toggle */}
                    {useBackend && (
                        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Zap
                                        size={16}
                                        className={useGraphContext ? 'text-purple-400' : 'text-slate-500'}
                                    />
                                    <span className="text-xs text-slate-300 font-medium">图谱上下文增强</span>
                                </div>
                                <button
                                    onClick={() => setUseGraphContext(!useGraphContext)}
                                    className={`relative w-11 h-5 rounded-full transition-colors duration-200 ${
                                        useGraphContext ? 'bg-purple-600' : 'bg-slate-700'
                                    }`}
                                >
                                    <div
                                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                                            useGraphContext ? 'translate-x-5.5' : 'translate-x-0.5'
                                        }`}
                                    />
                                </button>
                            </div>
                            {useGraphContext && (
                                <div className="mt-3 pt-3 border-t border-slate-700/50">
                                    <p className="text-[10px] text-slate-400 leading-relaxed">启用后，AI将在生成时自动获取：</p>
                                    <ul className="text-[10px] text-slate-500 mt-1.5 space-y-1">
                                        <li className="flex items-center gap-1.5">
                                            <span className="w-1 h-1 bg-purple-500 rounded-full" />
                                            角色的物理状态和当前位置
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <span className="w-1 h-1 bg-purple-500 rounded-full" />
                                            角色之间的关系走向
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <span className="w-1 h-1 bg-purple-500 rounded-full" />
                                            未回收的伏笔线索
                                        </li>
                                        <li className="flex items-center gap-1.5">
                                            <span className="w-1 h-1 bg-purple-500 rounded-full" />
                                            情节节点的上下文
                                        </li>
                                    </ul>
                                </div>
                            )}
                            {(isFetchingGraphContext || isSyncingToGraph) && (
                                <div className="mt-2 flex items-center gap-2 text-[10px] text-purple-400">
                                    <Loader2 size={10} className="animate-spin" />
                                    <span>
                                        {isFetchingGraphContext ? '正在获取图谱上下文...' : '正在同步到知识图谱...'}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className={`relative w-full overflow-hidden py-4 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 group ${
                            isGenerating
                                ? 'bg-slate-700 shadow-none'
                                : 'bg-gradient-to-r from-muse-600 to-indigo-600 hover:from-muse-500 hover:to-indigo-500 shadow-muse-900/50 hover:shadow-muse-800/60'
                        }`}
                    >
                        {/* Shimmer effect when idle */}
                        {!isGenerating && (
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        )}

                        {/* Pulse animation background */}
                        {!isGenerating && (
                            <div className="absolute inset-0 bg-gradient-to-r from-muse-400/0 via-muse-400/20 to-muse-400/0 animate-pulse" />
                        )}

                        <span className="relative z-10 flex items-center gap-2 text-white">
                            {isGenerating ? (
                                <>
                                    <div className="relative">
                                        <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                                        <div className="absolute inset-0 animate-ping w-5 h-5 border border-white/20 rounded-full opacity-75" />
                                    </div>
                                    <span>AI 正在创作中...</span>
                                </>
                            ) : (
                                <>
                                    <PenTool size={18} className="group-hover:rotate-12 transition-transform duration-200" />
                                    <span>AI 自动撰写场景草稿</span>
                                </>
                            )}
                        </span>
                    </button>

                    {/* Draft History */}
                    <div className="text-left">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Layers size={12} />
                            草稿箱 (Drafts)
                            {(project.drafts || []).length > 0 && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-slate-700/50 text-slate-400 rounded-full">
                                    {project.drafts.length}
                                </span>
                            )}
                        </h3>
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                            {(project.drafts || []).length === 0 ? (
                                <div className="py-4">
                                    <EmptyState
                                        icon={<FileText size={20} />}
                                        title="草稿箱为空"
                                        description="点击上方「AI 自动撰写」按钮开始创作"
                                    />
                                </div>
                            ) : (
                                (project.drafts || []).map((draft, index) => (
                                    <div
                                        key={draft.id}
                                        className="animate-in fade-in slide-in-from-left-2 duration-300"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <DraftCard
                                            draft={draft}
                                            isActive={activeDraftId === draft.id}
                                            onLoad={() => loadDraft(draft)}
                                            onDelete={(e) => deleteDraft(e, draft.id)}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
