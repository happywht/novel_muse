import React, { useState, useEffect } from 'react';
import { X, Sparkles, RotateCcw, Check, User, Globe, Wand2, Zap, Flag, ChevronDown, Loader2, Swords } from 'lucide-react';
import { PlotNode, ProjectState, BeatTag } from '../../types';
import { BEAT_TAGS } from './constants';

interface PlotCardProps {
    node: PlotNode;
    idx: number;
    focusedNodeId: string | null;
    editingNodeId: string | null;
    draftNodeContent: string | null;
    iterationFeedback: string;
    showEntitySelector: { id: string, type: 'CHARACTER' | 'LOCATION' } | null;
    showConflictConfigurator: string | null;
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
    setShowConflictConfigurator: (id: string | null) => void;
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
    showConflictConfigurator,
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
    setShowConflictConfigurator,
    toggleEntityRelation
}) => {
    const isFocused = focusedNodeId === node.id;
    const isEditing = editingNodeId === node.id && draftNodeContent !== null;
    const [showBeatPicker, setShowBeatPicker] = useState(false);

    const currentBeat = BEAT_TAGS.find(t => t.id === node.beatTag);

    // 实时更新强度滑块显示值
    useEffect(() => {
        if (showConflictConfigurator === node.id) {
            const slider = document.getElementById(`intensity-${node.id}`) as HTMLInputElement;
            const valueDisplay = document.getElementById(`intensity-value-${node.id}`);
            if (slider && valueDisplay) {
                const updateValue = () => {
                    valueDisplay.textContent = slider.value;
                };
                slider.addEventListener('input', updateValue);
                return () => slider.removeEventListener('input', updateValue);
            }
        }
    }, [showConflictConfigurator, node.id]);

    return (
        <div
            className={`bg-slate-900/50 border rounded-2xl p-6 transition-all duration-300 group relative ${
                isFocused ? 'border-muse-500 shadow-2xl shadow-muse-900/10' : 
                node.conflictScenario ? 'border-red-800 shadow-lg shadow-red-900/20 animate-pulse' :
                'border-slate-800 opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 hover:border-slate-700'
            }`}
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

            {/* 修罗场强度指示器 */}
            {node.conflictScenario && (
                <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <Swords size={12} className="text-red-500" />
                        <span className="text-[10px] text-red-400 font-bold">
                            强度 {node.conflictScenario.intensity}/10
                        </span>
                    </div>
                    <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
                            style={{ width: `${(node.conflictScenario.intensity / 10) * 100}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-slate-500 truncate max-w-[120px]">
                        {node.conflictScenario.stakes}
                    </span>
                </div>
            )}

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
                        <button
                            onClick={() => setShowConflictConfigurator(showConflictConfigurator === node.id ? null : node.id)}
                            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded transition-colors ${
                                node.conflictScenario ? 'bg-red-600 text-white hover:bg-red-700' : 
                                showConflictConfigurator === node.id ? 'bg-muse-600 text-white' : 
                                'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-muse-400'
                            }`}
                            title={node.conflictScenario ? `修罗场: ${node.conflictScenario.stakes}` : "配置修罗场冲突"}
                        >
                            <Swords size={10} /> {node.conflictScenario ? '修罗场' : '冲突'}
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleGenerateNodeAI(node.id)}
                            disabled={isIterating && editingNodeId === node.id}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-muse-400 text-xs rounded-lg transition-all flex items-center gap-1"
                            title="AI 智能续写/扩写此段"
                        >
                            {isIterating && editingNodeId === node.id ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />} AI 扩写
                        </button>
                        <button
                            onClick={() => handleQuickDraft(node.id)}
                            className="px-3 py-1 bg-muse-600/20 hover:bg-muse-600 border border-muse-600/30 text-muse-400 hover:text-white text-xs rounded-lg transition-all flex items-center gap-1"
                        >
                            <Zap size={12} /> 一键开写
                        </button>
                    </div>
                </div>

                {/* Conflict Configurator Panel */}
                {showConflictConfigurator === node.id && (
                    <div className="p-3 bg-slate-950 border border-red-800/50 rounded-lg animate-fade-in relative">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[10px] font-bold text-red-500 uppercase flex items-center gap-1">
                                <Swords size={10} /> 修罗场配置
                            </span>
                            <button onClick={() => setShowConflictConfigurator(null)} className="text-slate-600 hover:text-slate-300"><X size={10} /></button>
                        </div>
                        
                        {/* 参与角色（只读，基于relatedCharacters） */}
                        <div className="mb-3">
                            <label className="block text-[10px] text-slate-500 mb-1">参与角色</label>
                            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto custom-scrollbar p-1 bg-slate-900 rounded">
                                {node.relatedCharacters && node.relatedCharacters.length >= 2 ? (
                                    node.relatedCharacters.map(charId => {
                                        const character = project.characters.find(c => c.id === charId);
                                        return character ? (
                                            <span key={charId} className="text-[10px] px-2 py-1 rounded-full bg-red-900/30 border border-red-800 text-red-300">
                                                {character.name}
                                            </span>
                                        ) : null;
                                    })
                                ) : (
                                    <p className="text-[10px] text-slate-600 italic">请选择至少2个角色（点击上方"用户"按钮）</p>
                                )}
                            </div>
                        </div>

                        {/* 冲突核心赌注 */}
                        <div className="mb-3">
                            <label className="block text-[10px] text-slate-500 mb-1">冲突核心赌注</label>
                            <input
                                type="text"
                                placeholder="例如：王位继承权、商业控制权、爱情归属、家族荣誉..."
                                defaultValue={node.conflictScenario?.stakes || ''}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:border-red-500 outline-none"
                                id={`stakes-${node.id}`}
                            />
                        </div>

                        {/* 冲突强度滑块 */}
                        <div className="mb-3">
                            <label className="block text-[10px] text-slate-500 mb-1">冲突强度</label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    defaultValue={node.conflictScenario?.intensity || 7}
                                    className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer slider-red"
                                    id={`intensity-${node.id}`}
                                />
                                <span className="text-[10px] text-slate-400 w-4 text-center" id={`intensity-value-${node.id}`}>
                                    {node.conflictScenario?.intensity || 7}
                                </span>
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                                <span>微妙博弈</span>
                                <span>暗流涌动</span>
                                <span>激烈对峙</span>
                                <span>生死对决</span>
                            </div>
                        </div>

                        {/* 冲突类型选择 */}
                        <div className="mb-3">
                            <label className="block text-[10px] text-slate-500 mb-1">冲突类型</label>
                            <select
                                defaultValue={node.conflictScenario?.type || 'CONFRONTATION'}
                                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:border-red-500 outline-none"
                                id={`conflict-type-${node.id}`}
                            >
                                <option value="CONFRONTATION">正面对峙（争吵、辩论、谈判）</option>
                                <option value="CLIMAX">高潮冲突（决定性时刻）</option>
                                <option value="TWIST">反转冲突（真相揭露或背叛）</option>
                            </select>
                        </div>

                        {/* 操作按钮 */}
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowConflictConfigurator(null)}
                                className="px-3 py-1 rounded-lg text-slate-500 hover:text-slate-300 text-[10px]"
                            >
                                取消
                            </button>
                            <button
                                onClick={() => {
                                    const stakes = (document.getElementById(`stakes-${node.id}`) as HTMLInputElement)?.value || '';
                                    const intensity = parseInt((document.getElementById(`intensity-${node.id}`) as HTMLInputElement)?.value || '7');
                                    const type = (document.getElementById(`conflict-type-${node.id}`) as HTMLSelectElement)?.value as 'CONFRONTATION' | 'CLIMAX' | 'TWIST';
                                    
                                    if (node.relatedCharacters && node.relatedCharacters.length >= 2 && stakes.trim()) {
                                        handleUpdateCard(node.id, {
                                            conflictScenario: {
                                                type,
                                                participants: node.relatedCharacters,
                                                stakes: stakes.trim(),
                                                intensity
                                            }
                                        });
                                        setShowConflictConfigurator(null);
                                    } else {
                                        alert('请确保已选择至少2个角色，并填写冲突核心赌注');
                                    }
                                }}
                                disabled={!node.relatedCharacters || node.relatedCharacters.length < 2}
                                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                保存配置
                            </button>
                            {node.relatedCharacters && node.relatedCharacters.length >= 2 && (
                                <button
                                    onClick={async () => {
                                        // 生成修罗场场景
                                        const { generateConflictScenario } = await import('../../services/gemini/shuraField');
                                        try {
                                            const selectedChars = project.characters.filter(c => node.relatedCharacters?.includes(c.id));
                                            
                                            // 添加详细日志
                                            console.log('[修罗场] 节点相关角色ID:', node.relatedCharacters);
                                            console.log('[修罗场] 项目中的角色总数:', project.characters.length);
                                            console.log('[修罗场] 匹配到的角色:', selectedChars.map(c => ({id: c.id, name: c.name})));
                                            console.log('[修罗场] 匹配到的角色数量:', selectedChars.length);
                                            
                                            if (selectedChars.length < 2) {
                                                const missingIds = node.relatedCharacters?.filter(id => !project.characters.find(c => c.id === id)) || [];
                                                alert(`生成失败：在项目中只找到 ${selectedChars.length} 个有效角色。\n\n缺失的角色ID: ${missingIds.join(', ')}\n\n请检查相关角色是否已被删除或ID是否匹配。`);
                                                return;
                                            }
                                            
                                            // 检查角色完整性
                                            const incompleteChars = selectedChars.filter(c => !c.name || !c.description);
                                            if (incompleteChars.length > 0) {
                                                alert(`生成失败：以下角色信息不完整（缺少名称或描述）：\n${incompleteChars.map(c => c.name || '未命名角色').join('\n')}`);
                                                return;
                                            }
                                            
                                            const result = await generateConflictScenario(
                                                selectedChars,
                                                node.content,
                                                project.genre,
                                                project.characters,
                                                project.worldSettings,
                                                project.creativeSettings
                                            );
                                            
                                            // 更新节点内容
                                            handleUpdateCard(node.id, {
                                                content: result.plotNode.content,
                                                conflictScenario: result.plotNode.conflictScenario,
                                                beatTag: result.plotNode.beatTag || node.beatTag
                                            });
                                            
                                            setShowConflictConfigurator(null);
                                            alert('修罗场场景生成成功！');
                                        } catch (error) {
                                            console.error('生成修罗场失败:', error);
                                            alert(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
                                        }
                                    }}
                                    className="px-3 py-1 bg-muse-600 hover:bg-muse-500 text-white rounded-lg text-[10px] font-bold"
                                >
                                    AI 生成场景
                                </button>
                            )}
                        </div>
                    </div>
                )}

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
