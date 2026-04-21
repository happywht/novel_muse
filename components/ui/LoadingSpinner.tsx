/**
 * LoadingSpinner - 加载旋转器组件
 *
 * 提供多种尺寸和样式的加载指示器
 * Provides loading indicators in multiple sizes and styles
 */

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Spinner尺寸
 */
type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Spinner变体
 */
type SpinnerVariant = 'default' | 'primary' | 'success' | 'warning' | 'error';

/**
 * Spinner组件属性
 */
interface SpinnerProps {
  /**
   * 尺寸
   * @default 'md'
   */
  size?: SpinnerSize;

  /**
   * 变体（颜色主题）
   * @default 'default'
   */
  variant?: SpinnerVariant;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 是否全屏居中
   * @default false
   */
  fullscreen?: boolean;

  /**
   * 加载文本
   */
  text?: string;

  /**
   * 文本位置
   * @default 'bottom'
   */
  textPosition?: 'top' | 'bottom' | 'right';

  /**
   * 是否显示轨道
   * @default false
   */
  withTrack?: boolean;

  /**
   * 旋转速度
   * @default 'normal'
   */
  speed?: 'slow' | 'normal' | 'fast';
}

/**
 * 尺寸映射
 */
const sizeClasses: Record<SpinnerSize, string> = {
  xs: 'w-4 h-4 border-2',
  sm: 'w-6 h-6 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
  xl: 'w-16 h-16 border-4',
};

/**
 * 颜色变体映射
 */
const variantClasses: Record<SpinnerVariant, { border: string; track: string }> = {
  default: {
    border: 'border-slate-200 dark:border-slate-700',
    track: 'border-slate-900 dark:border-slate-100',
  },
  primary: {
    border: 'border-muse-200 dark:border-muse-800',
    track: 'border-muse-600 dark:border-muse-400',
  },
  success: {
    border: 'border-green-200 dark:border-green-800',
    track: 'border-green-600 dark:border-green-400',
  },
  warning: {
    border: 'border-amber-200 dark:border-amber-800',
    track: 'border-amber-600 dark:border-amber-400',
  },
  error: {
    border: 'border-red-200 dark:border-red-800',
    track: 'border-red-600 dark:border-red-400',
  },
};

/**
 * 速度映射（秒）
 */
const speedDuration: Record<SpinnerSize, Record<'slow' | 'normal' | 'fast', string>> = {
  xs: { slow: '2s', normal: '1s', fast: '0.5s' },
  sm: { slow: '2s', normal: '1s', fast: '0.5s' },
  md: { slow: '2.5s', normal: '1.2s', fast: '0.6s' },
  lg: { slow: '3s', normal: '1.5s', fast: '0.7s' },
  xl: { slow: '3s', normal: '1.5s', fast: '0.7s' },
};

/**
 * LoadingSpinner - 主组件
 *
 * @example
 * ```tsx
 * <Spinner />
 * <Spinner size="lg" variant="primary" />
 * <Spinner text="加载中..." />
 * <Spinner fullscreen text="正在处理数据..." />
 * ```
 */
export const LoadingSpinner: React.FC<SpinnerProps> = ({
  size = 'md',
  variant = 'default',
  className,
  fullscreen = false,
  text,
  textPosition = 'bottom',
  withTrack = false,
  speed = 'normal',
}) => {
  const colors = variantClasses[variant];
  const duration = speedDuration[size][speed];

  const spinnerElement = (
    <div className={cn('relative', sizeClasses[size])}>
      {/* 轨道 */}
      {withTrack && (
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            colors.border,
            'opacity-30'
          )}
        />
      )}

      {/* 旋转的加载器 */}
      <div
        className={cn(
          'absolute inset-0 rounded-full',
          'border-transparent',
          colors.track,
          'animate-spin',
          'border-t-transparent'
        )}
        style={{
          animationDuration: duration,
        }}
      />
    </div>
  );

  const textElement = text && (
    <p
      className={cn(
        'text-sm font-medium',
        'text-slate-600 dark:text-slate-400',
        'animate-pulse'
      )}
    >
      {text}
    </p>
  );

  // 全屏模式
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-4">
          {textPosition === 'top' && textElement}
          <div className="flex items-center gap-3">
            {spinnerElement}
            {textPosition === 'right' && textElement}
          </div>
          {textPosition === 'bottom' && textElement}
        </div>
      </div>
    );
  }

  // 内联模式
  return (
    <div className={cn('flex items-center', className)}>
      {textPosition === 'top' && (
        <div className="flex flex-col items-center gap-2">
          {textElement}
          {spinnerElement}
        </div>
      )}

      {textPosition === 'bottom' && (
        <div className="flex flex-col items-center gap-2">
          {spinnerElement}
          {textElement}
        </div>
      )}

      {textPosition === 'right' && (
        <div className="flex items-center gap-3">
          {spinnerElement}
          {textElement}
        </div>
      )}

      {!text && spinnerElement}
    </div>
  );
};

/**
 * DotSpinner - 点状加载器
 *
 * 三个点的跳动动画
 *
 * @example
 * ```tsx
 * <DotSpinner />
 * <DotSpinner size="lg" />
 * ```
 */
export const DotSpinner: React.FC<{
  size?: SpinnerSize;
  className?: string;
}> = ({ size = 'md', className }) => {
  const dotSizes: Record<SpinnerSize, string> = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  const gapSizes: Record<SpinnerSize, string> = {
    xs: 'gap-1',
    sm: 'gap-1.5',
    md: 'gap-2',
    lg: 'gap-3',
    xl: 'gap-4',
  };

  return (
    <div className={cn('flex items-center', gapSizes[size], className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            dotSizes[size],
            'rounded-full',
            'bg-muse-600 dark:bg-muse-400',
            'animate-bounce'
          )}
          style={{
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  );
};

/**
 * BarSpinner - 条状加载器
 *
 * 三个竖条的伸缩动画
 *
 * @example
 * ```tsx
 * <BarSpinner />
 * <BarSpinner size="lg" />
 * ```
 */
export const BarSpinner: React.FC<{
  size?: SpinnerSize;
  className?: string;
}> = ({ size = 'md', className }) => {
  const barSizes: Record<SpinnerSize, { height: string; width: string }> = {
    xs: { height: 'h-4', width: 'w-1' },
    sm: { height: 'h-6', width: 'w-1.5' },
    md: { height: 'h-8', width: 'w-2' },
    lg: { height: 'h-12', width: 'w-3' },
    xl: { height: 'h-16', width: 'w-4' },
  };

  const gapSizes: Record<SpinnerSize, string> = {
    xs: 'gap-1',
    sm: 'gap-1.5',
    md: 'gap-2',
    lg: 'gap-3',
    xl: 'gap-4',
  };

  return (
    <div className={cn('flex items-center', gapSizes[size], className)}>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            barSizes[size].height,
            barSizes[size].width,
            'rounded-full',
            'bg-muse-600 dark:bg-muse-400',
            'animate-pulse'
          )}
          style={{
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};

/**
 * PulseSpinner - 脉冲加载器
 *
 * 呼吸灯效果
 *
 * @example
 * ```tsx
 * <PulseSpinner />
 * <PulseSpinner size="lg" />
 * ```
 */
export const PulseSpinner: React.FC<{
  size?: SpinnerSize;
  className?: string;
}> = ({ size = 'md', className }) => {
  const pulseSizes: Record<SpinnerSize, string> = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  return (
    <div
      className={cn(
        pulseSizes[size],
        'rounded-full',
        'bg-muse-600/30 dark:bg-muse-400/30',
        'animate-ping',
        className
      )}
    />
  );
};
