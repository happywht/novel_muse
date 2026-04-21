/**
 * ProgressBar - 进度条组件
 *
 * 提供确定和不确定的进度指示
 * Provides definite and indefinite progress indicators
 */

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * 进度条尺寸
 */
type ProgressSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * 进度条变体
 */
type ProgressVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';

/**
 * ProgressBar属性
 */
interface ProgressBarProps {
  /**
   * 进度值 (0-100)
   * @undefined 表示不确定进度
   */
  value?: number;

  /**
   * 尺寸
   * @default 'md'
   */
  size?: ProgressSize;

  /**
   * 变体
   * @default 'primary'
   */
  variant?: ProgressVariant;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 是否显示百分比文本
   * @default false
   */
  showLabel?: boolean;

  /**
   * 标签位置
   * @default 'right'
   */
  labelPosition?: 'top' | 'bottom' | 'left' | 'right' | 'inside';

  /**
   * 是否启用动画
   * @default true
   */
  animated?: boolean;

  /**
   * 是否使用条纹样式
   * @default false
   */
  striped?: boolean;

  /**
   * 最大值
   * @default 100
   */
  max?: number;

  /**
   * 最小值
   * @default 0
   */
  min?: number;
}

/**
 * 尺寸映射
 */
const sizeClasses: Record<ProgressSize, { height: string; radius: string }> = {
  xs: { height: 'h-1', radius: 'rounded-none' },
  sm: { height: 'h-2', radius: 'rounded-sm' },
  md: { height: 'h-3', radius: 'rounded-md' },
  lg: { height: 'h-4', radius: 'rounded-lg' },
  xl: { height: 'h-6', radius: 'rounded-xl' },
};

/**
 * 颜色变体映射
 */
const variantClasses: Record<ProgressVariant, { bg: string; fill: string }> = {
  default: {
    bg: 'bg-slate-200 dark:bg-slate-700',
    fill: 'bg-slate-600 dark:bg-slate-400',
  },
  primary: {
    bg: 'bg-muse-200 dark:bg-muse-800',
    fill: 'bg-muse-600 dark:bg-muse-400',
  },
  success: {
    bg: 'bg-green-200 dark:bg-green-800',
    fill: 'bg-green-600 dark:bg-green-400',
  },
  warning: {
    bg: 'bg-amber-200 dark:bg-amber-800',
    fill: 'bg-amber-600 dark:bg-amber-400',
  },
  error: {
    bg: 'bg-red-200 dark:bg-red-800',
    fill: 'bg-red-600 dark:bg-red-400',
  },
};

/**
 * 计算显示的百分比
 */
function calculatePercentage(
  value: number | undefined,
  min: number,
  max: number
): number {
  if (value === undefined) return 0;
  const clamped = Math.max(min, Math.min(max, value));
  return ((clamped - min) / (max - min)) * 100;
}

/**
 * ProgressBar - 主组件
 *
 * @example
 * ```tsx
 * <ProgressBar value={50} />
 * <ProgressBar value={75} showLabel />
 * <ProgressBar /> // 不确定进度
 * <ProgressBar value={90} variant="success" />
 * ```
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  size = 'md',
  variant = 'primary',
  className,
  showLabel = false,
  labelPosition = 'right',
  animated = true,
  striped = false,
  max = 100,
  min = 0,
}) => {
  const sizes = sizeClasses[size];
  const colors = variantClasses[variant];
  const percentage = calculatePercentage(value, min, max);
  const isIndeterminate = value === undefined;

  const labelElement = (
    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 tabular-nums">
      {isIndeterminate ? '...' : `${Math.round(percentage)}%`}
    </span>
  );

  const progressBar = (
    <div
      className={cn(
        'relative w-full overflow-hidden',
        sizes.bg,
        sizes.height,
        sizes.radius,
        className
      )}
      role="progressbar"
      aria-valuenow={isIndeterminate ? undefined : value}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={isIndeterminate ? '加载中...' : `${percentage}%`}
    >
      {/* 进度条填充 */}
      <div
        className={cn(
          'h-full transition-all duration-500 ease-out',
          colors.fill,
          animated && !isIndeterminate && 'transition-all',
          animated && isIndeterminate && 'animate-pulse',
          striped && 'striped',
          sizes.radius
        )}
        style={{
          width: isIndeterminate ? '100%' : `${percentage}%`,
          ...(isIndeterminate && {
            animation: 'progress-indeterminate 1.5s ease-in-out infinite',
          }),
        }}
      />
    </div>
  );

  // 标签在内部
  if (showLabel && labelPosition === 'inside' && !isIndeterminate && percentage >= 15) {
    return (
      <div className={cn('relative', sizes.height, className)}>
        {progressBar}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white tabular-nums">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
    );
  }

  // 标签在左侧
  if (showLabel && labelPosition === 'left') {
    return (
      <div className="flex items-center gap-3">
        {labelElement}
        <div className="flex-1">{progressBar}</div>
      </div>
    );
  }

  // 标签在右侧
  if (showLabel && labelPosition === 'right') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1">{progressBar}</div>
        {labelElement}
      </div>
    );
  }

  // 标签在顶部
  if (showLabel && labelPosition === 'top') {
    return (
      <div className="flex flex-col gap-1">
        {labelElement}
        {progressBar}
      </div>
    );
  }

  // 标签在底部
  if (showLabel && labelPosition === 'bottom') {
    return (
      <div className="flex flex-col gap-1">
        {progressBar}
        {labelElement}
      </div>
    );
  }

  // 无标签
  return progressBar;
};

