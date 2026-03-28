/**
 * StorageAdapter 接口定义
 *
 * 设计目标：
 * 1. 统一 inkos CLI（文件系统）与 Muse（IndexedDB）的存储访问
 * 2. 支持双向同步：Muse <-> inkos
 * 3. 提供存储抽象，便于测试和扩展
 */

import type { InkosBookConfig, InkosTruthFiles } from '../types/mapping';

/**
 * 存储适配器接口
 */
export interface StorageAdapter {
  /**
   * 读取 Truth File 内容
   * @param bookId 书籍ID
   * @param fileName 文件名（如 'current_state.md'）
   * @returns 文件内容字符串
   */
  readTruthFile(bookId: string, fileName: string): Promise<string>;

  /**
   * 写入 Truth File
   * @param bookId 书籍ID
   * @param fileName 文件名
   * @param content 文件内容
   */
  writeTruthFile(bookId: string, fileName: string, content: string): Promise<void>;

  /**
   * 删除 Truth File
   * @param bookId 书籍ID
   * @param fileName 文件名
   */
  deleteTruthFile(bookId: string, fileName: string): Promise<void>;

  /**
   * 列出书籍的所有 Truth Files
   * @param bookId 书籍ID
   * @returns 文件名数组
   */
  listTruthFiles(bookId: string): Promise<string[]>;

  /**
   * 列出所有书籍
   * @returns 书籍ID数组
   */
  listBooks(): Promise<string[]>;

  /**
   * 创建书籍
   * @param config 书籍配置
   */
  createBook(config: InkosBookConfig): Promise<void>;

  /**
   * 获取书籍配置
   * @param bookId 书籍ID
   * @returns 书籍配置或 null
   */
  getBookConfig(bookId: string): Promise<InkosBookConfig | null>;

  /**
   * 更新书籍配置
   * @param bookId 书籍ID
   * @param config 部分配置更新
   */
  updateBookConfig(bookId: string, config: Partial<InkosBookConfig>): Promise<void>;

  /**
   * 删除书籍及其所有数据
   * @param bookId 书籍ID
   */
  deleteBook(bookId: string): Promise<void>;

  /**
   * 同步到 Muse IndexedDB
   * @param bookId 书籍ID
   * @param options 同步选项（可选）
   */
  syncToMuse(bookId: string, options?: SyncOptions): Promise<void | SyncResult>;

  /**
   * 从 Muse IndexedDB 同步
   * @param projectId Muse 项目ID
   * @param options 同步选项（可选）
   * @returns inkos bookId
   */
  syncFromMuse(projectId: string, options?: SyncOptions): Promise<string>;

  /**
   * 检查书籍是否存在
   * @param bookId 书籍ID
   */
  bookExists(bookId: string): Promise<boolean>;

  /**
   * 获取完整的 Truth Files
   * @param bookId 书籍ID
   * @returns 完整的 Truth Files 对象
   */
  getTruthFiles(bookId: string): Promise<InkosTruthFiles | null>;
}

/**
 * 存储适配器类型
 */
export type StorageAdapterType = 'file' | 'indexeddb' | 'hybrid';

/**
 * 同步选项
 */
export interface SyncOptions {
  /**
   * 冲突解决策略
   */
  conflictResolution: 'source_wins' | 'target_wins' | 'merge' | 'manual';

  /**
   * 同步模式
   */
  mode: 'full' | 'incremental' | 'delta';

  /**
   * 是否包含章节文件
   */
  includeChapters?: boolean;

  /**
   * 是否包含快照
   */
  includeSnapshots?: boolean;

  /**
   * 进度回调
   */
  onProgress?: (progress: SyncProgress) => void;
}

/**
 * 同步进度
 */
export interface SyncProgress {
  phase: 'reading' | 'converting' | 'writing' | 'completed' | 'error';
  current: number;
  total: number;
  message: string;
  error?: Error;
}

/**
 * 同步结果
 */
export interface SyncResult {
  success: boolean;
  bookId: string;
  projectId?: string;
  direction: 'to_muse' | 'from_muse';
  timestamp: number;
  stats: {
    filesProcessed: number;
    filesCreated: number;
    filesUpdated: number;
    filesSkipped: number;
    errors: number;
  };
  errors?: Array<{
    file: string;
    error: string;
  }>;
}

/**
 * 存储事件类型
 */
export type StorageEventType =
  | 'file:read'
  | 'file:write'
  | 'file:delete'
  | 'book:create'
  | 'book:delete'
  | 'sync:start'
  | 'sync:progress'
  | 'sync:complete'
  | 'sync:error';

/**
 * 存储事件监听器
 */
export type StorageEventListener = (event: StorageEvent) => void;

/**
 * 存储事件
 */
export interface StorageEvent {
  type: StorageEventType;
  timestamp: number;
  data?: unknown;
  error?: Error;
}

/**
 * 存储适配器配置
 */
export interface StorageAdapterConfig {
  /**
   * 适配器类型
   */
  type: StorageAdapterType;

  /**
   * 基础路径（文件系统模式）
   */
  basePath?: string;

  /**
   * 数据库名称（IndexedDB 模式）
   */
  dbName?: string;

  /**
   * 是否启用事件
   */
  enableEvents?: boolean;

  /**
   * 日志级别
   */
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'silent';
}
