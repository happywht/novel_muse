# Storage Adapter 抽象层

## 概述

Storage Adapter 是 inkos 与 Muse 之间的存储抽象层，提供统一的存储接口，支持多种存储后端。

## 架构设计

```
┌─────────────────────────────────────────────────┐
│                  StorageAdapter                  │
│              (统一存储接口)                      │
└─────────────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ IndexedDB    │ │ File System  │ │ Hybrid       │
│ Adapter      │ │ Adapter      │ │ Adapter      │
│ (Web)        │ │ (CLI)        │ │ (双向同步)   │
└──────────────┘ └──────────────┘ └──────────────┘
        │              │              │
        ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ IndexedDB    │ │ Markdown     │ │ IndexedDB +  │
│ (localforage)│ │ Truth Files  │ │ Files        │
└──────────────┘ └──────────────┘ └──────────────┘
```

## 快速开始

### 1. 自动检测环境并创建适配器

```typescript
import { createAutoStorageAdapter } from './services/inkos/storage';

// 自动检测环境（Node.js 使用 hybrid，浏览器使用 indexeddb）
const adapter = createAutoStorageAdapter({
  enableEvents: true,
  logLevel: 'info',
});
```

### 2. 创建特定类型的适配器

```typescript
import {
  IndexedDBStorageAdapter,
  FileStorageAdapter,
  HybridStorageAdapter
} from './services/inkos/storage';

// IndexedDB 适配器（Web 环境）
const webAdapter = new IndexedDBStorageAdapter({
  type: 'indexeddb',
  dbName: 'muse_inkos_store',
  enableEvents: true,
});

// 文件系统适配器（CLI 环境）
const cliAdapter = new FileStorageAdapter({
  type: 'file',
  basePath: './inkos_books',
  enableEvents: true,
});

// 混合适配器（支持双向同步）
const hybridAdapter = new HybridStorageAdapter({
  type: 'hybrid',
  dbName: 'muse_inkos_store',
  basePath: './inkos_books',
  enableEvents: true,
});
```

## 核心功能

### 书籍管理

```typescript
// 创建书籍
await adapter.createBook({
  id: 'my_book_001',
  title: '我的小说',
  genre: '玄幻',
  platform: 'muse',
  targetChapters: 100,
  chapterWordCount: 3000,
  language: 'zh',
  status: 'active',
});

// 获取书籍配置
const config = await adapter.getBookConfig('my_book_001');

// 列出所有书籍
const books = await adapter.listBooks();

// 删除书籍
await adapter.deleteBook('my_book_001');
```

### Truth Files 操作

```typescript
// 读取 Truth File
const currentState = await adapter.readTruthFile(
  'my_book_001',
  'current_state.md'
);

// 写入 Truth File
await adapter.writeTruthFile(
  'my_book_001',
  'current_state.md',
  JSON.stringify(newState, null, 2)
);

// 获取完整 Truth Files
const truthFiles = await adapter.getTruthFiles('my_book_001');
console.log(truthFiles.currentState);
console.log(truthFiles.pendingHooks);
console.log(truthFiles.characterMatrix);
// ...
```

### 同步功能

```typescript
// 从 Muse 项目同步到 inkos
const bookId = await adapter.syncFromMuse('muse_project_id');

// 从 inkos 同步到 Muse
const result = await adapter.syncToMuse('my_book_001');

// 双向同步（仅 HybridAdapter）
if (adapter instanceof HybridStorageAdapter) {
  const syncResults = await adapter.bidirectionalSync('my_book_001');
  console.log('To Muse:', syncResults.toMuse);
  console.log('From Muse:', syncResults.fromMuse);
}
```

### 事件监听

```typescript
// 监听文件写入事件
adapter.addEventListener('file:write', (event) => {
  console.log('File written:', event.data);
});

// 监听同步事件
adapter.addEventListener('sync:complete', (event) => {
  console.log('Sync completed:', event.data);
});

// 监听错误事件
adapter.addEventListener('sync:error', (event) => {
  console.error('Sync failed:', event.error);
});
```

