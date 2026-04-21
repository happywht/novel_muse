/**
 * Performance Monitor Service
 *
 * 前端性能监控服务，负责监控和记录Core Web Vitals及其他性能指标
 *
 * @module services/performance/performanceMonitor
 * @author Frontend Performance Engineer
 * @created 2026-04-21
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * Core Web Vitals 指标接口
 */
export interface CoreWebVitals {
  /** 最大内容绘制 (LCP) - 2.5秒以内为良好 */
  lcp: number;
  /** 首次输入延迟 (FID) - 100毫秒以内为良好 */
  fid: number;
  /** 累积布局偏移 (CLS) - 0.1以内为良好 */
  cls: number;
  /** 首次内容绘制 (FCP) - 1.8秒以内为良好 */
  fcp: number;
  /** 首次字节时间 (TTFB) - 800毫秒以内为良好 */
  ttfb: number;
  /** 可交互时间 (TTI) - 3.8秒以内为良好 */
  tti?: number;
}

/**
 * 资源加载性能指标
 */
export interface ResourcePerformance {
  /** 资源名称 */
  name: string;
  /** 资源类型 (script, stylesheet, image等) */
  type: string;
  /** 加载时长(毫秒) */
  duration: number;
  /** 资源大小(字节) */
  size: number;
  /** 是否缓存命中 */
  cached: boolean;
  /** 加载状态 */
  status: 'success' | 'failed' | 'pending';
}

/**
 * 页面导航性能指标
 */
export interface NavigationPerformance {
  /** DNS查询时长(毫秒) */
  dnsLookup: number;
  /** TCP连接时长(毫秒) */
  tcpConnection: number;
  /** TLS协商时长(毫秒) */
  tlsNegotiation: number;
  /** 请求响应时长(毫秒) */
  requestTime: number;
  /** DOM解析时长(毫秒) */
  domParsing: number;
  /** 资源加载时长(毫秒) */
  resourceLoading: number;
  /** DOM构建时长(毫秒) */
  domConstruction: number;
  /** 总页面加载时长(毫秒) */
  totalLoadTime: number;
}

/**
 * JavaScript执行性能指标
 */
export interface JSPerformance {
  /** 主线程阻塞时长(毫秒) */
  longTasks: number[];
  /** 总任务执行时长(毫秒) */
  totalTaskTime: number;
  /** 内存使用量(字节) */
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

/**
 * 性能评分等级
 */
export type PerformanceGrade = 'excellent' | 'good' | 'needs-improvement' | 'poor';

/**
 * 完整性能报告
 */
export interface PerformanceReport {
  /** 报告时间戳 */
  timestamp: number;
  /** 当前页面URL */
  pageUrl: string;
  /** Core Web Vitals指标 */
  vitals: CoreWebVitals;
  /** 导航性能指标 */
  navigation: NavigationPerformance;
  /** 资源加载指标 */
  resources: ResourcePerformance[];
  /** JavaScript执行指标 */
  jsPerformance: JSPerformance;
  /** 性能评分 */
  score: PerformanceScore;
  /** 优化建议 */
  recommendations: string[];
}

/**
 * 性能评分
 */
export interface PerformanceScore {
  /** 总分 (0-100) */
  overall: number;
  /** LCP评分 */
  lcp: number;
  /** FID评分 */
  fid: number;
  /** CLS评分 */
  cls: number;
  /** FCP评分 */
  fcp: number;
  /** 评级 */
  grade: PerformanceGrade;
}

/**
 * 性能指标阈值配置
 */
interface PerformanceThresholds {
  lcp: { excellent: number; good: number; poor: number };
  fid: { excellent: number; good: number; poor: number };
  cls: { excellent: number; good: number; poor: number };
  fcp: { excellent: number; good: number; poor: number };
  ttfb: { excellent: number; good: number; poor: number };
}

// ============================================================================
// 性能阈值配置 (基于Google Core Web Vitals标准)
// ============================================================================

const THRESHOLDS: PerformanceThresholds = {
  lcp: { excellent: 2000, good: 2500, poor: 4000 },
  fid: { excellent: 50, good: 100, poor: 300 },
  cls: { excellent: 0.05, good: 0.1, poor: 0.25 },
  fcp: { excellent: 1000, good: 1800, poor: 3000 },
  ttfb: { excellent: 400, good: 800, poor: 1800 },
};

// ============================================================================
// 性能监控类
// ============================================================================

/**
 * 性能监控器类
 *
 * 负责收集、分析和报告前端性能指标
 */
class PerformanceMonitor {
  private observer: PerformanceObserver | null = null;
  private longTaskObserver: PerformanceObserver | null = null;
  private vitals: Partial<CoreWebVitals> = {};
  private longTasks: number[] = [];
  private resourceEntries: PerformanceResourceTiming[] = [];
  private isMonitoring: boolean = false;

