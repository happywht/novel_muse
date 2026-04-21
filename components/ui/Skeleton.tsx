/**
 * Skeleton - 骨架屏组件
 *
 * 用于内容加载时显示占位符，提升用户体验
 * Displays placeholders during content loading to improve UX
 */

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Skeleton基础组件
 */
interface SkeletonProps {
  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 是否启用动画
   * @default true
   */
  animate?: boolean;

  /**
   * 背景色变体
   * @default 'default'
   */
  variant?: 'default' | 'primary' | 'muted';
}

/**
 * 颜色变体映射
 */
const variantClasses: Record<
  'default' | 'primary' | 'muted',
  { bg: string; shimmer: string }
> = {
  default: {
    bg: 'bg-slate-200 dark:bg-slate-700',
    shimmer: 'shimmer-default',
  },
  primary: {
    bg: 'bg-muse-200 dark:bg-muse-800',
    shimmer: 'shimmer-primary',
  },
  muted: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    shimmer: 'shimmer-muted',
  },
};

/**
 * Skeleton - 基础骨架屏元素
 *
 * @example
 * ```tsx
 * <Skeleton className="h-4 w-3/4" />
 * <Skeleton className="h-12 w-12 rounded-full" />
 * ```
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  animate = true,
  variant = 'default',
}) => {
  const colors = variantClasses[variant];

  return (
    <div
      className={cn(
        'rounded',
        colors.bg,
        animate && 'animate-pulse',
        className
      )}
      aria-hidden="true"
    />
  );
};

/**
 * SkeletonText - 文本骨架屏
 *
 * @example
 * ```tsx
 * <SkeletonText lines={3} />
 * <SkeletonText lines={2} className="max-w-md" />
 * ```
 */
export const SkeletonText: React.FC<{
  /**
   * 行数
   * @default 3
   */
  lines?: number;

  /**
   * 每行高度
   * @default 'h-4'
   */
  lineHeight?: string;

  /**
   * 行间距
   * @default 'gap-2'
   */
  gap?: string;

  /**
   * 最后一行宽度比例
   * @default 'w-3/4'
   */
  lastLineWidth?: string;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 是否显示标题行
   */
  withTitle?: boolean;

  /**
   * 标题行高度
   * @default 'h-6'
   */
  titleHeight?: string;
}> = ({
  lines = 3,
  lineHeight = 'h-4',
  gap = 'gap-2',
  lastLineWidth = 'w-3/4',
  className,
  withTitle = false,
  titleHeight = 'h-6',
}) => {
  return (
    <div className={cn('flex flex-col', gap, className)}>
      {withTitle && <Skeleton className={cn(titleHeight, 'w-1/2 mb-2')} />}
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            lineHeight,
            i === lines - 1 ? lastLineWidth : 'w-full'
          )}
        />
      ))}
    </div>
  );
};

/**
 * SkeletonAvatar - 头像骨架屏
 *
 * @example
 * ```tsx
 * <SkeletonAvatar />
 * <SkeletonAvatar size="lg" />
 * ```
 */
export const SkeletonAvatar: React.FC<{
  /**
   * 尺寸
   * @default 'md'
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  /**
   * 形状
   * @default 'circle'
   */
  shape?: 'circle' | 'square';

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ size = 'md', shape = 'circle', className }) => {
  const sizeClasses = {
    xs: 'w-8 h-8',
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20',
  };

  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-lg',
  };

  return (
    <Skeleton
      className={cn(sizeClasses[size], shapeClasses[shape], className)}
    />
  );
};

/**
 * SkeletonCard - 卡片骨架屏
 *
 * @example
 * ```tsx
 * <SkeletonCard />
 * <SkeletonCard withAvatar withTitle />
 * ```
 */
export const SkeletonCard: React.FC<{
  /**
   * 是否显示头像
   * @default false
   */
  withAvatar?: boolean;

  /**
   * 是否显示标题
   * @default false
   */
  withTitle?: boolean;

  /**
   * 文本行数
   * @default 3
   */
  lines?: number;

  /**
   * 是否显示底部操作栏
   * @default false
   */
  withActions?: boolean;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({
  withAvatar = false,
  withTitle = false,
  lines = 3,
  withActions = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border border-slate-200 dark:border-slate-700',
        'bg-white dark:bg-slate-800',
        className
      )}
    >
      {/* 头部 */}
      <div className="flex items-start gap-3 mb-4">
        {withAvatar && <SkeletonAvatar size="md" />}
        <div className="flex-1">
          {withTitle && (
            <Skeleton className="h-5 w-3/4 mb-2" />
          )}
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>

      {/* 内容 */}
      <SkeletonText lines={lines} />

      {/* 底部操作 */}
      {withActions && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16 ml-auto" />
        </div>
      )}
    </div>
  );
};

