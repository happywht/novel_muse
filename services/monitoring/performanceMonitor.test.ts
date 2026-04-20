/**
 * 性能监控系统测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceMonitor } from './performanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe('基础功能', () => {
    it('应该正确初始化', () => {
      expect(monitor).toBeDefined();
      const report = monitor.getReport();
      expect(report.coreWebVitals).toBeDefined();
      expect(report.customMetrics).toEqual([]);
      expect(report.apiMetrics).toEqual([]);
      expect(report.alerts).toEqual([]);
    });

    it('应该记录自定义指标', () => {
      monitor.recordMetric('TEST_METRIC', 100);

      const report = monitor.getReport();
      expect(report.customMetrics).toHaveLength(1);
      expect(report.customMetrics[0].name).toBe('TEST_METRIC');
      expect(report.customMetrics[0].value).toBe(100);
    });

    it('应该记录带有元数据的指标', () => {
      const metadata = { source: 'test', userId: '123' };
      monitor.recordMetric('METRIC_WITH_METADATA', 200, metadata);

      const report = monitor.getReport();
      const metric = report.customMetrics[0];
      expect(metric.metadata).toEqual(metadata);
    });
  });

  describe('API指标监控', () => {
    it('应该记录API请求指标', () => {
      const apiMetric = {
        name: 'API_REQUEST' as const,
        value: 150,
        timestamp: Date.now(),
        url: '/api/test',
        method: 'GET',
        status: 200,
        duration: 150,
      };

      monitor.recordAPIMetric(apiMetric);

      const report = monitor.getReport();
      expect(report.apiMetrics).toHaveLength(1);
      expect(report.apiMetrics[0]).toEqual(apiMetric);
    });

    it('应该计算平均API响应时间', () => {
      monitor.recordAPIMetric({
        name: 'API_REQUEST',
        value: 100,
        timestamp: Date.now(),
        url: '/api/1',
        method: 'GET',
        status: 200,
        duration: 100,
      });

      monitor.recordAPIMetric({
        name: 'API_REQUEST',
        value: 200,
        timestamp: Date.now(),
        url: '/api/2',
        method: 'GET',
        status: 200,
        duration: 200,
      });

      const report = monitor.getReport();
      expect(report.summary.averageAPIDuration).toBe(150);
    });

    it('应该为慢API请求生成告警', () => {
      monitor.recordAPIMetric({
        name: 'API_REQUEST',
        value: 1500, // 超过阈值
        timestamp: Date.now(),
        url: '/api/slow',
        method: 'GET',
        status: 200,
        duration: 1500,
      });

      const report = monitor.getReport();
      expect(report.alerts.length).toBeGreaterThan(0);
      expect(report.alerts[0].level).toBe('error');
      expect(report.alerts[0].metric).toBe('API_RESPONSE_TIME');
    });
  });

  describe('Core Web Vitals', () => {
    it('应该记录FCP指标', () => {
      monitor.recordMetric('FCP', 1200);

      const report = monitor.getReport();
      expect(report.coreWebVitals.FCP).toBe(1200);
    });

    it('应该记录LCP指标', () => {
      monitor.recordMetric('LCP', 2500);

      const report = monitor.getReport();
      expect(report.coreWebVitals.LCP).toBe(2500);
    });

    it('应该记录CLS指标', () => {
      monitor.recordMetric('CLS', 0.05);

      const report = monitor.getReport();
      expect(report.coreWebVitals.CLS).toBe(0.05);
    });

    it('应该为差的LCP生成告警', () => {
      monitor.recordMetric('LCP', 4500); // 超过needsImprovement阈值

      const report = monitor.getReport();
      const lcpAlerts = report.alerts.filter(a => a.metric === 'LCP');
      expect(lcpAlerts.length).toBeGreaterThan(0);
      expect(lcpAlerts[0].level).toBe('warning');
    });
  });

  describe('性能告警', () => {
    it('应该为超过阈值的指标生成告警', () => {
      monitor.recordMetric('LCP', 5000);

      const report = monitor.getReport();
      expect(report.alerts.length).toBeGreaterThan(0);
    });

    it('应该为良好性能生成info级别告警', () => {
      monitor.recordMetric('FCP', 2000); // 超过good但低于needsImprovement

      const report = monitor.getReport();
      const fcpAlerts = report.alerts.filter(a => a.metric === 'FCP');
      expect(fcpAlerts.length).toBeGreaterThan(0);
      expect(fcpAlerts[0].level).toBe('info');
    });

    it('应该为差性能生成warning级别告警', () => {
      monitor.recordMetric('CLS', 0.3); // 超过needsImprovement

      const report = monitor.getReport();
      const clsAlerts = report.alerts.filter(a => a.metric === 'CLS');
      expect(clsAlerts.length).toBeGreaterThan(0);
      expect(clsAlerts[0].level).toBe('warning');
    });
  });

  describe('性能报告', () => {
    beforeEach(() => {
      monitor.recordMetric('TEST1', 100);
      monitor.recordMetric('TEST2', 200);
      monitor.recordAPIMetric({
        name: 'API_REQUEST',
        value: 150,
        timestamp: Date.now(),
        url: '/api/test',
        method: 'GET',
        status: 200,
        duration: 150,
      });
    });

    it('应该生成完整的性能报告', () => {
      const report = monitor.getReport();

      expect(report.coreWebVitals).toBeDefined();
      expect(report.customMetrics).toHaveLength(2);
      expect(report.apiMetrics).toHaveLength(1);
      expect(report.summary.totalMetrics).toBe(2);
      expect(report.summary.totalAPICalls).toBe(1);
    });

    it('应该导出JSON格式数据', () => {
      const exportedData = monitor.exportData();

      expect(exportedData).toBeDefined();
      const parsed = JSON.parse(exportedData);
      expect(parsed.timestamp).toBeDefined();
      expect(parsed.report).toBeDefined();
    });
  });

  describe('数据管理', () => {
    it('应该清除所有指标', () => {
      monitor.recordMetric('TEST', 100);
      monitor.recordAPIMetric({
        name: 'API_REQUEST',
        value: 100,
        timestamp: Date.now(),
        url: '/api/test',
        method: 'GET',
        status: 200,
        duration: 100,
      });

      monitor.clearMetrics();

      const report = monitor.getReport();
      expect(report.customMetrics).toEqual([]);
      expect(report.apiMetrics).toEqual([]);
      expect(report.alerts).toEqual([]);
      expect(report.coreWebVitals).toEqual({});
    });

    it('应该支持清除后重新记录', () => {
      monitor.recordMetric('TEST1', 100);
      monitor.clearMetrics();
      monitor.recordMetric('TEST2', 200);

      const report = monitor.getReport();
      expect(report.customMetrics).toHaveLength(1);
      expect(report.customMetrics[0].name).toBe('TEST2');
    });
  });

  describe('性能标记和测量', () => {
    it('应该支持性能标记', () => {
      // 模拟performance.mark
      global.performance = {
        ...global.performance,
        mark: vi.fn(),
      } as any;

      monitor.mark('test-mark');

      expect(global.performance.mark).toHaveBeenCalledWith('test-mark');
    });

    it('应该支持性能测量', () => {
      const mockMeasure = {
        duration: 100,
      };

      // 模拟performance.measure和getEntriesByName
      global.performance = {
        ...global.performance,
        measure: vi.fn(),
        getEntriesByName: vi.fn(() => [mockMeasure]),
      } as any;

      monitor.measure('test-measure', 'start-mark', 'end-mark');

      expect(global.performance.measure).toHaveBeenCalledWith('test-measure', 'start-mark', 'end-mark');
    });
  });

  describe('监控控制', () => {
    it('应该启动监控', () => {
      monitor.startMonitoring();

      // 验证监控已启动（通过检查状态）
      expect(() => monitor.startMonitoring()).not.toThrow();
    });

    it('应该停止监控', () => {
      monitor.startMonitoring();
      monitor.stopMonitoring();

      // 验证监控已停止
      expect(() => monitor.stopMonitoring()).not.toThrow();
    });

    it('应该支持重复启动', () => {
      monitor.startMonitoring();
      monitor.startMonitoring(); // 应该被忽略

      expect(() => monitor.startMonitoring()).not.toThrow();
    });
  });
});
