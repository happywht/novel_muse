/**
 * API性能测试
 * 测试API响应时间、并发处理和错误处理性能
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PerformanceTestUtils, PerformanceAssertions } from './setup';

// 模拟API响应
interface MockAPIResponse {
  data: any;
  status: number;
  headers: Record<string, string>;
  duration: number;
}

// 模拟API服务器
class MockAPIServer {
  private latency: number;
  private errorRate: number;

  constructor(latency: number = 100, errorRate: number = 0) {
    this.latency = latency;
    this.errorRate = errorRate;
  }

  async request(endpoint: string, options: RequestInit = {}): Promise<MockAPIResponse> {
    const startTime = performance.now();

    // 模拟网络延迟
    await PerformanceTestUtils.wait(this.latency);

    // 模拟错误
    if (Math.random() < this.errorRate) {
      return {
        data: null,
        status: 500,
        headers: {},
        duration: performance.now() - startTime,
      };
    }

    // 模拟成功响应
    const response = {
      data: this.getMockData(endpoint),
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-response-time': `${this.latency}ms`,
      },
      duration: performance.now() - startTime,
    };

    return response;
  }

  private getMockData(endpoint: string): any {
    switch (endpoint) {
      case '/api/characters':
        return {
          characters: Array.from({ length: 10 }, (_, i) => ({
            id: `char-${i}`,
            name: `Character ${i}`,
            role: 'Protagonist',
          })),
        };
      case '/api/plots':
        return {
          plots: Array.from({ length: 5 }, (_, i) => ({
            id: `plot-${i}`,
            title: `Plot ${i}`,
            description: 'A compelling plot',
          })),
        };
      case '/api/worlds':
        return {
          worlds: Array.from({ length: 3 }, (_, i) => ({
            id: `world-${i}`,
            name: `World ${i}`,
            setting: 'Fantasy',
          })),
        };
      default:
        return { message: 'Not found' };
    }
  }
}

describe('API性能测试', () => {
  let server: MockAPIServer;

  beforeEach(() => {
    server = new MockAPIServer(100); // 默认100ms延迟
  });

  describe('单个API请求性能', () => {
    it('应该在200ms内完成GET请求', async () => {
      const { measureExecutionTime } = PerformanceTestUtils;

      const { duration, result } = await measureExecutionTime(async () => {
        return await server.request('/api/characters');
      }, 'api-get-characters');

      PerformanceAssertions.assertExecutionTime(duration, 200);
      expect(result.status).toBe(200);
    });

    it('应该在500ms内完成POST请求', async () => {
      const { measureExecutionTime } = PerformanceTestUtils;

      const { duration, result } = await measureExecutionTime(async () => {
        return await server.request('/api/characters', {
          method: 'POST',
          body: JSON.stringify({ name: 'New Character' }),
        });
      }, 'api-post-character');

      PerformanceAssertions.assertExecutionTime(duration, 500);
      expect(result.status).toBe(200);
    });

    it('应该在300ms内完成PUT请求', async () => {
      const { measureExecutionTime } = PerformanceTestUtils;

      const { duration, result } = await measureExecutionTime(async () => {
        return await server.request('/api/characters/1', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Character' }),
        });
      }, 'api-put-character');

      PerformanceAssertions.assertExecutionTime(duration, 300);
      expect(result.status).toBe(200);
    });

    it('应该在200ms内完成DELETE请求', async () => {
      const { measureExecutionTime } = PerformanceTestUtils;

      const { duration, result } = await measureExecutionTime(async () => {
        return await server.request('/api/characters/1', {
          method: 'DELETE',
        });
      }, 'api-delete-character');

      PerformanceAssertions.assertExecutionTime(duration, 200);
      expect(result.status).toBe(200);
    });
  });

  describe('并发请求性能', () => {
    it('应该处理10个并发请求', async () => {
      const { measureExecutionTime } = PerformanceTestUtils;

      const { duration } = await measureExecutionTime(async () => {
        const requests = Array.from({ length: 10 }, (_, i) =>
          server.request(`/api/characters/${i}`)
        );

        return await Promise.all(requests);
      }, 'api-concurrent-10');

      // 并发请求应该比串行快
      PerformanceAssertions.assertExecutionTime(duration, 500);
      expect(duration).toBeLessThan(500);
    });

    it('应该处理50个并发请求', async () => {
      const { measureExecutionTime } = PerformanceTestUtils;

      const { duration } = await measureExecutionTime(async () => {
        const requests = Array.from({ length: 50 }, (_, i) =>
          server.request(`/api/characters/${i}`)
        );

        return await Promise.all(requests);
      }, 'api-concurrent-50');

      // 50个并发请求应该在2秒内完成
      PerformanceAssertions.assertExecutionTime(duration, 2000);
      expect(duration).toBeLessThan(2000);
    });

    it('应该处理100个并发请求', async () => {
      const { measureExecutionTime } = PerformanceTestUtils;

      const { duration } = await measureExecutionTime(async () => {
        const requests = Array.from({ length: 100 }, (_, i) =>
          server.request(`/api/characters/${i}`)
        );

        return await Promise.all(requests);
      }, 'api-concurrent-100');

      // 100个并发请求应该在5秒内完成
      PerformanceAssertions.assertExecutionTime(duration, 5000);
      expect(duration).toBeLessThan(5000);
    });

    it('应该测量并发请求的吞吐量', async () => {
      const requestCount = 100;
      const startTime = performance.now();

      const requests = Array.from({ length: requestCount }, (_, i) =>
        server.request(`/api/characters/${i}`)
      );

      await Promise.all(requests);

      const duration = performance.now() - startTime;
      const throughput = requestCount / (duration / 1000); // 请求/秒

      console.log(`Throughput: ${throughput.toFixed(2)} requests/second`);

      // 吞吐量应该达到至少50请求/秒
      PerformanceAssertions.assertThroughput(requestCount, duration / 1000, 50);
      expect(throughput).toBeGreaterThanOrEqual(50);
    });
  });

  describe('批量操作性能', () => {
    it('应该在1秒内完成批量创建操作', async () => {
      const { measureExecutionTime } = PerformanceTestUtils;

      const { duration } = await measureExecutionTime(async () => {
        const batchRequests = Array.from({ length: 20 }, (_, i) =>
          server.request('/api/characters', {
            method: 'POST',
            body: JSON.stringify({ name: `Character ${i}` }),
          })
        );

        return await Promise.all(batchRequests);
      }, 'api-batch-create');

      PerformanceAssertions.assertExecutionTime(duration, 1000);
      expect(duration).toBeLessThan(1000);
    });

    it('应该在合理时间内处理大型批量请求', async () => {
      const largeBatch = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        name: `Item ${i}`,
        data: 'x'.repeat(1000), // 1KB数据
      }));

      const { measureExecutionTime } = PerformanceTestUtils;

      const { duration } = await measureExecutionTime(async () => {
        return await server.request('/api/batch', {
          method: 'POST',
          body: JSON.stringify(largeBatch),
        });
      }, 'api-batch-large');

      // 大型批量请求应该在2秒内完成
      PerformanceAssertions.assertExecutionTime(duration, 2000);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('网络条件模拟', () => {
    it('应该在慢速网络下正常工作', async () => {
      const slowServer = new MockAPIServer(2000); // 2秒延迟

      const { measureExecutionTime } = PerformanceTestUtils;

      const { duration, result } = await measureExecutionTime(async () => {
        return await slowServer.request('/api/characters');
      }, 'api-slow-network');

      // 慢速网络请求应该在3秒内完成
      PerformanceAssertions.assertExecutionTime(duration, 3000);
      expect(result.status).toBe(200);
    });

    it('应该在不稳定网络下处理超时', async () => {
      const unstableServer = new MockAPIServer(100, 0.3); // 30%错误率

      let successCount = 0;
      let failureCount = 0;

      const requests = Array.from({ length: 20 }, (_, i) =>
        unstableServer.request(`/api/characters/${i}`)
      );

      const results = await Promise.all(requests);

      results.forEach(result => {
        if (result.status === 200) {
          successCount++;
        } else {
          failureCount++;
        }
      });

      console.log(`Success: ${successCount}, Failures: ${failureCount}`);

      // 即使有不稳定的网络，也应该有超过50%的成功率
      const successRate = successCount / results.length;
      expect(successRate).toBeGreaterThan(0.5);
    });

    it('应该在高延迟下保持响应性', async () => {
      const highLatencyServer = new MockAPIServer(500); // 500ms延迟

      const concurrentRequests = 10;
      const startTime = performance.now();

      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        highLatencyServer.request(`/api/characters/${i}`)
      );

      await Promise.all(requests);

      const duration = performance.now() - startTime;

      // 并发请求应该比串行快
      const serialDuration = highLatencyServer['latency'] * concurrentRequests;
      const improvement = ((serialDuration - duration) / serialDuration) * 100;

      console.log(`Performance improvement: ${improvement.toFixed(2)}%`);

      // 并发应该至少提升20%的性能
      expect(improvement).toBeGreaterThan(20);
    });
  });

  describe('缓存性能', () => {
    it('应该在缓存命中时显著提升性能', async () => {
      const cache = new Map<string, MockAPIResponse>();

      const cachedRequest = async (endpoint: string): Promise<MockAPIResponse> => {
        // 检查缓存
        if (cache.has(endpoint)) {
          return cache.get(endpoint)!;
        }

        // 发起请求
        const response = await server.request(endpoint);
        cache.set(endpoint, response);

        return response;
      };

      // 第一次请求（未缓存）
      const { measureExecutionTime } = PerformanceTestUtils;
      const { duration: firstDuration } = await measureExecutionTime(
        () => cachedRequest('/api/characters'),
        'api-first-request'
      );

      // 第二次请求（已缓存）
      const { duration: cachedDuration } = await measureExecutionTime(
        () => cachedRequest('/api/characters'),
        'api-cached-request'
      );

      console.log(`First request: ${firstDuration.toFixed(2)}ms`);
      console.log(`Cached request: ${cachedDuration.toFixed(2)}ms`);

      // 缓存请求应该快至少90%
      const improvement = ((firstDuration - cachedDuration) / firstDuration) * 100;
      expect(improvement).toBeGreaterThan(90);
    });

    it('应该处理缓存失效', async () => {
      const cache = new Map<string, { data: any; timestamp: number }>();
      const cacheTTL = 1000; // 1秒

      const cachedRequestWithTTL = async (endpoint: string): Promise<MockAPIResponse> => {
        const now = Date.now();
        const cached = cache.get(endpoint);

        // 检查缓存是否有效
        if (cached && (now - cached.timestamp) < cacheTTL) {
          return {
            data: cached.data,
            status: 200,
            headers: {},
            duration: 1, // 缓存命中，几乎无延迟
          };
        }

        // 发起请求
        const response = await server.request(endpoint);
        cache.set(endpoint, {
          data: response.data,
          timestamp: now,
        });

        return response;
      };

      // 第一次请求
      await cachedRequestWithTTL('/api/characters');

      // 立即第二次请求（缓存命中）
      const { measureExecutionTime } = PerformanceTestUtils;
      const { duration: cachedDuration } = await measureExecutionTime(
        () => cachedRequestWithTTL('/api/characters'),
        'api-cached-hit'
      );

      expect(cachedDuration).toBeLessThan(10);

      // 等待缓存过期
      await PerformanceTestUtils.wait(1100);

      // 缓存过期后的请求
      const { duration: expiredDuration } = await measureExecutionTime(
        () => cachedRequestWithTTL('/api/characters'),
        'api-cache-expired'
      );

      // 缓存过期后应该重新请求
      expect(expiredDuration).toBeGreaterThan(50);
    });
  });

  describe('重试机制性能', () => {
    it('应该在失败时自动重试', async () => {
      let attemptCount = 0;
      const maxRetries = 3;

      const flakyRequest = async (): Promise<MockAPIResponse> => {
        attemptCount++;

        if (attemptCount < maxRetries) {
          return {
            data: null,
            status: 500,
            headers: {},
            duration: 100,
          };
        }

        return {
          data: { success: true },
          status: 200,
          headers: {},
          duration: 100,
        };
      };

      const { measureExecutionTime } = PerformanceTestUtils;
      const { duration, result } = await measureExecutionTime(async () => {
        let lastError: any;

        for (let i = 0; i <= maxRetries; i++) {
          try {
            const response = await flakyRequest();
            if (response.status === 200) {
              return response;
            }
          } catch (error) {
            lastError = error;
          }
        }

        throw lastError;
      }, 'api-retry-success');

      expect(result.status).toBe(200);
      expect(attemptCount).toBe(maxRetries);

      // 重试应该在合理时间内完成
      PerformanceAssertions.assertExecutionTime(duration, 1000);
    });

    it('应该在达到最大重试次数后放弃', async () => {
      const failingRequest = async (): Promise<MockAPIResponse> => {
        return {
          data: null,
          status: 500,
          headers: {},
          duration: 100,
        };
      };

      const maxRetries = 3;
      const startTime = performance.now();

      let lastResponse: MockAPIResponse | null = null;

      for (let i = 0; i <= maxRetries; i++) {
        lastResponse = await failingRequest();
        if (lastResponse.status === 200) {
          break;
        }
      }

      const duration = performance.now() - startTime;

      expect(lastResponse?.status).toBe(500);

      // 重试应该在合理时间内完成并放弃
      PerformanceAssertions.assertExecutionTime(duration, 1000);
    });
  });

  describe('请求批处理和节流', () => {
    it('应该批处理多个请求', async () => {
      const requestBatch: string[] = [];
      let batchTimeout: NodeJS.Timeout | null = null;

      const batchedRequest = async (endpoint: string): Promise<any> => {
        return new Promise((resolve) => {
          requestBatch.push(endpoint);

          if (batchTimeout) {
            clearTimeout(batchTimeout);
          }

          batchTimeout = setTimeout(async () => {
            const responses = await Promise.all(
              requestBatch.map(ep => server.request(ep))
            );
            resolve(responses);
            requestBatch.length = 0;
          }, 50); // 50ms批处理窗口
        });
      };

      const { measureExecutionTime } = PerformanceTestUtils;
      const { duration } = await measureExecutionTime(async () => {
        const requests = Array.from({ length: 10 }, (_, i) =>
          batchedRequest(`/api/characters/${i}`)
        );

        await Promise.all(requests);
      }, 'api-batched-requests');

      // 批处理应该比单独请求更快
      PerformanceAssertions.assertExecutionTime(duration, 500);
    });

    it('应该节流高频请求', async () => {
      let lastRequestTime = 0;
      const throttleDelay = 100; // 100ms节流

      const throttledRequest = async (endpoint: string): Promise<MockAPIResponse> => {
        const now = Date.now();
        const timeSinceLastRequest = now - lastRequestTime;

        if (timeSinceLastRequest < throttleDelay) {
          await PerformanceTestUtils.wait(throttleDelay - timeSinceLastRequest);
        }

        lastRequestTime = Date.now();
        return await server.request(endpoint);
      };

      const { measureExecutionTime } = PerformanceTestUtils;
      const { duration } = await measureExecutionTime(async () => {
        const requests = Array.from({ length: 10 }, (_, i) =>
          throttledRequest(`/api/characters/${i}`)
        );

        await Promise.all(requests);
      }, 'api-throttled-requests');

      // 节流后的请求时间
      const expectedMinDuration = 10 * throttleDelay;
      expect(duration).toBeGreaterThan(expectedMinDuration - 100); // 允许一些误差
    });
  });

  describe('数据序列化性能', () => {
    it('应该在合理时间内序列化大型JSON', async () => {
      const largeData = {
        characters: Array.from({ length: 1000 }, (_, i) => ({
          id: `char-${i}`,
          name: `Character ${i}`,
          description: 'A'.repeat(500), // 500字符描述
          attributes: {
            strength: Math.random() * 100,
            agility: Math.random() * 100,
            intelligence: Math.random() * 100,
          },
        })),
      };

      const { measureExecutionTime } = PerformanceTestUtils;
      const { duration } = await measureExecutionTime(() => {
        JSON.stringify(largeData);
      }, 'json-serialize-large');

      // 序列化1000个对象应该在100ms内完成
      PerformanceAssertions.assertExecutionTime(duration, 100);
    });

    it('应该在合理时间内反序列化大型JSON', async () => {
      const largeJSON = JSON.stringify({
        characters: Array.from({ length: 1000 }, (_, i) => ({
          id: `char-${i}`,
          name: `Character ${i}`,
          description: 'A'.repeat(500),
        })),
      });

      const { measureExecutionTime } = PerformanceTestUtils;
      const { duration } = await measureExecutionTime(() => {
        JSON.parse(largeJSON);
      }, 'json-deserialize-large');

      // 反序列化1000个对象应该在100ms内完成
      PerformanceAssertions.assertExecutionTime(duration, 100);
    });
  });

  describe('性能基准测试', () => {
    it('应该建立API性能基准', async () => {
      const benchmarks = await PerformanceTestUtils.runBatchPerformanceTest([
        {
          name: 'single-request',
          fn: () => server.request('/api/characters'),
        },
        {
          name: 'concurrent-10',
          fn: async () => {
            const requests = Array.from({ length: 10 }, (_, i) =>
              server.request(`/api/characters/${i}`)
            );
            return await Promise.all(requests);
          },
        },
        {
          name: 'concurrent-50',
          fn: async () => {
            const requests = Array.from({ length: 50 }, (_, i) =>
              server.request(`/api/characters/${i}`)
            );
            return await Promise.all(requests);
          },
        },
      ], 20);

      benchmarks.forEach(benchmark => {
        console.log(`[API Benchmark] ${benchmark.name}:`);
        console.log(`  Average: ${benchmark.averageDuration.toFixed(2)}ms`);
        console.log(`  Min: ${benchmark.minDuration.toFixed(2)}ms`);
        console.log(`  Max: ${benchmark.maxDuration.toFixed(2)}ms`);

        // 每个基准测试应该在合理时间内完成
        expect(benchmark.averageDuration).toBeLessThan(3000);
      });
    });

    it('应该对比不同API实现版本的性能', async () => {
      // 版本1: 模拟旧版本API
      const oldAPIServer = new MockAPIServer(200);

      // 版本2: 模拟优化后的API
      const newAPIServer = new MockAPIServer(100);

      const oldVersionBenchmark = await PerformanceTestUtils.runBatchPerformanceTest([
        {
          name: 'old-api',
          fn: () => oldAPIServer.request('/api/characters'),
        },
      ], 50);

      const newVersionBenchmark = await PerformanceTestUtils.runBatchPerformanceTest([
        {
          name: 'new-api',
          fn: () => newAPIServer.request('/api/characters'),
        },
      ], 50);

      const oldAverage = oldVersionBenchmark[0].averageDuration;
      const newAverage = newVersionBenchmark[0].averageDuration;

      const improvement = ((oldAverage - newAverage) / oldAverage) * 100;

      console.log(`Old API average: ${oldAverage.toFixed(2)}ms`);
      console.log(`New API average: ${newAverage.toFixed(2)}ms`);
      console.log(`Performance improvement: ${improvement.toFixed(2)}%`);

      // 新版本应该至少提升20%的性能
      expect(improvement).toBeGreaterThan(20);
    });
  });

  describe('负载测试', () => {
    it('应该在高负载下保持稳定性能', async () => {
      const requestCounts = [10, 50, 100, 200];
      const results: any[] = [];

      for (const count of requestCounts) {
        const startTime = performance.now();

        const requests = Array.from({ length: count }, (_, i) =>
          server.request(`/api/characters/${i}`)
        );

        await Promise.all(requests);

        const duration = performance.now() - startTime;
        const throughput = count / (duration / 1000);

        results.push({
          requestCount: count,
          duration,
          throughput,
          averageLatency: duration / count,
        });

        console.log(`Load test ${count} requests:`);
        console.log(`  Duration: ${duration.toFixed(2)}ms`);
        console.log(`  Throughput: ${throughput.toFixed(2)} req/s`);
        console.log(`  Avg latency: ${(duration / count).toFixed(2)}ms`);
      }

      // 验证吞吐量不会随着负载增加而显著下降
      const firstThroughput = results[0].throughput;
      const lastThroughput = results[results.length - 1].throughput;

      const throughputRetention = (lastThroughput / firstThroughput) * 100;

      console.log(`Throughput retention: ${throughputRetention.toFixed(2)}%`);

      // 即使在高负载下，也应该保持至少60%的吞吐量
      expect(throughputRetention).toBeGreaterThan(60);
    });

    it('应该测试长时间运行的稳定性', async () => {
      const testDuration = 5000; // 5秒
      const requestInterval = 100; // 每100ms发送一次请求
      const results: number[] = [];

      const startTime = Date.now();

      while (Date.now() - startTime < testDuration) {
        const requestStart = performance.now();
        await server.request('/api/characters');
        const requestDuration = performance.now() - requestStart;

        results.push(requestDuration);
        await PerformanceTestUtils.wait(requestInterval);
      }

      const averageLatency = results.reduce((a, b) => a + b) / results.length;
      const maxLatency = Math.max(...results);
      const minLatency = Math.min(...results);

      console.log(`Stability test results (${results.length} requests):`);
      console.log(`  Average latency: ${averageLatency.toFixed(2)}ms`);
      console.log(`  Min latency: ${minLatency.toFixed(2)}ms`);
      console.log(`  Max latency: ${maxLatency.toFixed(2)}ms`);

      // 平均延迟应该在合理范围内
      expect(averageLatency).toBeLessThan(500);

      // 最大延迟不应该超过平均延迟的3倍
      expect(maxLatency).toBeLessThan(averageLatency * 3);
    });
  });
});
