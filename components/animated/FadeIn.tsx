/**
 * FadeIn - 淡入动画组件
 *
 * 提供多种淡入效果
 * Provides various fade-in animation effects
 */

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * 淡入方向
 */
export type FadeInDirection = 'up' | 'down' | 'left' | 'right' | 'none';

/**
 * FadeIn组件属性
 */
export interface FadeInProps {
  /**
   * 子元素
   */
  children: React.ReactNode;

  /**
   * 方向
   * @default 'up'
   */
  direction?: FadeInDirection;

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
   * 初始透明度
   * @default 0
   */
  from?: number;

  /**
   * 目标透明度
   * @default 1
   */
  to?: number;

  /**
   * 位移距离（px）
   * @default 20
   */
  distance?: number;

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
 * FadeIn - 淡入动画组件
 *
 * @example
 * ```tsx
 * <FadeIn>内容</FadeIn>
 * <FadeIn direction="up" delay={100}>从下淡入</FadeIn>
 * <FadeIn triggerOnViewport>进入视口时淡入</FadeIn>
 * ```
 */
export const FadeIn: React.FC<FadeInProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 300,
  from = 0,
  to = 1,
  distance = 20,
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

  // 延迟显示
  useEffect(() => {
    if (!isVisible) return;

    const timer = setTimeout(() => {
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, delay + duration);

    return () => clearTimeout(timer);
  }, [isVisible, delay, duration, onAnimationComplete]);

  const getTransform = () => {
    if (!isVisible) {
      switch (direction) {
        case 'up':
          return `translateY(${distance}px)`;
        case 'down':
          return `translateY(-${distance}px)`;
        case 'left':
          return `translateX(${distance}px)`;
        case 'right':
          return `translateX(-${distance}px)`;
        case 'none':
          return 'none';
      }
    }
    return 'none';
  };

  return (
    <div
      ref={ref}
      className={cn('transition-all ease-out', className)}
      style={{
        opacity: isVisible ? to : from,
        transform: getTransform(),
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * FadeInList - 列表淡入动画
 *
 * @example
 * ```tsx
 * <FadeInList stagger={100}>
 *   <div>项目1</div>
 *   <div>项目2</div>
 *   <div>项目3</div>
 * </FadeInList>
 * ```
 */
export const FadeInList: React.FC<{
  children: React.ReactNode;
  stagger?: number; // 交错延迟（毫秒）
  direction?: FadeInDirection;
  duration?: number;
  className?: string;
}> = ({ children, stagger = 100, direction = 'up', duration = 300, className }) => {
  const childrenArray = React.Children.toArray(children);

  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <FadeIn
          key={index}
          direction={direction}
          delay={index * stagger}
          duration={duration}
        >
          {child}
        </FadeIn>
      ))}
    </div>
  );
};

/**
 * FadeOut - 淡出动画组件
 */
export const FadeOut: React.FC<{
  children: React.ReactNode;
  show: boolean;
  duration?: number;
  className?: string;
  onExited?: () => void;
}> = ({ children, show, duration = 300, className, onExited }) => {
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
      className={cn('transition-opacity ease-out', className)}
      style={{
        opacity: show ? 1 : 0,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
};
