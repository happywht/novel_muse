/**
 * useAnimation - 动画控制Hook
 *
 * 提供编程式动画控制能力
 * Provides programmatic animation control
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 动画状态
 */
export type AnimationStatus = 'idle' | 'running' | 'paused' | 'finished';

/**
 * 动画配置
 */
export interface AnimationConfig {
  /**
   * 关键帧
   */
  keyframes: Keyframe[] | PropertyIndexedKeyframes;

  /**
   * 选项
   */
  options?: KeyframeAnimationOptions;
}

/**
 * useAnimation Hook返回值
 */
interface UseAnimationReturn {
  /**
   * 动画状态
   */
  status: AnimationStatus;

  /**
   * 开始动画
   */
  start: () => void;

  /**
   * 暂停动画
   */
  pause: () => void;

  /**
   * 恢复动画
   */
  resume: () => void;

  /**
   * 取消动画
   */
  cancel: () => void;

  /**
   * 完成动画
   */
  finish: () => void;

  /**
   * 反转动画
   */
  reverse: () => void;

  /**
   * 重置动画
   */
  reset: () => void;

  /**
   * 播放速率
   */
  playbackRate: number;

  /**
   * 设置播放速率
   */
  setPlaybackRate: (rate: number) => void;

  /**
   * 当前时间
   */
  currentTime: number | null;
}

/**
 * useAnimation - 动画控制Hook
 *
 * @example
 * ```tsx
 * const boxRef = useRef<HTMLDivElement>(null);
 * const { status, start, pause, resume } = useAnimation(boxRef, {
 *   keyframes: [
 *     { transform: 'translateX(0)' },
 *     { transform: 'translateX(100px)' },
 *   ],
 *   options: {
 *     duration: 1000,
 *     iterations: Infinity,
 *     direction: 'alternate',
 *   },
 * });
 *
 * return (
 *   <div>
 *     <div ref={boxRef} className="w-10 h-10 bg-blue-500" />
 *     <button onClick={start}>开始</button>
 *     <button onClick={pause}>暂停</button>
 *     <button onClick={resume}>恢复</button>
 *   </div>
 * );
 * ```
 */
export function useAnimation(
  targetRef: React.RefObject<HTMLElement>,
  config: AnimationConfig | null = null
): UseAnimationReturn {
  const [status, setStatus] = useState<AnimationStatus>('idle');
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const animationRef = useRef<Animation | null>(null);

  // 创建动画
  const createAnimation = useCallback(() => {
    if (!targetRef.current || !config) return null;

    const animation = targetRef.current.animate(
      config.keyframes,
      config.options
    );

    animationRef.current = animation;

    // 监听动画状态
    animation.addEventListener('finish', () => {
      setStatus('finished');
    });

    animation.addEventListener('cancel', () => {
      setStatus('idle');
    });

    return animation;
  }, [targetRef, config]);

  // 开始动画
  const start = useCallback(() => {
    const animation = animationRef.current || createAnimation();
    if (animation) {
      animation.play();
      setStatus('running');
    }
  }, [createAnimation]);

  // 暂停动画
  const pause = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.pause();
      setStatus('paused');
    }
  }, []);

  // 恢复动画
  const resume = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.play();
      setStatus('running');
    }
  }, []);

  // 取消动画
  const cancel = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.cancel();
      setStatus('idle');
    }
  }, []);

  // 完成动画
  const finish = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.finish();
      setStatus('finished');
    }
  }, []);

  // 反转动画
  const reverse = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.reverse();
      setStatus('running');
    }
  }, []);

  // 重置动画
  const reset = useCallback(() => {
    cancel();
    start();
  }, [cancel, start]);

  // 设置播放速率
  const setPlaybackRate = useCallback((rate: number) => {
    if (animationRef.current) {
      animationRef.current.playbackRate = rate;
      setPlaybackRateState(rate);
    }
  }, []);

  // 监听当前时间
  useEffect(() => {
    const animation = animationRef.current;
    if (!animation || status !== 'running') return;

    const updateCurrentTime = () => {
      setCurrentTime(animation.currentTime as number);
    };

    animation.addEventListener('timeupdate', updateCurrentTime);

    return () => {
      animation.removeEventListener('timeupdate', updateCurrentTime);
    };
  }, [status]);

  // 清理
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        animationRef.current.cancel();
      }
    };
  }, []);

  return {
    status,
    start,
    pause,
    resume,
    cancel,
    finish,
    reverse,
    reset,
    playbackRate,
    setPlaybackRate,
    currentTime,
  };
}

