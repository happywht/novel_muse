import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  BookOpen,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { fetchEchoForeshadowing } from '../../services/apiService';

// ============================================================
// Types
// ============================================================

interface ForeshadowingItem {
  subject: string;
  relation: string;
  object: string;
  echoId: string;
  createdAt: number;
  relatedChapter?: string;
}

interface ForeshadowingChainProps {
  projectId: string;
  onClose: () => void;
}

// ============================================================
// Component
// ============================================================

export const ForeshadowingChainPanel: React.FC<ForeshadowingChainProps> = ({
  projectId,
  onClose,
}) => {
  const [foreshadowing, setForeshadowing] = useState<ForeshadowingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fetch foreshadowing data
  const fetchForeshadowing = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEchoForeshadowing(projectId);
      setForeshadowing(data);
    } catch (err) {
      console.error('Failed to fetch foreshadowing:', err);
      setError('加载伏笔数据失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchForeshadowing();
  }, [fetchForeshadowing]);

  // Get status icon
  const getStatusIcon = (status?: string) => {
    if (status === 'RESOLVED') {
      return <CheckCircle className="w-4 h-4 text-emerald-400" />;
    }
    if (status === 'ABANDONED') {
      return <X className="w-4 h-4 text-slate-500" />;
    }
    return <Clock className="w-4 h-4 text-amber-400" />;
  };

  // Get status color
  const getStatusColor = (status?: string) => {
    if (status === 'RESOLVED') return 'border-emerald-500/30 bg-emerald-500/10';
    if (status === 'ABANDONED') return 'border-slate-600/30 bg-slate-600/10';
    return 'border-amber-500/30 bg-amber-500/10';
  };

  // Get status label
  const getStatusLabel = (status?: string) => {
    if (status === 'RESOLVED') return '已回收';
    if (status === 'ABANDONED') return '已放弃';
    return '待回收';
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Link2 className="w-5 h-5 text-amber-400" />
            伏笔链追踪
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchForeshadowing}
              disabled={loading}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              title="刷新数据"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
              <span className="ml-3 text-slate-400">加载伏笔数据中...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-red-400">
              <AlertCircle className="w-8 h-8 mb-2" />
              <p>{error}</p>
              <button
                onClick={fetchForeshadowing}
                className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-white transition-colors"
              >
                重试
              </button>
            </div>
          ) : foreshadowing.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <CheckCircle className="w-8 h-8 mb-2 text-emerald-400" />
              <p>暂无未回收的伏笔</p>
              <p className="text-xs text-slate-500 mt-1">所有伏笔都已妥善处理</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-amber-400">{foreshadowing.length}</div>
                  <div className="text-xs text-slate-500">待回收伏笔</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-emerald-400">
                    {foreshadowing.filter((f) => f.relatedChapter).length}
                  </div>
                  <div className="text-xs text-slate-500">已关联章节</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <div className="text-2xl font-bold text-slate-400">
                    {foreshadowing.filter((f) => !f.relatedChapter).length}
                  </div>
                  <div className="text-xs text-slate-500">未关联章节</div>
                </div>
              </div>

              {/* Foreshadowing List */}
              {foreshadowing.map((item, idx) => (
                <div
                  key={idx}
                  className={`bg-slate-800/30 rounded-xl border ${getStatusColor(item.relatedChapter ? 'RESOLVED' : 'OPEN')} overflow-hidden`}
                >
                  <button
                    onClick={() =>
                      setExpandedId(
                        expandedId === `${item.subject}-${item.object}-${idx}`
                          ? null
                          : `${item.subject}-${item.object}-${idx}`
                      )
                    }
                    className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(item.relatedChapter ? 'RESOLVED' : 'OPEN')}
                      <div className="text-left">
                        <div className="text-sm text-white font-medium">
                          {item.subject}
                          <ArrowRight className="w-3 h-3 inline mx-1 text-slate-600" />
                          <span className="text-amber-400">{item.relation}</span>
                          <ArrowRight className="w-3 h-3 inline mx-1 text-slate-600" />
                          {item.object}
                        </div>
                        {item.relatedChapter && (
                          <div className="text-xs text-slate-500 mt-1">
                            关联章节: {item.relatedChapter}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          item.relatedChapter
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {getStatusLabel(item.relatedChapter ? 'RESOLVED' : 'OPEN')}
                      </span>
                      {expandedId === `${item.subject}-${item.object}-${idx}` ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {expandedId === `${item.subject}-${item.object}-${idx}` && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-700/50 animate-fade-in">
                      <div className="text-xs text-slate-500 mb-2">
                        创建时间: {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </div>
                      <div className="text-xs text-slate-500 mb-3">Echo ID: {item.echoId}</div>
                      <div className="flex gap-2">
                        <button className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs text-white transition-colors flex items-center justify-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          查看源Echo
                        </button>
                        <button className="flex-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs text-white transition-colors">
                          标记为已回收
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              显示所有未回收的伏笔。建议定期检查并回收重要伏笔。
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm text-white transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForeshadowingChainPanel;
