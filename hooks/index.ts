/**
 * Performance Hooks Index
 *
 * 性能监控和优化相关React Hooks统一导出
 *
 * @module hooks/performance
 * @author Frontend Performance Engineer
 * @created 2026-04-21
 */

// 性能监控Hooks
export {
  usePerformanceMonitor,
  usePerformanceSnapshot,
  usePerformanceScore,
} from './usePerformanceMonitor';

export type {
  UsePerformanceMonitorOptions,
  UsePerformanceMonitorReturn,
} from './usePerformanceMonitor';

// 性能优化Hooks
export {
  useLazyLoad,
  usePreload,
  useOptimizedImage,
  useDebounce,
  useThrottle,
  usePerformanceMeasurement,
  useBatchUpdate,
  useMemoryUsage,
} from './usePerformanceOptimization';

export type {
  UseLazyLoadOptions,
  UseLazyLoadReturn,
  UsePreloadReturn,
  UseOptimizedImageOptions,
} from './usePerformanceOptimization';

// 重新导出为更简洁的命名
export { usePerformanceMeasurement as useMeasurePerformance };
export { useLazyLoad as useLazyLoadComponent };
export { usePreload as useResourcePreload };