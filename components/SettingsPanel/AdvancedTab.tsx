/**
 * Advanced Configuration Tab
 * Performance settings, feature flags, and debug options
 */

import React, { useState } from 'react';
import { Sliders, Zap, Save, RotateCcw } from 'lucide-react';
import { useProjectStore } from '../../store/useProjectStore';

interface AdvancedTabProps {
    showToast: (msg: string, type: 'success' | 'error') => void;
}

export const AdvancedTab: React.FC<AdvancedTabProps> = ({ showToast }) => {
    const { globalConfig, updateGlobalConfig } = useProjectStore();
    const [editing, setEditing] = useState(false);

    // 本地临时状态
    const [localConfig, setLocalConfig] = useState({
        virtualScrollThreshold: globalConfig.performance.virtualScrollThreshold,
        inputDebounce: globalConfig.performance.debounce.input,
        searchDebounce: globalConfig.performance.debounce.search,
        syncDebounce: globalConfig.performance.debounce.sync,
        cacheEnabled: globalConfig.performance.cache.enabled,
        enableEchoSystem: globalConfig.features.enableEchoSystem,
        enableKnowledgeGraph: globalConfig.features.enableKnowledgeGraph,
        enableChapterBalance: globalConfig.features.enableChapterBalance,
        enableConflictVisualization: globalConfig.features.enableConflictVisualization,
        enableVirtualScrolling: globalConfig.features.enableVirtualScrolling,
        debugMode: globalConfig.features.debugMode,
        logLevel: globalConfig.features.logLevel,
    });

    const handleSave = async () => {
        try {
            await updateGlobalConfig({
                performance: {
                    virtualScrollThreshold: localConfig.virtualScrollThreshold,
                    debounce: {
                        input: localConfig.inputDebounce,
                        search: localConfig.searchDebounce,
                        sync: localConfig.syncDebounce,
                    },
                    cache: {
                        enabled: localConfig.cacheEnabled,
                        ttl: globalConfig.performance.cache.ttl,
                    },
                },
                features: {
                    enableEchoSystem: localConfig.enableEchoSystem,
                    enableKnowledgeGraph: localConfig.enableKnowledgeGraph,
                    enableChapterBalance: localConfig.enableChapterBalance,
                    enableConflictVisualization: localConfig.enableConflictVisualization,
                    enableVirtualScrolling: localConfig.enableVirtualScrolling,
                    debugMode: localConfig.debugMode,
                    logLevel: localConfig.logLevel,
                },
            });

            // 清除日志缓存，让新配置立即生效
            const { clearLoggerCache } = await import('../../utils/logger');
            clearLoggerCache();

            showToast('高级配置已保存！', 'success');
            setEditing(false);
        } catch (error) {
            showToast('保存失败：' + (error as Error).message, 'error');
        }
    };

    const handleReset = async () => {
        const confirmed = window.confirm('确定要重置为默认配置吗？');
        if (confirmed) {
            setLocalConfig({
                virtualScrollThreshold: 50,
                inputDebounce: 300,
                searchDebounce: 500,
                syncDebounce: 2000,
                cacheEnabled: true,
                enableEchoSystem: true,
                enableKnowledgeGraph: true,
                enableChapterBalance: true,
                enableConflictVisualization: true,
                enableVirtualScrolling: true,
                debugMode: false,
                logLevel: 'warn',
            });
            showToast('已恢复为默认配置', 'success');
        }
    };

    return (
        <div className="p-6 space-y-8">
            {/* Performance */}
            <div>
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Zap size={16} className="text-muse-400" /> 性能
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">虚拟滚动阈值</label>
                        <input
                            type="number"
                            min="10"
                            max="200"
                            step="10"
                            value={localConfig.virtualScrollThreshold}
                            onChange={(e) => setLocalConfig({ ...localConfig, virtualScrollThreshold: parseInt(e.target.value) })}
                            disabled={!editing}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white
                                focus:border-muse-500 outline-none disabled:bg-slate-800/50 disabled:text-slate-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">超过此数量的列表项启用虚拟滚动</p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">输入防抖 (ms)</label>
                        <input
                            type="number"
                            min="100"
                            max="1000"
                            step="50"
                            value={localConfig.inputDebounce}
                            onChange={(e) => setLocalConfig({ ...localConfig, inputDebounce: parseInt(e.target.value) })}
                            disabled={!editing}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white
                                focus:border-muse-500 outline-none disabled:bg-slate-800/50 disabled:text-slate-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">搜索防抖 (ms)</label>
                        <input
                            type="number"
                            min="200"
                            max="2000"
                            step="100"
                            value={localConfig.searchDebounce}
                            onChange={(e) => setLocalConfig({ ...localConfig, searchDebounce: parseInt(e.target.value) })}
                            disabled={!editing}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white
                                focus:border-muse-500 outline-none disabled:bg-slate-800/50 disabled:text-slate-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">同步防抖 (ms)</label>
                        <input
                            type="number"
                            min="500"
                            max="5000"
                            step="500"
                            value={localConfig.syncDebounce}
                            onChange={(e) => setLocalConfig({ ...localConfig, syncDebounce: parseInt(e.target.value) })}
                            disabled={!editing}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white
                                focus:border-muse-500 outline-none disabled:bg-slate-800/50 disabled:text-slate-500"
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={localConfig.cacheEnabled}
                            onChange={(e) => setLocalConfig({ ...localConfig, cacheEnabled: e.target.checked })}
                            disabled={!editing}
                            className="w-4 h-4 text-muse-500 rounded"
                        />
                        <span className="text-sm text-white">启用缓存</span>
                    </label>
                </div>
            </div>

            {/* Feature Flags */}
            <div>
                <h4 className="text-sm font-bold text-white mb-4">功能开关</h4>
                
                <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-800/30 rounded transition-colors">
                        <input
                            type="checkbox"
                            checked={localConfig.enableEchoSystem}
                            onChange={(e) => setLocalConfig({ ...localConfig, enableEchoSystem: e.target.checked })}
                            disabled={!editing}
                            className="w-4 h-4 text-muse-500 rounded"
                        />
                        <span className="text-sm text-white">启用Echo系统</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-800/30 rounded transition-colors">
                        <input
                            type="checkbox"
                            checked={localConfig.enableKnowledgeGraph}
                            onChange={(e) => setLocalConfig({ ...localConfig, enableKnowledgeGraph: e.target.checked })}
                            disabled={!editing}
                            className="w-4 h-4 text-muse-500 rounded"
                        />
                        <span className="text-sm text-white">启用知识图谱</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-800/30 rounded transition-colors">
                        <input
                            type="checkbox"
                            checked={localConfig.enableChapterBalance}
                            onChange={(e) => setLocalConfig({ ...localConfig, enableChapterBalance: e.target.checked })}
                            disabled={!editing}
                            className="w-4 h-4 text-muse-500 rounded"
                        />
                        <span className="text-sm text-white">启用章节平衡分析</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-800/30 rounded transition-colors">
                        <input
                            type="checkbox"
                            checked={localConfig.enableConflictVisualization}
                            onChange={(e) => setLocalConfig({ ...localConfig, enableConflictVisualization: e.target.checked })}
                            disabled={!editing}
                            className="w-4 h-4 text-muse-500 rounded"
                        />
                        <span className="text-sm text-white">启用冲突可视化</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-800/30 rounded transition-colors">
                        <input
                            type="checkbox"
                            checked={localConfig.enableVirtualScrolling}
                            onChange={(e) => setLocalConfig({ ...localConfig, enableVirtualScrolling: e.target.checked })}
                            disabled={!editing}
                            className="w-4 h-4 text-muse-500 rounded"
                        />
                        <span className="text-sm text-white">启用虚拟滚动</span>
                    </label>
                </div>
            </div>

            {/* Debug */}
            <div>
                <h4 className="text-sm font-bold text-white mb-4">调试</h4>
                
                <div className="space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={localConfig.debugMode}
                            onChange={(e) => setLocalConfig({ ...localConfig, debugMode: e.target.checked })}
                            disabled={!editing}
                            className="w-4 h-4 text-muse-500 rounded"
                        />
                        <span className="text-sm text-white">调试模式</span>
                    </label>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">日志级别</label>
                        <select
                            value={localConfig.logLevel}
                            onChange={(e) => setLocalConfig({ ...localConfig, logLevel: e.target.value as 'none' | 'error' | 'warn' | 'info' | 'debug' })}
                            disabled={!editing}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white
                                focus:border-muse-500 outline-none disabled:bg-slate-800/50 disabled:text-slate-500"
                        >
                            <option value="none">None</option>
                            <option value="error">Error</option>
                            <option value="warn">Warn</option>
                            <option value="info">Info</option>
                            <option value="debug">Debug</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-700">
                {editing ? (
                    <>
                        <button
                            onClick={handleSave}
                            className="flex-1 bg-muse-600 hover:bg-muse-500 text-white px-4 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors"
                        >
                            <Save size={16} /> 保存配置
                        </button>
                        <button
                            onClick={() => setEditing(false)}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium text-sm transition-colors"
                        >
                            取消
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setEditing(true)}
                            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
                        >
                            编辑配置
                        </button>
                        <button
                            onClick={handleReset}
                            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors"
                        >
                            <RotateCcw size={16} /> 重置
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};
