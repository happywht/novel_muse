/**
 * PromptPanel Component
 * 用于在各个模块中显示和配置相关的Prompt模板
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Info, ChevronDown, ChevronUp, Save, RotateCcw } from 'lucide-react';
import { AppSection } from '@/types';
import { PromptPanelProps } from '../types/promptPanel';
import { PROMPT_REGISTRY_LITERARY, PROMPT_REGISTRY_WEB_NOVEL, PromptTemplate } from '@/config/prompts';
import { PromptService } from '@/services/promptService';
import { useFeatureFlags } from '@/contexts/FeatureFlagContext';

// Drafting模块相关的prompt keys
const DRAFTING_PROMPT_KEYS = [
  'scene_expansion',
  'scene_generation',
  'polish_engine',
  'world_echo_extraction',
];

// Outliner模块相关的prompt keys
const OUTLINER_PROMPT_KEYS = [
  'plot_fission',
  'plot_rewrite',
  'audit_plot',
];

// Character模块相关的prompt keys
const CHARACTER_PROMPT_KEYS = [
  'character_gen',
];

// Echoes模块相关的prompt keys
const ECHOES_PROMPT_KEYS = [
  'world_echo_extraction',
  'plot_analysis',
];

// World模块相关的prompt keys
const WORLD_PROMPT_KEYS = [
  'batch_generate_settings',
  'expand_world_lore',
  'deduce_world_consequences',
];

export const PromptPanel: React.FC<PromptPanelProps> = ({
  moduleId,
  compact = false,
  defaultCollapsed = false,
  onPromptChange,
  onParameterChange,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [selectedPromptKey, setSelectedPromptKey] = useState<string>('');
  const [editedInstruction, setEditedInstruction] = useState<string>('');
  const [parameterValues, setParameterValues] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  const { isEnabled } = useFeatureFlags();
  const promptService = PromptService.getInstance();
  const canEditPrompts = isEnabled('promptEditing');

  // 根据moduleId获取相关的prompt keys
  const relevantPromptKeys = useMemo(() => {
    if (moduleId === AppSection.DRAFTING) {
      return DRAFTING_PROMPT_KEYS;
    }
    if (moduleId === AppSection.OUTLINER) {
      return OUTLINER_PROMPT_KEYS;
    }
    if (moduleId === AppSection.CHARACTERS) {
      return CHARACTER_PROMPT_KEYS;
    }
    if (moduleId === AppSection.ECHOES) {
      return ECHOES_PROMPT_KEYS;
    }
    if (moduleId === AppSection.WORLD) {
      return WORLD_PROMPT_KEYS;
    }
    // 其他模块可以根据需要扩展
    return [];
  }, [moduleId]);

  // 获取prompt registry (根据项目设置，这里暂时使用LITERARY)
  const prompts = useMemo(() => {
    const registry: Record<string, PromptTemplate> = {};
    for (const key of relevantPromptKeys) {
      const template = PROMPT_REGISTRY_LITERARY[key];
      if (template) {
        registry[key] = template;
      }
    }
    return registry;
  }, [relevantPromptKeys]);

  // 初始化选中第一个prompt
  useEffect(() => {
    if (relevantPromptKeys.length > 0 && !selectedPromptKey) {
      const firstKey = relevantPromptKeys[0];
      setSelectedPromptKey(firstKey);
      const template = prompts[firstKey];
      if (template) {
        setEditedInstruction(template.instruction);
        // 初始化参数默认值
        const defaults: Record<string, any> = {};
        template.parameters?.forEach(param => {
          defaults[param.name] = param.default;
        });
        setParameterValues(defaults);
      }
    }
  }, [relevantPromptKeys, prompts, selectedPromptKey]);

  // 选中prompt时更新编辑器内容
  const handleSelectPrompt = (key: string) => {
    setSelectedPromptKey(key);
    const template = prompts[key];
    if (template) {
      setEditedInstruction(template.instruction);
      // 重置参数为默认值
      const defaults: Record<string, any> = {};
      template.parameters?.forEach(param => {
        defaults[param.name] = param.default;
      });
      setParameterValues(defaults);
    }
  };

  // 参数变更处理
  const handleParameterChange = (paramName: string, value: any) => {
    setParameterValues(prev => ({
      ...prev,
      [paramName]: value,
    }));
    onParameterChange?.(paramName, value);
  };

  // 保存自定义prompt
  const handleSave = async () => {
    if (!selectedPromptKey || !editedInstruction.trim()) return;

    setIsSaving(true);
    try {
      await promptService.saveCustomPrompt(
        selectedPromptKey,
        editedInstruction,
        '用户在DraftingRoom编辑'
      );
      onPromptChange?.(selectedPromptKey, editedInstruction);
    } catch (error) {
      console.error('Failed to save prompt:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 重置为默认prompt
  const handleReset = async () => {
    try {
      await promptService.resetToDefault(selectedPromptKey);
      const template = prompts[selectedPromptKey];
      if (template) {
        setEditedInstruction(template.instruction);
      }
    } catch (error) {
      console.error('Failed to reset prompt:', error);
    }
  };

  const selectedPrompt = prompts[selectedPromptKey];

  if (Object.keys(prompts).length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex justify-between items-center p-3 text-slate-300 hover:text-white transition-colors"
      >
        <div className="flex items-center gap-2 font-medium text-sm">
          <Sparkles size={16} className="text-purple-400" />
          <span>Prompt 配置</span>
          {!isCollapsed && (
            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">
              {Object.keys(prompts).length} 个模板
            </span>
          )}
        </div>
        {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="border-t border-slate-700 p-3 space-y-3">
          {/* Prompt Selector */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(prompts).map(([key, prompt]) => (
              <button
                key={key}
                onClick={() => handleSelectPrompt(key)}
                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                  selectedPromptKey === key
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50'
                    : 'bg-slate-900/50 text-slate-400 border border-slate-700/50 hover:border-slate-600'
                }`}
              >
                {prompt.label}
              </button>
            ))}
          </div>

          {/* Selected Prompt Details */}
          {selectedPrompt && (
            <div className="space-y-3">
              {/* Description */}
              <div className="bg-slate-900/30 rounded-lg p-2.5 border border-slate-700/50">
                <div className="flex items-start gap-2">
                  <Info size={12} className="text-slate-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    {selectedPrompt.description}
                  </p>
                </div>
              </div>

              {/* Parameters */}
              {selectedPrompt.parameters && selectedPrompt.parameters.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-medium">
                    参数配置
                  </label>
                  {selectedPrompt.parameters.map(param => (
                    <div key={param.name} className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-slate-300">{param.label}</span>
                      {param.type === 'slider' && (
                        <div className="flex items-center gap-2 flex-1 max-w-[150px]">
                          <input
                            type="range"
                            min={param.min}
                            max={param.max}
                            step={param.step}
                            value={parameterValues[param.name] ?? param.default}
                            onChange={(e) => handleParameterChange(param.name, parseFloat(e.target.value))}
                            className="flex-1 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                          />
                          <span className="text-[9px] text-slate-400 w-8 text-right font-mono">
                            {(parameterValues[param.name] ?? param.default).toFixed(1)}
                          </span>
                        </div>
                      )}
                      {param.type === 'select' && (
                        <select
                          value={parameterValues[param.name] ?? param.default}
                          onChange={(e) => handleParameterChange(param.name, e.target.value)}
                          className="bg-slate-900/50 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-300 outline-none focus:border-purple-500"
                        >
                          {param.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}
                      {param.type === 'toggle' && (
                        <button
                          onClick={() => handleParameterChange(param.name, !parameterValues[param.name])}
                          className={`relative w-8 h-4 rounded-full transition-colors ${
                            parameterValues[param.name] ? 'bg-purple-600' : 'bg-slate-700'
                          }`}
                        >
                          <div
                            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                              parameterValues[param.name] ? 'translate-x-4' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Instruction Editor (Premium Only) */}
              {canEditPrompts && (
                <div className="space-y-2">
                  <label className="text-[10px] text-slate-400 font-medium">
                    系统指令 (高级版可编辑)
                  </label>
                  <textarea
                    value={editedInstruction}
                    onChange={(e) => setEditedInstruction(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-slate-200 text-[10px] focus:ring-1 focus:ring-purple-500 outline-none resize-none h-32 font-mono"
                    placeholder="编辑系统提示词..."
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleReset}
                      className="px-2 py-1 text-[9px] bg-slate-700 hover:bg-slate-600 text-slate-300 rounded flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw size={10} />
                      重置
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !editedInstruction.trim()}
                      className="px-2 py-1 text-[9px] bg-purple-600 hover:bg-purple-500 text-white rounded flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <Save size={10} />
                      {isSaving ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              )}

              {/* Non-premium hint */}
              {!canEditPrompts && (
                <div className="text-[9px] text-slate-500 italic text-center py-2 border-t border-slate-700/50">
                  升级到高级版可自定义Prompt指令
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PromptPanel;
