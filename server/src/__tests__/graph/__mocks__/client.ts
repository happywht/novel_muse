/**
 * Neo4j Driver Mock for Unit Testing
 * 模拟 Neo4j 驱动以进行单元测试
 */

import { jest } from '@jest/globals';

// 模拟 Session 类
class MockSession {
  private mockResults: Map<string, any[]> = new Map();
  private shouldFail: boolean = false;
  private failureError: Error | null = null;
  private callCount: number = 0;

  // 设置模拟返回结果
  setMockResult(queryPattern: string, records: any[]): void {
    this.mockResults.set(queryPattern, records);
  }

  // 设置模拟失败
  setFailure(shouldFail: boolean, error?: Error): void {
    this.shouldFail = shouldFail;
    this.failureError = error || new Error('Mock database error');
  }

  // 重置所有模拟
  reset(): void {
    this.mockResults.clear();
    this.shouldFail = false;
    this.failureError = null;
    this.callCount = 0;
    (this.run as jest.Mock).mockClear();
    (this.close as jest.Mock).mockClear();
  }

  // 模拟 run 方法
  run = jest.fn(async (query: string, params?: Record<string, any>) => {
    this.callCount++;

    if (this.shouldFail) {
      // 直接抛出错误，不打印警告
      throw this.failureError;
    }

    // 查找匹配的模拟结果
    for (const [pattern, records] of this.mockResults.entries()) {
      if (query.includes(pattern)) {
        return { records };
      }
    }

    // 默认返回空结果
    return { records: [] };
  });

  // 模拟 close 方法
  close = jest.fn(async () => {
    // 模拟关闭会话
  });

  // 开始事务
  beginTransaction = jest.fn(() => ({
    run: this.run,
    commit: jest.fn(),
    rollback: jest.fn(),
  }));

  // 获取调用次数
  getCallCount(): number {
    return this.callCount;
  }
}

// 模拟 Driver 类
class MockDriver {
  private mockSession: MockSession;

  constructor() {
    this.mockSession = new MockSession();
  }

  session = jest.fn(() => this.mockSession);

  getMockSession(): MockSession {
    return this.mockSession;
  }

  close = jest.fn(async () => {
    // 模拟关闭驱动
  });
}

// 全局单例
let mockDriverInstance: MockDriver | null = null;

/**
 * 获取模拟驱动实例
 */
export const getMockDriver = (): MockDriver => {
  if (!mockDriverInstance) {
    mockDriverInstance = new MockDriver();
  }
  return mockDriverInstance;
};

/**
 * 重置模拟驱动
 */
export const resetMockDriver = (): void => {
  if (mockDriverInstance) {
    mockDriverInstance.getMockSession().reset();
  }
};

/**
 * 创建模拟记录（模拟 Neo4j Record）
 */
export const createMockRecord = (data: Record<string, any>) => ({
  get: (key: string) => data[key],
  keys: Object.keys(data),
  length: Object.keys(data).length,
  forEach: (callback: (value: any, key: string) => void) => {
    Object.entries(data).forEach(([key, value]) => callback(value, key));
  },
  toObject: () => data,
});

/**
 * 创建模拟节点
 */
export const createMockNode = (properties: Record<string, any>) => ({
  properties,
  labels: [properties._label || 'Node'],
  identity: { toString: () => properties.id || 'mock-id' },
});

/**
 * 创建模拟关系
 */
export const createMockRelationship = (properties: Record<string, any>) => ({
  properties,
  type: properties._type || 'RELATED_TO',
  identity: { toString: () => properties.id || 'mock-rel-id' },
  start: properties._startId,
  end: properties._endId,
});

// 导出模块函数的模拟
export const getDriver = jest.fn(() => getMockDriver());
export const initNeo4j = jest.fn(async () => getMockDriver());
export const closeNeo4j = jest.fn(async () => {
  if (mockDriverInstance) {
    await mockDriverInstance.close();
  }
});
