/**
 * PromptConfirmDialog - AI调用确认对话框
 * 高级版功能：在AI调用前展示完整的prompt，允许用户编辑和确认
 * 支持模板视图和完整视图切换
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { X, Send, Edit3, RotateCcw, Copy, ChevronDown, ChevronUp, Eye, FileText, Maximize2, Loader2, BarChart3, Zap } from 'lucide-react';
import { AICallContext, confirmAICall, cancelAICall, AI_CONFIRMATION_EVENT } from '../../services/aiCallInterceptor';
import { BlockMetadata } from '../../types/promptTemplate';
import {
  SectionTier,
  CATEGORY_RULES,
  getTierColor,
  getTierFromKeywords,
  getTierFromClassification,
  getAllTiers,
} from '../../config/templates/categoryRules';

/** 解析出的区块结构 */
interface ParsedSection {
  id: string;
  title: string;
  content: string;
  icon: string;
  tier: SectionTier;
  tokenCount: number;
  isExpanded: boolean;
  metadata?: BlockMetadata;  // 新增：模板元数据引用
}

/** 变量卡片数据 */
interface VariableCard {
  key: string;
  label: string;
  value: string;
  preview: string;
  tokenCount: number;
  tier: SectionTier;
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
  // 新增：当前激活的分类标签
  const [activeTier, setActiveTier] = useState<SectionTier | 'all'>('all');
  // 新增：展开的区块
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['task']));
  // 新增：选中的变量详情
  const [selectedVariable, setSelectedVariable] = useState<VariableCard | null>(null);
  // 新增：确认按钮 loading 状态
  const [isConfirming, setIsConfirming] = useState(false);
  // 新增：全部展开/折叠状态
  const [allExpanded, setAllExpanded] = useState(false);
  // 新增：中等屏幕侧边面板显示状态
  const [showSidePanel, setShowSidePanel] = useState(false);

  // 可访问性：确认按钮引用（用于焦点管理）
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Token估算函数（必须在 useMemo 之前定义）
  const estimateTokens = (text: string) => Math.ceil(text.length / 2);

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
      setExpandedSections(new Set(['task'])); // 默认展开核心区块
    };

    window.addEventListener(AI_CONFIRMATION_EVENT, handleConfirmRequired as EventListener);
    return () => window.removeEventListener(AI_CONFIRMATION_EVENT, handleConfirmRequired as EventListener);
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

    /**
     * 从上下文中获取区块元数据
     * 支持基于标题匹配或ID匹配
     */
    const getBlockMetadata = (title: string, blockId: string): BlockMetadata | undefined => {
      if (!context?.templateMeta?.blocks) return undefined;

      // 尝试通过ID精确匹配
      const byId = context.templateMeta.blocks.find(b => b.id === blockId);
      if (byId?.metadata) return byId.metadata;

      // 尝试通过标题模糊匹配
      const byTitle = context.templateMeta.blocks.find(b =>
        title.includes(b.id) || b.id.includes(title) ||
        (b.label && title.includes(b.label)) ||
        (b.metadata?.description && b.metadata.description.includes(title))
      );
      return byTitle?.metadata;
    };

    /**
     * 智能图标函数
     * 根据标题和分类返回合适的图标
     */
    const getIcon = (title: string, tier: SectionTier): string => {
      // 特殊映射
      if (title.includes('情节') || title.includes('目标')) return '🎯';
      if (title.includes('角色') || title.includes('人物') || title.includes('登场')) return '👤';
      if (title.includes('场景') || title.includes('地点')) return '🌍';
      if (title.includes('脉络') || title.includes('摘要') || title.includes('L2')) return '📚';
      if (title.includes('逻辑') || title.includes('状态') || title.includes('L1')) return '🔒';
      if (title.includes('伏笔') || title.includes('契诃夫')) return '🎭';
      if (title.includes('L3') || title.includes('锚点') || title.includes('长期')) return '⚓';
      if (title.includes('图谱') || title.includes('关系')) return '🔗';
      if (title.includes('记忆') || title.includes('分层')) return '🧠';
      if (title.includes('世界观') || title.includes('设定')) return '🌐';
      if (title.includes('文风') || title.includes('风格') || title.includes('笔迹')) return '✒️';
      if (title.includes('禁忌') || title.includes('禁令') || title.includes('铁律')) return '🚫';
      if (title.includes('格式') || title.includes('JSON')) return '📄';
      if (title.includes('反转')) return '⚡';
      if (title.includes('推演') || title.includes('预测')) return '🔮';
      if (title.includes('要求') || title.includes('指令')) return '📋';
      // 默认使用分类图标
      return CATEGORY_RULES[tier].icon;
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
        const blockId = `section-${sectionIndex++}`;

        // 获取模板元数据（如果可用）
        const metadata = getBlockMetadata(title, blockId);

        // 使用混合分类逻辑
        const tier = getTierFromClassification(title, metadata);

        currentSection = {
          id: blockId,
          title,
          content: '',
          icon: getIcon(title, tier),
          tier,
          tokenCount: 0,
          isExpanded: false,
          metadata // 保存元数据引用
        };
        currentContent = [line];
      } else if (currentSection) {
        currentContent.push(line);
      } else {
        // 没有区块标题的内容，归入"其他"
        if (line.trim()) {
          let otherSection = sections.find(s => s.id === 'other');
          if (!otherSection) {
            otherSection = {
              id: 'other',
              title: '其他内容',
              content: '',
              icon: '📄',
              tier: 'other',
              tokenCount: 0,
              isExpanded: false
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
    sections.forEach(s => {
      s.tokenCount = estimateTokens(s.content);
    });

    // 按分类优先级排序
    const tierOrder: Record<SectionTier, number> = {
      task: 0,
      context: 1,
      style: 2,
      constraint: 3,
      format: 4,
      other: 5
    };
    sections.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);

    return sections;
  }, [editedPrompt, context?.templateMeta?.blocks]);

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
        source: 'project'
      });
    }

    return cards;
  }, [parsedSections, editedPrompt]);

  // 确认发送
  const handleConfirm = useCallback(async () => {
    setIsConfirming(true);
    try {
      confirmAICall({
        approved: true,
        modifiedSystemInstruction: isEditing ? editedSystem : undefined,
        modifiedUserPrompt: isEditing ? editedPrompt : undefined,
        modifiedTemperature: isEditing ? editedTemp : undefined,
      });
      setIsOpen(false);
    } finally {
      setIsConfirming(false);
    }
  }, [isEditing, editedSystem, editedPrompt, editedTemp]);

  // 取消
  const handleCancel = useCallback(() => {
    cancelAICall();
    setIsOpen(false);
  }, []);

  // 恢复默认
  const handleReset = useCallback(() => {
    if (context) {
      setEditedSystem(context.systemInstruction);
      setEditedPrompt(context.userPrompt);
      setEditedTemp(context.temperature);
    }
  }, [context]);

  // 复制到剪贴板
  const handleCopy = useCallback(async () => {
    const fullPrompt = `=== System Instruction ===\n${editedSystem}\n\n=== User Prompt ===\n${editedPrompt}`;
    await navigator.clipboard.writeText(fullPrompt);
  }, [editedSystem, editedPrompt]);

  // 计算总 Token
  const totalTokens = estimateTokens(editedSystem) + estimateTokens(editedPrompt);

  // 切换区块展开
  const toggleSection = useCallback((id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);


  // 按分类分组统计
  const tierStats = useMemo(() => {
    const stats: Record<SectionTier, { count: number; tokens: number }> = {
      task: { count: 0, tokens: 0 },
      context: { count: 0, tokens: 0 },
      style: { count: 0, tokens: 0 },
      constraint: { count: 0, tokens: 0 },
      format: { count: 0, tokens: 0 },
      other: { count: 0, tokens: 0 }
    };
    parsedSections.forEach(s => {
      stats[s.tier].count++;
      stats[s.tier].tokens += s.tokenCount;
    });
    return stats;
  }, [parsedSections]);

  // 根据标签筛选区块
  const filteredSections = useMemo(() => {
    if (activeTier === 'all') return parsedSections;
    return parsedSections.filter(s => s.tier === activeTier);
  }, [parsedSections, activeTier]);

  // 全部展开/折叠
  const toggleAllSections = useCallback(() => {
    if (allExpanded) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(filteredSections.map(s => s.id)));
    }
    setAllExpanded(!allExpanded);
  }, [allExpanded, filteredSections]);

  // 键盘快捷键支持
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape 键取消
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
      // Ctrl/Cmd + Enter 确认发送
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleCancel, handleConfirm]);

  if (!isOpen || !context) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in"
      role="presentation"
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700 bg-gradient-to-r from-purple-900/30 to-cyan-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Send size={20} className="text-purple-400" />
              </div>
              <div>
                <h2 id="dialog-title" className="text-lg font-bold text-white">AI调用确认</h2>
                <p className="text-xs text-slate-400">任务: {context.taskType} | 模型: {context.model}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* 视图切换 */}
              <div className="flex bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('template')}
                  className={`px-3 py-1 text-xs rounded-md flex items-center gap-1 transition-colors ${
                    viewMode === 'template' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye size={12} /> 模板
                </button>
                <button
                  onClick={() => setViewMode('full')}
                  className={`px-3 py-1 text-xs rounded-md flex items-center gap-1 transition-colors ${
                    viewMode === 'full' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText size={12} /> 完整
                </button>
              </div>
              <button onClick={handleCancel} className="text-slate-400 hover:text-white text-xl px-2">&times;</button>
            </div>
          </div>
        </div>

        {/* 参数栏 - 增强版 */}
        <div className="px-4 py-2 bg-slate-800/50 flex items-center gap-4 text-xs flex-wrap">
          {/* 模型信息 */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-700/50 rounded-lg">
            <span className="text-slate-500">模型:</span>
            <span className="text-purple-400 font-medium">{context.model}</span>
          </div>

          {/* 温度 */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">温度:</span>
            <span className="text-orange-400 font-mono">{editedTemp.toFixed(1)}</span>
          </div>

          {/* Token 统计 */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Tokens:</span>
            <span className="text-cyan-400 font-mono">{totalTokens.toLocaleString()}</span>
          </div>

          {/* 区块统计 */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">区块:</span>
            <span className="text-white font-mono">{parsedSections.length}</span>
          </div>

          {/* 分类统计徽章 */}
          <div className="flex items-center gap-1">
            {getAllTiers().map(tier => {
              const count = tierStats[tier].count;
              if (count === 0) return null;
              const rule = CATEGORY_RULES[tier];
              return (
                <span key={tier} className={`${rule.color.bg} ${rule.color.text} px-1.5 py-0.5 rounded text-[10px]`}>
                  {rule.color.badge} {count}
                </span>
              );
            })}
          </div>

          <button onClick={handleCopy} className="ml-auto text-slate-400 hover:text-white flex items-center gap-1 transition-colors">
            <Copy size={12} /> 复制完整Prompt
          </button>
        </div>

        {/* Content - 双栏布局 */}
        <div className="flex-1 overflow-hidden flex gap-4 p-4">
          {/* 左侧：区块列表（占60%） */}
          <div className="basis-[60%] overflow-y-auto space-y-3 min-w-0">
            {/* 中等屏幕(md断点)Token分析切换按钮 */}
            <div className="lg:hidden mb-3">
              <button
                onClick={() => setShowSidePanel(!showSidePanel)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700/50 transition-colors w-full justify-center"
                aria-expanded={showSidePanel}
                aria-label="Toggle token analysis panel"
              >
                <BarChart3 className="w-4 h-4" />
                Token 分析
                {showSidePanel ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* 系统指令（可折叠） */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              <button
                onClick={() => setShowSystem(!showSystem)}
                className="w-full flex items-center justify-between p-3 hover:bg-slate-700/50 transition-colors"
              >
                <span className="text-sm font-medium text-slate-300">⚙️ 系统指令 ({estimateTokens(editedSystem)} tokens)</span>
                {showSystem ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
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
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono max-h-32 overflow-y-auto">{editedSystem}</pre>
                  )}
                </div>
              )}
            </div>

            {/* 模板视图 */}
            {viewMode === 'template' && !isEditing && (
              <div className="space-y-3">
                {/* 分类筛选标签和全部展开/折叠按钮 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="Section category filter">
                  <button
                    onClick={() => setActiveTier('all')}
                    role="tab"
                    aria-selected={activeTier === 'all'}
                    aria-pressed={activeTier === 'all'}
                    className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 transition-all ${
                      activeTier === 'all'
                        ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                        : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    📊 全部
                    <span className="ml-1 px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                      {parsedSections.length}
                    </span>
                  </button>
                  {getAllTiers().map(tier => {
                    const count = tierStats[tier].count;
                    if (count === 0) return null;
                    const rule = CATEGORY_RULES[tier];
                    return (
                      <button
                        key={tier}
                        onClick={() => setActiveTier(tier)}
                        role="tab"
                        aria-selected={activeTier === tier}
                        aria-pressed={activeTier === tier}
                        className={`px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 transition-all ${
                          activeTier === tier
                            ? `${rule.color.bg} ${rule.color.text} border ${rule.color.border}`
                            : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
                        }`}
                      >
                        {rule.icon} {tier === 'task' ? '任务' : tier === 'context' ? '上下文' : tier === 'style' ? '风格' : tier === 'constraint' ? '约束' : tier === 'format' ? '格式' : '其他'}
                        <span className="ml-1 px-1.5 py-0.5 bg-white/10 rounded text-[10px]">
                          {count}
                        </span>
                      </button>
                    );
                  })}
                  </div>
                  <button
                    onClick={toggleAllSections}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors shrink-0"
                  >
                    {allExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    {allExpanded ? '全部折叠' : '全部展开'}
                  </button>
                </div>

                {/* 图例 */}
                <div className="flex items-center gap-3 text-xs text-slate-500 px-1 flex-wrap">
                  <span>🎯 任务</span>
                  <span>👤 上下文</span>
                  <span>🎨 风格</span>
                  <span>🚫 约束</span>
                  <span>📋 格式</span>
                  <span>📄 其他</span>
                </div>

                {/* 区块卡片 */}
                {filteredSections.map(section => {
                  const colors = getTierColor(section.tier);
                  const isExpanded = expandedSections.has(section.id);

                  return (
                    <div
                      key={section.id}
                      className={`${colors.bg} ${colors.border} border rounded-xl overflow-hidden`}
                    >
                      <button
                        onClick={() => toggleSection(section.id)}
                        aria-expanded={isExpanded}
                        aria-controls={`section-content-${section.id}`}
                        className="w-full flex items-center justify-between p-3 hover:bg-slate-700/30 transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span>{colors.badge}</span>
                          <span className="text-sm font-medium text-white">{section.icon} {section.title}</span>
                          {/* 数据来源标识 */}
                          {section.metadata && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              section.metadata.dataSource === 'static'
                                ? 'bg-green-500/20 text-green-400'
                                : section.metadata.dataSource === 'user_input'
                                ? 'bg-blue-500/20 text-blue-400'
                                : section.metadata.dataSource === 'computed'
                                ? 'bg-amber-500/20 text-amber-400'
                                : section.metadata.dataSource === 'derived'
                                ? 'bg-purple-500/20 text-purple-400'
                                : section.metadata.isStatic
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {section.metadata.dataSource === 'static' ? '📌 静态' :
                               section.metadata.dataSource === 'user_input' ? '✏️ 用户' :
                               section.metadata.dataSource === 'computed' ? '⚙️ 计算' :
                               section.metadata.dataSource === 'derived' ? '📊 派生' :
                               section.metadata.isStatic ? '静态' : '动态'}
                            </span>
                          )}
                          <span className="text-xs text-slate-500">({section.tokenCount} tokens)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedVariable({
                                key: section.id,
                                label: section.title,
                                value: section.content,
                                preview: section.content.slice(0, 100),
                                tokenCount: section.tokenCount,
                                tier: section.tier,
                                source: 'project'
                              });
                            }}
                            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-600/50 transition-colors"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.stopPropagation();
                                setSelectedVariable({
                                  key: section.id,
                                  label: section.title,
                                  value: section.content,
                                  preview: section.content.slice(0, 100),
                                  tokenCount: section.tokenCount,
                                  tier: section.tier,
                                  source: 'project'
                                });
                              }
                            }}
                            aria-label={`View details of ${section.title}`}
                          >
                            <Maximize2 size={14} />
                          </span>
                          {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div id={`section-content-${section.id}`} className="px-3 pb-3 border-t border-slate-700/50 pt-2">
                          <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">{section.content}</pre>
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
                  <span className="text-sm font-medium text-slate-300">📝 用户Prompt ({estimateTokens(editedPrompt)} tokens)</span>
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

          {/* 右侧：辅助信息面板（占40%） */}
          <div className="basis-[40%] flex flex-col gap-4 shrink-0 hidden lg:flex">
            {/* Token分析面板 */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <BarChart3 size={16} className="text-cyan-400" />
                Token 分布分析
              </h3>
              {/* 分类占比可视化 */}
              <div className="space-y-2">
                {getAllTiers().map(tier => {
                  const stat = tierStats[tier];
                  if (stat.count === 0) return null;
                  const percentage = totalTokens > 0 ? (stat.tokens / totalTokens * 100).toFixed(1) : '0';
                  const rule = CATEGORY_RULES[tier];
                  const tierLabel = tier === 'task' ? 'Task' : tier === 'context' ? 'Context' : tier === 'style' ? 'Style' : tier === 'constraint' ? 'Constraint' : tier === 'format' ? 'Format' : 'Other';
                  return (
                    <div key={tier} className="flex items-center gap-2">
                      <span className="w-4">{rule.color.badge}</span>
                      <div
                        className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden"
                        role="progressbar"
                        aria-valuenow={parseFloat(percentage)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${tierLabel} token percentage`}
                      >
                        <div
                          className="h-full transition-all"
                          style={{ width: `${percentage}%`, backgroundColor: tier === 'task' ? '#ef4444' : tier === 'context' ? '#f59e0b' : tier === 'style' ? '#a855f7' : tier === 'constraint' ? '#f97316' : tier === 'format' ? '#3b82f6' : '#64748b' }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-12 text-right">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
              {/* 总计 */}
              <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between text-xs">
                <span className="text-slate-500">总计 Tokens</span>
                <span className="text-cyan-400 font-mono">{totalTokens.toLocaleString()}</span>
              </div>
            </div>

            {/* 选中区块详情预览 */}
            {selectedVariable && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4 flex-1 overflow-hidden flex flex-col min-h-0">
                <h3 className="text-sm font-medium text-white mb-2 flex items-center gap-2 shrink-0">
                  <FileText size={16} className="text-purple-400" />
                  {selectedVariable.label}
                </h3>
                <div className="flex-1 overflow-y-auto min-h-0">
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">
                    {selectedVariable.value.slice(0, 500)}
                    {selectedVariable.value.length > 500 && '...'}
                  </pre>
                </div>
                <div className="mt-2 flex gap-2 shrink-0">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(selectedVariable.value);
                    }}
                    className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded flex items-center gap-1"
                  >
                    <Copy size={12} /> 复制
                  </button>
                  <button
                    onClick={() => setSelectedVariable(null)}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    关闭
                  </button>
                </div>
              </div>
            )}

            {/* 快捷操作面板 */}
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
              <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                <Zap size={16} className="text-amber-400" />
                快捷操作
              </h3>
              <div className="space-y-2">
                <button
                  onClick={toggleAllSections}
                  className="w-full px-3 py-2 text-xs bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  {allExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {allExpanded ? '全部折叠' : '全部展开'}
                </button>
                <button
                  onClick={handleCopy}
                  className="w-full px-3 py-2 text-xs bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <Copy size={14} /> 复制完整Prompt
                </button>
              </div>
            </div>
          </div>
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
              disabled={isConfirming}
              className={`px-5 py-2 text-white text-sm font-bold rounded-lg flex items-center gap-2 transition-colors shadow-lg ${
                isConfirming
                  ? 'bg-purple-700 cursor-not-allowed shadow-purple-500/10'
                  : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20'
              }`}
            >
              {isConfirming ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  发送中...
                </>
              ) : (
                <>
                  <Send size={14} />
                  确认发送
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 中等屏幕(md断点)底部Token分析面板 */}
      {showSidePanel && (
        <div
          className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 p-4 max-h-[50vh] overflow-y-auto z-[105]"
          role="region"
          aria-label="Token analysis panel for medium screens"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-white flex items-center gap-2">
              <BarChart3 size={16} className="text-cyan-400" />
              Token 分布分析
            </h3>
            <button
              onClick={() => setShowSidePanel(false)}
              className="text-slate-400 hover:text-white"
              aria-label="Close token analysis panel"
            >
              <X size={16} />
            </button>
          </div>
          {/* 分类占比可视化 */}
          <div className="space-y-2">
            {getAllTiers().map(tier => {
              const stat = tierStats[tier];
              if (stat.count === 0) return null;
              const percentage = totalTokens > 0 ? (stat.tokens / totalTokens * 100).toFixed(1) : '0';
              const rule = CATEGORY_RULES[tier];
              return (
                <div key={tier} className="flex items-center gap-2">
                  <span className="w-4">{rule.color.badge}</span>
                  <div
                    className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden"
                    role="progressbar"
                    aria-valuenow={parseFloat(percentage)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${rule.icon} ${tier} token percentage`}
                  >
                    <div
                      className="h-full transition-all"
                      style={{ width: `${percentage}%`, backgroundColor: tier === 'task' ? '#ef4444' : tier === 'context' ? '#f59e0b' : tier === 'style' ? '#a855f7' : tier === 'constraint' ? '#f97316' : tier === 'format' ? '#3b82f6' : '#64748b' }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right">{percentage}%</span>
                </div>
              );
            })}
          </div>
          {/* 总计 */}
          <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between text-xs">
            <span className="text-slate-500">总计 Tokens</span>
            <span className="text-cyan-400 font-mono">{totalTokens.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* 变量详情弹窗 */}
      {selectedVariable && (
        <div
          className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4"
          onClick={() => setSelectedVariable(null)}
        >
          <div
            className="bg-slate-800 border border-slate-600 rounded-2xl w-full max-w-2xl max-h-[70vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
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
              <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{selectedVariable.value}</pre>
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
