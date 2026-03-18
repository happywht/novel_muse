import React, { useState, useMemo } from 'react';
import { Echo, Chapter, Character } from '../../types';
import {
  X, Check, CheckCircle2, XCircle, Filter, Zap,
  ChevronDown, ChevronUp, FileText, AlertTriangle, Maximize2
} from 'lucide-react';
import {
  categorizeEchoes,
  getConfidenceConfig,
  getConfidenceBarColor,
  formatConfidence,
  CategorizedEchoes
} from './echoUtils';

interface EchoReviewPanelProps {
  echoes: Echo[];
  chapters?: Chapter[];
  characters?: Character[];
  onAccept: (echo: Echo) => void;
  onReject: (echo: Echo) => void;
  onBatchAccept?: (echoes: Echo[]) => void;
  onBatchReject?: (echoes: Echo[]) => void;
  onUpdate?: (echo: Echo) => void;
  onSimulate?: (targetName: string, description: string) => void;
  onClose?: () => void;
  onOpenDeepReview?: () => void;
}

type FilterMode = 'ALL' | 'MEDIUM' | 'HIGH';

export const EchoReviewPanel: React.FC<EchoReviewPanelProps> = ({
  echoes,
  chapters = [],
  characters = [],
  onAccept,
  onReject,
  onBatchAccept,
  onBatchReject,
  onUpdate,
  onSimulate,
  onClose,
  onOpenDeepReview
}) => {
  const [filterMode, setFilterMode] = useState<FilterMode>('MEDIUM');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 分类统计
  const categorized = useMemo<CategorizedEchoes>(() => {
    return categorizeEchoes(echoes);
  }, [echoes]);

  // 过滤后的echoes
  const filteredEchoes = useMemo(() => {
    switch (filterMode) {
      case 'HIGH':
        return categorized.high;
      case 'MEDIUM':
        return categorized.medium;
      case 'ALL':
      default:
        return echoes;
    }
  }, [filterMode, echoes, categorized]);

  // 切换选择
  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 全选
  const selectAll = () => {
    setSelectedIds(new Set(filteredEchoes.map(e => e.id)));
  };

  // 清空选择
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // 批量操作
  const handleBatchAccept = () => {
    const selected = filteredEchoes.filter(e => selectedIds.has(e.id));
    if (onBatchAccept) {
      onBatchAccept(selected);
    } else {
      selected.forEach(e => onAccept(e));
    }
    setSelectedIds(new Set());
  };

  const handleBatchReject = () => {
    const selected = filteredEchoes.filter(e => selectedIds.has(e.id));
    if (onBatchReject) {
      onBatchReject(selected);
    } else {
      selected.forEach(e => onReject(e));
    }
    setSelectedIds(new Set());
  };

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800">
      {/* 头部 */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/30">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="text-amber-400" size={16} />
            Echo审核面板
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* 过滤器 */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setFilterMode('MEDIUM')}
            className={`flex-1 text-[10px] px-2 py-1.5 rounded border transition-colors ${
              filterMode === 'MEDIUM'
                ? 'bg-amber-900/30 border-amber-500/50 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
          >
            待审核 ({categorized.medium.length})
          </button>
          <button
            onClick={() => setFilterMode('HIGH')}
            className={`flex-1 text-[10px] px-2 py-1.5 rounded border transition-colors ${
              filterMode === 'HIGH'
                ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
          >
            高置信 ({categorized.high.length})
          </button>
          <button
            onClick={() => setFilterMode('ALL')}
            className={`flex-1 text-[10px] px-2 py-1.5 rounded border transition-colors ${
              filterMode === 'ALL'
                ? 'bg-muse-900/30 border-muse-500/50 text-muse-300'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
          >
            全部 ({echoes.length})
          </button>
        </div>

        {/* 深度审核按钮 */}
        {onOpenDeepReview && categorized.medium.length > 0 && (
          <button
            onClick={onOpenDeepReview}
            className="w-full text-[10px] bg-muse-900/30 hover:bg-muse-900/50 text-muse-300 px-3 py-2 rounded-lg border border-muse-500/30 transition-colors flex items-center justify-center gap-2 mb-3"
          >
            <Maximize2 size={12} />
            打开深度审核模式
          </button>
        )}

        {/* 批量操作 */}
        {selectedIds.size > 0 && (
          <div className="flex gap-2 animate-fade-in">
            <button
              onClick={handleBatchAccept}
              className="flex-1 text-[10px] bg-emerald-700 hover:bg-emerald-600 text-white px-2 py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
            >
              <CheckCircle2 size={12} />
              采纳选中 ({selectedIds.size})
            </button>
            <button
              onClick={handleBatchReject}
              className="flex-1 text-[10px] bg-rose-900/50 hover:bg-rose-800 text-rose-200 px-2 py-1.5 rounded flex items-center justify-center gap-1 transition-colors border border-rose-500/30"
            >
              <XCircle size={12} />
              忽略选中
            </button>
          </div>
        )}
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {filteredEchoes.length === 0 ? (
          <div className="text-center py-8 text-slate-600">
            <FileText size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">暂无需要审核的Echo</p>
          </div>
        ) : (
          filteredEchoes.map(echo => {
            const confConfig = getConfidenceConfig(echo.confidence);
            const isSelected = selectedIds.has(echo.id);

            return (
              <div
                key={echo.id}
                onClick={() => toggleSelect(echo.id)}
                className={`p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected
                    ? `${confConfig.bg} ${confConfig.border} shadow-lg`
                    : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                }`}
              >
                {/* 选择指示器 */}
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? `${confConfig.border} ${confConfig.text}`
                      : 'border-slate-600'
                  }`}>
                    {isSelected && <Check size={10} />}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* 标题行 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[8px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${
                        echo.type === 'CHARACTER'
                          ? 'bg-indigo-900/50 text-indigo-300'
                          : 'bg-emerald-900/50 text-emerald-300'
                      }`}>
                        {echo.type === 'CHARACTER' ? '人物' : '世界'}
                      </span>
                      <span className="font-bold text-slate-200 text-xs truncate flex-1">
                        {echo.targetName}
                      </span>
                      <span className={`text-[10px] ${confConfig.text} font-bold`}>
                        {confConfig.icon} {formatConfidence(echo.confidence)}
                      </span>
                    </div>

                    {/* 描述 */}
                    <p className="text-slate-300 text-xs mb-2">{echo.description}</p>

                    {/* 置信度进度条 */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getConfidenceBarColor(echo.confidence || 0.7)}`}
                          style={{ width: `${(echo.confidence || 0.7) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* 提取证据 */}
                    {echo.extractionEvidence && (
                      <div className="bg-slate-900/60 border-l-2 border-slate-700 pl-2 py-1 text-[10px] text-slate-500 italic">
                        "{echo.extractionEvidence}"
                      </div>
                    )}

                    {/* 原因 */}
                    {echo.reason && (
                      <div className="mt-2 text-[10px] text-slate-600">
                        原因: {echo.reason}
                      </div>
                    )}
                  </div>
                </div>

                {/* 单个操作按钮 */}
                <div className="flex gap-2 mt-3 pl-7">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAccept(echo);
                    }}
                    className="flex-1 text-[10px] bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 px-2 py-1.5 rounded border border-emerald-500/30 transition-colors flex items-center justify-center gap-1"
                  >
                    <Check size={12} />
                    采纳
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReject(echo);
                    }}
                    className="flex-1 text-[10px] bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-300 px-2 py-1.5 rounded border border-slate-700 hover:border-rose-500/30 transition-colors flex items-center justify-center gap-1"
                  >
                    <X size={12} />
                    忽略
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 底部工具栏 */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/30">
        <div className="flex items-center justify-between text-[10px]">
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              全选
            </button>
            <span className="text-slate-700">|</span>
            <button
              onClick={clearSelection}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              清空
            </button>
          </div>
          <div className="text-slate-500">
            已选择 {selectedIds.size} / {filteredEchoes.length} 项
          </div>
        </div>
      </div>
    </div>
  );
};
