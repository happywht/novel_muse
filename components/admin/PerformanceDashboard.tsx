/**
 * 性能监控仪表板组件
 *
 * 提供实时的性能监控数据展示和分析功能
 */

import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ============================================================
// 类型定义
// ============================================================

interface PerformanceOverview {
  timestamp: number;
  api: {
    totalRequests: number;
    totalErrors: number;
    avgResponseTime: number;
    errorRate: number;
    activeRequests: number;
    endpointsCount: number;
  };
  database: {
    totalQueries: number;
    avgQueryDuration: number;
    slowQueries: number;
  };
  system: {
    cpuUsage: number;
    memoryUsage: number;
    memoryPercentage: number;
    uptime: number;
    loadAverage: number[];
  };
  alerts: {
    activeCount: number;
    recent: Array<{
      id: string;
      type: string;
      severity: string;
      message: string;
      timestamp: number;
    }>;
  };
}

interface EndpointStats {
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
}

interface SlowQuery {
  query: string;
  duration: number;
  timestamp: number;
  count: number;
  avgDuration: number;
  suggestion?: string;
}

// ============================================================
// 组件
// ============================================================

export const PerformanceDashboard: React.FC = () => {
  const [overview, setOverview] = useState<PerformanceOverview | null>(null);
  const [endpointStats, setEndpointStats] = useState<Record<string, EndpointStats>>({});
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'api' | 'database' | 'system' | 'alerts'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 获取性能概览数据
  const fetchOverview = async () => {
    try {
      const response = await fetch('/api/performance/overview');
      const data = await response.json();
      if (data.success) {
        setOverview(data.data);
      }
    } catch (error) {
      console.error('获取性能概览失败:', error);
    }
  };

  // 获取 API 统计数据
  const fetchApiStats = async () => {
    try {
      const response = await fetch('/api/performance/api/stats');
      const data = await response.json();
      if (data.success) {
        setEndpointStats(data.data.endpoints);
      }
    } catch (error) {
      console.error('获取 API 统计失败:', error);
    }
  };

  // 获取慢查询数据
  const fetchSlowQueries = async () => {
    try {
      const response = await fetch('/api/performance/database/slow-queries?limit=10');
      const data = await response.json();
      if (data.success) {
        setSlowQueries(data.data.queries);
      }
    } catch (error) {
      console.error('获取慢查询失败:', error);
    }
  };

  // 初始化数据加载
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchOverview(),
        fetchApiStats(),
        fetchSlowQueries()
      ]);
      setLoading(false);
    };

    loadData();

    // 自动刷新
    if (autoRefresh) {
      const interval = setInterval(loadData, 5000); // 每5秒刷新
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // 格式化数字
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('zh-CN').format(num);
  };

  // 格式化百分比
  const formatPercentage = (num: number): string => {
    return `${(num * 100).toFixed(2)}%`;
  };

  // 格式化持续时间
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  // 颜色映射
  const getStatusColor = (value: number, threshold: number): string => {
    if (value > threshold * 1.5) return '#ef4444'; // red
    if (value > threshold) return '#f59e0b'; // orange
    return '#10b981'; // green
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  // 渲染概览标签页
  const renderOverviewTab = () => {
    if (!overview) return <div>加载中...</div>;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* API 统计卡片 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">API 性能</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>总请求数:</span>
              <span className="font-mono">{formatNumber(overview.api.totalRequests)}</span>
            </div>
            <div className="flex justify-between">
              <span>平均响应时间:</span>
              <span className="font-mono">{formatDuration(overview.api.avgResponseTime)}</span>
            </div>
            <div className="flex justify-between">
              <span>错误率:</span>
              <span
                className="font-mono"
                style={{ color: getStatusColor(overview.api.errorRate, 0.05) }}
              >
                {formatPercentage(overview.api.errorRate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>活动请求:</span>
              <span className="font-mono">{overview.api.activeRequests}</span>
            </div>
          </div>
        </div>

        {/* 数据库统计卡片 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">数据库性能</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>总查询数:</span>
              <span className="font-mono">{formatNumber(overview.database.totalQueries)}</span>
            </div>
            <div className="flex justify-between">
              <span>平均查询时间:</span>
              <span className="font-mono">{formatDuration(overview.database.avgQueryDuration)}</span>
            </div>
            <div className="flex justify-between">
              <span>慢查询:</span>
              <span
                className="font-mono"
                style={{ color: overview.database.slowQueries > 0 ? '#f59e0b' : '#10b981' }}
              >
                {overview.database.slowQueries}
              </span>
            </div>
          </div>
        </div>

        {/* 系统资源卡片 */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">系统资源</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>CPU 使用率:</span>
              <span
                className="font-mono"
                style={{ color: getStatusColor(overview.system.cpuUsage, 0.8) }}
              >
                {formatPercentage(overview.system.cpuUsage)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>内存使用:</span>
              <span
                className="font-mono"
                style={{ color: getStatusColor(overview.system.memoryPercentage, 0.8) }}
              >
                {overview.system.memoryUsage.toFixed(0)} MB ({formatPercentage(overview.system.memoryPercentage)})
              </span>
            </div>
            <div className="flex justify-between">
              <span>系统运行时间:</span>
              <span className="font-mono">{formatDuration(overview.system.uptime * 1000)}</span>
            </div>
          </div>
        </div>

        {/* 告警卡片 */}
        {overview.alerts.activeCount > 0 && (
          <div className="bg-white p-6 rounded-lg shadow md:col-span-2 lg:col-span-3">
            <h3 className="text-lg font-semibold mb-4">活跃告警 ({overview.alerts.activeCount})</h3>
            <div className="space-y-2">
              {overview.alerts.recent.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start space-x-2 p-2 bg-gray-50 rounded"
                  style={{ borderLeft: `4px solid ${getSeverityColor(alert.severity)}` }}
                >
                  <div className="flex-1">
                    <div className="font-medium">{alert.message}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(alert.timestamp).toLocaleString('zh-CN')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 渲染 API 标签页
  const renderApiTab = () => {
    const endpointData = Object.entries(endpointStats).map(([endpoint, stats]) => ({
      endpoint: endpoint.length > 30 ? endpoint.substring(0, 30) + '...' : endpoint,
      fullEndpoint: endpoint,
      count: stats.count,
      avgDuration: stats.avgDuration.toFixed(0),
      p95: stats.p95.toFixed(0),
      errorRate: (stats.errorRate * 100).toFixed(2)
    }));

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">端点性能统计</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">端点</th>
                  <th className="px-4 py-2 text-right">请求数</th>
                  <th className="px-4 py-2 text-right">平均响应时间</th>
                  <th className="px-4 py-2 text-right">P95 响应时间</th>
                  <th className="px-4 py-2 text-right">错误率</th>
                </tr>
              </thead>
              <tbody>
                {endpointData.map((item) => (
                  <tr key={item.fullEndpoint} className="border-t">
                    <td className="px-4 py-2" title={item.fullEndpoint}>{item.endpoint}</td>
                    <td className="px-4 py-2 text-right font-mono">{formatNumber(item.count)}</td>
                    <td className="px-4 py-2 text-right font-mono">{item.avgDuration}ms</td>
                    <td className="px-4 py-2 text-right font-mono">{item.p95}ms</td>
                    <td className="px-4 py-2 text-right font-mono">{item.errorRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // 渲染数据库标签页
  const renderDatabaseTab = () => {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">慢查询 Top 10</h3>
          <div className="space-y-4">
            {slowQueries.map((query, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-mono text-sm bg-gray-200 p-2 rounded flex-1 mr-4">
                    {query.query}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-600">{query.avgDuration.toFixed(0)}ms</div>
                    <div className="text-sm text-gray-600">{query.count} 次执行</div>
                  </div>
                </div>
                {query.suggestion && (
                  <div className="text-sm text-blue-600 mt-2">
                    💡 {query.suggestion}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载性能数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 头部 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">性能监控仪表板</h1>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="form-checkbox"
            />
            <span>自动刷新</span>
          </label>
          <button
            onClick={() => {
              fetchOverview();
              fetchApiStats();
              fetchSlowQueries();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            手动刷新
          </button>
        </div>
      </div>

      {/* 标签页导航 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: '概览' },
            { key: 'api', label: 'API 性能' },
            { key: 'database', label: '数据库' },
            { key: 'system', label: '系统' },
            { key: 'alerts', label: '告警' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`${
                selectedTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 内容区域 */}
      <div className="min-h-screen">
        {selectedTab === 'overview' && renderOverviewTab()}
        {selectedTab === 'api' && renderApiTab()}
        {selectedTab === 'database' && renderDatabaseTab()}
        {selectedTab === 'system' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600">系统监控功能开发中...</p>
          </div>
        )}
        {selectedTab === 'alerts' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600">告警管理功能开发中...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceDashboard;
