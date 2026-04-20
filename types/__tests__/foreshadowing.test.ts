/**
 * 伏笔追踪系统类型定义测试
 *
 * 测试所有类型定义的正确性和完整性
 */

import { describe, it, expect } from 'vitest';
import {
  ForeshadowingType,
  ForeshadowingStatus,
  ForeshadowingPriority,
  ForeshadowingImpact,
  ForeshadowingRelationType,
  type Foreshadowing,
  type ForeshadowingRelationship,
  type ForeshadowingConflict,
  type ForeshadowingAnalysis,
  type ForeshadowingStats,
  type ForeshadowingFilter,
  type ForeshadowingFormData,
} from '@/types/foreshadowing';

describe('ForeshadowingType 枚举', () => {
  it('应该包含所有8种伏笔类型', () => {
    expect(Object.keys(ForeshadowingType).length).toBe(8);
  });

  it('应该包含正确的伏笔类型值', () => {
    expect(ForeshadowingType.SUSPENSE).toBe('suspense');
    expect(ForeshadowingType.PROPHECY).toBe('prophecy');
    expect(ForeshadowingType.SETUP).toBe('setup');
    expect(ForeshadowingType.HINT).toBe('hint');
    expect(ForeshadowingType.FORESHADOWING).toBe('foreshadowing');
    expect(ForeshadowingType.PAYOFF).toBe('payoff');
    expect(ForeshadowingType.TWIST).toBe('twist');
    expect(ForeshadowingType.RED_HERRING).toBe('red_herring');
  });

  it('所有伏笔类型值应该是小写字符串', () => {
    Object.values(ForeshadowingType).forEach(value => {
      expect(value).toBe(value.toLowerCase());
      expect(value).not.toMatch(/[A-Z]/);
    });
  });
});

describe('ForeshadowingStatus 枚举', () => {
  it('应该包含所有5种伏笔状态', () => {
    expect(Object.keys(ForeshadowingStatus).length).toBe(5);
  });

  it('应该包含正确的伏笔状态值', () => {
    expect(ForeshadowingStatus.UNREVEALED).toBe('unrevealed');
    expect(ForeshadowingStatus.REVEALED).toBe('revealed');
    expect(ForeshadowingStatus.RESOLVED).toBe('resolved');
    expect(ForeshadowingStatus.ABANDONED).toBe('abandoned');
    expect(ForeshadowingStatus.ONGOING).toBe('ongoing');
  });

  it('所有状态值应该是小写字符串', () => {
    Object.values(ForeshadowingStatus).forEach(value => {
      expect(value).toBe(value.toLowerCase());
      expect(value).not.toMatch(/[A-Z]/);
    });
  });
});

describe('ForeshadowingPriority 枚举', () => {
  it('应该包含所有4种优先级', () => {
    expect(Object.keys(ForeshadowingPriority).length).toBe(4);
  });

  it('应该包含正确的优先级值', () => {
    expect(ForeshadowingPriority.CRITICAL).toBe('critical');
    expect(ForeshadowingPriority.HIGH).toBe('high');
    expect(ForeshadowingPriority.MEDIUM).toBe('medium');
    expect(ForeshadowingPriority.LOW).toBe('low');
  });

  it('优先级应该是可排序的', () => {
    const priorityOrder = [
      ForeshadowingPriority.CRITICAL,
      ForeshadowingPriority.HIGH,
      ForeshadowingPriority.MEDIUM,
      ForeshadowingPriority.LOW,
    ];
    expect(priorityOrder).toHaveLength(4);
  });
});

describe('ForeshadowingImpact 枚举', () => {
  it('应该包含所有4种重要程度', () => {
    expect(Object.keys(ForeshadowingImpact).length).toBe(4);
  });

  it('应该包含正确的影响程度值', () => {
    expect(ForeshadowingImpact.EXTREME).toBe('extreme');
    expect(ForeshadowingImpact.HIGH).toBe('high');
    expect(ForeshadowingImpact.MEDIUM).toBe('medium');
    expect(ForeshadowingImpact.LOW).toBe('low');
  });
});

