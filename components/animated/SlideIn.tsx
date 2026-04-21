/**
 * SlideIn - 滑动动画组件
 *
 * 提供多种滑动进入效果
 * Provides various slide-in animation effects
 */

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * 滑动方向
 */
export type SlideDirection = 'up' | 'down' | 'left' | 'right';

/**
 * SlideIn组件属性
 */
export interface SlideInProps {
  /**
   * 子元素
   */
  children: React.ReactNode;

  /**
   * 方向
   * @default 'up'
   */
  direction?: SlideDirection;

  /**
   * 延迟（毫秒）
   * @default 0
   */
  delay?: number;

  /**
   * 持续时间（毫秒）
   * @default 300
   */
  duration?: number;

  /**
   * 滑动距离（%或px）
   * @default '100%'
   */
  distance?: string;

  /**
   * 缓动函数
   * @default 'ease-out'
   */
  easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';

  /**
   * 是否在视口内触发
   * @default false
   */
  triggerOnViewport?: boolean;

  /**
   * 视口阈值（0-1）
   * @default 0.1
   */
  viewportThreshold?: number;

  /**
   * 自定义类名
   */
  className?: string;

  /**
   * 动画完成回调
   */
  onAnimationComplete?: () => void;
}

/**
 * 获取初始transform
 */
function getInitialTransform(direction: SlideDirection, distance: string): string {
  switch (direction) {
    case 'up':
      return `translateY(${distance})`;
    case 'down':
      return `translateY(-${distance})`;
    case 'left':
      return `translateX(${distance})`;
    case 'right':
      return `translateX(-${distance})`;
  }
}

/**
 * SlideIn - 滑动进入组件
 *
 * @example
 * ```tsx
 * <SlideIn direction="right">从右滑入</SlideIn>
 * <SlideIn direction="up" distance="50px">向上滑入50px</SlideIn>
 * <SlideIn triggerOnViewport>进入视口时滑入</SlideIn>
 * ```
 */
export const SlideIn: React.FC<SlideInProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 300,
  distance = '100%',
  easing = 'ease-out',
  triggerOnViewport = false,
  viewportThreshold = 0.1,
  className,
  onAnimationComplete,
}) => {
  const [isVisible, setIsVisible] = useState(!triggerOnViewport);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 视口检测
  useEffect(() => {
    if (!triggerOnViewport || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasAnimated(true);
        }
      },
      { threshold: viewportThreshold }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [triggerOnViewport, viewportThreshold, hasAnimated]);

  // 动画完成回调
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, delay + duration);

    return () => clearTimeout(timer);
  }, [isVisible, delay, duration, onAnimationComplete]);

  return (
    <div
      ref={ref}
      className={cn('transition-transform', className)}
      style={{
        transform: isVisible ? 'none' : getInitialTransform(direction, distance),
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        transitionTimingFunction: easing,
      }}
    >
      {children}
    </div>
  );
};

/**
 * SlideOut - 滑出组件
 */
export const SlideOut: React.FC<{
  children: React.ReactNode;
  show: boolean;
  direction?: SlideDirection;
  duration?: number;
  distance?: string;
  className?: string;
  onExited?: () => void;
}> = ({
  children,
  show,
  direction = 'up',
  duration = 300,
  distance = '100%',
  className,
  onExited,
}) => {
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false);
        onExited?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration, onExited]);

  if (!shouldRender) return null;

  return (
    <div
      className={cn('transition-transform', className)}
      style={{
        transform: show ? 'none' : getInitialTransform(direction, distance),
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: 'ease-in',
      }}
    >
      {children}
    </div>
  );
};

/**
 * SlideInList - 列表滑动动画
 */
export const SlideInList: React.FC<{
  children: React.ReactNode;
  stagger?: number;
  direction?: SlideDirection;
  duration?: number;
  className?: string;
}> = ({ children, stagger = 100, direction = 'up', duration = 300, className }) => {
  const childrenArray = React.Children.toArray(children);

  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <SlideIn
          key={index}
          direction={direction}
          delay={index * stagger}
          duration={duration}
        >
          {child}
        </SlideIn>
      ))}
    </div>
  );
};

/**
 * Collapse - 折叠/展开动画
 */
export const Collapse: React.FC<{
  children: React.ReactNode;
  isOpen: boolean;
  duration?: number;
  className?: string;
}> = ({ children, isOpen, duration = 300, className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(isOpen ? 'auto' : '0px');

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (isOpen) {
      setHeight(element.scrollHeight + 'px');
      const timer = setTimeout(() => setHeight('auto'), duration);
      return () => clearTimeout(timer);
    } else {
      setHeight(element.scrollHeight + 'px');
      const timer = setTimeout(() => setHeight('0px'), 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration]);

  return (
    <div
      ref={ref}
      className={cn('overflow-hidden transition-all ease-in-out', className)}
      style={{
        height,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * AnimatedDrawer - 抽屉动画
 */
export const AnimatedDrawer: React.FC<{
  children: React.ReactNode;
  isOpen: boolean;
  position?: 'left' | 'right' | 'top' | 'bottom';
  size?: string | number;
  duration?: number;
  onClose?: () => void;
  className?: string;
  contentClassName?: string;
}> = ({
  children,
  isOpen,
  position = 'right',
  size = '400px',
  duration = 300,
  onClose,
  className,
  contentClassName,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const getPositionStyles = (): {
    transform: string;
  } => {
    switch (position) {
      case 'left':
        return {
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        };
      case 'right':
        return {
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        };
      case 'top':
        return {
          transform: isOpen ? 'translateY(0)' : 'translateY(-100%)',
        };
      case 'bottom':
        return {
          transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
        };
    }
  };

  const getSizeStyles = () => {
    const sizeValue = typeof size === 'number' ? `${size}px` : size;

    switch (position) {
      case 'left':
      case 'right':
        return { width: sizeValue };
      case 'top':
      case 'bottom':
        return { height: sizeValue };
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 pointer-events-none',
        className
      )}
    >
      {/* 遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 pointer-events-auto animate-fade-in"
        onClick={onClose}
      />

      {/* 抽屉 */}
      <div
        ref={drawerRef}
        className={cn(
          'absolute bg-white dark:bg-slate-800 shadow-xl pointer-events-auto',
          'transition-transform ease-out',
          position === 'left' && 'left-0 top-0 bottom-0',
          position === 'right' && 'right-0 top-0 bottom-0',
          position === 'top' && 'top-0 left-0 right-0',
          position === 'bottom' && 'bottom-0 left-0 right-0',
          contentClassName
        )}
        style={{
          ...getPositionStyles(),
          ...getSizeStyles(),
          transitionDuration: `${duration}ms`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
