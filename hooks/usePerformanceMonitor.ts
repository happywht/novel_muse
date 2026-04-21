/**
 * Performance Monitor Hook
 *
 * React Hook for monitoring performance metrics
 *
 * @module hooks/usePerformanceMonitor
 * @author Frontend Performance Engineer
 * @created 2026-04-21
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  performanceMonitor,
  PerformanceReport,
  CoreWebVitals,
} from '@/services/performance/performanceMonitor';

/**
 * Hook选项
 */
export interface UsePerformanceMonitorOptions {
  /** 是否自动启动监控 */
  autoStart?: boolean;
  /** 更新间隔(毫秒) */
  updateInterval?: number;
  /** 是否在组件卸载时停止监控 */
  stopOnUnmount?: boolean;
  /** 性能数据回调 */
  onPerformanceUpdate?: (report: PerformanceReport) => void;
  /** 错误回调 */
  onError?: (error: Error) => void;
}

/**
 * Hook返回值
 */
export interface UsePerformanceMonitorReturn {
  /** 性能报告 */
  report: PerformanceReport | null;
  /** 当前性能快照 */
  vitals: Partial<CoreWebVitals>;
  /** 是否正在监控 */
  isMonitoring: boolean;
  /** 手动启动监控 */
  startMonitoring: () => void;
  /** 停止监控 */
  stopMonitoring: () => void;
  /** 获取最新报告 */
  refreshReport: () => PerformanceReport | null;
  /** 清除数据 */
  clearData: () => void;
}

/**
 * 性能监控Hook
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { report, vitals, isMonitoring } = usePerformanceMonitor({
 *     autoStart: true,
 *     updateInterval: 5000,
 *     onPerformanceUpdate: (report) => {
 *       console.log('性能评分:', report.score.overall);
 *     }
 *   });
 *
 *   return (
 *     <div>
 *       <p>监控状态: {isMonitoring ? '运行中' : '已停止'}</p>
 *       <p>LCP: {vitals.lcp?.toFixed(0)}ms</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePerformanceMonitor(
  options: UsePerformanceMonitorOptions = {}
): UsePerformanceMonitorReturn {
  const {
    autoStart = true,
    updateInterval = 5000,
    stopOnUnmount = true,
    onPerformanceUpdate,
    onError,
  } = options;

  const [report, setReport] = useState<PerformanceReport | null>(null);
  const [vitals, setVitals] = useState<Partial<CoreWebVitals>>({});
  const [isMonitoring, setIsMonitoring] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 启动监控
   */
  const startMonitoring = useCallback(() => {
    try {
      performanceMonitor.startMonitoring();
      setIsMonitoring(true);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to start monitoring');
      onError?.(err);
    }
  }, [onError]);

  /**
   * 停止监控
   */
  const stopMonitoring = useCallback(() => {
    try {
      performanceMonitor.stopMonitoring();
      setIsMonitoring(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to stop monitoring');
      onError?.(err);
    }
  }, [onError]);

  /**
   * 刷新报告
   */
  const refreshReport = useCallback((): PerformanceReport | null => {
    try {
      const newReport = performanceMonitor.generateReport();
      if (newReport) {
        setReport(newReport);
        onPerformanceUpdate?.(newReport);
      }
      return newReport;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to generate report');
      onError?.(err);
      return null;
    }
  }, [onPerformanceUpdate, onError]);

  /**
   * 清除数据
   */
  const clearData = useCallback(() => {
    try {
      performanceMonitor.clear();
      setReport(null);
      setVitals({});
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to clear data');
      onError?.(err);
    }
  }, [onError]);

  /**
   * 更新快照
   */
  const updateSnapshot = useCallback(() => {
    try {
      const snapshot = performanceMonitor.getSnapshot();
      setVitals(snapshot);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to get snapshot');
      onError?.(err);
    }
  }, [onError]);

  // 初始化监控
  useEffect(() => {
    if (autoStart) {
      startMonitoring();
    }

    return () => {
      if (stopOnUnmount) {
        stopMonitoring();
      }
    };
  }, [autoStart, stopOnUnmount, startMonitoring, stopMonitoring]);

  // 定期更新数据
  useEffect(() => {
    if (!isMonitoring) return;

    // 立即更新一次
    updateSnapshot();
    refreshReport();

    // 设置定期更新
    intervalRef.current = setInterval(() => {
      updateSnapshot();
      refreshReport();
    }, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isMonitoring, updateInterval, updateSnapshot, refreshReport]);

  return {
    report,
    vitals,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    refreshReport,
    clearData,
  };
}

/**
 * 性能快照Hook (轻量级)
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const vitals = usePerformanceSnapshot();
 *
 *   return (
 *     <div>
 *       <p>LCP: {vitals.lcp?.toFixed(0)}ms</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePerformanceSnapshot(): Partial<CoreWebVitals> {
  const [vitals, setVitals] = useState<Partial<CoreWebVitals>>({});

  useEffect(() => {
    const updateSnapshot = () => {
      try {
        const snapshot = performanceMonitor.getSnapshot();
        setVitals(snapshot);
      } catch (error) {
        console.warn('[usePerformanceSnapshot] Failed to get snapshot:', error);
      }
    };

    // 初始更新
    updateSnapshot();

    // 定期更新
    const interval = setInterval(updateSnapshot, 1000);

    return () => clearInterval(interval);
  }, []);

  return vitals;
}

/**
 * 性能评分Hook
 *
 * @example
 * ```tsx
 * function PerformanceScore() {
 *   const score = usePerformanceScore();
 *
 *   return (
 *     <div>
 *       <p>总分: {score.overall}</p>
 *       <p>评级: {score.grade}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePerformanceScore() {
  const { report } = usePerformanceMonitor({
    autoStart: true,
    updateInterval: 5000,
  });

  return report?.score || {
    overall: 0,
    lcp: 0,
    fid: 0,
    cls: 0,
    fcp: 0,
    grade: 'poor' as const,
  };
}

// ============================================================================
// 类型导出
// ============================================================================

export type {
  UsePerformanceMonitorOptions,
  UsePerformanceMonitorReturn,
};