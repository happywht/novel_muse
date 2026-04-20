import React from 'react';
import { X, User, MapPin, Sidebar } from 'lucide-react';
import { ProjectState } from '@/types';

interface ReferenceSidebarProps {
    project: ProjectState;
    showReference: boolean;
    onClose: () => void;
}

export const ReferenceSidebar: React.FC<ReferenceSidebarProps> = ({
    project,
    showReference,
    onClose
}) => {
    return (
        <div
            className={`fixed right-0 top-16 bottom-0 bg-slate-900 border-l border-slate-700 shadow-2xl z-40 transition-all duration-300 transform ${
                showReference ? 'translate-x-0 w-80' : 'translate-x-full w-0'
            }`}
        >
            <div className="flex flex-col h-full w-80">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Sidebar size={18} /> 设定全知视角
                    </h3>
                    <button onClick={onClose}>
                        <X size={18} className="text-slate-400 hover:text-white" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                    {/* 核心角色 */}
                    <div>
                        <h4 className="text-indigo-400 text-xs font-bold uppercase mb-2 flex items-center gap-1">
                            <User size={12} /> 核心角色
                        </h4>
                        {(project.characters || []).length === 0 && (
                            <p className="text-slate-600 text-xs">暂无角色。</p>
                        )}
                        <div className="space-y-3">
                            {(project.characters || []).map(c => (
                                <div key={c.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                    <div className="flex justify-between">
                                        <span className="text-slate-200 font-bold text-sm">{c.name}</span>
                                        <span className="text-xs text-slate-500">{c.role}</span>
                                    </div>
                                    {c.archetype && (
                                        <div className="mt-1 text-xs text-slate-400">
                                            原型: {c.archetype}
                                        </div>
                                    )}
                                    {c.description && (
                                        <div className="mt-2 text-xs text-slate-300 leading-relaxed">
                                            {c.description.slice(0, 150)}
                                            {c.description.length > 150 && '...'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 世界设定 */}
                    <div>
                        <h4 className="text-emerald-400 text-xs font-bold uppercase mb-2 flex items-center gap-1">
                            <MapPin size={12} /> 世界设定
                        </h4>
                        {(project.worldSettings || []).length === 0 && (
                            <p className="text-slate-600 text-xs">暂无世界设定。</p>
                        )}
                        <div className="space-y-3">
                            {(project.worldSettings || []).map(w => (
                                <div key={w.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-slate-200 font-bold text-sm">{w.title}</span>
                                        <span className="text-[9px] px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">
                                            {w.category}
                                        </span>
                                    </div>
                                    {w.content && (
                                        <div className="text-xs text-slate-300 leading-relaxed">
                                            {w.content.slice(0, 150)}
                                            {w.content.length > 150 && '...'}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 创作设定 */}
                    <div>
                        <h4 className="text-amber-400 text-xs font-bold uppercase mb-2">
                            ⚙️ 创作设定
                        </h4>
                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 space-y-2">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">类型:</span>
                                <span className="text-slate-200">{project.genre}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">基调:</span>
                                <span className="text-slate-200">{project.creativeSettings.tone}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">风格:</span>
                                <span className="text-slate-200">{project.creativeSettings.style}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-400">创意度:</span>
                                <span className="text-slate-200">
                                    {Math.round(project.creativeSettings.creativity * 100)}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