  /**
   * 开始性能监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('[PerformanceMonitor] Monitoring is already active');
      return;
    }

    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      console.warn('[PerformanceMonitor] PerformanceObserver not supported');
      return;
    }

    this.isMonitoring = true;
    this.setupObservers();
    console.log('[PerformanceMonitor] Started monitoring');
  }

  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.observer?.disconnect();
    this.longTaskObserver?.disconnect();
    this.isMonitoring = false;
    console.log('[PerformanceMonitor] Stopped monitoring');
  }

  /**
   * 设置性能观察器
   */
  private setupObservers(): void {
    // 观察paint指标 (FCP, LCP)
    this.observePaintTiming();

    // 观察layout-shift指标 (CLS)
    this.observeLayoutShift();

    // 观察long-tasks (FID)
    this.observeLongTasks();

    // 观察资源加载
    this.observeResourceTiming();

    // 观察导航时序
    this.observeNavigationTiming();
  }

  /**
   * 观察绘制时序
   */
  private observePaintTiming(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'paint') {
            const paintEntry = entry as PerformancePaintTiming;
            if (paintEntry.name === 'first-contentful-paint') {
              this.vitals.fcp = paintEntry.startTime;
            }
          }
          // LCP
          if (entry.entryType === 'largest-contentful-paint') {
            const lcpEntry = entry as any;
            this.vitals.lcp = lcpEntry.startTime;
          }
        }
      });

      observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
      this.observer = observer;
    } catch (e) {
      console.warn('[PerformanceMonitor] Paint timing not supported:', e);
    }
  }

  /**
   * 观察布局偏移
   */
  private observeLayoutShift(): void {
    try {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.vitals.cls = clsValue;
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.warn('[PerformanceMonitor] Layout shift not supported:', e);
    }
  }

  /**
   * 观察长任务
   */
  private observeLongTasks(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            this.longTasks.push(entry.duration);
          }
        }
      });

      observer.observe({ entryTypes: ['longtask'] });
      this.longTaskObserver = observer;
    } catch (e) {
      console.warn('[PerformanceMonitor] Long tasks not supported:', e);
    }
  }

  /**
   * 观察资源加载
   */
  private observeResourceTiming(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.resourceEntries.push(entry as PerformanceResourceTiming);
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
    } catch (e) {
      console.warn('[PerformanceMonitor] Resource timing not supported:', e);
    }
  }

  /**
   * 观察导航时序
   */
  private observeNavigationTiming(): void {
    // 导航时序通常在页面加载完成后收集
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.collectNavigationTiming();
      }, 0);
    }, { once: true });
  }

  /**
   * 收集导航时序数据
   */
  private collectNavigationTiming(): void {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (navEntry) {
      this.vitals.ttfb = navEntry.responseStart - navEntry.fetchStart;

      // 计算FID (从首次交互到输入的时间)
      const fidEntries = performance.getEntriesByType('first-input');
      if (fidEntries.length > 0) {
        const fidEntry = fidEntries[0] as any;
        this.vitals.fid = fidEntry.processingStart - fidEntry.startTime;
      }
    }
  }

  /**
   * 获取导航性能指标
   */
  private getNavigationPerformance(): NavigationPerformance {
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (!navEntry) {
      return {
        dnsLookup: 0,
        tcpConnection: 0,
        tlsNegotiation: 0,
        requestTime: 0,
        domParsing: 0,
        resourceLoading: 0,
        domConstruction: 0,
        totalLoadTime: 0,
      };
    }

    return {
      dnsLookup: navEntry.domainLookupEnd - navEntry.domainLookupStart,
      tcpConnection: navEntry.connectEnd - navEntry.connectStart,
      tlsNegotiation: navEntry.secureConnectionStart > 0
        ? navEntry.connectEnd - navEntry.secureConnectionStart
        : 0,
      requestTime: navEntry.responseStart - navEntry.requestStart,
      domParsing: navEntry.domComplete - navEntry.domInteractive,
      resourceLoading: navEntry.loadEventStart - navEntry.domComplete,
      domConstruction: navEntry.domInteractive - navEntry.responseEnd,
      totalLoadTime: navEntry.loadEventEnd - navEntry.fetchStart,
    };
  }

  /**
   * 获取资源加载性能
   */
  private getResourcePerformance(): ResourcePerformance[] {
    return this.resourceEntries.map(entry => {
      const type = this.getResourceType(entry.initiatorType);
      return {
        name: entry.name,
        type,
        duration: entry.duration,
        size: entry.transferSize,
        cached: entry.transferSize === 0,
        status: entry.transferSize > 0 ? 'success' : 'pending',
      };
    });
  }

  /**
   * 获取资源类型
   */
  private getResourceType(initiatorType: string): string {
    const typeMap: Record<string, string> = {
      'script': 'script',
      'link': 'stylesheet',
      'img': 'image',
      'css': 'stylesheet',
      'fetch': 'api',
      'xmlhttprequest': 'api',
      'other': 'other',
    };
    return typeMap[initiatorType] || 'other';
  }

  /**
   * 获取JavaScript执行性能
   */
  private getJSPerformance(): JSPerformance {
    const performanceData: JSPerformance = {
      longTasks: this.longTasks,
      totalTaskTime: this.longTasks.reduce((sum, task) => sum + task, 0),
    };

    // 获取内存信息
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      performanceData.memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }

    return performanceData;
  }

  /**
   * 计算性能评分
   */
  private calculateScore(vitals: CoreWebVitals): PerformanceScore {
    const lcpScore = this MetricScore(vitals.lcp, THRESHOLDS.lcp);
    const fidScore = this.MetricScore(vitals.fid, THRESHOLDS.fid);
    const clsScore = this.MetricScore(vitals.cls, THRESHOLDS.cls);
    const fcpScore = this.MetricScore(vitals.fcp, THRESHOLDS.fcp);

    // 计算总分
    const overall = Math.round((lcpScore + fidScore + clsScore + fcpScore) / 4);

    return {
      overall,
      lcp: lcpScore,
      fid: fidScore,
      cls: clsScore,
      fcp: fcpScore,
      grade: this.getGrade(overall),
    };
  }

  /**
   * 计算单个指标评分
   */
  private MetricScore(value: number, thresholds: { excellent: number; good: number; poor: number }): number {
    if (value <= thresholds.excellent) return 100;
    if (value <= thresholds.good) return 75;
    if (value <= thresholds.poor) return 50;
    return 25;
  }

  /**
   * 获取评级
   */
  private getGrade(score: number): PerformanceGrade {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'needs-improvement';
    return 'poor';
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(vitals: CoreWebVitals, resources: ResourcePerformance[]): string[] {
    const recommendations: string[] = [];

    // LCP建议
    if (vitals.lcp > THRESHOLDS.lcp.good) {
      recommendations.push('LCP过慢：优化首屏图片加载、使用现代图片格式(WebP)、实现资源预加载');
    }

    // FID建议
    if (vitals.fid > THRESHOLDS.fid.good) {
      recommendations.push('FID过慢：减少JavaScript执行时间、拆分长任务、使用代码分割');
    }

    // CLS建议
    if (vitals.cls > THRESHOLDS.cls.good) {
      recommendations.push('CLS过高：为图片和媒体设置明确尺寸、避免动态插入内容');
    }

    // FCP建议
    if (vitals.fcp > THRESHOLDS.fcp.good) {
      recommendations.push('FCP过慢：减少渲染阻塞资源、优化关键CSS路径');
    }

    // 资源优化建议
    const slowResources = resources.filter(r => r.duration > 1000);
    if (slowResources.length > 0) {
      recommendations.push(`发现${slowResources.length}个慢速资源：考虑使用CDN、启用压缩、实现懒加载`);
    }

    // 内存建议
    const jsPerf = this.getJSPerformance();
    if (jsPerf.longTasks.length > 0) {
      recommendations.push('检测到长任务阻塞：使用Web Worker处理复杂计算、拆分大任务');
    }

    return recommendations;
  }

  /**
   * 生成完整性能报告
   */
  generateReport(): PerformanceReport | null {
    if (!this.vitals.lcp || !this.vitals.cls) {
      console.warn('[PerformanceMonitor] Insufficient data for report');
      return null;
    }

    // 确保所有必要的指标都存在
    const completeVitals: CoreWebVitals = {
      lcp: this.vitals.lcp || 0,
      fid: this.vitals.fid || 0,
      cls: this.vitals.cls || 0,
      fcp: this.vitals.fcp || 0,
      ttfb: this.vitals.ttfb || 0,
      tti: this.vitals.tti,
    };

    const resources = this.getResourcePerformance();
    const score = this.calculateScore(completeVitals);
    const recommendations = this.generateRecommendations(completeVitals, resources);

    return {
      timestamp: Date.now(),
      pageUrl: window.location.href,
      vitals: completeVitals,
      navigation: this.getNavigationPerformance(),
      resources,
      jsPerformance: this.getJSPerformance(),
      score,
      recommendations,
    };
  }

  /**
   * 获取当前性能快照
   */
  getSnapshot(): Partial<CoreWebVitals> {
    return { ...this.vitals };
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this.vitals = {};
    this.longTasks = [];
    this.resourceEntries = [];
  }

  /**
   * 判断是否正在监控
   */
  isActive(): boolean {
    return this.isMonitoring;
  }
}

