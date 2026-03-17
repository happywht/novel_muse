import React, { useState, useEffect } from 'react';
import { Wand2, Save, RotateCcw, ChevronDown, ChevronRight, Sparkles, AlertTriangle } from 'lucide-react';

import { PROMPT_REGISTRY_LITERARY, PROMPT_REGISTRY_WEB_NOVEL } from '../config/prompts';
import { useProjectStore } from '../store/useProjectStore';

export const getCustomPrompt = (key: string): string | null => {
    const { project } = useProjectStore.getState();
    return project.customPrompts?.[key] || null;
};

interface PromptTunerProps {
    onClose: () => void;
}

export const PromptTuner: React.FC<PromptTunerProps> = ({ onClose }) => {
    // 切片化订阅
    const project = useProjectStore(state => state.project);
    const customPrompts = useProjectStore(state => state.project.customPrompts);
    const updateProject = useProjectStore(state => state.updateProject);
    
    const [localPrompts, setLocalPrompts] = useState<Record<string, string>>({});
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (customPrompts) {
            setLocalPrompts(customPrompts);
        }
    }, [customPrompts]);

    const handleSave = () => {
        updateProject({ customPrompts: localPrompts });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleReset = (key: string) => {
        const updated = { ...localPrompts };
        delete updated[key];
        setLocalPrompts(updated);
    };

    const handleResetAll = () => {
        if (confirm('确定要清空此项目的所有自定义提示词吗？系统将恢复为默认指令。')) {
            setLocalPrompts({});
        }
    };

    const activeRegistry = project.creativeSettings?.promptProfile === 'WEB_NOVEL'
        ? PROMPT_REGISTRY_WEB_NOVEL
        : PROMPT_REGISTRY_LITERARY;
    const categories = Object.values(activeRegistry);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="p-5 border-b border-slate-700 bg-gradient-to-r from-purple-900/30 to-indigo-900/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <Wand2 size={20} className="text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">AI 调教台 (Prompt Tuner)</h2>
                                <p className="text-xs text-slate-400 mt-0.5">针对《{project.title || "当本宇宙"}》自定义系统提示词</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
                    </div>
                </div>

                {/* Warning */}
                <div className="mx-5 mt-4 p-3 bg-amber-900/20 border border-amber-500/20 rounded-lg flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300/80">
                        提示词是项目的灵魂。修改后仅对当前宇宙生效。留空则使用 Muse 系统默认指令。
                    </p>
                </div>

                {/* Prompt List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                    {categories.map(cat => (
                        <div key={cat.key} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setExpandedKey(expandedKey === cat.key ? null : cat.key)}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/80 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-white">{cat.label}</span>
                                    {localPrompts[cat.key] && (
                                        <span className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                                            <Sparkles size={10} className="inline mr-1" /> 已自定义
                                        </span>
                                    )}
                                </div>
                                {expandedKey === cat.key
                                    ? <ChevronDown size={16} className="text-slate-400" />
                                    : <ChevronRight size={16} className="text-slate-400" />}
                            </button>

                            {expandedKey === cat.key && (
                                <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50 pt-3">
                                    <p className="text-xs text-slate-500">{cat.description}</p>
                                    <textarea
                                        value={localPrompts[cat.key] ?? ''}
                                        onChange={(e) => setLocalPrompts(prev => ({ ...prev, [cat.key]: e.target.value }))}
                                        placeholder={cat.instruction}
                                        rows={6}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none resize-none font-mono leading-relaxed"
                                    />
                                    <div className="flex justify-between">
                                        <button
                                            onClick={() => handleReset(cat.key)}
                                            className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                                        >
                                            <RotateCcw size={12} /> 恢复默认
                                        </button>
                                        <span className="text-[10px] text-slate-600">
                                            {(localPrompts[cat.key] || '').length} / 2000 字
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 bg-slate-950/50 flex justify-between items-center">
                    <button
                        onClick={handleResetAll}
                        className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1"
                    >
                        <RotateCcw size={12} /> 重置此宇宙全部
                    </button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white">
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-purple-500/20 active:scale-95"
                        >
                            <Save size={14} />
                            {saved ? '✓ 设定已生效' : '保存到当前宇宙'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
