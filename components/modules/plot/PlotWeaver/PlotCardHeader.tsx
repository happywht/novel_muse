import React, { useState } from 'react';
import { X, Flag, ChevronDown, Check } from 'lucide-react';
import { usePlotCard } from './PlotCardContext';
import { BEAT_TAGS } from './constants';

export const PlotCardHeader: React.FC = () => {
    const {
        node,
        idx,
        handleUpdateCard,
        handleRemoveCard,
        setFocusedNodeId
    } = usePlotCard();

    const [showBeatPicker, setShowBeatPicker] = useState(false);
    const currentBeat = BEAT_TAGS.find(t => t.id === node.beatTag);

    return (
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
                        onFocus={() => setFocusedNodeId(node.id)}
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
                                            onClick={() => { handleUpdateCard(node.id, { beatTag: t.id as any }); setShowBeatPicker(false); }}
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
    );
};
