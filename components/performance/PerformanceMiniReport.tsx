/**
 * Performance Mini Report Component
 *
 * 轻量级性能报告组件，显示关键性能指标
 *
 * @module components/performance/PerformanceMiniReport
 * @author Frontend Performance Engineer
 * @created 2026-04-21
 */

import React, { useMemo } from 'react';
import { usePerformanceSnapshot } from '@/hooks/usePerformanceMonitor';
import { Clock, Zap, Activity } from 'lucide-react';

/**
 * 组件属性
 */
interface PerformanceMiniReportProps {
  /** 自定义样式类名 */
  className?: string;
  /** 是否显示标签 */
  showLabels?: boolean;
  /** 紧凑模式 */
  compact?: boolean;
}

/**
 * 性能指标指示器
 */
function MetricIndicator({
  value,
  threshold,
  unit = '',
  icon: Icon,
  label,
  compact = false,
}: {
  value: number | undefined;
  threshold: { excellent: number; good: number; poor: number };
  unit?: string;
  icon: React.ElementType;
  label: string;
  compact?: boolean;
}) {
  const getStatus = () => {
    if (!value) return 'unknown';
    if (value <= threshold.excellent) return 'excellent';
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const status = getStatus();
  const statusColors: Record<string, string> = {
    excellent: 'text-green-600 bg-green-50',
    good: 'text-blue-600 bg-blue-50',
    'needs-improvement': 'text-yellow-600 bg-yellow-50',
    poor: 'text-red-600 bg-red-50',
    unknown: 'text-gray-600 bg-gray-50',
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded ${statusColors[status]}`}>
        <Icon className="w-3 h-3" />
        <span className="text-xs font-medium">
          {value ? `${value.toFixed(0)}${unit}` : '--'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-1">
        <Icon className="w-3 h-3" />
        <span>{label}</span>
      </div>
      <div className={`px-3 py-1.5 rounded-lg ${statusColors[status]}`}>
        <span className="text-sm font-bold">
          {value ? `${value.toFixed(0)}${unit}` : '--'}
        </span>
      </div>
    </div>
  );
}

/**
 * 迷你性能报告组件
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <div>
 *       <PerformanceMiniReport
 *         compact={true}
 *         showLabels={false}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function PerformanceMiniReport({
  className = '',
  showLabels = true,
  compact = false,
}: PerformanceMiniReportProps) {
  const vitals = usePerformanceSnapshot();

  const containerClass = useMemo(() => {
    const base = 'performance-mini-report';
    const layout = compact
      ? 'flex items-center gap-2'
      : 'grid grid-cols-3 gap-4';
    return `${base} ${layout} ${className}`.trim();
  }, [compact, className]);

  return (
    <div className={containerClass}>
      <MetricIndicator
        value={vitals.lcp}
        threshold={{ excellent: 2000, good: 2500, poor: 4000 }}
        unit="ms"
        icon={Clock}
        label="LCP"
        compact={compact}
      />
      <MetricIndicator
        value={vitals.fid}
        threshold={{ excellent: 50, good: 100, poor: 300 }}
        unit="ms"
        icon={Zap}
        label="FID"
        compact={compact}
      />
      <MetricIndicator
        value={vitals.cls}
        threshold={{ excellent: 0.05, good: 0.1, poor: 0.25 }}
        unit=""
        icon={Activity}
        label="CLS"
        compact={compact}
      />
    </div>
  );
}

/**
 * 性能评分徽章组件
 */
export function PerformanceScoreBadge() {
  const { report } = usePerformanceMonitor({ autoStart: true, updateInterval: 5000 });

  if (!report) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 text-sm font-medium">
        <Activity className="w-4 h-4" />
        <span>加载中...</span>
      </div>
    );
  }

  const gradeColors: Record<string, string> = {
    excellent: 'bg-green-500',
    good: 'bg-blue-500',
    'needs-improvement': 'bg-yellow-500',
    poor: 'bg-red-500',
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium ${gradeColors[report.score.grade]}`}>
      <Activity className="w-4 h-4" />
      <span>{report.score.overall}分</span>
    </div>
  );
}

/**
 * 性能进度条组件
 */
export function PerformanceProgressBar({
  metric,
  value,
  threshold,
  className = '',
}: {
  metric: string;
  value: number | undefined;
  threshold: { excellent: number; good: number; poor: number };
  className?: string;
}) {
  const getStatus = () => {
    if (!value) return 'unknown';
    if (value <= threshold.excellent) return 'excellent';
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  };

  const status = getStatus();
  const progress = value ? Math.min(100, (value / threshold.poor) * 100) : 0;

  const statusColors: Record<string, string> = {
    excellent: 'bg-green-500',
    good: 'bg-blue-500',
    'needs-improvement': 'bg-yellow-500',
    poor: 'bg-red-500',
    unknown: 'bg-gray-300',
  };

  return (
    <div className={`performance-progress-bar ${className}`}>
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span className="font-medium">{metric}</span>
        <span>{value ? `${value.toFixed(0)}ms` : '--'}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${statusColors[status]}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * 导出组件
 */
export default PerformanceMiniReport;