/**
 * 预设动画配置
 */
export const PresetAnimations = {
  /**
   * 淡入
   */
  fadeIn: {
    keyframes: [
      { opacity: 0 },
      { opacity: 1 },
    ],
    options: {
      duration: 300,
      easing: 'ease-out',
      fill: 'forwards' as FillMode,
    },
  },

  /**
   * 淡出
   */
  fadeOut: {
    keyframes: [
      { opacity: 1 },
      { opacity: 0 },
    ],
    options: {
      duration: 300,
      easing: 'ease-in',
      fill: 'forwards' as FillMode,
    },
  },

  /**
   * 滑入右侧
   */
  slideInRight: {
    keyframes: [
      { transform: 'translateX(100%)' },
      { transform: 'translateX(0)' },
    ],
    options: {
      duration: 300,
      easing: 'ease-out',
      fill: 'forwards' as FillMode,
    },
  },

  /**
   * 滑出左侧
   */
  slideOutLeft: {
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-100%)' },
    ],
    options: {
      duration: 300,
      easing: 'ease-in',
      fill: 'forwards' as FillMode,
    },
  },

  /**
   * 缩放进入
   */
  scaleIn: {
    keyframes: [
      { transform: 'scale(0)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    options: {
      duration: 200,
      easing: 'ease-out',
      fill: 'forwards' as FillMode,
    },
  },

  /**
   * 缩放退出
   */
  scaleOut: {
    keyframes: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0)', opacity: 0 },
    ],
    options: {
      duration: 200,
      easing: 'ease-in',
      fill: 'forwards' as FillMode,
    },
  },

  /**
   * 弹跳进入
   */
  bounceIn: {
    keyframes: [
      { transform: 'scale(0.3)', opacity: 0, offset: 0 },
      { transform: 'scale(1.05)', offset: 0.5 },
      { transform: 'scale(0.9)', offset: 0.7 },
      { transform: 'scale(1)', opacity: 1, offset: 1 },
    ],
    options: {
      duration: 500,
      easing: 'ease-out',
      fill: 'forwards' as FillMode,
    },
  },

  /**
   * 脉冲
   */
  pulse: {
    keyframes: [
      { transform: 'scale(1)', offset: 0 },
      { transform: 'scale(1.05)', offset: 0.5 },
      { transform: 'scale(1)', offset: 1 },
    ],
    options: {
      duration: 1000,
      easing: 'ease-in-out',
      iterations: Infinity,
    },
  },

  /**
   * 旋转
   */
  spin: {
    keyframes: [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(360deg)' },
    ],
    options: {
      duration: 1000,
      easing: 'linear',
      iterations: Infinity,
    },
  },

  /**
   * 抖动
   */
  shake: {
    keyframes: [
      { transform: 'translateX(0)', offset: 0 },
      { transform: 'translateX(-5px)', offset: 0.1 },
      { transform: 'translateX(5px)', offset: 0.2 },
      { transform: 'translateX(-5px)', offset: 0.3 },
      { transform: 'translateX(5px)', offset: 0.4 },
      { transform: 'translateX(0)', offset: 0.5 },
    ],
    options: {
      duration: 500,
      easing: 'ease-in-out',
      fill: 'forwards' as FillMode,
    },
  },
};

