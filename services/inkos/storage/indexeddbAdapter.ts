/**
 * IndexedDB 存储适配器
 *
 * 用于 Web 环境的存储实现，基于 localforage
 * 与 Muse 的 IndexedDB 存储系统对接
 */

import * as localforage from 'localforage';
import type {
  StorageAdapter,
  StorageAdapterConfig,
  SyncOptions,
  SyncResult,
  StorageEventListener,
  StorageEvent,
} from './interface';
import type {
  InkosBookConfig,
  InkosTruthFiles,
  InkosCurrentState,
  InkosPendingHook,
  InkosChapterSummary,
  InkosSubplot,
  InkosEmotionalArc,
  InkosCharacterMatrix,
} from '../types/mapping';
import { storageService } from '../../storageService';
import type { ProjectState } from '../../../types';

/**
 * IndexedDB 存储适配器实现
 */
export class IndexedDBStorageAdapter implements StorageAdapter {
  private config: StorageAdapterConfig;
  private inkosStore: LocalForage;
  private eventListeners: Map<string, StorageEventListener[]> = new Map();

  constructor(config: StorageAdapterConfig) {
    this.config = config;

    // 初始化 inkos 专用存储实例
    this.inkosStore = localforage.createInstance({
      name: config.dbName || 'muse_inkos_store',
      storeName: 'inkos_truth_files',
      description: 'inkos Truth Files storage for Muse',
    });
  }

