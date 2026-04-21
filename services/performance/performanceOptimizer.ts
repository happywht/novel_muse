/**
 * Performance Optimizer Service
 *
 * 前端性能优化服务，提供代码分割、懒加载、资源优化等功能
 *
 * @module services/performance/performanceOptimizer
 * @author Frontend Performance Engineer
 * @created 2026-04-21
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 代码分割策略
 */
export interface CodeSplittingStrategy {
  /** 分割名称 */
  name: string;
  /** 是否延迟加载 */
  lazy: boolean;
  /** 预加载优先级 */
  priority?: 'high' | 'low' | 'auto';
  /** 预加载条件 */
  preloadWhen?: () => boolean;
}

/**
 * 资源优化选项
 */
export interface ResourceOptimizationOptions {
  /** 图片懒加载 */
  lazyImages?: boolean;
  /** 图片占位符 */
  placeholderImage?: string;
  /** 响应式图片 */
  responsiveImages?: boolean;
  /** 图片质量 (0-100) */
  imageQuality?: number;
  /** 启用WebP格式 */
  enableWebP?: boolean;
}

/**
 * 性能优化配置
 */
export interface OptimizationConfig {
  /** 代码分割策略 */
  codeSplitting: {
    /** 启用路由分割 */
    routeBased: boolean;
    /** 启用组件分割 */
    componentBased: boolean;
    /** 自定义分割策略 */
    customStrategies: CodeSplittingStrategy[];
  };
  /** 资源优化配置 */
  resources: ResourceOptimizationOptions;
  /** 缓存策略 */
  caching: {
    /** 启用Service Worker */
    enableServiceWorker: boolean;
    /** 缓存策略 (networkFirst, cacheFirst, staleWhileRevalidate) */
    strategy: 'networkFirst' | 'cacheFirst' | 'staleWhileRevalidate';
    /** 缓存过期时间(秒) */
    maxAge: number;
  };
  /** 预加载配置 */
  preloading: {
    /** 预加载域名 */
    domains: string[];
    /** 预连接资源 */
    preconnectTo: string[];
    /** 预加载资源 */
    prefetch: string[];
  };
}

/**
 * 懒加载选项
 */
export interface LazyLoadOptions {
  /** 根边距 (Intersection Observer rootMargin) */
  rootMargin?: string;
  /** 阈值 (Intersection Observer threshold) */
  threshold?: number;
  /** 回退内容 */
  fallback?: React.ReactNode;
  /** 加载中的占位符 */
  placeholder?: React.ReactNode;
}

/**
 * 资源预加载结果
 */
export interface PreloadResult {
  /** 资源URL */
  url: string;
  /** 是否成功 */
  success: boolean;
  /** 加载时长(毫秒) */
  duration: number;
  /** 错误信息 */
  error?: string;
}

// ============================================================================
// 性能优化器类
// ============================================================================

/**
 * 性能优化器类
 *
 * 提供各种性能优化功能的实现
 */
class PerformanceOptimizer {
  private config: OptimizationConfig;
  private preloadedResources: Set<string> = new Set();
  private observers: Map<string, IntersectionObserver> = new Map();

  /**
   * 构造函数
   */
  constructor(config?: Partial<OptimizationConfig>) {
    this.config = this.getDefaultConfig();
    if (config) {
      this.config = this.mergeConfig(this.config, config);
    }
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): OptimizationConfig {
    return {
      codeSplitting: {
        routeBased: true,
        componentBased: true,
        customStrategies: [],
      },
      resources: {
        lazyImages: true,
        responsiveImages: true,
        imageQuality: 85,
        enableWebP: true,
      },
      caching: {
        enableServiceWorker: true,
        strategy: 'networkFirst',
        maxAge: 3600,
      },
      preloading: {
        domains: [],
        preconnectTo: [],
        prefetch: [],
      },
    };
  }

  /**
   * 合并配置
   */
  private mergeConfig(base: OptimizationConfig, override: Partial<OptimizationConfig>): OptimizationConfig {
    return {
      codeSplitting: { ...base.codeSplitting, ...override.codeSplitting },
      resources: { ...base.resources, ...override.resources },
      caching: { ...base.caching, ...override.caching },
      preloading: { ...base.preloading, ...override.preloading },
    };
  }

