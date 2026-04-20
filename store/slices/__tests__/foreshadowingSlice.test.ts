/**
 * 伏笔追踪系统 Store 测试
 *
 * 测试所有Store方法的正确性和完整性
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { create } from 'zustand';
import { createForeshadowingSlice, type ForeshadowingSlice } from '../foreshadowingSlice';
import {
  ForeshadowingType,
  ForeshadowingStatus,
  ForeshadowingPriority,
  ForeshadowingImpact,
  ForeshadowingRelationType,
} from '@/types/foreshadowing';

/**
 * 创建测试用的Store实例
 */
function createTestStore() {
  return create<ForeshadowingSlice>()((set, get, api) => ({
    ...createForeshadowingSlice(set, get, api),
  }));
}

/**
 * 创建测试用的伏笔数据
 */
function createTestForeshadowingData(overrides: Partial<any> = {}) {
  return {
    title: '测试伏笔',
    description: '这是一个测试伏笔',
    type: ForeshadowingType.SUSPENSE,
    status: ForeshadowingStatus.UNREVEALED,
    priority: ForeshadowingPriority.HIGH,
    impact: ForeshadowingImpact.HIGH,
    relatedCharacters: ['char-1'],
    relatedEvents: ['event-1'],
    relatedChapters: ['chapter-1'],
    relatedForeshadowings: [],
    tags: ['测试'],
    ...overrides,
  };
}

