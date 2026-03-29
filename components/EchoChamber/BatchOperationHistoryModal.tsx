import React from 'react';
import {
  X,
  CheckCircle,
  Trash2,
  History,
  AlertTriangle,
  Loader2,
  RotateCcw,
  List,
} from 'lucide-react';
import { BatchOperationHistoryItem } from '../../services/apiService';

interface BatchOperationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  useBackend: boolean;
  batchOperationHistory: BatchOperationHistoryItem[];
  undoingOperationId: string | null;
  onUndo: (operationId: string) => Promise<void>;
}

export const BatchOperationHistoryModal: React.FC<BatchOperationHistoryModalProps> = ({
  isOpen,
  onClose,
  useBackend,
  batchOperationHistory,
  undoingOperationId,
  onUndo,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[500px] max-h-[70vh] bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <List className="text-muse-400" size={20} />
            <h2 className="text-lg font-bold text-white">批量操作历史</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {!useBackend ? (
            <div className="text-center py-8 text-slate-500">
              <AlertTriangle size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">批量操作历史需要后端支持</p>
              <p className="text-xs mt-1">请启用后端服务以使用此功能</p>
            </div>
          ) : batchOperationHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <History size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">暂无批量操作历史</p>
              <p className="text-xs mt-1">最近的批量操作记录将显示在这里</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batchOperationHistory.map((item: BatchOperationHistoryItem) => (
                <div
                  key={item.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {item.operation === 'BATCH_ACCEPT' ? (
                        <CheckCircle size={16} className="text-emerald-400" />
                      ) : (
                        <Trash2 size={16} className="text-rose-400" />
                      )}
                      <span
                        className={`text-sm font-bold ${
                          item.operation === 'BATCH_ACCEPT' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.operation === 'BATCH_ACCEPT' ? '批量采纳' : '批量拒绝'}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">
                      {new Date(item.timestamp).toLocaleString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      影响 <span className="font-bold text-slate-300">{item.echoCount}</span> 条
                      Echo
                    </div>

                    {item.canUndo && (
                      <button
                        onClick={async () => {
                          if (undoingOperationId === item.id) return;

                          try {
                            await onUndo(item.id);
                            onClose();
                          } catch (err) {
                            console.error('Failed to undo:', err);
                          }
                        }}
                        disabled={undoingOperationId === item.id}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          undoingOperationId === item.id
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-amber-900/50 hover:bg-amber-800 text-amber-200 border border-amber-500/30 active:scale-95'
                        }`}
                      >
                        {undoingOperationId === item.id ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            撤销中...
                          </>
                        ) : (
                          <>
                            <RotateCcw size={12} />
                            撤销
                          </>
                        )}
                      </button>
                    )}

                    {!item.canUndo && (
                      <span className="text-xs text-slate-600 px-3 py-1.5">已过期</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30">
          <p className="text-xs text-slate-500 text-center">批量操作在 5 分钟内可撤销</p>
        </div>
      </div>
    </div>
  );
};
