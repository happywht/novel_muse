/**
 * ResponsiveContainer - 响应式容器组件
 *
 * 提供响应式布局容器，自动适配不同屏幕尺寸
 * Provides responsive layout container that adapts to different screen sizes
 */

import React from 'react';
import { useBreakpoint } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * 响应式容器组件
 *
 * @example
 * ```tsx
 * <ResponsiveContainer maxWidth="xl" padding="md">
 *   <YourContent />
 * </ResponsiveContainer>
 * ```
 */
export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className,
  maxWidth = 'full',
  padding = 'md',
}) => {
  const { isMobile, isTablet } = useBreakpoint();

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  };

  const paddingClasses = {
    none: '',
    sm: isMobile ? 'px-2 py-2' : 'px-4 py-4',
    md: isMobile ? 'px-4 py-4' : isTablet ? 'px-6 py-6' : 'px-8 py-8',
    lg: isMobile ? 'px-6 py-6' : isTableat ? 'px-8 py-8' : 'px-12 py-12',
  };

  return (
    <div
      className={cn(
        'mx-auto w-full',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * ResponsiveGrid - 响应式网格布局
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    mobile?: 1 | 2;
    tablet?: 1 | 2 | 3;
    desktop?: 1 | 2 | 3 | 4;
    wide?: 1 | 2 | 3 | 4 | 5 | 6;
  };
  gap?: 'sm' | 'md' | 'lg';
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className,
  cols = { mobile: 1, tablet: 2, desktop: 3, wide: 4 },
  gap = 'md',
}) => {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div
      className={cn(
        'grid',
        `grid-cols-${cols.mobile}`,
        `md:grid-cols-${cols.tablet}`,
        `lg:grid-cols-${cols.desktop}`,
        `xl:grid-cols-${cols.wide}`,
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * ResponsiveFlex - 响应式Flex布局
 */
interface ResponsiveFlexProps {
  children: React.ReactNode;
  className?: string;
  direction?: {
    mobile?: 'row' | 'column';
    tablet?: 'row' | 'column';
    desktop?: 'row' | 'column';
  };
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  gap?: 'sm' | 'md' | 'lg';
}

export const ResponsiveFlex: React.FC<ResponsiveFlexProps> = ({
  children,
  className,
  direction = { mobile: 'column', tablet: 'row', desktop: 'row' },
  align = 'start',
  justify = 'start',
  gap = 'md',
}) => {
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div
      className={cn(
        'flex',
        `flex-${direction.mobile}`,
        `md:flex-${direction.tablet}`,
        `lg:flex-${direction.desktop}`,
        alignClasses[align],
        justifyClasses[justify],
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
};
