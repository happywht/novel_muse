/**
 * 性能监控系统
 *
 * 监控 Core Web Vitals、API性能和自定义指标
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface APIMetric extends PerformanceMetric {
  url: string;
  method: string;
  status: number;
  duration: number;
}

interface CoreWebVitals {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  CLS?: number; // Cumulative Layout Shift
  FID?: number; // First Input Delay
  INP?: number; // Interaction to Next Paint
  TTFB?: number; // Time to First Byte
}

type PerformanceAlertLevel = 'info' | 'warning' | 'error' | 'critical';

interface PerformanceAlert {
  level: PerformanceAlertLevel;
  metric: string;
  threshold: number;
  actual: number;
  timestamp: number;
  message: string;
}

/**
 * 性能监控类
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: APIMetric[] = [];
  private coreWebVitals: CoreWebVitals = {};
  private alerts: PerformanceAlert[] = [];
  private isRecording = false;

  // 性能阈值配置
  private thresholds = {
    FCP: { good: 1800, needsImprovement: 3000 },
    LCP: { good: 2500, needsImprovement: 4000 },
    CLS: { good: 0.1, needsImprovement: 0.25 },
    FID: { good: 100, needsImprovement: 300 },
    INP: { good: 200, needsImprovement: 500 },
    TTFB: { good: 800, needsImprovement: 1800 },
    API: { good: 500, needsImprovement: 1000 }, // API响应时间(ms)
  };

  /**
   * 开始监控
   */
  startMonitoring(): void {
    if (this.isRecording) return;

    this.isRecording = true;
    this.setupCoreWebVitals();
    this.setupAPIMonitoring();
    this.setupPerformanceObserver();

    console.log('[Performance Monitor] Monitoring started');
  }

  /**
   * 停止监控
   */
  stopMonitoring(): void {
    this.isRecording = false;
    console.log('[Performance Monitor] Monitoring stopped');
  }

  /**
   * 设置Core Web Vitals监控
   */
  private setupCoreWebVitals(): void {
    if (typeof window === 'undefined') return;

    // FCP - First Contentful Paint
    this.observeEntry('paint', (entry) => {
      if (entry.name === 'first-contentful-paint') {
        this.recordMetric('FCP', entry.startTime);
      }
    });

    // LCP - Largest Contentful Paint
    this.observeEntry('largest-contentful-paint', (entry) => {
      this.recordMetric('LCP', entry.startTime);
    });

    // CLS - Cumulative Layout Shift
    let clsValue = 0;
    this.observeEntry('layout-shift', (entry) => {
      if (!entry.hadRecentInput) {
        clsValue += entry.value;
        this.recordMetric('CLS', clsValue);
      }
    });

    // FID - First Input Delay (已废弃，使用INP)
    this.observeEntry('first-input', (entry) => {
      if (entry.processingStart) {
        this.recordMetric('FID', entry.processingStart - entry.startTime);
      }
    });

    // INP - Interaction to Next Paint
    let inpValue = 0;
    let inpCount = 0;
    this.observeEntry('event', (entry) => {
      if (entry.interactionId) {
        const duration = entry.duration;
        inpValue = Math.max(inpValue, duration);
        inpCount++;
        if (inpCount >= 10) { // 至少10次交互后报告
          this.recordMetric('INP', inpValue);
        }
      }
    });

    // TTFB - Time to First Byte
    if (performance.getEntriesByType) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navigationEntries.length > 0) {
        const navigationEntry = navigationEntries[0];
        const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        this.recordMetric('TTFB', ttfb);
      }
    }
  }

  /**
   * 设置API监控
   */
  private setupAPIMonitoring(): void {
    // 拦截fetch请求
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const start = performance.now();
        const url = args[0] as string;
        const options = args[1] || {};

        try {
          const response = await originalFetch(...args);
          const duration = performance.now() - start;

          this.recordAPIMetric({
            name: 'API_REQUEST',
            value: duration,
            timestamp: Date.now(),
            url,
            method: options.method || 'GET',
            status: response.status,
            duration,
          });

          return response;
        } catch (error) {
          const duration = performance.now() - start;

          this.recordAPIMetric({
            name: 'API_REQUEST',
            value: duration,
            timestamp: Date.now(),
            url,
            method: options.method || 'GET',
            status: 0,
            duration,
          });

          throw error;
        }
      };
    }
  }

  /**
   * 设置性能观察器
   */
  private setupPerformanceObserver(): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // 处理自定义性能指标
          if (entry.entryType === 'measure') {
            this.recordMetric(entry.name, entry.duration);
          }
        }
      });

      observer.observe({ entryTypes: ['measure'] });
    } catch (error) {
      console.warn('[Performance Monitor] PerformanceObserver not supported', error);
    }
  }

  /**
   * 观察性能条目
   */
  private observeEntry(
    type: string,
    callback: (entry: any) => void
  ): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          callback(entry as any);
        }
      });

      observer.observe({ type, buffered: true });
    } catch (error) {
      console.warn(`[Performance Monitor] Failed to observe ${type}`, error);
    }
  }

  /**
   * 记录自定义指标
   */
  recordMetric(name: string, value: number, metadata?: Record<string, unknown>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // 检查阈值并生成告警
    this.checkThreshold(name, value);

    // 存储到Core Web Vitals
    if (name in this.coreWebVitals) {
      (this.coreWebVitals as any)[name] = value;
    }

    // 在开发环境输出日志
    if (import.meta.env.DEV) {
      console.log(`[Performance Metric] ${name}: ${value.toFixed(2)}ms`);
    }
  }

  /**
   * 记录API指标
   */
  recordAPIMetric(metric: APIMetric): void {
    this.apiMetrics.push(metric);

    // 检查API响应时间阈值
    const threshold = this.thresholds.API;
    if (metric.duration > threshold.needsImprovement) {
      this.createAlert('error', 'API_RESPONSE_TIME', threshold.needsImprovement, metric.duration, {
        url: metric.url,
        method: metric.method,
      });
    }

    if (import.meta.env.DEV) {
      console.log(`[API Metric] ${metric.method} ${metric.url}: ${metric.duration.toFixed(2)}ms [${metric.status}]`);
    }
  }

  /**
   * 检查阈值并生成告警
   */
  private checkThreshold(name: string, value: number): void {
    const threshold = (this.thresholds as any)[name];
    if (!threshold) return;

    if (value > threshold.needsImprovement) {
      this.createAlert('warning', name, threshold.needsImprovement, value);
    } else if (value > threshold.good) {
      this.createAlert('info', name, threshold.good, value);
    }
  }

  /**
   * 创建性能告警
   */
  private createAlert(
    level: PerformanceAlertLevel,
    metric: string,
    threshold: number,
    actual: number,
    metadata?: Record<string, unknown>
  ): void {
    const alert: PerformanceAlert = {
      level,
      metric,
      threshold,
      actual,
      timestamp: Date.now(),
      message: `[${level.toUpperCase()}] ${metric}: ${actual.toFixed(2)}ms (threshold: ${threshold}ms)`,
    };

    this.alerts.push(alert);

    if (import.meta.env.DEV) {
      console.warn(`[Performance Alert] ${alert.message}`);
    }
  }

  /**
   * 获取性能报告
   */
  getReport(): {
    coreWebVitals: CoreWebVitals;
    customMetrics: PerformanceMetric[];
    apiMetrics: APIMetric[];
    alerts: PerformanceAlert[];
    summary: {
      totalMetrics: number;
      totalAPICalls: number;
      totalAlerts: number;
      averageAPIDuration: number;
    };
  } {
    const totalAPICalls = this.apiMetrics.length;
    const totalAPIDuration = this.apiMetrics.reduce((sum, m) => sum + m.duration, 0);
    const averageAPIDuration = totalAPICalls > 0 ? totalAPIDuration / totalAPICalls : 0;

    return {
      coreWebVitals: { ...this.coreWebVitals },
      customMetrics: [...this.metrics],
      apiMetrics: [...this.apiMetrics],
      alerts: [...this.alerts],
      summary: {
        totalMetrics: this.metrics.length,
        totalAPICalls,
        totalAlerts: this.alerts.length,
        averageAPIDuration,
      },
    };
  }

  /**
   * 清除所有指标
   */
  clearMetrics(): void {
    this.metrics = [];
    this.apiMetrics = [];
    this.alerts = [];
    this.coreWebVitals = {};
  }

  /**
   * 导出性能数据（用于分析）
   */
  exportData(): string {
    const data = {
      timestamp: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      report: this.getReport(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * 开始性能标记（用于自定义计时）
   */
  mark(name: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(name);
    }
  }

  /**
   * 结束性能测量
   */
  measure(name: string, startMark: string, endMark?: string): void {
    if (typeof performance !== 'undefined') {
      try {
        performance.measure(name, startMark, endMark);
        const entries = performance.getEntriesByName(name, 'measure');
        if (entries.length > 0) {
          const entry = entries[0] as PerformanceMeasure;
          this.recordMetric(name, entry.duration);
        }
      } catch (error) {
        console.warn(`[Performance Monitor] Failed to measure ${name}`, error);
      }
    }
  }
}

/**
 * 单例实例
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * 自动初始化（在浏览器环境中）
 */
if (typeof window !== 'undefined') {
  // 延迟启动，确保页面加载完成
  if (document.readyState === 'complete') {
    performanceMonitor.startMonitoring();
  } else {
    window.addEventListener('load', () => {
      performanceMonitor.startMonitoring();
    });
  }
}

/**
 * React Hook集成
 */
export function usePerformanceMonitor() {
  return {
    monitor: performanceMonitor,
    mark: performanceMonitor.mark.bind(performanceMonitor),
    measure: performanceMonitor.measure.bind(performanceMonitor),
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    getReport: performanceMonitor.getReport.bind(performanceMonitor),
  };
}
