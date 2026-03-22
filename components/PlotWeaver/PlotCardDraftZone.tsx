import React from 'react';
import { Sparkles, RotateCcw, Check, Loader2 } from 'lucide-react';
import { usePlotCard } from './PlotCardContext';

export const PlotCardDraftZone: React.FC = () => {
    const {
        node,
        editingNodeId,
        draftNodeContent,
        iterationFeedback,
        isIterating,
        handleIterateNode,
        handleAcceptDraftNode,
        setDraftNodeContent,
        setEditingNodeId,
        setIterationFeedback
    } = usePlotCard();

    const isEditing = editingNodeId === node.id && draftNodeContent !== null;

    if (!isEditing) return null;

    return (
        <div className="mt-4 p-4 bg-muse-900/10 border border-muse-500/30 rounded-xl animate-fade-in">
            <div className="flex items-center gap-2 mb-3 text-muse-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles size={14} /> AI 扩写草稿
            </div>
            <div className="text-sm text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-lg border border-slate-800 mb-4 whitespace-pre-wrap italic shadow-inner">
                {draftNodeContent}
            </div>

            <div className="space-y-3">
                <textarea
                    value={iterationFeedback}
                    onChange={(e) => setIterationFeedback(e.target.value)}
                    placeholder="觉得哪里不好？告诉 AI 进行调整（例如：增加一些角色内心描写、让气氛更黑暗...）"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 focus:border-muse-500 outline-none min-h-[60px]"
                />
                <div className="flex justify-end gap-2 text-[10px]">
                    <button
                        onClick={() => { setDraftNodeContent(null); setEditingNodeId(null); }}
                        className="px-3 py-1.5 rounded-lg text-slate-500 hover:text-slate-300 transition-colors"
                    >取消</button>
                    <button
                        onClick={handleIterateNode}
                        disabled={isIterating || !iterationFeedback.trim()}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-muse-400 rounded-lg font-medium flex items-center gap-1 transition-all border border-slate-700 disabled:opacity-50"
                    >
                        {isIterating ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} 再次调整
                    </button>
                    <button
                        onClick={handleAcceptDraftNode}
                        className="px-3 py-1.5 bg-muse-600 hover:bg-muse-500 text-white rounded-lg font-bold flex items-center gap-1 shadow-lg shadow-muse-900/20"
                    >
                        <Check size={12} /> 采纳并覆盖
                    </button>
                </div>
            </div>
        </div>
    );
};
