/**
 * Muse Settings Panel - Multi-Tab Version
 * Centralized configuration center with tabbed interface
 */

import React, { useState } from 'react';
import { Settings, X, Cpu, Database, Sliders, Info, Sparkles } from 'lucide-react';
import { AIModelTab } from './AIModelTab';
import { StorageTab } from './StorageTab';
import { AdvancedTab } from './AdvancedTab';
import { AdvancedModeTab } from './AdvancedModeTab';
import { AboutTab } from './AboutTab';

interface SettingsPanelProps {
  onClose: () => void;
}

type TabId = 'ai' | 'storage' | 'advanced' | 'mode' | 'about';

const TABS = [
  { id: 'ai' as TabId, label: 'AI模型', icon: Cpu },
  { id: 'storage' as TabId, label: '存储同步', icon: Database },
  { id: 'advanced' as TabId, label: '高级', icon: Sliders },
  { id: 'mode' as TabId, label: '模式', icon: Sparkles },
  { id: 'about' as TabId, label: '关于', icon: Info },
];

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<TabId>('ai');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'ai':
        return <AIModelTab showToast={showToast} />;
      case 'storage':
        return <StorageTab showToast={showToast} />;
      case 'advanced':
        return <AdvancedTab showToast={showToast} />;
      case 'mode':
        return <AdvancedModeTab />;
      case 'about':
        return <AboutTab />;
      default:
        return <AIModelTab showToast={showToast} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl h-[700px] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800 flex-shrink-0">
          <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
            <Settings size={20} className="text-muse-400" /> 全局配置中心
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-700 bg-slate-800/50 flex-shrink-0">
          <div className="flex">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all relative
                                        ${
                                          isActive
                                            ? 'text-white'
                                            : 'text-slate-400 hover:text-slate-300'
                                        }`}
                >
                  <Icon size={16} />
                  {tab.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muse-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">{renderTabContent()}</div>

        {/* Toast */}
        {toast && (
          <div
            className={`absolute bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg font-medium text-sm flex items-center gap-2
                        ${
                          toast.type === 'success'
                            ? 'bg-green-500/90 text-white'
                            : 'bg-red-500/90 text-white'
                        }`}
          >
            {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
};
