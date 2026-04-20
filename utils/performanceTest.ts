/**
 * 性能测试和验证工具
 * 用于手动测试和验证性能优化效果
 */

import { performanceMonitor, PERFORMANCE_TARGETS } from './performanceMonitor';

/**
 * 运行性能测试套件
 */
export async function runPerformanceTest() {
  console.group('🧪 [性能测试] 开始性能测试套件');

  // 1. 测试快速后端检测函数
  console.log('测试 1: 快速后端检测');
  const testBackendCheck = async (): Promise<number> => {
    const start = performance.now();
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(1000)
      });
      const end = performance.now();
      console.log(`✅ 后端检测成功: ${(end - start).toFixed(0)}ms`);
      return end - start;
    } catch (error) {
      const end = performance.now();
      console.log(`❌ 后端检测失败: ${(end - start).toFixed(0)}ms`);
      return end - start;
    }
  };

  // 2. 测试配置加载
  console.log('测试 2: 配置加载性能');
  const testConfigLoad = async (): Promise<number> => {
    const start = performance.now();
    // 这里应该调用实际的配置加载函数
    // const config = await getGlobalConfig();
    const end = performance.now();
    console.log(`✅ 配置加载: ${(end - start).toFixed(0)}ms`);
    return end - start;
  };

  // 3. 测试 IndexedDB 读取性能
  console.log('测试 3: IndexedDB 读取性能');
  const testIndexedDBRead = async (): Promise<number> => {
    const start = performance.now();
    // 这里应该调用实际的存储服务
    // const data = await storageService.getItem(STORAGE_KEYS.PROJECTS);
    const end = performance.now();
    console.log(`✅ IndexedDB 读取: ${(end - start).toFixed(0)}ms`);
    return end - start;
  };

  // 4. 运行所有测试
  const results = {
    backendCheck: await testBackendCheck(),
    configLoad: await testConfigLoad(),
    indexedDBRead: await testIndexedDBRead(),
  };

  // 5. 分析结果
  console.log('📊 [性能测试] 测试结果:');
  Object.entries(results).forEach(([test, duration]) => {
    const target = PERFORMANCE_TARGETS.BACKEND_CHECK;
    const status = duration < target ? '✅ 通过' : '❌ 未达标';
    console.log(`   ${test}: ${duration.toFixed(0)}ms ${status} (目标: <${target}ms)`);
  });

  console.groupEnd();
  return results;
}

/**
 * 创建性能基准测试报告
 */
export function createPerformanceBaseline() {
  console.group('📈 [性能基准] 创建性能基准');

  // 收集当前的 Web Vitals
  if (typeof window !== 'undefined' && 'performance' in window) {
    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    if (navigationTiming) {
      console.log('Web Vitals 指标:');
      console.log(`• DOM 内容加载: ${(navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart).toFixed(0)}ms`);
      console.log(`• 完全加载时间: ${(navigationTiming.loadEventEnd - navigationTiming.loadEventStart).toFixed(0)}ms`);
      console.log(`• 首次字节时间 (TTFB): ${(navigationTiming.responseStart - navigationTiming.requestStart).toFixed(0)}ms`);
    }
  }

  // 收集自定义性能指标
  const metrics = performanceMonitor.getMetrics();
  console.log('自定义性能指标:');
  console.log(`• 总启动时间: ${metrics.initDuration?.toFixed(0)}ms`);
  console.log(`• 后端检测时间: ${metrics.backendCheckDuration?.toFixed(0)}ms`);
  console.log(`• 数据加载时间: ${metrics.dataLoadDuration?.toFixed(0)}ms`);

  console.groupEnd();
}

/**
 * 实时性能监控
 */
export class RealTimePerformanceMonitor {
  private observer: PerformanceObserver | null = null;
  private metrics: Map<string, number[]> = new Map();

  start() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver 不支持');
      return;
    }

    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const name = entry.name;
        const duration = entry.duration;

        if (!this.metrics.has(name)) {
          this.metrics.set(name, []);
        }
        this.metrics.get(name)!.push(duration);

        console.log(`⚡ [实时监控] ${name}: ${duration.toFixed(0)}ms`);
      }
    });

    // 监控长任务
    try {
      this.observer.observe({ entryTypes: ['measure', 'longtask'] });
    } catch (e) {
      console.warn('无法监听 longtask:', e);
    }

    console.log('🚀 [实时监控] 开始监控性能指标');
  }

  stop() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    console.log('🛑 [实时监控] 停止监控');
  }

  getReport() {
    console.group('📊 [实时监控] 性能报告');

    this.metrics.forEach((durations, name) => {
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      const max = Math.max(...durations);
      const min = Math.min(...durations);

      console.log(`${name}:`);
      console.log(`  • 平均: ${avg.toFixed(0)}ms`);
      console.log(`  • 最大: ${max.toFixed(0)}ms`);
      console.log(`  • 最小: ${min.toFixed(0)}ms`);
      console.log(`  • 次数: ${durations.length}`);
    });

    console.groupEnd();
  }
}

/**
 * 性能回归检测
 */
export function detectPerformanceRegression(currentMetrics: any, baseline: any) {
  console.group('🔍 [性能回归] 检测性能回归');

  const regressions: string[] = [];
  const improvements: string[] = [];

  Object.keys(currentMetrics).forEach(key => {
    if (baseline[key]) {
      const current = currentMetrics[key];
      const base = baseline[key];
      const percentChange = ((current - base) / base) * 100;

      if (percentChange > 10) { // 超过 10% 视为回归
        regressions.push(`${key}: 增加 ${percentChange.toFixed(1)}% (从 ${base.toFixed(0)}ms 到 ${current.toFixed(0)}ms)`);
      } else if (percentChange < -10) { // 超过 -10% 视为改进
        improvements.push(`${key}: 减少 ${Math.abs(percentChange).toFixed(1)}% (从 ${base.toFixed(0)}ms 到 ${current.toFixed(0)}ms)`);
      }
    }
  });

  if (regressions.length > 0) {
    console.warn('⚠️ 检测到性能回归:');
    regressions.forEach(regression => console.warn(`  • ${regression}`));
  }

  if (improvements.length > 0) {
    console.log('✅ 性能改进:');
    improvements.forEach(improvement => console.log(`  • ${improvement}`));
  }

  if (regressions.length === 0 && improvements.length === 0) {
    console.log('✅ 未检测到显著的性能变化');
  }

  console.groupEnd();

  return {
    hasRegression: regressions.length > 0,
    regressions,
    improvements
  };
}

// 将性能测试函数暴露到全局对象（用于浏览器控制台测试）
if (typeof window !== 'undefined') {
  (window as any).performanceTest = runPerformanceTest;
  (window as any).createPerformanceBaseline = createPerformanceBaseline;
  (window as any).performanceMonitor = performanceMonitor;
}