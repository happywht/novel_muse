import React from 'react';
import { User, Globe, Wand2, Zap, Swords, Loader2 } from 'lucide-react';
import { usePlotCard } from './PlotCardContext';

export const PlotCardActions: React.FC = () => {
    const {
        node,
        editingNodeId,
        isIterating,
        showEntitySelector,
        showConflictConfigurator,
        handleGenerateNodeAI,
        handleQuickDraft,
        setShowEntitySelector,
        setShowConflictConfigurator
    } = usePlotCard();

    return (
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
        </div>
    );
};
