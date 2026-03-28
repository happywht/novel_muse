/**
 * Storage Adapter 模块导出
 *
 * 提供统一的存储抽象层，支持：
 * - IndexedDB 存储（Web 模式）
 * - 文件系统存储（CLI 模式）
 * - 混合存储（双向同步）
 */

// 导出接口和类型
export type {
  StorageAdapter,
  StorageAdapterType,
  StorageAdapterConfig,
  SyncOptions,
  SyncProgress,
  SyncResult,
  StorageEventListener,
  StorageEvent,
  StorageEventType,
} from './interface';

// 导出实现类
export { IndexedDBStorageAdapter } from './indexeddbAdapter';
export { FileStorageAdapter } from './fileAdapter';
export { HybridStorageAdapter } from './hybridAdapter';

// 导出工具函数
import type { StorageAdapterConfig } from './interface';
import { IndexedDBStorageAdapter } from './indexeddbAdapter';
import { FileStorageAdapter } from './fileAdapter';
import { HybridStorageAdapter } from './hybridAdapter';

/**
 * 创建存储适配器工厂函数
 */
export function createStorageAdapter(config: StorageAdapterConfig) {
  switch (config.type) {
    case 'indexeddb':
      return new IndexedDBStorageAdapter(config);

    case 'file':
      return new FileStorageAdapter(config);

    case 'hybrid':
      return new HybridStorageAdapter(config);

    default:
      throw new Error(`Unknown storage adapter type: ${config.type}`);
  }
}

/**
 * 检测环境并创建合适的存储适配器
 */
export function createAutoStorageAdapter(
  baseConfig?: Partial<StorageAdapterConfig>
) {
  const isNode =
    typeof process !== 'undefined' && process.versions?.node != null;

  const config: StorageAdapterConfig = {
    type: isNode ? 'hybrid' : 'indexeddb',
    enableEvents: true,
    logLevel: 'info',
    ...baseConfig,
  };

  return createStorageAdapter(config);
}

/**
 * 默认配置
 */
export const DEFAULT_STORAGE_CONFIG: StorageAdapterConfig = {
  type: 'indexeddb',
  dbName: 'muse_inkos_store',
  enableEvents: true,
  logLevel: 'info',
};

/**
 * CLI 模式默认配置
 */
export const CLI_STORAGE_CONFIG: StorageAdapterConfig = {
  type: 'file',
  basePath: './inkos_books',
  enableEvents: true,
  logLevel: 'info',
};

/**
 * Web 模式默认配置
 */
export const WEB_STORAGE_CONFIG: StorageAdapterConfig = {
  type: 'indexeddb',
  dbName: 'muse_inkos_store',
  enableEvents: true,
  logLevel: 'info',
};
