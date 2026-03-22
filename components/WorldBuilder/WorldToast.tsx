import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useWorldBuilder } from './WorldBuilderContext';

/**
 * 世界观 Toast 通知组件
 */
export const WorldToast: React.FC = () => {
  const { toast } = useWorldBuilder();

  if (!toast) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-2xl z-50 transition-all animate-fade-in font-medium text-sm flex items-center gap-2 border ${
        toast.type === 'error'
          ? 'bg-red-500/10 border-red-500/50 text-red-200'
          : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-200'
      }`}
    >
      {toast.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
      <span>{toast.msg}</span>
    </div>
  );
};

export default WorldToast;
