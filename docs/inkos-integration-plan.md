# InkOS CLI 与 Muse 主项目技术集成方案

## 文档信息

- **版本**: 1.0
- **日期**: 2026-03-28
- **作者**: Backend Technical Lead
- **状态**: 技术评估

---

## 1. 项目现状分析

### 1.1 主项目 (Muse) 技术栈

| 层级       | 技术                       | 版本           |
| ---------- | -------------------------- | -------------- |
| 前端框架   | React + Vite               | 19.2.4 / 6.2.0 |
| 后端框架   | Express                    | 4.21.0         |
| 数据库     | Prisma + SQLite/PostgreSQL | 6.5.0          |
| 图数据库   | Neo4j                      | 6.0.1          |
| 包管理器   | npm                        | -              |
| TypeScript | 5.8.2                      | -              |
| AI SDK     | @google/genai              | 1.41.0         |

**主要功能**:

- 可视化小说架构设计
- 角色关系图谱 (Neo4j)
- 项目管理 CRUD
- IndexedDB 本地存储

### 1.2 InkOS CLI 技术栈

| 层级       | 技术               | 版本    |
| ---------- | ------------------ | ------- |
| CLI 框架   | Commander.js       | 13.0.0  |
| 核心引擎   | @actalk/inkos-core | 0.5.1   |
| LLM 集成   | OpenAI / Anthropic | -       |
| 包管理器   | pnpm (monorepo)    | >=9.0.0 |
| TypeScript | 5.8.0              | -       |

**主要功能**:

- 多 Agent 协作写书 (Writer, Architect, Auditor, Reviser)
- 章节生成与审核
- 风格分析与 AI 检测
- 热榜分析 (Radar)
- EPUB 导出

### 1.3 依赖冲突分析

| 依赖包              | 主项目版本       | InkOS Core 版本 | 兼容性                    |
| ------------------- | ---------------- | --------------- | ------------------------- |
| `dotenv`            | 17.3.1           | 16.4.0          | 兼容 (API 稳定)           |
| `zod`               | 4.3.6            | 3.24.0          | 需升级 InkOS 或降级主项目 |
| `typescript`        | 5.8.2            | 5.8.0           | 兼容                      |
| `@anthropic-ai/sdk` | 0.78.0 (devDeps) | 0.78.0          | 兼容                      |

**关键发现**:

- `zod` 版本差异较大 (v4 vs v3)，需要统一
- 两个项目都使用 ESM 模块，无 CommonJS 冲突
- 包管理器差异 (npm vs pnpm) 可通过配置解决

---

## 2. 集成模式评估

### 模式 A: CLI 作为独立命令调用

```
+------------------+        spawn         +------------------+
|   Muse Server    | --------------------> |   InkOS CLI      |
|   (Express)      | <-------------------- |   (子进程)        |
+------------------+        stdout        +------------------+
        |                                           |
        v                                           v
+------------------+                        +------------------+
|   Prisma DB      |                        |   FileSystem     |
+------------------+                        +------------------+
```

**实现方式**:

```typescript
// server/src/services/inkosService.ts
import { spawn } from 'child_process';

export async function callInkosWrite(bookId: string, chapter: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const process = spawn(
      'npx',
      ['inkos', 'write', '--book', bookId, '--chapter', String(chapter)],
      {
        cwd: projectRoot,
        env: { ...process.env, ANTHROPIC_API_KEY: apiKey },
      }
    );

    let output = '';
    process.stdout.on('data', (data) => (output += data));
    process.stderr.on('data', (data) => console.error(data.toString()));

    process.on('close', (code) => {
      code === 0 ? resolve(output) : reject(new Error(`InkOS exited with ${code}`));
    });
  });
}
```

**优点**:

- 零代码侵入，无需修改 InkOS 源码
- 进程隔离，崩溃不影响主服务
- 可独立升级 CLI 版本
- 适合快速验证和原型开发

**缺点**:

- 进程启动开销 (~500ms)
- 数据通过文件系统传递，效率低
- 实时进度流式输出复杂
- 错误处理受限 (仅 exit code)
- 需要在生产环境安装 CLI

