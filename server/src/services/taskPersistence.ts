/**
 * Task Persistence Service
 * Provides file-system based persistence for task states
 * Supports automatic cleanup of expired tasks (24 hours after completion)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TaskInfo, TaskStatus } from '../types/inkos';

/**
 * Task storage path
 */
const TASK_STORAGE_PATH = path.join(process.cwd(), 'workspace', 'tasks');

/**
 * Task expiration time in milliseconds (24 hours)
 */
const TASK_EXPIRATION_MS = 24 * 60 * 60 * 1000;

/**
 * Task index file name
 */
const TASK_INDEX_FILE = 'index.json';

/**
 * Task file extension
 */
const TASK_FILE_EXTENSION = '.json';

/**
 * Extended TaskInfo with persistence metadata
 */
export interface PersistedTask extends TaskInfo {
  projectId?: string;
  filePath?: string;
}

/**
 * Task index structure
 */
interface TaskIndex {
  version: string;
  lastUpdated: string;
  tasks: {
    [taskId: string]: {
      type: TaskInfo['type'];
      status: TaskStatus;
      createdAt: string;
      updatedAt: string;
      completedAt?: string;
      projectId?: string;
      filePath: string;
    };
  };
}

/**
 * TaskStore Interface
 */
export interface ITaskStore {
  create(type: TaskInfo['type'], projectId: string): Promise<TaskInfo>;
  get(taskId: string): Promise<TaskInfo | null>;
  update(taskId: string, updates: Partial<TaskInfo>): Promise<TaskInfo | null>;
  delete(taskId: string): Promise<void>;
  list(filter?: { projectId?: string; status?: TaskStatus[] }): Promise<TaskInfo[]>;
  cleanup(): Promise<{ removed: number; remaining: number }>;
}

/**
 * File-based Task Persistence Store
 * Implements persistent storage for task states with automatic cleanup
 */
export class TaskPersistence implements ITaskStore {
  private memoryFallback: Map<string, TaskInfo> = new Map();
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initPromise = this.ensureStorageDir();
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDir(): Promise<void> {
    try {
      await fs.mkdir(TASK_STORAGE_PATH, { recursive: true });
      this.initialized = true;
    } catch (error) {
      console.error('[TaskPersistence] Failed to create storage directory:', error);
      // Fallback to memory mode
      this.initialized = true;
    }
  }

