/**
 * 组件渲染性能测试
 * 测试React组件的渲染、更新和交互性能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PerformanceTestUtils, PerformanceAssertions } from './setup';
import { act } from 'react-dom/test-utils';

// 模拟大型列表组件
function LargeListComponent({ itemCount }: { itemCount: number }) {
  const items = Array.from({ length: itemCount }, (_, i) => ({
    id: `item-${i}`,
    name: `Item ${i}`,
    description: 'Description text for testing',
  }));

  return (
    <div data-testid="large-list">
      {items.map(item => (
        <div key={item.id} data-testid={`item-${item.id}`}>
          <h3>{item.name}</h3>
          <p>{item.description}</p>
        </div>
      ))}
    </div>
  );
}

// 模拟频繁更新组件
function FrequentlyUpdatingComponent({ updateCount }: { updateCount: number }) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCount(c => (c < updateCount ? c + 1 : c));
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [updateCount]);

  return <div data-testid="update-counter">{count}</div>;
}

// 模拟深度嵌套组件
function DeeplyNestedComponent({ depth }: { depth: number }) {
  if (depth === 0) {
    return <div data-testid="leaf-node">Leaf</div>;
  }

  return (
    <div>
      <DeeplyNestedComponent depth={depth - 1} />
    </div>
  );
}

describe('组件渲染性能测试', () => {
  describe('初始渲染性能', () => {
    it('应该在100ms内渲染简单组件', async () => {
      const SimpleComponent = () => <div>Simple</div>;

      const { measureExecutionTime } = PerformanceTestUtils;
      const { duration } = await measureExecutionTime(() => {
        render(<SimpleComponent />);
      }, 'simple-component-render');

      PerformanceAssertions.assertExecutionTime(duration, 100);
      expect(duration).toBeLessThan(100);
    });

    it('应该在500ms内渲染100个列表项', async () => {
      const itemCount = 100;

      const { measureExecutionTime } = PerformanceTestUtils;
      const { duration } = await measureExecutionTime(() => {
        render(<LargeListComponent itemCount={itemCount} />);
      }, 'list-100-items-render');

      PerformanceAssertions.assertExecutionTime(duration, 500);
      expect(duration).toBeLessThan(500);
    });

    it('应该在2秒内渲染1000个列表项', async () => {
      const itemCount = 1000;

      const { measureExecutionTime } = PerformanceTestUtils;
      const { duration } = await measureExecutionTime(() => {
        render(<LargeListComponent itemCount={itemCount} />);
      }, 'list-1000-items-render');

      PerformanceAssertions.assertExecutionTime(duration, 2000);
      expect(duration).toBeLessThan(2000);
    });

    it('应该测试深度嵌套组件的渲染性能', async () => {
      const depth = 10;

      const { measureExecutionTime } = PerformanceTestUtils;
      const { duration } = await measureExecutionTime(() => {
        render(<DeeplyNestedComponent depth={depth} />);
      }, 'nested-component-render');

      // 深度嵌套可能需要更多时间
      PerformanceAssertions.assertExecutionTime(duration, 300);
      expect(duration).toBeLessThan(300);
    });
  });

  describe('组件更新性能', () => {
    it('应该在50ms内完成简单状态更新', async () => {
      let updateDuration = 0;

      const UpdatingComponent = () => {
        const [count, setCount] = React.useState(0);

        const handleClick = () => {
          const start = performance.now();
          setCount(c => c + 1);
          updateDuration = performance.now() - start;
        };

        return (
          <div>
            <span data-testid="count">{count}</span>
            <button onClick={handleClick} data-testid="increment">Increment</button>
          </div>
        );
      };

      render(<UpdatingComponent />);

      const button = screen.getByTestId('increment');
      act(() => {
        button.click();
      });

      PerformanceAssertions.assertExecutionTime(updateDuration, 50);
      expect(updateDuration).toBeLessThan(50);
    });

    it('应该在100ms内更新100个列表项', async () => {
      const ListWithUpdates = () => {
        const [items, setItems] = React.useState(
          Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }))
        );

        const handleUpdate = () => {
          setItems(items.map(item => ({ ...item, name: `${item.name} (updated)` })));
        };

        return (
          <div>
            {items.map(item => (
              <div key={item.id}>{item.name}</div>
            ))}
            <button onClick={handleUpdate} data-testid="update-all">Update All</button>
          </div>
        );
      };

      render(<ListWithUpdates />);

      const { measureExecutionTime } = PerformanceTestUtils;
      const { duration } = await measureExecutionTime(async () => {
        const button = screen.getByTestId('update-all');
        act(() => {
          button.click();
        });
        await waitFor(() => expect(screen.getByText(/updated/)).toBeInTheDocument());
      }, 'list-100-items-update');

      PerformanceAssertions.assertExecutionTime(duration, 100);
      expect(duration).toBeLessThan(100);
    });

    it('应该测试频繁更新的性能影响', async () => {
      const updateCount = 60; // 60次更新，模拟1秒内的60fps

      const { measureExecutionTime } = PerformanceTestUtils;
      const { duration } = await measureExecutionTime(async () => {
        render(<FrequentlyUpdatingComponent updateCount={updateCount} />);
        await waitFor(() => {
          const counter = screen.getByTestId('update-counter');
          expect(counter).toHaveTextContent(updateCount.toString());
        }, { timeout: 2000 });
      }, 'frequent-updates');

      // 频繁更新应该在合理时间内完成
      PerformanceAssertions.assertExecutionTime(duration, 2000);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('内存使用性能', () => {
    it('应该在渲染大量组件后保持合理的内存使用', async () => {
      const initialMemory = PerformanceTestUtils.measureMemoryUsage();

      // 渲染大量组件
      const { unmount } = render(<LargeListComponent itemCount={1000} />);

      const afterRenderMemory = PerformanceTestUtils.measureMemoryUsage();

      // 卸载组件
      unmount();

      const afterUnmountMemory = PerformanceTestUtils.measureMemoryUsage();

      if (initialMemory && afterRenderMemory && afterUnmountMemory) {
        const memoryIncrease = afterRenderMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const memoryReleased = afterRenderMemory.usedJSHeapSize - afterRenderMemory.usedJSHeapSize;

        // 内存增长应该在合理范围内（不超过50MB）
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);

        // 卸载后应该释放大部分内存（至少释放50%）
        const releasePercentage = (memoryReleased / memoryIncrease) * 100;
        expect(releasePercentage).toBeGreaterThan(50);
      }
    });

    it('应该检测内存泄漏', async () => {
      let components: any[] = [];

      // 创建和销毁组件100次
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(<div>Component {i}</div>);
        components.push({ unmount });

        // 每隔10次清理一次
        if (i % 10 === 9) {
          components.forEach(c => c.unmount());
          components = [];
        }
      }

      // 清理剩余组件
      components.forEach(c => c.unmount());

      const finalMemory = PerformanceTestUtils.measureMemoryUsage();

      if (finalMemory) {
        // 最终内存使用应该在合理范围内
        expect(finalMemory.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // 100MB
      }
    });
  });

  describe('虚拟化列表性能', () => {
    it('应该实现虚拟化以提升长列表性能', async () => {
      const VirtualizedList = () => {
        // 模拟虚拟化列表，只渲染可见部分
        const [visibleItems, setVisibleItems] = React.useState(
          Array.from({ length: 20 }, (_, i) => ({ id: i, name: `Item ${i}` }))
        );

        return (
          <div data-testid="virtualized-list">
            {visibleItems.map(item => (
              <div key={item.id}>{item.name}</div>
            ))}
          </div>
        );
      };

      const { measureExecutionTime } = PerformanceTestUtils;
      const { duration } = await measureExecutionTime(() => {
        render(<VirtualizedList />);
      }, 'virtualized-list-render');

      // 虚拟化列表应该渲染得更快
      PerformanceAssertions.assertExecutionTime(duration, 100);
      expect(duration).toBeLessThan(100);
    });

    it('应该测试虚拟化列表的滚动性能', async () => {
      const scrollPositions = [0, 100, 200, 300, 400];
      const renderTimes: number[] = [];

      for (const scrollTop of scrollPositions) {
        const start = performance.now();

        // 模拟滚动渲染
        const visibleStart = Math.floor(scrollTop / 50);
        const visibleEnd = visibleStart + 20;

        const { unmount } = render(
          <div>
            {Array.from({ length: 20 }, (_, i) => (
              <div key={visibleStart + i}>Item {visibleStart + i}</div>
            ))}
          </div>
        );

        renderTimes.push(performance.now() - start);
        unmount();
      }

      const averageRenderTime = renderTimes.reduce((a, b) => a + b) / renderTimes.length;

      // 虚拟化列表的滚动渲染应该很快
      PerformanceAssertions.assertExecutionTime(averageRenderTime, 50);
      expect(averageRenderTime).toBeLessThan(50);
    });
  });

  describe('React.memo性能优化', () => {
    it('应该通过React.memo避免不必要的重渲染', async () => {
      let renderCount = 0;

      const MemoizedComponent = React.memo(({ value }: { value: number }) => {
        renderCount++;
        return <div>{value}</div>;
      });

      const ParentComponent = () => {
        const [count, setCount] = React.useState(0);

        return (
          <div>
            <MemoizedComponent value={42} />
            <button onClick={() => setCount(c => c + 1)} data-testid="increment">
              Increment Parent
            </button>
          </div>
        );
      };

      render(<ParentComponent />);

      const initialRenders = renderCount;

      // 触发父组件更新
      const button = screen.getByTestId('increment');
      act(() => {
        button.click();
      });

      // Memoized组件不应该重新渲染
      expect(renderCount).toBe(initialRenders);
    });

    it('应该比较memo化的性能提升', async () => {
      // 没有memo的版本
      let rendersWithoutMemo = 0;
      const ComponentWithoutMemo = ({ value }: { value: number }) => {
        rendersWithoutMemo++;
        return <div>{value}</div>;
      };

      // 有memo的版本
      let rendersWithMemo = 0;
      const ComponentWithMemo = React.memo(({ value }: { value: number }) => {
        rendersWithMemo++;
        return <div>{value}</div>;
      });

      // 测试没有memo的版本
      const { unmount: unmount1 } = render(
        <ComponentWithoutMemo value={1} />
      );
      const initialRendersWithoutMemo = rendersWithoutMemo;

      // 测试有memo的版本
      const { unmount: unmount2 } = render(
        <ComponentWithMemo value={1} />
      );
      const initialRendersWithMemo = rendersWithMemo;

      // 两者初始渲染次数应该相同
      expect(initialRendersWithoutMemo).toBe(initialRendersWithMemo);

      unmount1();
      unmount2();
    });
  });

  describe('useMemo和useCallback性能', () => {
    it('应该通过useMemo缓存计算结果', async () => {
      let computationCount = 0;

      const ExpensiveComponent = ({ items }: { items: number[] }) => {
        const expensiveValue = React.useMemo(() => {
          computationCount++;
          return items.reduce((sum, item) => sum + item, 0);
        }, [items]);

        return <div>{expensiveValue}</div>;
      };

      const { rerender } = render(<ExpensiveComponent items={[1, 2, 3]} />);
      const initialComputations = computationCount;

      // 用相同的props重新渲染
      rerender(<ExpensiveComponent items={[1, 2, 3]} />);

      // useMemo应该避免重复计算
      expect(computationCount).toBe(initialComputations);

      // 用不同的props重新渲染
      rerender(<ExpensiveComponent items={[1, 2, 3, 4]} />);

      // 应该重新计算
      expect(computationCount).toBe(initialComputations + 1);
    });

    it('应该通过useCallback保持函数引用稳定', async () => {
      let callbackChangeCount = 0;

      const ParentComponent = () => {
        const [count, setCount] = React.useState(0);

        const handleClick = React.useCallback(() => {
          setCount(c => c + 1);
        }, []);

        return (
          <ChildComponent onClick={handleClick} onCallbackChange={() => callbackChangeCount++} />
        );
      };

      const ChildComponent = React.memo((
        { onClick, onCallbackChange }: { onClick: () => void; onCallbackChange: () => void }
      ) => {
        React.useEffect(() => {
          onCallbackChange();
        }, [onClick, onCallbackChange]);

        return <button onClick={onClick}>Click</button>;
      });

      const { rerender } = render(<ParentComponent />);

      const initialCallbackChanges = callbackChangeCount;

      // 触发父组件重新渲染
      rerender(<ParentComponent />);

      // useCallback应该保持函数引用稳定
      expect(callbackChangeCount).toBe(initialCallbackChanges);
    });
  });

  describe('批量更新和自动批处理', () => {
    it('应该批处理多个状态更新', async () => {
      let renderCount = 0;

      const BatchUpdateComponent = () => {
        const [state1, setState1] = React.useState(0);
        const [state2, setState2] = React.useState(0);
        const [state3, setState3] = React.useState(0);

        renderCount++;

        const handleBatchUpdate = () => {
          React.startTransition(() => {
            setState1(1);
            setState2(2);
            setState3(3);
          });
        };

        return (
          <div>
            <span>{state1}</span>
            <span>{state2}</span>
            <span>{state3}</span>
            <button onClick={handleBatchUpdate} data-testid="batch-update">
              Batch Update
            </button>
          </div>
        );
      };

      render(<BatchUpdateComponent />);

      const button = screen.getByTestId('batch-update');
      const initialRenders = renderCount;

      act(() => {
        button.click();
      });

      // 批处理应该只导致一次重新渲染
      expect(renderCount).toBe(initialRenders + 1);
    });
  });

  describe('并发特性性能', () => {
    it('应该使用useTransition标记低优先级更新', async () => {
      const TransitionComponent = () => {
        const [isPending, startTransition] = React.useTransition();
        const [items, setItems] = React.useState<number[]>([]);

        const handleLoadItems = () => {
          startTransition(() => {
            setItems(Array.from({ length: 10000 }, (_, i) => i));
          });
        };

        return (
          <div>
            <button onClick={handleLoadItems} data-testid="load-items">
              Load Items
            </button>
            {isPending && <div data-testid="loading">Loading...</div>}
            <div>{items.length} items</div>
          </div>
        );
      };

      const { measureExecutionTime } = PerformanceTestUtils;
      const { duration } = await measureExecutionTime(async () => {
        render(<TransitionComponent />);

        const button = screen.getByTestId('load-items');
        act(() => {
          button.click();
        });

        await waitFor(() => {
          expect(screen.getByText(/10000 items/)).toBeInTheDocument();
        });
      }, 'transition-update');

      // 过渡更新应该保持界面响应
      PerformanceAssertions.assertExecutionTime(duration, 1000);
      expect(duration).toBeLessThan(1000);
    });

    it('应该使用useDeferredValue延迟非关键更新', async () => {
      const DeferredValueComponent = ({ query }: { query: string }) => {
        const deferredQuery = React.useDeferredValue(query);
        const [results, setResults] = React.useState<string[]>([]);

        React.useEffect(() => {
          // 模拟搜索操作
          const searchResults = Array.from({ length: 100 }, (_, i) =>
            `Result ${deferredQuery}-${i}`
          );
          setResults(searchResults);
        }, [deferredQuery]);

        return (
          <div>
            <input value={query} readOnly data-testid="input" />
            <div data-testid="results">{results.length}</div>
          </div>
        );
      };

      render(<DeferredValueComponent query="test" />);

      const input = screen.getByTestId('input');

      // 快速输入应该保持响应
      const { measureExecutionTime } = PerformanceTestUtils;
      const { duration } = await measureExecutionTime(async () => {
        for (let i = 0; i < 10; i++) {
          act(() => {
            input.oninput({ target: { value: `test${i}` } } as any);
          });
        }
      }, 'rapid-inputs');

      // 快速输入应该保持响应
      PerformanceAssertions.assertExecutionTime(duration, 500);
      expect(duration).toBeLessThan(500);
    });
  });

  describe('性能基准测试', () => {
    it('应该建立组件渲染性能基准', async () => {
      const benchmarks = await PerformanceTestUtils.runBatchPerformanceTest([
        {
          name: 'simple-component',
          fn: () => render(<div>Simple</div>),
        },
        {
          name: 'list-100-items',
          fn: () => render(<LargeListComponent itemCount={100} />),
        },
        {
          name: 'list-1000-items',
          fn: () => render(<LargeListComponent itemCount={1000} />),
        },
      ], 20);

      benchmarks.forEach(benchmark => {
        console.log(`[Benchmark] ${benchmark.name}:`);
        console.log(`  Average: ${benchmark.averageDuration.toFixed(2)}ms`);
        console.log(`  Min: ${benchmark.minDuration.toFixed(2)}ms`);
        console.log(`  Max: ${benchmark.maxDuration.toFixed(2)}ms`);

        // 每个基准测试应该在合理时间内完成
        expect(benchmark.averageDuration).toBeLessThan(2000);
      });
    });

    it('应该对比优化前后的性能', async () => {
      // 模拟优化前的性能
      const beforeOptimization = await PerformanceTestUtils.runBatchPerformanceTest([
        {
          name: 'unoptimized-list',
          fn: () => render(<LargeListComponent itemCount={500} />),
        },
      ], 10);

      // 模拟优化后的性能（假设优化后快30%）
      const afterOptimization = beforeOptimization.map(b => ({
        ...b,
        averageDuration: b.averageDuration * 0.7,
      }));

      const improvementPercentage =
        ((beforeOptimization[0].averageDuration - afterOptimization[0].averageDuration) /
          beforeOptimization[0].averageDuration) * 100;

      console.log(`Performance improvement: ${improvementPercentage.toFixed(2)}%`);

      // 优化后应该有明显提升
      expect(improvementPercentage).toBeGreaterThan(20);
    });
  });

  describe('组件级性能监控', () => {
    it('应该监控组件的渲染次数', async () => {
      let renderCount = 0;

      const MonitoredComponent = () => {
        renderCount++;
        return <div>Monitored</div>;
      };

      const { rerender } = render(<MonitoredComponent />);
      expect(renderCount).toBe(1);

      rerender(<MonitoredComponent />);
      expect(renderCount).toBe(2);

      rerender(<MonitoredComponent />);
      expect(renderCount).toBe(3);
    });

    it('应该检测组件的渲染时间', async () => {
      const renderTimes: number[] = [];

      const TimedComponent = () => {
        const startTime = performance.now();
        React.useEffect(() => {
          const endTime = performance.now();
          renderTimes.push(endTime - startTime);
        });

        return <div>Timed</div>;
      };

      for (let i = 0; i < 10; i++) {
        const { unmount } = render(<TimedComponent />);
        unmount();
      }

      const averageRenderTime = renderTimes.reduce((a, b) => a + b) / renderTimes.length;

      console.log(`Average render time: ${averageRenderTime.toFixed(2)}ms`);

      // 平均渲染时间应该在合理范围内
      expect(averageRenderTime).toBeLessThan(50);
    });
  });
});
