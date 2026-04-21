/**
 * Card - 卡片组件系统
 *
 * 提供内容容器和卡片布局
 * Provides content containers and card layouts
 */

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card变体
 */
export type CardVariant = 'default' | 'bordered' | 'elevated' | 'filled';

/**
 * Card尺寸
 */
export type CardSize = 'sm' | 'md' | 'lg';

/**
 * Card组件属性
 */
export interface CardProps {
  /**
   * 子元素
   */
  children: React.ReactNode;

  /**
   * 变体
   * @default 'default'
   */
  variant?: CardVariant;

  /**
   * 尺寸
   * @default 'md'
   */
  size?: CardSize;

  /**
   * 是否可悬停
   */
  hoverable?: boolean;

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
 * 变体样式映射
 */
const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
  bordered: 'bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600',
  elevated: 'bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700',
  filled: 'bg-slate-100 dark:bg-slate-900 border-0',
};

/**
 * 尺寸样式映射
 */
const sizeStyles: Record<CardSize, string> = {
  sm: 'p-4 rounded-lg',
  md: 'p-6 rounded-xl',
  lg: 'p-8 rounded-2xl',
};

/**
 * Card - 主卡片组件
 *
 * @example
 * ```tsx
 * <Card variant="elevated" hoverable>
 *   <CardHeader title="标题" subtitle="副标题" />
 *   <CardContent>内容</CardContent>
 *   <CardActions>
 *     <Button>操作</Button>
 *   </CardActions>
 * </Card>
 * ```
 */
export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  size = 'md',
  hoverable = false,
  onClick,
  className,
}) => {
  return (
    <div
      className={cn(
        'touch-target',
        'transition-all duration-200',
        variantStyles[variant],
        sizeStyles[size],
        hoverable && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

/**
 * CardHeader - 卡片头部
 */
export const CardHeader: React.FC<{
  /**
   * 标题
   */
  title?: React.ReactNode;

  /**
   * 副标题
   */
  subtitle?: React.ReactNode;

  /**
   * 头部操作区域
   */
  action?: React.ReactNode;

  /**
   * 头部图标
   */
  icon?: React.ReactNode;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ title, subtitle, action, icon, className }) => {
  return (
    <div className={cn('flex items-start justify-between mb-4', className)}>
      <div className="flex items-start gap-3 flex-1">
        {icon && <div className="flex-shrink-0 text-muse-600 dark:text-muse-400">{icon}</div>}
        <div className="flex-1">
          {title && (
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

/**
 * CardContent - 卡片内容
 */
export const CardContent: React.FC<{
  /**
   * 内容
   */
  children: React.ReactNode;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ children, className }) => {
  return <div className={cn('text-slate-700 dark:text-slate-300', className)}>{children}</div>;
};

/**
 * CardMedia - 卡片媒体内容
 */
export const CardMedia: React.FC<{
  /**
   * 图片URL
   */
  src: string;

  /**
   * 替代文本
   */
  alt: string;

  /**
   * 高度
   */
  height?: string | number;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ src, alt, height = '200px', className }) => {
  return (
    <div className={cn('overflow-hidden rounded-lg mb-4', className)} style={{ height }}>
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
      />
    </div>
  );
};

/**
 * CardActions - 卡片操作区域
 */
export const CardActions: React.FC<{
  /**
   * 操作按钮
   */
  children: React.ReactNode;

  /**
   * 对齐方式
   * @default 'right'
   */
  align?: 'left' | 'center' | 'right';

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ children, align = 'right', className }) => {
  const alignStyles = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  };

  return (
    <div className={cn('flex items-center gap-2 mt-4', alignStyles[align], className)}>
      {children}
    </div>
  );
};

/**
 * CardFooter - 卡片底部
 */
export const CardFooter: React.FC<{
  /**
   * 底部内容
   */
  children: React.ReactNode;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ children, className }) => {
  return (
    <div className={cn('mt-4 pt-4 border-t border-slate-200 dark:border-slate-700', className)}>
      {children}
    </div>
  );
};

/**
 * CardGrid - 卡片网格
 */
export const CardGrid: React.FC<{
  /**
   * 卡片列表
   */
  children: React.ReactNode;

  /**
   * 列数
   * @default 3
   */
  cols?: 1 | 2 | 3 | 4;

  /**
   * 间距
   * @default 'md'
   */
  gap?: 'sm' | 'md' | 'lg';

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ children, cols = 3, gap = 'md', className }) => {
  const colsStyles = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };

  const gapStyles = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  };

  return (
    <div className={cn('grid', colsStyles[cols], gapStyles[gap], className)}>{children}</div>
  );
};

/**
 * StatisticCard - 统计卡片
 */
export const StatisticCard: React.FC<{
  /**
   * 标题
   */
  title: string;

  /**
   * 数值
   */
  value: number | string;

  /**
   * 前缀
   */
  prefix?: React.ReactNode;

  /**
   * 后缀
   */
  suffix?: React.ReactNode;

  /**
   * 趋势（up/down/neutral）
   */
  trend?: 'up' | 'down' | 'neutral';

  /**
   * 趋势值
   */
  trendValue?: string;

  /**
   * 图标
   */
  icon?: React.ReactNode;

  /**
   * 加载状态
   */
  loading?: boolean;

  /**
   * 自定义类名
   */
  className?: string;
}> = ({
  title,
  value,
  prefix,
  suffix,
  trend,
  trendValue,
  icon,
  loading = false,
  className,
}) => {
  const trendStyles = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-slate-600 dark:text-slate-400',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <Card variant="elevated" className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{title}</p>
          {loading ? (
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          ) : (
            <div className="flex items-baseline gap-2">
              {prefix && <span className="text-slate-600 dark:text-slate-400">{prefix}</span>}
              <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                {value}
              </span>
              {suffix && <span className="text-slate-600 dark:text-slate-400">{suffix}</span>}
            </div>
          )}
          {trend && trendValue && (
            <p className={cn('text-sm mt-2 flex items-center gap-1', trendStyles[trend])}>
              <span>{trendIcons[trend]}</span>
              <span>{trendValue}</span>
            </p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 p-3 bg-muse-100 dark:bg-muse-900 rounded-lg text-muse-600 dark:text-muse-400">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

/**
 * MetricCard - 指标卡片（带进度条）
 */
export const MetricCard: React.FC<{
  /**
   * 标题
   */
  title: string;

  /**
   * 当前值
   */
  value: number;

  /**
   * 最大值
   */
  max: number;

  /**
   * 单位
   */
  unit?: string;

  /**
   * 颜色
   * @default 'primary'
   */
  color?: 'primary' | 'success' | 'warning' | 'error';

  /**
   * 自定义类名
   */
  className?: string;
}> = ({ title, value, max, unit, color = 'primary', className }) => {
  const percentage = Math.min((value / max) * 100, 100);

  const colorStyles = {
    primary: 'bg-muse-600 dark:bg-muse-400',
    success: 'bg-green-600 dark:bg-green-400',
    warning: 'bg-amber-600 dark:bg-amber-400',
    error: 'bg-red-600 dark:bg-red-400',
  };

  return (
    <Card className={className}>
      <div className="mb-3">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{title}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {value}
          {unit && <span className="text-base font-normal text-slate-600 dark:text-slate-400 ml-1">{unit}</span>}
        </p>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
        <div
          className={cn('h-2 rounded-full transition-all duration-300', colorStyles[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
        {percentage.toFixed(1)}% ({value}/{max})
      </p>
    </Card>
  );
};
