/**
 * Performance Components Index
 *
 * 性能监控和优化相关组件统一导出
 *
 * @module components/performance
 * @author Frontend Performance Engineer
 * @created 2026-04-21
 */

// 主要组件
export { PerformanceDashboard } from './PerformanceDashboard';
export { PerformanceMiniReport, PerformanceScoreBadge, PerformanceProgressBar } from './PerformanceMiniReport';
export { PerformanceCharts } from './PerformanceCharts';

// 图表组件
export {
  PerformanceTrendChart,
  PerformanceScoreTrend,
  ResourceLoadingChart,
  ResourceTypeDistribution,
  PageLoadBreakdown,
} from './PerformanceCharts';

// 默认导出
export { default as PerformanceMonitorDashboard } from './PerformanceDashboard';
export { default as PerformanceMiniReport as PerformanceMonitorMiniReport } from './PerformanceMiniReport';
export { default as PerformanceMonitorCharts } from './PerformanceCharts';