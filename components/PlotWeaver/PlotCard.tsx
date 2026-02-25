import React, { useState } from 'react';
import { X, Sparkles, RotateCcw, Check, User, Globe, Wand2, Zap, Flag, ChevronDown } from 'lucide-react';
import { PlotNode, ProjectState, BeatTag } from '../../types';
import { Loader } from '../Loader';
import { BEAT_TAGS } from './constants';

interface PlotCardProps {
    node: PlotNode;
    idx: number;
    focusedNodeId: string | null;
    editingNodeId: string | null;
    draftNodeContent: string | null;
    iterationFeedback: string;
    showEntitySelector: { id: string, type: 'CHARACTER' | 'LOCATION' } | null;
    isIterating: boolean;
    project: ProjectState;
    setFocusedNodeId: (id: string | null) => void;
    handleUpdateCard: (id: string, data: Partial<PlotNode>) => void;
    handleRemoveCard: (id: string) => void;
    handleGenerateNodeAI: (id: string) => void;
    handleQuickDraft: (id: string) => void;
    handleIterateNode: () => void;
    handleAcceptDraftNode: () => void;
    setDraftNodeContent: (content: string | null) => void;
    setEditingNodeId: (id: string | null) => void;
    setIterationFeedback: (feedback: string) => void;
    setShowEntitySelector: (selector: { id: string, type: 'CHARACTER' | 'LOCATION' } | null) => void;
    toggleEntityRelation: (nodeId: string, entityId: string, type: 'CHARACTER' | 'LOCATION') => void;
}