  /**
   * 初始化优化
   */
  init(): void {
    if (typeof window === 'undefined') return;

    // 设置资源预连接
    this.setupPreconnects();

    // 设置图片懒加载
    if (this.config.resources.lazyImages) {
      this.setupImageLazyLoading();
    }

    // 注册Service Worker
    if (this.config.caching.enableServiceWorker && 'serviceWorker' in navigator) {
      this.registerServiceWorker();
    }
  }

  /**
   * 设置预连接
   */
  private setupPreconnects(): void {
    const head = document.head;

    this.config.preloading.preconnectTo.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      head.appendChild(link);
    });

    this.config.preloading.domains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      head.appendChild(link);
    });
  }

  /**
   * 设置图片懒加载
   */
  private setupImageLazyLoading(): void {
    if ('loading' in HTMLImageElement.prototype) {
      // 浏览器原生支持懒加载
      const images = document.querySelectorAll('img[data-src]');
      images.forEach(img => {
        const image = img as HTMLImageElement;
        image.loading = 'lazy';
        if (image.dataset.src) {
          image.src = image.dataset.src;
        }
      });
    } else {
      // 使用Intersection Observer实现懒加载
      this.setupIntersectionObserver();
    }
  }

  /**
   * 设置Intersection Observer
   */
  private setupIntersectionObserver(): void {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                observer.unobserve(img);
              }
            }
          });
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.01,
        }
      );

      const images = document.querySelectorAll('img[data-src]');
      images.forEach(img => observer.observe(img));
      this.observers.set('images', observer);
    }
  }

  /**
   * 注册Service Worker
   */
  private async registerServiceWorker(): Promise<void> {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[PerformanceOptimizer] Service Worker registered:', registration);
    } catch (error) {
      console.warn('[PerformanceOptimizer] Service Worker registration failed:', error);
    }
  }

  /**
   * 预加载资源
   */
  async preloadResource(url: string, priority: PreloadPriority = 'low'): Promise<PreloadResult> {
    if (this.preloadedResources.has(url)) {
      return {
        url,
        success: true,
        duration: 0,
      };
    }

    const startTime = performance.now();

    try {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = this.getResourceType(url);
      link.href = url;

      if (priority === 'high') {
        link.setAttribute('importance', 'high');
      }

      document.head.appendChild(link);

      await new Promise((resolve, reject) => {
        link.onload = resolve;
        link.onerror = reject;
      });

      this.preloadedResources.add(url);

      return {
        url,
        success: true,
        duration: performance.now() - startTime,
      };
    } catch (error) {
      return {
        url,
        success: false,
        duration: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 获取资源类型
   */
  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    const typeMap: Record<string, string> = {
      'js': 'script',
      'css': 'style',
      'woff': 'font',
      'woff2': 'font',
      'ttf': 'font',
      'png': 'image',
      'jpg': 'image',
      'jpeg': 'image',
      'webp': 'image',
      'svg': 'image',
    };
    return typeMap[extension || ''] || 'fetch';
  }

  /**
   * 预加载多个资源
   */
  async preloadResources(urls: string[], priority: PreloadPriority = 'low'): Promise<PreloadResult[]> {
    const results = await Promise.all(
      urls.map(url => this.preloadResource(url, priority))
    );
    return results;
  }

  /**
   * 动态导入组件 (代码分割)
   */
  lazyImport<T>(importFn: () => Promise<T>, options?: LazyLoadOptions): {
    Component: React.ComponentType<T>;
    loading: boolean;
    error: Error | null;
  } {
    let Component: React.ComponentType<T> | null = null;
    let loading = false;
    let error: Error | null = null;

    // 这里返回一个占位对象，实际使用时需要配合React使用
    // 详见下面的React Hook实现
    return {
      get Component() {
        return Component!;
      },
      get loading() {
        return loading;
      },
      get error() {
        return error;
      },
    };
  }

  /**
   * 优化图片URL
   */
  optimizeImageUrl(url: string, options?: ResourceOptimizationOptions): string {
    const opts = { ...this.config.resources, ...options };

    if (!opts.enableWebP && !opts.responsiveImages) {
      return url;
    }

    try {
      const urlObj = new URL(url, window.location.origin);

      // 添加WebP参数
      if (opts.enableWebP) {
        urlObj.searchParams.set('format', 'webp');
      }

      // 添加质量参数
      if (opts.imageQuality) {
        urlObj.searchParams.set('quality', opts.imageQuality.toString());
      }

      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * 测量性能
   */
  measurePerformance<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();

    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`${name}-start`);
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);

      console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
    }

    return result;
  }

  /**
   * 防抖函数
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;

    return function executedFunction(...args: Parameters<T>) {
      const later = () => {
        timeout = null;
        func(...args);
      };

      if (timeout) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * 节流函数
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return function executedFunction(...args: Parameters<T>) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  /**
   * 批处理更新
   */
  batchUpdates(updates: (() => void)[]): void {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        updates.forEach(update => update());
      });
    } else {
      // 回退到requestAnimationFrame
      if (typeof window !== 'undefined' && 'requestAnimationFrame' in window) {
        window.requestAnimationFrame(() => {
          updates.forEach(update => update());
        });
      } else {
        // 最终回退到setTimeout
        setTimeout(() => {
          updates.forEach(update => update());
        }, 0);
      }
    }
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    // 清理所有观察器
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();

    // 清理预加载资源记录
    this.preloadedResources.clear();
  }

  /**
   * 获取当前配置
   */
  getConfig(): OptimizationConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<OptimizationConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
  }
}

