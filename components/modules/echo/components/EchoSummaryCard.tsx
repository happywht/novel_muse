import React, { useState, useMemo } from 'react';
import { Echo } from '@/types';
import {
  ScanSearch, Sparkles, RefreshCw, ChevronDown, ChevronUp,
  Check, X, Zap, Eye
} from 'lucide-react';
import {
  categorizeEchoes,
  getConfidenceConfig,
  getConfidenceBarColor,
  formatConfidence,
  CategorizedEchoes
} from './echoUtils';

interface EchoSummaryCardProps {
  echoes: Echo[];
  isExtracting?: boolean;
  onExtract?: () => void;
  onAccept?: (echo: Echo) => void;
  onReject?: (echo: Echo) => void;
  onSimulate?: (targetName: string, description: string) => void;
  onViewAll?: () => void;
}

export const EchoSummaryCard: React.FC<EchoSummaryCardProps> = ({
  echoes,
  isExtracting = false,
  onExtract,
  onAccept,
  onReject,
  onSimulate,
  onViewAll
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // 分类统计
  const categorized = useMemo<CategorizedEchoes>(() => {
    return categorizeEchoes(echoes);
  }, [echoes]);

  // 高置信度自动处理
  const autoAcceptedCount = categorized.high.length;

  if (echoes.length === 0) {
    return (
      <div className="bg-slate-950/50 p-4 border-t border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <ScanSearch className="text-muse-400" size={14} />
            命运回响 (状态提取)
          </h3>
          {onExtract && (
            <button
              onClick={onExtract}
              disabled={isExtracting}
              className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50 border border-slate-700"
            >
              {isExtracting ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
              提取状态变更
            </button>
          )}
        </div>
        <div className="text-center py-4 text-slate-600 text-xs">
          点击上方按钮分析当前草稿中的状态变更
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950/50 p-4 border-t border-slate-800">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1">
          <ScanSearch className="text-muse-400" size={14} />
          命运回响 (状态提取)
        </h3>
        {onExtract && (
          <button
            onClick={onExtract}
            disabled={isExtracting}
            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded flex items-center gap-1 transition-colors disabled:opacity-50 border border-slate-700"
          >
            {isExtracting ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
            重新提取
          </button>
        )}
      </div>

      {/* 统计摘要卡片 */}
      <div className="bg-slate-900/80 border border-muse-500/20 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📊</span>
          <span className="text-sm font-bold text-white">检测到 {echoes.length} 个状态变更</span>
        </div>

        <div className="space-y-2">
          {/* 高置信度 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm">✅</span>
              <span className="text-xs text-slate-300">高置信度: {categorized.high.length} 个</span>
              <span className="text-[10px] text-emerald-400 font-bold">(自动采纳)</span>
            </div>
            {categorized.high.length > 0 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-[10px] text-emerald-400 hover:text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 hover:border-emerald-500/50 transition-colors"
              >
                [查看]
              </button>
            )}
          </div>

          {/* 中置信度 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm">⚠️</span>
              <span className="text-xs text-slate-300">待确认: {categorized.medium.length} 个</span>
              <span className="text-[10px] text-amber-400 font-bold">(需人工审核)</span>
            </div>
            {categorized.medium.length > 0 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="text-[10px] text-amber-400 hover:text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 hover:border-amber-500/50 transition-colors"
              >
                [审核]
              </button>
            )}
          </div>

          {/* 低置信度 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm">🚫</span>
              <span className="text-xs text-slate-300">低置信度: {categorized.low.length} 个</span>
              <span className="text-[10px] text-slate-500 font-bold">(已过滤)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 展开/折叠详情 */}
      {isExpanded && (
        <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar animate-fade-in">
          {echoes.map(echo => {
            const confConfig = getConfidenceConfig(echo.confidence);

            return (
              <div
                key={echo.id}
                className={`p-3 rounded-lg border ${confConfig.bg} ${confConfig.border} transition-all hover:shadow-lg`}
              >
                <div className="flex items-start gap-3">
                  {/* 左侧：类型和名称 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${
                        echo.type === 'CHARACTER'
                          ? 'bg-indigo-900/50 text-indigo-300'
                          : 'bg-emerald-900/50 text-emerald-300'
                      }`}>
                        {echo.type === 'CHARACTER' ? '人物' : '世界'}
                      </span>
                      <span className="font-bold text-slate-200 text-sm truncate">
                        {echo.targetName}
                      </span>
                    </div>

                    {/* 描述 */}
                    <p className="text-slate-300 text-xs mb-2">{echo.description}</p>

                    {/* 置信度进度条 */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getConfidenceBarColor(echo.confidence || 0.7)}`}
                          style={{ width: `${(echo.confidence || 0.7) * 100}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-mono font-bold ${confConfig.text}`}>
                        {formatConfidence(echo.confidence)}
                      </span>
                    </div>

                    {/* 提取证据 */}
                    {echo.extractionEvidence && (
                      <div className="bg-slate-900/60 border-l-2 border-slate-700 pl-2 py-1 text-[10px] text-slate-500 italic">
                        "{echo.extractionEvidence}"
                      </div>
                    )}
                  </div>

                  {/* 右侧：操作按钮 */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {onSimulate && (
                      <button
                        onClick={() => onSimulate(echo.targetName, echo.description)}
                        title="蝴蝶效应预演"
                        className="text-muse-400 hover:text-muse-300 p-1.5 rounded hover:bg-muse-900/20 transition-colors"
                      >
                        <Zap size={14} />
                      </button>
                    )}
                    {onAccept && echo.confidence !== undefined && echo.confidence < 0.85 && (
                      <button
                        onClick={() => onAccept(echo)}
                        title="采纳"
                        className="text-emerald-500 hover:text-emerald-400 p-1.5 rounded hover:bg-emerald-900/20 transition-colors"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    {onReject && (
                      <button
                        onClick={() => onReject(echo)}
                        title="忽略"
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded hover:bg-red-900/20 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 底部操作栏 */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[10px] text-slate-400 hover:text-slate-300 flex items-center gap-1 transition-colors"
        >
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {isExpanded ? '收起详情' : '展开详情'}
        </button>

        {onViewAll && categorized.medium.length > 0 && (
          <button
            onClick={onViewAll}
            className="text-[10px] text-muse-400 hover:text-muse-300 flex items-center gap-1 transition-colors"
          >
            <Eye size={12} />
            前往Echo Chamber审核
          </button>
        )}
      </div>
    </div>
  );
};