**适用场景**: 快速原型验证、后台批处理任务

---

### 模式 B: CLI 功能内嵌为 Web API

```
+----------------------------------------------------------+
|                      Muse Server                          |
|  +------------------+        +------------------------+  |
|  |   Express Routes | -----> |   InkOS Bridge Layer   |  |
|  |   /api/inkos/*   |        |   (Adapter Pattern)    |  |
|  +------------------+        +------------------------+  |
|                                       |                   |
|                                       v                   |
|  +------------------+        +------------------------+  |
|  |   Prisma DB      | <----> |   InkOS Core Modules   |  |
|  +------------------+        +------------------------+  |
+----------------------------------------------------------+
```

**实现方式**:

```typescript
// server/src/routes/inkos.ts
import { Router } from 'express';
import { PipelineRunner, WriterAgent, createLLMClient } from '@actalk/inkos-core';
import { prisma } from '../index';

export const inkosRouter = Router();

// POST /api/inkos/write - 生成章节
inkosRouter.post('/write', async (req, res) => {
  const { bookId, chapterNumber } = req.body;

  // 从数据库加载项目配置
  const book = await prisma.book.findUnique({ where: { id: bookId } });

  // 创建 LLM 客户端
  const client = createLLMClient({
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // 创建 Pipeline Runner
  const runner = new PipelineRunner({
    client,
    model: 'claude-sonnet-4-20250514',
    projectRoot: getProjectPath(bookId),
    onStreamProgress: (progress) => {
      // 通过 SSE 推送进度
      req.app.locals.eventBus.emit(`write-progress:${bookId}`, progress);
    },
  });

  try {
    const result = await runner.writeChapter(chapterNumber);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/inkos/status - 获取生成状态
inkosRouter.get('/status/:bookId', async (req, res) => {
  const status = await getInkosStatus(req.params.bookId);
  res.json(status);
});
```

**优点**:

- 低延迟，内存调用
- 支持实时进度流 (SSE/WebSocket)
- 统一错误处理和日志
- 数据直接存取，无需文件中转
- 易于添加认证、限流等中间件

**缺点**:

- 需要适配 InkOS Core API
- 共享内存空间，崩溃可能影响主服务
- 长时间运行的任务需异步处理
- zod 版本冲突需要解决

**适用场景**: 实时交互、用户触发的创作任务

---

### 模式 C: 共享 Core 库，双端复用

```
                    +------------------------+
                    |   @actalk/inkos-core   |
                    |   (npm 包 / workspace)  |
                    +------------------------+
                              |
              +---------------+---------------+
              |                               |
              v                               v
+------------------+                 +------------------+
|   InkOS CLI      |                 |   Muse Server    |
|   (Commander)    |                 |   (Express)      |
+------------------+                 +------------------+
       |                                     |
       v                                     v
+------------------+                 +------------------+
|   FileSystem     |                 |   Prisma + Neo4j |
+------------------+                 +------------------+
```

**实现方式**:

```json
// 主项目 package.json
{
  "dependencies": {
    "@actalk/inkos-core": "file:./inkos/packages/core"
  }
}
```

```typescript
// inkos/packages/core/src/adapters/db-adapter.ts (新增)
export interface StorageAdapter {
  loadBookConfig(bookId: string): Promise<BookConfig>;
  saveChapter(bookId: string, chapter: number, content: string): Promise<void>;
  loadState(bookId: string): Promise<CurrentState>;
  saveState(bookId: string, state: CurrentState): Promise<void>;
}

// 默认文件系统适配器
export class FileSystemAdapter implements StorageAdapter { ... }

// server/src/adapters/inkos-db-adapter.ts
import { StorageAdapter } from '@actalk/inkos-core';
import { prisma } from '../index';

export class PrismaAdapter implements StorageAdapter {
  async loadBookConfig(bookId: string): Promise<BookConfig> {
    const book = await prisma.book.findUnique({ where: { id: bookId } });
    return convertToInkosConfig(book);
  }

  async saveChapter(bookId: string, chapter: number, content: string): Promise<void> {
    await prisma.chapter.upsert({
      where: { bookId_number: { bookId, number: chapter } },
      update: { content, wordCount: content.length },
      create: { bookId, number: chapter, content, wordCount: content.length }
    });
  }
}
```

