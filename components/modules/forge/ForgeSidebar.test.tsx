/**
 * ForgeSidebar 组件测试
 *
 * 测试创世纪侧边栏的功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ForgeSidebar } from '@/components/modules/forge/ForgeSidebar';
import { renderWithProviders, setupGlobalMocks, cleanupGlobalMocks } from '@/test/utils/test-utils';

describe('ForgeSidebar', () => {
  beforeEach(() => {
    setupGlobalMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupGlobalMocks();
  });

  describe('基础渲染', () => {
    it('应该正确渲染侧边栏', () => {
      renderWithProviders(<ForgeSidebar />);

      expect(screen.getByTestId('forge-sidebar')).toBeInTheDocument();
    });

    it('应该显示创世纪标题', () => {
      renderWithProviders(<ForgeSidebar />);

      expect(screen.getByText('创世纪')).toBeInTheDocument();
    });

    it('应该显示所有控制选项', () => {
      renderWithProviders(<ForgeSidebar />);

      expect(screen.getByTestId('detail-level-control')).toBeInTheDocument();
      expect(screen.getByTestId('focus-control')).toBeInTheDocument();
      expect(screen.getByTestId('start-genesis-button')).toBeInTheDocument();
    });
  });

  describe('配置控制', () => {
    it('应该能够切换详情级别', async () => {
      renderWithProviders(<ForgeSidebar />);

      const detailSelect = screen.getByTestId('detail-level-control');
      fireEvent.change(detailSelect, { target: { value: 'Detailed' } });

      await waitFor(() => {
        expect(detailSelect).toHaveValue('Detailed');
      });
    });

    it('应该能够切换世界关注点', async () => {
      renderWithProviders(<ForgeSidebar />);

      const focusSelect = screen.getByTestId('focus-control');
      fireEvent.change(focusSelect, { target: { value: 'Character' } });

      await waitFor(() => {
        expect(focusSelect).toHaveValue('Character');
      });
    });

    it('应该保存配置变更', async () => {
      const mockSave = vi.fn();
      renderWithProviders(<ForgeSidebar onSave={mockSave} />);

      const saveButton = screen.getByTestId('save-config-button');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockSave).toHaveBeenCalled();
      });
    });
  });

  describe('创世纪流程', () => {
    it('点击开始按钮应该启动创世纪', async () => {
      const mockStart = vi.fn();
      renderWithProviders(<ForgeSidebar onGenesisStart={mockStart} />);

      const startButton = screen.getByTestId('start-genesis-button');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockStart).toHaveBeenCalled();
      });
    });

    it('创世纪进行中应该禁用开始按钮', async () => {
      renderWithProviders(<ForgeSidebar isGenesisRunning={true} />);

      const startButton = screen.getByTestId('start-genesis-button');
      expect(startButton).toBeDisabled();
    });

    it('创世纪进行中应该显示进度', async () => {
      renderWithProviders(
        <ForgeSidebar
          isGenesisRunning={true}
          genesisProgress={50}
        />
      );

      expect(screen.getByTestId('genesis-progress')).toBeInTheDocument();
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });

    it('创世纪完成应该显示成功消息', async () => {
      renderWithProviders(
        <ForgeSidebar
          isGenesisRunning={false}
          isGenesisComplete={true}
        />
      );

      expect(screen.getByTestId('genesis-complete-message')).toBeInTheDocument();
      expect(screen.getByText(/创世纪完成/)).toBeInTheDocument();
    });
  });

  describe('配置验证', () => {
    it('应该在配置无效时禁用开始按钮', () => {
      renderWithProviders(
        <ForgeSidebar
          config={{
            detailLevel: 'Standard',
            focus: 'Balanced',
          }}
          isValid={false}
        />
      );

      const startButton = screen.getByTestId('start-genesis-button');
      expect(startButton).toBeDisabled();
    });

    it('应该显示配置错误提示', () => {
      renderWithProviders(
        <ForgeSidebar
          config={{
            detailLevel: 'Standard',
            focus: 'Balanced',
          }}
          errors={['项目描述不能为空']}
        />
      );

      expect(screen.getByTestId('config-errors')).toBeInTheDocument();
      expect(screen.getByText('项目描述不能为空')).toBeInTheDocument();
    });
  });

  describe('统计信息', () => {
    it('应该显示生成的统计信息', () => {
      const stats = {
        characters: 15,
        worldSettings: 8,
        events: 12,
      };

      renderWithProviders(
        <ForgeSidebar
          isGenesisComplete={true}
          statistics={stats}
        />
      );

      expect(screen.getByTestId('statistics-characters')).toHaveTextContent('15');
      expect(screen.getByTestId('statistics-world-settings')).toHaveTextContent('8');
      expect(screen.getByTestId('statistics-events')).toHaveTextContent('12');
    });
  });

  describe('操作按钮', () => {
    it('应该有重置配置按钮', () => {
      renderWithProviders(<ForgeSidebar />);

      const resetButton = screen.getByTestId('reset-config-button');
      expect(resetButton).toBeInTheDocument();
    });

    it('点击重置应该恢复默认配置', async () => {
      const mockReset = vi.fn();
      renderWithProviders(<ForgeSidebar onConfigReset={mockReset} />);

      const resetButton = screen.getByTestId('reset-config-button');
      fireEvent.click(resetButton);

      await waitFor(() => {
        expect(mockReset).toHaveBeenCalled();
      });
    });

    it('应该有重新生成按钮（完成后）', () => {
      renderWithProviders(
        <ForgeSidebar
          isGenesisComplete={true}
        />
      );

      const regenerateButton = screen.getByTestId('regenerate-button');
      expect(regenerateButton).toBeInTheDocument();
    });

    it('点击重新生成应该确认', async () => {
      renderWithProviders(
        <ForgeSidebar
          isGenesisComplete={true}
        />
      );

      const regenerateButton = screen.getByTestId('regenerate-button');
      fireEvent.click(regenerateButton);

      expect(screen.getByTestId('regenerate-confirm-dialog')).toBeInTheDocument();
    });
  });

  describe('响应式设计', () => {
    it('在小屏幕上应该折叠为抽屉', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithProviders(<ForgeSidebar />);

      const sidebar = screen.getByTestId('forge-sidebar');
      expect(sidebar).toHaveClass('drawer');
    });

    it('应该有切换按钮（移动端）', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      renderWithProviders(<ForgeSidebar />);

      const toggleButton = screen.getByTestId('sidebar-toggle');
      expect(toggleButton).toBeInTheDocument();
    });
  });

  describe('性能监控', () => {
    it('应该在渲染时标记性能', async () => {
      const mockMark = vi.fn();
      const mockMeasure = vi.fn();

      global.performance.mark = mockMark;
      global.performance.measure = mockMeasure;

      renderWithProviders(<ForgeSidebar />);

      await waitFor(() => {
        expect(mockMark).toHaveBeenCalledWith('forge-sidebar-render-start');
        expect(mockMeasure).toHaveBeenCalledWith(
          'forge-sidebar-render',
          'forge-sidebar-render-start',
          expect.any(String)
        );
      });
    });
  });

  describe('可访问性', () => {
    it('应该有正确的ARIA属性', () => {
      renderWithProviders(<ForgeSidebar />);

      const sidebar = screen.getByTestId('forge-sidebar');
      expect(sidebar).toHaveAttribute('role', 'complementary');
      expect(sidebar).toHaveAttribute('aria-label', '创世纪控制面板');
    });

    it('按钮应该有可访问的标签', () => {
      renderWithProviders(<ForgeSidebar />);

      const startButton = screen.getByTestId('start-genesis-button');
      expect(startButton).toHaveAttribute('aria-label', '开始创世纪');
    });

    it('应该支持键盘导航', () => {
      renderWithProviders(<ForgeSidebar />);

      const startButton = screen.getByTestId('start-genesis-button');
      startButton.focus();
      expect(startButton).toHaveFocus();

      // 模拟Enter键
      fireEvent.keyDown(startButton, { key: 'Enter', code: 'Enter' });
    });
  });
});