describe('ForeshadowingRelationType 枚举', () => {
  it('应该包含所有6种关联类型', () => {
    expect(Object.keys(ForeshadowingRelationType).length).toBe(6);
  });

  it('应该包含正确的关联类型值', () => {
    expect(ForeshadowingRelationType.DIRECT).toBe('direct');
    expect(ForeshadowingRelationType.INDIRECT).toBe('indirect');
    expect(ForeshadowingRelationType.COMPLEMENTARY).toBe('complementary');
    expect(ForeshadowingRelationType.CONFLICTING).toBe('conflicting');
    expect(ForeshadowingRelationType.CAUSAL).toBe('causal');
    expect(ForeshadowingRelationType.PARALLEL).toBe('parallel');
  });
});

describe('Foreshadowing 接口', () => {
  it('应该创建有效的伏笔对象', () => {
    const foreshadowing: Foreshadowing = {
      id: 'fs-1',
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
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['测试', '悬念'],
    };

    expect(foreshadowing.id).toBe('fs-1');
    expect(foreshadowing.title).toBe('测试伏笔');
    expect(foreshadowing.type).toBe(ForeshadowingType.SUSPENSE);
    expect(foreshadowing.status).toBe(ForeshadowingStatus.UNREVEALED);
  });

  it('应该支持可选字段', () => {
    const foreshadowing: Foreshadowing = {
      id: 'fs-2',
      title: '测试伏笔2',
      description: '测试',
      type: ForeshadowingType.PROPHECY,
      status: ForeshadowingStatus.REVEALED,
      priority: ForeshadowingPriority.MEDIUM,
      impact: ForeshadowingImpact.MEDIUM,
      relatedCharacters: [],
      relatedEvents: [],
      relatedChapters: [],
      relatedForeshadowings: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      revealChapterId: 'chapter-10',
      actualRevealChapterId: 'chapter-10',
      estimatedRevealTime: 10,
      notes: '这是备注',
      hasConflicts: false,
      conflictCount: 0,
      referenceCount: 5,
    };

    expect(foreshadowing.revealChapterId).toBeDefined();
    expect(foreshadowing.actualRevealChapterId).toBeDefined();
    expect(foreshadowing.estimatedRevealTime).toBe(10);
    expect(foreshadowing.notes).toBe('这是备注');
    expect(foreshadowing.hasConflicts).toBe(false);
    expect(foreshadowing.conflictCount).toBe(0);
    expect(foreshadowing.referenceCount).toBe(5);
  });

  it('关联列表应该是数组类型', () => {
    const foreshadowing: Foreshadowing = {
      id: 'fs-3',
      title: '测试',
      description: '测试',
      type: ForeshadowingType.HINT,
      status: ForeshadowingStatus.UNREVEALED,
      priority: ForeshadowingPriority.LOW,
      impact: ForeshadowingImpact.LOW,
      relatedCharacters: ['char-1', 'char-2'],
      relatedEvents: ['event-1'],
      relatedChapters: ['chapter-1', 'chapter-2', 'chapter-3'],
      relatedForeshadowings: ['fs-1', 'fs-2'],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    };

    expect(Array.isArray(foreshadowing.relatedCharacters)).toBe(true);
    expect(Array.isArray(foreshadowing.relatedEvents)).toBe(true);
    expect(Array.isArray(foreshadowing.relatedChapters)).toBe(true);
    expect(Array.isArray(foreshadowing.relatedForeshadowings)).toBe(true);
    expect(foreshadowing.relatedCharacters).toHaveLength(2);
    expect(foreshadowing.relatedChapters).toHaveLength(3);
  });
});

