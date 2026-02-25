import React from 'react';
import { Activity, TrendingUp, Lightbulb, Sidebar, X, User, Globe, Zap, Info } from 'lucide-react';
import { TabMode } from '../PlotWeaver';
import { ProjectState } from '../../types';
import { PlotAnalysisPanel } from '../PlotWeaver/PlotAnalysisPanel';
import { PlotRhythmChart } from '../PlotWeaver/PlotRhythmChart';
import { PlotStructureAssistant } from '../PlotWeaver/PlotStructureAssistant';
import { Loader } from '../Loader';

interface AuxiliaryDrawerProps {
    showRightSidebar: boolean;
    activeTab: TabMode;
    analysis: string;
    selectedText: string;
    customRewritePrompt: string;
    rhythmData: any[];
    isAnalyzing: boolean;
    isAnalyzingRhythm: boolean;
    project: ProjectState;
    fullContent: string;
    setShowRightSidebar: (show: boolean) => void;
    setCustomRewritePrompt: (prompt: string) => void;
    handleRewrite: (prompt: string, label: string) => void;
    handleAutoFix: () => void;
    handleAnalyzeRhythm: () => void;
    handleAnalyze: () => void;
}

export const AuxiliaryDrawer: React.FC<AuxiliaryDrawerProps> = ({
    showRightSidebar,
    activeTab,
    analysis,
    selectedText,
    customRewritePrompt,
    rhythmData,
    isAnalyzing,
    isAnalyzingRhythm,
    project,
    fullContent,
    setShowRightSidebar,
    setCustomRewritePrompt,
    handleRewrite,
    handleAutoFix,
    handleAnalyzeRhythm,
    handleAnalyze
}) => {
    return (
        <div className={`fixed top-0 right-0 h-full w-[450px] bg-slate-900 border-l border-slate-800 shadow-2xl z-40 transform transition-transform duration-500 ease-in-out flex flex-col ${showRightSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/80 backdrop-blur-md">
                <div className="flex items-center gap-3">
                    {activeTab === 'ANALYSIS' && <><Activity className="text-muse-400" size={20} /> <span className="font-bold text-white uppercase tracking-wider text-sm italic">剧情诊断报告</span></>}
                    {activeTab === 'RHYTHM' && <><TrendingUp className="text-indigo-400" size={20} /> <span className="font-bold text-white uppercase tracking-wider text-sm italic">叙事张力曲线</span></>}
                    {activeTab === 'STRUCTURE' && <><Lightbulb className="text-amber-400" size={20} /> <span className="font-bold text-white uppercase tracking-wider text-sm italic">创作结构助手</span></>}
                    {activeTab === 'REFERENCE' && <><Info className="text-slate-400" size={20} /> <span className="font-bold text-white uppercase tracking-wider text-sm italic">核心设定参考</span></>}
                </div>
                <button onClick={() => setShowRightSidebar(false)} className="text-slate-500 hover:text-white p-1.5 hover:bg-slate-800 rounded-xl transition-all"><X size={20} /></button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative p-6">
                {activeTab === 'REFERENCE' && (
                    <div className="space-y-6 animate-fade-in">
                        <div>
                            <h4 className="text-muse-400 text-xs font-bold uppercase mb-4 flex items-center gap-2"><User size={14} /> 核心角色设定</h4>
                            {project.characters.length === 0 && <div className="p-4 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 text-center text-xs text-slate-500">暂无角色设定。</div>}
                            <div className="space-y-3">
                                {project.characters.map(c => (
                                    <div key={c.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                                        <div className="flex justify-between mb-1"><span className="text-slate-200 font-bold text-sm">{c.name}</span><span className="text-[10px] px-2 py-0.5 rounded bg-slate-700 text-slate-400">{c.role}</span></div>
                                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-4">{c.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-muse-400 text-xs font-bold uppercase mb-4 flex items-center gap-2"><Globe size={14} /> 世界观与背景设定</h4>
                            {project.worldSettings.length === 0 && <div className="p-4 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 text-center text-xs text-slate-500">暂无世界设定。</div>}
                            <div className="space-y-3">
                                {project.worldSettings.map(w => (
                                    <div key={w.id} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
                                        <div className="flex justify-between mb-1"><span className="text-slate-200 font-bold text-sm">{w.title}</span><span className="text-[10px] text-slate-500">{w.category}</span></div>
                                        <p className="text-xs text-slate-400 leading-relaxed line-clamp-4">{w.content}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {(activeTab === 'ANALYSIS' || activeTab === 'OPTIMIZE') && (
                    <PlotAnalysisPanel
                        analysis={analysis}
                        selectedText={selectedText}
                        customRewritePrompt={customRewritePrompt}
                        onCustomRewritePromptChange={setCustomRewritePrompt}
                        onRewrite={handleRewrite}
                        onAutoFix={handleAutoFix}
                        activeSubTab={activeTab === 'OPTIMIZE' ? 'OPTIMIZE' : 'ANALYSIS'}
                    />
                )}

                {activeTab === 'RHYTHM' && (
                    <PlotRhythmChart
                        project={project}
                        isAnalyzingRhythm={isAnalyzingRhythm}
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
                    <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center z-50">
                        <Loader text={isAnalyzing ? "正在进行逻辑审计..." : "正在分析剧情节奏..."} />
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
