/**
 * 性能测试设置文件
 * 配置性能测试环境和工具
 */

import { beforeAll, afterEach } from 'vitest';
import { PerformanceMonitor } from '../../services/monitoring/performanceMonitor';

// 全局性能监控实例
export let performanceMonitor: PerformanceMonitor;

beforeAll(() => {
  // 初始化性能监控
  performanceMonitor = new PerformanceMonitor();

  // 配置全局性能测试超时
  vi.setConfig({ testTimeout: 30000 });

  // 设置性能测试环境
  if (typeof window !== 'undefined') {
    // 模拟Performance API
    window.performance.mark = vitest.fn();
    window.performance.measure = vitest.fn();
    window.performance.getEntriesByName = vitest.fn(() => []);

    // 设置PerformanceObserver
    global.PerformanceObserver = vitest.fn().mockImplementation((callback) => ({
      observe: vitest.fn(),
      disconnect: vitest.fn(),
    }));
  }

  console.log('[Performance Test Setup] Environment initialized');
});

afterEach(() => {
  // 每个测试后清理性能数据
  if (performanceMonitor) {
    performanceMonitor.clearMetrics();
  }
});

/**
 * 性能测试工具函数
 */
export class PerformanceTestUtils {
  /**
   * 等待指定时间
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 测量函数执行时间
   */
  static async measureExecutionTime<T>(
    fn: () => Promise<T> | T,
    metricName: string
  ): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    performanceMonitor.recordMetric(metricName, duration);

    return { result, duration };
  }

  /**
   * 测量内存使用情况
   */
  static measureMemoryUsage(): {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  }

  /**
   * 创建性能基准测试数据
   */
  static createBenchmarkData(sizes: number[]) {
    return sizes.map(size => ({
      size,
      data: Array.from({ length: size }, (_, i) => ({
        id: `item-${i}`,
        name: `Test Item ${i}`,
        description: 'A'.repeat(100), // 固定大小描述
        timestamp: Date.now(),
      })),
    }));
  }

  /**
   * 模拟API延迟
   */
  static async simulateAPICall(
    url: string,
    latency: number = 100,
    status: number = 200
  ): Promise<Response> {
    await this.wait(latency);

    return {
      ok: status >= 200 && status < 300,
      status,
      url,
      headers: new Headers(),
      json: async () => ({ data: 'test' }),
      text: async () => 'test',
    } as Response;
  }

  /**
   * 批量性能测试
   */
  static async runBatchPerformanceTest<T>(
    tests: Array<{
      name: string;
      fn: () => Promise<T> | T;
    }>,
    iterations: number = 10
  ): Promise<Array<{
    name: string;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    results: T[];
  }>> {
    const results = [];

    for (const test of tests) {
      const durations: number[] = [];
      const testResults: T[] = [];

      for (let i = 0; i < iterations; i++) {
        const { duration, result } = await this.measureExecutionTime(
          test.fn,
          `${test.name}-iteration-${i}`
        );
        durations.push(duration);
        testResults.push(result);
      }

      results.push({
        name: test.name,
        averageDuration: durations.reduce((a, b) => a + b) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        results: testResults,
      });
    }

    return results;
  }

  /**
   * 生成性能报告
   */
  static generatePerformanceReport(testName: string, metrics: Record<string, number>) {
    const report = {
      testName,
      timestamp: new Date().toISOString(),
      metrics,
      summary: {
        totalMetrics: Object.keys(metrics).length,
        averageMetric: Object.values(metrics).reduce((a, b) => a + b) / Object.values(metrics).length,
      },
    };

    return report;
  }

  /**
   * 比较性能结果
   */
  static comparePerformanceResults(
    baseline: Record<string, number>,
    current: Record<string, number>,
    threshold: number = 0.1 // 10%阈值
  ): {
    metric: string;
    baseline: number;
    current: number;
    difference: number;
    percentageChange: number;
    regression: boolean;
  }[] {
    const comparisons = [];

    for (const metric in baseline) {
      if (metric in current) {
        const baselineValue = baseline[metric];
        const currentValue = current[metric];
        const difference = currentValue - baselineValue;
        const percentageChange = (difference / baselineValue) * 100;
        const regression = percentageChange > threshold * 100;

        comparisons.push({
          metric,
          baseline: baselineValue,
          current: currentValue,
          difference,
          percentageChange,
          regression,
        });
      }
    }

    return comparisons;
  }
}

/**
 * 性能断言工具
 */
export class PerformanceAssertions {
  /**
   * 断言执行时间在阈值内
   */
  static assertExecutionTime(
    duration: number,
    threshold: number,
    message?: string
  ): void {
    expect(duration).toBeLessThanOrEqual(threshold);
  }

  /**
   * 断言性能回归在可接受范围内
   */
  static assertPerformanceRegression(
    current: number,
    baseline: number,
    threshold: number = 0.1
  ): void {
    const percentageChange = ((current - baseline) / baseline) * 100;
    expect(percentageChange).toBeLessThanOrEqual(threshold * 100);
  }

  /**
   * 断言内存使用在合理范围内
   */
  static assertMemoryUsage(
    usedMemory: number,
    threshold: number
  ): void {
    expect(usedMemory).toBeLessThanOrEqual(threshold);
  }

  /**
   * 断言吞吐量满足要求
   */
  static assertThroughput(
    operations: number,
    duration: number,
    minimumThroughput: number
  ): void {
    const throughput = operations / duration;
    expect(throughput).toBeGreaterThanOrEqual(minimumThroughput);
  }
}
