/**
 * Performance Optimization Hook
 *
 * React Hook for performance optimization utilities
 *
 * @module hooks/usePerformanceOptimization
 * @author Frontend Performance Engineer
 * @created 2026-04-21
 */

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  performanceOptimizer,
  preloadResource,
  optimizeImageUrl,
  debounce,
  throttle,
  PreloadResult,
} from '@/services/performance/performanceOptimizer';

/**
 * 懒加载Hook选项
 */
export interface UseLazyLoadOptions {
  /** 根边距 */
  rootMargin?: string;
  /** 阈值 */
  threshold?: number;
  /** 是否仅触发一次 */
  triggerOnce?: boolean;
}

/**
 * 懒加载Hook返回值
 */
export interface UseLazyLoadReturn {
  /** 元素引用 */
  ref: React.RefObject<HTMLDivElement>;
  /** 是否可见 */
  isVisible: boolean;
  /** 是否已加载 */
  hasLoaded: boolean;
}

/**
 * 预加载Hook返回值
 */
export interface UsePreloadReturn {
  /** 预加载结果 */
  result: PreloadResult | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 预加载资源 */
  preload: () => Promise<PreloadResult>;
  /** 错误 */
  error: Error | null;
}

/**
 * 图片优化Hook选项
 */
export interface UseOptimizedImageOptions {
  /** 启用WebP */
  enableWebP?: boolean;
  /** 图片质量 */
  quality?: number;
  /** 响应式尺寸 */
  sizes?: string[];
  /** 懒加载 */
  lazy?: boolean;
}

/**
 * 懒加载Hook
 *
 * @example
 * ```tsx
 * function LazyComponent() {
 *   const { ref, isVisible } = useLazyLoad({
 *     threshold: 0.1,
 *     triggerOnce: true,
 *   });
 *
 *   return (
 *     <div ref={ref}>
 *       {isVisible ? <HeavyComponent /> : <Placeholder />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLazyLoad(options: UseLazyLoadOptions = {}): UseLazyLoadReturn {
  const {
    rootMargin = '50px',
    threshold = 0.1,
    triggerOnce = true,
  } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || (triggerOnce && hasLoaded)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasLoaded(true);

          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, threshold, triggerOnce, hasLoaded]);

  return { ref, isVisible, hasLoaded };
}

/**
 * 预加载Hook
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { result, isLoading, preload } = usePreload('/api/data');
 *
 *   useEffect(() => {
 *     preload();
 *   }, []);
 *
 *   return (
 *     <div>
 *       {isLoading && <p>预加载中...</p>}
 *       {result && <p>预加载完成，耗时: {result.duration}ms</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function usePreload(url: string, priority: 'high' | 'low' = 'low'): UsePreloadReturn {
  const [result, setResult] = useState<PreloadResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasPreloaded = useRef(false);

  const preload = useCallback(async (): Promise<PreloadResult> => {
    if (hasPreloaded.current) {
      return result!;
    }

    setIsLoading(true);
    setError(null);

    try {
      const preloadResult = await preloadResource(url, priority);
      setResult(preloadResult);
      hasPreloaded.current = true;
      return preloadResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Preload failed');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [url, priority, result]);

  return { result, isLoading, preload, error };
}

/**
 * 图片优化Hook
 *
 * @example
 * ```tsx
 * function OptimizedImage({ src, alt }) {
 *   const { imgSrc, imgRef, isLoaded, isError } = useOptimizedImage(src, {
 *     enableWebP: true,
 *     quality: 85,
 *     lazy: true,
 *   });
 *
 *   return (
 *     <img
 *       ref={imgRef}
 *       src={imgSrc}
 *       alt={alt}
 *       style={{ opacity: isLoaded ? 1 : 0 }}
 *     />
 *   );
 * }
 * ```
 */
