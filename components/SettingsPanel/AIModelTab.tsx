/**
 * AI Model Configuration Tab
 * Configure API keys, model names, and task routing
 */

import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Cpu, Save, RotateCcw, Zap } from 'lucide-react';
import { storageService, STORAGE_KEYS } from '../../services/storageService';
import { useProjectStore } from '../../store/useProjectStore';

interface AIModelTabProps {
    showToast: (msg: string, type: 'success' | 'error') => void;
}

export const AIModelTab: React.FC<AIModelTabProps> = ({ showToast }) => {
    const { globalConfig, updateGlobalConfig } = useProjectStore();
    
    const [showGeminiKey, setShowGeminiKey] = useState(false);
    const [showGLMKey, setShowGLMKey] = useState(false);
    const [editing, setEditing] = useState(false);

    // 本地临时状态
    const [localConfig, setLocalConfig] = useState({
        geminiApiKey: '',
        glmApiKey: '',
        geminiFlashModel: globalConfig.ai.providers.gemini.flashModel,
        geminiProModel: globalConfig.ai.providers.gemini.proModel,
        glmModel: globalConfig.ai.providers.glm.model,
        temperature: globalConfig.ai.defaultParams.temperature,
        maxTokens: globalConfig.ai.defaultParams.maxTokens,
        maxRetries: 3,
    });

    // 加载保存的API Key
    useEffect(() => {
        const loadKeys = async () => {
            const geminiKey = await storageService.getItem<string>(STORAGE_KEYS.GEMINI_API_KEY);
            const glmKey = await storageService.getItem<string>(STORAGE_KEYS.GLM_API_KEY);
            setLocalConfig(prev => ({
                ...prev,
                geminiApiKey: geminiKey || '',
                glmApiKey: glmKey || '',
            }));
        };
        loadKeys();
    }, []);

    const handleSave = async () => {
        try {
            // 保存API Keys
            if (localConfig.geminiApiKey.trim()) {
                await storageService.setItem(STORAGE_KEYS.GEMINI_API_KEY, localConfig.geminiApiKey.trim());
            } else {
                await storageService.removeItem(STORAGE_KEYS.GEMINI_API_KEY);
            }

            if (localConfig.glmApiKey.trim()) {
                await storageService.setItem(STORAGE_KEYS.GLM_API_KEY, localConfig.glmApiKey.trim());
            } else {
                await storageService.removeItem(STORAGE_KEYS.GLM_API_KEY);
            }

            // 更新全局配置
            await updateGlobalConfig({
                ai: {
                    providers: {
                        gemini: {
                            apiKey: localConfig.geminiApiKey,
                            flashModel: localConfig.geminiFlashModel,
                            proModel: localConfig.geminiProModel,
                            imageModel: globalConfig.ai.providers.gemini.imageModel,
                        },
                        glm: {
                            apiKey: localConfig.glmApiKey,
                            model: localConfig.glmModel,
                            baseUrl: globalConfig.ai.providers.glm.baseUrl,
                        },
                    },
                    defaultParams: {
                        temperature: localConfig.temperature,
                        maxTokens: localConfig.maxTokens,
                        topP: globalConfig.ai.defaultParams.topP,
                        topK: globalConfig.ai.defaultParams.topK,
                    },
                },
            });

            showToast('AI配置已保存！', 'success');
            setEditing(false);
        } catch (error) {
            showToast('保存失败：' + (error as Error).message, 'error');
        }
    };

    const handleReset = async () => {
        const confirmed = window.confirm('确定要重置为默认配置吗？');
        if (confirmed) {
            await storageService.removeItem(STORAGE_KEYS.GEMINI_API_KEY);
            await storageService.removeItem(STORAGE_KEYS.GLM_API_KEY);
            // TODO: 实现重置全局配置的功能
            showToast('已重置为默认配置', 'success');
            window.location.reload();
        }
    };

    const maskedGeminiKey = localConfig.geminiApiKey 
        ? localConfig.geminiApiKey.slice(0, 6) + '••••••••' + localConfig.geminiApiKey.slice(-4) 
        : '';
    const maskedGLMKey = localConfig.glmApiKey 
        ? localConfig.glmApiKey.slice(0, 6) + '••••••••' + localConfig.glmApiKey.slice(-4) 
        : '';

    return (
        <div className="p-6 space-y-8">
            {/* API Keys */}
            <div>
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Key size={16} className="text-muse-400" /> API 密钥
                </h4>
                
                {/* Gemini API Key */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">Gemini API Key</label>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <input
                                    type={showGeminiKey ? 'text' : 'password'}
                                    value={editing ? localConfig.geminiApiKey : maskedGeminiKey}
                                    onChange={(e) => setLocalConfig({ ...localConfig, geminiApiKey: e.target.value })}
                                    disabled={!editing}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white
                                        focus:border-muse-500 outline-none disabled:bg-slate-800/50 disabled:text-slate-500"
                                    placeholder="sk-..."
                                />
                            </div>
                            <button
                                onClick={() => setShowGeminiKey(!showGeminiKey)}
                                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                                {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* GLM API Key */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">GLM API Key</label>
                        <div className="flex gap-2">
                            <div className="flex-1 relative">
                                <input
                                    type={showGLMKey ? 'text' : 'password'}
                                    value={editing ? localConfig.glmApiKey : maskedGLMKey}
                                    onChange={(e) => setLocalConfig({ ...localConfig, glmApiKey: e.target.value })}
                                    disabled={!editing}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white
                                        focus:border-muse-500 outline-none disabled:bg-slate-800/50 disabled:text-slate-500"
                                    placeholder="sk-..."
                                />
                            </div>
                            <button
                                onClick={() => setShowGLMKey(!showGLMKey)}
                                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                            >
                                {showGLMKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Model Selection */}
            <div>
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Cpu size={16} className="text-muse-400" /> 模型选择
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">Gemini Flash 模型</label>
                        <input
                            type="text"
                            value={localConfig.geminiFlashModel}
                            onChange={(e) => setLocalConfig({ ...localConfig, geminiFlashModel: e.target.value })}
                            disabled={!editing}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white
                                focus:border-muse-500 outline-none disabled:bg-slate-800/50 disabled:text-slate-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">Gemini Pro 模型</label>
                        <input
                            type="text"
                            value={localConfig.geminiProModel}
                            onChange={(e) => setLocalConfig({ ...localConfig, geminiProModel: e.target.value })}
                            disabled={!editing}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white
                                focus:border-muse-500 outline-none disabled:bg-slate-800/50 disabled:text-slate-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">GLM 模型</label>
                        <input
                            type="text"
                            value={localConfig.glmModel}
                            onChange={(e) => setLocalConfig({ ...localConfig, glmModel: e.target.value })}
                            disabled={!editing}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white
                                focus:border-muse-500 outline-none disabled:bg-slate-800/50 disabled:text-slate-500"
                        />
                    </div>
                </div>
            </div>

            {/* Request Parameters */}
            <div>
                <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Zap size={16} className="text-muse-400" /> 请求参数
                </h4>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">温度 (Temperature)</label>
                        <input
                            type="number"
                            min="0"
                            max="2"
                            step="0.1"
                            value={localConfig.temperature}
                            onChange={(e) => setLocalConfig({ ...localConfig, temperature: parseFloat(e.target.value) })}
                            disabled={!editing}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white
                                focus:border-muse-500 outline-none disabled:bg-slate-800/50 disabled:text-slate-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">控制创造性：0=确定性，2=高创造性</p>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">最大长度 (Max Tokens)</label>
                        <input
                            type="number"
                            min="100"
                            max="8000"
                            step="100"
                            value={localConfig.maxTokens}
                            onChange={(e) => setLocalConfig({ ...localConfig, maxTokens: parseInt(e.target.value) })}
                            disabled={!editing}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white
                                focus:border-muse-500 outline-none disabled:bg-slate-800/50 disabled:text-slate-500"
                        />
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