## API 参考

### StorageAdapter 接口

```typescript
interface StorageAdapter {
  // Truth Files 操作
  readTruthFile(bookId: string, fileName: string): Promise<string>;
  writeTruthFile(bookId: string, fileName: string, content: string): Promise<void>;
  deleteTruthFile(bookId: string, fileName: string): Promise<void>;
  listTruthFiles(bookId: string): Promise<string[]>;
  getTruthFiles(bookId: string): Promise<InkosTruthFiles | null>;

  // 书籍管理
  listBooks(): Promise<string[]>;
  createBook(config: InkosBookConfig): Promise<void>;
  getBookConfig(bookId: string): Promise<InkosBookConfig | null>;
  updateBookConfig(bookId: string, config: Partial<InkosBookConfig>): Promise<void>;
  deleteBook(bookId: string): Promise<void>;
  bookExists(bookId: string): Promise<boolean>;

  // 同步功能
  syncToMuse(bookId: string, options?: SyncOptions): Promise<SyncResult>;
  syncFromMuse(projectId: string, options?: SyncOptions): Promise<string>;
}
```

### 同步选项

```typescript
interface SyncOptions {
  conflictResolution: 'source_wins' | 'target_wins' | 'merge' | 'manual';
  mode: 'full' | 'incremental' | 'delta';
  includeChapters?: boolean;
  includeSnapshots?: boolean;
  onProgress?: (progress: SyncProgress) => void;
}
```

### 同步结果

```typescript
interface SyncResult {
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
```

## 存储结构

### IndexedDB 存储

```
muse_inkos_store
├── book_configs              # 书籍配置
├── {bookId}/current_state.md
├── {bookId}/pending_hooks.md
├── {bookId}/chapter_summaries.md
├── {bookId}/subplot_board.md
├── {bookId}/emotional_arcs.md
├── {bookId}/character_matrix.md
└── {bookId}/particle_ledger.md (可选)
```

### 文件系统存储

```
inkos_books/
└── books/
    └── {bookId}/
        ├── book.json           # 书籍配置
        ├── story/
        │   ├── current_state.md
        │   ├── pending_hooks.md
        │   ├── chapter_summaries.md
        │   ├── subplot_board.md
        │   ├── emotional_arcs.md
        │   ├── character_matrix.md
        │   └── particle_ledger.md (可选)
        ├── chapters/           # 章节文件
        ├── snapshots/          # 快照
        └── summaries_archive/  # 归档摘要
```

## 最佳实践

### 1. 使用自动适配器

推荐使用 `createAutoStorageAdapter()` 自动检测环境：

```typescript
const adapter = createAutoStorageAdapter();
```

### 2. 启用事件监听

启用事件可以更好地监控存储操作：

```typescript
const adapter = createAutoStorageAdapter({
  enableEvents: true,
  logLevel: 'info',
});
```

### 3. 错误处理

始终使用 try-catch 处理存储操作：

```typescript
try {
  await adapter.writeTruthFile(bookId, fileName, content);
} catch (error) {
  console.error('Failed to write file:', error);
}
```

### 4. 同步前检查

同步前检查书籍是否存在：

```typescript
if (await adapter.bookExists(bookId)) {
  const result = await adapter.syncToMuse(bookId);
}
```

## 注意事项

1. **FileStorageAdapter 仅在 Node.js 环境中可用**
2. **IndexedDBStorageAdapter 仅在浏览器环境中可用**
3. **HybridStorageAdapter 在两种环境中都可用**，但在浏览器中不会使用文件系统
4. **同步功能需要配合转换器使用**，实际的 Muse <-> inkos 数据转换在 `converters.ts` 中实现

## 未来扩展

- [ ] 添加云存储适配器（S3, Google Cloud Storage 等）
- [ ] 实现 Git 同步适配器
- [ ] 添加增量同步支持
- [ ] 实现冲突自动合并
- [ ] 添加数据版本控制