**优点**:

- 最大化代码复用
- 单一数据源，避免不一致
- CLI 和 Web 功能一致
- 便于单元测试 (mock adapter)

**缺点**:

- 架构改动最大
- 需要设计 Adapter 接口
- CLI 和 Web 共享依赖，版本耦合
- 开发协调成本高

**适用场景**: 长期维护的产品级集成

---

## 3. 综合评估与推荐

### 3.1 评分矩阵

| 评估维度 | 模式 A (CLI) | 模式 B (API) | 模式 C (Core) |
| -------- | ------------ | ------------ | ------------- |
| 实施速度 | 9/10         | 7/10         | 4/10          |
| 运行性能 | 5/10         | 9/10         | 9/10          |
| 代码复用 | 3/10         | 7/10         | 10/10         |
| 维护成本 | 8/10         | 6/10         | 5/10          |
| 扩展性   | 6/10         | 8/10         | 10/10         |
| 实时性   | 3/10         | 9/10         | 9/10          |
| **总分** | **34**       | **46**       | **47**        |

### 3.2 推荐方案: 混合模式 (B + C 渐进式)

采用**渐进式集成策略**，分阶段实现:

1. **Phase 1 (快速验证)**: 模式 B - 直接调用 InkOS Core
2. **Phase 2 (深度集成)**: 模式 C - 引入 Storage Adapter
3. **Phase 3 (功能增强)**: 双端共享 UI 组件

---

## 4. 实施计划

### Phase 1: API 集成 (2-3 天)

**目标**: 在 Muse Server 中暴露 InkOS Core 功能

**任务清单**:

- [ ] 解决 zod 版本冲突

  ```bash
  # 方案 A: 升级 InkOS Core 到 zod v4
  cd inkos/packages/core && pnpm add zod@^4.3.6

  # 方案 B: 降级主项目到 zod v3
  npm install zod@^3.24.0
  ```

- [ ] 添加 InkOS Core 依赖

  ```json
  // server/package.json
  {
    "dependencies": {
      "@actalk/inkos-core": "file:../inkos/packages/core"
    }
  }
  ```

- [ ] 创建 API 路由

  ```
  server/src/routes/inkos.ts
  server/src/services/inkosService.ts
  server/src/types/inkos.ts
  ```

- [ ] 实现流式响应 (SSE)

  ```typescript
  // GET /api/inkos/stream/:taskId
  inkosRouter.get('/stream/:taskId', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');

    const eventHandler = (progress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    };

    eventBus.on(`progress:${req.params.taskId}`, eventHandler);
    req.on('close', () => eventBus.off(`progress:${req.params.taskId}`, eventHandler));
  });
  ```

- [ ] 前端调用示例
  ```typescript
  // 前端 EventSource 调用
  const eventSource = new EventSource(`/api/inkos/stream/${taskId}`);
  eventSource.onmessage = (event) => {
    const progress = JSON.parse(event.data);
    setProgress(progress);
  };
  ```

### Phase 2: 数据层集成 (3-5 天)

**目标**: 统一存储层，消除文件系统依赖

**任务清单**:

- [ ] 设计 StorageAdapter 接口

  ```typescript
  interface StorageAdapter {
    // Book 管理
    loadBookConfig(bookId: string): Promise<BookConfig>;
    saveBookConfig(config: BookConfig): Promise<void>;

    // Chapter 管理
    loadChapter(bookId: string, chapter: number): Promise<string>;
    saveChapter(bookId: string, chapter: number, content: string): Promise<void>;
    listChapters(bookId: string): Promise<ChapterMeta[]>;

    // State 管理
    loadState(bookId: string): Promise<CurrentState>;
    saveState(bookId: string, state: CurrentState): Promise<void>;

    // Truth Files
    loadTruthFiles(bookId: string): Promise<TruthFiles>;
    saveTruthFile(bookId: string, type: string, content: string): Promise<void>;
  }
  ```