  /**
   * Wait for initialization to complete
   */
  private async waitForInit(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise;
    }
  }

  /**
   * Get task file path
   */
  private getTaskFilePath(taskId: string): string {
    return path.join(TASK_STORAGE_PATH, `${taskId}${TASK_FILE_EXTENSION}`);
  }

  /**
   * Get index file path
   */
  private getIndexPath(): string {
    return path.join(TASK_STORAGE_PATH, TASK_INDEX_FILE);
  }

  /**
   * Read task index
   */
  private async readIndex(): Promise<TaskIndex> {
    const indexPath = this.getIndexPath();
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // Index doesn't exist or is corrupted, return empty index
      return {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        tasks: {},
      };
    }
  }

  /**
   * Write task index
   */
  private async writeIndex(index: TaskIndex): Promise<void> {
    const indexPath = this.getIndexPath();
    index.lastUpdated = new Date().toISOString();
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  /**
   * Create a new task
   */
  async create(type: TaskInfo['type'], projectId: string): Promise<TaskInfo> {
    await this.waitForInit();

    const taskId = uuidv4();
    const now = new Date().toISOString();
    const task: PersistedTask = {
      taskId,
      type,
      status: 'pending',
      progress: 0,
      message: 'Task created',
      createdAt: now,
      updatedAt: now,
      projectId,
    };

    try {
      // Save task to file
      const filePath = this.getTaskFilePath(taskId);
      await fs.writeFile(filePath, JSON.stringify(task, null, 2), 'utf-8');

      // Update index
      const index = await this.readIndex();
      index.tasks[taskId] = {
        type: task.type,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        projectId,
        filePath,
      };
      await this.writeIndex(index);

      task.filePath = filePath;

      // Also keep in memory for fast access
      this.memoryFallback.set(taskId, task);

      console.log(`[TaskPersistence] Task created: ${taskId} (${type}) for project ${projectId}`);
      return task;
    } catch (error) {
      console.error('[TaskPersistence] Failed to create task, using memory fallback:', error);
      // Fallback to memory
      this.memoryFallback.set(taskId, task);
      return task;
    }
  }

  /**
   * Get task by ID
   */
  async get(taskId: string): Promise<TaskInfo | null> {
    await this.waitForInit();

    // Try memory first (faster)
    const memoryTask = this.memoryFallback.get(taskId);
    if (memoryTask) {
      return memoryTask;
    }

    try {
      // Try to read from file
      const filePath = this.getTaskFilePath(taskId);
      const content = await fs.readFile(filePath, 'utf-8');
      const task = JSON.parse(content) as PersistedTask;

      // Cache in memory
      this.memoryFallback.set(taskId, task);

      return task;
    } catch {
      // Task doesn't exist
      return null;
    }
  }

  /**
   * Update task
   */
  async update(taskId: string, updates: Partial<TaskInfo>): Promise<TaskInfo | null> {
    await this.waitForInit();

    const existingTask = await this.get(taskId);
    if (!existingTask) {
      return null;
    }

    const now = new Date().toISOString();
    const updatedTask: PersistedTask = {
      ...existingTask,
      ...updates,
      updatedAt: now,
    };

    try {
      // Update file
      const filePath = this.getTaskFilePath(taskId);
      await fs.writeFile(filePath, JSON.stringify(updatedTask, null, 2), 'utf-8');

      // Update index
      const index = await this.readIndex();
      if (index.tasks[taskId]) {
        index.tasks[taskId].status = updatedTask.status;
        index.tasks[taskId].updatedAt = updatedTask.updatedAt;
        if (updatedTask.completedAt) {
          index.tasks[taskId].completedAt = updatedTask.completedAt;
        }
        await this.writeIndex(index);
      }

      // Update memory cache
      this.memoryFallback.set(taskId, updatedTask);

      console.log(`[TaskPersistence] Task updated: ${taskId} - ${updatedTask.status} (${updatedTask.progress}%)`);
      return updatedTask;
    } catch (error) {
      console.error('[TaskPersistence] Failed to update task file, updating memory only:', error);
      // Fallback to memory
      this.memoryFallback.set(taskId, updatedTask);
      return updatedTask;
    }
  }

  /**
   * Delete task
   */
  async delete(taskId: string): Promise<void> {
    await this.waitForInit();

    try {
      // Delete file
      const filePath = this.getTaskFilePath(taskId);
      await fs.unlink(filePath);

      // Remove from index
      const index = await this.readIndex();
      delete index.tasks[taskId];
      await this.writeIndex(index);

      // Remove from memory
      this.memoryFallback.delete(taskId);

      console.log(`[TaskPersistence] Task deleted: ${taskId}`);
    } catch (error) {
      // File might not exist, just clean up memory
      this.memoryFallback.delete(taskId);
    }
  }

  /**
   * List all tasks with optional filter
   */
  async list(filter?: { projectId?: string; status?: TaskStatus[] }): Promise<TaskInfo[]> {
    await this.waitForInit();

    const tasks: TaskInfo[] = [];
    const index = await this.readIndex();

    for (const taskId of Object.keys(index.tasks)) {
      const taskMeta = index.tasks[taskId];

      // Apply filters
      if (filter?.projectId && taskMeta.projectId !== filter.projectId) {
        continue;
      }
      if (filter?.status && !filter.status.includes(taskMeta.status)) {
        continue;
      }

      // Load full task data
      const task = await this.get(taskId);
      if (task) {
        tasks.push(task);
      }
    }

    // Sort by createdAt descending (newest first)
    tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return tasks;
  }

  /**
   * Cleanup expired tasks
   * Removes completed/failed/cancelled tasks that are older than 24 hours
   */
  async cleanup(): Promise<{ removed: number; remaining: number }> {
    await this.waitForInit();

    const now = Date.now();
    const index = await this.readIndex();
    let removed = 0;
    const toRemove: string[] = [];

    // Find expired tasks
    for (const [taskId, meta] of Object.entries(index.tasks)) {
      // Only cleanup completed/failed/cancelled tasks
      if (!['completed', 'failed', 'cancelled'].includes(meta.status)) {
        continue;
      }

      // Check if task has completedAt or updatedAt
      const expirationDate = meta.completedAt || meta.updatedAt;
      if (!expirationDate) {
        continue;
      }

      const expirationTime = new Date(expirationDate).getTime();
      if (now - expirationTime > TASK_EXPIRATION_MS) {
        toRemove.push(taskId);
      }
    }

    // Remove expired tasks
    for (const taskId of toRemove) {
      await this.delete(taskId);
      removed++;
    }

    // Count remaining tasks
    const remainingIndex = await this.readIndex();
    const remaining = Object.keys(remainingIndex.tasks).length;

    if (removed > 0) {
      console.log(`[TaskPersistence] Cleanup completed: ${removed} tasks removed, ${remaining} remaining`);
    }

    return { removed, remaining };
  }

  /**
   * Restore tasks from disk to memory
   * Call this on server startup to restore previous state
   */
  async restore(): Promise<{ restored: number; failed: number }> {
    await this.waitForInit();

    const index = await this.readIndex();
    let restored = 0;
    let failed = 0;

    for (const taskId of Object.keys(index.tasks)) {
      try {
        // Read directly from file to detect JSON parsing errors
        const filePath = this.getTaskFilePath(taskId);
        const content = await fs.readFile(filePath, 'utf-8');
        const task = JSON.parse(content) as PersistedTask;
        this.memoryFallback.set(taskId, task);
        restored++;
      } catch {
        failed++;
      }
    }

    console.log(`[TaskPersistence] Restored ${restored} tasks from disk (${failed} failed)`);
    return { restored, failed };
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalTasks: number;
    byStatus: Record<TaskStatus, number>;
    byType: Record<string, number>;
    oldestTask: string | null;
    newestTask: string | null;
  }> {
    await this.waitForInit();

    const tasks = await this.list();
    const stats = {
      totalTasks: tasks.length,
      byStatus: {} as Record<TaskStatus, number>,
      byType: {} as Record<string, number>,
      oldestTask: null as string | null,
      newestTask: null as string | null,
    };

    // Initialize status counts
    const statuses: TaskStatus[] = ['pending', 'running', 'completed', 'failed', 'cancelled'];
    for (const status of statuses) {
      stats.byStatus[status] = 0;
    }

    // Calculate statistics
    for (const task of tasks) {
      stats.byStatus[task.status]++;
      stats.byType[task.type] = (stats.byType[task.type] || 0) + 1;
    }

    // Find oldest and newest
    if (tasks.length > 0) {
      const sorted = [...tasks].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      stats.oldestTask = sorted[0].taskId;
      stats.newestTask = sorted[sorted.length - 1].taskId;
    }

    return stats;
  }
}

// Export singleton instance
export const taskPersistence = new TaskPersistence();

// Export convenience function for backward compatibility
export function getTaskStore(): TaskPersistence {
  return taskPersistence;
}
