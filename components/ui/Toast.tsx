/**
 * Toast - 通知消息组件
 *
 * 提供临时通知消息展示
 * Provides temporary notification messages
 */

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  X,
  Loader2,
} from 'lucide-react';

/**
 * Toast类型
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

/**
 * Toast位置
 */
export type ToastPosition =
  | 'top-right'
  | 'top-center'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-center'
  | 'bottom-left';

/**
 * Toast配置
 */
export interface ToastOptions {
  /**
   * 类型
   * @default 'info'
   */
  type?: ToastType;

  /**
   * 标题
   */
  title?: string;

  /**
   * 消息内容
   */
  message: string;

  /**
   * 持续时间（毫秒）
   * @default 5000
   */
  duration?: number;

  /**
   * 位置
   * @default 'top-right'
   */
  position?: ToastPosition;

  /**
   * 是否可关闭
   * @default true
   */
  closeable?: boolean;

  /**
   * 是否显示进度条
   * @default true
   */
  showProgress?: boolean;

  /**
   * 自定义图标
   */
  icon?: React.ReactNode;

  /**
   * 点击回调
   */
  onClick?: () => void;

  /**
   * 关闭回调
   */
  onClose?: () => void;

  /**
   * 自定义操作按钮
   */
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Toast内部状态
 */
interface Toast extends ToastOptions {
  id: string;
  createdAt: number;
}

/**
 * 默认图标映射
 */
const defaultIcons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={20} />,
  error: <XCircle size={20} />,
  warning: <AlertCircle size={20} />,
  info: <Info size={20} />,
  loading: <Loader2 size={20} className="animate-spin" />,
};

/**
 * 颜色映射
 */
const colorClasses: Record<
  ToastType,
  { container: string; icon: string; progress: string }
> = {
  success: {
    container: 'border-green-500 bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
    progress: 'bg-green-600 dark:bg-green-400',
  },
  error: {
    container: 'border-red-500 bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    progress: 'bg-red-600 dark:bg-red-400',
  },
  warning: {
    container: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20',
    icon: 'text-amber-600 dark:text-amber-400',
    progress: 'bg-amber-600 dark:bg-amber-400',
  },
  info: {
    container: 'border-muse-500 bg-muse-50 dark:bg-muse-900/20',
    icon: 'text-muse-600 dark:text-muse-400',
    progress: 'bg-muse-600 dark:bg-muse-400',
  },
  loading: {
    container: 'border-muse-500 bg-muse-50 dark:bg-muse-900/20',
    icon: 'text-muse-600 dark:text-muse-400',
    progress: 'bg-muse-600 dark:bg-muse-400',
  },
};

/**
 * ToastItem - 单个Toast组件
 */
