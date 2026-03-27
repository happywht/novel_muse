/**
 * AI Call Confirmation Dialog
 * AI调用确认对话框 - 高级版专属功能
 */

import React, { useState, useEffect } from 'react';
import { AICallInterceptor, AICallContext } from '../services/aiCallInterceptor';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';
import { X, Check, Edit, AlertCircle } from 'lucide-react';

export const AICallConfirmDialog: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [context, setContext] = useState<AICallContext | null>(null);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const { isEnabled } = useFeatureFlags();
  const interceptor = AICallInterceptor.getInstance();

  useEffect(() => {
    // 监听AI调用拦截事件
    const handleIntercept = (event: CustomEvent<AICallContext>) => {
      setContext(event.detail);
      setEditedPrompt(event.detail.prompt);
      setIsVisible(true);
    };

    window.addEventListener('ai-call-intercepted', handleIntercept as EventListener);

    return () => {
      window.removeEventListener('ai-call-intercepted', handleIntercept as EventListener);
    };
  }, []);

  // 如果功能未启用，不渲染组件
  if (!isEnabled('callConfirmation')) {
    return null;
  }

  const handleApprove = () => {
    const modifiedPrompt = isEditing && editedPrompt !== context?.prompt
      ? editedPrompt
      : undefined;

    interceptor.approveCall(modifiedPrompt);
    setIsVisible(false);
    setIsEditing(false);
  };

  const handleReject = () => {
    interceptor.rejectCall();
    setIsVisible(false);
    setIsEditing(false);
  };

  const handleToggleEdit = () => {
    setIsEditing(!isEditing);
    if (!isEditing) {
      setEditedPrompt(context?.prompt || '');
    }
  };

  if (!isVisible || !context) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <AlertCircle className="text-yellow-500" />
            AI调用确认
          </h2>
          <button
            onClick={handleReject}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Task Type */}
        <div className="mb-4">
          <span className="text-sm text-gray-400">任务类型：</span>
          <span className="ml-2 text-white font-medium">{context.taskType}</span>
        </div>

        {/* Prompt Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-400">系统提示词：</label>
            {isEnabled('promptEditing') && (
              <button
                onClick={handleToggleEdit}
                className={`text-sm px-3 py-1 rounded flex items-center gap-1 transition-colors ${
                  isEditing
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Edit size={14} />
                {isEditing ? '编辑中' : '编辑'}
              </button>
            )}
          </div>

          {isEditing ? (
            <textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="w-full h-64 bg-gray-900 text-white p-3 rounded border border-gray-700 focus:border-purple-500 focus:outline-none font-mono text-sm"
              placeholder="编辑系统提示词..."
            />
          ) : (
            <div className="bg-gray-900 p-3 rounded border border-gray-700 max-h-64 overflow-y-auto">
              <pre className="text-gray-300 whitespace-pre-wrap text-sm">
                {context.prompt}
              </pre>
            </div>
          )}
        </div>

        {/* Parameters Preview */}
        {context.params && Object.keys(context.params).length > 0 && (
          <div className="mb-6">
            <label className="text-sm text-gray-400 block mb-2">调用参数：</label>
            <div className="bg-gray-900 p-3 rounded border border-gray-700">
              <pre className="text-gray-300 text-sm">
                {JSON.stringify(context.params, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded p-3 mb-6">
          <p className="text-yellow-200 text-sm">
            请仔细检查提示词和参数，确认无误后再执行AI调用。
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleReject}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors flex items-center gap-2"
          >
            <X size={18} />
            取消
          </button>
          <button
            onClick={handleApprove}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Check size={18} />
            确认执行
          </button>
        </div>
      </div>
    </div>
  );
};
