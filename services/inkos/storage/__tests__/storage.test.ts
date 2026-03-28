/**
 * Storage Adapter 使用示例和测试
 *
 * 演示如何使用不同的存储适配器
 */

import {
  createStorageAdapter,
  createAutoStorageAdapter,
  IndexedDBStorageAdapter,
  HybridStorageAdapter,
  DEFAULT_STORAGE_CONFIG,
  WEB_STORAGE_CONFIG,
} from '../index';
import type { InkosBookConfig } from '../../types/mapping';

/**
 * 示例：创建 IndexedDB 存储适配器
 */
async function exampleIndexedDBAdapter() {
  const adapter = new IndexedDBStorageAdapter(WEB_STORAGE_CONFIG);

  // 创建书籍配置
  const bookConfig: InkosBookConfig = {
    id: 'demo_book_001',
    title: '示例小说',
    genre: '玄幻',
    platform: 'muse',
    targetChapters: 100,
    chapterWordCount: 3000,
    language: 'zh',
    status: 'draft',
  };

  // 创建书籍
  await adapter.createBook(bookConfig);

  // 读取状态
  const currentStateContent = await adapter.readTruthFile(
    bookConfig.id,
    'current_state.md'
  );
  console.log('Current State:', currentStateContent);

  // 更新状态
  await adapter.writeTruthFile(
    bookConfig.id,
    'current_state.md',
    JSON.stringify({
      currentChapter: 1,
      currentLocation: '青云宗',
      protagonistStatus: '修炼中',
      currentGoal: '突破筑基期',
      currentConstraints: '资源不足',
      allyEnemyStatus: '师门庇护',
      currentConflict: '宗门大比',
    }, null, 2)
  );

  // 列出所有书籍
  const books = await adapter.listBooks();
  console.log('Books:', books);
}

/**
 * 示例：使用自动检测环境的适配器
 */
async function exampleAutoAdapter() {
  const adapter = createAutoStorageAdapter({
    enableEvents: true,
    logLevel: 'debug',
  });

  // 添加事件监听器
  adapter.addEventListener('file:write', (event) => {
    console.log('File written:', event.data);
  });

  adapter.addEventListener('sync:complete', (event) => {
    console.log('Sync completed:', event.data);
  });

  // 使用适配器
  const bookConfig: InkosBookConfig = {
    id: 'auto_book_001',
    title: '自动适配测试',
    genre: '仙侠',
    platform: 'muse',
    targetChapters: 50,
    chapterWordCount: 2500,
    language: 'zh',
    status: 'active',
  };

  await adapter.createBook(bookConfig);
  console.log('Book created with auto adapter');
}

/**
 * 示例：使用混合适配器进行同步
 */
async function exampleHybridSync() {
  const adapter = new HybridStorageAdapter({
    type: 'hybrid',
    dbName: 'muse_inkos_store',
    basePath: './inkos_books',
    enableEvents: true,
  });

  // 从 Muse 项目同步
  const museProjectId = 'project_123';
  const bookId = await adapter.syncFromMuse(museProjectId);
  console.log(`Created inkos book: ${bookId} from Muse project: ${museProjectId}`);

  // 同步回 Muse
  const result = await adapter.syncToMuse(bookId);
  console.log('Sync result:', result);
}

/**
 * 示例：使用工厂函数创建适配器
 */
async function exampleFactoryFunction() {
  // 创建 IndexedDB 适配器
  const indexedDBAdapter = createStorageAdapter({
    type: 'indexeddb',
    dbName: 'my_custom_db',
  });

  // 创建混合适配器
  const hybridAdapter = createStorageAdapter({
    type: 'hybrid',
    dbName: 'my_custom_db',
    basePath: './my_books',
  });

  console.log('Adapters created successfully');
}

// 导出示例函数
export {
  exampleIndexedDBAdapter,
  exampleAutoAdapter,
  exampleHybridSync,
  exampleFactoryFunction,
};
