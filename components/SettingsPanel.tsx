import React, { useState, useEffect } from 'react';
import { Settings, Key, Cpu, X, Eye, EyeOff, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

const STORAGE_KEY_API = 'muse_gemini_api_key';
const STORAGE_KEY_MODEL = 'muse_gemini_model';

interface SettingsPanelProps {
    onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
    const [apiKey, setApiKey] = useState('');
    const [modelOverride, setModelOverride] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        setApiKey(localStorage.getItem(STORAGE_KEY_API) || '');
        setModelOverride(localStorage.getItem(STORAGE_KEY_MODEL) || '');
    }, []);

    const showToast = (msg: string, type: 'success' | 'error') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem(STORAGE_KEY_API, apiKey.trim());
        } else {
            localStorage.removeItem(STORAGE_KEY_API);
        }

        if (modelOverride.trim()) {
            localStorage.setItem(STORAGE_KEY_MODEL, modelOverride.trim());
        } else {
            localStorage.removeItem(STORAGE_KEY_MODEL);
        }

        showToast("设置已保存！", "success");
    };

    const handleClear = () => {
        localStorage.removeItem(STORAGE_KEY_API);
        localStorage.removeItem(STORAGE_KEY_MODEL);
        setApiKey('');
        setModelOverride('');
        showToast("已清除所有配置", "success");
    };

    const maskedKey = apiKey ? apiKey.slice(0, 6) + '••••••••' + apiKey.slice(-4) : '';

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800">
                    <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                        <Settings size={20} className="text-muse-400" /> 全局配置中心
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* API Key Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Key size={16} className="text-amber-400" />
                            <label className="text-sm font-bold text-white">Gemini API Key</label>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            输入您的 Google Gemini API 密钥。密钥仅存储在本地浏览器中，不会上传到任何服务器。
                        </p>
                        <div className="relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 pr-12 text-white text-sm font-mono focus:border-muse-500 outline-none transition-colors"
                                placeholder="AIzaSy..."
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                                title={showKey ? '隐藏密钥' : '显示密钥'}
                            >
                                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {apiKey && !showKey && (
                            <div className="text-xs text-slate-600 font-mono">{maskedKey}</div>
                        )}
                        <a
                            href="https://aistudio.google.com/apikey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-muse-400 hover:text-muse-300 transition-colors"
                        >
                            <ExternalLink size={12} /> 前往 Google AI Studio 获取免费 API Key
                        </a>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-800"></div>

                    {/* Model Override Section */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Cpu size={16} className="text-sky-400" />
                            <label className="text-sm font-bold text-white">模型名称覆盖 <span className="text-slate-500 font-normal">(高级)</span></label>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            可选。覆盖默认使用的大模型名称。留空则使用系统默认模型。
                        </p>
                        <input
                            type="text"
                            value={modelOverride}
                            onChange={(e) => setModelOverride(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white text-sm font-mono focus:border-muse-500 outline-none transition-colors"
                            placeholder="例如: gemini-2.5-flash-preview-05-20"
                        />
                        <div className="text-xs text-slate-600">
                            当前默认: <code className="text-slate-400">gemini-2.5-flash / gemini-2.5-pro</code>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-700 bg-slate-950/30 flex justify-between items-center">
                    <button
                        onClick={handleClear}
                        className="text-sm text-red-400/70 hover:text-red-400 transition-colors"
                    >
                        清除所有配置
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
                        >
                            取消
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-5 py-2 rounded-lg bg-muse-600 hover:bg-muse-500 text-white font-bold shadow-lg text-sm"
                        >
                            保存设置
                        </button>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-[60] animate-fade-in font-medium text-sm flex items-center gap-2 border ${toast.type === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-200' : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-200'}`}>
                    {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                    <span>{toast.msg}</span>
                </div>
            )}
        </div>
    );
};
