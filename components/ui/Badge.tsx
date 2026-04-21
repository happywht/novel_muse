/**
 * Badge and Tag - 徽章和标签组件
 *
 * 提供状态标记和分类标签
 * Provides status badges and category tags
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

/**
 * Badge尺寸
 */
export type BadgeSize = 'xs' | 'sm' | 'md' | 'lg';

/**
 * Badge颜色变体
 */
export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

/**
 * Badge组件属性
 */
export interface BadgeProps {
  /**
   * 子元素
   */
  children: React.ReactNode;

  /**
   * 尺寸
   * @default 'md'
   */
  size?: BadgeSize;

  /**
   * 颜色变体
   * @default 'default'
   */
  variant?: BadgeVariant;

  /**
   * 是否为点状
   */
  dot?: boolean;

  /**
   * 是否可关闭
   */
  closeable?: boolean;

  /**
   * 关闭回调
   */
  onClose?: () => void;

  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 尺寸映射
 */
const sizeStyles: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

/**
 * 颜色变体映射
 */
const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100',
  primary: 'bg-muse-200 dark:bg-muse-800 text-muse-900 dark:text-muse-100',
  secondary: 'bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100',
  success: 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100',
  warning: 'bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100',
  error: 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100',
  info: 'bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100',
};

/**
 * Badge - 徽章组件
 *
 * @example
 * ```tsx
 * <Badge variant="success">成功</Badge>
 * <Badge variant="error" dot />
 * <Badge closeable onClose={handleClose}>可关闭</Badge>
 * ```
 */
export const Badge: React.FC<BadgeProps> = ({
  children,
  size = 'md',
  variant = 'default',
  dot = false,
  closeable = false,
  onClose,
  className,
}) => {
  return (
    <span
      className={cn(
        'touch-target',
        'inline-flex items-center gap-1.5',
        'rounded-full',
        'font-medium',
        'transition-colors duration-200',
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            'bg-current',
            'opacity-75'
          )}
        />
      )}
      {children}
      {closeable && (
        <button
          onClick={onClose}
          className={cn(
            'touch-target',
            'p-0.5 rounded-full',
            'hover:bg-black/10 dark:hover:bg-white/10',
            'transition-colors',
            'flex-shrink-0'
          )}
          aria-label="关闭"
        >
          <X size={12} className="text-current" />
        </button>
      )}
    </span>
  );
};

/**
 * StatusBadge - 状态徽章快捷组件
 */
export const StatusBadge: React.FC<{
  status: 'online' | 'offline' | 'away' | 'busy';
  showText?: boolean;
  className?: string;
}> = ({ status, showText = true, className }) => {
  const statusConfig: Record<
    string,
    { variant: BadgeVariant; text: string; dotColor: string }
  > = {
    online: { variant: 'success', text: '在线', dotColor: 'bg-green-500' },
    offline: { variant: 'default', text: '离线', dotColor: 'bg-slate-400' },
    away: { variant: 'warning', text: '离开', dotColor: 'bg-amber-500' },
    busy: { variant: 'error', text: '忙碌', dotColor: 'bg-red-500' },
  };

  const config = statusConfig[status];

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span
        className={cn(
          'w-2 h-2 rounded-full',
          config.dotColor,
          status === 'online' && 'animate-pulse'
        )}
      />
      {showText && <span className="text-sm text-slate-600 dark:text-slate-400">{config.text}</span>}
    </div>
  );
};

/**
 * CountBadge - 计数徽章组件
 */
export const CountBadge: React.FC<{
  count: number;
  max?: number;
  showZero?: boolean;
  size?: BadgeSize;
  variant?: BadgeVariant;
  className?: string;
}> = ({ count, max = 99, showZero = false, size = 'xs', variant = 'error', className }) => {
  if (!showZero && count === 0) return null;

  const displayCount = count > max ? `${max}+` : count;

  return (
    <Badge size={size} variant={variant} className={className}>
      {displayCount}
    </Badge>
  );
};

