/**
 * 性能监控工具
 * 用于追踪和监控应用启动性能指标
 */

interface PerformanceMetrics {
  // 初始化相关指标
  initStartTime: number;
  initEndTime: number;
  initDuration: number;

  // 后端检测相关指标
  backendCheckStartTime: number;
  backendCheckEndTime: number;
  backendCheckDuration: number;
  backendAvailable: boolean;

  // 数据加载相关指标
  dataLoadStartTime: number;
  dataLoadEndTime: number;
  dataLoadDuration: number;

  // 总体性能指标
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  timeToInteractive?: number;
}

/**
 * 性能监控器类
 */
class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private marks: Map<string, number> = new Map();

  /**
   * 开始性能监控
   */
  startMonitoring() {
    this.metrics.initStartTime = performance.now();
    this.mark('init-start');
    console.log('🚀 [性能监控] 开始监控应用启动');
  }

  /**
   * 标记性能时间点
   */
  mark(name: string): number {
    const timestamp = performance.now();
    this.marks.set(name, timestamp);
    console.log(`📍 [性能监控] 标记: ${name} (${timestamp.toFixed(0)}ms)`);
    return timestamp;
  }

  /**
   * 计算两个标记之间的时间差
   */
  measure(startMark: string, endMark: string): number {
    const startTime = this.marks.get(startMark);
    const endTime = this.marks.get(endMark);

    if (startTime === undefined || endTime === undefined) {
      console.warn(`⚠️ [性能监控] 无法计算时间差: ${startMark} -> ${endMark}`);
      return 0;
    }

    const duration = endTime - startTime;
    console.log(`⏱️ [性能监控] ${startMark} -> ${endMark}: ${duration.toFixed(0)}ms`);
    return duration;
  }

  /**
   * 记录后端检测开始
   */
  markBackendCheckStart() {
    this.metrics.backendCheckStartTime = performance.now();
    this.mark('backend-check-start');
    console.log('🔍 [性能监控] 开始后端检测');
  }

  /**
   * 记录后端检测结束
   */
  markBackendCheckEnd(available: boolean) {
    this.metrics.backendCheckEndTime = performance.now();
    this.metrics.backendAvailable = available;

    if (this.metrics.backendCheckStartTime) {
      this.metrics.backendCheckDuration =
        this.metrics.backendCheckEndTime - this.metrics.backendCheckStartTime;
    }

    this.mark('backend-check-end');
    console.log(
      `✅ [性能监控] 后端检测完成: ${available ? '可用' : '不可用'} ` +
      `(${this.metrics.backendCheckDuration?.toFixed(0)}ms)`
    );
  }

  /**
   * 记录数据加载开始
   */
  markDataLoadStart() {
    this.metrics.dataLoadStartTime = performance.now();
    this.mark('data-load-start');
    console.log('📊 [性能监控] 开始加载数据');
  }

  /**
   * 记录数据加载结束
   */
  markDataLoadEnd() {
    this.metrics.dataLoadEndTime = performance.now();

    if (this.metrics.dataLoadStartTime) {
      this.metrics.dataLoadDuration =
        this.metrics.dataLoadEndTime - this.metrics.dataLoadStartTime;
    }

    this.mark('data-load-end');
    console.log(
      `✅ [性能监控] 数据加载完成 (${this.metrics.dataLoadDuration?.toFixed(0)}ms)`
    );
  }

  /**
   * 结束性能监控并输出报告
   */
  endMonitoring() {
    this.metrics.initEndTime = performance.now();
    this.mark('init-end');

    if (this.metrics.initStartTime) {
      this.metrics.initDuration =
        this.metrics.initEndTime - this.metrics.initStartTime;
    }

    this.logReport();
  }

  /**
   * 输出性能报告
   */
  private logReport() {
    console.group('📈 [性能监控] 应用启动性能报告');

    console.log('⏱️ 总体性能指标:');
    console.log(`   • 总启动时间: ${this.metrics.initDuration?.toFixed(0)}ms`);

    if (this.metrics.backendCheckDuration) {
      console.log(`   • 后端检测时间: ${this.metrics.backendCheckDuration.toFixed(0)}ms`);
      console.log(`   • 后端状态: ${this.metrics.backendAvailable ? '✅ 可用' : '❌ 不可用'}`);
    }

    if (this.metrics.dataLoadDuration) {
      console.log(`   • 数据加载时间: ${this.metrics.dataLoadDuration.toFixed(0)}ms`);
    }

    // 性能评估
    console.log('\n🎯 性能评估:');

    if (this.metrics.initDuration) {
      const initTime = this.metrics.initDuration;

      if (initTime < 1500) {
        console.log(`   ✅ 优秀 (${initTime.toFixed(0)}ms < 1.5s)`);
      } else if (initTime < 3000) {
        console.log(`   ⚠️ 良好 (${initTime.toFixed(0)}ms < 3s)`);
      } else {
        console.log(`   ❌ 需要优化 (${initTime.toFixed(0)}ms > 3s)`);
      }
    }

    // Web Vitals 指标
    if (typeof window !== 'undefined' && 'performance' in window) {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (perfData) {
        console.log('\n📊 Web Vitals 指标:');
        console.log(`   • DOM 加载: ${(perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart).toFixed(0)}ms`);
        console.log(`   • 完全加载: ${(perfData.loadEventEnd - perfData.loadEventStart).toFixed(0)}ms`);
      }
    }

    console.groupEnd();
  }

  /**
   * 获取当前指标
   */
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  /**
   * 重置监控器
   */
  reset() {
    this.metrics = {};
    this.marks.clear();
    console.log('🔄 [性能监控] 重置监控器');
  }
}

// 创建全局单例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 性能目标常量
 */
export const PERFORMANCE_TARGETS = {
  INIT_TIME: 3000,        // 目标初始化时间 < 3s
  FCP: 1500,              // 目标首次内容绘制 < 1.5s
  TTI: 3000,              // 目标可交互时间 < 3s
  BACKEND_CHECK: 1000,    // 目标后端检测 < 1s
  DATA_LOAD: 2000,        // 目标数据加载 < 2s
} as const;

/**
 * 检查是否达到性能目标
 */
export function checkPerformanceTargets(metrics: Partial<PerformanceMetrics>): {
  passed: boolean;
  details: Record<string, { actual: number; target: number; passed: boolean }>;
} {
  const details: Record<string, { actual: number; target: number; passed: boolean }> = {};

  // 检查总启动时间
  if (metrics.initDuration) {
    details.initTime = {
      actual: metrics.initDuration,
      target: PERFORMANCE_TARGETS.INIT_TIME,
      passed: metrics.initDuration < PERFORMANCE_TARGETS.INIT_TIME,
    };
  }

  // 检查后端检测时间
  if (metrics.backendCheckDuration) {
    details.backendCheck = {
      actual: metrics.backendCheckDuration,
      target: PERFORMANCE_TARGETS.BACKEND_CHECK,
      passed: metrics.backendCheckDuration < PERFORMANCE_TARGETS.BACKEND_CHECK,
    };
  }

  // 检查数据加载时间
  if (metrics.dataLoadDuration) {
    details.dataLoad = {
      actual: metrics.dataLoadDuration,
      target: PERFORMANCE_TARGETS.DATA_LOAD,
      passed: metrics.dataLoadDuration < PERFORMANCE_TARGETS.DATA_LOAD,
    };
  }

  const passed = Object.values(details).every(detail => detail.passed);

  return { passed, details };
}