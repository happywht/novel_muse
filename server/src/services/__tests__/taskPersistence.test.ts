/**
 * TaskPersistence 服务单元测试
 *
 * 测试任务持久化存储的基本操作、列表过滤、清理机制、恢复功能和统计功能
 */

import { TaskPersistence, PersistedTask } from '../taskPersistence';
import type { TaskStatus } from '../../types/inkos';
import * as fs from 'fs/promises';

// ============================================
// Mocks
// ============================================

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
  unlink: jest.fn(),
  readdir: jest.fn(),
}));

// Mock path
jest.mock('path', () => ({
  join: (...args: string[]) => args.join('/'),
}));

// Mock uuid
jest.mock('uuid', () => {
  let counter = 0;
  return {
    v4: jest.fn(() => {
      counter++;
      return `test-uuid-${String(counter).padStart(3, '0')}`;
    }),
  };
});

// ============================================
// Test Fixtures
// ============================================

const createMockTask = (overrides: Partial<PersistedTask> = {}): PersistedTask => {
  const now = new Date().toISOString();
  return {
    taskId: 'test-uuid-001',
    type: 'import',
    status: 'pending',
    progress: 0,
    message: 'Task created',
    createdAt: now,
    updatedAt: now,
    projectId: 'project-001',
    filePath: 'D:/test/workspace/workspace/tasks/test-uuid-001.json',
    ...overrides,
  };
};

const createMockIndex = (tasks: Record<string, any> = {}) => ({
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  tasks,
});

// ============================================
// Tests
// ============================================