- [ ] 实现 PrismaAdapter
- [ ] 修改 InkOS Core 支持依赖注入
- [ ] 迁移现有数据 (文件 -> DB)

### Phase 3: 功能增强 (5-7 天)

**目标**: 前后端完全打通，共享组件

**任务清单**:

- [ ] 前端创作工作台 UI
- [ ] WebSocket 双向通信
- [ ] 任务队列 (Bull/BullMQ)
- [ ] 进度持久化 (断点续传)
- [ ] 错误恢复机制

---

## 5. 系统架构图

### 5.1 集成后整体架构

```
+============================================================================+
|                              MUSE ARCHITECT                                 |
|                        小说创作一站式平台                                    |
+============================================================================+

+----------------------------------------------------------------------------+
|                            Frontend (React + Vite)                          |
|  +----------------+  +----------------+  +----------------+  +------------+ |
|  |  Project View  |  |  Graph View    |  |  Writer Studio |  |  Dashboard | |
|  |  项目管理       |  |  角色关系图     |  |  创作工作台     |  |  仪表盘     | |
|  +----------------+  +----------------+  +----------------+  +------------+ |
|           |                   |                   |                   |      |
|           +----------+--------+---------+---------+----------+--------+      |
|                      |                   |                   |               |
|                      v                   v                   v               |
|  +-----------------------------------------------------------------------+  |
|  |                     API Client (axios/fetch)                           |  |
|  +-----------------------------------------------------------------------+  |
+----------------------------------------------------------------------------+
                                       |
                                       | HTTP/SSE/WebSocket
                                       v
+----------------------------------------------------------------------------+
|                          Backend (Express Server)                           |
|  +-----------------------------------------------------------------------+  |
|  |                         Middleware Layer                               |  |
|  |  +-------------+  +-------------+  +-------------+  +---------------+  |  |
|  |  | Auth        |  | CORS        |  | Rate Limiter|  | Error Handler |  |  |
|  |  | API Key     |  |             |  |             |  |               |  |  |
|  |  +-------------+  +-------------+  +-------------+  +---------------+  |  |
|  +-----------------------------------------------------------------------+  |
|                                       |                                     |
|  +-----------------------------------------------------------------------+  |
|  |                          Route Layer                                   |  |
|  |  +-------------+  +-------------+  +-------------+  +---------------+  |  |
|  |  | /projects   |  | /graph      |  | /inkos      |  | /health       |  |  |
|  |  | 项目 CRUD    |  | 图谱查询     |  | AI 创作引擎  |  | 健康检查      |  |  |
|  |  +-------------+  +-------------+  +-------------+  +---------------+  |  |
|  +-----------------------------------------------------------------------+  |
|                                       |                                     |
|  +-----------------------------------------------------------------------+  |
|  |                       Service Layer                                    |  |
|  |  +-------------+  +-------------+  +-------------+  +---------------+  |  |
|  |  | Project     |  | Graph       |  | InkOS       |  | Task          |  |  |
|  |  | Service     |  | Service     |  | Service     |  | Queue         |  |  |
|  |  +-------------+  +-------------+  +-------------+  +---------------+  |  |
|  +-----------------------------------------------------------------------+  |
|                                       |                                     |
|  +-----------------------------------------------------------------------+  |
|  |                     InkOS Core Integration                             |  |
|  |  +-----------------------------------------------------------------+  |  |
|  |  |                    @actalk/inkos-core                             |  |  |
|  |  |  +-----------+  +-----------+  +-----------+  +---------------+  |  |  |
|  |  |  | Writer    |  | Architect |  | Auditor   |  | Reviser       |  |  |  |
|  |  |  | Agent     |  | Agent     |  | Agent     |  | Agent         |  |  |  |
|  |  |  +-----------+  +-----------+  +-----------+  +---------------+  |  |  |
|  |  |  +-----------+  +-----------+  +-----------+  +---------------+  |  |  |
|  |  |  | Radar     |  | Style     |  | Detector  |  | Pipeline      |  |  |  |
|  |  |  | Agent     |  | Analyzer  |  | (AI检测)   |  | Runner        |  |  |  |
|  |  |  +-----------+  +-----------+  +-----------+  +---------------+  |  |  |
|  |  |                              |                                    |  |  |
|  |  |                              v                                    |  |  |
|  |  |  +----------------------------------------------------------------+|  |  |
|  |  |  |                 Storage Adapter Interface                      ||  |  |
|  |  |  +----------------------------------------------------------------+|  |  |
|  |  +-----------------------------------------------------------------+  |  |
|  +-----------------------------------------------------------------------+  |
+----------------------------------------------------------------------------/
                                       |
                                       v
+----------------------------------------------------------------------------+
|                            Storage Layer                                    |
|  +---------------------------+       +-----------------------------------+  |
|  |   Prisma ORM              |       |   Neo4j Graph DB                  |  |
|  |  +---------------------+  |       |  +-----------------------------+  |  |
|  |  | Book                |  |       |  | Character Node              |  |  |
|  |  | Chapter             |  |       |  | Location Node               |  |  |
|  |  | Project             |  |       |  | Event Node                  |  |  |
|  |  | State (JSON)        |  |       |  | RELATIONSHIPS:              |  |  |
|  |  | TruthFiles          |  |       |  |   - KNOWS                   |  |  |
|  |  +---------------------+  |       |  |   - LOVES                   |  |  |
|  |  +---------------------+  |       |  |   - HATES                   |  |  |
|  |  | SQLite / PostgreSQL |  |       |  |   - APPEARS_IN              |  |  |
|  |  +---------------------+  |       |  +-----------------------------+  |  |
|  +---------------------------+       +-----------------------------------+  |
+----------------------------------------------------------------------------+
                                       |
                                       v
+----------------------------------------------------------------------------+
|                         External Services                                   |
|  +---------------------------+       +-----------------------------------+  |
|  |   LLM Providers           |       |   Notification                    |  |
|  |  +---------------------+  |       |  +-----------------------------+  |  |
|  |  | Anthropic Claude    |  |       |  | Webhook                     |  |  |
|  |  | OpenAI GPT          |  |       |  | Telegram                    |  |  |
|  |  | Google Gemini       |  |       |  | Feishu                      |  |  |
|  |  +---------------------+  |       |  +-----------------------------+  |  |
|  +---------------------------+       +-----------------------------------+  |
+----------------------------------------------------------------------------+
```

