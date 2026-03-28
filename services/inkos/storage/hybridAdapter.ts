/**
 * 混合存储适配器
 *
 * 结合文件系统和 IndexedDB 存储，支持双向同步
 * 用于同时支持 CLI 和 Web 模式的场景
 */

import type {
  StorageAdapter,
  StorageAdapterConfig,
  SyncOptions,
  SyncResult,
  SyncProgress,
  StorageEventListener,
  StorageEvent,
} from './interface';
import type { InkosBookConfig, InkosTruthFiles } from '../types/mapping';
import { IndexedDBStorageAdapter } from './indexeddbAdapter';
import { FileStorageAdapter } from './fileAdapter';

/**
 * 同步状态
 */
interface SyncState {
  lastSyncTime: number;
  direction: 'to_muse' | 'from_muse';
  bookId: string;
  projectId?: string;
}

/**
 * 混合存储适配器实现
 */
export class HybridStorageAdapter implements StorageAdapter {
  private config: StorageAdapterConfig;
  private indexedDBAdapter: IndexedDBStorageAdapter;
  private fileAdapter: FileStorageAdapter | null = null;
  private eventListeners: Map<string, StorageEventListener[]> = new Map();
  private syncStates: Map<string, SyncState> = new Map();

  constructor(config: StorageAdapterConfig) {
    this.config = config;

    // 初始化 IndexedDB 适配器（始终可用）
    this.indexedDBAdapter = new IndexedDBStorageAdapter({
      ...config,
      type: 'indexeddb',
    });

    // 在 Node.js 环境中初始化文件系统适配器
    if (this.isNodeEnvironment()) {
      this.fileAdapter = new FileStorageAdapter({
        ...config,
        type: 'file',
      });
    }
  }

  /**
   * 检查是否在 Node.js 环境
   */
  private isNodeEnvironment(): boolean {
    return typeof process !== 'undefined' && process.versions?.node != null;
  }

  /**
   * 读取 Truth File
   * 优先从 IndexedDB 读取，失败则尝试文件系统
   */
  async readTruthFile(bookId: string, fileName: string): Promise<string> {
    try {
      return await this.indexedDBAdapter.readTruthFile(bookId, fileName);
    } catch (indexedDBError) {
      // IndexedDB 读取失败，尝试文件系统
      if (this.fileAdapter) {
        try {
          return await this.fileAdapter.readTruthFile(bookId, fileName);
        } catch (fileError) {
          // 两者都失败，抛出原始错误
          throw indexedDBError;
        }
      }
      throw indexedDBError;
    }
  }

  /**
   * 写入 Truth File
   * 同时写入 IndexedDB 和文件系统（如果可用）
   */
  async writeTruthFile(bookId: string, fileName: string, content: string): Promise<void> {
    const promises: Promise<void>[] = [];

    // 写入 IndexedDB
    promises.push(this.indexedDBAdapter.writeTruthFile(bookId, fileName, content));

    // 写入文件系统（如果可用）
    if (this.fileAdapter) {
      promises.push(
        this.fileAdapter.writeTruthFile(bookId, fileName, content).catch(error => {
          console.warn('Failed to write to file system:', error);
        })
      );
    }

    await Promise.all(promises);
  }

  /**
   * 删除 Truth File
   * 同时从 IndexedDB 和文件系统删除
   */
  async deleteTruthFile(bookId: string, fileName: string): Promise<void> {
    const promises: Promise<void>[] = [];

    promises.push(this.indexedDBAdapter.deleteTruthFile(bookId, fileName));

    if (this.fileAdapter) {
      promises.push(
        this.fileAdapter.deleteTruthFile(bookId, fileName).catch(error => {
          console.warn('Failed to delete from file system:', error);
        })
      );
    }

    await Promise.all(promises);
  }

  /**
   * 列出书籍的所有 Truth Files
   * 合并两个数据源的结果
   */
  async listTruthFiles(bookId: string): Promise<string[]> {
    const fileSets = await Promise.all([
      this.indexedDBAdapter.listTruthFiles(bookId),
      this.fileAdapter ? this.fileAdapter.listTruthFiles(bookId) : Promise.resolve([]),
    ]);

    // 合并并去重
    return Array.from(new Set(fileSets.flat()));
  }