/**
 * Tag - 标签组件
 */
export interface TagProps {
  /**
   * 标签内容
   */
  children: React.ReactNode;

  /**
   * 尺寸
   * @default 'md'
   */
  size?: BadgeSize;

  /**
   * 颜色
   * @default 'default'
   */
  color?: BadgeVariant;

  /**
   * 是否可关闭
   */
  closeable?: boolean;

  /**
   * 关闭回调
   */
  onClose?: () => void;

  /**
   * 图标
   */
  icon?: React.ReactNode;

  /**
   * 点击回调
   */
  onClick?: () => void;

  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * Tag - 标签组件
 *
 * @example
 * ```tsx
 * <Tag color="primary">React</Tag>
 * <Tag color="success" icon={<Check size={14} />}>已完成</Tag>
 * <Tag closeable onClose={handleClose}>可关闭标签</Tag>
 * ```
 */
export const Tag: React.FC<TagProps> = ({
  children,
  size = 'md',
  color = 'default',
  closeable = false,
  onClose,
  icon,
  onClick,
  className,
}) => {
  return (
    <span
      className={cn(
        'touch-target',
        'inline-flex items-center gap-1.5',
        'rounded-md',
        'font-medium',
        'transition-all duration-200',
        'border',
        sizeStyles[size],
        variantStyles[color],
        'border-current/20',
        onClick && 'cursor-pointer hover:opacity-80 active:scale-95',
        className
      )}
      onClick={onClick}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
      {closeable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
          className={cn(
            'touch-target',
            'p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10',
            'transition-colors',
            'flex-shrink-0'
          )}
          aria-label="关闭"
        >
          <X size={12} className="text-current" />
        </button>
      )}
    </span>
  );
};

/**
 * TagGroup - 标签组
 */
export const TagGroup: React.FC<{
  tags: Array<{ id: string; label: string; color?: BadgeVariant }>;
  closable?: boolean;
  onClose?: (id: string) => void;
  className?: string;
}> = ({ tags, closable = false, onClose, className }) => {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tags.map((tag) => (
        <Tag
          key={tag.id}
          color={tag.color}
          closeable={closable}
          onClose={() => onClose?.(tag.id)}
        >
          {tag.label}
        </Tag>
      ))}
    </div>
  );
};

/**
 * Chip - 芯片组件（可交互标签）
 */
export const Chip: React.FC<{
  label: string;
  selected?: boolean;
  onSelect?: () => void;
  avatar?: React.ReactNode;
  size?: BadgeSize;
  className?: string;
}> = ({ label, selected = false, onSelect, avatar, size = 'md', className }) => {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'touch-target',
        'inline-flex items-center gap-2',
        'px-3 py-1.5',
        'rounded-full',
        'font-medium',
        'transition-all duration-200',
        'border',
        'hover:shadow-md',
        selected
          ? 'bg-muse-600 dark:bg-muse-500 text-white border-muse-600'
          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:border-muse-400',
        size === 'xs' && 'px-2 py-1 text-xs',
        size === 'sm' && 'px-2.5 py-1 text-xs',
        size === 'lg' && 'px-4 py-2 text-base',
        className
      )}
    >
      {avatar && <span className="flex-shrink-0">{avatar}</span>}
      {label}
      {selected && (
        <span className="flex-shrink-0 ml-1">
          <X size={14} />
        </span>
      )}
    </button>
  );
};

/**
 * ProgressBadge - 进度徽章
 */
export const ProgressBadge: React.FC<{
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
}> = ({ progress, size = 32, strokeWidth = 3, className }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('relative inline-flex', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 背景圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-200 dark:stroke-slate-700"
          fill="none"
          strokeWidth={strokeWidth}
        />
        {/* 进度圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-muse-600 dark:stroke-muse-400 transition-all duration-500"
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      {/* 中心文本 */}
      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-900 dark:text-slate-100">
        {progress}%
      </span>
    </div>
  );
};
