/**
 * queries.ts 单元测试
 * 测试图谱查询相关功能
 */

import { jest } from '@jest/globals';
import {
  getMockDriver,
} from './__mocks__/client';

// 模拟 client 模块
jest.mock('../../services/graph/client', () => ({
  getDriver: () => getMockDriver()
}));

// 导入被测试的函数（需要在 mock 之后导入）
import {
  getCharacterTraits,
} from '../../services/graph/queries';

describe('Graph Queries Service', () => {
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

  // ============================================================
  // getCharacterTraits Tests
  // ============================================================
  describe('getCharacterTraits', () => {
    const projectId = 'project-1';
    const characterId = 'char-1';

    it('应该成功返回角色特征', async () => {
      const mockTraits = {
        characterId,
        characterName: '张三',
        desire: '追求力量',
        fear: '害怕失败',
        weakness: '过于自信',
        signature: '冷静',
        contrast: '与李四形成对比'
      };

      mockSession.setMockResult('MATCH (c:Character', [
        createMockRecord(mockTraits)
      ]);

      const result = await getCharacterTraits(projectId, characterId);

      expect(result).not.toBeNull();
      expect(result?.characterId).toBe(characterId);
      expect(result?.characterName).toBe('张三');
      expect(result?.desire).toBe('追求力量');
      expect(result?.fear).toBe('害怕失败');
    });

    it('应该返回null当角色不存在时', async () => {
      mockSession.setMockResult('MATCH (c:Character', []);

      const result = await getCharacterTraits(projectId, 'non-existent-id');

      expect(result).toBeNull();
    });

    it('应该处理角色某些特征为null的情况', async () => {
      const mockTraits = {
        characterId,
        characterName: '李四',
        desire: null,
        fear: null,
        weakness: null,
        signature: null,
        contrast: null
      };

      mockSession.setMockResult('MATCH (c:Character', [
        createMockRecord(mockTraits)
      ]);

      const result = await getCharacterTraits(projectId, characterId);

      expect(result).not.toBeNull();
      expect(result?.characterName).toBe('李四');
      expect(result?.desire).toBeNull();
    });

    it('应该处理数据库错误', async () => {
      mockSession.setFailure(true, new Error('Database connection failed'));

      await expect(getCharacterTraits(projectId, characterId))
        .rejects.toThrow();
    });
  });
});
