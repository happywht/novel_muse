/**
 * ForeshadowingList 组件测试
 *
 * 测试伏笔列表组件
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ForeshadowingList } from '../ForeshadowingList';
import { type Foreshadowing } from '@/types/foreshadowing';

// Mock store
const mockGetFilteredForeshadowings = vi.fn(() => []);
const mockGetStatistics = vi.fn(() => ({
  total: 0,
  resolved: 0,
  ongoing: 0,
  unrevealed: 0,
  withConflicts: 0,
}));
const mockSetSelectedForeshadowingId = vi.fn();

vi.mock('@/store', () => ({
  useProjectStore: vi.fn((selector) => {
    const state = {
      getFilteredForeshadowings: mockGetFilteredForeshadowings,
      getStatistics: mockGetStatistics,
      selectedForeshadowingId: null,
      setSelectedForeshadowingId: mockSetSelectedForeshadowingId,
      filter: {
        searchQuery: '',
        sortBy: 'updatedAt' as const,
        sortOrder: 'desc' as const,
      },
    };
    return selector ? selector(state) : state;
  }),
}));

describe('ForeshadowingList - 基础渲染', () => {
  beforeEach(() => {
    mockGetFilteredForeshadowings.mockClear();
    mockGetStatistics.mockClear();
    mockSetSelectedForeshadowingId.mockClear();
  });

  it('应该正确渲染列表组件', () => {
    const { container } = render(<ForeshadowingList />);
    expect(container).toBeInTheDocument();
  });

  it('应该显示筛选器', () => {
    render(<ForeshadowingList />);
    expect(screen.getByTestId('foreshadowing-search-input')).toBeInTheDocument();
  });

  it('应该调用getFilteredForeshadowings获取伏笔列表', () => {
    render(<ForeshadowingList />);
    expect(mockGetFilteredForeshadowings).toHaveBeenCalled();
  });
});

describe('ForeshadowingList - 空列表状态', () => {
  beforeEach(() => {
    mockGetFilteredForeshadowings.mockReturnValue([]);
    mockGetStatistics.mockReturnValue({
      total: 0,
      resolved: 0,
      ongoing: 0,
      unrevealed: 0,
      withConflicts: 0,
    });
  });

  it('应该显示空列表提示', () => {
    render(<ForeshadowingList />);
    expect(screen.getByText('暂无伏笔')).toBeInTheDocument();
  });

  it('空列表时应该显示创建按钮', () => {
    render(<ForeshadowingList />);
    expect(screen.getByText('创建第一个伏笔')).toBeInTheDocument();
  });
});

describe('ForeshadowingList - 有伏笔时', () => {
  const mockForeshadowings: Foreshadowing[] = [
    {
      id: 'fs-1',
      title: '测试伏笔1',
      description: '描述1',
      type: 'suspense' as any,
      status: 'unrevealed' as any,
      priority: 'high' as any,
      impact: 0.8,
      relatedCharacters: [],
      relatedEvents: [],
      relatedChapters: [],
      relatedForeshadowings: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    },
    {
      id: 'fs-2',
      title: '测试伏笔2',
      description: '描述2',
      type: 'prophecy' as any,
      status: 'revealed' as any,
      priority: 'medium' as any,
      impact: 0.5,
      relatedCharacters: [],
      relatedEvents: [],
      relatedChapters: [],
      relatedForeshadowings: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    },
  ];

  beforeEach(() => {
    mockGetFilteredForeshadowings.mockReturnValue(mockForeshadowings);
    mockGetStatistics.mockReturnValue({
      total: 2,
      resolved: 0,
      ongoing: 0,
      unrevealed: 2,
      withConflicts: 0,
      byStatus: {},
      byType: {},
      byPriority: {},
      totalRelationships: 0,
      avgImportanceScore: 0,
    });
  });

  it('应该显示所有伏笔卡片', () => {
    render(<ForeshadowingList />);
    expect(screen.getByText('测试伏笔1')).toBeInTheDocument();
    expect(screen.getByText('测试伏笔2')).toBeInTheDocument();
  });

  it('应该显示统计信息', () => {
    render(<ForeshadowingList />);
    // "2"出现在多个地方（总数、共2个伏笔、日期等），使用getAllByText
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
  });
});

describe('ForeshadowingList - 交互', () => {
  it('应该支持选择伏笔', () => {
    const onSelect = vi.fn();
    const mockForeshadowing: Foreshadowing = {
      id: 'fs-1',
      title: '测试伏笔',
      description: '描述',
      type: 'suspense' as any,
      status: 'unrevealed' as any,
      priority: 'high' as any,
      impact: 0.8,
      relatedCharacters: [],
      relatedEvents: [],
      relatedChapters: [],
      relatedForeshadowings: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    };

    mockGetFilteredForeshadowings.mockReturnValue([mockForeshadowing]);

    render(<ForeshadowingList onForeshadowingSelect={onSelect} />);
    const card = screen.getByText('测试伏笔');
    fireEvent.click(card);

    expect(mockSetSelectedForeshadowingId).toHaveBeenCalledWith('fs-1');
  });
});
