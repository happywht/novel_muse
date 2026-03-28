# inkos API 参考文档

> Muse 后端提供的 inkos 整合 REST API

## 📋 目录

- [基础信息](#基础信息)
- [端点列表](#端点列表)
- [数据类型](#数据类型)
- [错误处理](#错误处理)
- [示例代码](#示例代码)

---

## 基础信息

**基础URL**: `http://localhost:3001/api/inkos`

**认证**: Bearer Token (可选，取决于配置)

**内容类型**: `application/json`

---

## 端点列表

### 健康检查

#### `GET /api/inkos/health`

检查 inkos 集成状态。

**响应示例**:
```json
{
  "status": "ok",
  "inkos": {
    "available": true,
    "path": "/path/to/inkos"
  },
  "timestamp": "2024-03-28T12:00:00.000Z"
}
```

---

### 导入项目

#### `POST /api/inkos/import`

将 Muse 项目导入到 inkos 格式。

**请求体**:
```typescript
interface ImportRequest {
  projectId: string;      // Muse 项目ID
  title: string;          // 小说标题
  premise: string;        // 故事前提
  genre?: string;         // 题材类型
  characters?: Character[];  // 角色列表
  world?: WorldSettings;     // 世界设定
  plotOutline?: string;      // 情节大纲
  chapters?: Chapter[];      // 章节列表
}
```

**响应示例**:
```json
{
  "taskId": "task-123456",
  "status": "pending",
  "message": "Import task created"
}
```

**状态码**:
- `201` - 任务创建成功
- `400` - 请求参数无效
- `500` - 服务器错误

---

### 导出项目

#### `POST /api/inkos/export`

从 inkos 项目导出为 Muse 格式。

**请求体**:
```typescript
interface ExportRequest {
  projectId: string;    // Muse 项目ID
  bookId: string;       // inkos 书籍ID
  includeChapters?: boolean;  // 是否包含章节内容
}
```

**响应示例**:
```json
{
  "taskId": "task-789012",
  "status": "pending",
  "message": "Export task created"
}
```

---

### 写章节

#### `POST /api/inkos/write`

触发 AI 写作生成章节。

**请求体**:
```typescript
interface WriteChapterRequest {
  projectId: string;       // Muse 项目ID
  chapterId: string;       // 章节ID
  chapterNumber: number;   // 章节序号
  options?: {
    model?: string;        // AI 模型
    temperature?: number;  // 创造性 (0-1)
    wordCount?: number;    // 目标字数
  };
}
```

**响应示例**:
```json
{
  "taskId": "task-345678",
  "status": "pending",
  "message": "Write task created"
}
```

---

### 运行审计

#### `GET /api/inkos/audit`

运行 33 维度连续性审计。

**查询参数**:
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| projectId | string | 是 | Muse 项目ID |
| chapterId | string | 否 | 指定章节ID |

**响应示例**:
```json
{
  "taskId": "task-901234",
  "status": "pending",
  "message": "Audit task created"
}
```

---

### 获取任务状态

#### `GET /api/inkos/status/:taskId`

获取异步任务的状态和结果。

**响应示例**:
```json
{
  "taskId": "task-123456",
  "status": "completed",
  "progress": 100,
  "message": "Import completed",
  "result": {
    "projectId": "my-novel-001",
    "inkosProjectPath": "/workspace/my-novel",
    "chaptersWritten": 0,
    "charactersImported": 5,
    "worldBuilt": true
  },
  "createdAt": "2024-03-28T12:00:00.000Z",
  "completedAt": "2024-03-28T12:01:30.000Z"
}
```

**任务状态**:
| 状态 | 描述 |
|------|------|
| `pending` | 等待处理 |
| `running` | 正在执行 |
| `completed` | 已完成 |
| `failed` | 执行失败 |
| `cancelled` | 已取消 |

---

### 实时进度流 (SSE)

#### `GET /api/inkos/stream/:taskId`

通过 Server-Sent Events 获取实时进度更新。

**响应格式**:
```
event: progress
data: {"percentage": 50, "message": "正在转换数据...", "phase": "convert"}

event: progress
data: {"percentage": 75, "message": "正在写入文件...", "phase": "write"}

event: complete
data: {"status": "completed", "result": {...}}
```

---

### 取消任务

#### `DELETE /api/inkos/status/:taskId`

取消正在运行的任务。

**响应示例**:
```json
{
  "taskId": "task-123456",
  "status": "cancelled",
  "message": "Task cancelled by user"
}
```

---

## 数据类型

### Character
```typescript
interface Character {
  id: string;
  name: string;
  role: 'PROTAGONIST' | 'DEUTERAGONIST' | 'ANTAGONIST' | 'MENTOR' | 'SUPPORTING';
  description?: string;
  arc?: {
    startingPoint: string;
    midpoint: string;
    endingPoint: string;
  };
  relationships?: CharacterRelation[];
}
```

### WorldSettings
```typescript
interface WorldSettings {
  settings: WorldSetting[];
}

interface WorldSetting {
  id: string;
  category: 'GEOGRAPHY' | 'HISTORY' | 'CULTURE' | 'MAGIC_SYSTEM' | 'TECHNOLOGY' | 'OTHER';
  name: string;
  description: string;
  importance?: number;
}
```

### Chapter
```typescript
interface Chapter {
  id: string;
  title: string;
  content: string;
  order: number;
  wordCount?: number;
}
```

---

## 错误处理

### 错误响应格式
```json
{
  "error": "Invalid request",
  "details": [
    {
      "field": "projectId",
      "message": "projectId is required"
    }
  ]
}
```

### 常见错误码
| 状态码 | 错误类型 | 描述 |
|--------|---------|------|
| 400 | Bad Request | 请求参数无效 |
| 401 | Unauthorized | 未授权 |
| 404 | Not Found | 资源不存在 |
| 422 | Unprocessable Entity | 无法处理的实体 |
| 500 | Internal Server Error | 服务器内部错误 |
| 503 | Service Unavailable | inkos CLI 不可用 |

---

## 示例代码

### JavaScript/TypeScript
```typescript
import { inkosApiClient } from './services/inkosApiClient';

// 导入项目
const result = await inkosApiClient.importToInkos({
  projectId: 'my-novel-001',
  title: '我的小说',
  premise: '一个关于成长的故事'
});

console.log('Task ID:', result.taskId);

// 等待完成
const finalStatus = await inkosApiClient.waitForTask(result.taskId);
console.log('Status:', finalStatus.status);
```

### Python
```python
import requests

# 导入项目
response = requests.post(
    'http://localhost:3001/api/inkos/import',
    json={
        'projectId': 'my-novel-001',
        'title': '我的小说',
        'premise': '一个关于成长的故事'
    }
)

task_id = response.json()['taskId']
print(f'Task ID: {task_id}')

# 轮询状态
import time
while True:
    status = requests.get(f'http://localhost:3001/api/inkos/status/{task_id}')
    data = status.json()
    print(f"Progress: {data.get('progress', 0)}%")

    if data['status'] in ['completed', 'failed', 'cancelled']:
        break

    time.sleep(2)
```

---

## 更新日志

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0.0 | 2024-03-28 | 初始 API 发布 |
