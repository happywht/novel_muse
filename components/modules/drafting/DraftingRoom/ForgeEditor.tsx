import React, { useState } from 'react';
import {
    FileText, Cloud, Loader2, Wand2, Eye, Clapperboard,
    Brain, Feather, Zap, Clipboard, Save, Check, ScanSearch,
    Sparkles, RefreshCw, X, Sidebar, ChevronDown, ChevronUp
} from 'lucide-react';
import { Echo, PolishMode, ProjectState } from '@/types';
import { DraftEditor } from './DraftEditor';
import { Loader } from '@/components/ui/Loader';
import { EchoSummaryCard } from '@/components/modules/echo/components/EchoSummaryCard';
import { CharacterReminder } from './CharacterReminder';
import { DraftingAssistantPanel } from './DraftingAssistantPanel';

interface ForgeEditorProps {
    project: ProjectState;
    actions: any;
}

export const ForgeEditor: React.FC<ForgeEditorProps> = ({
    project,
    actions
}) => {
    const [showAssistantPanels, setShowAssistantPanels] = useState(true);

    const {
        generatedContent,
        setGeneratedContent,
        useBackend,
        isSaving,
        isGenerating,
        isPolishing,
        showPolishMenu,
        setShowPolishMenu,
        handlePolish,
        handleSaveDraft,
        handleCommitToManuscript,
        handleLocalRewrite,
        isLocalRewriting,
        handleExtractEchoes,
        isExtracting,
        extractedEchoes,
        setExtractedEchoes,
        handleSimulatePropagation,
        handleAddEcho,
        showReference,
        setShowReference,
    } = actions;
    return (
        <div className="flex flex-col gap-4 pt-10">
            <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 flex flex-col relative overflow-hidden">
                <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex justify-between items-center z-20 relative">
                    <h2 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                        <FileText size={18} className="text-muse-400" />
                        场景预览
                        {useBackend && (
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ml-2 ${isSaving ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 animate-pulse' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                                }`}>
                                {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Cloud size={10} />}
                                {isSaving ? '云端同步中...' : '已安全同步至云端'}
                            </div>
                        )}
                    </h2>
                    <div className="flex gap-2 relative">
                        {/* Polish Tool */}
                        <div className="relative">
                            <button
                                onClick={() => setShowPolishMenu(!showPolishMenu)}
                                disabled={!generatedContent || isGenerating || isPolishing}
                                className={`text-xs px-3 py-1.5 rounded border transition-colors flex items-center gap-1 font-medium ${showPolishMenu ? 'bg-purple-900 text-purple-200 border-purple-500' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                    }`}
                                title="文学润色引擎"
                            >
                                <Wand2 size={12} /> 润色精修
                            </button>

                            {showPolishMenu && (
                                <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden animate-fade-in z-30">
                                    <div className="px-3 py-2 text-[10px] text-slate-500 uppercase font-bold border-b border-slate-700">选择润色镜头</div>
                                    <button onClick={() => handlePolish('SENSORY')} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                                        <Eye size={14} className="text-emerald-400" /> 五感增强
                                    </button>
                                    <button onClick={() => handlePolish('CINEMATIC')} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                                        <Clapperboard size={14} className="text-amber-400" /> 镜头语言
                                    </button>
                                    <button onClick={() => handlePolish('PSYCHOLOGICAL')} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                                        <Brain size={14} className="text-indigo-400" /> 心理侧写
                                    </button>
                                    <button onClick={() => handlePolish('MINIMALIST')} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                                        <Feather size={14} className="text-slate-400" /> 极简张力
                                    </button>
                                    <button onClick={() => handlePolish('WEB_MEME')} className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white flex items-center gap-2">
                                        <Zap size={14} className="text-amber-400" /> 网文网感
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="w-px h-6 bg-slate-700 mx-1"></div>

                        <button
                            onClick={() => navigator.clipboard.writeText(generatedContent)}
                            disabled={!generatedContent}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded border border-slate-700 transition-colors flex items-center gap-1"
                        >
                            <Clipboard size={12} /> 复制
                        </button>
                        <button
                            onClick={handleSaveDraft}
                            disabled={!generatedContent}
                            className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded border border-slate-600 transition-colors flex items-center gap-1"
                        >
                            <Save size={12} /> 保存
                        </button>
                        <button
                            onClick={handleCommitToManuscript}
                            disabled={!generatedContent}
                            className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded border border-emerald-600 transition-colors flex items-center gap-1 shadow-lg font-bold"
                            title="将此草稿转为正式正文，AI 在下次生成时将参考它"
                        >
                            <Check size={12} /> 采纳
                        </button>
                        <div className="w-px h-6 bg-slate-700 mx-1"></div>
                        <button
                            onClick={() => setShowReference(!showReference)}
                            className={`text-xs px-3 py-1.5 rounded border transition-colors flex items-center gap-1 font-medium ${showReference
                                ? 'bg-purple-900 text-purple-200 border-purple-500'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                }`}
                            title="打开设定参考侧边栏"
                        >
                            <Sidebar size={12} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative border-t border-slate-800">
                    <DraftEditor
                        content={generatedContent}
                        onChange={setGeneratedContent}
                        onRewriteSelection={handleLocalRewrite}
                        isProcessing={isLocalRewriting}
                    />
                </div>

                {/* Echo Summary Card - 新的渐进式确认UI */}
                {generatedContent && (
                    <EchoSummaryCard
                        echoes={extractedEchoes}
                        isExtracting={isExtracting}
                        onExtract={handleExtractEchoes}
                        onAccept={handleAddEcho}
                        onReject={(echo) => setExtractedEchoes(prev => prev.filter(e => e.id !== echo.id))}
                        onSimulate={handleSimulatePropagation}
                    />
                )}

                {(isGenerating || isPolishing) && (
                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-30">
                        <Loader text={isPolishing ? "AI 正在进行文学润色与精修..." : "AI 正在深度思考并撰写正文..."} />
                    </div>
                )}
            </div>

            {/* Assistant Panels */}
            {generatedContent && showAssistantPanels && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                    {/* Character Reminder */}
                    <CharacterReminder
                        text={generatedContent}
                        characters={project.characters || []}
                    />

                    {/* Drafting Assistant Panel */}
                    <DraftingAssistantPanel
                        text={generatedContent}
                        wordCount={generatedContent.replace(/<[^>]*>/g, '').length}
                    />
                </div>
            )}

            {/* Toggle Assistant Panels Button */}
            {generatedContent && (
                <div className="mt-2 flex justify-center">
                    <button
                        onClick={() => setShowAssistantPanels(!showAssistantPanels)}
                        className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-all"
                    >
                        {showAssistantPanels ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {showAssistantPanels ? '隐藏助手面板' : '显示助手面板'}
                    </button>
                </div>
            )}
        </div>
    );
};
