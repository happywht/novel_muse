/**
 * Performance Monitoring System Test
 *
 * 性能监控系统测试脚本
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  PerformanceMonitor,
  DatabaseMonitor,
  SystemMonitor,
  PerformanceOptimizer,
  getGlobalMonitor,
  destroyGlobalMonitor
} from '../../services/performance';
import { PrismaClient } from '@prisma/client';

describe('Performance Monitoring System', () => {
  let monitor: PerformanceMonitor;
  let systemMonitor: SystemMonitor;
  let prisma: PrismaClient;

  beforeEach(() => {
    // 销毁全局实例以避免测试间干扰
    destroyGlobalMonitor();

    monitor = new PerformanceMonitor({
      maxMetricsHistory: 1000,
      enableAlerts: false, // 测试时禁用告警
      samplingRate: 1
    });

    systemMonitor = new SystemMonitor({
      samplingInterval: 1000, // 测试时使用更短的间隔
      enableCpuMonitoring: false, // 测试时禁用CPU监控
      retentionPeriod: 60000 // 1分钟
    });

    prisma = new PrismaClient();
  });

  afterEach(() => {
    monitor.destroy();
    systemMonitor.destroy();
  });

  describe('PerformanceMonitor', () => {
    test('should record API request metrics', () => {
      monitor.recordApiRequest('/api/test', 100, 200);

      const stats = monitor.getEndpointStats('/api/test');
      expect(stats['/api/test']).toBeDefined();
      expect(stats['/api/test'].count).toBe(1);
      expect(stats['/api/test'].avgDuration).toBe(100);
    });

    test('should track concurrent requests', () => {
      monitor.startRequest('req1');
      monitor.startRequest('req2');

      expect(monitor.getActiveRequestCount()).toBe(2);

      monitor.endRequest('req1');
      expect(monitor.getActiveRequestCount()).toBe(1);

      monitor.endRequest('req2');
      expect(monitor.getActiveRequestCount()).toBe(0);
    });

    test('should calculate performance statistics correctly', () => {
      // 记录多个请求
      monitor.recordApiRequest('/api/test1', 100, 200);
      monitor.recordApiRequest('/api/test1', 200, 200);
      monitor.recordApiRequest('/api/test1', 300, 200);

      const stats = monitor.getEndpointStats('/api/test1');
      expect(stats['/api/test1'].count).toBe(3);
      expect(stats['/api/test1'].avgDuration).toBe(200);
      expect(stats['/api/test1'].minDuration).toBe(100);
      expect(stats['/api/test1'].maxDuration).toBe(300);
    });

    test('should generate performance report', () => {
      monitor.recordApiRequest('/api/test', 100, 200);
      monitor.recordApiRequest('/api/test', 500, 200, { success: true });

      const report = monitor.generateReport();

      expect(report.period).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.summary.totalRequests).toBeGreaterThan(0);
      expect(report.endpoints).toBeDefined();
    });

    test('should detect performance bottlenecks', () => {
      // 记录一些慢请求
      monitor.recordApiRequest('/api/slow', 5000, 200);
      monitor.recordApiRequest('/api/fast', 100, 200);

      const bottlenecks = monitor.detectBottlenecks();

      expect(bottlenecks.bottlenecks).toBeDefined();
      expect(bottlenecks.bottlenecks.length).toBeGreaterThan(0);
    });
  });

  describe('SystemMonitor', () => {
    test('should collect system metrics', () => {
      const metrics = systemMonitor.getCurrentMetrics();

      expect(metrics.timestamp).toBeDefined();
      expect(metrics.memoryUsage).toBeGreaterThan(0);
      expect(metrics.totalMemory).toBeGreaterThan(0);
      expect(metrics.uptime).toBeGreaterThan(0);
    });

    test('should track process metrics', () => {
      const processMetrics = systemMonitor.getProcessMetrics();

      expect(processMetrics.pid).toBeDefined();
      expect(processMetrics.memoryUsage).toBeGreaterThan(0);
      expect(processMetrics.uptime).toBeGreaterThan(0);
    });

    test('should generate system performance report', () => {
      const report = systemMonitor.generateReport();

      expect(report.period).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.trends).toBeDefined();
      expect(report.trends.cpu).toBeDefined();
      expect(report.trends.memory).toBeDefined();
    });

    test('should provide system information', () => {
      const info = systemMonitor.getSystemInfo();

      expect(info.platform).toBeDefined();
      expect(info.arch).toBeDefined();
      expect(info.cpuCores).toBeGreaterThan(0);
      expect(info.totalMemory).toBeGreaterThan(0);
      expect(info.nodeVersion).toBeDefined();
    });
  });

  describe('DatabaseMonitor', () => {
    let dbMonitor: DatabaseMonitor;

    beforeEach(() => {
      dbMonitor = new DatabaseMonitor(prisma, {
        slowQueryThreshold: 100,
        enableQueryLogging: false // 测试时禁用实际查询日志
      });
    });

    afterEach(() => {
      dbMonitor.destroy();
    });

    test('should track slow queries', () => {
      // 模拟慢查询
      const queryData = {
        query: 'SELECT * FROM Character WHERE projectId = ?',
        duration: 500,
        timestamp: Date.now(),
        params: ['test-project-id']
      };

      // 通过反射访问私有方法进行测试
      (dbMonitor as any).recordQuery(queryData);

      const slowQueries = dbMonitor.getSlowQueries();
      expect(slowQueries.length).toBeGreaterThan(0);
    });

    test('should calculate query statistics', () => {
      const stats = dbMonitor.getQueryStats();

      expect(stats.totalQueries).toBeDefined();
      expect(stats.avgQueryDuration).toBeDefined();
      expect(stats.queryTypes).toBeDefined();
    });

    test('should provide database performance report', async () => {
      const report = await dbMonitor.generateReport();

      expect(report.period).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.slowQueries).toBeDefined();
    });
  });

  describe('PerformanceOptimizer', () => {
    let optimizer: PerformanceOptimizer;

    beforeEach(() => {
      optimizer = new PerformanceOptimizer(prisma);
    });

    test('should analyze and optimize queries', async () => {
      const query = 'SELECT * FROM Character WHERE projectId = ?';

      const optimization = await optimizer.optimizeQuery(query);

      expect(optimization.originalQuery).toBe(query);
      expect(optimization.improvements).toBeDefined();
      expect(optimization.estimatedSpeedup).toBeGreaterThan(0);
    });

    test('should provide caching strategy recommendations', () => {
      const endpoint = '/api/graph/:projectId';
      const stats = {
        avgDuration: 1500,
        requestCount: 5000,
        errorRate: 0.02
      };

      const strategy = optimizer.analyzeCachingStrategy(endpoint, stats);

      expect(strategy.endpoint).toBe(endpoint);
      expect(strategy.recommendedTTL).toBeDefined();
      expect(strategy.recommendedStrategy).toBeDefined();
      expect(strategy.estimatedImprovement).toBeDefined();
    });

    test('should generate optimization report', async () => {
      const report = await optimizer.generateOptimizationReport();

      expect(report.database).toBeDefined();
      expect(report.api).toBeDefined();
      expect(report.connectionPool).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.summary.priorityActions).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    test('should handle concurrent monitoring', async () => {
      const promises = [];

      // 模拟并发请求
      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            monitor.recordApiRequest(`/api/test/${i}`, Math.random() * 1000, 200);
            resolve();
          })
        );
      }

      await Promise.all(promises);

      const stats = monitor.getEndpointStats();
      expect(Object.keys(stats).length).toBe(100);
    });

    test('should maintain performance under load', async () => {
      const startTime = Date.now();

      // 记录大量指标
      for (let i = 0; i < 10000; i++) {
        monitor.recordMetric({
          timestamp: Date.now(),
          type: 'api',
          name: '/api/test',
          duration: Math.random() * 1000
        });
      }

      const duration = Date.now() - startTime;

      // 确保性能可接受（应该小于1秒）
      expect(duration).toBeLessThan(1000);
    });
  });
});

// 运行测试
if (require.main === module) {
  console.log('运行性能监控系统测试...');

  describe('Quick Performance Test', () => {
    test('basic functionality', () => {
      const monitor = new PerformanceMonitor();

      // 测试基本功能
      monitor.recordApiRequest('/test', 100, 200);
      monitor.recordSystemMetric('memoryUsage', 512);

      const stats = monitor.getEndpointStats();
      console.log('端点统计:', stats);

      const bottlenecks = monitor.detectBottlenecks();
      console.log('性能瓶颈:', bottlenecks);

      monitor.destroy();
      console.log('✅ 基本功能测试通过');
    });
  });

  // 运行快速测试
  console.log('开始快速测试...');
  const monitor = new PerformanceMonitor();

  monitor.recordApiRequest('/api/test', 150, 200);
  monitor.recordSystemMetric('memoryUsage', 512);

  const report = monitor.generateReport();
  console.log('性能报告生成成功:', {
    总请求数: report.summary.totalRequests,
    平均响应时间: report.summary.avgResponseTime + 'ms',
    端点数量: Object.keys(report.endpoints).length
  });

  monitor.destroy();
  console.log('✅ 性能监控系统测试完成');
}