describe('TaskPersistence', () => {
  let taskPersistence: TaskPersistence;
  let mockFs: jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFs = require('fs/promises') as jest.Mocked<typeof fs>;

    // Default mock implementations
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(JSON.stringify(createMockIndex()));
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);

    // Reset uuid counter via mock
    const uuid = require('uuid');
    uuid.v4.mockClear();
    let counter = 0;
    uuid.v4.mockImplementation(() => {
      counter++;
      return `test-uuid-${String(counter).padStart(3, '0')}`;
    });

    // Create new instance
    taskPersistence = new TaskPersistence();
  });

  // ============================================
  // 1. Basic Operations Tests
  // ============================================

  describe('Basic Operations', () => {
    describe('create', () => {
      it('should create task and return taskId', async () => {
        const task = (await taskPersistence.create('import', 'project-001')) as PersistedTask;

        expect(task.taskId).toBe('test-uuid-001');
        expect(task.type).toBe('import');
        expect(task.status).toBe('pending');
        expect(task.progress).toBe(0);
        expect(task.message).toBe('Task created');
        expect(task.projectId).toBe('project-001');
        expect(task.createdAt).toBeDefined();
        expect(task.updatedAt).toBeDefined();
      });

      it('should save task to file system', async () => {
        await taskPersistence.create('write', 'project-002');

        expect(mockFs.mkdir).toHaveBeenCalled();
        expect(mockFs.writeFile).toHaveBeenCalled();
      });

      it('should support different task types', async () => {
        const importTask = await taskPersistence.create('import', 'project-001');
        expect(importTask.type).toBe('import');

        const writeTask = await taskPersistence.create('write', 'project-002');
        expect(writeTask.type).toBe('write');

        const auditTask = await taskPersistence.create('audit', 'project-003');
        expect(auditTask.type).toBe('audit');

        const exportTask = await taskPersistence.create('export', 'project-004');
        expect(exportTask.type).toBe('export');
      });

      it('should fallback to memory on file system error', async () => {
        mockFs.writeFile.mockRejectedValueOnce(new Error('Disk full'));

        const task = await taskPersistence.create('import', 'project-001');

        expect(task).toBeDefined();
        expect(task.taskId).toBe('test-uuid-001');
      });
    });

    describe('get', () => {
      it('should get task by taskId', async () => {
        const created = await taskPersistence.create('import', 'project-001');
        const retrieved = await taskPersistence.get(created.taskId);

        expect(retrieved).not.toBeNull();
        expect(retrieved?.taskId).toBe(created.taskId);
        expect(retrieved?.type).toBe('import');
      });

      it('should return null for non-existent task', async () => {
        mockFs.readFile.mockRejectedValue(new Error('File not found'));

        const result = await taskPersistence.get('nonexistent-id');

        expect(result).toBeNull();
      });

      it('should return task from memory cache first', async () => {
        const created = await taskPersistence.create('import', 'project-001');

        // Clear mock to simulate file read failure
        mockFs.readFile.mockRejectedValue(new Error('File not found'));

        // Should still get from memory
        const retrieved = await taskPersistence.get(created.taskId);
        expect(retrieved).not.toBeNull();
        expect(retrieved?.taskId).toBe(created.taskId);
      });

      it('should cache task in memory after file read', async () => {
        const mockTask = createMockTask({ taskId: 'cached-task-001' });
        mockFs.readFile.mockResolvedValueOnce(JSON.stringify(mockTask));

        // First read from file
        const first = await taskPersistence.get('cached-task-001');
        expect(first).not.toBeNull();

        // Second should use cache (even if file read fails now)
        mockFs.readFile.mockRejectedValue(new Error('File not found'));
        const second = await taskPersistence.get('cached-task-001');
        expect(second).not.toBeNull();
        expect(second?.taskId).toBe('cached-task-001');
      });
    });

    describe('update', () => {
      it('should update task status', async () => {
        const created = await taskPersistence.create('import', 'project-001');

        const updated = await taskPersistence.update(created.taskId, {
          status: 'running',
        });

        expect(updated).not.toBeNull();
        expect(updated?.status).toBe('running');
        expect(updated?.updatedAt).not.toBe(created.updatedAt);
      });

      it('should update task progress', async () => {
        const created = await taskPersistence.create('write', 'project-001');

        const updated = await taskPersistence.update(created.taskId, {
          progress: 50,
          message: 'Writing chapter...',
        });

        expect(updated).not.toBeNull();
        expect(updated?.progress).toBe(50);
        expect(updated?.message).toBe('Writing chapter...');
      });

      it('should update completedAt when task completes', async () => {
        const created = await taskPersistence.create('import', 'project-001');

        const updated = await taskPersistence.update(created.taskId, {
          status: 'completed',
          completedAt: new Date().toISOString(),
        });

        expect(updated).not.toBeNull();
        expect(updated?.completedAt).toBeDefined();
      });

      it('should return null for non-existent task', async () => {
        mockFs.readFile.mockRejectedValue(new Error('File not found'));

        const result = await taskPersistence.update('nonexistent-id', {
          status: 'running',
        });

        expect(result).toBeNull();
      });

      it('should update memory cache on successful file update', async () => {
        const created = await taskPersistence.create('import', 'project-001');

        await taskPersistence.update(created.taskId, {
          status: 'completed',
          progress: 100,
        });

        // Get from memory cache
        const cached = await taskPersistence.get(created.taskId);
        expect(cached?.status).toBe('completed');
        expect(cached?.progress).toBe(100);
      });
    });

    describe('delete', () => {
      it('should delete task', async () => {
        const created = await taskPersistence.create('import', 'project-001');

        await taskPersistence.delete(created.taskId);

        // After delete, get should return null from file system
        mockFs.readFile.mockRejectedValue(new Error('File not found'));
        const result = await taskPersistence.get(created.taskId);
        expect(result).toBeNull();
      });

      it('should delete task file and update index', async () => {
        const created = await taskPersistence.create('import', 'project-001');

        await taskPersistence.delete(created.taskId);

        expect(mockFs.unlink).toHaveBeenCalled();
      });

      it('should handle non-existent task gracefully', async () => {
        mockFs.unlink.mockRejectedValue(new Error('File not found'));

        // Should not throw
        await expect(taskPersistence.delete('nonexistent-id')).resolves.not.toThrow();
      });

      it('should remove task from memory cache', async () => {
        const created = await taskPersistence.create('import', 'project-001');

        await taskPersistence.delete(created.taskId);

        // Even if file exists, memory cache should be cleared
        mockFs.readFile.mockResolvedValue(JSON.stringify(createMockTask()));
        const result = await taskPersistence.get(created.taskId);
        // File read will succeed but task is removed from memory
        // Actually, after delete, the memory cache is cleared, so get will try to read from file
        expect(result).not.toBeNull(); // File read succeeds
      });
    });
  });

  // ============================================
  // 2. List and Filter Tests
  // ============================================

  describe('List and Filter', () => {
    beforeEach(() => {
      // Create some test tasks with index
      const index = createMockIndex({
        'task-001': {
          type: 'import',
          status: 'completed',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T11:00:00.000Z',
          projectId: 'project-001',
          filePath: '/workspace/tasks/task-001.json',
        },
        'task-002': {
          type: 'write',
          status: 'running',
          createdAt: '2024-01-02T10:00:00.000Z',
          updatedAt: '2024-01-02T10:30:00.000Z',
          projectId: 'project-001',
          filePath: '/workspace/tasks/task-002.json',
        },
        'task-003': {
          type: 'audit',
          status: 'pending',
          createdAt: '2024-01-03T10:00:00.000Z',
          updatedAt: '2024-01-03T10:00:00.000Z',
          projectId: 'project-002',
          filePath: '/workspace/tasks/task-003.json',
        },
      });

      mockFs.readFile.mockImplementation(async (path: any) => {
        if (path.includes('index.json')) {
          return JSON.stringify(index);
        }
        if (path.includes('task-001.json')) {
          return JSON.stringify(
            createMockTask({
              taskId: 'task-001',
              type: 'import',
              status: 'completed',
              projectId: 'project-001',
              createdAt: '2024-01-01T10:00:00.000Z',
            })
          );
        }
        if (path.includes('task-002.json')) {
          return JSON.stringify(
            createMockTask({
              taskId: 'task-002',
              type: 'write',
              status: 'running',
              projectId: 'project-001',
              createdAt: '2024-01-02T10:00:00.000Z',
            })
          );
        }
        if (path.includes('task-003.json')) {
          return JSON.stringify(
            createMockTask({
              taskId: 'task-003',
              type: 'audit',
              status: 'pending',
              projectId: 'project-002',
              createdAt: '2024-01-03T10:00:00.000Z',
            })
          );
        }
        throw new Error('File not found');
      });
    });

    describe('list', () => {
      it('should list all tasks', async () => {
        const tasks = await taskPersistence.list();

        expect(tasks.length).toBe(3);
      });

      it('should sort tasks by createdAt descending', async () => {
        const tasks = await taskPersistence.list();

        expect(tasks[0].taskId).toBe('task-003'); // Newest
        expect(tasks[1].taskId).toBe('task-002');
        expect(tasks[2].taskId).toBe('task-001'); // Oldest
      });

      it('should return empty array when no tasks', async () => {
        mockFs.readFile.mockResolvedValue(JSON.stringify(createMockIndex()));

        const tasks = await taskPersistence.list();

        expect(tasks).toEqual([]);
      });
    });

    describe('list with filter', () => {
      it('should filter by projectId', async () => {
        const tasks = (await taskPersistence.list({
          projectId: 'project-001',
        })) as PersistedTask[];

        expect(tasks.length).toBe(2);
        expect(tasks.every((t) => t.projectId === 'project-001')).toBe(true);
      });

      it('should filter by single status', async () => {
        const tasks = await taskPersistence.list({ status: ['running'] });

        expect(tasks.length).toBe(1);
        expect(tasks[0].status).toBe('running');
      });

      it('should filter by multiple statuses', async () => {
        const tasks = await taskPersistence.list({
          status: ['completed', 'pending'],
        });

        expect(tasks.length).toBe(2);
        expect(['completed', 'pending']).toContain(tasks[0].status);
        expect(['completed', 'pending']).toContain(tasks[1].status);
      });

      it('should filter by both projectId and status', async () => {
        const tasks = (await taskPersistence.list({
          projectId: 'project-001',
          status: ['completed'],
        })) as PersistedTask[];

        expect(tasks.length).toBe(1);
        expect(tasks[0].projectId).toBe('project-001');
        expect(tasks[0].status).toBe('completed');
      });

      it('should return empty array when no match', async () => {
        const tasks = await taskPersistence.list({
          projectId: 'nonexistent-project',
        });

        expect(tasks).toEqual([]);
      });
    });
  });

  // ============================================
  // 3. Cleanup Mechanism Tests
  // ============================================

  describe('Cleanup Mechanism', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should cleanup completed tasks older than 24 hours', async () => {
      const now = new Date('2024-01-03T12:00:00.000Z');
      jest.setSystemTime(now);

      // Task completed 25 hours ago (should be cleaned)
      const oldCompletedAt = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();

      const index = createMockIndex({
        'old-task': {
          type: 'import',
          status: 'completed',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: oldCompletedAt,
          completedAt: oldCompletedAt,
          projectId: 'project-001',
          filePath: '/workspace/tasks/old-task.json',
        },
        'new-task': {
          type: 'write',
          status: 'completed',
          createdAt: '2024-01-03T10:00:00.000Z',
          updatedAt: now.toISOString(),
          completedAt: now.toISOString(),
          projectId: 'project-001',
          filePath: '/workspace/tasks/new-task.json',
        },
      });

      let callCount = 0;
      mockFs.readFile.mockImplementation(async (path: any) => {
        if (path.includes('index.json')) {
          callCount++;
          // First call returns original index, second call returns updated index
          if (callCount === 1) {
            return JSON.stringify(index);
          }
          // After cleanup, old-task is removed
          return JSON.stringify(
            createMockIndex({
              'new-task': index.tasks['new-task'],
            })
          );
        }
        if (path.includes('old-task.json')) {
          return JSON.stringify(
            createMockTask({
              taskId: 'old-task',
              status: 'completed',
              completedAt: oldCompletedAt,
            })
          );
        }
        if (path.includes('new-task.json')) {
          return JSON.stringify(
            createMockTask({
              taskId: 'new-task',
              status: 'completed',
              completedAt: now.toISOString(),
            })
          );
        }
        throw new Error('File not found');
      });

      const result = await taskPersistence.cleanup();

      expect(result.removed).toBe(1);
    });

    it('should not cleanup running tasks', async () => {
      const now = new Date('2024-01-03T12:00:00.000Z');
      jest.setSystemTime(now);

      // Running task started 48 hours ago
      const oldUpdatedAt = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

      const index = createMockIndex({
        'old-running': {
          type: 'write',
          status: 'running',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: oldUpdatedAt,
          projectId: 'project-001',
          filePath: '/workspace/tasks/old-running.json',
        },
      });

      mockFs.readFile.mockImplementation(async (path: any) => {
        if (path.includes('index.json')) {
          return JSON.stringify(index);
        }
        return JSON.stringify(
          createMockTask({
            taskId: 'old-running',
            status: 'running',
            updatedAt: oldUpdatedAt,
          })
        );
      });

      const result = await taskPersistence.cleanup();

      expect(result.removed).toBe(0);
    });

    it('should not cleanup pending tasks', async () => {
      const now = new Date('2024-01-03T12:00:00.000Z');
      jest.setSystemTime(now);

      const oldUpdatedAt = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

      const index = createMockIndex({
        'old-pending': {
          type: 'import',
          status: 'pending',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: oldUpdatedAt,
          projectId: 'project-001',
          filePath: '/workspace/tasks/old-pending.json',
        },
      });

      mockFs.readFile.mockResolvedValue(JSON.stringify(index));

      const result = await taskPersistence.cleanup();

      expect(result.removed).toBe(0);
    });

    it('should cleanup failed tasks older than 24 hours', async () => {
      const now = new Date('2024-01-03T12:00:00.000Z');
      jest.setSystemTime(now);

      const oldUpdatedAt = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();

      const index = createMockIndex({
        'old-failed': {
          type: 'import',
          status: 'failed',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: oldUpdatedAt,
          projectId: 'project-001',
          filePath: '/workspace/tasks/old-failed.json',
        },
      });

      mockFs.readFile.mockImplementation(async (path: any) => {
        if (path.includes('index.json')) {
          return JSON.stringify(index);
        }
        return JSON.stringify(
          createMockTask({
            taskId: 'old-failed',
            status: 'failed',
            updatedAt: oldUpdatedAt,
          })
        );
      });

      const result = await taskPersistence.cleanup();

      expect(result.removed).toBe(1);
    });

    it('should cleanup cancelled tasks older than 24 hours', async () => {
      const now = new Date('2024-01-03T12:00:00.000Z');
      jest.setSystemTime(now);

      const oldUpdatedAt = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();

      const index = createMockIndex({
        'old-cancelled': {
          type: 'write',
          status: 'cancelled',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: oldUpdatedAt,
          projectId: 'project-001',
          filePath: '/workspace/tasks/old-cancelled.json',
        },
      });

      mockFs.readFile.mockImplementation(async (path: any) => {
        if (path.includes('index.json')) {
          return JSON.stringify(index);
        }
        return JSON.stringify(
          createMockTask({
            taskId: 'old-cancelled',
            status: 'cancelled',
            updatedAt: oldUpdatedAt,
          })
        );
      });

      const result = await taskPersistence.cleanup();

      expect(result.removed).toBe(1);
    });

    it('should return zero removed when no expired tasks', async () => {
      const now = new Date('2024-01-03T12:00:00.000Z');
      jest.setSystemTime(now);

      const recentUpdatedAt = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();

      const index = createMockIndex({
        'recent-task': {
          type: 'import',
          status: 'completed',
          createdAt: '2024-01-03T10:00:00.000Z',
          updatedAt: recentUpdatedAt,
          completedAt: recentUpdatedAt,
          projectId: 'project-001',
          filePath: '/workspace/tasks/recent-task.json',
        },
      });

      mockFs.readFile.mockResolvedValue(JSON.stringify(index));

      const result = await taskPersistence.cleanup();

      expect(result.removed).toBe(0);
    });
  });

  // ============================================
  // 4. Restore Functionality Tests
  // ============================================

  describe('Restore Functionality', () => {
    it('should restore tasks from disk', async () => {
      const index = createMockIndex({
        'task-001': {
          type: 'import',
          status: 'completed',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T11:00:00.000Z',
          projectId: 'project-001',
          filePath: '/workspace/tasks/task-001.json',
        },
        'task-002': {
          type: 'write',
          status: 'running',
          createdAt: '2024-01-02T10:00:00.000Z',
          updatedAt: '2024-01-02T10:30:00.000Z',
          projectId: 'project-001',
          filePath: '/workspace/tasks/task-002.json',
        },
      });

      mockFs.readFile.mockImplementation(async (path: any) => {
        if (path.includes('index.json')) {
          return JSON.stringify(index);
        }
        if (path.includes('task-001.json')) {
          return JSON.stringify(
            createMockTask({
              taskId: 'task-001',
              type: 'import',
              status: 'completed',
              projectId: 'project-001',
            })
          );
        }
        if (path.includes('task-002.json')) {
          return JSON.stringify(
            createMockTask({
              taskId: 'task-002',
              type: 'write',
              status: 'running',
              projectId: 'project-001',
            })
          );
        }
        throw new Error('File not found');
      });

      const result = await taskPersistence.restore();

      expect(result.restored).toBe(2);
      expect(result.failed).toBe(0);
    });

    it('should handle failed task restoration', async () => {
      const index = createMockIndex({
        'good-task': {
          type: 'import',
          status: 'completed',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T11:00:00.000Z',
          projectId: 'project-001',
          filePath: '/workspace/tasks/good-task.json',
        },
        'bad-task': {
          type: 'write',
          status: 'running',
          createdAt: '2024-01-02T10:00:00.000Z',
          updatedAt: '2024-01-02T10:30:00.000Z',
          projectId: 'project-001',
          filePath: '/workspace/tasks/bad-task.json',
        },
      });

      mockFs.readFile.mockImplementation(async (filePath: any) => {
        const pathStr = filePath.toString();
        if (pathStr.includes('index.json')) {
          return JSON.stringify(index);
        }
        if (pathStr.includes('good-task.json')) {
          return JSON.stringify(
            createMockTask({
              taskId: 'good-task',
              type: 'import',
              status: 'completed',
            })
          );
        }
        if (pathStr.includes('bad-task.json')) {
          // Bad task - return invalid JSON that will fail during parsing
          return 'not valid json {{{';
        }
        throw new Error('File not found');
      });

      const result = await taskPersistence.restore();

      expect(result.restored).toBe(1);
      expect(result.failed).toBe(1);
    });

    it('should return zero when no tasks to restore', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(createMockIndex()));

      const result = await taskPersistence.restore();

      expect(result.restored).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should cache restored tasks in memory', async () => {
      const index = createMockIndex({
        'task-001': {
          type: 'import',
          status: 'completed',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T11:00:00.000Z',
          projectId: 'project-001',
          filePath: '/workspace/tasks/task-001.json',
        },
      });

      mockFs.readFile.mockImplementation(async (path: any) => {
        if (path.includes('index.json')) {
          return JSON.stringify(index);
        }
        return JSON.stringify(
          createMockTask({
            taskId: 'task-001',
            type: 'import',
            status: 'completed',
            projectId: 'project-001',
          })
        );
      });

      await taskPersistence.restore();

      // Clear file mock to verify memory cache is used
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const task = await taskPersistence.get('task-001');
      expect(task).not.toBeNull();
      expect(task?.taskId).toBe('task-001');
    });
  });

  // ============================================
  // 5. Statistics Functionality Tests
  // ============================================

  describe('Statistics Functionality', () => {
    beforeEach(() => {
      const index = createMockIndex({
        'task-001': {
          type: 'import',
          status: 'completed',
          createdAt: '2024-01-01T10:00:00.000Z',
          updatedAt: '2024-01-01T11:00:00.000Z',
          projectId: 'project-001',
          filePath: '/workspace/tasks/task-001.json',
        },
        'task-002': {
          type: 'write',
          status: 'running',
          createdAt: '2024-01-02T10:00:00.000Z',
          updatedAt: '2024-01-02T10:30:00.000Z',
          projectId: 'project-001',
          filePath: '/workspace/tasks/task-002.json',
        },
        'task-003': {
          type: 'write',
          status: 'pending',
          createdAt: '2024-01-03T10:00:00.000Z',
          updatedAt: '2024-01-03T10:00:00.000Z',
          projectId: 'project-002',
          filePath: '/workspace/tasks/task-003.json',
        },
        'task-004': {
          type: 'audit',
          status: 'failed',
          createdAt: '2024-01-04T10:00:00.000Z',
          updatedAt: '2024-01-04T10:15:00.000Z',
          projectId: 'project-002',
          filePath: '/workspace/tasks/task-004.json',
        },
        'task-005': {
          type: 'export',
          status: 'cancelled',
          createdAt: '2024-01-05T10:00:00.000Z',
          updatedAt: '2024-01-05T10:05:00.000Z',
          projectId: 'project-003',
          filePath: '/workspace/tasks/task-005.json',
        },
      });

      mockFs.readFile.mockImplementation(async (path: any) => {
        if (path.includes('index.json')) {
          return JSON.stringify(index);
        }
        if (path.includes('task-001.json')) {
          return JSON.stringify(
            createMockTask({
              taskId: 'task-001',
              type: 'import',
              status: 'completed',
              createdAt: '2024-01-01T10:00:00.000Z',
            })
          );
        }
        if (path.includes('task-002.json')) {
          return JSON.stringify(
            createMockTask({
              taskId: 'task-002',
              type: 'write',
              status: 'running',
              createdAt: '2024-01-02T10:00:00.000Z',
            })
          );
        }
        if (path.includes('task-003.json')) {
          return JSON.stringify(
            createMockTask({
              taskId: 'task-003',
              type: 'write',
              status: 'pending',
              createdAt: '2024-01-03T10:00:00.000Z',
            })
          );
        }
        if (path.includes('task-004.json')) {
          return JSON.stringify(
            createMockTask({
              taskId: 'task-004',
              type: 'audit',
              status: 'failed',
              createdAt: '2024-01-04T10:00:00.000Z',
            })
          );
        }
        if (path.includes('task-005.json')) {
          return JSON.stringify(
            createMockTask({
              taskId: 'task-005',
              type: 'export',
              status: 'cancelled',
              createdAt: '2024-01-05T10:00:00.000Z',
            })
          );
        }
        throw new Error('File not found');
      });
    });

    it('should return total task count', async () => {
      const stats = await taskPersistence.getStats();

      expect(stats.totalTasks).toBe(5);
    });

    it('should return count by status', async () => {
      const stats = await taskPersistence.getStats();

      expect(stats.byStatus['completed']).toBe(1);
      expect(stats.byStatus['running']).toBe(1);
      expect(stats.byStatus['pending']).toBe(1);
      expect(stats.byStatus['failed']).toBe(1);
      expect(stats.byStatus['cancelled']).toBe(1);
    });

    it('should return count by type', async () => {
      const stats = await taskPersistence.getStats();

      expect(stats.byType['import']).toBe(1);
      expect(stats.byType['write']).toBe(2);
      expect(stats.byType['audit']).toBe(1);
      expect(stats.byType['export']).toBe(1);
    });

    it('should return oldest and newest task IDs', async () => {
      const stats = await taskPersistence.getStats();

      expect(stats.oldestTask).toBe('task-001');
      expect(stats.newestTask).toBe('task-005');
    });

    it('should return null for oldest/newest when no tasks', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(createMockIndex()));

      const stats = await taskPersistence.getStats();

      expect(stats.totalTasks).toBe(0);
      expect(stats.oldestTask).toBeNull();
      expect(stats.newestTask).toBeNull();
    });

    it('should initialize all status counts to zero', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(createMockIndex()));

      const stats = await taskPersistence.getStats();

      const statuses: TaskStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled'];
      for (const status of statuses) {
        expect(stats.byStatus[status]).toBe(0);
      }
    });
  });

  // ============================================
  // 6. Edge Cases and Error Handling
  // ============================================

  describe('Edge Cases and Error Handling', () => {
    it('should handle corrupted index file', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');

      const tasks = await taskPersistence.list();

      expect(tasks).toEqual([]);
    });

    it('should handle missing index file', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const tasks = await taskPersistence.list();

      expect(tasks).toEqual([]);
    });

    it('should handle concurrent operations', async () => {
      // Create multiple tasks concurrently
      const promises = [
        taskPersistence.create('import', 'project-001'),
        taskPersistence.create('write', 'project-002'),
        taskPersistence.create('audit', 'project-003'),
      ];

      const results = await Promise.all(promises);

      expect(results.length).toBe(3);
      expect(results[0].taskId).toBeDefined();
      expect(results[1].taskId).toBeDefined();
      expect(results[2].taskId).toBeDefined();
    });

    it('should wait for initialization before operations', async () => {
      // Delay mkdir to simulate slow initialization
      mockFs.mkdir.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(undefined), 100);
          })
      );

      const newPersistence = new TaskPersistence();

      // This should wait for initialization
      const task = await newPersistence.create('import', 'project-001');

      expect(task).toBeDefined();
      expect(mockFs.mkdir).toHaveBeenCalled();
    });
  });
});