/**
 * CircularProgress - 环形进度条
 *
 * @example
 * ```tsx
 * <CircularProgress value={50} />
 * <CircularProgress value={75} size="lg" showLabel />
 * ```
 */
export const CircularProgress: React.FC<{
  /**
   * 进度值 (0-100)
   */
  value: number;

  /**
   * 尺寸
   * @default 'md'
   */
  size?: ProgressSize;

  /**
   * 变体
   * @default 'primary'
   */
  variant?: ProgressVariant;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 是否显示百分比文本
   * @default false
   */
  showLabel?: boolean;

  /**
   * 线条宽度
   * @default 8
   */
  strokeWidth?: number;

  /**
   * 最大值
   * @default 100
   */
  max?: number;

  /**
   * 最小值
   * @default 0
   */
  min?: number;
}> = ({
  value,
  size = 'md',
  variant = 'primary',
  className,
  showLabel = false,
  strokeWidth = 8,
  max = 100,
  min = 0,
}) => {
  const colors = variantClasses[variant];
  const percentage = calculatePercentage(value, min, max);

  // 尺寸到像素的映射
  const sizeToPixels: Record<ProgressSize, number> = {
    xs: 32,
    sm: 48,
    md: 64,
    lg: 96,
    xl: 128,
  };

  const pixels = sizeToPixels[size];
  const radius = (pixels - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className={cn('relative inline-flex', className)}>
      <svg
        width={pixels}
        height={pixels}
        className="transform -rotate-90"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={`${percentage}%`}
      >
        {/* 背景圆环 */}
        <circle
          cx={pixels / 2}
          cy={pixels / 2}
          r={radius}
          className={cn(colors.bg, 'transition-colors duration-500')}
          fill="none"
          strokeWidth={strokeWidth}
        />

        {/* 进度圆环 */}
        <circle
          cx={pixels / 2}
          cy={pixels / 2}
          r={radius}
          className={cn(colors.fill, 'transition-all duration-500 ease-out')}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>

      {/* 中心标签 */}
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
};

/**
 * ProgressSteps - 步骤进度条
 *
 * @example
 * ```tsx
 * <ProgressSteps steps={3} current={1} />
 * <ProgressSteps steps={5} current={3} vertical />
 * ```
 */
export const ProgressSteps: React.FC<{
  /**
   * 总步骤数
   */
  steps: number;

  /**
   * 当前步骤（从1开始）
   */
  current: number;

  /**
   * 步骤标签
   */
  labels?: string[];

  /**
   * 是否垂直布局
   * @default false
   */
  vertical?: boolean;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 变体
   * @default 'primary'
   */
  variant?: ProgressVariant;
}> = ({
  steps,
  current,
  labels,
  vertical = false,
  className,
  variant = 'primary',
}) => {
  const colors = variantClasses[variant];
  const isVertical = vertical;

  return (
    <div
      className={cn(
        'flex',
        isVertical ? 'flex-col gap-2' : 'items-center gap-2',
        className
      )}
    >
      {Array.from({ length: steps }).map((_, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < current;
        const isCurrent = stepNumber === current;
        const isPending = stepNumber > current;

        return (
          <React.Fragment key={index}>
            {/* 步骤节点 */}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  isCompleted && colors.fill + ' text-white',
                  isCurrent && colors.fill + ' text-white animate-pulse',
                  isPending && colors.bg + ' text-slate-500'
                )}
              >
                {isCompleted ? '✓' : stepNumber}
              </div>

              {/* 步骤标签 */}
              {labels && labels[index] && (
                <span
                  className={cn(
                    'text-xs',
                    isCurrent && 'font-medium',
                    isCompleted && colors.fill.replace('bg-', 'text-'),
                    isPending && 'text-slate-400'
                  )}
                >
                  {labels[index]}
                </span>
              )}
            </div>

            {/* 连接线 */}
            {index < steps - 1 && (
              <div
                className={cn(
                  isVertical ? 'w-0.5 h-8' : 'h-0.5 flex-1',
                  isCompleted ? colors.fill : colors.bg,
                  'transition-colors'
                )}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/**
 * ProgressDots - 点状进度指示器
 *
 * @example
 * ```tsx
 * <ProgressDots count={5} current={2} />
 * <ProgressDots count={3} current={1} variant="success" />
 * ```
 */
export const ProgressDots: React.FC<{
  /**
   * 总点数
   */
  count: number;

  /**
   * 当前索引（从0开始）
   */
  current: number;

  /**
   * 变体
   * @default 'primary'
   */
  variant?: ProgressVariant;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 是否可点击
   * @default false
   */
  clickable?: boolean;

  /**
   * 点击回调
   */
  onClick?: (index: number) => void;
}> = ({ count, current, variant = 'primary', className, clickable = false, onClick }) => {
  const colors = variantClasses[variant];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {Array.from({ length: count }).map((_, index) => {
        const isActive = index === current;
        const isPast = index < current;

        return (
          <button
            key={index}
            disabled={!clickable}
            onClick={() => onClick?.(index)}
            className={cn(
              'transition-all duration-300',
              clickable && 'cursor-pointer hover:scale-110',
              !clickable && 'cursor-default'
            )}
          >
            <div
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-all',
                isActive && colors.fill + ' scale-125',
                isPast && colors.fill,
                !isActive && !isPast && colors.bg
              )}
            />
          </button>
        );
      })}
    </div>
  );
};