/**
 * SkeletonList - 列表骨架屏
 *
 * @example
 * ```tsx
 * <SkeletonList count={5} />
 * <SkeletonList count={3} withAvatar />
 * ```
 */
export const SkeletonList: React.FC<{
  /**
   * 列表项数量
   * @default 5
   */
  count?: number;

  /**
   * 是否每项显示头像
   * @default false
   */
  withAvatar?: boolean;

  /**
   * 是否每项显示标题
   * @default false
   */
  withTitle?: boolean;

  /**
   * 每项文本行数
   * @default 2
   */
  lines?: number;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({
  count = 5,
  withAvatar = false,
  withTitle = false,
  lines = 2,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {withAvatar && <SkeletonAvatar size="sm" />}
          <div className="flex-1">
            {withTitle && <Skeleton className="h-4 w-1/3 mb-2" />}
            <SkeletonText lines={lines} />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * SkeletonTable - 表格骨架屏
 *
 * @example
 * ```tsx
 * <SkeletonTable rows={5} columns={4} />
 * ```
 */
export const SkeletonTable: React.FC<{
  /**
   * 行数
   * @default 5
   */
  rows?: number;

  /**
   * 列数
   * @default 4
   */
  columns?: number;

  /**
   * 是否显示表头
   * @default true
   */
  withHeader?: boolean;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ rows = 5, columns = 4, withHeader = true, className }) => {
  return (
    <div className={cn('w-full', className)}>
      <table className="w-full">
        {/* 表头 */}
        {withHeader && (
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="p-3 text-left">
                  <Skeleton className="h-4 w-24" />
                </th>
              ))}
            </tr>
          </thead>
        )}

        {/* 表体 */}
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr
              key={i}
              className="border-b border-slate-200 dark:border-slate-700 last:border-0"
            >
              {Array.from({ length: columns }).map((_, j) => (
                <td key={j} className="p-3">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * SkeletonForm - 表单骨架屏
 *
 * @example
 * ```tsx
 * <SkeletonForm fields={4} />
 * <SkeletonForm fields={6} withButton />
 * ```
 */
export const SkeletonForm: React.FC<{
  /**
   * 表单字段数量
   * @default 4
   */
  fields?: number;

  /**
   * 是否显示提交按钮
   * @default false
   */
  withButton?: boolean;

  /**
   * 表单布局
   * @default 'vertical'
   */
  layout?: 'vertical' | 'horizontal';

  /**
   * 自定义类名
   */
  className?: string;
}> = ({
  fields = 4,
  withButton = false,
  layout = 'vertical',
  className,
}) => {
  const layoutClass = layout === 'vertical' ? 'flex-col gap-4' : 'flex-row gap-4 flex-wrap';

  return (
    <div className={cn('flex', layoutClass, className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className={cn(layout === 'horizontal' ? 'flex-1 min-w-[200px]' : 'w-full')}>
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}

      {withButton && (
        <div className={cn(layout === 'horizontal' ? 'w-full' : 'w-full')}>
          <Skeleton className="h-10 w-32" />
        </div>
      )}
    </div>
  );
};

/**
 * SkeletonChart - 图表骨架屏
 *
 * @example
 * ```tsx
 * <SkeletonChart type="bar" />
 * <SkeletonChart type="line" />
 * <SkeletonChart type="pie" />
 * ```
 */
export const SkeletonChart: React.FC<{
  /**
   * 图表类型
   * @default 'bar'
   */
  type?: 'bar' | 'line' | 'pie';

  /**
   * 高度
   * @default 'h-64'
   */
  height?: string;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ type = 'bar', height = 'h-64', className }) => {
  return (
    <div className={cn('w-full p-4', className)}>
      {/* 标题和图例 */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>

      {/* 图表区域 */}
      <div className={cn(height, 'flex items-end gap-2')}>
        {type === 'bar' && (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn('flex-1', 'h-full')}
                style={{ height: `${40 + Math.random() * 60}%` }}
              />
            ))}
          </>
        )}

        {type === 'line' && (
          <>
            <div className="w-full h-full relative">
              <Skeleton className="absolute inset-0" />
              <div className="absolute inset-0 flex items-center">
                <Skeleton className="h-0.5 w-full" />
              </div>
            </div>
          </>
        )}

        {type === 'pie' && (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-48 h-48 rounded-full" />
          </div>
        )}
      </div>

      {/* X轴标签 */}
      {type !== 'pie' && (
        <div className="flex gap-2 mt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
      )}
    </div>
  );
};
