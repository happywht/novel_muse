/**
 * PromptConfirmDialog - AI调用确认对话框
 * 高级版功能：在AI调用前展示完整的prompt，允许用户编辑和确认
 * 支持模板视图和完整视图切换
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Send,
  Edit3,
  RotateCcw,
  Copy,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Maximize2,
} from 'lucide-react';
import {
  AICallContext,
  confirmAICall,
  cancelAICall,
  AI_CONFIRMATION_EVENT,
} from '../../services/aiCallInterceptor';

/** 解析出的区块结构 */
interface ParsedSection {
  id: string;
  title: string;
  content: string;
  icon: string;
  tier: 'critical' | 'important' | 'optional';
  tokenCount: number;
  isExpanded: boolean;
}

/** 变量卡片数据 */
interface VariableCard {
  key: string;
  label: string;
  value: string;
  preview: string;
  tokenCount: number;
  tier: 'critical' | 'important' | 'optional';
  source: string;
}

export const PromptConfirmDialog: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [context, setContext] = useState<AICallContext | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSystem, setEditedSystem] = useState('');
  const [editedPrompt, setEditedPrompt] = useState('');
  const [editedTemp, setEditedTemp] = useState(0.9);
  const [showSystem, setShowSystem] = useState(false);

  // 新增：视图模式
  const [viewMode, setViewMode] = useState<'template' | 'full'>('template');
  // 新增：展开的区块
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['critical']));
  // 新增：选中的变量详情
  const [selectedVariable, setSelectedVariable] = useState<VariableCard | null>(null);

  // 监听确认事件
  useEffect(() => {
    const handleConfirmRequired = (e: CustomEvent<AICallContext>) => {
      setContext(e.detail);
      setEditedSystem(e.detail.systemInstruction);
      setEditedPrompt(e.detail.userPrompt);
      setEditedTemp(e.detail.temperature);
      setIsOpen(true);
      setIsEditing(false);
      setViewMode('template'); // 默认模板视图
      setExpandedSections(new Set(['critical'])); // 默认展开核心区块
    };

    window.addEventListener(AI_CONFIRMATION_EVENT, handleConfirmRequired as EventListener);
    return () =>
      window.removeEventListener(AI_CONFIRMATION_EVENT, handleConfirmRequired as EventListener);
  }, []);

  // 解析 userPrompt 中的区块
  const parsedSections = useMemo((): ParsedSection[] => {
    if (!editedPrompt) return [];

    const sections: ParsedSection[] = [];
    // 匹配【xxx】格式的区块标题
    const lines = editedPrompt.split('\n');
    let currentSection: ParsedSection | null = null;
    let currentContent: string[] = [];
    let sectionIndex = 0;

    // 定义区块重要性
    const criticalKeywords = ['情节目标', '核心', '必填', '任务'];
    const importantKeywords = ['角色', '上下文', '设定', '场景', '状态', '脉络', '逻辑'];

    const getTier = (title: string): 'critical' | 'important' | 'optional' => {
      if (criticalKeywords.some((k) => title.includes(k))) return 'critical';
      if (importantKeywords.some((k) => title.includes(k))) return 'important';
      return 'optional';
    };

    const getIcon = (title: string): string => {
      if (title.includes('情节') || title.includes('目标')) return '🎯';
      if (title.includes('角色') || title.includes('人物')) return '👤';
      if (title.includes('场景') || title.includes('设定')) return '🌍';
      if (title.includes('脉络') || title.includes('摘要')) return '📚';
      if (title.includes('逻辑') || title.includes('状态')) return '🔒';
      if (title.includes('伏笔')) return '🎭';
      if (title.includes('限制') || title.includes('约束')) return '🚨';
      if (title.includes('反转')) return '⚡';
      return '📋';
    };

    for (const line of lines) {
      const match = line.match(/^【([^】]+)】/);
      if (match) {
        // 保存上一个区块
        if (currentSection) {
          currentSection.content = currentContent.join('\n').trim();
          sections.push(currentSection);
        }
        // 开始新区块
        const title = match[1];
        currentSection = {
          id: `section-${sectionIndex++}`,
          title,
          content: '',
          icon: getIcon(title),
          tier: getTier(title),
          tokenCount: 0,
          isExpanded: false,
        };
        currentContent = [line];
      } else if (currentSection) {
        currentContent.push(line);
      } else {
        // 没有区块标题的内容，归入"其他"
        if (line.trim()) {
          let otherSection = sections.find((s) => s.id === 'other');
          if (!otherSection) {
            otherSection = {
              id: 'other',
              title: '其他内容',
              content: '',
              icon: '📄',
              tier: 'optional',
              tokenCount: 0,
              isExpanded: false,
            };
            sections.push(otherSection);
          }
          otherSection.content += line + '\n';
        }
      }
    }

    // 保存最后一个区块
    if (currentSection) {
      currentSection.content = currentContent.join('\n').trim();
      sections.push(currentSection);
    }

    // 计算 token 并排序
    sections.forEach((s) => {
      s.tokenCount = estimateTokens(s.content);
    });

    // 按重要性排序
    const tierOrder = { critical: 0, important: 1, optional: 2 };
    sections.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);

    return sections;
  }, [editedPrompt]);

  // 提取变量卡片（用于模板视图）
  const variableCards = useMemo((): VariableCard[] => {
    if (!editedPrompt) return [];

    const cards: VariableCard[] = [];

    // 从区块中提取变量
    for (const section of parsedSections) {
      const preview = section.content.slice(0, 100);
      cards.push({
        key: section.id,
        label: section.title,
        value: section.content,
        preview: preview.length < section.content.length ? preview + '...' : preview,
        tokenCount: section.tokenCount,
        tier: section.tier,
        source: 'project',
      });
    }

    return cards;
  }, [parsedSections, editedPrompt]);

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

  // 切换区块展开
  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 获取区块重要性颜色
  const getTierColor = (tier: 'critical' | 'important' | 'optional') => {
    switch (tier) {
      case 'critical':
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          text: 'text-red-400',
          badge: '🔴',
        };
      case 'important':
        return {
          bg: 'bg-amber-500/10',
          border: 'border-amber-500/30',
          text: 'text-amber-400',
          badge: '🟡',
        };
      case 'optional':
        return {
          bg: 'bg-slate-500/10',
          border: 'border-slate-500/30',
          text: 'text-slate-400',
          badge: '⚪',
        };
    }
  };

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
                <p className="text-xs text-slate-400">
                  任务: {context.taskType} | 模型: {context.model}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 视图切换 */}
              <div className="flex bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('template')}
                  className={`px-3 py-1 text-xs rounded-md flex items-center gap-1 transition-colors ${
                    viewMode === 'template'
                      ? 'bg-purple-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye size={12} /> 模板
                </button>
                <button
                  onClick={() => setViewMode('full')}
                  className={`px-3 py-1 text-xs rounded-md flex items-center gap-1 transition-colors ${
                    viewMode === 'full'
                      ? 'bg-purple-500 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText size={12} /> 完整
                </button>
              </div>
              <button
                onClick={handleCancel}
                className="text-slate-400 hover:text-white text-xl px-2"
              >
                &times;
              </button>
            </div>
          </div>
        </div>

        {/* 参数栏 */}
        <div className="px-4 py-2 bg-slate-800/50 flex items-center gap-4 text-xs">
          <span className="text-slate-400">
            温度: <span className="text-white">{editedTemp.toFixed(1)}</span>
          </span>
          <span className="text-slate-400">
            预估Tokens: <span className="text-cyan-400">{totalTokens.toLocaleString()}</span>
          </span>
          <span className="text-slate-400">
            区块: <span className="text-white">{parsedSections.length}</span>
          </span>
          <button
            onClick={handleCopy}
            className="ml-auto text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <Copy size={12} /> 复制完整Prompt
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* 系统指令（可折叠） */}
          <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
            <button
              onClick={() => setShowSystem(!showSystem)}
              className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition-colors"
            >
              <span className="text-sm font-medium text-slate-300">
                ⚙️ 系统指令 ({estimateTokens(editedSystem)} tokens)
              </span>
              {showSystem ? (
                <ChevronUp size={16} className="text-slate-400" />
              ) : (
                <ChevronDown size={16} className="text-slate-400" />
              )}
            </button>
            {showSystem && (
              <div className="p-3 border-t border-slate-700">
                {isEditing ? (
                  <textarea
                    value={editedSystem}
                    onChange={(e) => setEditedSystem(e.target.value)}
                    className="w-full h-32 bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-white font-mono resize-none focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    placeholder="系统指令..."
                  />
                ) : (
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">
                    {editedSystem}
                  </pre>
                )}
              </div>
            )}
          </div>

          {/* 模板视图 */}
          {viewMode === 'template' && !isEditing && (
            <div className="space-y-3">
              {/* 图例 */}
              <div className="flex items-center gap-4 text-xs text-slate-500 px-1">
                <span>🔴 核心</span>
                <span>🟡 重要</span>
                <span>⚪ 可选</span>
              </div>

              {/* 区块卡片 */}
              {parsedSections.map((section) => {
                const colors = getTierColor(section.tier);
                const isExpanded = expandedSections.has(section.id);

                return (
                  <div
                    key={section.id}
                    className={`${colors.bg} ${colors.border} border rounded-xl overflow-hidden`}
                  >
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-slate-700/30 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span>{colors.badge}</span>
                        <span className="text-sm font-medium text-white">
                          {section.icon} {section.title}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({section.tokenCount} tokens)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVariable({
                              key: section.id,
                              label: section.title,
                              value: section.content,
                              preview: section.content.slice(0, 100),
                              tokenCount: section.tokenCount,
                              tier: section.tier,
                              source: 'project',
                            });
                          }}
                          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-600/50 transition-colors"
                        >
                          <Maximize2 size={14} />
                        </button>
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={16} className="text-slate-400" />
                        )}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-slate-700/50 pt-2">
                        <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                          {section.content}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 完整视图 或 编辑模式 */}
          {(viewMode === 'full' || isEditing) && (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <div className="p-3 border-b border-slate-700">
                <span className="text-sm font-medium text-slate-300">
                  📝 用户Prompt ({estimateTokens(editedPrompt)} tokens)
                </span>
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
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">
                    {editedPrompt}
                  </pre>
                )}
              </div>
            </div>
          )}

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

      {/* 变量详情弹窗 */}
      {selectedVariable && (
        <div
          className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4"
          onClick={() => setSelectedVariable(null)}
        >
          <div
            className="bg-slate-800 border border-slate-600 rounded-2xl w-full max-w-2xl max-h-[70vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{getTierColor(selectedVariable.tier).badge}</span>
                <h3 className="text-lg font-bold text-white">{selectedVariable.label}</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{selectedVariable.tokenCount} tokens</span>
                <button
                  onClick={() => setSelectedVariable(null)}
                  className="text-slate-400 hover:text-white"
                >
                  &times;
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
                {selectedVariable.value}
              </pre>
            </div>
            <div className="p-3 border-t border-slate-700 flex justify-end gap-2">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(selectedVariable.value);
                }}
                className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-1"
              >
                <Copy size={12} /> 复制
              </button>
              <button
                onClick={() => setSelectedVariable(null)}
                className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptConfirmDialog;
