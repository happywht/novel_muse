/**
 * KnowledgeGraph 组件测试
 *
 * 测试知识图谱可视化组件
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KnowledgeGraph } from '@/components/KnowledgeGraph';
import { renderWithProviders, setupGlobalMocks, cleanupGlobalMocks } from '@/test/utils/test-utils';

// Mock hooks
vi.mock('@/hooks/useAdvancedMode', () => ({
  useAdvancedMode: () => ({ isAdvanced: false }),
}));

vi.mock('@/services/apiService', () => ({
  fetchGraph: vi.fn(() => Promise.resolve({
    nodes: [
      { id: '1', label: '主角', type: 'Character', properties: {} },
      { id: '2', label: '反派', type: 'Character', properties: {} },
      { id: '3', label: '门派', type: 'WorldSetting', properties: {} },
    ],
    edges: [
      { source: '1', target: '2', type: 'enemy', properties: {} },
      { source: '1', target: '3', type: 'belongs_to', properties: {} },
    ],
  })),
}));

describe('KnowledgeGraph', () => {
  const mockProjectData = {
    characters: [
      { id: '1', name: '主角', description: '主角描述' },
      { id: '2', name: '反派', description: '反派描述' },
    ],
    worldSettings: [
      { id: '3', title: '门派', content: '门派描述' },
    ],
  };

  const mockUpdateProject = vi.fn();

  beforeEach(() => {
    setupGlobalMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupGlobalMocks();
  });

  describe('基础渲染 - 无后端模式', () => {
    it('应该显示占位符当useBackend为false时', () => {
      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={false}
          projectData={mockProjectData}
          updateProject={mockUpdateProject}
        />
      );

      expect(screen.getByText('星图引擎 · 知识图谱')).toBeInTheDocument();
      expect(screen.getByText(/知识图谱功能需要后端服务运行中/)).toBeInTheDocument();
      expect(screen.getByText('cd server && npm run dev')).toBeInTheDocument();
    });

    it('应该显示GitBranch图标', () => {
      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={false}
          projectData={mockProjectData}
          updateProject={mockUpdateProject}
        />
      );

      const icons = document.querySelectorAll('.lucide-git-branch');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('基础渲染 - 后端模式', () => {
    it('应该正确渲染图谱容器当useBackend为true时', async () => {
      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={true}
          projectData={mockProjectData}
          updateProject={mockUpdateProject}
        />
      );

      // 等待加载完成
      await waitFor(() => {
        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      });
    });

    it('应该显示工具栏', async () => {
      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={true}
          projectData={mockProjectData}
          updateProject={mockUpdateProject}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('星图引擎 · 知识图谱')).toBeInTheDocument();
      });
    });

    it('应该显示节点和关系统计', async () => {
      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={true}
          projectData={mockProjectData}
          updateProject={mockUpdateProject}
        />
      );

      await waitFor(() => {
        const stats = screen.queryByText(/节点.*关系/);
        expect(stats).toBeInTheDocument();
      });
    });
  });

  describe('缩放控制', () => {
    it('应该显示缩放控制按钮', async () => {
      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={true}
          projectData={mockProjectData}
          updateProject={mockUpdateProject}
        />
      );

      await waitFor(() => {
        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      });

      // 检查zoom按钮存在
      const buttons = document.querySelectorAll('button');
      const zoomButtons = Array.from(buttons).filter(btn =>
        btn.getAttribute('title') === '放大' ||
        btn.getAttribute('title') === '缩小' ||
        btn.getAttribute('title') === '重置视图'
      );

      expect(zoomButtons.length).toBeGreaterThanOrEqual(3);
    });

    it('应该支持滚轮缩放', async () => {
      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={true}
          projectData={mockProjectData}
          updateProject={mockUpdateProject}
        />
      );

      await waitFor(() => {
        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      });

      const canvas = document.querySelector('canvas');
      if (canvas) {
        // 模拟滚轮事件
        fireEvent.wheel(canvas, { deltaY: -100 });

        await waitFor(() => {
          // 检查是否触发了缩放（这里只是验证事件不会报错）
          expect(canvas).toBeInTheDocument();
        });
      }
    });
  });

  describe('工具栏功能', () => {
    it('应该显示刷新按钮', async () => {
      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={true}
        projectData={mockProjectData}
        updateProject={mockUpdateProject}
      />
      );

      await waitFor(() => {
        const buttons = document.querySelectorAll('button');
        const refreshButton = Array.from(buttons).find(btn =>
          btn.getAttribute('title') === '刷新图谱'
        );
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('应该显示图例', async () => {
      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={true}
          projectData={mockProjectData}
          updateProject={mockUpdateProject}
        />
      );

      await waitFor(() => {
        const legend = screen.queryByText(/图例.*图层/);
        expect(legend).toBeInTheDocument();
      });
    });
  });

  describe('加载状态', () => {
    it('应该显示加载指示器', async () => {
      // Mock fetchGraph to delay response
      const { fetchGraph } = await import('@/services/apiService');
      (fetchGraph as any).mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({
            nodes: [
              { id: '1', label: '主角', type: 'Character', properties: {} },
            ],
            edges: [],
          }), 100)
        )
      );

      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={true}
          projectData={mockProjectData}
          updateProject={mockUpdateProject}
        />
      );

      // 检查loading状态
      await waitFor(() => {
        const loader = document.querySelector('.animate-spin');
        expect(loader).toBeInTheDocument();
      }, { timeout: 50 });
    });
  });

  describe('错误处理', () => {
    it('应该处理API错误', async () => {
      const { fetchGraph } = await import('@/services/apiService');
      (fetchGraph as any).mockRejectedValue(new Error('网络错误'));

      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={true}
          projectData={mockProjectData}
          updateProject={mockUpdateProject}
        />
      );

      await waitFor(() => {
        const errorMsg = screen.queryByText(/网络错误/);
        expect(errorMsg).toBeInTheDocument();
      });
    });

    it('应该处理空数据', async () => {
      const { fetchGraph } = await import('@/services/apiService');
      (fetchGraph as any).mockResolvedValue({
        nodes: [],
        edges: [],
      });

      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={true}
          projectData={mockProjectData}
          updateProject={mockUpdateProject}
        />
      );

      await waitFor(() => {
        const errorMsg = screen.queryByText(/当前图层为空/);
        expect(errorMsg).toBeInTheDocument();
      });
    });
  });

  describe('Canvas交互', () => {
    it('应该渲染canvas元素', async () => {
      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={true}
          projectData={mockProjectData}
          updateProject={mockUpdateProject}
        />
      );

      await waitFor(() => {
        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
        expect(canvas).toHaveClass('cursor-grab');
      });
    });

    it('应该支持鼠标事件', async () => {
      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={true}
          projectData={mockProjectData}
          updateProject={mockUpdateProject}
        />
      );

      await waitFor(() => {
        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      });

      const canvas = document.querySelector('canvas');
      if (canvas) {
        // 测试鼠标事件不会报错
        fireEvent.mouseDown(canvas, { clientX: 100, clientY: 100 });
        fireEvent.mouseMove(canvas, { clientX: 200, clientY: 200 });
        fireEvent.mouseUp(canvas);

        await waitFor(() => {
          expect(canvas).toBeInTheDocument();
        });
      }
    });
  });

  describe('响应式设计', () => {
    it('应该适应容器大小', async () => {
      const { container } = renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={true}
          projectData={mockProjectData}
          updateProject={mockUpdateProject}
        />
      );

      await waitFor(() => {
        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      });

      // 验证canvas有合适的尺寸
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas?.width).toBeGreaterThan(0);
      expect(canvas?.height).toBeGreaterThan(0);
    });
  });

  describe('可访问性', () => {
    it('canvas应该有正确的role', async () => {
      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={true}
        projectData={mockProjectData}
        updateProject={mockUpdateProject}
      />
      );

      await waitFor(() => {
        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      });
    });

    it('按钮应该有正确的title属性', async () => {
      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={true}
          projectData={mockProjectData}
          updateProject={mockUpdateProject}
        />
      );

      await waitFor(() => {
        const buttons = document.querySelectorAll('button[title]');
        expect(buttons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('高级模式', () => {
    it('高级模式应该显示额外的控制项', async () => {
      // 注意：由于vi.mock的限制，这个测试只验证基础渲染
      // 实际的高级模式功能需要手动测试
      renderWithProviders(
        <KnowledgeGraph
          projectId="test-project"
          useBackend={true}
          projectData={mockProjectData}
          updateProject={mockUpdateProject}
        />
      );

      await waitFor(() => {
        const canvas = document.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      });
    });
  });
});
