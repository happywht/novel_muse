/**
 * Dialog - 对话框组件
 *
 * 提供确认对话框、警告对话框等交互反馈
 * Provides confirmation dialogs, warning dialogs, etc.
 */

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  X,
  Info,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';

/**
 * 对话框类型
 */
export type DialogType = 'default' | 'danger' | 'warning' | 'info' | 'success';

/**
 * 对话框属性
 */
export interface DialogProps {
  /**
   * 是否打开
   */
  open: boolean;

  /**
   * 关闭回调
   */
  onClose: () => void;

  /**
   * 标题
   */
  title?: string;

  /**
   * 内容
   */
  children: React.ReactNode;

  /**
   * 类型
   * @default 'default'
   */
  type?: DialogType;

  /**
   * 大小
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';

  /**
   * 是否显示关闭按钮
   * @default true
   */
  showCloseButton?: boolean;

  /**
   * 点击遮罩是否关闭
   * @default true
   */
  closeOnBackdropClick?: boolean;

  /**
   * 按ESC键是否关闭
   * @default true
   */
  closeOnEscape?: boolean;

  /**
   * 主要操作按钮
   */
  primaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'primary' | 'danger';
    loading?: boolean;
  };

  /**
   * 次要操作按钮
   */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 遮罩类名
   */
  backdropClassName?: string;
}

/**
 * 类型配置映射
 */
const typeConfig: Record<
  DialogType,
  { icon: React.ReactNode; iconBg: string; iconColor: string }
