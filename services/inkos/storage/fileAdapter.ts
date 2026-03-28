/**
 * 文件系统存储适配器
 *
 * 用于 CLI 模式的存储实现，基于 Node.js fs 模块
 * 支持 Markdown Truth Files 的读写
 */

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

/**
 * 文件系统存储适配器实现
 * 注意：此类仅在 Node.js 环境中可用
 */
export class FileStorageAdapter implements StorageAdapter {
  private config: StorageAdapterConfig;
  private basePath: string;
  private eventListeners: Map<string, StorageEventListener[]> = new Map();
  private fs: typeof import('fs/promises') | null = null;
  private path: typeof import('path') | null = null;

  constructor(config: StorageAdapterConfig) {
    this.config = config;
    this.basePath = config.basePath || './inkos_books';

    // 动态导入 Node.js 模块（仅在 Node.js 环境中）
    if (this.isNodeEnvironment()) {
      this.initializeNodeModules();
    }
  }

  /**
   * 检查是否在 Node.js 环境
   */
  private isNodeEnvironment(): boolean {
    return typeof process !== 'undefined' && process.versions?.node != null;
  }

  /**
   * 初始化 Node.js 模块
   */
  private async initializeNodeModules(): Promise<void> {
    try {
      this.fs = await import('fs/promises');
      this.path = await import('path');
    } catch (error) {
      console.warn('Node.js fs module not available, file operations will fail');
    }
  }

  /**
   * 确保模块已加载
   */
  private ensureNodeModules(): void {
    if (!this.fs || !this.path) {
      throw new Error('FileStorageAdapter requires Node.js environment with fs module');
    }
  }

  /**
   * 读取 Truth File
   */
  async readTruthFile(bookId: string, fileName: string): Promise<string> {
    this.ensureNodeModules();

    try {
      const filePath = this.getFilePath(bookId, 'story', fileName);
      const content = await this.fs!.readFile(filePath, 'utf-8');

      this.emitEvent({
        type: 'file:read',
        timestamp: Date.now(),
        data: { bookId, fileName },
      });

      return content;
    } catch (error) {
      const eventError = error instanceof Error ? error : new Error(String(error));
      this.emitEvent({
        type: 'file:read',
        timestamp: Date.now(),
        data: { bookId, fileName },
        error: eventError,
      });
      throw eventError;
    }
  }

  /**
   * 写入 Truth File
   */
  async writeTruthFile(bookId: string, fileName: string, content: string): Promise<void> {
    this.ensureNodeModules();

    try {
      const filePath = this.getFilePath(bookId, 'story', fileName);
      await this.ensureDirectory(this.path!.dirname(filePath));
      await this.fs!.writeFile(filePath, content, 'utf-8');

      this.emitEvent({
        type: 'file:write',
        timestamp: Date.now(),
        data: { bookId, fileName },
      });
    } catch (error) {
      const eventError = error instanceof Error ? error : new Error(String(error));
      this.emitEvent({
        type: 'file:write',
        timestamp: Date.now(),
        data: { bookId, fileName },
        error: eventError,
      });
      throw eventError;
    }
  }

  /**
   * 删除 Truth File
   */
  async deleteTruthFile(bookId: string, fileName: string): Promise<void> {
    this.ensureNodeModules();

    try {
      const filePath = this.getFilePath(bookId, 'story', fileName);
      await this.fs!.unlink(filePath);

      this.emitEvent({
        type: 'file:delete',
        timestamp: Date.now(),
        data: { bookId, fileName },
      });
    } catch (error) {
      const eventError = error instanceof Error ? error : new Error(String(error));
      this.emitEvent({
        type: 'file:delete',
        timestamp: Date.now(),
        data: { bookId, fileName },
        error: eventError,
      });
      throw eventError;
    }
  }

  /**
   * 列出书籍的所有 Truth Files
   */
  async listTruthFiles(bookId: string): Promise<string[]> {
    this.ensureNodeModules();

    try {
      const storyPath = this.getBookPath(bookId, 'story');
      const files = await this.fs!.readdir(storyPath);
      return files.filter(file => file.endsWith('.md'));
    } catch (error) {
      // 目录不存在或读取失败
      return [];
    }
  }