### 5.2 数据流详解

```
用户触发创作流程:
==================

[Frontend]                 [Backend]                  [InkOS Core]           [Storage]
    |                          |                          |                      |
    |  POST /api/inkos/write   |                          |                      |
    |------------------------->|                          |                      |
    |                          |  创建任务                |                      |
    |                          |  入队 TaskQueue          |                      |
    |  202 Accepted + taskId   |                          |                      |
    |<-------------------------|                          |                      |
    |                          |                          |                      |
    |  GET /api/inkos/stream/123 (SSE)                   |                      |
    |------------------------->|                          |                      |
    |                          |                          |                      |
    |                          |  PipelineRunner.write()  |                      |
    |                          |------------------------->|                      |
    |                          |                          |  loadBookConfig()    |
    |                          |                          |--------------------->|
    |                          |                          |<---------------------|
    |                          |                          |  loadState()         |
    |                          |                          |--------------------->|
    |                          |                          |<---------------------|
    |                          |                          |                      |
    |                          |                          |  [LLM API Call]      |
    |                          |                          |------------------------>
    |                          |                          |<------------------------
    |                          |                          |                      |
    |                          |  onStreamProgress()      |                      |
    |                          |<-------------------------|                      |
    |  SSE: progress event     |                          |                      |
    |<-------------------------|                          |                      |
    |                          |  onStreamProgress()      |                      |
    |                          |<-------------------------|                      |
    |  SSE: progress event     |                          |                      |
    |<-------------------------|                          |                      |
    |                          |                          |                      |
    |                          |                          |  saveChapter()       |
    |                          |                          |--------------------->|
    |                          |                          |  saveState()         |
    |                          |                          |--------------------->|
    |                          |                          |                      |
    |                          |  ChapterPipelineResult   |                      |
    |                          |<-------------------------|                      |
    |                          |                          |                      |
    |  SSE: complete event     |                          |                      |
    |<-------------------------|                          |                      |
    |                          |                          |                      |
```

