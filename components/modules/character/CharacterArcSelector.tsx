import React, { useState } from 'react';
import { Target, Sparkles, ChevronDown, ChevronUp, Info, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import {
    CharacterArc,
    ArcType,
    ArcPhase,
    ARC_TYPE_LABELS,
    ARC_PHASE_LABELS,
    CharacterArcTemplate,
} from '@/types';
import {
    ARC_TEMPLATES,
    getArcTemplate,
    getPhaseIndex,
    getNextPhase,
    getArcCompletionPercentage,
} from '@/utils/characterArcTemplates';

interface CharacterArcSelectorProps {
    currentArc?: CharacterArc;
    onArcChange: (arc: CharacterArc | undefined) => void;
    compact?: boolean;
}

const phaseIcons: Record<ArcPhase, React.ReactNode> = {
    setup: <Info className="w-4 h-4" />,
    'rising-action': <ChevronUp className="w-4 h-4" />,
    crisis: <AlertTriangle className="w-4 h-4" />,
    climax: <Target className="w-4 h-4" />,
    resolution: <CheckCircle className="w-4 h-4" />,
};

const phaseColors: Record<ArcPhase, string> = {
    setup: 'bg-slate-500',
    'rising-action': 'bg-sky-500',
    crisis: 'bg-amber-500',
    climax: 'bg-rose-500',
    resolution: 'bg-emerald-500',
};

export const CharacterArcSelector: React.FC<CharacterArcSelectorProps> = ({
    currentArc,
    onArcChange,
    compact = false,
}) => {
    const [selectedType, setSelectedType] = useState<ArcType | undefined>(
        currentArc?.arcType
    );
    const [selectedTemplate, setSelectedTemplate] = useState<CharacterArcTemplate | undefined>(
        currentArc ? getArcTemplate(currentArc.arcType) : undefined
    );
    const [expandedPhases, setExpandedPhases] = useState<Set<ArcPhase>>(new Set());
    const [notes, setNotes] = useState<string>(currentArc?.notes || '');

    const handleTypeSelect = (type: ArcType) => {
        setSelectedType(type);
        const template = getArcTemplate(type);
        if (template) {
            setSelectedTemplate(template);
            const newArc: CharacterArc = {
                arcType: type,
                currentPhase: 'setup',
                phaseProgress: 0,
                startDate: Date.now(),
                lastUpdated: Date.now(),
                notes: '',
            };
            onArcChange(newArc);
        }
    };

    const handlePhaseProgressChange = (phase: ArcPhase, progress: number) => {
        if (!currentArc || !selectedTemplate) return;

        const phaseIndex = getPhaseIndex(phase, selectedTemplate);
        const currentPhaseIndex = getPhaseIndex(currentArc.currentPhase, selectedTemplate);

        let newCurrentPhase = currentArc.currentPhase;
        if (progress >= 100 && phaseIndex === currentPhaseIndex) {
            const nextPhase = getNextPhase(currentArc, selectedTemplate);
            if (nextPhase) {
                newCurrentPhase = nextPhase;
            }
        }

        onArcChange({
            ...currentArc,
            currentPhase: newCurrentPhase,
            phaseProgress: phaseIndex === currentPhaseIndex ? progress : currentArc.phaseProgress,
            lastUpdated: Date.now(),
        });
    };

    const handleNotesChange = (newNotes: string) => {
        if (!currentArc) return;
        setNotes(newNotes);
        onArcChange({
            ...currentArc,
            notes: newNotes,
            lastUpdated: Date.now(),
        });
    };

    const togglePhaseExpand = (phase: ArcPhase) => {
        const newExpanded = new Set(expandedPhases);
        if (newExpanded.has(phase)) {
            newExpanded.delete(phase);
        } else {
            newExpanded.add(phase);
        }
        setExpandedPhases(newExpanded);
    };

    const handleRemoveArc = () => {
        onArcChange(undefined);
        setSelectedType(undefined);
        setSelectedTemplate(undefined);
        setNotes('');
    };

    if (compact) {
        return (
            <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-sky-400" />
                    <select
                        value={selectedType || ''}
                        onChange={(e) => {
                            if (e.target.value) {
                                handleTypeSelect(e.target.value as ArcType);
                            } else {
                                handleRemoveArc();
                            }
                        }}
                        className="bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded px-2 py-1"
                    >
                        <option value="">选择弧线类型</option>
                        {ARC_TEMPLATES.map(template => (
                            <option key={template.type} value={template.type}>
                                {template.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    <h3 className="text-sm font-bold text-slate-200">角色成长弧线</h3>
                </div>
                <div className="text-xs text-slate-500">
                    帮助新手设计高质量角色成长路径
                </div>
            </div>

            {/* Arc Type Selection */}
            <div className="grid grid-cols-2 gap-2 mb-4">
                {ARC_TEMPLATES.map(template => (
                    <button
                        key={template.type}
                        onClick={() => handleTypeSelect(template.type)}
                        className={`p-3 rounded-lg border transition-all text-left ${
                            selectedType === template.type
                                ? 'bg-violet-500/20 border-violet-500/50 text-violet-200'
                                : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/50'
                        }`}
                    >
                        <div className="font-bold text-sm">{template.name}</div>
                        <div className="text-xs opacity-60 mt-1 line-clamp-2">{template.description}</div>
                    </button>
                ))}
            </div>

            {/* Selected Template Details */}
            {selectedTemplate && (
                <div className="bg-slate-800/30 rounded-lg p-4 space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <HelpCircle className="w-3 h-3" />
                        写作指南
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                        {selectedTemplate.tips.map((tip, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                                <span className="text-sky-400">•</span>
                                <span>{tip}</span>
                            </div>
                        ))}
                    </div>

                    {/* Key Questions */}
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-4 flex items-center gap-2">
                        <Info className="w-3 h-3" />
                        思考问题
                    </h4>
                    <div className="space-y-2">
                        {selectedTemplate.keyQuestions.map((q, idx) => (
                            <div key={idx} className="text-xs text-slate-300 bg-slate-800/50 rounded p-2">
                                {q}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Phase Progress */}
            {currentArc && selectedTemplate && (
                <div className="bg-slate-800/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Target className="w-3 h-3" />
                            阶段进度
                        </h4>
                        <div className="text-xs text-slate-500">
                            总进度: {getArcCompletionPercentage(currentArc)}%
                        </div>
                    </div>
                    <div className="space-y-3">
                        {selectedTemplate.phases.map((phase) => {
                            const isExpanded = expandedPhases.has(phase);
                            const isCurrentPhase = currentArc.currentPhase === phase;
                            const phaseProgress = isCurrentPhase ? currentArc.phaseProgress :
                                getPhaseIndex(phase, selectedTemplate) < getPhaseIndex(currentArc.currentPhase, selectedTemplate) ? 100 : 0;

                            return (
                                <div key={phase} className="border rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => togglePhaseExpand(phase)}
                                        className={`w-full flex items-center justify-between p-3 transition-colors ${
                                            isCurrentPhase ? 'bg-slate-700/50' : 'bg-slate-800/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={`p-1 rounded ${phaseColors[phase]}`}>
                                                {phaseIcons[phase]}
                                            </span>
                                            <span className="text-sm font-medium text-slate-200">
                                                {ARC_PHASE_LABELS[phase]}
                                            </span>
                                            {isCurrentPhase && (
                                                <span className="text-xs text-sky-400">
                                                    当前阶段
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {isExpanded ? '收起' : '展开'}
                                        </span>
                                    </button>

                                    {isExpanded && (
                                        <div className="p-3 border-t border-slate-700/50">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-slate-400">完成度</span>
                                                    <span className="text-xs font-bold text-slate-200">
                                                        {phaseProgress}%
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    value={phaseProgress}
                                                    onChange={(e) => handlePhaseProgressChange(phase, Number(e.target.value))}
                                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                                />
                                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-violet-500 rounded-full transition-all"
                                                        style={{ width: `${phaseProgress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Notes */}
            {currentArc && (
                <div className="bg-slate-800/30 rounded-lg p-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Info className="w-3 h-3" />
                        进展笔记
                    </h4>
                    <textarea
                        value={notes}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        placeholder="记录角色弧线的发展、转折点、重要事件..."
                        className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-sm text-slate-300 h-24 resize-none focus:border-violet-500/50 outline-none"
                    />
                </div>
            )}

            {/* Remove Arc Button */}
            {currentArc && (
                <button
                    onClick={handleRemoveArc}
                    className="w-full py-2 text-xs text-slate-500 hover:text-rose-400 transition-colors"
                >
                    移除弧线设置
                </button>
            )}
        </div>
    );
};
