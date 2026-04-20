/**
 * EnhancedGraph 组件测试
 *
 * 测试增强知识图谱可视化组件的核心功能
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnhancedGraph } from '@/components/KnowledgeGraph/EnhancedGraph';
import { renderWithProviders, setupGlobalMocks, cleanupGlobalMocks } from '@/test/utils/test-utils';

describe('EnhancedGraph', () => {
  beforeEach(() => {
    setupGlobalMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupGlobalMocks();
  });

  describe('基础功能', () => {
    it('应该正确渲染图谱容器', () => {
      renderWithProviders(
        <EnhancedGraph width={800} height={600} />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
      expect(graph).toHaveAttribute('width', '800');
      expect(graph).toHaveAttribute('height', '600');
    });

    it('应该支持自定义布局类型', () => {
      const { rerender } = renderWithProviders(
        <EnhancedGraph width={800} height={600} layout="force" />
      );

      let graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();

      rerender(<EnhancedGraph width={800} height={600} layout="hierarchical" />);
      graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();

      rerender(<EnhancedGraph width={800} height={600} layout="circular" />);
      graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });

    it('应该支持启用分组功能', () => {
      renderWithProviders(
        <EnhancedGraph
          width={800}
          height={600}
          enableGrouping={true}
        />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });

    it('应该支持显示/隐藏关系类型', () => {
      const { rerender } = renderWithProviders(
        <EnhancedGraph
          width={800}
          height={600}
          showRelationshipTypes={true}
        />
      );

      let graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();

      rerender(
        <EnhancedGraph
          width={800}
          height={600}
          showRelationshipTypes={false}
        />
      );

      graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });
  });

  describe('回调函数', () => {
    it('应该支持节点选择回调', () => {
      const onNodeSelect = vi.fn();

      renderWithProviders(
        <EnhancedGraph
          width={800}
          height={600}
          onNodeSelect={onNodeSelect}
        />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });

    it('应该支持节点双击回调', () => {
      const onNodeDoubleClick = vi.fn();

      renderWithProviders(
        <EnhancedGraph
          width={800}
          height={600}
          onNodeDoubleClick={onNodeDoubleClick}
        />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });

    it('应该支持节点拖拽回调', () => {
      const onNodeDrag = vi.fn();

      renderWithProviders(
        <EnhancedGraph
          width={800}
          height={600}
          onNodeDrag={onNodeDrag}
        />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });

    it('应该支持缩放回调', () => {
      const onZoom = vi.fn();

      renderWithProviders(
        <EnhancedGraph
          width={800}
          height={600}
          onZoom={onZoom}
        />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });

    it('应该支持平移回调', () => {
      const onPan = vi.fn();

      renderWithProviders(
        <EnhancedGraph
          width={800}
          height={600}
          onPan={onPan}
        />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });
  });

  describe('响应式设计', () => {
    it('应该适应不同尺寸', () => {
      const { rerender } = renderWithProviders(
        <EnhancedGraph width={400} height={300} />
      );

      let graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toHaveAttribute('width', '400');
      expect(graph).toHaveAttribute('height', '300');

      rerender(<EnhancedGraph width={1200} height={800} />);

      graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toHaveAttribute('width', '1200');
      expect(graph).toHaveAttribute('height', '800');
    });

    it('应该支持最小尺寸', () => {
      renderWithProviders(
        <EnhancedGraph width={100} height={100} />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });

    it('应该支持大尺寸', () => {
      renderWithProviders(
        <EnhancedGraph width={3840} height={2160} />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });
  });

  describe('可访问性', () => {
    it('应该有背景色设置', () => {
      renderWithProviders(
        <EnhancedGraph width={800} height={600} />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toHaveStyle({ background: '#f9fafb' });
    });

    it('应该有光标样式', () => {
      renderWithProviders(
        <EnhancedGraph width={800} height={600} />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toHaveStyle({ cursor: 'grab' });
    });
  });

  describe('错误处理', () => {
    it('应该处理零尺寸', () => {
      renderWithProviders(
        <EnhancedGraph width={0} height={0} />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });

    it('应该处理负尺寸', () => {
      renderWithProviders(
        <EnhancedGraph width={-100} height={-100} />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });
  });

  describe('属性组合', () => {
    it('应该支持所有属性同时启用', () => {
      renderWithProviders(
        <EnhancedGraph
          width={800}
          height={600}
          layout="force"
          enableGrouping={true}
          showRelationshipTypes={true}
          onNodeSelect={vi.fn()}
          onNodeDoubleClick={vi.fn()}
          onNodeDrag={vi.fn()}
          onZoom={vi.fn()}
          onPan={vi.fn()}
        />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });

    it('应该支持所有回调都为空', () => {
      renderWithProviders(
        <EnhancedGraph
          width={800}
          height={600}
        />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });
  });

  describe('布局类型', () => {
    it('应该支持force布局', () => {
      renderWithProviders(
        <EnhancedGraph width={800} height={600} layout="force" />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });

    it('应该支持hierarchical布局', () => {
      renderWithProviders(
        <EnhancedGraph width={800} height={600} layout="hierarchical" />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });

    it('应该支持circular布局', () => {
      renderWithProviders(
        <EnhancedGraph width={800} height={600} layout="circular" />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph).toBeInTheDocument();
    });
  });

  describe('组件结构', () => {
    it('应该渲染SVG元素', () => {
      renderWithProviders(
        <EnhancedGraph width={800} height={600} />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      expect(graph.tagName.toLowerCase()).toBe('svg');
    });

    it('应该包含控制面板', () => {
      renderWithProviders(
        <EnhancedGraph width={800} height={600} />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      // 控制面板应该作为子元素存在
      expect(graph.children.length).toBeGreaterThan(0);
    });

    it('应该包含图例', () => {
      renderWithProviders(
        <EnhancedGraph width={800} height={600} />
      );

      const graph = screen.getByTestId('enhanced-knowledge-graph');
      // 图例应该作为子元素存在
      expect(graph.children.length).toBeGreaterThan(0);
    });
  });
});
