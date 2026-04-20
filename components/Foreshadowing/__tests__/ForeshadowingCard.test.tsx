/**
 * ForeshadowingCard 组件测试
 *
 * 测试伏笔卡片组件的渲染和交互
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ForeshadowingCard } from '../ForeshadowingCard';
import {
  ForeshadowingType,
  ForeshadowingStatus,
  ForeshadowingPriority,
  type Foreshadowing,
} from '@/types/foreshadowing';

/**
 * 创建测试用的伏笔对象
 */
function createTestForeshadowing(overrides: Partial<Foreshadowing> = {}): Foreshadowing {
  return {
    id: 'fs-1',
    title: '测试伏笔',
    description: '这是一个测试伏笔的描述',
    type: ForeshadowingType.SUSPENSE,
    status: ForeshadowingStatus.UNREVEALED,
    priority: ForeshadowingPriority.HIGH,
    impact: 0.8,
    relatedCharacters: ['char-1', 'char-2'],
    relatedEvents: ['event-1'],
    relatedChapters: ['chapter-1', 'chapter-2'],
    relatedForeshadowings: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    tags: ['标签1', '标签2', '标签3', '标签4'],
    hasConflicts: false,
    ...overrides,
  };
}

describe('ForeshadowingCard - 基础渲染', () => {
  it('应该正确渲染伏笔卡片', () => {
    const foreshadowing = createTestForeshadowing();
    const { container } = render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(container.querySelector('.foreshadowing-card')).toBeInTheDocument();
  });

  it('应该显示伏笔标题', () => {
    const foreshadowing = createTestForeshadowing({ title: '伏笔标题测试' });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(screen.getByText('伏笔标题测试')).toBeInTheDocument();
  });

  it('应该显示伏笔描述', () => {
    const foreshadowing = createTestForeshadowing({ description: '这是伏笔描述' });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(screen.getByText('这是伏笔描述')).toBeInTheDocument();
  });

  it('应该显示更新时间', () => {
    const foreshadowing = createTestForeshadowing({
      updatedAt: new Date('2026-01-15'),
    });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(screen.getByText('2026/1/15')).toBeInTheDocument();
  });
});

describe('ForeshadowingCard - 标签显示', () => {
  it('应该显示伏笔类型标签', () => {
    const foreshadowing = createTestForeshadowing({
      type: ForeshadowingType.SUSPENSE,
    });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(screen.getByText('悬念')).toBeInTheDocument();
  });

  it('应该显示所有8种类型标签', () => {
    const types: ForeshadowingType[] = [
      ForeshadowingType.SUSPENSE,
      ForeshadowingType.PROPHECY,
      ForeshadowingType.SETUP,
      ForeshadowingType.HINT,
      ForeshadowingType.FORESHADOWING,
      ForeshadowingType.PAYOFF,
      ForeshadowingType.TWIST,
      ForeshadowingType.RED_HERRING,
    ];

    const labels = ['悬念', '预言', '伏线', '暗示', '伏笔', '回报', '反转', '红鲱鱼'];

    types.forEach((type, index) => {
      const foreshadowing = createTestForeshadowing({ type });
      const { unmount } = render(<ForeshadowingCard foreshadowing={foreshadowing} />);

      expect(screen.getByText(labels[index])).toBeInTheDocument();
      unmount();
    });
  });

  it('应该显示状态标签', () => {
    const foreshadowing = createTestForeshadowing({
      status: ForeshadowingStatus.REVEALED,
    });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(screen.getByText('已揭示')).toBeInTheDocument();
  });

  it('应该显示所有5种状态标签', () => {
    const statuses: ForeshadowingStatus[] = [
      ForeshadowingStatus.UNREVEALED,
      ForeshadowingStatus.REVEALED,
      ForeshadowingStatus.RESOLVED,
      ForeshadowingStatus.ABANDONED,
      ForeshadowingStatus.ONGOING,
    ];

    const labels = ['未揭示', '已揭示', '已解决', '已废弃', '进行中'];

    statuses.forEach((status, index) => {
      const foreshadowing = createTestForeshadowing({ status });
      const { unmount } = render(<ForeshadowingCard foreshadowing={foreshadowing} />);

      expect(screen.getByText(labels[index])).toBeInTheDocument();
      unmount();
    });
  });

  it('应该显示优先级标签', () => {
    const foreshadowing = createTestForeshadowing({
      priority: ForeshadowingPriority.CRITICAL,
    });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(screen.getByText('核心')).toBeInTheDocument();
  });

  it('应该显示所有4种优先级标签', () => {
    const priorities: ForeshadowingPriority[] = [
      ForeshadowingPriority.CRITICAL,
      ForeshadowingPriority.HIGH,
      ForeshadowingPriority.MEDIUM,
      ForeshadowingPriority.LOW,
    ];

    const labels = ['核心', '重要', '普通', '次要'];

    priorities.forEach((priority, index) => {
      const foreshadowing = createTestForeshadowing({ priority });
      const { unmount } = render(<ForeshadowingCard foreshadowing={foreshadowing} />);

      expect(screen.getByText(labels[index])).toBeInTheDocument();
      unmount();
    });
  });
});