describe('ForeshadowingRelationship 接口', () => {
  it('应该创建有效的关联关系对象', () => {
    const relationship: ForeshadowingRelationship = {
      id: 'rel-1',
      sourceId: 'fs-1',
      targetId: 'fs-2',
      relationType: ForeshadowingRelationType.DIRECT,
      strength: 0.8,
      description: '直接关联',
      createdAt: new Date(),
    };

    expect(relationship.id).toBe('rel-1');
    expect(relationship.sourceId).toBe('fs-1');
    expect(relationship.targetId).toBe('fs-2');
    expect(relationship.relationType).toBe(ForeshadowingRelationType.DIRECT);
    expect(relationship.strength).toBe(0.8);
    expect(relationship.description).toBe('直接关联');
  });

  it('关联强度应该在0-1之间', () => {
    const validStrengths = [0, 0.25, 0.5, 0.75, 1];

    validStrengths.forEach(strength => {
      const relationship: ForeshadowingRelationship = {
        id: `rel-${strength}`,
        sourceId: 'fs-1',
        targetId: 'fs-2',
        relationType: ForeshadowingRelationType.INDIRECT,
        strength,
        createdAt: new Date(),
      };

      expect(relationship.strength).toBeGreaterThanOrEqual(0);
      expect(relationship.strength).toBeLessThanOrEqual(1);
    });
  });

  it('description应该是可选的', () => {
    const relationship: ForeshadowingRelationship = {
      id: 'rel-no-desc',
      sourceId: 'fs-1',
      targetId: 'fs-2',
      relationType: ForeshadowingRelationType.COMPLEMENTARY,
      strength: 0.6,
      createdAt: new Date(),
    };

    expect(relationship.description).toBeUndefined();
  });
});

describe('ForeshadowingConflict 接口', () => {
  it('应该创建有效的矛盾对象', () => {
    const conflict: ForeshadowingConflict = {
      id: 'conf-1',
      foreshadowingId: 'fs-1',
      conflictType: 'timeline',
      description: '时间线矛盾',
      severity: 5,
      targetId: 'chapter-5',
      suggestions: ['调整章节顺序', '修改揭示时间'],
      resolved: false,
      detectedAt: new Date(),
    };

    expect(conflict.id).toBe('conf-1');
    expect(conflict.foreshadowingId).toBe('fs-1');
    expect(conflict.conflictType).toBe('timeline');
    expect(conflict.severity).toBe(5);
    expect(conflict.resolved).toBe(false);
    expect(conflict.suggestions).toHaveLength(2);
  });

  it('矛盾严重程度应该在1-10之间', () => {
    const severityLevels = [1, 3, 5, 7, 10];

    severityLevels.forEach(severity => {
      const conflict: ForeshadowingConflict = {
        id: `conf-${severity}`,
        foreshadowingId: 'fs-1',
        conflictType: 'character',
        description: `严重程度${severity}`,
        severity,
        resolved: false,
        detectedAt: new Date(),
      };

      expect(conflict.severity).toBeGreaterThanOrEqual(1);
      expect(conflict.severity).toBeLessThanOrEqual(10);
    });
  });

  it('矛盾类型应该是有效的', () => {
    const validTypes: Array<'timeline' | 'character' | 'plot' | 'logic' | 'world'> = [
      'timeline',
      'character',
      'plot',
      'logic',
      'world',
    ];

    validTypes.forEach(conflictType => {
      const conflict: ForeshadowingConflict = {
        id: `conf-${conflictType}`,
        foreshadowingId: 'fs-1',
        conflictType,
        description: `${conflictType}矛盾`,
        severity: 5,
        resolved: false,
        detectedAt: new Date(),
      };

      expect(['timeline', 'character', 'plot', 'logic', 'world']).toContain(
        conflict.conflictType
      );
    });
  });
});

describe('ForeshadowingAnalysis 接口', () => {
  it('应该创建有效的分析结果对象', () => {
    const analysis: ForeshadowingAnalysis = {
      foreshadowingId: 'fs-1',
      importanceScore: 85,
      impactScore: 90,
      complexityScore: 75,
      relationshipCount: 5,
      suggestedRevealTime: 10,
      notes: '分析备注',
      analyzedAt: new Date(),
    };

    expect(analysis.foreshadowingId).toBe('fs-1');
    expect(analysis.importanceScore).toBe(85);
    expect(analysis.impactScore).toBe(90);
    expect(analysis.complexityScore).toBe(75);
    expect(analysis.relationshipCount).toBe(5);
    expect(analysis.suggestedRevealTime).toBe(10);
  });

  it('所有评分应该在0-100之间', () => {
    const analysis: ForeshadowingAnalysis = {
      foreshadowingId: 'fs-1',
      importanceScore: 75,
      impactScore: 80,
      complexityScore: 70,
      relationshipCount: 3,
      analyzedAt: new Date(),
    };

    expect(analysis.importanceScore).toBeGreaterThanOrEqual(0);
    expect(analysis.importanceScore).toBeLessThanOrEqual(100);
    expect(analysis.impactScore).toBeGreaterThanOrEqual(0);
    expect(analysis.impactScore).toBeLessThanOrEqual(100);
    expect(analysis.complexityScore).toBeGreaterThanOrEqual(0);
    expect(analysis.complexityScore).toBeLessThanOrEqual(100);
  });
});