// ============================================================================
// 单例导出
// ============================================================================

/**
 * 全局性能监控器实例
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * 性能监控器初始化函数
 *
 * @example
 * ```typescript
 * import { initPerformanceMonitoring } from '@/services/performance/performanceMonitor';
 *
 * // 在应用启动时调用
 * initPerformanceMonitoring();
 * ```
 */
export function initPerformanceMonitoring(): void {
  if (typeof window !== 'undefined') {
    // 延迟启动，确保所有资源开始加载
    setTimeout(() => {
      performanceMonitor.startMonitoring();
    }, 1000);
  }
}

/**
 * 获取性能报告
 *
 * @example
 * ```typescript
 * import { getPerformanceReport } from '@/services/performance/performanceMonitor';
 *
 * const report = getPerformanceReport();
 * console.log('性能评分:', report?.score.overall);
 * ```
 */
export function getPerformanceReport(): PerformanceReport | null {
  return performanceMonitor.generateReport();
}

/**
 * 停止性能监控
 */
export function stopPerformanceMonitoring(): void {
  performanceMonitor.stopMonitoring();
}

// ============================================================================
// 类型导出
// ============================================================================

export type {
  CoreWebVitals,
  ResourcePerformance,
  NavigationPerformance,
  JSPerformance,
  PerformanceReport,
  PerformanceScore,
  PerformanceGrade,
  PerformanceThresholds,
};