describe('ForeshadowingSlice - CRUD Operations', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('addForeshadowing', () => {
    it('应该成功添加伏笔', () => {
      const data = createTestForeshadowingData({ title: '新伏笔' });
      const newForeshadowing = store.getState().addForeshadowing(data);

      expect(newForeshadowing).toBeDefined();
      expect(newForeshadowing.id).toBeDefined();
      expect(newForeshadowing.title).toBe('新伏笔');
      expect(newForeshadowing.createdAt).toBeInstanceOf(Date);
      expect(newForeshadowing.updatedAt).toBeInstanceOf(Date);
      expect(store.getState().foreshadowings).toHaveLength(1);
    });

    it('应该为每个伏笔生成唯一ID', () => {
      const state1 = store.getState();
      const fs1 = state1.addForeshadowing(createTestForeshadowingData());
      const state2 = store.getState();
      const fs2 = state2.addForeshadowing(createTestForeshadowingData());

      expect(fs1.id).not.toBe(fs2.id);
      expect(store.getState().foreshadowings).toHaveLength(2);
    });

    it('应该初始化默认值', () => {
      const fs = store.getState().addForeshadowing(createTestForeshadowingData());

      expect(fs.hasConflicts).toBe(false);
      expect(fs.conflictCount).toBe(0);
      expect(fs.referenceCount).toBe(0);
    });

    it('应该保存所有提供的字段', () => {
      const data = createTestForeshadowingData({
        title: '完整伏笔',
        description: '详细描述',
        type: ForeshadowingType.PROPHECY,
        status: ForeshadowingStatus.REVEALED,
        priority: ForeshadowingPriority.CRITICAL,
        impact: ForeshadowingImpact.EXTREME,
        relatedCharacters: ['char-1', 'char-2'],
        relatedEvents: ['event-1', 'event-2'],
        relatedChapters: ['chapter-1', 'chapter-2', 'chapter-3'],
        tags: ['重要', '主线', '预言'],
        notes: '备注信息',
      });

      const fs = store.getState().addForeshadowing(data);

      expect(fs.title).toBe('完整伏笔');
      expect(fs.relatedCharacters).toHaveLength(2);
      expect(fs.relatedChapters).toHaveLength(3);
      expect(fs.tags).toHaveLength(3);
      expect(fs.notes).toBe('备注信息');
    });
  });

  describe('updateForeshadowing', () => {
    it('应该成功更新伏笔', async () => {
      const fs = store.getState().addForeshadowing(createTestForeshadowingData());
      const originalUpdatedAt = fs.updatedAt;

      // 等待10毫秒以确保时间戳不同
      await new Promise((resolve) => setTimeout(resolve, 10));

      store.getState().updateForeshadowing(fs.id, {
        title: '更新后的标题',
        status: ForeshadowingStatus.RESOLVED,
      });

      const updated = store.getState().getForeshadowingById(fs.id);
      expect(updated).toBeDefined();
      expect(updated?.title).toBe('更新后的标题');
      expect(updated?.status).toBe(ForeshadowingStatus.RESOLVED);
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    it('应该只更新提供的字段', () => {
      const fs = store.getState().addForeshadowing(createTestForeshadowingData());

      store.getState().updateForeshadowing(fs.id, { title: '新标题' });

      const updated = store.getState().getForeshadowingById(fs.id);
      expect(updated?.title).toBe('新标题');
      expect(updated?.description).toBe('这是一个测试伏笔');
      expect(updated?.type).toBe(ForeshadowingType.SUSPENSE);
    });

    it('更新不存在的伏笔不应该报错', () => {
      expect(() => {
        store.getState().updateForeshadowing('non-existent-id', { title: '测试' });
      }).not.toThrow();
    });
  });

  describe('deleteForeshadowing', () => {
    it('应该成功删除伏笔', () => {
      const state = store.getState();
      const fs1 = state.addForeshadowing(createTestForeshadowingData());
      const fs2 = state.addForeshadowing(createTestForeshadowingData());

      store.getState().deleteForeshadowing(fs1.id);

      expect(store.getState().foreshadowings).toHaveLength(1);
      expect(store.getState().getForeshadowingById(fs1.id)).toBeUndefined();
      expect(store.getState().getForeshadowingById(fs2.id)).toBeDefined();
    });

    it('应该删除关联的关系', () => {
      const state = store.getState();
      const fs1 = state.addForeshadowing(createTestForeshadowingData());
      const fs2 = state.addForeshadowing(createTestForeshadowingData());

      store.getState().addRelationship(fs1.id, fs2.id, ForeshadowingRelationType.DIRECT, 0.8);
      expect(store.getState().relationships).toHaveLength(1);

      store.getState().deleteForeshadowing(fs1.id);
      expect(store.getState().relationships).toHaveLength(0);
    });

    it('删除当前选中的伏笔应该清除选中状态', () => {
      const fs = store.getState().addForeshadowing(createTestForeshadowingData());
      store.getState().setSelectedForeshadowingId(fs.id);
      expect(store.getState().selectedForeshadowingId).toBe(fs.id);

      store.getState().deleteForeshadowing(fs.id);
      expect(store.getState().selectedForeshadowingId).toBeNull();
    });
  });

  describe('getForeshadowingById', () => {
    it('应该正确返回伏笔', () => {
      const fs = store.getState().addForeshadowing(createTestForeshadowingData({ title: '查找测试' }));

      const found = store.getState().getForeshadowingById(fs.id);
      expect(found).toBeDefined();
      expect(found?.title).toBe('查找测试');
    });

    it('找不到伏笔应该返回undefined', () => {
      const found = store.getState().getForeshadowingById('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('getFilteredForeshadowings', () => {
    beforeEach(() => {
      // 添加测试数据
      store.getState().addForeshadowing(
        createTestForeshadowingData({
          title: '伏笔1',
          type: ForeshadowingType.SUSPENSE,
          status: ForeshadowingStatus.UNREVEALED,
          priority: ForeshadowingPriority.CRITICAL,
          relatedCharacters: ['char-1'],
          tags: ['重要'],
        })
      );
      store.getState().addForeshadowing(
        createTestForeshadowingData({
          title: '伏笔2',
          type: ForeshadowingType.PROPHECY,
          status: ForeshadowingStatus.REVEALED,
          priority: ForeshadowingPriority.HIGH,
          relatedCharacters: ['char-2'],
          tags: ['主线'],
        })
      );
      store.getState().addForeshadowing(
        createTestForeshadowingData({
          title: '伏笔3',
          type: ForeshadowingType.SETUP,
          status: ForeshadowingStatus.RESOLVED,
          priority: ForeshadowingPriority.MEDIUM,
          relatedCharacters: ['char-1'],
          tags: ['重要'],
        })
      );
    });

    it('应该返回所有伏笔（无筛选）', () => {
      const filtered = store.getState().getFilteredForeshadowings();
      expect(filtered).toHaveLength(3);
    });

    it('应该按状态筛选', () => {
      store.getState().setFilter({ statuses: [ForeshadowingStatus.UNREVEALED] });
      const filtered = store.getState().getFilteredForeshadowings();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].status).toBe(ForeshadowingStatus.UNREVEALED);
    });

    it('应该按类型筛选', () => {
      store.getState().setFilter({ types: [ForeshadowingType.SUSPENSE, ForeshadowingType.PROPHECY] });
      const filtered = store.getState().getFilteredForeshadowings();
      expect(filtered).toHaveLength(2);
    });

    it('应该按优先级筛选', () => {
      store.getState().setFilter({ priorities: [ForeshadowingPriority.CRITICAL] });
      const filtered = store.getState().getFilteredForeshadowings();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].priority).toBe(ForeshadowingPriority.CRITICAL);
    });

    it('应该按角色筛选', () => {
      store.getState().setFilter({ characterIds: ['char-1'] });
      const filtered = store.getState().getFilteredForeshadowings();
      expect(filtered).toHaveLength(2);
    });

    it('应该按标签筛选', () => {
      store.getState().setFilter({ tags: ['重要'] });
      const filtered = store.getState().getFilteredForeshadowings();
      expect(filtered).toHaveLength(2);
    });

    it('应该支持搜索查询', () => {
      store.getState().setFilter({ searchQuery: '伏笔1' });
      const filtered = store.getState().getFilteredForeshadowings();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe('伏笔1');
    });

    it('应该按更新时间排序（降序）', async () => {
      // 添加延迟以确保时间戳不同
      await new Promise((resolve) => setTimeout(resolve, 1));
      store.getState().addForeshadowing(createTestForeshadowingData({ title: '伏笔4' }));

      store.getState().setFilter({ sortBy: 'updatedAt', sortOrder: 'desc' });
      const filtered = store.getState().getFilteredForeshadowings();
      expect(filtered).toHaveLength(4);
      // 最后添加的应该在前
      expect(filtered[0].title).toBe('伏笔4');
    });

    it('应该按优先级排序', () => {
      store.getState().setFilter({ sortBy: 'priority', sortOrder: 'asc' });
      const filtered = store.getState().getFilteredForeshadowings();
      expect(filtered).toHaveLength(3);
      expect(filtered[0].priority).toBe(ForeshadowingPriority.CRITICAL);
      expect(filtered[2].priority).toBe(ForeshadowingPriority.MEDIUM);
    });

    it('应该按标题排序', () => {
      store.getState().setFilter({ sortBy: 'title', sortOrder: 'asc' });
      const filtered = store.getState().getFilteredForeshadowings();
      expect(filtered).toHaveLength(3);
      expect(filtered[0].title).toBe('伏笔1');
      expect(filtered[2].title).toBe('伏笔3');
    });

    it('应该清除筛选', () => {
      store.getState().setFilter({ statuses: [ForeshadowingStatus.UNREVEALED] });
      expect(store.getState().getFilteredForeshadowings()).toHaveLength(1);

      store.getState().clearFilter();
      expect(store.getState().getFilteredForeshadowings()).toHaveLength(3);
    });

    it('应该支持组合筛选', () => {
      store.getState().setFilter({
        statuses: [ForeshadowingStatus.UNREVEALED, ForeshadowingStatus.REVEALED],
        priorities: [ForeshadowingPriority.CRITICAL, ForeshadowingPriority.HIGH],
      });
      const filtered = store.getState().getFilteredForeshadowings();
      expect(filtered).toHaveLength(2);
    });
  });
});

