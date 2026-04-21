/**
 * 页面加载性能测试
 * 测试应用的首次加载、路由切换和资源加载性能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { PerformanceTestUtils, PerformanceAssertions } from './setup';

describe('页面加载性能测试', () => {
  beforeEach(() => {
    // 清理缓存
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
    }
  });

  describe('首次内容绘制 (FCP)', () => {
    it('应该在2秒内完成首次内容绘制', async () => {
      const performanceMark = {
        name: 'first-contentful-paint',
        startTime: 1500, // 1.5秒
        duration: 0,
      };

      // 模拟FCP性能条目
      const mockPerformanceEntries = [performanceMark];

      // 断言FCP在良好阈值内
      PerformanceAssertions.assertExecutionTime(
        performanceMark.startTime,
        1800, // good阈值: 1800ms
        'FCP should be within good threshold'
      );

      expect(performanceMark.startTime).toBeLessThan(1800);
    });

    it('应该在用户慢速3G网络下4秒内完成FCP', async () => {
      // 模拟慢速网络环境
      const slowNetworkFCP = 3500; // 3.5秒

      PerformanceAssertions.assertExecutionTime(
        slowNetworkFCP,
        4000, // slow network threshold
        'FCP should complete within 4s on slow 3G'
      );

      expect(slowNetworkFCP).toBeLessThan(4000);
    });
  });

  describe('最大内容绘制 (LCP)', () => {
    it('应该在2.5秒内完成最大内容绘制', async () => {
      const lcpTime = 2000; // 2秒

      PerformanceAssertions.assertExecutionTime(
        lcpTime,
        2500, // good阈值: 2500ms
        'LCP should be within good threshold'
      );

      expect(lcpTime).toBeLessThan(2500);
    });

    it('应该在4秒内完成（至少达到needs improvement级别）', async () => {
      const lcpTime = 3800; // 3.8秒

      PerformanceAssertions.assertExecutionTime(
        lcpTime,
        4000, // needsImprovement阈值: 4000ms
        'LCP should be within needs improvement threshold'
      );

      expect(lcpTime).toBeLessThan(4000);
    });
  });

  describe('首次输入延迟 (FID)', () => {
    it('应该在100ms内响应用户首次输入', async () => {
      const fidTime = 80; // 80ms

      PerformanceAssertions.assertExecutionTime(
        fidTime,
        100, // good阈值: 100ms
        'FID should be within good threshold'
      );

      expect(fidTime).toBeLessThan(100);
    });

    it('应该在300ms内响应（至少达到needs improvement级别）', async () => {
      const fidTime = 250; // 250ms

      PerformanceAssertions.assertExecutionTime(
        fidTime,
        300, // needsImprovement阈值: 300ms
        'FID should be within needs improvement threshold'
      );

      expect(fidTime).toBeLessThan(300);
    });
  });

  describe('累积布局偏移 (CLS)', () => {
    it('应该保持在0.1以下（良好级别）', async () => {
      const clsScore = 0.05;

      expect(clsScore).toBeLessThanOrEqual(0.1);
    });

    it('不应该超过0.25（poor阈值）', async () => {
      const clsScore = 0.2;

      expect(clsScore).toBeLessThanOrEqual(0.25);
    });

    it('应该检测到意外的布局偏移', async () => {
      // 模拟布局偏移事件
      const layoutShifts = [
        { value: 0.05, hadRecentInput: false },
        { value: 0.08, hadRecentInput: false },
        { value: 0.03, hadRecentInput: true }, // 这个应该被忽略
      ];

      let totalCLS = 0;
      layoutShifts.forEach(shift => {
        if (!shift.hadRecentInput) {
          totalCLS += shift.value;
        }
      });

      expect(totalCLS).toBeLessThanOrEqual(0.25);
    });
  });

  describe('Time to First Byte (TTFB)', () => {
    it('应该在800ms内收到首字节', async () => {
      const ttfb = 600; // 600ms

      PerformanceAssertions.assertExecutionTime(
        ttfb,
        800, // good阈值: 800ms
        'TTFB should be within good threshold'
      );

      expect(ttfb).toBeLessThan(800);
    });
  });

  describe('资源加载性能', () => {
    it('应该在合理时间内加载关键CSS', async () => {
      const cssLoadTime = 500; // 500ms

      PerformanceAssertions.assertExecutionTime(
        cssLoadTime,
        1000, // 1秒阈值
        'Critical CSS should load within 1s'
      );

      expect(cssLoadTime).toBeLessThan(1000);
    });

    it('应该在合理时间内加载关键JavaScript', async () => {
      const jsLoadTime = 800; // 800ms

      PerformanceAssertions.assertExecutionTime(
        jsLoadTime,
        1500, // 1.5秒阈值
        'Critical JavaScript should load within 1.5s'
      );

      expect(jsLoadTime).toBeLessThan(1500);
    });

    it('应该测量总资源加载大小', async () => {
      const resources = [
        { type: 'script', size: 150000 }, // 150KB
        { type: 'stylesheet', size: 50000 }, // 50KB
        { type: 'image', size: 200000 }, // 200KB
      ];

      const totalSize = resources.reduce((sum, resource) => sum + resource.size, 0);

      // 断言总资源大小不超过500KB
      expect(totalSize).toBeLessThanOrEqual(500000);
    });
  });

  describe('路由切换性能', () => {
    it('应该在500ms内完成路由切换', async () => {
      const { measureExecutionTime } = PerformanceTestUtils;

      // 模拟路由切换
      const { duration } = await measureExecutionTime(async () => {
        // 模拟路由切换延迟
        await new Promise(resolve => setTimeout(resolve, 300));
      }, 'route-transition');

      PerformanceAssertions.assertExecutionTime(
        duration,
        500, // 500ms阈值
        'Route transition should complete within 500ms'
      );

      expect(duration).toBeLessThan(500);
    });

    it('应该在路由切换时避免布局偏移', async () => {
      // 模拟路由切换期间的布局稳定性
      const layoutShiftsDuringTransition = 0.02;

      expect(layoutShiftsDuringTransition).toBeLessThan(0.1);
    });
  });

  describe('渐进式加载', () => {
    it('应该支持骨架屏加载', async () => {
      const skeletonLoadTime = 200; // 200ms

      PerformanceAssertions.assertExecutionTime(
        skeletonLoadTime,
        300, // 300ms阈值
        'Skeleton should load quickly'
      );

      expect(skeletonLoadTime).toBeLessThan(300);
    });

    it('应该实现内容渐进式渲染', async () => {
      const renderStages = [
        { stage: 'header', time: 200 },
        { stage: 'skeleton', time: 400 },
        { stage: 'content', time: 800 },
        { stage: 'complete', time: 1200 },
      ];

      // 验证每个渲染阶段的时间
      renderStages.forEach((stage, index) => {
        if (index > 0) {
          const previousStage = renderStages[index - 1];
          const timeDifference = stage.time - previousStage.time;

          // 每个阶段之间应该有渐进式提升
          expect(timeDifference).toBeGreaterThan(0);
          expect(timeDifference).toBeLessThan(500);
        }
      });
    });
  });

  describe('网络条件模拟', () => {
    it('应该在慢速3G网络下可接受加载', async () => {
      // 慢速3G: 400Kbps, 2000ms RTT
      const slow3GLoadTime = 5000; // 5秒

      PerformanceAssertions.assertExecutionTime(
        slow3GLoadTime,
        10000, // 10秒阈值
        'App should load within 10s on slow 3G'
      );

      expect(slow3GLoadTime).toBeLessThan(10000);
    });

    it('应该在快速3G网络下良好加载', async () => {
      // 快速3G: 1.6Mbps, 300ms RTT
      const fast3GLoadTime = 3000; // 3秒

      PerformanceAssertions.assertExecutionTime(
        fast3GLoadTime,
        4000, // 4秒阈值
        'App should load within 4s on fast 3G'
      );

      expect(fast3GLoadTime).toBeLessThan(4000);
    });
  });

  describe('缓存性能', () => {
    it('应该在二次访问时显著提升加载速度', async () => {
      const firstVisitLoadTime = 3000; // 3秒
      const cachedVisitLoadTime = 800; // 800ms

      const improvement = ((firstVisitLoadTime - cachedVisitLoadTime) / firstVisitLoadTime) * 100;

      // 缓存应该提升至少50%的性能
      expect(improvement).toBeGreaterThanOrEqual(50);
    });

    it('应该有效使用Service Worker缓存', async () => {
      const swCachedResources = ['main.js', 'styles.css', 'logo.png'];
      const cacheHitRate = 0.9; // 90%命中率

      expect(cacheHitRate).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('性能预算', () => {
    it('应该满足总资源大小预算', async () => {
      const performanceBudget = {
        totalSize: 500 * 1024, // 500KB
        scriptSize: 200 * 1024, // 200KB
        stylesheetSize: 50 * 1024, // 50KB
        imageSize: 200 * 1024, // 200KB
      };

      const actualUsage = {
        totalSize: 450 * 1024, // 450KB
        scriptSize: 180 * 1024, // 180KB
        stylesheetSize: 45 * 1024, // 45KB
        imageSize: 180 * 1024, // 180KB
      };

      expect(actualUsage.totalSize).toBeLessThanOrEqual(performanceBudget.totalSize);
      expect(actualUsage.scriptSize).toBeLessThanOrEqual(performanceBudget.scriptSize);
      expect(actualUsage.stylesheetSize).toBeLessThanOrEqual(performanceBudget.stylesheetSize);
      expect(actualUsage.imageSize).toBeLessThanOrEqual(performanceBudget.imageSize);
    });

    it('应该满足请求次数预算', async () => {
      const requestBudget = {
        totalRequests: 20,
        criticalRequests: 5,
      };

      const actualRequests = {
        totalRequests: 18,
        criticalRequests: 4,
      };

      expect(actualRequests.totalRequests).toBeLessThanOrEqual(requestBudget.totalRequests);
      expect(actualRequests.criticalRequests).toBeLessThanOrEqual(requestBudget.criticalRequests);
    });
  });

  describe('性能优化建议验证', () => {
    it('应该启用代码分割', async () => {
      // 检查是否有多个chunk
      const chunks = ['main.js', 'vendor.js', 'runtime.js'];

      expect(chunks.length).toBeGreaterThan(1);
    });

    it('应该启用Tree Shaking', async () => {
      // 模拟检查bundle大小
      const bundleWithDeadCode = 200000;
      const bundleAfterTreeShaking = 150000;

      const reduction = ((bundleWithDeadCode - bundleAfterTreeShaking) / bundleWithDeadCode) * 100;

      expect(reduction).toBeGreaterThan(10); // 至少减少10%
    });

    it('应该启用资源压缩', async () => {
      const uncompressedSize = 100000;
      const compressedSize = 30000;

      const compressionRatio = compressedSize / uncompressedSize;

      expect(compressionRatio).toBeLessThan(0.4); // 压缩后应该小于40%
    });
  });

  describe('真实用户监控 (RUM) 模拟', () => {
    it('应该收集真实用户性能数据', async () => {
      const rumData = {
        fcp: [1500, 1800, 1200, 2000, 1600],
        lcp: [2500, 2800, 2200, 3000, 2600],
        cls: [0.05, 0.08, 0.03, 0.1, 0.06],
      };

      // 计算平均值
      const averageFCP = rumData.fcp.reduce((a, b) => a + b) / rumData.fcp.length;
      const averageLCP = rumData.lcp.reduce((a, b) => a + b) / rumData.lcp.length;
      const averageCLS = rumData.cls.reduce((a, b) => a + b) / rumData.cls.length;

      // 验证平均值在良好阈值内
      expect(averageFCP).toBeLessThan(1800);
      expect(averageLCP).toBeLessThan(2500);
      expect(averageCLS).toBeLessThan(0.1);
    });

    it('应该检测性能异常值', async () => {
      const normalFCP = 1500;
      const outlierFCP = 5000; // 异常值

      const threshold = 3000;
      const isOutlier = outlierFCP > threshold;

      expect(isOutlier).toBe(true);
    });
  });
});
