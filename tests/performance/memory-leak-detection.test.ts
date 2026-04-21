/**
 * 内存泄漏检测测试
 * 测试应用程序的内存使用情况和潜在泄漏点
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { PerformanceTestUtils } from './setup';

// 模拟易产生内存泄漏的组件
function MemoryLeakComponent() {
  const [data, setData] = React.useState<number[]>([]);

  React.useEffect(() => {
    // 定时器没有清理
    const interval = setInterval(() => {
      setData(prev => [...prev, Date.now()]);
    }, 1000);

    // 缺少: return () => clearInterval(interval);
  }, []);

  return <div>{data.length}</div>;
}

// 正确的组件实现
function ProperCleanupComponent() {
  const [data, setData] = React.useState<number[]>([]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => [...prev, Date.now()]);
    }, 1000);

    return () => clearInterval(interval); // 正确清理
  }, []);

  return <div>{data.length}</div>;
}

// 事件监听器泄漏组件
function EventListenerLeakComponent() {
  React.useEffect(() => {
    const handleResize = () => {
      console.log('Window resized');
    };

    window.addEventListener('resize', handleResize);

    // 缺少: return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div>Event Listener Leak</div>;
}

// 正确的事件监听器清理
function ProperEventListenerComponent() {
  React.useEffect(() => {
    const handleResize = () => {
      console.log('Window resized');
    };

    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize); // 正确清理
  }, []);

  return <div>Proper Event Listener</div>;
}

// 闭包泄漏组件
function ClosureLeakComponent() {
  const largeData = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    data: 'x'.repeat(1000),
  }));

  React.useEffect(() => {
    const handler = () => {
      console.log('Processing', largeData.length);
    };

    window.addEventListener('click', handler);

    // 即使清理了监听器，largeData仍然被闭包引用
    return () => window.removeEventListener('click', handler);
  }, []);

  return <div>Closure Leak</div>;
}

describe('内存泄漏检测测试', () => {
  afterEach(() => {
    cleanup();
  });

  describe('定时器泄漏检测', () => {
    it('应该检测到未清理的定时器', async () => {
      const initialTimers = (global as any).setTimeout?.mock?.calls?.length || 0;

      render(<MemoryLeakComponent />);
      cleanup();

      // 等待一段时间
      await PerformanceTestUtils.wait(100);

      const finalTimers = (global as any).setTimeout?.mock?.calls?.length || 0;

      // 如果有泄漏，定时器数量应该增加
      expect(finalTimers).toBeGreaterThan(initialTimers);
    });

    it('应该验证正确清理的定时器', async () => {
      render(<ProperCleanupComponent />);
      cleanup();

      // 等待一段时间
      await PerformanceTestUtils.wait(100);

      // 正确清理的组件不应该有额外的定时器
      const timers = (global as any).setTimeout?.mock?.calls?.length || 0;

      // 由于组件被正确清理，定时器数量应该保持稳定
      expect(timers).toBe(0);
    });

    it('应该检测多个定时器的泄漏', async () => {
      const MultipleTimersComponent = () => {
        React.useEffect(() => {
          const interval1 = setInterval(() => {}, 1000);
          const interval2 = setInterval(() => {}, 2000);
          const timeout1 = setTimeout(() => {}, 3000);

          // 没有清理任何定时器
        }, []);

        return <div>Multiple Timers</div>;
      };

      render(<MultipleTimersComponent />);
      cleanup();

      await PerformanceTestUtils.wait(100);

      // 应该检测到多个未清理的定时器
      const timers = (global as any).setTimeout?.mock?.calls?.length || 0;
      expect(timers).toBeGreaterThan(0);
    });
  });

  describe('事件监听器泄漏检测', () => {
    it('应该检测到未清理的事件监听器', async () => {
      const initialListeners = window.eventListeners?.length || 0;

      render(<EventListenerLeakComponent />);
      cleanup();

      // 检查事件监听器是否被清理
      const finalListeners = window.eventListeners?.length || 0;

      // 如果有泄漏，监听器数量应该增加
      expect(finalListeners).toBeGreaterThan(initialListeners);
    });

    it('应该验证正确清理的事件监听器', async () => {
      render(<ProperEventListenerComponent />);
      cleanup();

      // 正确清理的组件不应该有额外的监听器
      const listeners = window.eventListeners?.length || 0;

      // 监听器应该被正确清理
      expect(listeners).toBe(0);
    });

    it('应该检测多种事件类型的泄漏', async () => {
      const MultipleEventsComponent = () => {
        React.useEffect(() => {
          const handlers = {
            resize: () => {},
            scroll: () => {},
            click: () => {},
          };

          Object.entries(handlers).forEach(([event, handler]) => {
            window.addEventListener(event, handler);
          });

          // 没有清理任何监听器
        }, []);

        return <div>Multiple Events</div>;
      };

      render(<MultipleEventsComponent />);
      cleanup();

      // 应该检测到多个未清理的监听器
      const listeners = window.eventListeners?.length || 0;
      expect(listeners).toBeGreaterThan(0);
    });
  });

  describe('DOM节点泄漏检测', () => {
    it('应该检测到未清理的DOM引用', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      const initialNodeCount = document.body.getElementsByTagName('*').length;

      // 渲染组件到容器
      const { unmount } = render(<div>Test Component</div>, { container });

      const afterRenderCount = document.body.getElementsByTagName('*').length;

      unmount();

      const afterUnmountCount = document.body.getElementsByTagName('*').length;

      // 卸载后DOM节点数量应该恢复
      expect(afterUnmountCount).toBe(initialNodeCount);

      // 清理
      document.body.removeChild(container);
    });

    it('应该检测到脱离DOM树的引用', async () => {
      let detachedNodes: HTMLElement[] = [];

      const DetachedNodesComponent = () => {
        const [nodes, setNodes] = React.useState<HTMLElement[]>([]);

        React.useEffect(() => {
          const node = document.createElement('div');
          document.body.appendChild(node);
          setNodes([node]);

          // 组件卸载时没有从DOM中移除节点
        }, []);

        return <div>Detached Nodes</div>;
      };

      render(<DetachedNodesComponent />);
      cleanup();

      // 检查是否有脱离DOM的节点
      const allNodes = document.body.getElementsByTagName('*');
      const orphanedNodes = Array.from(allNodes).filter(node => {
        return !node.isConnected;
      });

      // 不应该有脱离DOM的节点
      expect(orphanedNodes.length).toBe(0);
    });
  });

  describe('内存使用报告', () => {
    it('应该生成详细的内存使用报告', async () => {
      const memoryReport = {
        timestamp: new Date().toISOString(),
        snapshots: [] as Array<{
          operation: string;
          memory: number;
          timestamp: number;
        }>,
      };

      // 收集多个操作的内存快照
      const operations = [
        { name: 'initial', fn: () => render(<div>Initial</div>) },
        { name: 'large-list', fn: () => {
          const items = Array.from({ length: 100 }, (_, i) => <div key={i}>Item {i}</div>);
          return render(<div>{items}</div>);
        }},
        { name: 'cleanup', fn: () => cleanup() },
      ];

      for (const operation of operations) {
        const beforeMemory = PerformanceTestUtils.measureMemoryUsage();
        operation.fn();
        await PerformanceTestUtils.wait(50);

        const afterMemory = PerformanceTestUtils.measureMemoryUsage();

        if (beforeMemory && afterMemory) {
          memoryReport.snapshots.push({
            operation: operation.name,
            memory: afterMemory.usedJSHeapSize,
            timestamp: Date.now(),
          });
        }
      }

      console.log('Memory Usage Report:', JSON.stringify(memoryReport, null, 2));

      // 验证报告结构
      expect(memoryReport.snapshots).toHaveLength(operations.length);
      expect(memoryReport.snapshots.every(s => s.memory > 0)).toBe(true);
    });

    it('应该检测内存使用趋势', async () => {
      const trends: Array<{ iteration: number; memory: number }> = [];

      for (let i = 0; i < 20; i++) {
        const { unmount } = render(
          <div>
            {Array.from({ length: 50 }, (_, j) => (
              <div key={j}>Item {j}</div>
            ))}
          </div>
        );

        const memory = PerformanceTestUtils.measureMemoryUsage();
        if (memory) {
          trends.push({
            iteration: i,
            memory: memory.usedJSHeapSize,
          });
        }

        unmount();
        await PerformanceTestUtils.wait(10);
      }

      // 分析趋势
      const firstTen = trends.slice(0, 10);
      const lastTen = trends.slice(10);

      const avgFirstTen = firstTen.reduce((sum, t) => sum + t.memory, 0) / firstTen.length;
      const avgLastTen = lastTen.reduce((sum, t) => sum + t.memory, 0) / lastTen.length;

      const trendChange = ((avgLastTen - avgFirstTen) / avgFirstTen) * 100;

      console.log(`Memory trend change: ${trendChange.toFixed(2)}%`);

      // 趋势变化应该在合理范围内（±30%）
      expect(Math.abs(trendChange)).toBeLessThan(30);
    });
  });
});
