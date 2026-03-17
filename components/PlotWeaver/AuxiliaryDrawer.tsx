import React, { useState } from 'react';
import { Activity, TrendingUp, Lightbulb, Sidebar, X, User, Globe, Zap, Info, Swords, Flame, BarChart3 } from 'lucide-react';
import { TabMode } from '../PlotWeaver';
import { ProjectState, PlotNode } from '../../types';
import { PlotAnalysisPanel } from '../PlotWeaver/PlotAnalysisPanel';
import { PlotRhythmChart } from '../PlotWeaver/PlotRhythmChart';
import { PlotStructureAssistant } from '../PlotWeaver/PlotStructureAssistant';
import { Loader } from '../Loader';
import { ConflictVisualization } from '../ConflictVisualization';

interface AuxiliaryDrawerProps {
    showRightSidebar: boolean;
    activeTab: TabMode;
    analysis: string;
    selectedText: string;
    customRewritePrompt: string;
    isAnalyzing: boolean;
    project: ProjectState;
    fullContent: string;
    setShowRightSidebar: (show: boolean) => void;
    setCustomRewritePrompt: (prompt: string) => void;
    handleRewrite: (prompt: string, label: string) => void;
    handleAutoFix: () => void;
    isIterating?: boolean;
    handleAnalyze: () => void;
}

export const AuxiliaryDrawer: React.FC<AuxiliaryDrawerProps> = ({
    showRightSidebar,
    activeTab,
    analysis,
    selectedText,
    customRewritePrompt,
    isAnalyzing,
    project,
    fullContent,
    setShowRightSidebar,
    setCustomRewritePrompt,
    handleRewrite,
    handleAutoFix,
    isIterating,
    handleAnalyze
}) => {
    const [showConflictVisualization, setShowConflictVisualization] = useState(false);
    return (
        <div className={`fixed top-0 right-0 h-full w-[450px] bg-slate-900 border-l border-slate-800 shadow-2xl z-40 transform transition-transform duration-500 ease-in-out flex flex-col ${showRightSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    {activeTab === 'ANALYSIS' && <><Activity className="text-muse-400" size={20} /> <span className="font-bold text-white uppercase tracking-wider text-sm italic">剧情诊断报告</span></>}
                    {activeTab === 'STRUCTURE' && <><Lightbulb className="text-amber-400" size={20} /> <span className="font-bold text-white uppercase tracking-wider text-sm italic">创作结构助手</span></>}
                </div>
                <button onClick={() => setShowRightSidebar(false)} className="text-slate-500 hover:text-white p-1.5 hover:bg-slate-800 rounded-xl transition-all"><X size={20} /></button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative p-6">

                {(activeTab === 'ANALYSIS' || activeTab === 'OPTIMIZE') && (
                    <PlotAnalysisPanel
                        analysis={analysis}
                        selectedText={selectedText}
                        customRewritePrompt={customRewritePrompt}
                        onCustomRewritePromptChange={setCustomRewritePrompt}
                        onRewrite={handleRewrite}
                        onAutoFix={handleAutoFix}
                        isIterating={isIterating}
                        activeSubTab={activeTab === 'OPTIMIZE' ? 'OPTIMIZE' : 'ANALYSIS'}
                    />
                )}


                {activeTab === 'STRUCTURE' && (
                    <>
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

                        {/* 修罗场冲突分析面板 */}
                        <div className="mt-8 p-5 bg-slate-900/70 border border-red-800/30 rounded-2xl">
                            <div className="flex items-center gap-2 mb-4 text-red-400 font-bold text-sm uppercase tracking-wider">
                                <Swords size={16} /> 修罗场冲突分析
                            </div>
                            
                            {project.plotNodes.filter((n: PlotNode) => n.conflictScenario).length === 0 ? (
                                <div className="text-center py-8 text-slate-600">
                                    <Flame size={32} className="mx-auto mb-3 opacity-50" />
                                    <p className="text-sm">暂无配置修罗场冲突的情节节点</p>
                                    <p className="text-xs mt-2">在情节卡片中点击⚔️按钮配置冲突</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {project.plotNodes.filter((n: PlotNode) => n.conflictScenario).map((conflictNode: PlotNode) => (
                                        <div key={conflictNode.id} className="p-4 bg-slate-950/50 border border-red-800/20 rounded-xl">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm font-bold text-red-300 truncate">{conflictNode.title}</h4>
                                            <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                                                conflictNode.conflictScenario?.intensity >= 8 ? 'bg-red-500 text-red-950' :
                                                conflictNode.conflictScenario?.intensity >= 6 ? 'bg-orange-500 text-orange-950' :
                                                conflictNode.conflictScenario?.intensity >= 4 ? 'bg-yellow-500 text-yellow-950' :
                                                'bg-slate-500 text-slate-950'
                                            }`}>
                                                强度 {conflictNode.conflictScenario?.intensity}/10
                                            </span>
                                            </div>
                                            
                                            <div className="mb-2">
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
                                                    <User size={10} /> 参与者
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {conflictNode.conflictScenario?.participants.map(charId => {
                                                        const char = project.characters.find(c => c.id === charId);
                                                        return char ? (
                                                            <span key={charId} className="text-[10px] px-2 py-1 rounded-full bg-red-900/30 border border-red-800 text-red-300">
                                                                {char.name}
                                                            </span>
                                                        ) : null;
                                                    })}
                                                </div>
                                            </div>

                                            <div className="mb-2">
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-1">
                                                    <Flame size={10} /> 冲突核心
                                                </div>
                                                <p className="text-xs text-slate-300 italic">
                                                    {conflictNode.conflictScenario?.stakes}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                <Zap size={10} /> 类型
                                                <span className="text-xs text-slate-300 capitalize">
                                                    {conflictNode.conflictScenario?.type === 'CONFRONTATION' ? '正面对峙' :
                                                     conflictNode.conflictScenario?.type === 'CLIMAX' ? '高潮冲突' : '反转冲突'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            </div>

                        {/* 冲突场景可视化面板 */}
                        <div className="mt-8">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-muse-400 font-bold text-sm uppercase tracking-wider">
                                    <BarChart3 size={16} /> 冲突场景可视化分析
                                </div>
                                <button
                                    onClick={() => setShowConflictVisualization(!showConflictVisualization)}
                                    className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                        showConflictVisualization
                                            ? 'bg-muse-600 text-white'
                                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    }`}
                                >
                                    {showConflictVisualization ? '隐藏分析' : '显示分析'}
                                </button>
                            </div>

                            {showConflictVisualization && (
                                <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-4">
                                    <ConflictVisualization
                                        plotNodes={project.plotNodes}
                                        chapters={project.chapters}
                                        characters={project.characters}
                                    />
                                </div>
                            )}
                        </div>
                        </>
                    )}

            {/* Global Loading Overlay for Right Panels */}
            {isAnalyzing && (
                <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center z-50">
                    <Loader text="正在进行深度诊断与逻辑审计..." />
                </div>
            )}
        </div>

        {/* Bottom Footer Action */}
        {activeTab === 'ANALYSIS' && (
            <div className="p-4 border-t border-slate-800 bg-slate-900/80 backdrop-blur-md">
                <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || project.plotNodes.length === 0}
                    className="w-full bg-muse-600 hover:bg-muse-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-xl shadow-muse-900/20"
                >
                    <Activity size={18} /> 重新分析 (Analysis)
                </button>
            </div>
        )}
    </div>
);
};
