/**
 * PromptConfirmDialog - AI调用确认对话框
 * 高级版功能：在AI调用前展示完整的prompt，允许用户编辑和确认
 */

import React, { useState, useEffect } from 'react';
import { X, Send, Edit3, RotateCcw, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { AICallContext, confirmAICall, cancelAICall, AI_CONFIRMATION_EVENT } from '../../services/aiCallInterceptor';
import { isFeatureEnabled } from '../../config/featureFlags';

export const PromptConfirmDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<AICallContext | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSystem, setEditedSystem] = useState('');
  const [editedPrompt, setEditedPrompt] = useState('');
  const [editedTemp, setEditedTemp] = useState(0.9);
  const [showSystem, setShowSystem] = useState(false);

  // 监听确认事件
  useEffect(() => {
    const handleConfirmRequired = (e: CustomEvent<AICallContext>) => {
      setContext(e.detail);
      setEditedSystem(e.detail.systemInstruction);
      setEditedPrompt(e.detail.userPrompt);
      setEditedTemp(e.detail.temperature);
      setIsOpen(true);
      setIsEditing(false);
    };

    window.addEventListener(AI_CONFIRMATION_EVENT, handleConfirmRequired as EventListener);
    return () => window.removeEventListener(AI_CONFIRMATION_EVENT, handleConfirmRequired as EventListener);
  }, []);

  // 确认发送
  const handleConfirm = () => {
    confirmAICall({
      approved: true,
      modifiedSystemInstruction: isEditing ? editedSystem : undefined,
      modifiedUserPrompt: isEditing ? editedPrompt : undefined,
      modifiedTemperature: isEditing ? editedTemp : undefined,
    });
    setIsOpen(false);
  };

  // 取消
  const handleCancel = () => {
    cancelAICall();
    setIsOpen(false);
  };

  // 恢复默认
  const handleReset = () => {
    if (context) {
      setEditedSystem(context.systemInstruction);
      setEditedPrompt(context.userPrompt);
      setEditedTemp(context.temperature);
    }
  };

  // 复制到剪贴板
  const handleCopy = async () => {
    const fullPrompt = `=== System Instruction ===\n${editedSystem}\n\n=== User Prompt ===\n${editedPrompt}`;
    await navigator.clipboard.writeText(fullPrompt);
  };

  // Token估算
  const estimateTokens = (text: string) => Math.ceil(text.length / 2);
  const totalTokens = estimateTokens(editedSystem) + estimateTokens(editedPrompt);

  if (!isOpen || !context) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-purple-900/30 to-cyan-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Send size={20} className="text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">AI调用确认</h2>
                <p className="text-xs text-slate-400">任务: {context.taskType} | 模型: {context.model}</p>
              </div>
            </div>
            <button onClick={handleCancel} className="text-slate-400 hover:text-white text-xl px-2">&times;</button>
          </div>
        </div>

        {/* 参数栏 */}
        <div className="px-4 py-2 bg-slate-800/50 flex items-center gap-4 text-xs">
          <span className="text-slate-400">温度: <span className="text-white">{editedTemp.toFixed(1)}</span></span>
          <span className="text-slate-400">预估Tokens: <span className="text-cyan-400">{totalTokens.toLocaleString()}</span></span>
          <button onClick={handleCopy} className="ml-auto text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
            <Copy size={12} /> 复制完整Prompt
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 系统指令 */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <button
              onClick={() => setShowSystem(!showSystem)}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition-colors"
            >
              <span className="text-sm font-medium text-slate-300">系统指令 ({estimateTokens(editedSystem)} tokens)</span>
              {showSystem ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>
            {showSystem && (
              <div className="p-3 border-t border-slate-700">
                {isEditing ? (
                  <textarea
                    value={editedSystem}
                    onChange={(e) => setEditedSystem(e.target.value)}
                    className="w-full h-48 bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white font-mono resize-none focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    placeholder="系统指令..."
                  />
                ) : (
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{editedSystem}</pre>
                )}
              </div>
            )}
          </div>

          {/* 用户Prompt */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <div className="p-3 border-b border-slate-700">
              <span className="text-sm font-medium text-slate-300">用户Prompt ({estimateTokens(editedPrompt)} tokens)</span>
            </div>
            <div className="p-3">
              {isEditing ? (
                <textarea
                  value={editedPrompt}
                  onChange={(e) => setEditedPrompt(e.target.value)}
                  className="w-full h-64 bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white font-mono resize-none focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  placeholder="用户提示词..."
                />
              ) : (
                <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">{editedPrompt}</pre>
              )}
            </div>
          </div>

          {/* 温度滑块（编辑模式） */}
          {isEditing && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-3">
              <label className="text-sm font-medium text-slate-300 block mb-2">
                温度: {editedTemp.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={editedTemp}
                onChange={(e) => setEditedTemp(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>精确 (0)</span>
                <span>创意 (1)</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <button
                onClick={handleReset}
                className="px-3 py-2 text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={12} /> 恢复默认
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-2 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Edit3 size={12} /> 编辑
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-purple-500/20"
            >
              <Send size={14} />
              确认发送
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromptConfirmDialog;
