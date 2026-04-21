/**
 * Performance Charts Component
 *
 * 性能数据可视化图表组件
 *
 * @module components/performance/PerformanceCharts
 * @author Frontend Performance Engineer
 * @created 2026-04-21
 */

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';
import type { PerformanceReport } from '@/services/performance/performanceMonitor';

/**
 * 组件属性
 */
interface PerformanceChartsProps {
  /** 历史数据数量 */
  historySize?: number;
  /** 更新间隔(毫秒) */
  updateInterval?: number;
  /** 自定义样式类名 */
  className?: string;
}

/**
 * 性能趋势图表组件
 */
export function PerformanceTrendChart({
  history,
  className = '',
}: {
  history: PerformanceReport[];
  className?: string;
}) {
  const chartData = history.map((report, index) => ({
    time: new Date(report.timestamp).toLocaleTimeString(),
    LCP: Math.round(report.vitals.lcp),
    FID: Math.round(report.vitals.fid),
    CLS: Math.round(report.vitals.cls * 100) / 100,
    FCP: Math.round(report.vitals.fcp),
    评分: report.score.overall,
  }));

  return (
    <div className={`performance-trend-chart ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Core Web Vitals 趋势</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="LCP" stroke="#8884d8" name="LCP (ms)" />
          <Line type="monotone" dataKey="FCP" stroke="#82ca9d" name="FCP (ms)" />
          <Line type="monotone" dataKey="FID" stroke="#ffc658" name="FID (ms)" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 性能评分趋势图表组件
 */
export function PerformanceScoreTrend({
  history,
  className = '',
}: {
  history: PerformanceReport[];
  className?: string;
}) {
  const chartData = history.map((report, index) => ({
    time: new Date(report.timestamp).toLocaleTimeString(),
    总分: report.score.overall,
    LCP: report.score.lcp,
    FID: report.score.fid,
    CLS: report.score.cls,
    FCP: report.score.fcp,
  }));

  return (
    <div className={`performance-score-trend ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">性能评分趋势</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="总分" stroke="#8884d8" strokeWidth={3} />
          <Line type="monotone" dataKey="LCP" stroke="#82ca9d" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="FID" stroke="#ffc658" strokeDasharray="5 5" />
          <Line type="monotone" dataKey="CLS" stroke="#ff7300" strokeDasharray="5 5" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 资源加载时间分布图表组件
 */
export function ResourceLoadingChart({
  report,
  className = '',
}: {
  report: PerformanceReport;
  className?: string;
}) {
  const chartData = report.resources
    .reduce((acc, resource) => {
      const existing = acc.find(item => item.type === resource.type);
      if (existing) {
        existing.count += 1;
        existing.totalTime += resource.duration;
        existing.avgTime = existing.totalTime / existing.count;
      } else {
        acc.push({
          type: resource.type,
          count: 1,
          totalTime: resource.duration,
          avgTime: resource.duration,
        });
      }
      return acc;
    }, [] as Array<{ type: string; count: number; totalTime: number; avgTime: number }>)
    .sort((a, b) => b.totalTime - a.totalTime)
    .slice(0, 10);

  return (
    <div className={`resource-loading-chart ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">资源加载时间分布</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="type" type="category" width={100} />
          <Tooltip />
          <Legend />
          <Bar dataKey="totalTime" fill="#8884d8" name="总加载时间 (ms)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 资源类型分布饼图组件
 */
export function ResourceTypeDistribution({
  report,
  className = '',
}: {
  report: PerformanceReport;
  className?: string;
}) {
  const chartData = report.resources.reduce((acc, resource) => {
    const existing = acc.find(item => item.name === resource.type);
    if (existing) {
      existing.value += 1;
      existing.size += resource.size;
    } else {
      acc.push({
        name: resource.type,
        value: 1,
        size: resource.size,
      });
    }
    return acc;
  }, [] as Array<{ name: string; value: number; size: number }>);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  return (
    <div className={`resource-type-distribution ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">资源类型分布</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 页面加载时间分解图表组件
 */
export function PageLoadBreakdown({
  report,
  className = '',
}: {
  report: PerformanceReport;
  className?: string;
}) {
  const chartData = [
    {
      name: 'DNS查询',
      时间: Math.round(report.navigation.dnsLookup),
    },
    {
      name: 'TCP连接',
      时间: Math.round(report.navigation.tcpConnection),
    },
    {
      name: 'TTFB',
      时间: Math.round(report.vitals.ttfb),
    },
    {
      name: 'DOM解析',
      时间: Math.round(report.navigation.domParsing),
    },
    {
      name: '资源加载',
      时间: Math.round(report.navigation.resourceLoading),
    },
  ];

  return (
    <div className={`page-load-breakdown ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">页面加载时间分解</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="时间" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * 性能图表主组件
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <div>
 *       <PerformanceCharts
 *         historySize={20}
 *         updateInterval={5000}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function PerformanceCharts({
  historySize = 20,
  updateInterval = 5000,
  className = '',
}: PerformanceChartsProps) {
  const { report } = usePerformanceMonitor({
    autoStart: true,
    updateInterval,
  });

  const [history, setHistory] = useState<PerformanceReport[]>([]);

  useEffect(() => {
    if (report) {
      setHistory(prev => {
        const newHistory = [...prev, report];
        return newHistory.slice(-historySize);
      });
    }
  }, [report, historySize]);

  if (!report) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
        <p className="text-gray-600 font-medium">等待性能数据...</p>
      </div>
    );
  }

  return (
    <div className={`performance-charts ${className}`}>
      <div className="space-y-6">
        {/* 趋势图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <PerformanceTrendChart history={history} />
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <PerformanceScoreTrend history={history} />
          </div>
        </div>

        {/* 资源分析 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <ResourceLoadingChart report={report} />
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <ResourceTypeDistribution report={report} />
          </div>
        </div>

        {/* 页面加载分解 */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <PageLoadBreakdown report={report} />
        </div>
      </div>
    </div>
  );
}

/**
 * 导出组件
 */
export default PerformanceCharts;