// ============================================================================
// 类型辅助
// ============================================================================

/**
 * 预加载优先级
 */
type PreloadPriority = 'high' | 'low' | 'auto';

// ============================================================================
// 单例导出
// ============================================================================

/**
 * 全局性能优化器实例
 */
export const performanceOptimizer = new PerformanceOptimizer();

/**
 * 初始化性能优化
 *
 * @example
 * ```typescript
 * import { initPerformanceOptimizer } from '@/services/performance/performanceOptimizer';
 *
 * // 在应用启动时调用
 * initPerformanceOptimizer({
 *   resources: {
 *     lazyImages: true,
 *     enableWebP: true,
 *   }
 * });
 * ```
 */
export function initPerformanceOptimizer(config?: Partial<OptimizationConfig>): void {
  const optimizer = new PerformanceOptimizer(config);
  optimizer.init();
}

/**
 * 预加载资源
 *
 * @example
 * ```typescript
 * import { preloadResource } from '@/services/performance/performanceOptimizer';
 *
 * const result = await preloadResource('/api/data', 'high');
 * if (result.success) {
 *   console.log('预加载成功，耗时:', result.duration);
 * }
 * ```
 */
export async function preloadResource(
  url: string,
  priority?: PreloadPriority
): Promise<PreloadResult> {
  return performanceOptimizer.preloadResource(url, priority);
}

/**
 * 优化图片URL
 *
 * @example
 * ```typescript
 * import { optimizeImageUrl } from '@/services/performance/performanceOptimizer';
 *
 * const optimizedUrl = optimizeImageUrl('/image.jpg', {
 *   enableWebP: true,
 *   imageQuality: 80,
 * });
 * ```
 */
export function optimizeImageUrl(
  url: string,
  options?: ResourceOptimizationOptions
): string {
  return performanceOptimizer.optimizeImageUrl(url, options);
}

/**
 * 性能测量装饰器
 *
 * @example
 * ```typescript
 * import { measurePerformance } from '@/services/performance/performanceOptimizer';
 *
 * const result = measurePerformance('expensive-operation', () => {
 *   return performExpensiveCalculation();
 * });
 * ```
 */
export function measurePerformance<T>(name: string, fn: () => T): T {
  return performanceOptimizer.measurePerformance(name, fn);
}

/**
 * 防抖函数
 *
 * @example
 * ```typescript
 * import { debounce } from '@/services/performance/performanceOptimizer';
 *
 * const debouncedSearch = debounce((query: string) => {
 *   performSearch(query);
 * }, 300);
 * ```
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  return performanceOptimizer.debounce(func, wait);
}

/**
 * 节流函数
 *
 * @example
 * ```typescript
 * import { throttle } from '@/services/performance/performanceOptimizer';
 *
 * const throttledScroll = throttle(() => {
 *   handleScroll();
 * }, 100);
 * ```
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  return performanceOptimizer.throttle(func, limit);
}

// ============================================================================
// 类型导出
// ============================================================================

export type {
  CodeSplittingStrategy,
  ResourceOptimizationOptions,
  OptimizationConfig,
  LazyLoadOptions,
  PreloadResult,
  PreloadPriority,
};