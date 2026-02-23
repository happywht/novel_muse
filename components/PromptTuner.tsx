import React, { useState, useEffect } from 'react';
import { Wand2, Save, RotateCcw, ChevronDown, ChevronRight, Sparkles, AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'muse_custom_prompts';

interface PromptCategory {
    key: string;
    label: string;
    description: string;
    defaultPrompt: string;
}

const PROMPT_CATEGORIES: PromptCategory[] = [
    {
        key: 'writing_base',
        label: '🖊️ 基础写作风格',
        description: '控制AI的整体文风、语调和叙事习惯。影响所有写作生成。',
        defaultPrompt: '你是一个专业的创意写作助手，擅长构建生动的场景和深刻的人物。你的文字风格偏向现代文学，注重细节描写和情感渲染。',
    },
    {
        key: 'scene_generation',
        label: '🎬 场景生成指令',
        description: '自动工坊(Forge)中AI撰写场景时的核心指令。',
        defaultPrompt: '你是一位顶级的场景导演和小说家。你的任务是根据给定的角色、场景和情节目标，撰写一段沉浸感极强的小说正文。要求：\n1. 注重感官描写(视觉、听觉、触觉)\n2. 通过动作和对话推动剧情\n3. 保持角色性格一致性\n4. 自然融入世界观设定',
    },
    {
        key: 'character_gen',
        label: '👤 角色生成',
        description: '灵魂熔炉中AI生成角色时使用的系统提示词。',
        defaultPrompt: '你是一位专业的小说角色设计师。你能创造出具有深度、复杂性和内在矛盾的角色。每个角色都应有清晰的动机、独特的说话方式和可信的缺陷。',
    },
    {
        key: 'world_building',
        label: '🌍 世界观构建',
        description: '万象织机中AI生成世界设定时使用的系统提示词。',
        defaultPrompt: '你是一位详尽考究的世界观架构师。你构建的世界设定应该具有内在逻辑一致性，兼顾宏观体系与微观细节。设定应服务于叙事，而非脱离故事单独存在。',
    },
    {
        key: 'plot_weaving',
        label: '📈 剧情推演',
        description: '情节罗盘中AI进行剧情分析和推演时使用的系统提示词。',
        defaultPrompt: '你是一位经验丰富的故事结构专家和编剧。你擅长分析叙事弧线、角色发展曲线和冲突设计。你的剧情建议应兼顾戏剧张力和逻辑合理性。',
    },
    {
        key: 'echo_analysis',
        label: '🔮 命运回响分析',
        description: '命运回响引擎分析正文变化时使用的分析指令。',
        defaultPrompt: '你是一个高精度的叙事状态追踪器。你的职责是分析小说正文中角色和世界发生的重要状态变化，如情感转折、关系变动、能力觉醒、地理迁移等。只记录有叙事意义的变化，忽略无关紧要的细节。',
    },
];

export const getCustomPrompt = (key: string): string | null => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;
        const prompts = JSON.parse(stored);
        return prompts[key] || null;
    } catch {
        return null;
    }
};

interface PromptTunerProps {
    onClose: () => void;
}

export const PromptTuner: React.FC<PromptTunerProps> = ({ onClose }) => {
    const [prompts, setPrompts] = useState<Record<string, string>>({});
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                setPrompts(JSON.parse(stored));
            }
        } catch { /* empty */ }
    }, []);

    const handleSave = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleReset = (key: string) => {
        const updated = { ...prompts };
        delete updated[key];
        setPrompts(updated);
    };

    const handleResetAll = () => {
        if (confirm('确定要清空所有自定义提示词吗？系统将恢复为默认指令。')) {
            setPrompts({});
            localStorage.removeItem(STORAGE_KEY);
        }
    };

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
                                <p className="text-xs text-slate-400 mt-0.5">自定义系统提示词，塑造专属 AI 写作风格</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
                    </div>
                </div>

                {/* Warning */}
                <div className="mx-5 mt-4 p-3 bg-amber-900/20 border border-amber-500/20 rounded-lg flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-300/80">
                        修改提示词会直接影响 AI 的生成效果。建议保留默认值，仅在需要时微调。留空则使用默认提示词。
                    </p>
                </div>

                {/* Prompt List */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                    {PROMPT_CATEGORIES.map(cat => (
                        <div key={cat.key} className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setExpandedKey(expandedKey === cat.key ? null : cat.key)}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/80 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-white">{cat.label}</span>
                                    {prompts[cat.key] && (
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
                                        value={prompts[cat.key] ?? ''}
                                        onChange={(e) => setPrompts(prev => ({ ...prev, [cat.key]: e.target.value }))}
                                        placeholder={cat.defaultPrompt}
                                        rows={5}
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm text-white focus:ring-1 focus:ring-purple-500 outline-none resize-none font-mono"
                                    />
                                    <div className="flex justify-between">
                                        <button
                                            onClick={() => handleReset(cat.key)}
                                            className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                                        >
                                            <RotateCcw size={12} /> 恢复默认
                                        </button>
                                        <span className="text-[10px] text-slate-600">
                                            {(prompts[cat.key] || '').length} / 2000 字
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
                        <RotateCcw size={12} /> 重置全部
                    </button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-300 hover:text-white">
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <Save size={14} />
                            {saved ? '✓ 已保存' : '保存'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