describe('ForeshadowingStats 接口', () => {
  it('应该创建有效的统计对象', () => {
    const stats: ForeshadowingStats = {
      total: 10,
      byStatus: {
        [ForeshadowingStatus.UNREVEALED]: 3,
        [ForeshadowingStatus.REVEALED]: 2,
        [ForeshadowingStatus.RESOLVED]: 4,
        [ForeshadowingStatus.ABANDONED]: 1,
        [ForeshadowingStatus.ONGOING]: 0,
      },
      byType: {
        [ForeshadowingType.SUSPENSE]: 4,
        [ForeshadowingType.PROPHECY]: 2,
        [ForeshadowingType.SETUP]: 2,
        [ForeshadowingType.HINT]: 1,
        [ForeshadowingType.FORESHADOWING]: 1,
        [ForeshadowingType.PAYOFF]: 0,
        [ForeshadowingType.TWIST]: 0,
        [ForeshadowingType.RED_HERRING]: 0,
      },
      byPriority: {
        [ForeshadowingPriority.CRITICAL]: 2,
        [ForeshadowingPriority.HIGH]: 3,
        [ForeshadowingPriority.MEDIUM]: 4,
        [ForeshadowingPriority.LOW]: 1,
      },
      resolved: 4,
      ongoing: 0,
      unrevealed: 3,
      withConflicts: 1,
      avgImportanceScore: 75.5,
      totalRelationships: 15,
      totalConflicts: 1,
    };

    expect(stats.total).toBe(10);
    expect(stats.resolved).toBe(4);
    expect(stats.unrevealed).toBe(3);
    expect(stats.withConflicts).toBe(1);
    expect(stats.avgImportanceScore).toBe(75.5);
    expect(stats.totalRelationships).toBe(15);
    expect(stats.totalConflicts).toBe(1);
  });

  it('各分类数量应该与总数一致', () => {
    const stats: ForeshadowingStats = {
      total: 10,
      byStatus: {
        [ForeshadowingStatus.UNREVEALED]: 5,
        [ForeshadowingStatus.REVEALED]: 2,
        [ForeshadowingStatus.RESOLVED]: 3,
        [ForeshadowingStatus.ABANDONED]: 0,
        [ForeshadowingStatus.ONGOING]: 0,
      },
      byType: {
        [ForeshadowingType.SUSPENSE]: 5,
        [ForeshadowingType.PROPHECY]: 2,
        [ForeshadowingType.SETUP]: 2,
        [ForeshadowingType.HINT]: 1,
        [ForeshadowingType.FORESHADOWING]: 0,
        [ForeshadowingType.PAYOFF]: 0,
        [ForeshadowingType.TWIST]: 0,
        [ForeshadowingType.RED_HERRING]: 0,
      },
      byPriority: {
        [ForeshadowingPriority.CRITICAL]: 2,
        [ForeshadowingPriority.HIGH]: 3,
        [ForeshadowingPriority.MEDIUM]: 4,
        [ForeshadowingPriority.LOW]: 1,
      },
      resolved: 3,
      ongoing: 0,
      unrevealed: 5,
      withConflicts: 2,
      avgImportanceScore: 70,
      totalRelationships: 12,
      totalConflicts: 2,
    };

    const statusTotal = Object.values(stats.byStatus).reduce((sum, count) => sum + count, 0);
    const typeTotal = Object.values(stats.byType).reduce((sum, count) => sum + count, 0);
    const priorityTotal = Object.values(stats.byPriority).reduce((sum, count) => sum + count, 0);

    expect(statusTotal).toBe(stats.total);
    expect(typeTotal).toBe(stats.total);
    expect(priorityTotal).toBe(stats.total);
  });
});

