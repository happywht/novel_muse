/**
 * Prompt Editor Panel
 * Prompt编辑器面板 - 高级版专属功能
 */

import React, { useState, useEffect } from 'react';
import { PromptService, CustomPrompt } from '../services/promptService';
import { useFeatureFlags, PremiumOnly } from '../contexts/FeatureFlagContext';
import { Save, RotateCcw, Clock, Trash2 } from 'lucide-react';

export const PromptEditorPanel: React.FC = () => {
  const [prompts, setPrompts] = useState<Record<string, any>>({});
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [editedInstruction, setEditedInstruction] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  const { isEnabled } = useFeatureFlags();
  const promptService = PromptService.getInstance();

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    const allPrompts = await promptService.getAllPrompts();
    setPrompts(allPrompts);

    // 默认选中第一个
    const firstKey = Object.keys(allPrompts)[0];
    if (firstKey) {
      setSelectedKey(firstKey);
      setEditedInstruction(allPrompts[firstKey].instruction);
    }
  };

  const handleSelectPrompt = (key: string) => {
    setSelectedKey(key);
    setEditedInstruction(prompts[key].instruction);
  };

  const handleSave = async () => {
    if (!selectedKey || !editedInstruction.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await promptService.saveCustomPrompt(
        selectedKey,
        editedInstruction,
        '用户手动编辑'
      );

      // 重新加载prompts
      await loadPrompts();

      alert('Prompt保存成功！');
    } catch (error) {
      console.error('Failed to save prompt:', error);
      alert('保存失败：' + (error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('确定要重置为默认Prompt吗？此操作不可撤销。')) {
      return;
    }

    try {
      await promptService.resetToDefault(selectedKey);
      await loadPrompts();
      alert('已重置为默认Prompt');
    } catch (error) {
      console.error('Failed to reset prompt:', error);
      alert('重置失败：' + (error as Error).message);
    }
  };

  const selectedPrompt = prompts[selectedKey];
  const isCustom = selectedPrompt?.isCustom;

  return (
    <div className="h-full flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold">Prompt 编辑器</h2>
        <p className="text-sm text-gray-400 mt-1">
          自定义AI的系统提示词，完全掌控生成逻辑
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Prompt List */}
        <div className="w-64 border-r border-gray-700 overflow-y-auto">
          <div className="p-3">
            <h3 className="text-sm font-medium text-gray-400 mb-2">
              可用的Prompt模板
            </h3>
            <div className="space-y-1">
              {Object.entries(prompts).map(([key, prompt]) => (
                <button
                  key={key}
                  onClick={() => handleSelectPrompt(key)}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    selectedKey === key
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm truncate">{prompt.label || key}</span>
                    {prompt.isCustom && (
                      <span className="text-xs bg-purple-500 px-1.5 py-0.5 rounded">
                        自定义
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content - Editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedPrompt ? (
            <>
              {/* Prompt Info */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{selectedPrompt.label}</h3>
                  {isCustom && (
                    <span className="text-xs bg-purple-500 px-2 py-1 rounded">
                      已自定义
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400">
                  {selectedPrompt.description}
                </p>
              </div>

              {/* Editor */}
              <div className="flex-1 p-4 overflow-y-auto">
                <textarea
                  value={editedInstruction}
                  onChange={(e) => setEditedInstruction(e.target.value)}
                  className="w-full h-full bg-gray-800 text-white p-4 rounded border border-gray-700 focus:border-purple-500 focus:outline-none font-mono text-sm resize-none"
                  placeholder="编辑系统提示词..."
                  disabled={!isEnabled('promptEditing')}
                />
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-gray-700 flex items-center justify-between">
                <div className="flex gap-2">
                  {isCustom && (
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-2"
                    >
                      <RotateCcw size={16} />
                      重置为默认
                    </button>
                  )}
                  {isEnabled('callHistoryTracking') && (
                    <button
                      onClick={() => setShowVersionHistory(!showVersionHistory)}
                      className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-2"
                    >
                      <Clock size={16} />
                      版本历史
                    </button>
                  )}
                </div>

                <button
                  onClick={handleSave}
                  disabled={isSaving || !editedInstruction.trim()}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={16} />
                  {isSaving ? '保存中...' : '保存'}
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              请从左侧选择一个Prompt模板
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 包装器：仅在高级版显示
export const PremiumPromptEditorPanel: React.FC = () => {
  return (
    <PremiumOnly fallback={<UpgradePrompt />}>
      <PromptEditorPanel />
    </PremiumOnly>
  );
};

// 升级提示组件
const UpgradePrompt: React.FC = () => {
  return (
    <div className="h-full flex items-center justify-center bg-gray-900 text-white p-8">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">🎨</div>
        <h2 className="text-2xl font-bold mb-2">Prompt编辑器</h2>
        <p className="text-gray-400 mb-6">
          自定义AI的系统提示词，完全掌控内容生成逻辑。这是高级版专属功能。
        </p>
        <button className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          升级到高级版
        </button>
      </div>
    </div>
  );
};
