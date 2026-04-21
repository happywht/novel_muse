/**
 * Performance Monitor Service Tests
 *
 * 性能监控服务单元测试
 *
 * @module services/performance/__tests__/performanceMonitor.test
 * @author Frontend Performance Engineer
 * @created 2026-04-21
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { performanceMonitor, PerformanceMonitor } from '../performanceMonitor';

// Mock PerformanceObserver
global.PerformanceObserver = class MockPerformanceObserver {
  constructor(private callback: any) {}
  observe(options: any) {}
  disconnect() {}
} as any;

// Mock performance API
const mockPerformance = {
  getEntriesByType: vi.fn(),
  mark: vi.fn(),
  measure: vi.fn(),
  now: vi.fn(() => Date.now()),
};

global.performance = mockPerformance as any;

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    vi.clearAllMocks();
  });

  afterEach(() => {
    monitor.stopMonitoring();
    monitor.clear();
  });

  describe('初始化', () => {
    it('应该正确初始化监控器', () => {
      expect(monitor).toBeDefined();
      expect(monitor.isActive()).toBe(false);
    });

    it('应该能够启动监控', () => {
      monitor.startMonitoring();
      expect(monitor.isActive()).toBe(true);
    });

    it('应该能够停止监控', () => {
      monitor.startMonitoring();
      monitor.stopMonitoring();
      expect(monitor.isActive()).toBe(false);
    });
  });

  describe('性能数据收集', () => {
    it('应该能够收集快照', () => {
      monitor.startMonitoring();

      // 模拟一些性能数据
      const snapshot = monitor.getSnapshot();

      expect(snapshot).toBeDefined();
      expect(typeof snapshot).toBe('object');
    });

    it('应该能够清除数据', () => {
      monitor.startMonitoring();
      monitor.clear();

      const snapshot = monitor.getSnapshot();
      expect(Object.keys(snapshot).length).toBe(0);
    });
  });

  describe('性能报告生成', () => {
    it('应该在没有足够数据时返回null', () => {
      const report = monitor.generateReport();
      expect(report).toBeNull();
    });

    it('应该能够生成完整的性能报告', () => {
      monitor.startMonitoring();

      // 模拟性能数据
      (monitor as any).vitals = {
        lcp: 1500,
        fid: 80,
        cls: 0.05,
        fcp: 1000,
        ttfb: 400,
      };

      (monitor as any).resourceEntries = [
        {
          name: 'test.js',
          duration: 500,
          transferSize: 10000,
          initiatorType: 'script',
        } as any,
      ];

      const report = monitor.generateReport();

      expect(report).toBeDefined();
      expect(report?.vitals.lcp).toBe(1500);
      expect(report?.vitals.fid).toBe(80);
      expect(report?.score.overall).toBeGreaterThan(0);
    });
  });

  describe('性能评分计算', () => {
    it('应该正确计算优秀评分', () => {
      (monitor as any).vitals = {
        lcp: 1500,
        fid: 40,
        cls: 0.03,
        fcp: 800,
        ttfb: 300,
      };

      (monitor as any).resourceEntries = [];

      const report = monitor.generateReport();
      expect(report?.score.grade).toBe('excellent');
      expect(report?.score.overall).toBeGreaterThanOrEqual(90);
    });

    it('应该正确计算良好评分', () => {
      (monitor as any).vitals = {
        lcp: 2200,
        fid: 80,
        cls: 0.08,
        fcp: 1500,
        ttfb: 600,
      };

      (monitor as any).resourceEntries = [];

      const report = monitor.generateReport();
      expect(report?.score.grade).toBe('good');
      expect(report?.score.overall).toBeGreaterThanOrEqual(70);
    });

    it('应该正确计算较差评分', () => {
      (monitor as any).vitals = {
        lcp: 5000,
        fid: 400,
        cls: 0.3,
        fcp: 4000,
        ttfb: 2000,
      };

      (monitor as any).resourceEntries = [];

      const report = monitor.generateReport();
      expect(report?.score.grade).toBe('poor');
      expect(report?.score.overall).toBeLessThan(50);
    });
  });

  describe('优化建议生成', () => {
    it('应该为慢LCP生成建议', () => {
      (monitor as any).vitals = {
        lcp: 5000,
        fid: 80,
        cls: 0.05,
        fcp: 1000,
        ttfb: 400,
      };

      (monitor as any).resourceEntries = [];

      const report = monitor.generateReport();
      expect(report?.recommendations.length).toBeGreaterThan(0);
      expect(report?.recommendations.some(r => r.includes('LCP'))).toBe(true);
    });

    it('应该为高CLS生成建议', () => {
      (monitor as any).vitals = {
        lcp: 1500,
        fid: 80,
        cls: 0.3,
        fcp: 1000,
        ttfb: 400,
      };

      (monitor as any).resourceEntries = [];

      const report = monitor.generateReport();
      expect(report?.recommendations.length).toBeGreaterThan(0);
      expect(report?.recommendations.some(r => r.includes('CLS'))).toBe(true);
    });

    it('应该为慢速资源生成建议', () => {
      (monitor as any).vitals = {
        lcp: 1500,
        fid: 80,
        cls: 0.05,
        fcp: 1000,
        ttfb: 400,
      };

      (monitor as any).resourceEntries = [
        {
          name: 'slow-resource.js',
          duration: 2000,
          transferSize: 100000,
          initiatorType: 'script',
        } as any,
        {
          name: 'fast-resource.js',
          duration: 100,
          transferSize: 1000,
          initiatorType: 'script',
        } as any,
      ];

      const report = monitor.generateReport();
      expect(report?.recommendations.some(r => r.includes('慢速资源'))).toBe(true);
    });
  });

  describe('导航性能', () => {
    it('应该正确解析导航时序', () => {
      const mockNavigationEntry = {
        domainLookupEnd: 100,
        domainLookupStart: 0,
        connectEnd: 200,
        connectStart: 100,
        secureConnectionStart: 150,
        responseStart: 300,
        requestStart: 250,
        domComplete: 1000,
        domInteractive: 800,
        loadEventStart: 1200,
        loadEventEnd: 1250,
        fetchStart: 0,
        responseEnd: 350,
      };

      mockPerformance.getEntriesByType.mockReturnValue([mockNavigationEntry]);

      (monitor as any).vitals = {
        lcp: 1500,
        fid: 80,
        cls: 0.05,
        fcp: 1000,
        ttfb: 300,
      };

      (monitor as any).resourceEntries = [];

      const report = monitor.generateReport();

      expect(report?.navigation.dnsLookup).toBe(100);
      expect(report?.navigation.tcpConnection).toBe(100);
      expect(report?.navigation.requestTime).toBe(50);
    });
  });

  describe('资源性能', () => {
    it('应该正确分类资源', () => {
      const resources = [
        { name: 'test.js', duration: 500, transferSize: 10000, initiatorType: 'script' },
        { name: 'test.css', duration: 300, transferSize: 5000, initiatorType: 'style' },
        { name: 'test.png', duration: 800, transferSize: 50000, initiatorType: 'img' },
      ];

      (monitor as any).resourceEntries = resources as any;
      (monitor as any).vitals = {
        lcp: 1500,
        fid: 80,
        cls: 0.05,
        fcp: 1000,
        ttfb: 400,
      };

      const report = monitor.generateReport();

      expect(report?.resources.length).toBe(3);
      expect(report?.resources[0].type).toBe('script');
      expect(report?.resources[1].type).toBe('stylesheet');
      expect(report?.resources[2].type).toBe('image');
    });

    it('应该正确识别缓存状态', () => {
      const cachedResource = {
        name: 'cached.js',
        duration: 10,
        transferSize: 0,
        initiatorType: 'script',
      };

      const uncachedResource = {
        name: 'uncached.js',
        duration: 500,
        transferSize: 10000,
        initiatorType: 'script',
      };

      (monitor as any).resourceEntries = [cachedResource, uncachedResource] as any;
      (monitor as any).vitals = {
        lcp: 1500,
        fid: 80,
        cls: 0.05,
        fcp: 1000,
        ttfb: 400,
      };

      const report = monitor.generateReport();

      expect(report?.resources[0].cached).toBe(true);
      expect(report?.resources[1].cached).toBe(false);
    });
  });

  describe('全局实例', () => {
    it('应该导出全局监控器实例', () => {
      expect(performanceMonitor).toBeDefined();
      expect(performanceMonitor instanceof PerformanceMonitor).toBe(true);
    });
  });
});