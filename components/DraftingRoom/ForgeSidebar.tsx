import React, { useState } from 'react';
import {
    Brain, X, Zap, Sparkles, RefreshCw,
    Loader2, Users, Plus, Eye, MapPin, Gauge, FileText,
    PenTool, Trash2, AlertTriangle, Network, Sliders
} from 'lucide-react';
import { ProjectState, Character, WorldSetting, Draft, KnowledgeTriple, NarrativeInsight, AppSection } from '../../types';
import { ContinuityBanner } from '../panels/ContinuityBanner';
import { PromptPanel } from '../PromptPanel';

interface ForgeSidebarProps {
    project: ProjectState;
    actions: any; // Using any for now to simplify, but ideally it should be ReturnType<typeof useDraftingActions>
}

export const ForgeSidebar: React.FC<ForgeSidebarProps> = ({
    project,
    actions
}) => {
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

    // Tab state for Params/Reference/Prompt tabs
    const [activeTab, setActiveTab] = useState<'params' | 'reference' | 'prompt'>('params');

    return (
        <div className="w-1/3 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pt-10 pb-10">
            {/* Logic Conflict Alerts */}
            {logicConflicts.length > 0 && (
                <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-xl space-y-3 animate-pulse mb-4">
                    <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                        <AlertTriangle size={18} />
                        发现故事逻辑冲突
                    </div>
                    <div className="space-y-2">
                        {logicConflicts.map((c, i) => (
                            <div key={i} className="text-xs text-red-200/80 bg-red-900/30 p-2 rounded border border-red-500/20">
                                {c.description}
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => setLogicConflicts([])}
                        className="text-[10px] text-red-400 hover:text-red-300 underline"
                    >
                        忽略所有警告
                    </button>
                </div>
            )}

            {/* Post-write Validation Results (from InkOS) */}
            {actions.postWriteViolations && actions.postWriteViolations.length > 0 && (
                <div className="bg-orange-900/20 border border-orange-500/40 p-4 rounded-xl space-y-2 mb-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-orange-400 font-bold text-sm">
                            <AlertTriangle size={16} />
                            写后质检 ({actions.postWriteViolations.length} 项)
                        </div>
                        <button onClick={() => actions.clearValidationResults?.()} className="text-[10px] text-orange-400 hover:text-orange-300 underline">清除</button>
                    </div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                        {actions.postWriteViolations.map((v, i) => (
                            <div key={i} className={`text-[10px] p-2 rounded border ${v.severity === 'error' ? 'bg-red-900/30 border-red-500/30 text-red-200' : 'bg-orange-900/20 border-orange-500/20 text-orange-200'}`}>
                                <span className="font-bold">[{v.rule}]</span> {v.description}
                                <div className="text-slate-400 mt-0.5">→ {v.suggestion}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI-Tell Detection Result */}
            {actions.aiTellResult && actions.aiTellResult.issues.length > 0 && (
                <div className="bg-cyan-900/15 border border-cyan-500/30 p-4 rounded-xl space-y-2 mb-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                            <Network size={16} />
                            AI痕迹检测 (风险 {actions.aiTellResult.aiScore}/100)
                        </div>
                        <button onClick={() => actions.clearValidationResults?.()} className="text-[10px] text-cyan-400 hover:text-cyan-300 underline">清除</button>
                    </div>
                    {actions.aiTellResult.aiScore >= 30 && (
                        <div className="text-[10px] text-cyan-300/70 bg-cyan-900/30 p-1.5 rounded border border-cyan-500/20">
                            💡 提示：可使用「反AI润色」模式降低AI痕迹
                        </div>
                    )}
                    <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                        {actions.aiTellResult.issues.map((issue, i) => (
                            <div key={i} className="text-[10px] p-2 rounded border bg-cyan-900/15 border-cyan-500/15 text-cyan-200">
                                <span className="font-bold">[{issue.category}]</span> {issue.description}
                                <div className="text-slate-400 mt-0.5">→ {issue.suggestion}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}


            {/* Continuity Gap Warnings */}
            <div className="mb-4">
                <ContinuityBanner project={project} activeChapterId={actions.activeChapterId} />
            </div>

            {/* Narrative Insights Panel (Phase 4 Display) */}
            {narrativeInsights.length > 0 && (
                <div className="bg-purple-900/20 border border-purple-500/20 rounded-xl p-3 mb-4 animate-in slide-in-from-top-2 duration-300">
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2 text-purple-300 text-[11px] font-bold">
                            <Brain size={14} />
                            <span>图谱叙事洞察 ({narrativeInsights.length} 条)</span>
                        </div>
                        <button onClick={() => setNarrativeInsights([])} className="text-purple-500 hover:text-purple-400">
                            <X size={12} />
                        </button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                        {narrativeInsights.map((insight, idx) => (
                            <div
                                key={idx}
                                className="bg-slate-900/50 p-2 rounded border border-purple-500/10 group hover:border-purple-500/30 transition-all cursor-pointer"
                                onClick={() => setPlotBeat(prev => prev + (prev ? '\n\n' : '') + `[洞察: ${insight.description}]`)}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={`text-[9px] px-1 rounded ${insight.type === 'CONFLICT_WARNING' ? 'bg-red-500/20 text-red-400' :
                                        insight.type === 'ALLIANCE_POTENTIAL' ? 'bg-green-500/20 text-green-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>{insight.type}</span>
                                    <span className="text-[9px] text-slate-500 uppercase">{insight.logic}</span>
                                </div>
                                <p className="text-[10px] text-slate-300 mt-1 leading-relaxed">{insight.description}</p>
                                <div className="flex flex-wrap gap-1 mt-1 font-mono text-[8px] text-slate-500">
                                    {insight.involvedEntities.map((e, i) => <span key={i} className="bg-slate-800 px-1 rounded">{e}</span>)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Step 1: Plot Beat Area */}
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700 space-y-4 mb-4">
                <div className="flex items-center justify-between text-muse-300 font-bold">
                    <div className="flex items-center gap-2">
                        <Zap size={18} />
                        <h3>1. 设定情节目标 (Plot Beat)</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleFetchInsights}
                            disabled={isFetchingInsights || !useBackend}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${isFetchingInsights ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20'
                                }`}
                            title="图谱洞察: 基于目前世界观中的角色互动与情报，由AI推断潜在的矛盾或冲突爆发点"
                        >
                            {isFetchingInsights ? <Loader2 size={12} className="animate-spin" /> : <Brain size={12} />}
                            <span>图谱洞察</span>
                        </button>

                        <button
                            onClick={handleGenerateTwists}
                            disabled={isGeneratingTwists || !useBackend || !plotBeat.trim()}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all ${isGeneratingTwists ? 'bg-indigo-900/50 text-indigo-300' : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'} ${!plotBeat.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={!plotBeat.trim() ? "请先在下方输入前提情节目标，AI才可发散反转可能" : "灵感跳跃: 基于现有情节目标，由AI提供意外转折的演变建议"}
                        >
                            {isGeneratingTwists ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                            <span>灵感跳跃</span>
                        </button>
                    </div>
                </div>

                <textarea
                    value={plotBeat}
                    onChange={(e) => setPlotBeat(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white text-sm focus:ring-1 focus:ring-muse-500 outline-none resize-none h-24"
                    placeholder="例如：主角在废弃地铁站遭遇赏金猎人，双方发生激烈枪战，最终主角负伤逃脱..."
                />

                {/* Twist Suggestions Display */}
                {suggestedTwists.length > 0 && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 text-indigo-400 text-[11px] font-bold mb-1">
                            <Sparkles size={14} />
                            <span>灵感反转建议</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {suggestedTwists.map((twist, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => setActiveTwist(activeTwist === twist ? '' : twist)}
                                    className={`text-[11px] p-2 rounded border cursor-pointer transition-all ${activeTwist === twist ? 'bg-muse-700/50 border-muse-400 text-white shadow-lg' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-muse-600/50'
                                        }`}
                                >
                                    {twist}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Task 2.1: Foreshadowing Display */}
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
                                    className="text-indigo-500 hover:text-indigo-400"
                                    title="刷新伏笔"
                                >
                                    <RefreshCw size={12} className={isFetchingForeshadowing ? "animate-spin" : ""} />
                                </button>
                                <button onClick={() => setPendingForeshadowing([])} className="text-indigo-500 hover:text-indigo-400">
                                    <X size={12} />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                            {pendingForeshadowing.map((hook, idx) => (
                                <div
                                    key={idx}
                                    className="bg-slate-900/50 p-2 rounded border border-indigo-500/10 group hover:border-indigo-500/30 transition-all cursor-pointer"
                                    onClick={() => setPlotBeat(prev => prev + (prev ? '\n\n' : '') + `[填坑: ${hook.subject} ${hook.relation} ${hook.object}]`)}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-indigo-200">
                                            <span className="text-indigo-500">HOOK:</span> {hook.subject} {hook.relation} {hook.object}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-[9px] text-slate-500 mt-2 italic text-center">点击伏笔卡片将其快捷加入情节目标</p>
                    </div>
                )}
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

            {/* Tabbed Control Panel: Params / Reference / Prompt */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                {/* Tab Headers */}
                <div className="border-b border-slate-700 bg-slate-800/30">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('params')}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all relative ${
                                activeTab === 'params'
                                    ? 'text-white'
                                    : 'text-slate-400 hover:text-slate-300'
                            }`}
                        >
                            <Sliders size={14} />
                            参数
                            {activeTab === 'params' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muse-400 rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('reference')}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all relative ${
                                activeTab === 'reference'
                                    ? 'text-white'
                                    : 'text-slate-400 hover:text-slate-300'
                            }`}
                        >
                            <FileText size={14} />
                            参考
                            {activeTab === 'reference' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muse-400 rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('prompt')}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all relative ${
                                activeTab === 'prompt'
                                    ? 'text-white'
                                    : 'text-slate-400 hover:text-slate-300'
                            }`}
                        >
                            <Sparkles size={14} />
                            Prompt
                            <span className="text-[8px] px-1 py-0.5 bg-purple-500/30 text-purple-300 rounded-full">New</span>
                            {activeTab === 'prompt' && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muse-400 rounded-full" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-4">
                    {/* Params Tab */}
                    {activeTab === 'params' && (
                        <div className="space-y-4 animate-fade-in custom-scrollbar">
                        {/* Step 2.5: POV Mode */}
                        {selectedChars.length > 0 && (
                            <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 p-3 rounded-xl border border-indigo-500/20">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xs text-indigo-300 font-bold flex items-center gap-1">
                                        <Eye size={14} /> 限制性视角锁定 (POV)
                                    </h3>
                                </div>
                                <select
                                    value={povCharId}
                                    onChange={(e) => setPovCharId(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-slate-300 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">-- 全知上帝视角 --</option>
                                    {(project.characters || []).filter(c => selectedChars.includes(c.id)).map(char => (
                                        <option key={char.id} value={char.id}>👁️ {char.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Location Selection */}
                        <div className="space-y-2">
                            <h3 className="text-xs text-slate-400 font-bold flex items-center gap-1">
                                <MapPin size={14} /> 强制锚定场景/设定 (Active Settings)
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {(project.worldSettings || []).length === 0 && <p className="text-xs text-slate-500">暂无设定，请去灵魂熔炉创建。</p>}
                                {(project.worldSettings || []).map(setting => (
                                    <button
                                        key={setting.id}
                                        onClick={() => toggleSettingSelection(setting.id)}
                                        className={`px-3 py-1.5 rounded-full text-xs border transition-all flex items-center gap-1 ${selectedSettingIds?.includes(setting.id)
                                            ? 'bg-muse-600 border-muse-500 text-white'
                                            : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'
                                            }`}
                                    >
                                        {selectedSettingIds?.includes(setting.id) && <Plus size={10} className="rotate-45" />}
                                        <span className="opacity-50 mr-1">[{setting.category}]</span> {setting.title}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Pacing Control */}
                        <div className="space-y-2 pt-2">
                            <h3 className="text-xs text-slate-400 font-bold flex items-center gap-1">
                                <Gauge size={14} /> 叙事节奏控制 (Pacing)
                            </h3>
                            <div className="flex justify-between items-center gap-1">
                                <button
                                    onClick={() => setPacing('SLOW_BURN')}
                                    className={`flex-1 py-1.5 text-[10px] font-medium rounded-lg flex flex-col items-center transition-all ${pacing === 'SLOW_BURN' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-500/30' : 'bg-slate-900/50 text-slate-500 hover:bg-slate-700/50'
                                        }`}
                                >
                                    铺垫蓄力
                                </button>
                                <button
                                    onClick={() => setPacing('BALANCED')}
                                    className={`flex-1 py-1.5 text-[10px] font-medium rounded-lg flex flex-col items-center transition-all ${pacing === 'BALANCED' ? 'bg-muse-900/50 text-muse-300 border border-muse-500/30' : 'bg-slate-900/50 text-slate-500 hover:bg-slate-700/50'
                                        }`}
                                >
                                    平衡推进
                                </button>
                                <button
                                    onClick={() => setPacing('CLIMAX')}
                                    className={`flex-1 py-1.5 text-[10px] font-medium rounded-lg flex flex-col items-center transition-all ${pacing === 'CLIMAX' ? 'bg-rose-900/50 text-rose-300 border border-rose-500/30' : 'bg-slate-900/50 text-slate-500 hover:bg-slate-700/50'
                                        }`}
                                >
                                    高潮爆发
                                </button>
                            </div>
                        </div>

                        {/* Word Count Slider */}
                        <div className="space-y-2 pt-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
                                    <FileText size={14} /> 目标体量
                                </span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-slate-900 rounded font-mono text-muse-400">
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
                                className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-muse-500"
                            />
                        </div>

                        {/* Phase 5: Local Scene Palette */}
                        <div className="space-y-3 pt-3 mt-3 border-t border-slate-700">
                            <div className="flex justify-between items-center text-amber-300/80 mb-1">
                                <h3 className="text-xs font-bold flex items-center gap-1">
                                    <Sparkles size={14} className="text-amber-400" /> 场景专属调色盘
                                </h3>
                                <span className="text-[9px] px-1.5 py-0.5 border border-amber-500/20 bg-amber-500/10 rounded text-amber-400">临时覆盖</span>
                            </div>
                            <div>
                                <label className="block text-[9px] font-medium text-slate-500 mb-1.5 uppercase tracking-wider">临时特写技法</label>
                                <div className="flex flex-wrap gap-1.5 mb-1">
                                    {['战斗高燃', '极快节奏', '细腻心理', '恐怖氛围', '动作切片', '插科打诨'].map(tag => (
                                        <button
                                            key={tag}
                                            onClick={() => actions.setLocalStyleTags((prev: string[]) => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                                            className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${actions.localStyleTags?.includes(tag)
                                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                                : 'bg-slate-900/60 border-slate-700/50 text-slate-400 hover:border-slate-500'
                                                }`}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[9px] font-medium text-slate-500 mb-1.5 uppercase tracking-wider">
                                    场景范文注入 (Few-Shot)
                                </label>
                                <textarea
                                    value={actions.localReferenceText}
                                    onChange={(e) => actions.setLocalReferenceText(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-amber-100/80 text-[10px] focus:ring-1 focus:ring-amber-500/50 outline-none custom-scrollbar resize-none min-h-[60px]"
                                    placeholder="输入一段经典的场景描写，AI 将在本次生成中全力模仿它的句式、节奏和情绪..."
                                />
                            </div>
                        </div>
                        </div>
                    )}

                    {/* Reference Tab */}
                    {activeTab === 'reference' && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="text-center py-8">
                                <FileText size={32} className="mx-auto text-slate-600 mb-3" />
                                <p className="text-xs text-slate-400">参考内容功能即将上线</p>
                                <p className="text-[10px] text-slate-500 mt-1">可在此处配置场景参考文本、风格模板等</p>
                            </div>
                        </div>
                    )}

                    {/* Prompt Tab */}
                    {activeTab === 'prompt' && (
                        <div className="animate-fade-in">
                            <PromptPanel moduleId={AppSection.DRAFTING} defaultCollapsed={false} />
                        </div>
                    )}
                </div>
            </div>

            {/* Phase 5: Faction Dynamics Button */}
            {useBackend && (
                <button
                    onClick={() => { handleFetchFactions(); setShowFactionPanel(true); }}
                    disabled={isFetchingFactions}
                    className="w-full bg-indigo-900/30 hover:bg-indigo-800/40 text-indigo-300 py-2 rounded-xl font-bold border border-indigo-500/20 flex items-center justify-center gap-2 transition-all text-sm mt-2 disabled:opacity-50"
                >
                    {isFetchingFactions ? <RefreshCw size={14} className="animate-spin" /> : <Users size={14} />}
                    势力版图
                </button>
            )}

            {/* Graph Context Toggle */}
            {useBackend && (
                <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap size={16} className={useGraphContext ? "text-purple-400" : "text-slate-500"} />
                            <span className="text-xs text-slate-300 font-medium">图谱上下文增强</span>
                        </div>
                        <button
                            onClick={() => setUseGraphContext(!useGraphContext)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${
                                useGraphContext ? 'bg-purple-600' : 'bg-slate-700'
                            }`}
                        >
                            <div
                                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                                    useGraphContext ? 'translate-x-5' : 'translate-x-0.5'
                                }`}
                            />
                        </button>
                    </div>
                    {useGraphContext && (
                        <div className="mt-2 pt-2 border-t border-slate-700">
                            <p className="text-[10px] text-slate-400 leading-relaxed">
                                启用后，AI将在生成时自动获取：
                            </p>
                            <ul className="text-[10px] text-slate-500 mt-1 space-y-0.5">
                                <li>• 角色的物理状态和当前位置</li>
                                <li>• 角色之间的关系走向</li>
                                <li>• 未回收的伏笔线索</li>
                                <li>• 情节节点的上下文</li>
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

            {/* Action Button */}
            <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-muse-600 to-indigo-600 hover:from-muse-500 hover:to-indigo-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-muse-900/50 flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 mt-2"
            >
                {isGenerating ? (
                    <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                ) : (
                    <PenTool size={20} />
                )}
                <span>AI 自动撰写场景草稿</span>
            </button>

            {/* Draft History List */}
            <div className="mt-2 text-left">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    草稿箱 (Drafts)
                </h3>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {(project.drafts || []).length === 0 && (
                        <p className="text-xs text-slate-600 italic">暂无草稿。</p>
                    )}
                    {(project.drafts || []).map(draft => (
                        <div
                            key={draft.id}
                            onClick={() => loadDraft(draft)}
                            className={`p-2 rounded-lg border cursor-pointer group flex justify-between items-start transition-all ${activeDraftId === draft.id
                                ? 'bg-muse-900/30 border-muse-500/50'
                                : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800'
                                }`}
                        >
                            <div className="flex-1 min-w-0">
                                <h4 className={`text-xs font-medium truncate ${activeDraftId === draft.id ? 'text-muse-300' : 'text-slate-300'
                                    }`}>
                                    {draft.title}
                                </h4>
                            </div>
                            <button
                                onClick={(e) => deleteDraft(e, draft.id)}
                                className="text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