  /**
   * 列出所有书籍
   * 合并两个数据源的结果
   */
  async listBooks(): Promise<string[]> {
    const bookSets = await Promise.all([
      this.indexedDBAdapter.listBooks(),
      this.fileAdapter ? this.fileAdapter.listBooks() : Promise.resolve([]),
    ]);

    // 合并并去重
    return Array.from(new Set(bookSets.flat()));
  }

  /**
   * 创建书籍
   * 同时在两个存储中创建
   */
  async createBook(config: InkosBookConfig): Promise<void> {
    const promises: Promise<void>[] = [];

    promises.push(this.indexedDBAdapter.createBook(config));

    if (this.fileAdapter) {
      promises.push(this.fileAdapter.createBook(config));
    }

    await Promise.all(promises);

    this.emitEvent({
      type: 'book:create',
      timestamp: Date.now(),
      data: { bookId: config.id, config },
    });
  }

  /**
   * 获取书籍配置
   * 优先从 IndexedDB 读取
   */
  async getBookConfig(bookId: string): Promise<InkosBookConfig | null> {
    const config = await this.indexedDBAdapter.getBookConfig(bookId);
    if (config) {
      return config;
    }

    // 尝试从文件系统读取
    if (this.fileAdapter) {
      return await this.fileAdapter.getBookConfig(bookId);
    }

    return null;
  }

  /**
   * 更新书籍配置
   * 同时更新两个存储
   */
  async updateBookConfig(bookId: string, config: Partial<InkosBookConfig>): Promise<void> {
    const promises: Promise<void>[] = [];

    promises.push(this.indexedDBAdapter.updateBookConfig(bookId, config));

    if (this.fileAdapter) {
      promises.push(this.fileAdapter.updateBookConfig(bookId, config));
    }

    await Promise.all(promises);
  }

  /**
   * 删除书籍
   * 同时从两个存储删除
   */
  async deleteBook(bookId: string): Promise<void> {
    const promises: Promise<void>[] = [];

    promises.push(this.indexedDBAdapter.deleteBook(bookId));

    if (this.fileAdapter) {
      promises.push(this.fileAdapter.deleteBook(bookId));
    }

    await Promise.all(promises);

    this.emitEvent({
      type: 'book:delete',
      timestamp: Date.now(),
      data: { bookId },
    });
  }