describe('ForeshadowingFilter 接口', () => {
  it('应该创建有效的筛选条件对象', () => {
    const filter: ForeshadowingFilter = {
      statuses: [ForeshadowingStatus.UNREVEALED, ForeshadowingStatus.REVEALED],
      types: [ForeshadowingType.SUSPENSE],
      priorities: [ForeshadowingPriority.HIGH, ForeshadowingPriority.CRITICAL],
      characterIds: ['char-1', 'char-2'],
      chapterIds: ['chapter-1'],
      tags: ['重要', '主线'],
      onlyWithConflicts: true,
      searchQuery: '测试',
      sortBy: 'priority',
      sortOrder: 'desc',
    };

    expect(filter.statuses).toHaveLength(2);
    expect(filter.types).toHaveLength(1);
    expect(filter.priorities).toHaveLength(2);
    expect(filter.onlyWithConflicts).toBe(true);
    expect(filter.searchQuery).toBe('测试');
    expect(filter.sortBy).toBe('priority');
    expect(filter.sortOrder).toBe('desc');
  });

  it('所有筛选字段应该是可选的', () => {
    const filter: ForeshadowingFilter = {};

    expect(filter.statuses).toBeUndefined();
    expect(filter.types).toBeUndefined();
    expect(filter.priorities).toBeUndefined();
    expect(filter.onlyWithConflicts).toBeUndefined();
    expect(filter.searchQuery).toBeUndefined();
    expect(filter.sortBy).toBeUndefined();
    expect(filter.sortOrder).toBeUndefined();
  });

  it('排序字段应该是有效的', () => {
    const validSortBy: Array<'createdAt' | 'updatedAt' | 'priority' | 'impact' | 'title'> = [
      'createdAt',
      'updatedAt',
      'priority',
      'impact',
      'title',
    ];

    validSortBy.forEach(sortBy => {
      const filter: ForeshadowingFilter = { sortBy };
      expect(['createdAt', 'updatedAt', 'priority', 'impact', 'title']).toContain(filter.sortBy);
    });
  });

  it('排序方向应该是asc或desc', () => {
    const validSortOrders: Array<'asc' | 'desc'> = ['asc', 'desc'];

    validSortOrders.forEach(sortOrder => {
      const filter: ForeshadowingFilter = { sortOrder };
      expect(['asc', 'desc']).toContain(filter.sortOrder);
    });
  });
});

describe('ForeshadowingFormData 接口', () => {
  it('应该创建有效的表单数据对象', () => {
    const formData: ForeshadowingFormData = {
      title: '新伏笔',
      description: '这是一个新的伏笔',
      type: ForeshadowingType.SUSPENSE,
      status: ForeshadowingStatus.UNREVEALED,
      priority: ForeshadowingPriority.HIGH,
      impact: ForeshadowingImpact.HIGH,
      relatedCharacters: ['char-1'],
      relatedEvents: ['event-1'],
      relatedChapters: ['chapter-1'],
      relatedForeshadowings: ['fs-1'],
      revealChapterId: 'chapter-10',
      estimatedRevealTime: 10,
      tags: ['重要', '主线'],
      notes: '备注信息',
    };

    expect(formData.title).toBe('新伏笔');
    expect(formData.type).toBe(ForeshadowingType.SUSPENSE);
    expect(formData.priority).toBe(ForeshadowingPriority.HIGH);
    expect(formData.relatedCharacters).toHaveLength(1);
    expect(formData.tags).toHaveLength(2);
  });

  it('表单数据应该与伏实体兼容', () => {
    const formData: ForeshadowingFormData = {
      title: '测试',
      description: '测试',
      type: ForeshadowingType.HINT,
      status: ForeshadowingStatus.UNREVEALED,
      priority: ForeshadowingPriority.MEDIUM,
      impact: ForeshadowingImpact.MEDIUM,
      relatedCharacters: [],
      relatedEvents: [],
      relatedChapters: [],
      relatedForeshadowings: [],
      tags: [],
    };

    // 表单数据可以转换为伏笔实体（添加id、时间戳等）
    const foreshadowing: Foreshadowing = {
      ...formData,
      id: 'fs-new',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(foreshadowing.title).toBe(formData.title);
    expect(foreshadowing.description).toBe(formData.description);
    expect(foreshadowing.type).toBe(formData.type);
  });
});