describe('ForeshadowingSlice - Relationship Management', () => {
  let store: ReturnType<typeof createTestStore>;
  let fs1: any;
  let fs2: any;

  beforeEach(() => {
    store = createTestStore();
    const state = store.getState();
    fs1 = state.addForeshadowing(createTestForeshadowingData({ title: '伏笔1' }));
    fs2 = state.addForeshadowing(createTestForeshadowingData({ title: '伏笔2' }));
  });

  describe('addRelationship', () => {
    it('应该成功添加关联关系', () => {
      const relationship = store.getState().addRelationship(
        fs1.id,
        fs2.id,
        ForeshadowingRelationType.DIRECT,
        0.8,
        '直接关联'
      );

      expect(relationship).toBeDefined();
      expect(relationship.id).toBeDefined();
      expect(relationship.sourceId).toBe(fs1.id);
      expect(relationship.targetId).toBe(fs2.id);
      expect(relationship.relationType).toBe(ForeshadowingRelationType.DIRECT);
      expect(relationship.strength).toBe(0.8);
      expect(relationship.description).toBe('直接关联');
      expect(store.getState().relationships).toHaveLength(1);
    });

    it('应该为每个关系生成唯一ID', () => {
      const rel1 = store.getState().addRelationship(fs1.id, fs2.id, ForeshadowingRelationType.DIRECT, 0.8);
      const rel2 = store.getState().addRelationship(fs2.id, fs1.id, ForeshadowingRelationType.INDIRECT, 0.5);

      expect(rel1.id).not.toBe(rel2.id);
      expect(store.getState().relationships).toHaveLength(2);
    });

    it('关联强度应该在0-1之间', () => {
      const strengths = [0, 0.5, 1];

      strengths.forEach((strength) => {
        const rel = store.getState().addRelationship(
          fs1.id,
          fs2.id,
          ForeshadowingRelationType.CAUSAL,
          strength
        );
        expect(rel.strength).toBeGreaterThanOrEqual(0);
        expect(rel.strength).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('removeRelationship', () => {
    it('应该成功删除关联关系', () => {
      const rel = store.getState().addRelationship(fs1.id, fs2.id, ForeshadowingRelationType.DIRECT, 0.8);
      expect(store.getState().relationships).toHaveLength(1);

      store.getState().removeRelationship(rel.id);
      expect(store.getState().relationships).toHaveLength(0);
    });
  });

  describe('getRelationshipsByForeshadowingId', () => {
    it('应该获取伏笔的所有关联关系', () => {
      store.getState().addRelationship(fs1.id, fs2.id, ForeshadowingRelationType.DIRECT, 0.8);
      store.getState().addRelationship(fs2.id, fs1.id, ForeshadowingRelationType.INDIRECT, 0.5);

      const fs1Relationships = store.getState().getRelationshipsByForeshadowingId(fs1.id);
      expect(fs1Relationships).toHaveLength(2);
    });

    it('应该返回空数组如果没有任何关系', () => {
      const relationships = store.getState().getRelationshipsByForeshadowingId(fs1.id);
      expect(relationships).toHaveLength(0);
    });
  });

  describe('getRelatedForeshadowings', () => {
    it('应该获取关联的伏笔列表', () => {
      const fs3 = store.getState().addForeshadowing(createTestForeshadowingData({ title: '伏笔3' }));

      store.getState().addRelationship(fs1.id, fs2.id, ForeshadowingRelationType.DIRECT, 0.8);
      store.getState().addRelationship(fs1.id, fs3.id, ForeshadowingRelationType.INDIRECT, 0.5);

      const related = store.getState().getRelatedForeshadowings(fs1.id);
      expect(related).toHaveLength(2);
      expect(related.map((fs) => fs.id)).toContain(fs2.id);
      expect(related.map((fs) => fs.id)).toContain(fs3.id);
    });

    it('应该返回空数组如果没有任何关联', () => {
      const related = store.getState().getRelatedForeshadowings(fs1.id);
      expect(related).toHaveLength(0);
    });
  });
});

describe('ForeshadowingSlice - Statistics', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();

    // 添加测试数据
    store.getState().addForeshadowing(
      createTestForeshadowingData({
        type: ForeshadowingType.SUSPENSE,
        status: ForeshadowingStatus.UNREVEALED,
        priority: ForeshadowingPriority.CRITICAL,
      })
    );
    store.getState().addForeshadowing(
      createTestForeshadowingData({
        type: ForeshadowingType.PROPHECY,
        status: ForeshadowingStatus.REVEALED,
        priority: ForeshadowingPriority.HIGH,
      })
    );
    store.getState().addForeshadowing(
      createTestForeshadowingData({
        type: ForeshadowingType.SETUP,
        status: ForeshadowingStatus.RESOLVED,
        priority: ForeshadowingPriority.HIGH,
      })
    );
    store.getState().addForeshadowing(
      createTestForeshadowingData({
        type: ForeshadowingType.SUSPENSE,
        status: ForeshadowingStatus.RESOLVED,
        priority: ForeshadowingPriority.MEDIUM,
      })
    );
  });

  describe('getStatistics', () => {
    it('应该正确计算总伏笔数', () => {
      const stats = store.getState().getStatistics();
      expect(stats.total).toBe(4);
    });

    it('应该正确按状态分类', () => {
      const stats = store.getState().getStatistics();
      expect(stats.byStatus[ForeshadowingStatus.UNREVEALED]).toBe(1);
      expect(stats.byStatus[ForeshadowingStatus.REVEALED]).toBe(1);
      expect(stats.byStatus[ForeshadowingStatus.RESOLVED]).toBe(2);
    });

    it('应该正确按类型分类', () => {
      const stats = store.getState().getStatistics();
      expect(stats.byType[ForeshadowingType.SUSPENSE]).toBe(2);
      expect(stats.byType[ForeshadowingType.PROPHECY]).toBe(1);
      expect(stats.byType[ForeshadowingType.SETUP]).toBe(1);
    });

    it('应该正确按优先级分类', () => {
      const stats = store.getState().getStatistics();
      expect(stats.byPriority[ForeshadowingPriority.CRITICAL]).toBe(1);
      expect(stats.byPriority[ForeshadowingPriority.HIGH]).toBe(2);
      expect(stats.byPriority[ForeshadowingPriority.MEDIUM]).toBe(1);
    });

    it('应该正确计算已解决数量', () => {
      const stats = store.getState().getStatistics();
      expect(stats.resolved).toBe(2);
    });

    it('应该正确计算进行中数量', () => {
      store.getState().addForeshadowing(
        createTestForeshadowingData({
          status: ForeshadowingStatus.ONGOING,
        })
      );

      const stats = store.getState().getStatistics();
      expect(stats.ongoing).toBe(1);
    });

    it('应该正确计算未揭示数量', () => {
      const stats = store.getState().getStatistics();
      expect(stats.unrevealed).toBe(1);
    });
  });
});

describe('ForeshadowingSlice - Selection', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
  });

  describe('setSelectedForeshadowingId', () => {
    it('应该设置选中的伏笔ID', () => {
      const fs = store.getState().addForeshadowing(createTestForeshadowingData());
      store.getState().setSelectedForeshadowingId(fs.id);

      expect(store.getState().selectedForeshadowingId).toBe(fs.id);
    });

    it('应该清除选中状态', () => {
      const fs = store.getState().addForeshadowing(createTestForeshadowingData());
      store.getState().setSelectedForeshadowingId(fs.id);
      expect(store.getState().selectedForeshadowingId).toBe(fs.id);

      store.getState().setSelectedForeshadowingId(null);
      expect(store.getState().selectedForeshadowingId).toBeNull();
    });
  });

  describe('getSelectedForeshadowing', () => {
    it('应该返回选中的伏笔', () => {
      const fs = store.getState().addForeshadowing(createTestForeshadowingData({ title: '选中的伏笔' }));
      store.getState().setSelectedForeshadowingId(fs.id);

      const selected = store.getState().getSelectedForeshadowing();
      expect(selected).toBeDefined();
      expect(selected?.title).toBe('选中的伏笔');
    });

    it('没有选中时应该返回undefined', () => {
      const selected = store.getState().getSelectedForeshadowing();
      expect(selected).toBeUndefined();
    });
  });
});