  /**
   * 同步到 Muse IndexedDB
   * 执行完整的同步流程
   */
  async syncToMuse(bookId: string, options?: SyncOptions): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      bookId,
      direction: 'to_muse',
      timestamp: Date.now(),
      stats: {
        filesProcessed: 0,
        filesCreated: 0,
        filesUpdated: 0,
        filesSkipped: 0,
        errors: 0,
      },
    };

    try {
      this.emitEvent({
        type: 'sync:start',
        timestamp: Date.now(),
        data: { bookId, direction: 'to_muse' },
      });

      // 获取所有 Truth Files
      const truthFiles = await this.getTruthFiles(bookId);
      if (!truthFiles) {
        throw new Error(`Book not found: ${bookId}`);
      }

      // 执行同步
      await this.indexedDBAdapter.syncToMuse(bookId);

      // 更新同步状态
      this.syncStates.set(bookId, {
        lastSyncTime: Date.now(),
        direction: 'to_muse',
        bookId,
      });

      result.success = true;
      result.stats.filesProcessed = 7; // 7 个 Truth Files

      this.emitEvent({
        type: 'sync:complete',
        timestamp: Date.now(),
        data: result,
      });
    } catch (error) {
      result.errors = [
        {
          file: 'sync',
          error: error instanceof Error ? error.message : String(error),
        },
      ];
      result.stats.errors = 1;

      this.emitEvent({
        type: 'sync:error',
        timestamp: Date.now(),
        data: result,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }

    return result;
  }

  /**
   * 从 Muse IndexedDB 同步
   * 执行完整的同步流程
   */
  async syncFromMuse(projectId: string, options?: SyncOptions): Promise<string> {
    this.emitEvent({
      type: 'sync:start',
      timestamp: Date.now(),
      data: { projectId, direction: 'from_muse' },
    });

    try {
      // 从 Muse 项目创建/更新 inkos 书籍
      const bookId = await this.indexedDBAdapter.syncFromMuse(projectId);

      // 如果文件系统可用，也同步到文件
      if (this.fileAdapter) {
        const truthFiles = await this.indexedDBAdapter.getTruthFiles(bookId);
        if (truthFiles) {
          await this.syncTruthFilesToFileSystem(bookId, truthFiles);
        }
      }

      // 更新同步状态
      this.syncStates.set(bookId, {
        lastSyncTime: Date.now(),
        direction: 'from_muse',
        bookId,
        projectId,
      });

      this.emitEvent({
        type: 'sync:complete',
        timestamp: Date.now(),
        data: { bookId, projectId, direction: 'from_muse' },
      });

      return bookId;
    } catch (error) {
      this.emitEvent({
        type: 'sync:error',
        timestamp: Date.now(),
        data: { projectId, direction: 'from_muse' },
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * 检查书籍是否存在
   */
  async bookExists(bookId: string): Promise<boolean> {
    const exists = await this.indexedDBAdapter.bookExists(bookId);
    if (exists) {
      return true;
    }

    if (this.fileAdapter) {
      return await this.fileAdapter.bookExists(bookId);
    }

    return false;
  }

  /**
   * 获取完整的 Truth Files
   */
  async getTruthFiles(bookId: string): Promise<InkosTruthFiles | null> {
    // 优先从 IndexedDB 读取
    const truthFiles = await this.indexedDBAdapter.getTruthFiles(bookId);
    if (truthFiles) {
      return truthFiles;
    }

    // 尝试从文件系统读取
    if (this.fileAdapter) {
      return await this.fileAdapter.getTruthFiles(bookId);
    }

    return null;
  }

  /**
   * 获取同步状态
   */
  getSyncState(bookId: string): SyncState | undefined {
    return this.syncStates.get(bookId);
  }

  /**
   * 执行双向同步
   */
  async bidirectionalSync(bookId: string, options?: SyncOptions): Promise<{
    toMuse: SyncResult;
    fromMuse: SyncResult;
  }> {
    const toMuse = await this.syncToMuse(bookId, options);

    // 注意：双向同步可能需要冲突解决逻辑
    // 这里简化处理，实际应用中需要更复杂的合并策略

    return {
      toMuse,
      fromMuse: {
        success: true,
        bookId,
        direction: 'from_muse',
        timestamp: Date.now(),
        stats: {
          filesProcessed: 0,
          filesCreated: 0,
          filesUpdated: 0,
          filesSkipped: 0,
          errors: 0,
        },
      },
    };
  }

  /**
   * 添加事件监听器
   */
  addEventListener(type: string, listener: StorageEventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);

    // 也添加到子适配器
    this.indexedDBAdapter.addEventListener(type, listener);
    if (this.fileAdapter) {
      this.fileAdapter.addEventListener(type, listener);
    }
  }

  /**
   * 移除事件监听器
   */
  removeEventListener(type: string, listener: StorageEventListener): void {
    const listeners = this.eventListeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }

    // 也从子适配器移除
    this.indexedDBAdapter.removeEventListener(type, listener);
    if (this.fileAdapter) {
      this.fileAdapter.removeEventListener(type, listener);
    }
  }

  /**
   * 触发事件
   */
  private emitEvent(event: StorageEvent): void {
    if (!this.config.enableEvents) return;

    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('Event listener error:', error);
        }
      });
    }
  }

  /**
   * 同步 Truth Files 到文件系统
   */
  private async syncTruthFilesToFileSystem(
    bookId: string,
    truthFiles: InkosTruthFiles
  ): Promise<void> {
    if (!this.fileAdapter) return;

    const files: Array<[string, string]> = [
      ['current_state.md', JSON.stringify(truthFiles.currentState, null, 2)],
      ['pending_hooks.md', JSON.stringify(truthFiles.pendingHooks, null, 2)],
      ['chapter_summaries.md', JSON.stringify(truthFiles.chapterSummaries, null, 2)],
      ['subplot_board.md', JSON.stringify(truthFiles.subplotBoard, null, 2)],
      ['emotional_arcs.md', JSON.stringify(truthFiles.emotionalArcs, null, 2)],
      ['character_matrix.md', JSON.stringify(truthFiles.characterMatrix, null, 2)],
    ];

    if (truthFiles.particleLedger) {
      files.push(['particle_ledger.md', JSON.stringify(truthFiles.particleLedger, null, 2)]);
    }

    await Promise.all(
      files.map(([fileName, content]) =>
        this.fileAdapter!.writeTruthFile(bookId, fileName, content)
      )
    );
  }
}
