import React, { useState } from 'react';
import { Lightbulb, Clipboard, Sparkles, ArrowRight, ChevronRight, Shuffle } from 'lucide-react';
import { MarkdownRenderer } from '../MarkdownRenderer';
import { Loader } from '../Loader';
import { expandScene } from '../../services/geminiService';
import { Character, WorldSetting, CreativeSettings, Echo } from '../../types';

const STRUCTURE_PROMPTS = [
    {
        label: "💡 头脑风暴：下一个关键事件",
        prompt: "请基于当前大纲的走向，头脑风暴3个可能的「下一步关键事件」，每个用简短的标题+简介形式呈现。不要写正文，只需要结构性建议。",
        icon: Sparkles,
    },
    {
        label: "🔀 设计剧情反转",
        prompt: "请为当前大纲设计2-3个出人意料的「剧情反转点」，说明反转的位置、核心内容和对整体叙事的影响。只提供结构性建议，不要写正文。",
        icon: Shuffle,
    },
    {
        label: "📐 章节结构拆分",
        prompt: "请将当前大纲拆分为具体的章节划分建议。列出每个章节的标题、核心事件、预期篇幅和节奏标注（如：紧张/舒缓/高潮/过渡）。",
        icon: ArrowRight,
    },
    {
        label: "🧩 补全遗漏线索",
        prompt: "请审查当前大纲，指出可能遗漏的伏笔回收、人物弧光断点、或世界观设定中未在剧情中体现的元素，并提供补充建议。",
        icon: ChevronRight,
    },
];

interface PlotStructureAssistantProps {
    premise: string;
    genre: string;
    plotOutline: string;
    selectedText: string;
    characters: Character[];
    worldSettings: WorldSetting[];
    creativeSettings: CreativeSettings;
    echoes: Echo[];
}

export const PlotStructureAssistant: React.FC<PlotStructureAssistantProps> = ({
    premise,
    genre,
    plotOutline,
    selectedText,
    characters,
    worldSettings,
    creativeSettings,
    echoes,
}) => {
    const [result, setResult] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');

    const handleStructureQuery = async (prompt: string) => {
        const contextText = selectedText || plotOutline;
        if (!contextText.trim()) return;
        setIsLoading(true);
        try {
            const res = await expandScene(
                premise,
                genre,
                contextText,
                prompt,
                characters,
                worldSettings,
                creativeSettings,
                echoes,
            );
            setResult(res);
        } catch (e) {
            console.error(e);
            setResult('❌ 生成失败，请重试。');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4 animate-fade-in">
            {/* Quick Action Buttons */}
            <div className="space-y-2 shrink-0">
                <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={16} className="text-amber-400" />
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">结构灵感工具</label>
                </div>
                {selectedText && (
                    <div className="text-xs text-muse-400 mb-2 bg-muse-900/20 border border-muse-500/30 px-3 py-2 rounded-lg italic">
                        ✦ 将基于选中的 {selectedText.length} 字进行分析
                    </div>
                )}
                <div className="grid grid-cols-1 gap-2">
                    {STRUCTURE_PROMPTS.map((sp, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleStructureQuery(sp.prompt)}
                            disabled={isLoading || (!plotOutline && !selectedText)}
                            className="text-left px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-300 hover:text-white transition-all group disabled:opacity-50"
                        >
                            <div className="font-medium text-slate-200 group-hover:text-amber-400">{sp.label}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Custom Structural Question */}
            <div className="shrink-0 pt-2 border-t border-slate-800">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">自由提问</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="例如：主线之外还能加什么支线？"
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:border-muse-500 outline-none"
                    />
                    <button
                        onClick={() => handleStructureQuery(customPrompt)}
                        disabled={isLoading || !customPrompt || (!plotOutline && !selectedText)}
                        className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-2 rounded-md text-sm disabled:opacity-50 font-medium"
                    >
                        发送
                    </button>
                </div>
            </div>

            {/* Result Area */}
            <div className="flex-1 bg-slate-950/50 rounded-lg p-4 border border-slate-800/50 overflow-y-auto custom-scrollbar relative">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader text="AI 正在构思结构建议..." />
                    </div>
                ) : result ? (
                    <>
                        <div className="absolute top-2 right-2">
                            <button
                                onClick={() => navigator.clipboard.writeText(result)}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors"
                                title="复制内容"
                            >
                                <Clipboard size={14} />
                            </button>
                        </div>
                        <MarkdownRenderer content={result} />
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600">
                        <Lightbulb size={32} className="opacity-20 mb-3" />
                        <p className="text-sm text-center max-w-xs">
                            点击上方的结构灵感按钮，<br />
                            AI 将基于您的大纲、人物和世界观，<br />
                            为您提供<strong className="text-amber-400/70">结构层面</strong>的专业建议。
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