describe('ForeshadowingSlice - Utility Methods', () => {
  let store: ReturnType<typeof createTestStore>;

  beforeEach(() => {
    store = createTestStore();
    store.getState().addForeshadowing(
      createTestForeshadowingData({
        title: '悬念伏笔',
        type: ForeshadowingType.SUSPENSE,
        status: ForeshadowingStatus.UNREVEALED,
        relatedChapters: ['chapter-1'],
        relatedCharacters: ['char-1'],
        tags: ['重要'],
      })
    );
    store.getState().addForeshadowing(
      createTestForeshadowingData({
        title: '预言伏笔',
        type: ForeshadowingType.PROPHECY,
        status: ForeshadowingStatus.REVEALED,
        relatedChapters: ['chapter-2'],
        relatedCharacters: ['char-2'],
        tags: ['主线'],
      })
    );
    store.getState().addForeshadowing(
      createTestForeshadowingData({
        title: '另一个悬念',
        type: ForeshadowingType.SUSPENSE,
        status: ForeshadowingStatus.UNREVEALED,
        relatedChapters: ['chapter-1'],
        relatedCharacters: ['char-1'],
        tags: ['重要'],
      })
    );
  });

  describe('searchForeshadowings', () => {
    it('应该按标题搜索', () => {
      const results = store.getState().searchForeshadowings('悬念');
      expect(results).toHaveLength(2);
    });

    it('应该按描述搜索', () => {
      store.getState().addForeshadowing(
        createTestForeshadowingData({
          title: '特殊伏笔',
          description: '这是一个特殊的测试描述',
        })
      );

      const results = store.getState().searchForeshadowings('特殊');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('特殊伏笔');
    });

    it('搜索应该是大小写不敏感的', () => {
      // 先添加包含英文字符的伏笔
      store.getState().addForeshadowing(
        createTestForeshadowingData({
          title: 'TEST伏笔',
          description: '包含英文TEST',
        })
      );

      const results1 = store.getState().searchForeshadowings('test');
      const results2 = store.getState().searchForeshadowings('TEST');
      const results3 = store.getState().searchForeshadowings('TeSt');

      // 所有大小写变体都应该找到相同的结果
      expect(results1.length).toBeGreaterThan(0);
      expect(results2.length).toBe(results1.length);
      expect(results3.length).toBe(results1.length);
    });

    it('空查询应该返回所有结果', () => {
      const results = store.getState().searchForeshadowings('');
      expect(results).toHaveLength(3);
    });
  });

  describe('getForeshadowingsByType', () => {
    it('应该按类型筛选', () => {
      const suspenseForeshadowings = store.getState().getForeshadowingsByType(ForeshadowingType.SUSPENSE);
      expect(suspenseForeshadowings).toHaveLength(2);
      expect(suspenseForeshadowings.every((fs) => fs.type === ForeshadowingType.SUSPENSE)).toBe(true);
    });
  });

  describe('getForeshadowingsByStatus', () => {
    it('应该按状态筛选', () => {
      const unrevealed = store.getState().getForeshadowingsByStatus(ForeshadowingStatus.UNREVEALED);
      expect(unrevealed).toHaveLength(2);
      expect(unrevealed.every((fs) => fs.status === ForeshadowingStatus.UNREVEALED)).toBe(true);
    });
  });

  describe('getForeshadowingsByChapter', () => {
    it('应该按章节筛选', () => {
      const chapter1Fs = store.getState().getForeshadowingsByChapter('chapter-1');
      expect(chapter1Fs).toHaveLength(2);
      expect(chapter1Fs.every((fs) => fs.relatedChapters.includes('chapter-1'))).toBe(true);
    });
  });

  describe('getForeshadowingsByCharacter', () => {
    it('应该按角色筛选', () => {
      const char1Fs = store.getState().getForeshadowingsByCharacter('char-1');
      expect(char1Fs).toHaveLength(2);
      expect(char1Fs.every((fs) => fs.relatedCharacters.includes('char-1'))).toBe(true);
    });
  });
});
