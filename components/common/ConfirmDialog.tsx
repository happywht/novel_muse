import React, { useEffect, useCallback, useRef } from 'react';
import { AlertCircle, AlertTriangle, Info, X, Loader2 } from 'lucide-react';

/**
 * 确认对话框配置选项
 */
export interface ConfirmOptions {
  /** 对话框标题，默认不显示 */
  title?: string;
  /** 主要消息内容 */
  message: string;
  /** 确认按钮文本，默认"确定" */
  confirmText?: string;
  /** 取消按钮文本，默认"取消" */
  cancelText?: string;
  /** 视觉变体风格 */
  variant?: 'default' | 'danger' | 'warning';
  /** 自定义图标，不设置则根据 variant 自动选择 */
  icon?: React.ReactNode;
  /** 是否允许点击背景关闭，默认 true */
  closeOnBackdrop?: boolean;
}

/**
 * 确认对话框组件属性
 */
export interface ConfirmDialogProps extends ConfirmOptions {
  /** 是否显示对话框 */
  isOpen: boolean;
  /** 确认回调 */
  onConfirm: () => void | Promise<void>;
  /** 取消回调 */
  onCancel: () => void;
  /** 是否处于加载状态 */
  isLoading?: boolean;
}

/**
 * 获取变体对应的样式配置
 */
const getVariantStyles = (variant: ConfirmOptions['variant']) => {
  switch (variant) {
    case 'danger':
      return {
        icon: <AlertCircle className="w-6 h-6" />,
        iconBg: 'bg-red-500/20',
        iconColor: 'text-red-400',
        confirmBtn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
        ringColor: 'ring-red-500/30',
      };
    case 'warning':
      return {
        icon: <AlertTriangle className="w-6 h-6" />,
        iconBg: 'bg-amber-500/20',
        iconColor: 'text-amber-400',
        confirmBtn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
        ringColor: 'ring-amber-500/30',
      };
    case 'default':
    default:
      return {
        icon: <Info className="w-6 h-6" />,
        iconBg: 'bg-blue-500/20',
        iconColor: 'text-blue-400',
        confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
        ringColor: 'ring-blue-500/30',
      };
  }
};

/**
 * 通用确认对话框组件
 *
 * 替代原生 window.confirm()，提供更好的用户体验和视觉一致性。
 * 支持多种变体风格、异步操作加载状态、键盘快捷键等特性。
 *
 * @example
 * ```tsx
 * <ConfirmDialog
 *   isOpen={showDialog}
 *   title="删除角色"
 *   message="确定要删除此角色吗？此操作不可撤销。"
 *   variant="danger"
 *   confirmText="删除"
 *   cancelText="取消"
 *   onConfirm={handleConfirm}
 *   onCancel={handleCancel}
 * />
 * ```
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  variant = 'default',
  icon,
  closeOnBackdrop = true,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const styles = getVariantStyles(variant);

  // 键盘事件处理
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen || isLoading) return;

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          onCancel();
          break;
        case 'Enter':
          event.preventDefault();
          onConfirm();
          break;
      }
    },
    [isOpen, isLoading, onCancel, onConfirm]
  );

  // 背景点击处理
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent) => {
      if (closeOnBackdrop && event.target === event.currentTarget && !isLoading) {
        onCancel();
      }
    },
    [closeOnBackdrop, isLoading, onCancel]
  );

  // 注册键盘事件监听
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // 自动聚焦确认按钮
      confirmButtonRef.current?.focus();
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'confirm-dialog-title' : undefined}
      aria-describedby="confirm-dialog-message"
    >
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        aria-hidden="true"
      />

      {/* 对话框内容 */}
      <div
        className={`
          relative w-full max-w-md
          bg-slate-900 border border-slate-800/60
          rounded-xl shadow-2xl
          animate-fade-in
          focus:outline-none
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部关闭按钮 */}
        <button
          onClick={onCancel}
          disabled={isLoading}
          className={`
            absolute top-3 right-3 p-1.5
            text-slate-500 hover:text-slate-300
            hover:bg-slate-800 rounded-lg
            transition-colors
            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label="关闭"
        >
          <X className="w-4 h-4" />
        </button>

        {/* 内容区域 */}
        <div className="p-6">
          {/* 图标与标题 */}
          <div className="flex items-start gap-4 mb-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-xl ${styles.iconBg} flex items-center justify-center`}>
              <span className={styles.iconColor}>
                {icon || styles.icon}
              </span>
            </div>
            <div className="flex-1 min-w-0 pt-1">
              {title && (
                <h3
                  id="confirm-dialog-title"
                  className="text-lg font-semibold text-white mb-2"
                >
                  {title}
                </h3>
              )}
              <p
                id="confirm-dialog-message"
                className="text-sm text-slate-400 leading-relaxed"
              >
                {message}
              </p>
            </div>
          </div>

          {/* 按钮区域 */}
          <div className="flex items-center justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className={`
                px-4 py-2.5
                text-sm font-medium text-slate-300
                bg-slate-800/50 hover:bg-slate-700
                border border-slate-700/50 rounded-lg
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-slate-500
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {cancelText}
            </button>
            <button
              ref={confirmButtonRef}
              onClick={onConfirm}
              disabled={isLoading}
              className={`
                px-4 py-2.5
                text-sm font-medium text-white
                rounded-lg
                transition-colors
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
                disabled:opacity-70 disabled:cursor-not-allowed
                inline-flex items-center gap-2
                ${styles.confirmBtn}
                focus:${styles.ringColor}
              `}
            >
              {isLoading && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
