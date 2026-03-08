import React from 'react';
import {
    FileText, Cloud, Loader2, Wand2, Eye, Clapperboard,
    Brain, Feather, Zap, Clipboard, Save, Check, ScanSearch,
    Sparkles, RefreshCw, X, Sidebar
} from 'lucide-react';
import { Echo, PolishMode, ProjectState } from '../../types';
import { DraftEditor } from './DraftEditor';
import { Loader } from '../Loader';

interface ForgeEditorProps {
    project: ProjectState;
    actions: any;
}

export const ForgeEditor: React.FC<ForgeEditorProps> = ({
    project,
    actions
}) => {
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
        <div className="w-2/3 flex flex-col gap-4 pt-10">
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

                {/* Auto-Echo Capture Section */}
                {generatedContent && (
                    <div className="bg-slate-950/50 p-4 border-t border-slate-800">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                <ScanSearch className="text-muse-400" size={14} />
                                命运回响 (状态提取)
                            </h3>
                            <button
                                onClick={handleExtractEchoes}
                                disabled={isExtracting}
                                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50 border border-slate-700"
                            >
                                {isExtracting ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                提取状态变更
                            </button>
                        </div>

                        {extractedEchoes.length > 0 && (
                            <div className="space-y-2 mt-2 max-h-32 overflow-y-auto custom-scrollbar">
                                {extractedEchoes.map(echo => (
                                    <div key={echo.id} className="bg-slate-800/80 p-2 rounded border border-slate-700 flex gap-2 items-start">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5">
                                                <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${echo.type === 'CHARACTER' ? 'bg-indigo-900/50 text-indigo-300' : 'bg-emerald-900/50 text-emerald-300'
                                                    }`}>
                                                    {echo.type === 'CHARACTER' ? '人物' : '世界'}
                                                </span>
                                                <span className="font-bold text-slate-300 text-xs truncate">{echo.targetName}</span>
                                            </div>
                                            <p className="text-muse-300 text-xs mt-1">{echo.description}</p>
                                        </div>
                                        <div className="flex gap-1 shrink-0">
                                            <button
                                                onClick={() => handleSimulatePropagation(echo.targetName, echo.description)}
                                                title="蝴蝶效应预演"
                                                className="text-muse-400 hover:text-muse-300 p-1"
                                            >
                                                <Zap size={14} />
                                            </button>
                                            <button onClick={() => handleAddEcho(echo)} className="text-emerald-500 hover:text-emerald-400 p-1">
                                                <Check size={14} />
                                            </button>
                                            <button
                                                onClick={() => setExtractedEchoes(prev => prev.filter(e => e.id !== echo.id))}
                                                className="text-slate-500 hover:text-red-400 p-1"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {(isGenerating || isPolishing) && (
                    <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center z-30">
                        <Loader text={isPolishing ? "AI 正在进行文学润色与精修..." : "AI 正在深度思考并撰写正文..."} />
                    </div>
                )}
            </div>
        </div>
    );
};