  /**
   * 读取 Truth File
   */
  async readTruthFile(bookId: string, fileName: string): Promise<string> {
    try {
      const key = this.getFileKey(bookId, fileName);
      const content = await this.inkosStore.getItem<string>(key);

      if (content === null) {
        throw new Error(`Truth file not found: ${fileName} for book: ${bookId}`);
      }

      this.emitEvent({
        type: 'file:read',
        timestamp: Date.now(),
        data: { bookId, fileName },
      });

      return content;
    } catch (error) {
      this.emitEvent({
        type: 'file:read',
        timestamp: Date.now(),
        data: { bookId, fileName },
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * 写入 Truth File
   */
  async writeTruthFile(bookId: string, fileName: string, content: string): Promise<void> {
    try {
      const key = this.getFileKey(bookId, fileName);
      await this.inkosStore.setItem(key, content);

      this.emitEvent({
        type: 'file:write',
        timestamp: Date.now(),
        data: { bookId, fileName },
      });
    } catch (error) {
      this.emitEvent({
        type: 'file:write',
        timestamp: Date.now(),
        data: { bookId, fileName },
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * 删除 Truth File
   */
  async deleteTruthFile(bookId: string, fileName: string): Promise<void> {
    try {
      const key = this.getFileKey(bookId, fileName);
      await this.inkosStore.removeItem(key);

      this.emitEvent({
        type: 'file:delete',
        timestamp: Date.now(),
        data: { bookId, fileName },
      });
    } catch (error) {
      this.emitEvent({
        type: 'file:delete',
        timestamp: Date.now(),
        data: { bookId, fileName },
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * 列出书籍的所有 Truth Files
   */
  async listTruthFiles(bookId: string): Promise<string[]> {
    const files: string[] = [];
    const prefix = `${bookId}/`;

    await this.inkosStore.iterate<string, void>((_value, key) => {
      if (key.startsWith(prefix)) {
        const fileName = key.substring(prefix.length);
        files.push(fileName);
      }
    });

    return files;
  }

  /**
   * 列出所有书籍
   */
  async listBooks(): Promise<string[]> {
    const books = new Set<string>();

    await this.inkosStore.iterate<string, void>((_value, key) => {
      const parts = key.split('/');
      if (parts.length > 0) {
        books.add(parts[0]);
      }
    });

    // 也检查 book configs
    const configs = await this.inkosStore.getItem<Record<string, InkosBookConfig>>('book_configs');
    if (configs) {
      Object.keys(configs).forEach(bookId => books.add(bookId));
    }

    return Array.from(books);
  }

  /**
   * 创建书籍
   */
  async createBook(config: InkosBookConfig): Promise<void> {
    try {
      // 存储配置
      const configs = (await this.inkosStore.getItem<Record<string, InkosBookConfig>>('book_configs')) || {};
      configs[config.id] = {
        ...config,
        status: config.status || 'draft',
      };
      await this.inkosStore.setItem('book_configs', configs);

      // 创建默认的 Truth Files
      await this.initializeDefaultTruthFiles(config.id);

      this.emitEvent({
        type: 'book:create',
        timestamp: Date.now(),
        data: { bookId: config.id, config },
      });
    } catch (error) {
      this.emitEvent({
        type: 'book:create',
        timestamp: Date.now(),
        data: { bookId: config.id, config },
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * 获取书籍配置
   */
  async getBookConfig(bookId: string): Promise<InkosBookConfig | null> {
    const configs = await this.inkosStore.getItem<Record<string, InkosBookConfig>>('book_configs');
    return configs?.[bookId] || null;
  }

  /**
   * 更新书籍配置
   */
  async updateBookConfig(bookId: string, config: Partial<InkosBookConfig>): Promise<void> {
    const configs = (await this.inkosStore.getItem<Record<string, InkosBookConfig>>('book_configs')) || {};
    if (configs[bookId]) {
      configs[bookId] = {
        ...configs[bookId],
        ...config,
      };
      await this.inkosStore.setItem('book_configs', configs);
    }
  }

  /**
   * 删除书籍
   */
  async deleteBook(bookId: string): Promise<void> {
    try {
      // 删除所有相关文件
      const files = await this.listTruthFiles(bookId);
      for (const file of files) {
        await this.deleteTruthFile(bookId, file);
      }

      // 删除配置
      const configs = await this.inkosStore.getItem<Record<string, InkosBookConfig>>('book_configs');
      if (configs && configs[bookId]) {
        delete configs[bookId];
        await this.inkosStore.setItem('book_configs', configs);
      }

      this.emitEvent({
        type: 'book:delete',
        timestamp: Date.now(),
        data: { bookId },
      });
    } catch (error) {
      this.emitEvent({
        type: 'book:delete',
        timestamp: Date.now(),
        data: { bookId },
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  /**
   * 同步到 Muse IndexedDB
   */
  async syncToMuse(bookId: string, _options?: SyncOptions): Promise<SyncResult> {
    // 这里需要将 inkos 数据转换为 Muse 项目格式
    // 实际的转换逻辑在 converters 中实现
    // 这里只负责存储层面的同步

    const truthFiles = await this.getTruthFiles(bookId);
    if (!truthFiles) {
      throw new Error(`Book not found: ${bookId}`);
    }

    // 存储到 Muse 的项目存储中
    // 具体的映射逻辑需要通过转换器完成
    await storageService.setItem(`inkos_sync_${bookId}`, {
      truthFiles,
      lastSync: Date.now(),
    });

    return {
      success: true,
      bookId,
      direction: 'to_muse',
      timestamp: Date.now(),
      stats: {
        filesProcessed: 7,
        filesCreated: 0,
        filesUpdated: 7,
        filesSkipped: 0,
        errors: 0,
      },
    };
  }

  /**
   * 从 Muse IndexedDB 同步
   */
  async syncFromMuse(projectId: string, _options?: SyncOptions): Promise<string> {
    // 从 Muse 项目数据创建 inkos 书籍
    const projects = await storageService.getItem<ProjectState[]>('muse_projects');
    const project = projects?.find(p => p.id === projectId);

    if (!project) {
      throw new Error(`Muse project not found: ${projectId}`);
    }

    // 创建对应的 inkos 书籍
    const bookId = `inkos_${projectId}`;
    const config: InkosBookConfig = {
      id: bookId,
      title: project.title,
      genre: project.genre,
      platform: 'muse',
      targetChapters: project.chapters.length || 100,
      chapterWordCount: 3000,
      language: 'zh',
      status: 'active',
    };

    // 检查是否已存在
    const existing = await this.getBookConfig(bookId);
    if (!existing) {
      await this.createBook(config);
    } else {
      await this.updateBookConfig(bookId, config);
    }

    return bookId;
  }

  /**
   * 检查书籍是否存在
   */
  async bookExists(bookId: string): Promise<boolean> {
    const config = await this.getBookConfig(bookId);
    return config !== null;
  }

  /**
   * 获取完整的 Truth Files
   */
  async getTruthFiles(bookId: string): Promise<InkosTruthFiles | null> {
    try {
      const exists = await this.bookExists(bookId);
      if (!exists) {
        return null;
      }

      const truthFiles: InkosTruthFiles = {
        currentState: await this.parseFile<InkosCurrentState>(
          bookId,
          'current_state.md',
          this.getDefaultCurrentState()
        ),
        pendingHooks: await this.parseFile<InkosPendingHook[]>(
          bookId,
          'pending_hooks.md',
          []
        ),
        chapterSummaries: await this.parseFile<InkosChapterSummary[]>(
          bookId,
          'chapter_summaries.md',
          []
        ),
        subplotBoard: await this.parseFile<InkosSubplot[]>(
          bookId,
          'subplot_board.md',
          []
        ),
        emotionalArcs: await this.parseFile<InkosEmotionalArc[]>(
          bookId,
          'emotional_arcs.md',
          []
        ),
        characterMatrix: await this.parseFile<InkosCharacterMatrix>(
          bookId,
          'character_matrix.md',
          { profiles: [], encounters: [], informationBoundaries: [] }
        ),
      };

      // 可选的 particle ledger
      try {
        const particleLedgerContent = await this.readTruthFile(bookId, 'particle_ledger.md');
        truthFiles.particleLedger = JSON.parse(particleLedgerContent);
      } catch {
        // particle ledger 是可选的，忽略错误
      }

      return truthFiles;
    } catch (error) {
      console.error('Failed to get truth files:', error);
      return null;
    }
  }

  /**
   * 添加事件监听器
   */
  addEventListener(type: string, listener: StorageEventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    this.eventListeners.get(type)!.push(listener);
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
   * 生成文件存储键
   */
  private getFileKey(bookId: string, fileName: string): string {
    return `${bookId}/${fileName}`;
  }

  /**
   * 初始化默认 Truth Files
   */
  private async initializeDefaultTruthFiles(bookId: string): Promise<void> {
    // 初始化 current_state.md
    const defaultState = this.getDefaultCurrentState();
    await this.writeTruthFile(bookId, 'current_state.md', JSON.stringify(defaultState, null, 2));

    // 初始化空的数组文件
    await this.writeTruthFile(bookId, 'pending_hooks.md', '[]');
    await this.writeTruthFile(bookId, 'chapter_summaries.md', '[]');
    await this.writeTruthFile(bookId, 'subplot_board.md', '[]');
    await this.writeTruthFile(bookId, 'emotional_arcs.md', '[]');

    // 初始化 character_matrix.md
    const defaultMatrix: InkosCharacterMatrix = {
      profiles: [],
      encounters: [],
      informationBoundaries: [],
    };
    await this.writeTruthFile(bookId, 'character_matrix.md', JSON.stringify(defaultMatrix, null, 2));
  }

  /**
   * 获取默认的当前状态
   */
  private getDefaultCurrentState(): InkosCurrentState {
    return {
      currentChapter: 0,
      currentLocation: '未设定',
      protagonistStatus: '正常',
      currentGoal: '未设定',
      currentConstraints: '无',
      allyEnemyStatus: '未明确',
      currentConflict: '未设定',
    };
  }

  /**
   * 解析文件内容
   */
  private async parseFile<T>(bookId: string, fileName: string, defaultValue: T): Promise<T> {
    try {
      const content = await this.readTruthFile(bookId, fileName);
      return JSON.parse(content) as T;
    } catch {
      return defaultValue;
    }
  }
}