  /**
   * 列出所有书籍
   */
  async listBooks(): Promise<string[]> {
    this.ensureNodeModules();

    try {
      const booksPath = this.path!.join(this.basePath, 'books');
      const entries = await this.fs!.readdir(booksPath, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch (error) {
      // 目录不存在
      return [];
    }
  }

  /**
   * 创建书籍
   */
  async createBook(config: InkosBookConfig): Promise<void> {
    this.ensureNodeModules();

    try {
      // 创建书籍目录结构
      await this.createBookDirectories(config.id);

      // 创建 book.json 配置文件
      const configPath = this.getFilePath(config.id, '', 'book.json');
      await this.fs!.writeFile(
        configPath,
        JSON.stringify(config, null, 2),
        'utf-8'
      );

      // 初始化默认 Truth Files
      await this.initializeDefaultTruthFiles(config.id);

      this.emitEvent({
        type: 'book:create',
        timestamp: Date.now(),
        data: { bookId: config.id, config },
      });
    } catch (error) {
      const eventError = error instanceof Error ? error : new Error(String(error));
      this.emitEvent({
        type: 'book:create',
        timestamp: Date.now(),
        data: { bookId: config.id, config },
        error: eventError,
      });
      throw eventError;
    }
  }

  /**
   * 获取书籍配置
   */
  async getBookConfig(bookId: string): Promise<InkosBookConfig | null> {
    this.ensureNodeModules();

    try {
      const configPath = this.getFilePath(bookId, '', 'book.json');
      const content = await this.fs!.readFile(configPath, 'utf-8');
      return JSON.parse(content) as InkosBookConfig;
    } catch (error) {
      return null;
    }
  }

  /**
   * 更新书籍配置
   */
  async updateBookConfig(bookId: string, config: Partial<InkosBookConfig>): Promise<void> {
    this.ensureNodeModules();

    const existingConfig = await this.getBookConfig(bookId);
    if (!existingConfig) {
      throw new Error(`Book not found: ${bookId}`);
    }

    const updatedConfig = {
      ...existingConfig,
      ...config,
    };

    const configPath = this.getFilePath(bookId, '', 'book.json');
    await this.fs!.writeFile(
      configPath,
      JSON.stringify(updatedConfig, null, 2),
      'utf-8'
    );
  }

  /**
   * 删除书籍
   */
  async deleteBook(bookId: string): Promise<void> {
    this.ensureNodeModules();

    try {
      const bookPath = this.getBookPath(bookId, '');
      await this.fs!.rm(bookPath, { recursive: true, force: true });

      this.emitEvent({
        type: 'book:delete',
        timestamp: Date.now(),
        data: { bookId },
      });
    } catch (error) {
      const eventError = error instanceof Error ? error : new Error(String(error));
      this.emitEvent({
        type: 'book:delete',
        timestamp: Date.now(),
        data: { bookId },
        error: eventError,
      });
      throw eventError;
    }
  }

  /**
   * 同步到 Muse IndexedDB（CLI 模式不支持）
   */
  async syncToMuse(_bookId: string, _options?: SyncOptions): Promise<SyncResult> {
    throw new Error('syncToMuse is not supported in file system mode. Use HybridStorageAdapter instead.');
  }

  /**
   * 从 Muse IndexedDB 同步（CLI 模式不支持）
   */
  async syncFromMuse(_projectId: string, _options?: SyncOptions): Promise<string> {
    throw new Error('syncFromMuse is not supported in file system mode. Use HybridStorageAdapter instead.');
  }

  /**
   * 检查书籍是否存在
   */
  async bookExists(bookId: string): Promise<boolean> {
    this.ensureNodeModules();

    try {
      const bookPath = this.getBookPath(bookId, '');
      await this.fs!.access(bookPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取完整的 Truth Files
   */
  async getTruthFiles(bookId: string): Promise<InkosTruthFiles | null> {
    this.ensureNodeModules();

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
   * 获取书籍路径
   */
  private getBookPath(bookId: string, subdir: string): string {
    if (subdir) {
      return this.path!.join(this.basePath, 'books', bookId, subdir);
    }
    return this.path!.join(this.basePath, 'books', bookId);
  }

  /**
   * 获取文件路径
   */
  private getFilePath(bookId: string, subdir: string, fileName: string): string {
    if (subdir) {
      return this.path!.join(this.basePath, 'books', bookId, subdir, fileName);
    }
    return this.path!.join(this.basePath, 'books', bookId, fileName);
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await this.fs!.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // 忽略已存在的目录错误
    }
  }

  /**
   * 创建书籍目录结构
   */
  private async createBookDirectories(bookId: string): Promise<void> {
    const dirs = ['story', 'chapters', 'snapshots', 'summaries_archive'];

    for (const dir of dirs) {
      const dirPath = this.getBookPath(bookId, dir);
      await this.ensureDirectory(dirPath);
    }
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
