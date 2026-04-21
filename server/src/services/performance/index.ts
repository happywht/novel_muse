/**
 * Performance Services Index
 *
 * 导出所有性能监控相关的服务
 */

export { PerformanceMonitor, getGlobalMonitor, destroyGlobalMonitor } from './monitor';
export { DatabaseMonitor, getGlobalDatabaseMonitor, destroyGlobalDatabaseMonitor } from './databaseMonitor';
export { SystemMonitor, getGlobalSystemMonitor, destroyGlobalSystemMonitor } from './systemMonitor';
export { PerformanceOptimizer, getGlobalOptimizer } from './optimizer';

// 类型导出
export type {
  PerformanceMetric,
  PerformanceStats,
  PerformanceAlert,
  PerformanceReport,
  PerformanceConfig
} from './monitor';

export type {
  QueryPerformanceData,
  SlowQueryLog,
  IndexRecommendation,
  DatabasePerformanceReport,
  DatabaseMonitorConfig
} from './databaseMonitor';

export type {
  SystemMetrics,
  ProcessMetrics,
  SystemPerformanceReport,
  SystemMonitorConfig
} from './systemMonitor';

export type {
  QueryOptimizationResult,
  CacheOptimizationResult,
  ConnectionPoolConfig
} from './optimizer';