/**
 * usePresetAnimation - 使用预设动画
 *
 * @example
 * ```tsx
 * const boxRef = useRef<HTMLDivElement>(null);
 * const { start, pause } = usePresetAnimation(boxRef, 'bounceIn');
 *
 * return (
 *   <>
 *     <div ref={boxRef} className="w-10 h-10 bg-blue-500" />
 *     <button onClick={start}>播放</button>
 *     <button onClick={pause}>暂停</button>
 *   </>
 * );
 * ```
 */
export function usePresetAnimation(
  targetRef: React.RefObject<HTMLElement>,
  preset: keyof typeof PresetAnimations
): UseAnimationReturn {
  return useAnimation(targetRef, PresetAnimations[preset]);
}

/**
 * useSequence - 序列动画Hook
 *
 * @example
 * ```tsx
 * const animations = [
 *   { ref: box1Ref, preset: 'fadeIn' as const },
 *   { ref: box2Ref, preset: 'fadeIn' as const },
 *   { ref: box3Ref, preset: 'fadeIn' as const },
 * ];
 *
 * const { start, status } = useSequence(animations, 300);
 * ```
 */
export function useSequence(
  sequence: Array<{
    ref: React.RefObject<HTMLElement>;
    preset: keyof typeof PresetAnimations;
  }>,
  stagger = 100
): {
  start: () => void;
  status: AnimationStatus;
} {
  const [status, setStatus] = useState<AnimationStatus>('idle');

  const start = useCallback(() => {
    setStatus('running');

    sequence.forEach((item, index) => {
      const { ref, preset } = item;
      const config = PresetAnimations[preset];

      setTimeout(() => {
        if (ref.current) {
          const animation = ref.current.animate(
            config.keyframes,
            config.options
          );

          if (index === sequence.length - 1) {
            animation.addEventListener('finish', () => {
              setStatus('finished');
            });
          }
        }
      }, index * stagger);
    });
  }, [sequence, stagger]);

  return { start, status };
}

/**
 * useParallel - 并行动画Hook
 *
 * @example
 * ```tsx
 * const animations = [
 *   { ref: box1Ref, preset: 'spin' as const },
 *   { ref: box2Ref, preset: 'pulse' as const },
 * ];
 *
 * const { start, pause } = useParallel(animations);
 * ```
 */
export function useParallel(
  parallel: Array<{
    ref: React.RefObject<HTMLElement>;
    preset: keyof typeof PresetAnimations;
  }>
): {
  start: () => void;
  pause: () => void;
  resume: () => void;
  status: AnimationStatus;
} {
  const [status, setStatus] = useState<AnimationStatus>('idle');
  const animationsRef = useRef<Animation[]>([]);

  const start = useCallback(() => {
    setStatus('running');
    animationsRef.current = [];

    parallel.forEach((item) => {
      const { ref, preset } = item;
      const config = PresetAnimations[preset];

      if (ref.current) {
        const animation = ref.current.animate(
          config.keyframes,
          config.options
        );
        animationsRef.current.push(animation);
      }
    });
  }, [parallel]);

  const pause = useCallback(() => {
    animationsRef.current.forEach((animation) => {
      animation.pause();
    });
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    animationsRef.current.forEach((animation) => {
      animation.play();
    });
    setStatus('running');
  }, []);

  return { start, pause, resume, status };
}

/**
 * 动画状态监听
 */
export function useAnimationProgress(
  targetRef: React.RefObject<HTMLElement>,
  config: AnimationConfig
): {
  progress: number;
  status: AnimationStatus;
} {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<AnimationStatus>('idle');

  useEffect(() => {
    if (!targetRef.current) return;

    const animation = targetRef.current.animate(
      config.keyframes,
      config.options
    );

    setStatus('running');

    animation.addEventListener('timeupdate', () => {
      if (config.options?.duration) {
        const currentTime = animation.currentTime as number;
        const duration = config.options.duration;
        setProgress((currentTime / duration) * 100);
      }
    });

    animation.addEventListener('finish', () => {
      setStatus('finished');
      setProgress(100);
    });

    return () => {
      animation.cancel();
    };
  }, [targetRef, config]);

  return { progress, status };
}
