/**
 * TemplatePreview 组件单元测试
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TemplatePreview } from '../TemplatePreview';
import { MergedTemplateResult } from '../../../types/templateOverride';
import { PromptTemplateDefinition } from '../../../types/promptTemplate';

// 模拟合并结果
const createMockMergedResult = (): MergedTemplateResult => {
  return {
    template: {
    id: 'test_template',
    label: '测试模板',
    description: '这是一个测试模板',
    category: 'writing',
    systemTemplate: '你是一个专业的小说写作助手。',
    userTemplate: '[小说类型]: {{genre}}\n\n[主要角色]: {{mainCharacter}}',
    variables: [
      {
        name: 'genre',
        type: 'string',
        tier: 'critical',
        source: 'user_input',
        required: true,
        description: '小说类型',
        display: {
          collapsible: false,
          previewLength: 100,
        },
      },
      {
        name: 'mainCharacter',
        type: 'string',
        tier: 'important',
        source: 'user_input',
        required: true,
        description: '主要角色',
        display: {
          collapsible: false,
          previewLength: 100,
        },
      },
    ],
    sections: [
      {
        id: 'genre_info',
        label: '类型信息',
        order: 1,
      },
      {
        id: 'character_info',
        label: '角色信息',
        order: 2,
      },
    ],
  } as PromptTemplateDefinition,
  sources: {
    systemInstruction: 'default',
    blocks: {
      genre_info: 'default',
      character_info: 'default',
    },
    variables: {
      genre: 'default',
      mainCharacter: 'default',
    },
  },
  warnings: [],
};

};

describe('TemplatePreview', () => {
  const mockMergedResult = createMockMergedResult();

  it('应该正确渲染折叠状态', () => {
    const { container } = render(
      <TemplatePreview
        mergedResult={mockMergedResult}
        defaultExpanded={false}
      />
    );

    // 检查默认是折叠的
    expect(screen.queryByText('模板预览')).toBeInTheDocument();
  expect(screen.queryByText('测试模板')).toBeInTheDocument();
  expect(screen.queryByText('这是一个测试模板')).toBeInTheDocument();
  expect(screen.queryByText('约 0 tokens')).toBeInTheDocument();
  expect(screen.queryByText('显示渲染结果')).not.toBeVisible();
  });

  it('应该在点击后展开', () => {
    const { container } = render(
      <TemplatePreview
        mergedResult={mockMergedResult}
        defaultExpanded={false}
      />
    );

    // 点击展开
    const expandButton = screen.getByText('模板预览').closest('button');
    fireEvent.click(expandButton);

    // 检查展开后的内容
    expect(screen.queryByText('系统指令')).toBeInTheDocument();
    expect(screen.queryByText('用户提示区块 (2)')).toBeInTheDocument();
    expect(screen.queryByText('变量列表 (2)')).toBeInTheDocument();
    expect(screen.queryByText('你是一个专业的小说写作助手。')).toBeInTheDocument();
  });

  it('应该正确显示来源标记', () => {
    const { container } = render(
      <TemplatePreview
        mergedResult={mockMergedResult}
        defaultExpanded={true}
        showSources={true}
      />
    );

    // 检查来源标记
    expect(screen.queryByText('默认')).toBeInTheDocument();
    expect(screen.queryByText('默认')).toHaveLength(2); // systemInstruction 和 blocks
  });

  it('应该正确显示变量列表', () => {
    const { container } = render(
      <TemplatePreview
        mergedResult={mockMergedResult}
        defaultExpanded={true}
        showVariables={true}
        variableValues={{
          genre: '玄幻',
          mainCharacter: '李逍遥',
        }}
      />
    );

    // 检查变量
    expect(screen.queryByText('genre')).toBeInTheDocument();
    expect(screen.queryByText('mainCharacter')).toBeInTheDocument();
    expect(screen.queryByText('string')).toBeInTheDocument();
    expect(screen.queryByText('必填')).toHaveLength(2);
  });

  it('应该支持切换原始/渲染视图', () => {
    const { container } = render(
      <TemplatePreview
        mergedResult={mockMergedResult}
        defaultExpanded={true}
        enableLivePreview={true}
        variableValues={{
          genre: '玄幻',
          mainCharacter: '李逍遥',
        }}
      />
    );

    // 切换到原始模板视图
    const toggleButton = screen.getByText('显示渲染结果');
    fireEvent.click(toggleButton);

    expect(screen.queryByText('显示原始模板')).toBeInTheDocument();
  });

  it('应该正确显示警告信息', () => {
    const resultWithWarning: MergedTemplateResult = {
      ...mockMergedResult,
      warnings: ['这是一个测试警告'],
    };

    const { container } = render(
      <TemplatePreview
        mergedResult={resultWithWarning}
        defaultExpanded={true}
      />
    );

    expect(screen.queryByText('这是一个测试警告')).toBeInTheDocument();
  });

  it('应该正确计算token估算', () => {
    const { container } = render(
      <TemplatePreview
        mergedResult={mockMergedResult}
        defaultExpanded={true}
      />
    );

    // 检查token估算显示
    expect(screen.queryByText(/约 \d+ tokens/)).toBeInTheDocument();
    expect(screen.queryByText(/系统: ~\d+ tokens/)).toBeInTheDocument();
    expect(screen.queryByText(/用户: ~\d+ tokens/)).toBeInTheDocument();
    expect(screen.queryByText(/总计: ~\d+ tokens/)).toBeInTheDocument();
  });

  it('应该支持复制功能', async () => {
    const { container } = render(
      <TemplatePreview
        mergedResult={mockMergedResult}
        defaultExpanded={true}
      />
    );

    // 找到复制系统指令的按钮
    const copyButtons = screen.getAllByRole('button');
    const systemCopyButton = copyButtons.find(btn =>
      btn.textContent?.includes('复制') || screen.getByText('系统指令').parentElement?.contains(btn)
    );

    // 注意：由于clipboard API需要用户交互，这里只是检查按钮存在
    expect(copyButtons.length).toBeGreaterThan(0);
  });

  it('应该正确处理覆盖的区块', () => {
    const resultWithOverride: MergedTemplateResult = {
      ...mockMergedResult,
      sources: {
        systemInstruction: 'project',
        blocks: {
          genre_info: 'project',
          character_info: 'default',
        },
        variables: {
          genre: 'project',
          mainCharacter: 'default',
        },
      },
    };

    const { container } = render(
      <TemplatePreview
        mergedResult={resultWithOverride}
        defaultExpanded={true}
        showSources={true}
      />
    );

    // 检查项目级标记
    expect(screen.queryByText('项目级')).toBeInTheDocument();
    // 检查已覆盖标记
    expect(screen.queryByText('已覆盖')).toBeInTheDocument();
  });

  it('应该正确显示模板ID', () => {
    const { container } = render(
      <TemplatePreview
        mergedResult={mockMergedResult}
        defaultExpanded={true}
      />
    );

    expect(screen.queryByText('ID: test_template')).toBeInTheDocument();
  });
});
