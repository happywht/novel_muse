/**
 * Performance Dashboard Component
 *
 * 性能监控仪表板组件，实时显示Core Web Vitals和性能评分
 *
 * @module components/performance/PerformanceDashboard
 * @author Frontend Performance Engineer
 * @created 2026-04-21
 */

import React, { useMemo } from 'react';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import { Activity, Zap, AlertCircle, CheckCircle, Clock } from 'lucide-react';

/**
 * 组件属性
 */
interface PerformanceDashboardProps {
  /** 是否自动开始监控 */
  autoStart?: boolean;
  /** 更新间隔(毫秒) */
  updateInterval?: number;
  /** 是否显示详细指标 */
  showDetails?: boolean;
  /** 是否显示资源列表 */
  showResources?: boolean;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 性能评分徽章组件
 */
function PerformanceGradeBadge({ grade }: { grade: string }) {
  const gradeConfig: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
    excellent: {
      color: 'bg-green-500',
      label: '优秀',
      icon: <CheckCircle className="w-4 h-4" />,
    },
    good: {
      color: 'bg-blue-500',
      label: '良好',
      icon: <CheckCircle className="w-4 h-4" />,
    },
    'needs-improvement': {
      color: 'bg-yellow-500',
      label: '需改进',
      icon: <AlertCircle className="w-4 h-4" />,
    },
    poor: {
      color: 'bg-red-500',
      label: '较差',
      icon: <AlertCircle className="w-4 h-4" />,
    },
  };

  const config = gradeConfig[grade] || gradeConfig.poor;

  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-sm font-medium ${config.color}`}>
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
}

/**
 * 性能指标卡片组件
 */
function MetricCard({
  label,
  value,
  unit,
  threshold,
  icon: Icon,
}: {
  label: string;
  value: number;
  unit: string;
  threshold: { excellent: number; good: number; poor: number };
  icon: React.ElementType;
}) {
  const getStatus = () => {
    if (value <= threshold.excellent) return 'excellent';
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const status = getStatus();
  const statusColors: Record<string, string> = {
    excellent: 'text-green-600',
    good: 'text-blue-600',
    'needs-improvement': 'text-yellow-600',
    poor: 'text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-gray-600">
          <Icon className="w-4 h-4" />
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className={`text-lg font-bold ${statusColors[status]}`}>
          {value.toFixed(0)}
          {unit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            status === 'excellent' ? 'bg-green-500' :
            status === 'good' ? 'bg-blue-500' :
            status === 'needs-improvement' ? 'bg-yellow-500' :
            'bg-red-500'
          }`}
          style={{
            width: `${Math.min(100, (value / threshold.poor) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * 性能仪表板组件
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <div>
 *       <PerformanceDashboard
 *         autoStart={true}
 *         updateInterval={5000}
 *         showDetails={true}
 *         showResources={true}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function PerformanceDashboard({
  autoStart = true,
  updateInterval = 5000,
  showDetails = false,
  showResources = false,
  className = '',
}: PerformanceDashboardProps) {
  const { report, vitals, isMonitoring, startMonitoring, stopMonitoring, clearData } = usePerformanceMonitor({
    autoStart,
    updateInterval,
  });

  // 计算平均资源加载时间
  const avgResourceTime = useMemo(() => {
    if (!report?.resources.length) return 0;
    const totalTime = report.resources.reduce((sum, r) => sum + r.duration, 0);
    return totalTime / report.resources.length;
  }, [report]);

  // 慢速资源数量
  const slowResourcesCount = useMemo(() => {
    if (!report?.resources.length) return 0;
    return report.resources.filter(r => r.duration > 1000).length;
  }, [report]);

  return (
    <div className={`performance-dashboard ${className}`}>
      <div className="space-y-6">
        {/* 标题和控制区 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">性能监控仪表板</h2>
            {isMonitoring && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                监控中
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {!isMonitoring ? (
              <button
                onClick={startMonitoring}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                开始监控
              </button>
            ) : (
              <button
                onClick={stopMonitoring}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                停止监控
              </button>
            )}
            <button
              onClick={clearData}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              清除数据
            </button>
          </div>
        </div>

        {/* 性能评分总览 */}
        {report && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">性能评分</h3>
                <p className="text-sm text-gray-600">基于Core Web Vitals综合评分</p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold text-blue-600">{report.score.overall}</div>
                <PerformanceGradeBadge grade={report.score.grade} />
              </div>
            </div>

            {/* 核心指标 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="LCP (最大内容绘制)"
                value={report.vitals.lcp}
                unit="ms"
                threshold={{ excellent: 2000, good: 2500, poor: 4000 }}
                icon={Clock}
              />
              <MetricCard
                label="FID (首次输入延迟)"
                value={report.vitals.fid}
                unit="ms"
                threshold={{ excellent: 50, good: 100, poor: 300 }}
                icon={Zap}
              />
              <MetricCard
                label="CLS (累积布局偏移)"
                value={report.vitals.cls}
                unit=""
                threshold={{ excellent: 0.05, good: 0.1, poor: 0.25 }}
                icon={Activity}
              />
              <MetricCard
                label="FCP (首次内容绘制)"
                value={report.vitals.fcp}
                unit="ms"
                threshold={{ excellent: 1000, good: 1800, poor: 3000 }}
                icon={Clock}
              />
            </div>
          </div>
        )}

        {/* 详细指标 */}
        {showDetails && report && (
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">详细性能指标</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 导航性能 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">页面加载</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">DNS查询</span>
                    <span className="font-medium">{report.navigation.dnsLookup.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">TCP连接</span>
                    <span className="font-medium">{report.navigation.tcpConnection.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">TTFB</span>
                    <span className="font-medium">{report.vitals.ttfb.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">DOM解析</span>
                    <span className="font-medium">{report.navigation.domParsing.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-600">总加载时间</span>
                    <span className="font-bold text-blue-600">{report.navigation.totalLoadTime.toFixed(0)}ms</span>
                  </div>
                </div>
              </div>

              {/* JavaScript性能 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">JavaScript执行</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">长任务数量</span>
                    <span className="font-medium">{report.jsPerformance.longTasks.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">总任务时间</span>
                    <span className="font-medium">{report.jsPerformance.totalTaskTime.toFixed(0)}ms</span>
                  </div>
                  {report.jsPerformance.memoryUsage && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">内存使用</span>
                        <span className="font-medium">
                          {(report.jsPerformance.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">内存限制</span>
                        <span className="font-medium">
                          {(report.jsPerformance.memoryUsage.jsHeapSizeLimit / 1024 / 1024).toFixed(0)}MB
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 资源加载概览 */}
            <div className="mt-6 pt-6 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">资源加载</h4>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-900">{report.resources.length}</div>
                  <div className="text-xs text-gray-600">总资源数</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-900">{avgResourceTime.toFixed(0)}ms</div>
                  <div className="text-xs text-gray-600">平均加载时间</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-900">{slowResourcesCount}</div>
                  <div className="text-xs text-gray-600">慢速资源</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 优化建议 */}
        {report && report.recommendations.length > 0 && (
          <div className="bg-yellow-50 rounded-xl p-6 border border-yellow-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              优化建议
            </h3>
            <ul className="space-y-2">
              {report.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-yellow-600 mt-0.5">•</span>
                  <span>{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 暂无数据状态 */}
        {!report && (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">暂无性能数据</p>
            <p className="text-gray-500 text-sm mt-1">点击"开始监控"按钮开始收集性能数据</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 导出组件
 */
export default PerformanceDashboard;