/**
 * ForeshadowingForm 组件测试
 *
 * 测试伏笔表单组件的创建和编辑功能
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ForeshadowingForm } from '../ForeshadowingForm';
import {
  ForeshadowingType,
  ForeshadowingStatus,
  ForeshadowingPriority,
  ForeshadowingImpact,
  type Foreshadowing,
  type ForeshadowingFormData,
} from '@/types/foreshadowing';

// Mock store
const mockAddForeshadowing = vi.fn();
const mockUpdateForeshadowing = vi.fn();
const mockOnClose = vi.fn();

vi.mock('@/store', () => ({
  useProjectStore: vi.fn((selector) => {
    const state = {
      addForeshadowing: mockAddForeshadowing,
      updateForeshadowing: mockUpdateForeshadowing,
      project: {
        characters: [],
        worldSettings: [],
        echoes: [],
      },
    };
    return selector ? selector(state) : state;
  }),
}));

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
    impact: ForeshadowingImpact.HIGH,
    relatedCharacters: [],
    relatedEvents: [],
    relatedChapters: [],
    relatedForeshadowings: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    tags: ['标签1', '标签2'],
    notes: '测试备注',
    ...overrides,
  };
}

describe('ForeshadowingForm - 基础渲染', () => {
  beforeEach(() => {
    mockAddForeshadowing.mockClear();
    mockUpdateForeshadowing.mockClear();
    mockOnClose.mockClear();
  });

  it('应该正确渲染创建模式表单', () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    // 使用 getAllByText 因为有两个地方显示"创建伏笔"（标题和按钮）
    const createButtons = screen.getAllByText('创建伏笔');
    expect(createButtons.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByTestId('submit-foreshadowing-form')).toBeInTheDocument();
  });

  it('应该正确渲染编辑模式表单', () => {
    const foreshadowing = createTestForeshadowing();
    render(<ForeshadowingForm foreshadowing={foreshadowing} onClose={mockOnClose} />);

    expect(screen.getByText('编辑伏笔')).toBeInTheDocument();
    expect(screen.getByTestId('submit-foreshadowing-form')).toHaveTextContent('保存修改');
  });

  it('应该渲染所有表单字段', () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    expect(screen.getByTestId('foreshadowing-title-input')).toBeInTheDocument();
    expect(screen.getByTestId('foreshadowing-description-input')).toBeInTheDocument();
    expect(screen.getByTestId('foreshadowing-type-select')).toBeInTheDocument();
    expect(screen.getByTestId('foreshadowing-status-select')).toBeInTheDocument();
    expect(screen.getByTestId('foreshadowing-priority-select')).toBeInTheDocument();
    expect(screen.getByTestId('foreshadowing-impact-select')).toBeInTheDocument();
    expect(screen.getByTestId('foreshadowing-tag-input')).toBeInTheDocument();
    expect(screen.getByTestId('foreshadowing-notes-input')).toBeInTheDocument();
  });

  it('应该显示所有字段标签', () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    expect(screen.getByText('标题 *')).toBeInTheDocument();
    expect(screen.getByText('详细描述 *')).toBeInTheDocument();
    expect(screen.getByText('类型')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
    expect(screen.getByText('优先级')).toBeInTheDocument();
    expect(screen.getByText('重要程度')).toBeInTheDocument();
    expect(screen.getByText('标签')).toBeInTheDocument();
    expect(screen.getByText('备注（可选）')).toBeInTheDocument();
  });
});

describe('ForeshadowingForm - 编辑模式初始化', () => {
  beforeEach(() => {
    mockAddForeshadowing.mockClear();
    mockUpdateForeshadowing.mockClear();
    mockOnClose.mockClear();
  });

  it('编辑模式应该预填充伏笔数据', () => {
    const foreshadowing = createTestForeshadowing({
      title: '现有伏笔',
      description: '现有描述',
      type: ForeshadowingType.PAYOFF,
      status: ForeshadowingStatus.REVEALED,
    });

    render(<ForeshadowingForm foreshadowing={foreshadowing} onClose={mockOnClose} />);

    const titleInput = screen.getByTestId('foreshadowing-title-input') as HTMLInputElement;
    const descInput = screen.getByTestId('foreshadowing-description-input') as HTMLTextAreaElement;

    expect(titleInput.value).toBe('现有伏笔');
    expect(descInput.value).toBe('现有描述');
  });

  it('编辑模式应该预填充标签', () => {
    const foreshadowing = createTestForeshadowing({
      tags: ['标签A', '标签B', '标签C'],
    });

    render(<ForeshadowingForm foreshadowing={foreshadowing} onClose={mockOnClose} />);

    expect(screen.getByText('标签A')).toBeInTheDocument();
    expect(screen.getByText('标签B')).toBeInTheDocument();
    expect(screen.getByText('标签C')).toBeInTheDocument();
  });
});

describe('ForeshadowingForm - 表单输入', () => {
  beforeEach(() => {
    mockAddForeshadowing.mockClear();
    mockUpdateForeshadowing.mockClear();
    mockOnClose.mockClear();
  });

  it('应该允许输入标题', () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const titleInput = screen.getByTestId('foreshadowing-title-input');
    fireEvent.change(titleInput, { target: { value: '新伏笔标题' } });

    expect((titleInput as HTMLInputElement).value).toBe('新伏笔标题');
  });

  it('应该允许输入描述', () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const descInput = screen.getByTestId('foreshadowing-description-input');
    fireEvent.change(descInput, { target: { value: '这是一个详细的描述' } });

    expect((descInput as HTMLTextAreaElement).value).toBe('这是一个详细的描述');
  });

  it('应该允许选择类型', () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const typeSelect = screen.getByTestId('foreshadowing-type-select');
    fireEvent.change(typeSelect, { target: { value: ForeshadowingType.PROPHECY } });

    expect((typeSelect as HTMLSelectElement).value).toBe(ForeshadowingType.PROPHECY);
  });

  it('应该允许选择状态', () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const statusSelect = screen.getByTestId('foreshadowing-status-select');
    fireEvent.change(statusSelect, { target: { value: ForeshadowingStatus.RESOLVED } });

    expect((statusSelect as HTMLSelectElement).value).toBe(ForeshadowingStatus.RESOLVED);
  });

  it('应该允许选择优先级', () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const prioritySelect = screen.getByTestId('foreshadowing-priority-select');
    fireEvent.change(prioritySelect, { target: { value: ForeshadowingPriority.CRITICAL } });

    expect((prioritySelect as HTMLSelectElement).value).toBe(ForeshadowingPriority.CRITICAL);
  });

  it('应该允许选择重要程度', () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const impactSelect = screen.getByTestId('foreshadowing-impact-select');
    fireEvent.change(impactSelect, { target: { value: ForeshadowingImpact.EXTREME } });

    expect((impactSelect as HTMLSelectElement).value).toBe(ForeshadowingImpact.EXTREME);
  });
});

describe('ForeshadowingForm - 标签管理', () => {
  beforeEach(() => {
    mockAddForeshadowing.mockClear();
    mockUpdateForeshadowing.mockClear();
    mockOnClose.mockClear();
  });

  it('应该允许添加标签', () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const tagInput = screen.getByTestId('foreshadowing-tag-input');
    const addButton = screen.getByTestId('add-tag-button');

    fireEvent.change(tagInput, { target: { value: '新标签' } });
    fireEvent.click(addButton);

    expect(screen.getByText('新标签')).toBeInTheDocument();
  });

  it('应该允许按回车添加标签', () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const tagInput = screen.getByTestId('foreshadowing-tag-input');

    fireEvent.change(tagInput, { target: { value: '回车标签' } });
    fireEvent.keyPress(tagInput, { key: 'Enter', code: 'Enter', charCode: 13 });

    expect(screen.getByText('回车标签')).toBeInTheDocument();
  });

  it('应该允许删除标签', () => {
    const foreshadowing = createTestForeshadowing({
      tags: ['标签1', '标签2'],
    });

    const { container } = render(<ForeshadowingForm foreshadowing={foreshadowing} onClose={mockOnClose} />);

    // 找到所有包含"×"的按钮（标签删除按钮）
    const deleteButtons = container.querySelectorAll('button[type="button"]');
    const tag1Element = screen.getByText('标签1');
    const tag1Parent = tag1Element.closest('span');
    const deleteButton = tag1Parent?.querySelector('button');

    if (deleteButton) {
      fireEvent.click(deleteButton);
    }

    expect(screen.queryByText('标签1')).not.toBeInTheDocument();
    expect(screen.getByText('标签2')).toBeInTheDocument();
  });

  it('不应该添加重复的标签', () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const tagInput = screen.getByTestId('foreshadowing-tag-input');
    const addButton = screen.getByTestId('add-tag-button');

    fireEvent.change(tagInput, { target: { value: '重复标签' } });
    fireEvent.click(addButton);

    fireEvent.change(tagInput, { target: { value: '重复标签' } });
    fireEvent.click(addButton);

    // 应该只有一个"重复标签"
    const tags = screen.getAllByText('重复标签');
    expect(tags.length).toBe(1);
  });

  it('应该忽略空白标签', () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const tagInput = screen.getByTestId('foreshadowing-tag-input');
    const addButton = screen.getByTestId('add-tag-button');

    fireEvent.change(tagInput, { target: { value: '   ' } });
    fireEvent.click(addButton);

    // 不应该有空白标签显示
    expect(screen.queryByText(/^\s+$/)).not.toBeInTheDocument();
  });
});

describe('ForeshadowingForm - 表单验证', () => {
  beforeEach(() => {
    mockAddForeshadowing.mockClear();
    mockUpdateForeshadowing.mockClear();
    mockOnClose.mockClear();
  });

  it('空标题应该显示错误', async () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const submitButton = screen.getByTestId('submit-foreshadowing-form');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('标题不能为空')).toBeInTheDocument();
    });
  });

  it('空描述应该显示错误', async () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const titleInput = screen.getByTestId('foreshadowing-title-input');

    // 先输入标题，避免标题错误
    fireEvent.change(titleInput, { target: { value: '标题' } });

    // 等待状态更新
    await waitFor(() => {
      expect((titleInput as HTMLInputElement).value).toBe('标题');
    });

    // 提交表单
    const submitButton = screen.getByTestId('submit-foreshadowing-form');
    fireEvent.click(submitButton);

    // 等待错误信息显示
    await waitFor(
      () => {
        // 验证逻辑先检查长度再检查是否为空，所以会显示"描述至少需要10个字符"
        expect(screen.getByText('描述至少需要10个字符')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('描述少于10个字符应该显示错误', async () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const titleInput = screen.getByTestId('foreshadowing-title-input');
    const descInput = screen.getByTestId('foreshadowing-description-input');

    fireEvent.change(titleInput, { target: { value: '标题' } });
    fireEvent.change(descInput, { target: { value: '短描述' } });

    const submitButton = screen.getByTestId('submit-foreshadowing-form');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('描述至少需要10个字符')).toBeInTheDocument();
    });
  });

  it('有效的表单不应该有错误', async () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const titleInput = screen.getByTestId('foreshadowing-title-input');
    const descInput = screen.getByTestId('foreshadowing-description-input');

    fireEvent.change(titleInput, { target: { value: '有效标题' } });
    fireEvent.change(descInput, { target: { value: '这是一个有效的描述，长度足够' } });

    const submitButton = screen.getByTestId('submit-foreshadowing-form');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('不能为空')).not.toBeInTheDocument();
    });
  });
});

describe('ForeshadowingForm - 表单提交', () => {
  beforeEach(() => {
    mockAddForeshadowing.mockClear();
    mockUpdateForeshadowing.mockClear();
    mockOnClose.mockClear();
  });

  it('创建模式应该调用addForeshadowing', async () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const titleInput = screen.getByTestId('foreshadowing-title-input');
    const descInput = screen.getByTestId('foreshadowing-description-input');

    fireEvent.change(titleInput, { target: { value: '新伏笔' } });
    fireEvent.change(descInput, { target: { value: '这是一个新伏笔的描述' } });

    const submitButton = screen.getByTestId('submit-foreshadowing-form');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddForeshadowing).toHaveBeenCalledTimes(1);
      expect(mockAddForeshadowing).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '新伏笔',
          description: '这是一个新伏笔的描述',
        })
      );
    });
  });

  it('编辑模式应该调用updateForeshadowing', async () => {
    const foreshadowing = createTestForeshadowing();

    render(<ForeshadowingForm foreshadowing={foreshadowing} onClose={mockOnClose} />);

    const titleInput = screen.getByTestId('foreshadowing-title-input');
    fireEvent.change(titleInput, { target: { value: '更新的标题' } });

    const submitButton = screen.getByTestId('submit-foreshadowing-form');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdateForeshadowing).toHaveBeenCalledTimes(1);
      expect(mockUpdateForeshadowing).toHaveBeenCalledWith(
        foreshadowing.id,
        expect.objectContaining({
          title: '更新的标题',
        })
      );
    });
  });

  it('提交成功后应该调用onClose', async () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const titleInput = screen.getByTestId('foreshadowing-title-input');
    const descInput = screen.getByTestId('foreshadowing-description-input');

    fireEvent.change(titleInput, { target: { value: '新伏笔' } });
    fireEvent.change(descInput, { target: { value: '这是一个新伏笔的描述' } });

    const submitButton = screen.getByTestId('submit-foreshadowing-form');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('取消按钮应该调用onClose', () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('点击关闭按钮应该调用onClose', () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const closeButton = screen.getByText('×');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

describe('ForeshadowingForm - 备注字段', () => {
  beforeEach(() => {
    mockAddForeshadowing.mockClear();
    mockUpdateForeshadowing.mockClear();
    mockOnClose.mockClear();
  });

  it('应该允许输入备注', () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const notesInput = screen.getByTestId('foreshadowing-notes-input');
    fireEvent.change(notesInput, { target: { value: '这是一些备注信息' } });

    expect((notesInput as HTMLTextAreaElement).value).toBe('这是一些备注信息');
  });

  it('备注应该是可选的', async () => {
    render(<ForeshadowingForm onClose={mockOnClose} />);

    const titleInput = screen.getByTestId('foreshadowing-title-input');
    const descInput = screen.getByTestId('foreshadowing-description-input');

    fireEvent.change(titleInput, { target: { value: '新伏笔' } });
    fireEvent.change(descInput, { target: { value: '这是一个新伏笔的描述' } });

    const submitButton = screen.getByTestId('submit-foreshadowing-form');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddForeshadowing).toHaveBeenCalledTimes(1);
    });
  });
});
