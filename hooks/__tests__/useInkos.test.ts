/**
 * useInkos Hook 测试
 *
 * 测试 inkos 集成的 React Hook
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useInkos } from '../useInkos';

// ============================================
// Mocks
// ============================================

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock EventSource
class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState: number = 0;
  private listeners: Map<string, EventListener[]> = new Map();

  constructor(url: string) {
    this.url = url;
    // Simulate connection
    setTimeout(() => {
      this.readyState = 1;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  addEventListener(type: string, listener: EventListener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  removeEventListener(type: string, listener: EventListener) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  dispatchEvent(event: Event): boolean {
    const listeners = this.listeners.get(event.type) || [];
    listeners.forEach((listener) => listener(event));
    return true;
  }

  close() {
    this.readyState = 2;
  }

  // Test helpers
  simulateMessage(data: any) {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Replace global EventSource
(global as any).EventSource = MockEventSource;

// ============================================
// Fixtures
// ============================================

const createMockTaskResponse = (taskId: string) => ({
  taskId,
  status: 'pending',
  progress: 0,
  message: 'Task created',
  startedAt: new Date().toISOString(),
});

const createMockTaskStatus = (taskId: string, status: string, progress: number) => ({
  taskId,
  status,
  progress,
  message: `Progress: ${progress}%`,
  startedAt: new Date().toISOString(),
  completedAt: status === 'complete' ? new Date().toISOString() : undefined,
});

// ============================================
// Tests
// ============================================

describe('useInkos Hook', () => {
  let eventSourceInstance: MockEventSource | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
    eventSourceInstance = null;

    // Mock EventSource constructor to capture instance
    (global as any).EventSource = jest.fn().mockImplementation((url: string) => {
      eventSourceInstance = new MockEventSource(url);
      return eventSourceInstance;
    });

    // Default fetch mock
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => createMockTaskResponse('task-001'),
    });
  });

  afterEach(() => {
    if (eventSourceInstance) {
      eventSourceInstance.close();
    }
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useInkos());

      expect(result.current.currentTask).toBeNull();
      expect(result.current.progress).toBeNull();
      expect(result.current.isRunning).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should provide all required methods', () => {
      const { result } = renderHook(() => useInkos());

      expect(typeof result.current.importProject).toBe('function');
      expect(typeof result.current.exportProject)
        .toBe('exportProject')
        .toBe('function');
      expect(typeof result.current.writeChapter).toBe('function');
      expect(typeof result.current.runAudit).toBe('function');
      expect(typeof result.current.cancelTask).toBe('function');
      expect(typeof result.current.getTaskStatus).toBe('function');
      expect(typeof result.current.subscribeToTask).toBe('function');
      expect(typeof result.current.unsubscribeFromTask).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('importProject', () => {
    it('should start import task successfully', async () => {
      const { result } = renderHook(() => useInkos());

      let importResult;
      await act(async () => {
        importResult = await result.current.importProject({
          projectId: 'project-001',
          options: {
            includeChapters: true,
            includeCharacters: true,
          },
        });
      });

      expect(importResult).toEqual({ taskId: 'task-001' });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/inkos/import',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            projectId: 'project-001',
            options: {
              includeChapters: true,
              includeCharacters: true,
            },
          }),
        })
      );
    });

    it('should set isRunning to true during import', async () => {
      const { result } = renderHook(() => useInkos());

      await act(async () => {
        await result.current.importProject({ projectId: 'project-001' });
      });

      expect(result.current.isRunning).toBe(true);
      expect(result.current.currentTask).not.toBeNull();
      expect(result.current.currentTask?.status).toBe('pending');
    });

    it('should handle import errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Import failed' }),
      });

      const { result } = renderHook(() => useInkos());

      await act(async () => {
        try {
          await result.current.importProject({ projectId: 'project-001' });
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.error).toBe('Import failed');
      expect(result.current.isRunning).toBe(false);
    });
  });

  describe('exportProject', () => {
    it('should start export task successfully', async () => {
      const { result } = renderHook(() => useInkos());

      let exportResult;
      await act(async () => {
        exportResult = await result.current.exportProject({
          projectId: 'project-001',
          targetProjectId: 'target-001',
        });
      });

      expect(exportResult).toEqual({ taskId: 'task-001' });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/inkos/export',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            projectId: 'project-001',
            targetProjectId: 'target-001',
          }),
        })
      );
    });
  });

  describe('writeChapter', () => {
    it('should start write task successfully', async () => {
      const { result } = renderHook(() => useInkos());

      let writeResult;
      await act(async () => {
        writeResult = await result.current.writeChapter({
          projectId: 'project-001',
          chapterNumber: 5,
          chapterId: 'chapter-005',
          options: {
            model: 'gpt-4',
            styleGuide: '热血风格',
          },
        });
      });

      expect(writeResult).toEqual({ taskId: 'task-001' });
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/inkos/write',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('chapterNumber'),
        })
      );
    });

    it('should update progress through SSE', async () => {
      const { result } = renderHook(() => useInkos());

      await act(async () => {
        await result.current.writeChapter({
          projectId: 'project-001',
          chapterNumber: 1,
        });
      });

      // Subscribe to task
      act(() => {
        result.current.subscribeToTask('task-001', 'project-001');
      });

      // Simulate progress message
      await act(async () => {
        eventSourceInstance?.simulateMessage({
          type: 'progress',
          phase: 'writing',
          percentage: 50,
          message: 'Writing chapter...',
          chapterNumber: 1,
        });
      });

      expect(result.current.progress).not.toBeNull();
      expect(result.current.progress?.phase).toBe('writing');
      expect(result.current.progress?.percentage).toBe(50);
      expect(result.current.progress?.chapterNumber).toBe(1);
    });

    it('should handle write completion', async () => {
      const { result } = renderHook(() => useInkos());

      await act(async () => {
        await result.current.writeChapter({
          projectId: 'project-001',
          chapterNumber: 1,
        });
      });

      act(() => {
        result.current.subscribeToTask('task-001', 'project-001');
      });

      await act(async () => {
        eventSourceInstance?.simulateMessage({
          type: 'complete',
          result: {
            chapterId: 'chapter-001',
            content: 'Chapter content...',
          },
        });
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.currentTask?.status).toBe('complete');
      expect(result.current.currentTask?.result).toBeDefined();
    });
  });

  describe('runAudit', () => {
    it('should start audit task with GET request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockTaskResponse('audit-001'),
      });

      const { result } = renderHook(() => useInkos());

      let auditResult;
      await act(async () => {
        auditResult = await result.current.runAudit({
          projectId: 'project-001',
          chapterId: 'chapter-005',
          dimensions: ['continuity', 'ai-tells'],
          options: {
            checkContinuity: true,
            checkAITells: true,
          },
        });
      });

      expect(auditResult).toEqual({ taskId: 'audit-001' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/inkos/audit?'),
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle audit errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid chapter ID' }),
      });

      const { result } = renderHook(() => useInkos());

      await act(async () => {
        try {
          await result.current.runAudit({
            projectId: 'project-001',
            chapterId: 'invalid',
          });
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.error).toBe('Invalid chapter ID');
    });
  });

  describe('cancelTask', () => {
    it('should cancel running task', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockTaskResponse('task-001'),
      });

      const { result } = renderHook(() => useInkos());

      // Start a task first
      await act(async () => {
        await result.current.writeChapter({
          projectId: 'project-001',
          chapterNumber: 1,
        });
      });

      // Subscribe to create event source
      act(() => {
        result.current.subscribeToTask('task-001', 'project-001');
      });

      // Mock cancel request
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      let cancelResult;
      await act(async () => {
        cancelResult = await result.current.cancelTask();
      });

      expect(cancelResult).toBe(true);
      expect(result.current.currentTask?.status).toBe('cancelled');
      expect(result.current.isRunning).toBe(false);
    });

    it('should return false when no task to cancel', async () => {
      const { result } = renderHook(() => useInkos());

      let cancelResult;
      await act(async () => {
        cancelResult = await result.current.cancelTask();
      });

      expect(cancelResult).toBe(false);
    });

    it('should handle cancel errors', async () => {
      const { result } = renderHook(() => useInkos());

      // Start a task
      await act(async () => {
        await result.current.writeChapter({
          projectId: 'project-001',
          chapterNumber: 1,
        });
      });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      let cancelResult;
      await act(async () => {
        cancelResult = await result.current.cancelTask();
      });

      expect(cancelResult).toBe(false);
      expect(result.current.error).toBeDefined();
    });
  });

  describe('getTaskStatus', () => {
    it('should fetch task status', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => createMockTaskStatus('task-001', 'running', 50),
      });

      const { result } = renderHook(() => useInkos());

      let status;
      await act(async () => {
        status = await result.current.getTaskStatus('task-001');
      });

      expect(status).toEqual(
        expect.objectContaining({
          taskId: 'task-001',
          status: 'running',
          progress: 50,
        })
      );
    });

    it('should throw error when status fetch fails', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const { result } = renderHook(() => useInkos());

      await expect(
        act(async () => {
          await result.current.getTaskStatus('nonexistent');
        })
      ).rejects.toThrow('Failed to get task status');
    });
  });

  describe('subscribeToTask', () => {
    it('should create EventSource with correct URL', async () => {
      const { result } = renderHook(() => useInkos());

      act(() => {
        result.current.subscribeToTask('task-001', 'project-001');
      });

      expect((global as any).EventSource).toHaveBeenCalledWith(
        '/api/inkos/stream/task-001?projectId=project-001'
      );
    });

    it('should close existing EventSource when subscribing to new task', async () => {
      const { result } = renderHook(() => useInkos());

      act(() => {
        result.current.subscribeToTask('task-001', 'project-001');
      });

      const firstEventSource = eventSourceInstance;

      act(() => {
        result.current.subscribeToTask('task-002', 'project-001');
      });

      expect(firstEventSource?.readyState).toBe(2); // CLOSED
    });

    it('should handle progress messages', async () => {
      const { result } = renderHook(() => useInkos());

      act(() => {
        result.current.subscribeToTask('task-001', 'project-001');
      });

      await act(async () => {
        eventSourceInstance?.simulateMessage({
          type: 'progress',
          phase: 'thinking',
          percentage: 25,
          message: 'Analyzing story context...',
        });
      });

      expect(result.current.progress?.phase).toBe('thinking');
      expect(result.current.progress?.percentage).toBe(25);
    });

    it('should handle completion messages', async () => {
      const { result } = renderHook(() => useInkos());

      // Set up initial task
      await act(async () => {
        await result.current.writeChapter({
          projectId: 'project-001',
          chapterNumber: 1,
        });
      });

      act(() => {
        result.current.subscribeToTask('task-001', 'project-001');
      });

      await act(async () => {
        eventSourceInstance?.simulateMessage({
          type: 'complete',
          result: { content: 'Generated content' },
        });
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.currentTask?.status).toBe('complete');
      expect(result.current.progress).toBeNull();
    });

    it('should handle error messages', async () => {
      const { result } = renderHook(() => useInkos());

      await act(async () => {
        await result.current.writeChapter({
          projectId: 'project-001',
          chapterNumber: 1,
        });
      });

      act(() => {
        result.current.subscribeToTask('task-001', 'project-001');
      });

      await act(async () => {
        eventSourceInstance?.simulateMessage({
          type: 'error',
          message: 'API rate limit exceeded',
        });
      });

      expect(result.current.error).toBe('API rate limit exceeded');
      expect(result.current.currentTask?.status).toBe('error');
    });

    it('should handle connection errors', async () => {
      const { result } = renderHook(() => useInkos());

      act(() => {
        result.current.subscribeToTask('task-001', 'project-001');
      });

      await act(async () => {
        eventSourceInstance?.simulateError();
      });

      expect(result.current.error).toBe('Connection to task stream failed');
    });
  });

  describe('unsubscribeFromTask', () => {
    it('should close EventSource', async () => {
      const { result } = renderHook(() => useInkos());

      act(() => {
        result.current.subscribeToTask('task-001', 'project-001');
      });

      expect(eventSourceInstance).not.toBeNull();

      act(() => {
        result.current.unsubscribeFromTask();
      });

      expect(eventSourceInstance?.readyState).toBe(2); // CLOSED
    });

    it('should handle case when no EventSource exists', () => {
      const { result } = renderHook(() => useInkos());

      // Should not throw
      act(() => {
        result.current.unsubscribeFromTask();
      });
    });
  });

  describe('clearError', () => {
    it('should clear error state', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      const { result } = renderHook(() => useInkos());

      await act(async () => {
        try {
          await result.current.importProject({ projectId: 'project-001' });
        } catch (error) {
          // Expected
        }
      });

      expect(result.current.error).toBe('Server error');

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('should close EventSource on unmount', () => {
      const { result, unmount } = renderHook(() => useInkos());

      act(() => {
        result.current.subscribeToTask('task-001', 'project-001');
      });

      unmount();

      expect(eventSourceInstance?.readyState).toBe(2); // CLOSED
    });
  });

  describe('State updates', () => {
    it('should update currentTask progress from SSE', async () => {
      const { result } = renderHook(() => useInkos());

      await act(async () => {
        await result.current.writeChapter({
          projectId: 'project-001',
          chapterNumber: 1,
        });
      });

      act(() => {
        result.current.subscribeToTask('task-001', 'project-001');
      });

      await act(async () => {
        eventSourceInstance?.simulateMessage({
          type: 'progress',
          percentage: 75,
          message: 'Almost done...',
        });
      });

      expect(result.current.currentTask?.progress).toBe(75);
      expect(result.current.currentTask?.message).toBe('Almost done...');
    });

    it('should preserve task data across re-renders', async () => {
      const { result, rerender } = renderHook(() => useInkos());

      await act(async () => {
        await result.current.writeChapter({
          projectId: 'project-001',
          chapterNumber: 1,
        });
      });

      const taskId = result.current.currentTask?.taskId;

      rerender();

      expect(result.current.currentTask?.taskId).toBe(taskId);
    });
  });

  describe('Network error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useInkos());

      await act(async () => {
        try {
          await result.current.importProject({ projectId: 'project-001' });
        } catch (error) {
          // Expected
        }
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.isRunning).toBe(false);
    });

    it('should handle JSON parse errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const { result } = renderHook(() => useInkos());

      await act(async () => {
        try {
          await result.current.importProject({ projectId: 'project-001' });
        } catch (error) {
          // Expected
        }
      });

      expect(result.current.error).toBeDefined();
    });
  });
});
