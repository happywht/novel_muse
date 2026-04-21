/**
 * ScaleIn - 缩放动画组件
 *
 * 提供缩放进入效果
 * Provides scale-in animation effects
 */

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * ScaleIn组件属性
 */
export interface ScaleInProps {
  /**
   * 子元素
   */
  children: React.ReactNode;

  /**
   * 初始缩放
   * @default 0.9
   */
  from?: number;

  /**
   * 目标缩放
   * @default 1
   */
  to?: number;

  /**
   * 延迟（毫秒）
   * @default 0
   */
  delay?: number;

  /**
   * 持续时间（毫秒）
   * @default 200
   */
  duration?: number;

  /**
   * 缓动函数
   * @default 'ease-out'
   */
  easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear' | 'spring';

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
 * ScaleIn - 缩放进入组件
 *
 * @example
 * ```tsx
 * <ScaleIn>缩放进入</ScaleIn>
 * <ScaleIn from={0.5} to={1} duration={500}>从0.5倍缩放到1倍</ScaleIn>
 * <ScaleIn easing="spring">弹簧效果</ScaleIn>
 * ```
 */
export const ScaleIn: React.FC<ScaleInProps> = ({
  children,
  from = 0.9,
  to = 1,
  delay = 0,
  duration = 200,
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

  // 弹簧效果配置
  const springStyle = easing === 'spring' ? {
    transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  } : {
    transitionTimingFunction: easing,
  };

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
        transform: `scale(${isVisible ? to : from})`,
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
        ...springStyle,
      }}
    >
      {children}
    </div>
  );
};

/**
 * ScaleOut - 缩小退出组件
 */
export const ScaleOut: React.FC<{
  children: React.ReactNode;
  show: boolean;
  from?: number;
  to?: number;
  duration?: number;
  className?: string;
  onExited?: () => void;
}> = ({
  children,
  show,
  from = 1,
  to = 0.9,
  duration = 200,
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
      className={cn('transition-transform ease-in', className)}
      style={{
        transform: `scale(${show ? from : to})`,
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * ScaleInList - 列表缩放动画
 */
export const ScaleInList: React.FC<{
  children: React.ReactNode;
  stagger?: number;
  from?: number;
  to?: number;
  duration?: number;
  className?: string;
}> = ({
  children,
  stagger = 100,
  from = 0.9,
  to = 1,
  duration = 200,
  className,
}) => {
  const childrenArray = React.Children.toArray(children);

  return (
    <div className={className}>
      {childrenArray.map((child, index) => (
        <ScaleIn
          key={index}
          from={from}
          to={to}
          delay={index * stagger}
          duration={duration}
        >
          {child}
        </ScaleIn>
      ))}
    </div>
  );
};

/**
 * PulseScale - 脉冲缩放动画
 */
export const PulseScale: React.FC<{
  children: React.ReactNode;
  scale?: number;
  duration?: number;
  className?: string;
}> = ({ children, scale = 1.05, duration = 1000, className }) => {
  return (
    <div
      className={cn('transition-transform', className)}
      style={{
        animation: `pulse-scale ${duration}ms ease-in-out infinite`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * BounceIn - 弹跳进入动画
 */
export const BounceIn: React.FC<{
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  onAnimationComplete?: () => void;
}> = ({
  children,
  delay = 0,
  duration = 500,
  className,
  onAnimationComplete,
}) => {
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHasAnimated(true);
      if (onAnimationComplete) {
        onAnimationComplete();
      }
    }, delay + duration);

    return () => clearTimeout(timer);
  }, [delay, duration, onAnimationComplete]);

  return (
    <div
      className={cn(className)}
      style={{
        animation: `bounce-in ${duration}ms ease-out ${delay}ms both`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Shake - 抖动动画
 */
export const Shake: React.FC<{
  children: React.ReactNode;
  trigger?: boolean;
  duration?: number;
  intensity?: 'low' | 'medium' | 'high';
  className?: string;
}> = ({ children, trigger = false, duration = 500, intensity = 'medium', className }) => {
  const shakeKeyframes = {
    low: 'translateX(-2px) translateX(2px)',
    medium: 'translateX(-5px) translateX(5px)',
    high: 'translateX(-10px) translateX(10px)',
  };

  return (
    <div
      className={cn('inline-block', className)}
      style={{
        animation: trigger
          ? `shake ${duration}ms ease-in-out`
          : 'none',
        '--shake-intensity': shakeKeyframes[intensity],
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

/**
 * RotateIn - 旋转进入动画
 */
export const RotateIn: React.FC<{
  children: React.ReactNode;
  from?: number;
  to?: number;
  delay?: number;
  duration?: number;
  className?: string;
  triggerOnViewport?: boolean;
}> = ({
  children,
  from = -180,
  to = 0,
  delay = 0,
  duration = 500,
  className,
  triggerOnViewport = false,
}) => {
  const [isVisible, setIsVisible] = useState(!triggerOnViewport);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!triggerOnViewport || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasAnimated(true);
        }
      },
      { threshold: 0.1 }
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
  }, [triggerOnViewport, hasAnimated]);

  return (
    <div
      ref={ref}
      className={cn('transition-transform ease-out', className)}
      style={{
        transform: `rotate(${isVisible ? to : from}deg)`,
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
};

/**
 * Flip3D - 3D翻转动画
 */
export const Flip3D: React.FC<{
  front: React.ReactNode;
  back: React.ReactNode;
  isFlipped?: boolean;
  duration?: number;
  className?: string;
}> = ({ front, back, isFlipped = false, duration = 600, className }) => {
  return (
    <div
      className={cn('relative w-full h-full', className)}
      style={{
        perspective: '1000px',
      }}
    >
      <div
        className="relative w-full h-full transition-transform duration-600 ease-out preserve-3d"
        style={{
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transitionDuration: `${duration}ms`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* 正面 */}
        <div
          className="absolute inset-0 w-full h-full backface-hidden"
          style={{
            backfaceVisibility: 'hidden',
          }}
        >
          {front}
        </div>

        {/* 背面 */}
        <div
          className="absolute inset-0 w-full h-full backface-hidden"
          style={{
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
          }}
        >
          {back}
        </div>
      </div>
    </div>
  );
};
