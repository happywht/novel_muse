import React, { useEffect } from 'react';
import { X, Swords } from 'lucide-react';
import { usePlotCard } from './PlotCardContext';
import { useToast } from '../../hooks/useToast';

export const PlotCardConflictConfigurator: React.FC = () => {
    const { toast } = useToast();
    const {
        node,
        project,
        showConflictConfigurator,
        setShowConflictConfigurator,
        handleUpdateCard
    } = usePlotCard();

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

    if (!showConflictConfigurator || showConflictConfigurator !== node.id) return null;

    return (
        <div className="p-3 bg-slate-950 border border-red-800/50 rounded-lg animate-fade-in relative mt-3">
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
                            toast.warning('请确保已选择至少2个角色，并填写冲突核心赌注');
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
                                    toast.error(`生成失败：在项目中只找到 ${selectedChars.length} 个有效角色。缺失的角色ID: ${missingIds.join(', ')}。请检查相关角色是否已被删除或ID是否匹配。`, 8000);
                                    return;
                                }

                                // 检查角色完整性
                                const incompleteChars = selectedChars.filter(c => !c.name || !c.description);
                                if (incompleteChars.length > 0) {
                                    toast.error(`生成失败：以下角色信息不完整（缺少名称或描述）：${incompleteChars.map(c => c.name || '未命名角色').join(', ')}`, 8000);
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
                                toast.success('修罗场场景生成成功！');
                            } catch (error) {
                                console.error('生成修罗场失败:', error);
                                toast.error(`生成失败: ${error instanceof Error ? error.message : '未知错误'}`);
                            }
                        }}
                        className="px-3 py-1 bg-muse-600 hover:bg-muse-500 text-white rounded-lg text-[10px] font-bold"
                    >
                        AI 生成场景
                    </button>
                )}
            </div>
        </div>
    );
};
