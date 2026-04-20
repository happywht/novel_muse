/**
 * 性能监控面板组件
 *
 * 在开发环境显示实时性能指标
 */

import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '@/services/monitoring/performanceMonitor';

interface PerformanceStats {
  coreWebVitals: {
    FCP?: number;
    LCP?: number;
    CLS?: number;
    FID?: number;
    INP?: number;
    TTFB?: number;
  };
  summary: {
    totalMetrics: number;
    totalAPICalls: number;
    totalAlerts: number;
    averageAPIDuration: number;
  };
}

export const PerformanceMonitorPanel: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 仅在开发环境显示
    if (!import.meta.env.DEV) return;

    // 每秒更新一次统计数据
    const interval = setInterval(() => {
      const report = performanceMonitor.getReport();
      setStats({
        coreWebVitals: report.coreWebVitals,
        summary: report.summary,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!import.meta.env.DEV) return null;
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '10px 20px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          zIndex: 10000,
        }}
      >
        📊 性能监控
      </button>
    );
  }

  const getMetricColor = (name: string, value: number): string => {
    const thresholds: Record<string, { good: number; needsImprovement: number }> = {
      FCP: { good: 1800, needsImprovement: 3000 },
      LCP: { good: 2500, needsImprovement: 4000 },
      CLS: { good: 0.1, needsImprovement: 0.25 },
      FID: { good: 100, needsImprovement: 300 },
      INP: { good: 200, needsImprovement: 500 },
      TTFB: { good: 800, needsImprovement: 1800 },
    };

    const threshold = thresholds[name];
    if (!threshold) return '#6c757d';

    if (value <= threshold.good) return '#28a745'; // 绿色
    if (value <= threshold.needsImprovement) return '#ffc107'; // 黄色
    return '#dc3545'; // 红色
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '350px',
        maxHeight: '80vh',
        overflowY: 'auto',
        background: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        fontFamily: 'monospace',
        fontSize: '12px',
        zIndex: 10000,
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>📊 性能监控面板</h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>

      {stats && (
        <>
          {/* Core Web Vitals */}
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#adb5bd' }}>Core Web Vitals</h4>
            {Object.entries(stats.coreWebVitals).map(([name, value]) => (
              value !== undefined && (
                <div key={name} style={{ marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#adb5bd' }}>{name}:</span>
                  <span style={{ color: getMetricColor(name, value), fontWeight: 'bold' }}>
                    {name === 'CLS' ? value.toFixed(3) : `${Math.round(value)}ms`}
                  </span>
                </div>
              )
            ))}
          </div>

          {/* API统计 */}
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#adb5bd' }}>API 统计</h4>
            <div style={{ marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#adb5bd' }}>API 调用:</span>
              <span style={{ color: '#17a2b8' }}>{stats.summary.totalAPICalls}</span>
            </div>
            <div style={{ marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#adb5bd' }}>平均响应:</span>
              <span style={{ color: getMetricColor('API', stats.summary.averageAPIDuration) }}>
                {stats.summary.averageAPIDuration.toFixed(2)}ms
              </span>
            </div>
          </div>

          {/* 告警 */}
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#adb5bd' }}>告警</h4>
            <div style={{ marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#adb5bd' }}>总告警数:</span>
              <span style={{ color: stats.summary.totalAlerts > 0 ? '#dc3545' : '#28a745', fontWeight: 'bold' }}>
                {stats.summary.totalAlerts}
              </span>
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                const data = performanceMonitor.exportData();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `performance-${Date.now()}.json`;
                a.click();
              }}
              style={{
                flex: 1,
                padding: '8px',
                background: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              导出数据
            </button>
            <button
              onClick={() => {
                performanceMonitor.clearMetrics();
              }}
              style={{
                flex: 1,
                padding: '8px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              清除数据
            </button>
          </div>
        </>
      )}
    </div>
  );
};