export function useOptimizedImage(
  src: string,
  options: UseOptimizedImageOptions = {}
) {
  const {
    enableWebP = true,
    quality = 85,
    lazy = true,
  } = options;

  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  const imgSrc = useMemo(() => {
    return optimizeImageUrl(src, { enableWebP, imageQuality: quality });
  }, [src, enableWebP, quality]);

  // 懒加载逻辑
  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    const img = imgRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          img.src = imgSrc;
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    observer.observe(img);

    return () => observer.disconnect();
  }, [imgSrc, lazy]);

  // 加载状态监听
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const handleLoad = () => setIsLoaded(true);
    const handleError = () => setIsError(true);

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, []);

  return { imgRef, imgSrc, isLoaded, isError };
}

/**
 * 防抖Hook
 *
 * @example
 * ```tsx
 * function SearchComponent() {
 *   const [query, setQuery] = useState('');
 *   const debouncedQuery = useDebounce(query, 300);
 *
 *   useEffect(() => {
 *     if (debouncedQuery) {
 *       performSearch(debouncedQuery);
 *     }
 *   }, [debouncedQuery]);
 *
 *   return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 节流Hook
 *
 * @example
 * ```tsx
 * function ScrollComponent() {
 *   const [scrollY, setScrollY] = useState(0);
 *   const throttledScrollY = useThrottle(scrollY, 100);
 *
 *   useEffect(() => {
 *   const handleScroll = () => setScrollY(window.scrollY);
 *     window.addEventListener('scroll', handleScroll);
 *     return () => window.removeEventListener('scroll', handleScroll);
 *   }, []);
 *
 *   useEffect(() => {
 *     console.log('节流后的滚动位置:', throttledScrollY);
 *   }, [throttledScrollY]);
 *
 *   return <div>滚动位置: {throttledScrollY}</div>;
 * }
 * ```
 */
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

/**
 * 性能测量Hook
 *
 * @example
 * ```tsx
 * function ExpensiveComponent() {
 *   const { measure } = usePerformanceMeasurement();
 *
 *   useEffect(() => {
 *     const result = measure('expensive-calculation', () => {
 *       return performExpensiveCalculation();
 *     });
 *   }, [measure]);
 *
 *   return <div>组件内容</div>;
 * }
 * ```
 */
export function usePerformanceMeasurement() {
  const measure = useCallback(<T,>(name: string, fn: () => T): T => {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const end = performance.now();
      console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);

      if (typeof window !== 'undefined' && 'performance' in window) {
        performance.mark(`${name}-start`);
        performance.mark(`${name}-end`);
        performance.measure(name, `${name}-start`, `${name}-end`);
      }
    }
  }, []);

  return { measure };
}

/**
 * 批处理更新Hook
 *
 * @example
 * ```tsx
 * function BatchUpdateComponent() {
 *   const [items, setItems] = useState([]);
 *   const { batchUpdate } = useBatchUpdate();
 *
 *   const addMultipleItems = (newItems) => {
 *     batchUpdate(() => {
 *       newItems.forEach(item => {
 *         setItems(prev => [...prev, item]);
 *       });
 *     });
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useBatchUpdate() {
  const batchUpdate = useCallback((updates: () => void) => {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        updates();
      });
    } else if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
      window.requestAnimationFrame(() => {
        updates();
      });
    } else {
      setTimeout(() => {
        updates();
      }, 0);
    }
  }, []);

  return { batchUpdate };
}

/**
 * 内存使用Hook
 *
 * @example
 * ```tsx
 * function MemoryMonitor() {
 *   const memoryUsage = useMemoryUsage(1000);
 *
 *   return (
 *     <div>
 *       <p>已使用内存: {(memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB</p>
 *       <p>总内存: {(memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMemoryUsage(interval: number = 1000) {
  const [memoryUsage, setMemoryUsage] = useState({
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return;
    }

    const updateMemory = () => {
      const memory = (performance as any).memory;
      setMemoryUsage({
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      });
    };

    updateMemory();
    const intervalId = setInterval(updateMemory, interval);

    return () => clearInterval(intervalId);
  }, [interval]);

  return memoryUsage;
}

// ============================================================================
// 类型导出
// ============================================================================

export type {
  UseLazyLoadOptions,
  UseLazyLoadReturn,
  UsePreloadReturn,
  UseOptimizedImageOptions,
};