### 5.3 InkOS API 端点设计

```
/api/inkos
├── /write                 POST    生成新章节
│   └── Body: { bookId, chapterNumber, options? }
│   └── Response: { taskId, status: "queued" }
│
├── /revise                POST    修订章节
│   └── Body: { bookId, chapterNumber, mode: "continuity"|"style" }
│
├── /audit                 POST    审核章节
│   └── Body: { bookId, chapterNumber }
│   └── Response: { issues: AuditIssue[] }
│
├── /detect                POST    AI 内容检测
│   └── Body: { content }
│   └── Response: { score, details }
│
├── /style                 POST    风格分析
│   └── Body: { bookId, sampleChapter? }
│   └── Response: StyleProfile
│
├── /radar                 GET     获取热榜数据
│   └── Query: { platform: "qidian"|"fanqie" }
│
├── /status/:bookId        GET     获取书籍状态
│   └── Response: BookStatusInfo
│
├── /stream/:taskId        GET     SSE 进度流
│   └── Response: text/event-stream
│
└── /cancel/:taskId        POST    取消任务
    └── Response: { cancelled: true }
```

---

## 6. 工作量估算

| 阶段             | 任务                    | 工作量            | 优先级 |
| ---------------- | ----------------------- | ----------------- | ------ |
| Phase 1          | zod 版本统一            | 2h                | P0     |
| Phase 1          | 添加 Core 依赖          | 1h                | P0     |
| Phase 1          | 创建 API 路由           | 4h                | P0     |
| Phase 1          | SSE 流式响应            | 3h                | P1     |
| Phase 1          | 前端调用集成            | 4h                | P1     |
| Phase 1          | 测试与调试              | 4h                | P1     |
| **Phase 1 小计** |                         | **18h (2-3天)**   |        |
| Phase 2          | StorageAdapter 接口设计 | 4h                | P1     |
| Phase 2          | PrismaAdapter 实现      | 8h                | P1     |
| Phase 2          | InkOS Core 适配改造     | 8h                | P2     |
| Phase 2          | 数据迁移脚本            | 4h                | P2     |
| Phase 2          | 测试覆盖                | 6h                | P2     |
| **Phase 2 小计** |                         | **30h (4-5天)**   |        |
| Phase 3          | 任务队列集成            | 8h                | P2     |
| Phase 3          | WebSocket 双向通信      | 6h                | P2     |
| Phase 3          | 前端工作台 UI           | 16h               | P3     |
| Phase 3          | 错误恢复机制            | 6h                | P3     |
| **Phase 3 小计** |                         | **36h (5-7天)**   |        |
| **总计**         |                         | **84h (12-15天)** |        |

---

## 7. 风险与缓解措施

| 风险                      | 概率 | 影响 | 缓解措施                              |
| ------------------------- | ---- | ---- | ------------------------------------- |
| zod 版本不兼容            | 高   | 中   | 使用 patch-package 或 fork InkOS Core |
| LLM API 超时              | 中   | 高   | 实现超时重试 + 任务队列               |
| 内存泄漏 (长任务)         | 中   | 高   | 使用 worker_threads 或独立进程        |
| Neo4j 与 InkOS 状态不一致 | 低   | 中   | 单一数据源原则                        |
| 前端 SSE 兼容性           | 低   | 低   | 降级到轮询                            |

---

## 8. 后续优化方向

1. **Worker Threads**: 将 LLM 调用移至独立线程
2. **任务持久化**: Redis + BullMQ 支持断点续传
3. **多模型支持**: 动态切换 Claude/GPT/Gemini
4. **协作模式**: 多用户实时协作编辑
5. **版本控制**: 章节历史版本管理
6. **性能监控**: Prometheus + Grafana 集成

---

## 9. 附录: 关键代码片段

### A. InkOS Service 封装