> = {
  default: {
    icon: <Info size={32} />,
    iconBg: 'bg-muse-100 dark:bg-muse-900/30',
    iconColor: 'text-muse-600 dark:text-muse-400',
  },
  danger: {
    icon: <XCircle size={32} />,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  warning: {
    icon: <AlertTriangle size={32} />,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  info: {
    icon: <Info size={32} />,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  success: {
    icon: <CheckCircle size={32} />,
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
  },
};

/**
 * 尺寸映射
 */
const sizeClasses: Record<
  'sm' | 'md' | 'lg' | 'xl' | 'full',
  string
> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-full mx-4',
};

/**
 * Dialog - 主组件
 *
 * @example
 * ```tsx
 * <Dialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="确认删除"
 *   type="danger"
 *   primaryAction={{
 *     label: '删除',
 *     onClick: handleDelete,
 *     variant: 'danger',
 *   }}
 *   secondaryAction={{
 *     label: '取消',
 *     onClick: () => setIsOpen(false),
 *   }}
 * >
 *   <p>此操作无法撤销，确定要删除吗？</p>
 * </Dialog>
 * ```
 */
export const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  children,
  type = 'default',
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  primaryAction,
  secondaryAction,
  className,
  backdropClassName,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // 保存和恢复焦点
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;

      // 设置焦点到对话框
      setTimeout(() => {
        dialogRef.current?.focus();
      }, 0);

      // 禁止背景滚动
      document.body.style.overflow = 'hidden';
    } else {
      // 恢复焦点
      previousActiveElement.current?.focus();

      // 恢复背景滚动
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // ESC键关闭
  useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, closeOnEscape, onClose]);

  // 焦点陷阱
  useEffect(() => {
    if (!open) return;

    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusableElements = dialog.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[
        focusableElements.length - 1
      ] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    document.addEventListener('keydown', trapFocus);
    return () => document.removeEventListener('keydown', trapFocus);
  }, [open]);

  if (!open) return null;

  const config = typeConfig[type];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* 遮罩 */}
      <div
        className={cn(
          'absolute inset-0',
          'bg-black/50 backdrop-blur-sm',
          'animate-fade-in',
          backdropClassName
        )}
        onClick={closeOnBackdropClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* 对话框 */}
      <div className="relative w-full h-full flex items-center justify-center p-4">
        <div
          ref={dialogRef}
          tabIndex={-1}
          className={cn(
            'relative w-full',
            'bg-white dark:bg-slate-800',
            'rounded-lg shadow-xl',
            'animate-scale-in',
            sizeClasses[size],
            'max-h-[90vh] overflow-y-auto',
            className
          )}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'dialog-title' : undefined}
        >
          {/* 头部 */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                {type !== 'default' && (
                  <div
                    className={cn(
                      'flex-shrink-0 w-12 h-12 rounded-full',
                      'flex items-center justify-center',
                      config.iconBg
                    )}
                  >
                    <div className={config.iconColor}>{config.icon}</div>
                  </div>
                )}
                {title && (
                  <h2
                    id="dialog-title"
                    className="text-lg font-semibold text-slate-900 dark:text-slate-100"
                  >
                    {title}
                  </h2>
                )}
              </div>

              {showCloseButton && (
                <button
                  onClick={onClose}
                  className={cn(
                    'touch-target',
                    'p-2 rounded-lg',
                    'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200',
                    'hover:bg-slate-100 dark:hover:bg-slate-700',
                    'transition-colors'
                  )}
                  aria-label="关闭"
                >
                  <X size={20} />
                </button>
              )}
            </div>
          )}

          {/* 内容 */}
          <div className="p-6">{children}</div>

          {/* 底部操作按钮 */}
          {(primaryAction || secondaryAction) && (
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
              {secondaryAction && (
                <button
                  onClick={secondaryAction.onClick}
                  className={cn(
                    'touch-target',
                    'px-4 py-2 rounded-lg',
                    'bg-slate-200 dark:bg-slate-700',
                    'text-slate-700 dark:text-slate-300',
                    'hover:bg-slate-300 dark:hover:bg-slate-600',
                    'transition-colors',
                    'font-medium'
                  )}
                >
                  {secondaryAction.label}
                </button>
              )}

              {primaryAction && (
                <button
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.loading}
                  className={cn(
                    'touch-target',
                    'px-4 py-2 rounded-lg',
                    'font-medium',
                    'transition-colors',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    primaryAction.variant === 'danger' &&
                      'bg-red-600 hover:bg-red-700 text-white',
                    primaryAction.variant === 'primary' &&
                      'bg-muse-600 hover:bg-muse-700 text-white',
                    !primaryAction.variant &&
                      'bg-muse-600 hover:bg-muse-700 text-white'
                  )}
                >
                  {primaryAction.loading ? '处理中...' : primaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * ConfirmDialog - 确认对话框快捷组件
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   onConfirm={handleConfirm}
 *   title="确认删除"
 *   message="此操作无法撤销，确定要删除吗？"
 * />
 * ```
 */
export const ConfirmDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: DialogType;
  loading?: boolean;
}> = ({
  open,
  onClose,
  onConfirm,
  title = '确认',
  message,
  confirmLabel = '确认',
  cancelLabel = '取消',
  type = 'default',
  loading = false,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      type={type}
      primaryAction={{
        label: confirmLabel,
        onClick: onConfirm,
        variant: type === 'danger' ? 'danger' : 'primary',
        loading,
      }}
      secondaryAction={{
        label: cancelLabel,
        onClick: onClose,
      }}
    >
      <p className="text-slate-700 dark:text-slate-300">{message}</p>
    </Dialog>
  );
};

/**
 * AlertDialog - 警告对话框快捷组件
 */
export const AlertDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}> = ({
  open,
  onClose,
  onConfirm,
  title = '警告',
  message,
  confirmLabel = '我知道了',
  cancelLabel,
  loading = false,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      type="warning"
      primaryAction={{
        label: confirmLabel,
        onClick: onConfirm,
        loading,
      }}
      secondaryAction={
        cancelLabel
          ? {
              label: cancelLabel,
              onClick: onClose,
            }
          : undefined
      }
    >
      <p className="text-slate-700 dark:text-slate-300">{message}</p>
    </Dialog>
  );
};

/**
 * InfoDialog - 信息对话框快捷组件
 */
export const InfoDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
}> = ({
  open,
  onClose,
  title = '提示',
  message,
  confirmLabel = '确定',
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      type="info"
      primaryAction={{
        label: confirmLabel,
        onClick: onClose,
      }}
    >
      <p className="text-slate-700 dark:text-slate-300">{message}</p>
    </Dialog>
  );
};

/**
 * SuccessDialog - 成功对话框快捷组件
 */
export const SuccessDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
}> = ({
  open,
  onClose,
  title = '成功',
  message,
  confirmLabel = '确定',
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      type="success"
      primaryAction={{
        label: confirmLabel,
        onClick: onClose,
      }}
    >
      <p className="text-slate-700 dark:text-slate-300">{message}</p>
    </Dialog>
  );
};

/**
 * ErrorDialog - 错误对话框快捷组件
 */
export const ErrorDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
}> = ({
  open,
  onClose,
  title = '错误',
  message,
  confirmLabel = '确定',
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      type="danger"
      primaryAction={{
        label: confirmLabel,
        onClick: onClose,
        variant: 'danger',
      }}
    >
      <p className="text-slate-700 dark:text-slate-300">{message}</p>
    </Dialog>
  );
};

/**
 * useDialog Hook
 *
 * @example
 * ```tsx
 * const dialog = useDialog();
 *
 * <ConfirmDialog
 *   open={dialog.isOpen}
 *   onClose={dialog.close}
 *   onConfirm={handleConfirm}
 *   message="确认删除？"
 * />
 * ```
 */
export const useDialog = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
};
