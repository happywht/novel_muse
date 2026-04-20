/**
 * ForeshadowingStats 组件测试
 *
 * 测试伏笔统计仪表板组件
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ForeshadowingStats } from '../ForeshadowingStats';
import { ForeshadowingType, ForeshadowingStatus, ForeshadowingPriority } from '@/types/foreshadowing';

// Mock store
const mockGetStatistics = vi.fn(() => ({
  total: 11,
  byStatus: {
    [ForeshadowingStatus.UNREVEALED]: 5,
    [ForeshadowingStatus.REVEALED]: 3,
    [ForeshadowingStatus.RESOLVED]: 2,
    [ForeshadowingStatus.ABANDONED]: 1,
    [ForeshadowingStatus.ONGOING]: 0,
  },
  byType: {
    [ForeshadowingType.SUSPENSE]: 4,
    [ForeshadowingType.PROPHECY]: 2,
    [ForeshadowingType.SETUP]: 3,
    [ForeshadowingType.HINT]: 1,
    [ForeshadowingType.FORESHADOWING]: 0,
    [ForeshadowingType.PAYOFF]: 1,
    [ForeshadowingType.TWIST]: 0,
    [ForeshadowingType.RED_HERRING]: 0,
  },
  byPriority: {
    [ForeshadowingPriority.CRITICAL]: 1,
    [ForeshadowingPriority.HIGH]: 4,
    [ForeshadowingPriority.MEDIUM]: 5,
    [ForeshadowingPriority.LOW]: 1,
  },
  withConflicts: 2,
  totalRelationships: 5,
  resolved: 2,
  ongoing: 0,
  avgImportanceScore: 0.7,
}));

const mockGetConflictReport = vi.fn(() => ({
  totalConflicts: 2,
  affectedForeshadowings: 2,
  byType: { timeline: 1, character: 1 },
  highSeverityConflicts: 1,
  summary: '发现2个矛盾',
}));

vi.mock('@/store', () => ({
  useProjectStore: vi.fn((selector) => {
    const state = {
      foreshadowings: [],
      relationships: [],
      getStatistics: mockGetStatistics,
      getConflictReport: mockGetConflictReport,
    };
    return selector ? selector(state) : state;
  }),
}));

describe('ForeshadowingStats - 基础渲染', () => {
  beforeEach(() => {
    mockGetStatistics.mockClear();
    mockGetConflictReport.mockClear();
  });

  it('应该正确渲染统计组件', () => {
    const { container } = render(<ForeshadowingStats />);
    expect(container).toBeInTheDocument();
  });

  it('应该显示伏笔总数', () => {
    render(<ForeshadowingStats />);
    expect(screen.getByText(/11/)).toBeInTheDocument();
  });

  it('应该调用getStatistics获取统计数据', () => {
    render(<ForeshadowingStats />);
    expect(mockGetStatistics).toHaveBeenCalledTimes(1);
  });
});

describe('ForeshadowingStats - 统计信息显示', () => {
  beforeEach(() => {
    mockGetStatistics.mockClear();
    mockGetConflictReport.mockClear();
  });

  it('应该显示状态分布', () => {
    render(<ForeshadowingStats />);
    // 只断言count > 0的状态（根据mock数据）
    expect(screen.getByText('未揭示')).toBeInTheDocument();
    expect(screen.getByText('已揭示')).toBeInTheDocument();
    // "已解决"出现两次（StatCard和DistributionCard），使用getAllByText
    expect(screen.getAllByText('已解决').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('已废弃')).toBeInTheDocument();
  });

  it('应该显示类型分布', () => {
    render(<ForeshadowingStats />);
    // 只断言count > 0的类型（根据mock数据）
    expect(screen.getByText('悬念')).toBeInTheDocument();
    expect(screen.getByText('预言')).toBeInTheDocument();
    expect(screen.getByText('伏线')).toBeInTheDocument();
    expect(screen.getByText('暗示')).toBeInTheDocument();
    expect(screen.getByText('回报')).toBeInTheDocument();
  });

  it('应该显示优先级分布', () => {
    render(<ForeshadowingStats />);
    // 只断言count > 0的优先级（根据mock数据）
    expect(screen.getByText('核心')).toBeInTheDocument();
    expect(screen.getByText('重要')).toBeInTheDocument();
    expect(screen.getByText('普通')).toBeInTheDocument();
    expect(screen.getByText('次要')).toBeInTheDocument();
  });

  it('应该显示矛盾统计', () => {
    render(<ForeshadowingStats />);
    expect(mockGetConflictReport).toHaveBeenCalled();
  });
});

describe('ForeshadowingStats - 空数据状态', () => {
  it('应该处理空伏笔列表', () => {
    mockGetStatistics.mockReturnValue({
      total: 0,
      byStatus: {},
      byType: {},
      byPriority: {},
      withConflicts: 0,
      totalRelationships: 0,
      resolved: 0,
      ongoing: 0,
      avgImportanceScore: 0,
    });

    const { container } = render(<ForeshadowingStats />);
    expect(container).toBeInTheDocument();
  });

  it('应该正确显示零值', () => {
    mockGetStatistics.mockReturnValue({
      total: 0,
      byStatus: {},
      byType: {},
      byPriority: {},
      withConflicts: 0,
      totalRelationships: 0,
      resolved: 0,
      ongoing: 0,
      avgImportanceScore: 0,
    });

    render(<ForeshadowingStats />);
    // 多个地方显示0，使用getAllByText
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThan(0);
  });
});