export const PlotCard: React.FC<PlotCardProps> = ({
    node,
    idx,
    focusedNodeId,
    editingNodeId,
    draftNodeContent,
    iterationFeedback,
    showEntitySelector,
    isIterating,
    project,
    setFocusedNodeId,
    handleUpdateCard,
    handleRemoveCard,
    handleGenerateNodeAI,
    handleQuickDraft,
    handleIterateNode,
    handleAcceptDraftNode,
    setDraftNodeContent,
    setEditingNodeId,
    setIterationFeedback,
    setShowEntitySelector,
    toggleEntityRelation
}) => {
    const isFocused = focusedNodeId === node.id;
    const isEditing = editingNodeId === node.id && draftNodeContent !== null;
    const [showBeatPicker, setShowBeatPicker] = useState(false);

    const currentBeat = BEAT_TAGS.find(t => t.id === node.beatTag);

    return (
        <div
            className={`bg-slate-900/50 border rounded-2xl p-6 transition-all duration-300 group relative ${isFocused ? 'border-muse-500 shadow-2xl shadow-muse-900/10' : 'border-slate-800 opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 hover:border-slate-700'}`}
            onFocus={() => setFocusedNodeId(node.id)}
            onBlur={() => setFocusedNodeId(null)}
            tabIndex={0}
        >
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500 border border-slate-700">
                        {idx + 1}
                    </div>
                    <div className="flex-1">
                        <input
                            type="text"
                            value={node.title}
                            onChange={(e) => handleUpdateCard(node.id, { title: e.target.value })}
                            className="bg-transparent border-none text-white font-bold text-lg focus:ring-0 w-full placeholder:text-slate-700 p-0"
                            placeholder="输入情节标题..."
                        />

                        {/* Beat Tag Selector */}
                        <div className="relative mt-1">
                            <button
                                onClick={() => setShowBeatPicker(!showBeatPicker)}
                                className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${currentBeat ? currentBeat.color : 'bg-slate-800/50 text-slate-500 border-slate-800 hover:border-slate-700'}`}
                            >
                                <Flag size={10} />
                                {currentBeat ? currentBeat.label : '标记叙事节奏...'}
                                <ChevronDown size={10} className={`transition-transform ${showBeatPicker ? 'rotate-180' : ''}`} />
                            </button>

                            {showBeatPicker && (
                                <div className="absolute top-full left-0 mt-2 w-48 bg-slate-900 border border-slate-700 p-1.5 rounded-lg shadow-2xl z-20 animate-fade-in">
                                    <div className="grid grid-cols-1 gap-1">
                                        <button
                                            onClick={() => { handleUpdateCard(node.id, { beatTag: null }); setShowBeatPicker(false); }}
                                            className="text-left px-2 py-1.5 rounded hover:bg-slate-800 text-[10px] text-slate-400"
                                        >无标记</button>
                                        {BEAT_TAGS.map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => { handleUpdateCard(node.id, { beatTag: t.id as BeatTag }); setShowBeatPicker(false); }}
                                                className={`text-left px-2 py-1.5 rounded transition-colors text-[10px] flex items-center justify-between group ${node.beatTag === t.id ? t.activeColor : 'hover:bg-slate-800 text-slate-300'}`}
                                            >
                                                {t.label}
                                                {node.beatTag === t.id && <Check size={10} />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button
                        onClick={() => handleRemoveCard(node.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                        title="删除卡片"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>

            <textarea
                value={node.content}
                onChange={(e) => handleUpdateCard(node.id, { content: e.target.value })}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-lg p-3 text-sm text-slate-400 focus:text-slate-200 focus:border-muse-500/50 outline-none resize-none font-serif min-h-[100px] transition-all"
                placeholder="描述这段剧情的发生、冲突与转折..."
            />

            {/* Iterative Drafting Zone (Stage B) */}
            {isEditing && (
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
                                {isIterating ? <Loader size={12} /> : <RotateCcw size={12} />} 再次调整
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
            )}

            <div className="mt-3 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowEntitySelector(showEntitySelector?.id === node.id && showEntitySelector?.type === 'CHARACTER' ? null : { id: node.id, type: 'CHARACTER' })}
                            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${showEntitySelector?.id === node.id && showEntitySelector?.type === 'CHARACTER' ? 'bg-muse-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-muse-400'}`}
                            title="关联角色"
                        >
                            <User size={10} /> {node.relatedCharacters?.length || 0}
                        </button>
                        <button
                            onClick={() => setShowEntitySelector(showEntitySelector?.id === node.id && showEntitySelector?.type === 'LOCATION' ? null : { id: node.id, type: 'LOCATION' })}
                            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${showEntitySelector?.id === node.id && showEntitySelector?.type === 'LOCATION' ? 'bg-muse-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-muse-400'}`}
                            title="关联场景"
                        >
                            <Globe size={10} /> {node.relatedLocations?.length || 0}
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleGenerateNodeAI(node.id)}
                            disabled={isIterating && editingNodeId === node.id}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-muse-400 text-xs rounded-lg transition-all flex items-center gap-1"
                            title="AI 智能续写/扩写此段"
                        >
                            {isIterating && editingNodeId === node.id ? <Loader size={12} /> : <Wand2 size={12} />} AI 扩写
                        </button>
                        <button
                            onClick={() => handleQuickDraft(node.id)}
                            className="px-3 py-1 bg-muse-600/20 hover:bg-muse-600 border border-muse-600/30 text-muse-400 hover:text-white text-xs rounded-lg transition-all flex items-center gap-1"
                        >
                            <Zap size={12} /> 一键开写
                        </button>
                    </div>
                </div>

                {/* Quick Entity Selector Panel */}
                {showEntitySelector?.id === node.id && (
                    <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg animate-fade-in relative">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                                {showEntitySelector.type === 'CHARACTER' ? <><User size={10} /> 选择登场角色</> : <><Globe size={10} /> 选择发生地点</>}
                            </span>
                            <button onClick={() => setShowEntitySelector(null)} className="text-slate-600 hover:text-slate-300"><X size={10} /></button>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                            {showEntitySelector.type === 'CHARACTER' ? (
                                project.characters.length > 0 ? project.characters.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => toggleEntityRelation(node.id, c.id, 'CHARACTER')}
                                        className={`text-[10px] px-2 py-1 rounded-full border transition-all ${node.relatedCharacters?.includes(c.id) ? 'bg-muse-900/50 border-muse-500 text-muse-300 shadow-sm shadow-muse-500/20' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                    >
                                        {c.name}
                                    </button>
                                )) : <p className="text-[10px] text-slate-600 italic">暂无角色设定</p>
                            ) : (
                                project.worldSettings.filter(w => w.category === 'Geography' || w.category === 'Other').length > 0
                                    ? project.worldSettings.filter(w => w.category === 'Geography' || w.category === 'Other').map(w => (
                                        <button
                                            key={w.id}
                                            onClick={() => toggleEntityRelation(node.id, w.id, 'LOCATION')}
                                            className={`text-[10px] px-2 py-1 rounded-full border transition-all ${node.relatedLocations?.includes(w.id) ? 'bg-emerald-900/50 border-emerald-500 text-emerald-300 shadow-sm shadow-emerald-500/20' : 'border-slate-800 text-slate-500 hover:border-slate-700'}`}
                                        >
                                            {w.title}
                                        </button>
                                    ))
                                    : <p className="text-[10px] text-slate-600 italic">暂无地点设定</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
