import React, { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { UI_CONFIG } from '../../config/constants';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

interface ToastStyleConfig {
  icon: React.ReactNode;
  bgClass: string;
  borderClass: string;
  iconColor: string;
  progressColor: string;
}

const TOAST_CONFIG: Record<ToastType, ToastStyleConfig> = {
  success: {
    icon: <CheckCircle size={18} />,
    bgClass: 'bg-emerald-950/90',
    borderClass: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
    progressColor: 'bg-emerald-500',
  },
  error: {
    icon: <XCircle size={18} />,
    bgClass: 'bg-red-950/90',
    borderClass: 'border-red-500/30',
    iconColor: 'text-red-400',
    progressColor: 'bg-red-500',
  },
  warning: {
    icon: <AlertTriangle size={18} />,
    bgClass: 'bg-amber-950/90',
    borderClass: 'border-amber-500/30',
    iconColor: 'text-amber-400',
    progressColor: 'bg-amber-500',
  },
  info: {
    icon: <Info size={18} />,
    bgClass: 'bg-blue-950/90',
    borderClass: 'border-blue-500/30',
    iconColor: 'text-blue-400',
    progressColor: 'bg-blue-500',
  },
};

const DEFAULT_DURATION = UI_CONFIG.TOAST_DURATION;
const EXIT_ANIMATION_DURATION = UI_CONFIG.TOAST_EXIT_ANIMATION_DURATION;

const ToastItem: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number>(Date.now());
  const remainingTimeRef = useRef<number>(toast.duration ?? DEFAULT_DURATION);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const config = TOAST_CONFIG[toast.type];
  const duration = toast.duration ?? DEFAULT_DURATION;

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, EXIT_ANIMATION_DURATION);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    if (isHovered) {
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - (Date.now() - startTimeRef.current));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    startTimeRef.current = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = remainingTimeRef.current - elapsed;
      const newProgress = Math.max(0, (remaining / duration) * 100);

      setProgress(newProgress);

      if (remaining <= 0) {
        handleDismiss();
      } else {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isHovered, duration, handleDismiss]);

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg border shadow-lg backdrop-blur-sm
        transform transition-all duration-300 ease-out min-w-[320px] max-w-[420px]
        ${config.bgClass} ${config.borderClass}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        ${!isExiting ? 'animate-slide-in-right' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div className={`flex-shrink-0 ${config.iconColor}`}>
          {config.icon}
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 font-medium leading-relaxed break-words">
            {toast.message}
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700/50"
          aria-label="关闭通知"
        >
          <X size={14} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/50">
        <div
          className={`h-full ${config.progressColor} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default ToastItem;
