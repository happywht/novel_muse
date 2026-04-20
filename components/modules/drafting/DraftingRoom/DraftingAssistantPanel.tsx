/**
 * DraftingAssistantPanel - 写作助手面板
 *
 * Drafting模块增强功能：
 * - 写作建议与提示
 * - 词汇丰富度分析
 * - 节奏与韵律检查
 * - 情感色彩分析
 * - OOC检测预警
 * - 剧情连贯性提示
 */

import React, { useState, useMemo } from 'react';
import {
  Lightbulb,
  Sparkles,
  Zap,
  BookOpen,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Target,
  Flame,
  Clock,
  BarChart3,
  Eye,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

interface DraftingAssistantPanelProps {
  text: string;
  wordCount: number;
  onSuggestionApply?: (suggestion: string) => void;
  className?: string;
}

interface WritingSuggestion {
  id: string;
  type: 'style' | 'grammar' | 'pacing' | 'character' | 'plot';
  severity: 'info' | 'warning' | 'error';
  title: string;
  description: string;
  suggestion?: string;
  position?: { start: number; end: number };
}

interface TextMetrics {
  avgSentenceLength: number;
  avgWordLength: number;
  vocabularyRichness: number;
  dialogueRatio: number;
  actionRatio: number;
  descriptionRatio: number;
}

// ============================================================
// Component
// ============================================================

type TabMode = 'suggestions' | 'metrics' | 'analysis';

export const DraftingAssistantPanel: React.FC<DraftingAssistantPanelProps> = ({
  text,
  wordCount,
  onSuggestionApply,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<TabMode>('suggestions');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'warning' | 'error'>('all');

  // 分析写作建议
  const suggestions = useMemo(() => {
    const results: WritingSuggestion[] = [];

    if (!text) {
      results.push({
        id: 'no-text',
        type: 'info' as const,
        severity: 'info' as const,
        title: '开始写作',
        description: '在编辑器中输入文字以获取写作建议',
      });
      return results;
    }

    // 检测长句（超过100字）
    const sentences = text.split(/[。！？]/);
    sentences.forEach((sentence, index) => {
      if (sentence.length > 100) {
        results.push({
          id: `long-sentence-${index}`,
          type: 'pacing',
          severity: 'warning',
          title: '长句检测',
          description: `第${index + 1}句过长（${sentence.length}字），建议拆分以提升阅读体验`,
          suggestion: '尝试将长句拆分为2-3个短句，或使用分号、冒号分隔',
        });
      }
    });

    // 检测重复词汇（简单示例）
    const words = text.split(/\s+/);
    const wordFreq: Record<string, number> = {};
    words.forEach((word) => {
      if (word.length > 2) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    Object.entries(wordFreq).forEach(([word, count]) => {
      if (count > 5 && count / words.length > 0.05) {
        results.push({
          id: `repeated-${word}`,
          type: 'style',
          severity: 'info',
          title: '词汇重复',
          description: `"${word}" 重复使用 ${count} 次`,
          suggestion: '考虑使用同义词替换，或改变句式结构',
        });
      }
    });

    // 检测对话比例
    const dialogueLength = (text.match(/[""「」『』]/g) || []).length;
    const dialogueRatio = dialogueLength / Math.max(text.length, 1);
    if (dialogueRatio < 0.1 && text.length > 500) {
      results.push({
        id: 'low-dialogue',
        type: 'pacing',
        severity: 'info',
        title: '对话偏少',
        description: '当前文本对话比例较低',
        suggestion: '适当增加角色对话可以增强互动性和可读性',
      });
    }

    // 检测段落长度
    const paragraphs = text.split(/\n\n+/);
    paragraphs.forEach((para, index) => {
      if (para.length > 500) {
        results.push({
          id: `long-paragraph-${index}`,
          type: 'pacing',
          severity: 'warning',
          title: '长段落',
          description: `第${index + 1}段过长（${para.length}字）`,
          suggestion: '长段落可能影响阅读节奏，建议拆分或增加对话',
        });
      }
    });

    // 默认提示（如果没有检测到问题）
    if (results.length === 0) {
      results.push({
        id: 'good-job',
        type: 'style',
        severity: 'info',
        title: '写作状态良好',
        description: '当前文本没有检测到明显问题，继续保持！',
      });
    }

    return results;
  }, [text]);

  // 计算文本指标
  const metrics = useMemo(() => {
    if (!text) {
      return {
        avgSentenceLength: 0,
        avgWordLength: 0,
        vocabularyRichness: 0,
        dialogueRatio: 0,
        actionRatio: 0,
        descriptionRatio: 0,
      };
    }

    const sentences = text.split(/[。！？]/).filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/).filter((w) => w.length > 0);

    const avgSentenceLength = sentences.length > 0
      ? words.length / sentences.length
      : 0;

    const avgWordLength = words.length > 0
      ? text.replace(/\s/g, '').length / words.length
      : 0;

    // 词汇丰富度（唯一词/总词数）
    const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
    const vocabularyRichness = words.length > 0
      ? (uniqueWords.size / words.length) * 100
      : 0;

    // 对话比例（粗略估算）
    const dialogueMatches = text.match(/[""「」『』][^""]*[""「」『』]/g) || [];
    const dialogueRatio = text.length > 0
      ? (dialogueMatches.join('').length / text.length) * 100
      : 0;

    // 动作描写比例（粗略估算：包含动词的句子）
    const actionVerbs = ['跑', '跳', '打', '杀', '追', '逃', '攻击', '防御'];
    const actionCount = actionVerbs.reduce((sum, verb) => sum + (text.match(new RegExp(verb, 'g')) || []).length, 0);
    const actionRatio = text.length > 0
      ? (actionCount * 3 / text.length) * 100
      : 0;

    // 描写比例（粗略估算：包含形容词的句子）
    const descriptionMarkers = ['美丽的', '壮观', '幽暗', '明亮', '荒凉', '繁华'];
    const descCount = descriptionMarkers.reduce((sum, marker) => sum + (text.match(new RegExp(marker, 'g')) || []).length, 0);
    const descriptionRatio = text.length > 0
      ? (descCount * 3 / text.length) * 100
      : 0;

    return {
      avgSentenceLength,
      avgWordLength,
      vocabularyRichness,
      dialogueRatio,
      actionRatio,
      descriptionRatio,
    };
  }, [text]);

  // 情感色彩分析（简单关键词检测）
  const sentimentAnalysis = useMemo(() => {
    if (!text) return { positive: 0, negative: 0, neutral: 100 };

    const positiveWords = ['快乐', '幸福', '美好', '成功', '希望', '爱', '喜悦'];
    const negativeWords = ['痛苦', '悲伤', '绝望', '失败', '恐惧', '恨', '愤怒'];

    let positiveCount = 0;
    let negativeCount = 0;

    positiveWords.forEach((word) => {
      positiveCount += (text.match(new RegExp(word, 'g')) || []).length;
    });

    negativeWords.forEach((word) => {
      negativeCount += (text.match(new RegExp(word, 'g')) || []).length;
    });

    const total = positiveCount + negativeCount;
    if (total === 0) return { positive: 0, negative: 0, neutral: 100 };

    return {
      positive: Math.round((positiveCount / total) * 100),
      negative: Math.round((negativeCount / total) * 100),
      neutral: 0,
    };
  }, [text]);

  // 过滤建议
  const filteredSuggestions = useMemo(() => {
    if (selectedSeverity === 'all') return suggestions;
    return suggestions.filter((s) => s.severity === selectedSeverity);
  }, [suggestions, selectedSeverity]);

  // 切换item展开状态
  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // 获取严重度颜色
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'warning':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'info':
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  // 获取类型图标
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'style':
        return <Sparkles size={14} />;
      case 'grammar':
        return <BookOpen size={14} />;
      case 'pacing':
        return <Clock size={14} />;
      case 'character':
        return <Target size={14} />;
      case 'plot':
        return <Flame size={14} />;
      default:
        return <Lightbulb size={14} />;
    }
  };

  return (
    <div className={`bg-slate-800/40 rounded-xl border border-slate-700/50 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-300">
              写作助手
            </h3>
            {wordCount > 0 && (
              <span className="text-xs text-slate-500">
                ({wordCount} 字)
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {[
            { id: 'suggestions' as TabMode, label: '建议', icon: <Sparkles size={14} /> },
            { id: 'metrics' as TabMode, label: '指标', icon: <BarChart3 size={14} /> },
            { id: 'analysis' as TabMode, label: '分析', icon: <Eye size={14} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3">
        {/* Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div className="space-y-2">
            {/* Filter */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setSelectedSeverity('all')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  selectedSeverity === 'all'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setSelectedSeverity('warning')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  selectedSeverity === 'warning'
                    ? 'bg-slate-700 text-amber-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                警告
              </button>
              <button
                onClick={() => setSelectedSeverity('error')}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  selectedSeverity === 'error'
                    ? 'bg-slate-700 text-red-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                错误
              </button>
            </div>

            {/* Suggestion List */}
            {filteredSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className={`bg-slate-900/50 rounded-lg p-3 border transition-all cursor-pointer ${getSeverityColor(
                  suggestion.severity
                )}`}
                onClick={() => toggleItem(suggestion.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {getTypeIcon(suggestion.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xs font-bold text-white">{suggestion.title}</h4>
                      {expandedItems.has(suggestion.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{suggestion.description}</p>
                    {expandedItems.has(suggestion.id) && suggestion.suggestion && (
                      <div className="mt-2 pt-2 border-t border-slate-700/50">
                        <p className="text-xs text-cyan-400">💡 {suggestion.suggestion}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredSuggestions.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500" />
                <p className="text-sm">没有发现任何问题</p>
                <p className="text-xs mt-1">太棒了！继续保持！</p>
              </div>
            )}
          </div>
        )}

        {/* Metrics Tab */}
        {activeTab === 'metrics' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Avg Sentence Length */}
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">平均句长</span>
                  <FileText size={14} className="text-slate-600" />
                </div>
                <p className="text-lg font-bold text-white">{metrics.avgSentenceLength.toFixed(1)}</p>
                <p className="text-xs text-slate-500 mt-1">字/句</p>
              </div>

              {/* Avg Word Length */}
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">平均词长</span>
                  <BookOpen size={14} className="text-slate-600" />
                </div>
                <p className="text-lg font-bold text-white">{metrics.avgWordLength.toFixed(1)}</p>
                <p className="text-xs text-slate-500 mt-1">字/词</p>
              </div>

              {/* Vocabulary Richness */}
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">词汇丰富度</span>
                  <Sparkles size={14} className="text-slate-600" />
                </div>
                <p className="text-lg font-bold text-white">{metrics.vocabularyRichness.toFixed(1)}%</p>
                <p className="text-xs text-slate-500 mt-1">唯一词比例</p>
              </div>

              {/* Dialogue Ratio */}
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">对话比例</span>
                  <Zap size={14} className="text-slate-600" />
                </div>
                <p className="text-lg font-bold text-white">{metrics.dialogueRatio.toFixed(1)}%</p>
                <p className="text-xs text-slate-500 mt-1">对话文本占比</p>
              </div>

              {/* Action Ratio */}
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">动作描写</span>
                  <TrendingUp size={14} className="text-slate-600" />
                </div>
                <p className="text-lg font-bold text-white">{metrics.actionRatio.toFixed(1)}%</p>
                <p className="text-xs text-slate-500 mt-1">动作场景占比</p>
              </div>

              {/* Description Ratio */}
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">环境描写</span>
                  <Eye size={14} className="text-slate-600" />
                </div>
                <p className="text-lg font-bold text-white">{metrics.descriptionRatio.toFixed(1)}%</p>
                <p className="text-xs text-slate-500 mt-1">描写占比</p>
              </div>
            </div>

            {/* Metrics Tips */}
            <div className="bg-blue-950/20 border border-blue-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Lightbulb size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <p className="font-bold text-blue-400 mb-1">写作建议</p>
                  <ul className="space-y-1 text-slate-400">
                    <li>• 平均句长建议保持在 15-25 字之间</li>
                    <li>• 对话比例 10-30% 可增强可读性</li>
                    <li>• 词汇丰富度越高，文章越生动</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              情感色彩与文风分析
            </p>

            {/* Sentiment Analysis */}
            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
              <h4 className="text-xs font-bold text-white mb-3">情感色彩</h4>
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-emerald-400">积极</span>
                    <span className="text-white">{sentimentAnalysis.positive}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                      style={{ width: `${sentimentAnalysis.positive}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-red-400">消极</span>
                    <span className="text-white">{sentimentAnalysis.negative}%</span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all"
                      style={{ width: `${sentimentAnalysis.negative}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Writing Style Tips */}
            <div className="bg-purple-950/20 border border-purple-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Sparkles size={16} className="text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-slate-300">
                  <p className="font-bold text-purple-400 mb-1">文风分析</p>
                  <p className="text-slate-400">
                    {sentimentAnalysis.positive > sentimentAnalysis.negative
                      ? '当前文本整体基调偏向积极，适合轻松愉快的场景'
                      : sentimentAnalysis.negative > sentimentAnalysis.positive
                      ? '当前文本整体基调偏向消极，适合紧张冲突的场景'
                      : '当前文本情感色彩平衡，适合中性叙述'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
