/**
 * EchoFeed Component
 * Displays a list of echoes for user review and action
 */

import React from 'react';
import { CheckCircle, XCircle, Clock, User, Globe } from 'lucide-react';
import type { Echo } from '../../types';

interface EchoFeedProps {
  echoes: Echo[];
  selectedEchoId: string | null;
  viewFilter: 'PENDING' | 'HISTORY';
  onSelectEcho: (echoId: string) => void;
  onAcceptEcho: (echoId: string) => void;
  onRejectEcho: (echoId: string) => void;
}

export const EchoFeed: React.FC<EchoFeedProps> = ({
  echoes,
  selectedEchoId,
  viewFilter,
  onSelectEcho,
  onAcceptEcho,
  onRejectEcho,
}) => {
  if (echoes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        <div className="text-center">
          <Clock size={32} className="mx-auto mb-2 opacity-50" />
          <p>
            {viewFilter === 'PENDING'
              ? '没有待处理的回响'
              : '没有历史记录'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2 space-y-2">
        {echoes.map((echo) => (
          <div
            key={echo.id}
            onClick={() => onSelectEcho(echo.id)}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              selectedEchoId === echo.id
                ? 'bg-muse-900/30 border-muse-500/50'
                : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {echo.type === 'CHARACTER' ? (
                    <User size={14} className="text-blue-400" />
                  ) : (
                    <Globe size={14} className="text-green-400" />
                  )}
                  <span className="text-xs text-slate-400 font-medium">
                    {echo.targetName}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      echo.status === 'PENDING'
                        ? 'bg-yellow-900/50 text-yellow-300'
                        : echo.status === 'ACCEPTED'
                          ? 'bg-green-900/50 text-green-300'
                          : echo.status === 'REJECTED'
                            ? 'bg-red-900/50 text-red-300'
                            : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {echo.status}
                  </span>
                </div>
                <p className="text-sm text-slate-200 line-clamp-2">
                  {echo.description}
                </p>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {echo.reason}
                </p>
              </div>

              {viewFilter === 'PENDING' && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAcceptEcho(echo.id);
                    }}
                    className="p-1.5 rounded bg-green-900/30 hover:bg-green-800/50 text-green-400 transition-colors"
                    title="采纳"
                  >
                    <CheckCircle size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRejectEcho(echo.id);
                    }}
                    className="p-1.5 rounded bg-red-900/30 hover:bg-red-800/50 text-red-400 transition-colors"
                    title="拒绝"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EchoFeed;