```typescript
// server/src/services/inkosService.ts
import { PipelineRunner, createLLMClient, type OnStreamProgress } from '@actalk/inkos-core';
import { prisma } from '../index';
import { EventEmitter } from 'events';

export class InkosService {
  private eventBus = new EventEmitter();

  async writeChapter(
    bookId: string,
    chapterNumber: number,
    options: { model?: string } = {}
  ): Promise<{ taskId: string }> {
    const taskId = `${bookId}-${chapterNumber}-${Date.now()}`;

    // 异步执行，立即返回
    this.executeWrite(taskId, bookId, chapterNumber, options).catch((err) => {
      this.eventBus.emit(`error:${taskId}`, err);
    });

    return { taskId };
  }

  private async executeWrite(
    taskId: string,
    bookId: string,
    chapterNumber: number,
    options: { model?: string }
  ): Promise<void> {
    const book = await prisma.book.findUnique({
      where: { id: bookId },
      include: { chapters: true },
    });

    if (!book) throw new Error('Book not found');

    const client = createLLMClient({
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const onProgress: OnStreamProgress = (progress) => {
      this.eventBus.emit(`progress:${taskId}`, progress);
    };

    const runner = new PipelineRunner({
      client,
      model: options.model || 'claude-sonnet-4-20250514',
      projectRoot: this.getProjectPath(bookId),
      onStreamProgress,
    });

    const result = await runner.writeChapter(chapterNumber);

    // 保存到数据库
    await prisma.chapter.upsert({
      where: { bookId_number: { bookId, number: chapterNumber } },
      update: {
        content: result.content,
        wordCount: result.wordCount,
        status: 'ready-for-review',
      },
      create: {
        bookId,
        number: chapterNumber,
        title: result.title,
        content: result.content,
        wordCount: result.wordCount,
        status: 'ready-for-review',
      },
    });

    this.eventBus.emit(`complete:${taskId}`, result);
  }

  subscribeProgress(taskId: string, callback: (progress: any) => void) {
    this.eventBus.on(`progress:${taskId}`, callback);
    return () => this.eventBus.off(`progress:${taskId}`, callback);
  }

  private getProjectPath(bookId: string): string {
    return path.join(process.cwd(), 'projects', bookId);
  }
}

export const inkosService = new InkosService();
```

### B. 前端 React Hook

```typescript
// hooks/useInkosWrite.ts
import { useState, useEffect, useCallback } from 'react';

interface WriteProgress {
  phase: 'thinking' | 'writing' | 'auditing' | 'revising';
  percentage: number;
  message: string;
}

export function useInkosWrite() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState<WriteProgress | null>(null);
  const [status, setStatus] = useState<'idle' | 'running' | 'complete' | 'error'>('idle');
  const [result, setResult] = useState<any>(null);

  const startWrite = useCallback(async (bookId: string, chapterNumber: number) => {
    setStatus('running');
    setProgress({ phase: 'thinking', percentage: 0, message: 'Starting...' });

    const response = await fetch('/api/inkos/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId, chapterNumber }),
    });

    const { taskId } = await response.json();
    setTaskId(taskId);

    // 连接 SSE
    const eventSource = new EventSource(`/api/inkos/stream/${taskId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'progress') {
        setProgress(data);
      } else if (data.type === 'complete') {
        setResult(data.result);
        setStatus('complete');
        eventSource.close();
      } else if (data.type === 'error') {
        setStatus('error');
        eventSource.close();
      }
    };

    eventSource.onerror = () => {
      setStatus('error');
      eventSource.close();
    };
  }, []);

  return { startWrite, progress, status, result };
}
```

---

## 10. 结论

推荐采用**混合模式 B+C 渐进式集成**:

1. **Phase 1** (2-3天): 快速验证，通过 API 直接调用 InkOS Core
2. **Phase 2** (4-5天): 深度集成，统一存储层
3. **Phase 3** (5-7天): 完善功能，构建完整创作工作台

此方案平衡了实施速度、运行性能和长期维护成本，能够在 2 周内交付可用的集成版本。

---

_文档结束_
