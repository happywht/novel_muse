/**
 * sync.ts 单元测试
 * 测试图谱同步相关功能
 */

import { jest } from '@jest/globals';
import {
  getMockDriver,
} from './__mocks__/client';

// 模拟 client 模块
jest.mock('../../services/graph/client', () => ({
  getDriver: () => getMockDriver()
}));

// 模拟 llm 模块
jest.mock('../../services/graph/llm', () => ({
  graphLlm: {
    extractTriples: jest.fn(),
    analyzeContent: jest.fn()
  }
}));

// 导入被测试的函数（需要在 mock 之后导入）
import {
  syncEchoToGraph,
} from '../../services/graph/sync';

describe('Graph Sync Service', () => {
  let mockSession: ReturnType<ReturnType<typeof getMockDriver>['getMockSession']>;

  beforeEach(() => {
    const mockDriver = getMockDriver();
    mockSession = mockDriver.getMockSession();
    mockSession.reset();
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockSession.reset();
  });

  // ============================================================
  // syncEchoToGraph Tests
  // ============================================================
  describe('syncEchoToGraph', () => {
    const validEcho = {
      id: 'echo-1',
      projectId: 'project-1',
      type: 'CHARACTER' as const,
      targetId: 'char-1',
      targetName: '张三',
      description: '测试Echo描述',
      status: 'ACCEPTED',
      timestamp: Date.now(),
      triples: [
        {
          subject: '张三',
          relation: 'ALLY_OF',
          object: '李四',
          weight: 80,
          trajectory: 'rising',
          isForeshadowing: false
        }
      ],
      confidence: 0.8
    };

    it('应该成功同步Echo节点到图谱', async () => {
      // 模拟 Echo 节点创建成功
      mockSession.setMockResult('MERGE (e:Echo', [createMockRecord({})]);

      // 模拟 AFFECTS 关系创建成功
      mockSession.setMockResult('MATCH (target:Character', [
        createMockRecord({
          id: 'char-1',
          name: '张三'
        })
      ]);

      // 模拟三元组关系创建成功
      mockSession.setMockResult('MATCH (s {projectId', [createMockRecord({})]);

      await expect(syncEchoToGraph(validEcho)).resolves.not.toThrow();

      // 验证 session.run 被调用
      expect(mockSession.run).toHaveBeenCalled();
    });

    it('应该处理空的triples数组', async () => {
      const echoWithoutTriples = {
        ...validEcho,
        triples: []
      };

      mockSession.setMockResult('MERGE (e:Echo', [createMockRecord({})]);
      mockSession.setMockResult('MATCH (target:Character', [createMockRecord({})]);

      await expect(syncEchoToGraph(echoWithoutTriples)).resolves.not.toThrow();
    });

    it('应该处理没有triples的Echo', async () => {
      const { triples, ...echoWithoutTriples } = validEcho;

      mockSession.setMockResult('MERGE (e:Echo', [createMockRecord({})]);
      mockSession.setMockResult('MATCH (target:Character', [createMockRecord({})]);

      await expect(syncEchoToGraph(echoWithoutTriples as any)).resolves.not.toThrow();
    });

    it('应该正确处理WORLD类型的Echo', async () => {
      const worldEcho = {
        ...validEcho,
        type: 'WORLD' as const,
        targetId: 'world-1',
        targetName: '神秘森林'
      };

      mockSession.setMockResult('MERGE (e:Echo', [createMockRecord({})]);
      mockSession.setMockResult('MATCH (target:WorldSetting', [createMockRecord({})]);

      await expect(syncEchoToGraph(worldEcho)).resolves.not.toThrow();
    });

    it('应该处理伏笔标记', async () => {
      const echoWithForeshadowing = {
        ...validEcho,
        triples: [
          {
            subject: '张三',
            relation: 'KNOWS',
            object: '秘密',
            weight: 50,
            isForeshadowing: true
          }
        ]
      };

      mockSession.setMockResult('MERGE (e:Echo', [createMockRecord({})]);
      mockSession.setMockResult('MATCH (target:Character', [createMockRecord({})]);
      mockSession.setMockResult('MATCH (s {projectId', [createMockRecord({})]);

      await expect(syncEchoToGraph(echoWithForeshadowing)).resolves.not.toThrow();
    });
  });
});

// Helper function to create mock records
function createMockRecord(data: Record<string, any>) {
  return {
    get: (key: string) => data[key],
    keys: Object.keys(data),
    length: Object.keys(data).length,
    forEach: (callback: (value: any, key: string) => void) => {
      Object.entries(data).forEach(([key, value]) => callback(value, key));
    },
    toObject: () => data
  };
}
