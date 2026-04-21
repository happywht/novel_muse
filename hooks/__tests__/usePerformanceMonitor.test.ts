/**
 * Performance Monitor Hook Tests
 *
 * 性能监控Hook单元测试
 *
 * @module hooks/__tests__/usePerformanceMonitor.test
 * @author Frontend Performance Engineer
 * @created 2026-04-21
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  usePerformanceMonitor,
  usePerformanceSnapshot,
  usePerformanceScore,
} from '../usePerformanceMonitor';
import { performanceMonitor } from '@/services/performance';

// Mock performance monitor
vi.mock('@/services/performance', () => ({
  performanceMonitor: {
    startMonitoring: vi.fn(),
    stopMonitoring: vi.fn(),
    generateReport: vi.fn(),
    getSnapshot: vi.fn(),
    clear: vi.fn(),
    isActive: vi.fn(() => false),
  },
}));

describe('usePerformanceMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('基本功能', () => {
    it('应该正确初始化', () => {
      const { result } = renderHook(() => usePerformanceMonitor());

      expect(result.current.report).toBeNull();
      expect(result.current.isMonitoring).toBe(false);
      expect(result.current.vitals).toEqual({});
    });

    it('应该能够启动监控', () => {
      const { result } = renderHook(() => usePerformanceMonitor({ autoStart: false }));

      act(() => {
        result.current.startMonitoring();
      });

      expect(performanceMonitor.startMonitoring).toHaveBeenCalled();
    });

    it('应该能够停止监控', () => {
      const { result } = renderHook(() => usePerformanceMonitor({ autoStart: true }));

      act(() => {
        result.current.stopMonitoring();
      });

      expect(performanceMonitor.stopMonitoring).toHaveBeenCalled();
    });

    it('应该能够清除数据', () => {
      const { result } = renderHook(() => usePerformanceMonitor());

      act(() => {
        result.current.clearData();
      });

      expect(performanceMonitor.clear).toHaveBeenCalled();
    });
  });

  describe('自动启动', () => {
    it('应该在autoStart为true时自动启动', () => {
      (performanceMonitor.isActive as any).mockReturnValue(true);

      renderHook(() => usePerformanceMonitor({ autoStart: true }));

      expect(performanceMonitor.startMonitoring).toHaveBeenCalled();
    });

    it('应该在autoStart为false时不自动启动', () => {
      renderHook(() => usePerformanceMonitor({ autoStart: false }));

      expect(performanceMonitor.startMonitoring).not.toHaveBeenCalled();
    });
  });

  describe('性能报告', () => {
    it('应该能够刷新报告', () => {
      const mockReport = {
        timestamp: Date.now(),
        pageUrl: 'https://example.com',
        vitals: {
          lcp: 1500,
          fid: 80,
          cls: 0.05,
          fcp: 1000,
          ttfb: 400,
        },
        navigation: {} as any,
        resources: [] as any,
        jsPerformance: {} as any,
        score: {
          overall: 95,
          lcp: 100,
          fid: 100,
          cls: 100,
          fcp: 100,
          grade: 'excellent' as const,
        },
        recommendations: [],
      };

      (performanceMonitor.generateReport as any).mockReturnValue(mockReport);

      const { result } = renderHook(() => usePerformanceMonitor());

      act(() => {
        const report = result.current.refreshReport();
        expect(report).toEqual(mockReport);
      });

      expect(performanceMonitor.generateReport).toHaveBeenCalled();
    });

    it('应该调用性能更新回调', async () => {
      const onUpdate = vi.fn();

      const mockReport = {
        timestamp: Date.now(),
        pageUrl: 'https://example.com',
        vitals: {
          lcp: 1500,
          fid: 80,
          cls: 0.05,
          fcp: 1000,
          ttfb: 400,
        },
        navigation: {} as any,
        resources: [] as any,
        jsPerformance: {} as any,
        score: {
          overall: 95,
          lcp: 100,
          fid: 100,
          cls: 100,
          fcp: 100,
          grade: 'excellent' as const,
        },
        recommendations: [],
      };

      (performanceMonitor.generateReport as any).mockReturnValue(mockReport);

      renderHook(() => usePerformanceMonitor({
        autoStart: true,
        updateInterval: 100,
        onPerformanceUpdate: onUpdate,
      }));

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledWith(mockReport);
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理启动错误', () => {
      const onError = vi.fn();
      const error = new Error('Start failed');

      (performanceMonitor.startMonitoring as any).mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => usePerformanceMonitor({
        onError,
      }));

      act(() => {
        result.current.startMonitoring();
      });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('应该处理报告生成错误', () => {
      const onError = vi.fn();
      const error = new Error('Generate failed');

      (performanceMonitor.generateReport as any).mockImplementation(() => {
        throw error;
      });

      const { result } = renderHook(() => usePerformanceMonitor({
        onError,
      }));

      act(() => {
        result.current.refreshReport();
      });

      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});

describe('usePerformanceSnapshot', () => {
  it('应该返回性能快照', () => {
    const mockSnapshot = {
      lcp: 1500,
      fid: 80,
      cls: 0.05,
    };

    (performanceMonitor.getSnapshot as any).mockReturnValue(mockSnapshot);

    const { result } = renderHook(() => usePerformanceSnapshot());

    expect(result.current).toEqual(mockSnapshot);
  });

  it('应该定期更新快照', async () => {
    const mockSnapshot1 = { lcp: 1500 };
    const mockSnapshot2 = { lcp: 2000 };

    (performanceMonitor.getSnapshot as any)
      .mockReturnValueOnce(mockSnapshot1)
      .mockReturnValueOnce(mockSnapshot2);

    const { result } = renderHook(() => usePerformanceSnapshot());

    expect(result.current).toEqual(mockSnapshot1);

    await waitFor(() => {
      expect(result.current).toEqual(mockSnapshot2);
    }, { timeout: 2000 });
  });
});

describe('usePerformanceScore', () => {
  it('应该返回性能评分', () => {
    const mockReport = {
      score: {
        overall: 95,
        lcp: 100,
        fid: 100,
        cls: 100,
        fcp: 100,
        grade: 'excellent' as const,
      },
      vitals: {} as any,
      navigation: {} as any,
      resources: [] as any,
      jsPerformance: {} as any,
      recommendations: [],
      timestamp: Date.now(),
      pageUrl: 'https://example.com',
    };

    (performanceMonitor.generateReport as any).mockReturnValue(mockReport);

    const { result } = renderHook(() => usePerformanceScore());

    expect(result.current.overall).toBe(95);
    expect(result.current.grade).toBe('excellent');
  });

  it('应该在无报告时返回默认值', () => {
    (performanceMonitor.generateReport as any).mockReturnValue(null);

    const { result } = renderHook(() => usePerformanceScore());

    expect(result.current.overall).toBe(0);
    expect(result.current.grade).toBe('poor');
  });
});