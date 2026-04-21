/**
 * Performance Services Index
 *
 * 性能监控和优化服务统一导出
 *
 * @module services/performance
 * @author Frontend Performance Engineer
 * @created 2026-04-21
 */

// 性能监控服务
export {
  performanceMonitor,
  initPerformanceMonitoring,
  getPerformanceReport,
  stopPerformanceMonitoring,
} from './performanceMonitor';

export type {
  CoreWebVitals,
  ResourcePerformance,
  NavigationPerformance,
  JSPerformance,
  PerformanceReport,
  PerformanceScore,
  PerformanceGrade,
  PerformanceThresholds,
} from './performanceMonitor';

// 性能优化服务
export {
  performanceOptimizer,
  initPerformanceOptimizer,
  preloadResource,
  optimizeImageUrl,
  measurePerformance,
  debounce,
  throttle,
} from './performanceOptimizer';

export type {
  CodeSplittingStrategy,
  ResourceOptimizationOptions,
  OptimizationConfig,
  LazyLoadOptions,
  PreloadResult,
} from './performanceOptimizer';

// 重新导出常用类型
export type {
  PreloadResult as ResourcePreloadResult,
  ResourceOptimizationOptions as ImageOptimizationOptions,
};