describe('ForeshadowingCard - 关联信息显示', () => {
  it('应该显示关联角色数量', () => {
    const foreshadowing = createTestForeshadowing({
      relatedCharacters: ['char-1', 'char-2', 'char-3'],
    });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(screen.getByText('👥 3 角色')).toBeInTheDocument();
  });

  it('应该显示关联事件数量', () => {
    const foreshadowing = createTestForeshadowing({
      relatedEvents: ['event-1', 'event-2'],
    });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(screen.getByText('📜 2 事件')).toBeInTheDocument();
  });

  it('应该显示关联章节数量', () => {
    const foreshadowing = createTestForeshadowing({
      relatedChapters: ['chapter-1', 'chapter-2', 'chapter-3', 'chapter-4'],
    });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(screen.getByText('📖 4 章节')).toBeInTheDocument();
  });

  it('应该同时显示所有关联信息', () => {
    const foreshadowing = createTestForeshadowing({
      relatedCharacters: ['char-1'],
      relatedEvents: ['event-1'],
      relatedChapters: ['chapter-1'],
    });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(screen.getByText('👥 1 角色')).toBeInTheDocument();
    expect(screen.getByText('📜 1 事件')).toBeInTheDocument();
    expect(screen.getByText('📖 1 章节')).toBeInTheDocument();
  });

  it('没有关联信息时不显示关联部分', () => {
    const foreshadowing = createTestForeshadowing({
      relatedCharacters: [],
      relatedEvents: [],
      relatedChapters: [],
    });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(screen.queryByText(/角色/)).not.toBeInTheDocument();
    expect(screen.queryByText(/事件/)).not.toBeInTheDocument();
    expect(screen.queryByText(/章节/)).not.toBeInTheDocument();
  });
});

