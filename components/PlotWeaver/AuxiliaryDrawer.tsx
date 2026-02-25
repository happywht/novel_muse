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