export const ToastItem: React.FC<{
  toast: Toast;
  onClose: (id: string) => void;
}> = ({ toast, onClose }) => {
  const { id, type = 'info', title, message, duration = 5000, closeable = true, showProgress = true, icon, onClick, onClose: handleClose, action } = toast;
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  const colors = colorClasses[type];
  const defaultIcon = defaultIcons[type];

  useEffect(() => {
    if (type === 'loading') return; // 加载类型不自动关闭

    const interval = 50;
    const step = 100 / (duration / interval);

    const timer = setInterval(() => {
      if (!isPaused) {
        setProgress((prev) => {
          if (prev <= step) {
            clearInterval(timer);
            onClose(id);
            return 0;
          }
          return prev - step;
        });
      }
    }, interval);

    return () => clearInterval(timer);
  }, [duration, isPaused, type, id, onClose]);

  return (
    <div
      className={cn(
        'touch-target',
        'relative flex items-start gap-3',
        'min-w-[320px] max-w-md',
        'p-4 rounded-lg shadow-lg',
        'border-l-4',
        'animate-slide-in-right',
        'transition-all duration-300',
        colors.container,
        onClick && 'cursor-pointer hover:shadow-xl',
        onClick && !isPaused && 'hover:scale-[1.02]'
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onClick={onClick}
      role="alert"
      aria-live="polite"
    >
      {/* 图标 */}
      <div className={cn('flex-shrink-0 mt-0.5', colors.icon)}>
        {icon || defaultIcon}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-sm mb-1">
            {title}
          </h4>
        )}
        <p className="text-sm text-slate-700 dark:text-slate-300 break-words">
          {message}
        </p>

        {/* 操作按钮 */}
        {action && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
              onClose(id);
            }}
            className={cn(
              'mt-2 text-sm font-medium',
              'underline',
              colors.icon.replace('text-', 'hover:text-'),
              'focus:outline-none focus:rounded'
            )}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* 关闭按钮 */}
      {closeable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose?.();
            onClose(id);
          }}
          className={cn(
            'touch-target',
            'flex-shrink-0 p-1',
            'rounded-md',
            'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200',
            'hover:bg-slate-200 dark:hover:bg-slate-700',
            'transition-colors'
          )}
          aria-label="关闭"
        >
          <X size={16} />
        </button>
      )}

      {/* 进度条 */}
      {showProgress && type !== 'loading' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700 rounded-b-lg overflow-hidden">
          <div
            className={cn('h-full transition-all duration-75 ease-linear', colors.progress)}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

/**
 * ToastContainer - Toast容器组件
 */
export const ToastContainer: React.FC<{
  toasts: Toast[];
  onClose: (id: string) => void;
  position?: ToastPosition;
}> = ({ toasts, onClose, position = 'top-right' }) => {
  const positionClasses: Record<ToastPosition, string> = {
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div
      className={cn(
        'fixed z-50 flex flex-col gap-2 pointer-events-none',
        positionClasses[position]
      )}
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={onClose} />
        </div>
      ))}
    </div>
  );
};

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Toast Context
 */
import { createContext, useContext } from 'react';

interface ToastContextValue {
  toasts: Toast[];
  addToast: (options: ToastOptions) => string;
  removeToast: (id: string) => void;
  clearAll: () => void;
  success: (message: string, options?: Partial<ToastOptions>) => string;
  error: (message: string, options?: Partial<ToastOptions>) => string;
  warning: (message: string, options?: Partial<ToastOptions>) => string;
  info: (message: string, options?: Partial<ToastOptions>) => string;
  loading: (message: string, options?: Partial<ToastOptions>) => string;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * ToastProvider - Toast提供者
 */
export const ToastProvider: React.FC<{
  children: React.ReactNode;
  position?: ToastPosition;
}> = ({ children, position = 'top-right' }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addToast = (options: ToastOptions): string => {
    const id = generateId();
    const newToast: Toast = {
      ...options,
      id,
      createdAt: Date.now(),
    };
    setToasts((prev) => [...prev, newToast]);
    return id;
  };

  const clearAll = () => {
    setToasts([]);
  };

  const success = (message: string, options: Partial<ToastOptions> = {}) => {
    return addToast({ ...options, type: 'success', message });
  };

  const error = (message: string, options: Partial<ToastOptions> = {}) => {
    return addToast({ ...options, type: 'error', message });
  };

  const warning = (message: string, options: Partial<ToastOptions> = {}) => {
    return addToast({ ...options, type: 'warning', message });
  };

  const info = (message: string, options: Partial<ToastOptions> = {}) => {
    return addToast({ ...options, type: 'info', message });
  };

  const loading = (message: string, options: Partial<ToastOptions> = {}) => {
    return addToast({ ...options, type: 'loading', message, duration: 0 });
  };

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        clearAll,
        success,
        error,
        warning,
        info,
        loading,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} position={position} />
    </ToastContext.Provider>
  );
};

/**
 * useToast Hook
 *
 * @example
 * ```tsx
 * const { success, error, loading } = useToast();
 *
 * success('操作成功！');
 * error('操作失败，请重试');
 * const id = loading('正在处理...');
 * ```
 */
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * withToast HOC
 *
 * @example
 * ```tsx
 * export default withToast(MyComponent);
 * ```
 */
export const withToast = <P extends object>(
  Component: React.ComponentType<P & { toast: ToastContextValue }>
) => {
  return (props: P) => {
    const toast = useToast();
    return <Component {...props} toast={toast} />;
  };
};
