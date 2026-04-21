/**
 * Performance Monitoring Usage Example
 *
 * 性能监控系统使用示例
 *
 * @example
 * ```tsx
 * import { PerformanceMonitoringExample } from '@/examples/PerformanceMonitoringExample';
 *
 * function App() {
 *   return <PerformanceMonitoringExample />;
 * }
 * ```
 *
 * @author Frontend Performance Engineer
 * @created 2026-04-21
 */

import React, { useEffect, useState } from 'react';
import {
  PerformanceDashboard,
  PerformanceMiniReport,
  PerformanceScoreBadge,
  PerformanceCharts,
} from '@/components/performance';
import {
  usePerformanceMonitor,
  useLazyLoad,
  useOptimizedImage,
  useDebounce,
  useThrottle,
  useMemoryUsage,
} from '@/hooks';
import {
  initPerformanceMonitoring,
  initPerformanceOptimizer,
  preloadResource,
  optimizeImageUrl,
  measurePerformance,
  debounce,
  throttle,
} from '@/services/performance';

/**
 * 完整性能监控示例
 */
export function PerformanceMonitoringExample() {
  const [showDashboard, setShowDashboard] = useState(true);
  const [showCharts, setShowCharts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);

  // 性能监控Hook示例
  const { report, vitals, isMonitoring } = usePerformanceMonitor({
    autoStart: true,
    updateInterval: 5000,
    onPerformanceUpdate: (report) => {
      console.log('性能更新:', {
        评分: report.score.overall,
        LCP: report.vitals.lcp,
        FID: report.vitals.fid,
        CLS: report.vitals.cls,
      });
    },
  });

  // 内存使用监控
  const memoryUsage = useMemoryUsage(1000);

  // 初始化性能优化
  useEffect(() => {
    initPerformanceOptimizer({
      resources: {
        lazyImages: true,
        enableWebP: true,
        quality: 85,
      },
    });
  }, []);

  // 预加载重要资源
  useEffect(() => {
    const preloadResources = async () => {
      const results = await Promise.all([
        preloadResource('/api/config', 'high'),
        preloadResource('/fonts/main-font.woff2', 'high'),
      ]);

      console.log('预加载结果:', results);
    };

    preloadResources();
  }, []);

  // 搜索功能示例
  useEffect(() => {
    if (debouncedSearch) {
      console.log('执行搜索:', debouncedSearch);
      // 实际搜索逻辑
      performSearch(debouncedSearch);
    }
  }, [debouncedSearch]);

  const performSearch = (query: string) => {
    return measurePerformance('search-operation', () => {
      // 模拟搜索操作
      const results = [];
      // 搜索逻辑...
      return results;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 标题和导航 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                性能监控示例
              </h1>
              <p className="text-gray-600">
                演示前端性能监控和优化系统的功能
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* 性能评分徽章 */}
              <PerformanceScoreBadge />

              {/* 迷你性能报告 */}
              <PerformanceMiniReport
                compact={true}
                showLabels={false}
                className="flex items-center"
              />
            </div>
          </div>

          {/* 切换按钮 */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={() => setShowDashboard(!showDashboard)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showDashboard
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {showDashboard ? '隐藏仪表板' : '显示仪表板'}
            </button>
            <button
              onClick={() => setShowCharts(!showCharts)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showCharts
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {showCharts ? '隐藏图表' : '显示图表'}
            </button>
          </div>
        </div>

        {/* 搜索示例 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            防抖搜索示例
          </h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入搜索内容（防抖300ms）"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {debouncedSearch !== searchQuery && (
              <span className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg">
                输入中...
              </span>
            )}
          </div>
        </div>

        {/* 性能仪表板 */}
        {showDashboard && (
          <div className="bg-white rounded-lg shadow-sm">
            <PerformanceDashboard
              autoStart={true}
              updateInterval={5000}
              showDetails={true}
              showResources={true}
              className="p-6"
            />
          </div>
        )}

        {/* 性能图表 */}
        {showCharts && (
          <div className="bg-white rounded-lg shadow-sm">
            <PerformanceCharts
              historySize={20}
              updateInterval={5000}
              className="p-6"
            />
          </div>
        )}

        {/* 功能示例区域 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 懒加载组件示例 */}
          <LazyLoadExample />

          {/* 图片优化示例 */}
          <ImageOptimizationExample />

          {/* 性能测量示例 */}
          <PerformanceMeasurementExample />

          {/* 内存监控示例 */}
          <MemoryMonitorExample memoryUsage={memoryUsage} />
        )}

        {/* 性能数据详情 */}
        {report && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              实时性能数据
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">LCP</div>
                <div className="text-2xl font-bold text-blue-600">
                  {report.vitals.lcp.toFixed(0)}ms
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">FID</div>
                <div className="text-2xl font-bold text-green-600">
                  {report.vitals.fid.toFixed(0)}ms
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">CLS</div>
                <div className="text-2xl font-bold text-purple-600">
                  {report.vitals.cls.toFixed(3)}
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">FCP</div>
                <div className="text-2xl font-bold text-orange-600">
                  {report.vitals.fcp.toFixed(0)}ms
                </div>
              </div>
            </div>

            {/* 优化建议 */}
            {report.recommendations.length > 0 && (
              <div className="mt-6 bg-yellow-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  优化建议
                </h3>
                <ul className="space-y-2">
                  {report.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-yellow-600 mt-0.5">•</span>
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 懒加载组件示例
 */
function LazyLoadExample() {
  const { ref, isVisible } = useLazyLoad({
    threshold: 0.1,
    triggerOnce: true,
  });

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        懒加载组件示例
      </h2>
      <div
        ref={ref}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 min-h-[200px] flex items-center justify-center"
      >
        {isVisible ? (
          <div className="text-center">
            <div className="text-green-600 font-semibold mb-2">✓ 组件已加载</div>
            <p className="text-gray-600 text-sm">
              当组件进入视口时自动加载
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-gray-400 mb-2">⏳ 等待加载</div>
            <p className="text-gray-500 text-sm">滚动到此区域时加载组件</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 图片优化示例
 */
function ImageOptimizationExample() {
  const { imgRef, imgSrc, isLoaded, isError } = useOptimizedImage(
    '/images/sample-image.jpg',
    {
      enableWebP: true,
      quality: 85,
      lazy: true,
    }
  );

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        图片优化示例
      </h2>
      <div className="space-y-4">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[200px] flex items-center justify-center bg-gray-50">
          <img
            ref={imgRef}
            src={imgSrc}
            alt="优化示例"
            className={`max-w-full h-auto transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ maxHeight: '150px' }}
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          {isLoaded && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded">
              ✓ 已加载
            </span>
          )}
          {isError && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded">
              ✗ 加载失败
            </span>
          )}
          {!isLoaded && !isError && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
              ⏳ 加载中...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 性能测量示例
 */
function PerformanceMeasurementExample() {
  const [executionTime, setExecutionTime] = useState<number | null>(null);

  const measureExample = () => {
    const result = measurePerformance('example-operation', () => {
      // 模拟耗时操作
      let sum = 0;
      for (let i = 0; i < 1000000; i++) {
        sum += Math.sqrt(i);
      }
      return sum;
    });

    setExecutionTime(result);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        性能测量示例
      </h2>
      <div className="space-y-4">
        <button
          onClick={measureExample}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          测量性能
        </button>
        {executionTime !== null && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">执行时间</div>
            <div className="text-2xl font-bold text-blue-600">
              {executionTime.toFixed(2)}ms
            </div>
          </div>
        )}
        <p className="text-sm text-gray-600">
          使用 performance.measure() API 测量代码执行时间
        </p>
      </div>
    </div>
  );
}

/**
 * 内存监控示例
 */
function MemoryMonitorExample({
  memoryUsage,
}: {
  memoryUsage: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}) {
  const memoryPercentage = (memoryUsage.usedJSHeapSize / memoryUsage.jsHeapSizeLimit) * 100;

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        内存监控示例
      </h2>
      <div className="space-y-4">
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">已使用内存</div>
          <div className="text-2xl font-bold text-purple-600">
            {(memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">总内存</span>
            <span className="font-medium">
              {(memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">内存限制</span>
            <span className="font-medium">
              {(memoryUsage.jsHeapSizeLimit / 1024 / 1024).toFixed(0)} MB
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">使用率</span>
            <span className="font-medium">{memoryPercentage.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 导出示例组件
 */
export default PerformanceMonitoringExample;