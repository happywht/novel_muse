import React from 'react';
import { GitBranch, Activity, TrendingUp, Lightbulb, Info, Save, History } from 'lucide-react';
import { TabMode } from '../PlotWeaver';
import { TemplateSelector } from './TemplateSelector';
import { STRUCTURE_TEMPLATES } from './constants';

interface PlotToolbarProps {
    activeTab: TabMode;
    showRightSidebar: boolean;
    showHistory: boolean;
    isGeneratingPlot: boolean;
    hasPlotNodes: boolean;
    toggleSidebarTab: (tab: TabMode) => void;
    onShowSaveModal: () => void;
    onToggleHistory: () => void;
    onGeneratePlot: (template: typeof STRUCTURE_TEMPLATES[0] | null) => void;
}

export const PlotToolbar: React.FC<PlotToolbarProps> = ({
    activeTab,
    showRightSidebar,
    showHistory,
    isGeneratingPlot,
    hasPlotNodes,
    toggleSidebarTab,
    onShowSaveModal,
    onToggleHistory,
    onGeneratePlot
}) => {
    return (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-2">
                    <GitBranch className="text-muse-400" size={24} /> 剧情开题
                </h2>
                <div className="flex bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                    <button
                        onClick={() => toggleSidebarTab('ANALYSIS')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${activeTab === 'ANALYSIS' && showRightSidebar ? 'bg-muse-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Activity size={14} /> 诊断
                    </button>
                    <button
                        onClick={() => toggleSidebarTab('STRUCTURE')}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${activeTab === 'STRUCTURE' && showRightSidebar ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Lightbulb size={14} /> 结构
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={onShowSaveModal}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all border border-slate-600"
                    title="断点存档"
                ><Save size={16} /> <span className="hidden lg:inline">存版本</span></button>
                <button
                    onClick={onToggleHistory}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${showHistory ? 'bg-muse-900 border-muse-500 text-muse-300' : 'bg-slate-700 border-slate-600 text-slate-200 hover:bg-slate-600'}`}
                    title="历史时光机"
                ><History size={16} /></button>

                <div className="h-8 w-[1px] bg-slate-800 mx-1" />

                <TemplateSelector
                    onSelect={onGeneratePlot}
                    isGenerating={isGeneratingPlot}
                />
            </div>
        </div>
    );
};