describe('ForeshadowingCard - 标签显示', () => {
  it('应该显示前3个标签', () => {
    const foreshadowing = createTestForeshadowing({
      tags: ['标签1', '标签2', '标签3', '标签4', '标签5'],
    });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(screen.getByText('标签1')).toBeInTheDocument();
    expect(screen.getByText('标签2')).toBeInTheDocument();
    expect(screen.getByText('标签3')).toBeInTheDocument();
  });

  it('应该显示超出标签的数量', () => {
    const foreshadowing = createTestForeshadowing({
      tags: ['标签1', '标签2', '标签3', '标签4'],
    });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('应该正确计算超出数量', () => {
    const foreshadowing = createTestForeshadowing({
      tags: ['标签1', '标签2', '标签3', '标签4', '标签5', '标签6'],
    });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('没有标签时不显示标签部分', () => {
    const foreshadowing = createTestForeshadowing({
      tags: [],
    });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    // 标签1-6不应该出现
    expect(screen.queryByText('标签1')).not.toBeInTheDocument();
  });
});

describe('ForeshadowingCard - 矛盾警告', () => {
  it('有矛盾时应该显示警告标志', () => {
    const foreshadowing = createTestForeshadowing({
      hasConflicts: true,
    });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(screen.getByText('⚠ 矛盾')).toBeInTheDocument();
  });

  it('没有矛盾时不显示警告标志', () => {
    const foreshadowing = createTestForeshadowing({
      hasConflicts: false,
    });
    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(screen.queryByText('⚠ 矛盾')).not.toBeInTheDocument();
  });
});

describe('ForeshadowingCard - 选中状态', () => {
  it('未选中时应该有默认样式', () => {
    const foreshadowing = createTestForeshadowing();
    const { container } = render(
      <ForeshadowingCard foreshadowing={foreshadowing} isSelected={false} />
    );

    const card = container.querySelector('.foreshadowing-card');
    expect(card).not.toHaveClass('selected');
  });

  it('选中时应该有选中样式', () => {
    const foreshadowing = createTestForeshadowing();
    const { container } = render(
      <ForeshadowingCard foreshadowing={foreshadowing} isSelected={true} />
    );

    const card = container.querySelector('.foreshadowing-card');
    expect(card).toHaveClass('selected');
  });
});

describe('ForeshadowingCard - 交互', () => {
  it('点击卡片应该触发onSelect回调', () => {
    const foreshadowing = createTestForeshadowing();
    const onSelect = vi.fn();

    const { container } = render(
      <ForeshadowingCard foreshadowing={foreshadowing} onSelect={onSelect} />
    );

    const card = container.querySelector('.foreshadowing-card') as HTMLElement;
    fireEvent.click(card);

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('点击编辑按钮应该触发onEdit回调', () => {
    const foreshadowing = createTestForeshadowing();
    const onEdit = vi.fn();

    render(<ForeshadowingCard foreshadowing={foreshadowing} onEdit={onEdit} />);

    const editButton = screen.getByTestId(`edit-foreshadowing-${foreshadowing.id}`);
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('点击编辑按钮不应该触发onSelect回调', () => {
    const foreshadowing = createTestForeshadowing();
    const onSelect = vi.fn();
    const onEdit = vi.fn();

    render(
      <ForeshadowingCard
        foreshadowing={foreshadowing}
        onSelect={onSelect}
        onEdit={onEdit}
      />
    );

    const editButton = screen.getByTestId(`edit-foreshadowing-${foreshadowing.id}`);
    fireEvent.click(editButton);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('没有onEdit回调时不应该报错', () => {
    const foreshadowing = createTestForeshadowing();

    const { container } = render(
      <ForeshadowingCard foreshadowing={foreshadowing} />
    );

    const editButton = screen.getByTestId(`edit-foreshadowing-${foreshadowing.id}`);
    expect(() => fireEvent.click(editButton)).not.toThrow();
  });
});

describe('ForeshadowingCard - 边界情况', () => {
  it('应该处理空标题', () => {
    const foreshadowing = createTestForeshadowing({ title: '' });
    const { container } = render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(container.querySelector('.foreshadowing-card')).toBeInTheDocument();
  });

  it('应该处理空描述', () => {
    const foreshadowing = createTestForeshadowing({ description: '' });
    const { container } = render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    expect(container.querySelector('.foreshadowing-card')).toBeInTheDocument();
  });

  it('应该处理超长描述（应该截断）', () => {
    const longDescription = '这是一个非常非常非常非常非常非常非常非常非常非常长的描述';
    const foreshadowing = createTestForeshadowing({
      description: longDescription,
    });

    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    // 描述应该被截断显示（通过CSS line-clamp）
    const description = screen.getByText(longDescription);
    expect(description).toBeInTheDocument();
    expect(description).toHaveStyle({ WebkitLineClamp: '3' });
  });

  it('应该处理大量标签', () => {
    const manyTags = Array.from({ length: 100 }, (_, i) => `标签${i}`);
    const foreshadowing = createTestForeshadowing({
      tags: manyTags,
    });

    render(<ForeshadowingCard foreshadowing={foreshadowing} />);

    // 应该只显示前3个和超出数量
    expect(screen.getByText('标签0')).toBeInTheDocument();
    expect(screen.getByText('标签1')).toBeInTheDocument();
    expect(screen.getByText('标签2')).toBeInTheDocument();
    expect(screen.getByText('+97')).toBeInTheDocument();
  });
});
