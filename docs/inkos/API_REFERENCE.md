# inkos API 参考文档

> Muse 后端提供的 inkos 整合 REST API

## 目录

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

**请求追踪**: 所有响应包含 `X-Request-Id` 头，用于调试和日志追踪

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
  project: {
    id: string;
    title: string;
    genre?: string;
    premise?: string;
    theme?: string;
    synopsis?: string;
    wordCountGoal?: number;
    status?: string;
  };
  characters?: Array<{
    id: string;
    name: string;
    role?: string;
    description?: string;
    backstory?: string;
    personality?: string;
    goals?: string;
    relationships?: Array<{
      characterId: string;
      relationship: string;
    }>;
  }>;
  chapters?: Array<{
    id: string;
    title: string;
    synopsis?: string;
    status?: string;
    order: number;
    wordCount?: number;
  }>;
  world?: {
    setting?: string;
    rules?: string;
    timeline?: string;
    locations?: Array<{
      id: string;
      name: string;
      description?: string;
    }>;
  };
}
```

**响应示例**:
```json
{
  "data": {
    "message": "Import task started",
    "taskId": "task-123456",
    "statusUrl": "/api/inkos/status/task-123456"
  },
  "requestId": "req-abc123",
  "timestamp": "2024-03-28T12:00:00.000Z"
}
```

**状态码**:
- `202` - 任务创建成功
- `400` - 请求参数无效
- `500` - 服务器错误

---

### 导出项目

#### `POST /api/inkos/export`

从 inkos 项目导出为 Muse 格式。

**请求体**:
```typescript
interface ExportRequest {
  inkosProjectPath: string;    // inkos 项目路径
  targetProjectId?: string;    // 目标 Muse 项目ID
}
```

**响应示例**:
```json
{
  "data": {
    "message": "Export task started",
    "taskId": "task-789012",
    "statusUrl": "/api/inkos/status/task-789012"
  },
  "requestId": "req-def456",
  "timestamp": "2024-03-28T12:00:00.000Z"
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
    temperature?: number;  // 创造性 (0-2)
    maxTokens?: number;    // 最大 token 数
    skipValidation?: boolean;  // 跳过验证
    reviseMode?: 'auto' | 'manual' | 'skip';  // 修订模式
  };
}
```

**响应示例**:
```json
{
  "data": {
    "message": "Write task started",
    "taskId": "task-345678",
    "chapterId": "chapter-001",
    "chapterNumber": 1,
    "statusUrl": "/api/inkos/status/task-345678",
    "streamUrl": "/api/inkos/stream/task-345678?projectId=project-001"
  },
  "requestId": "req-ghi789",
  "timestamp": "2024-03-28T12:00:00.000Z"
}
```

---

### 运行审计

#### `POST /api/inkos/audit`

运行 33 维度连续性审计。

> **注意**: 之前版本支持 `GET /api/inkos/audit`，现已弃用。请统一使用 `POST` 方法。

**请求体**:
```typescript
interface AuditRequest {
  projectId: string;           // Muse 项目ID (必填)
  chapterId?: string;          // 指定章节ID (可选)
  dimensions?: string[];       // 指定审计维度 (可选)
  options?: {
    checkContinuity?: boolean;   // 检查连续性
    checkAITells?: boolean;      // 检查 AI 痕迹
    checkSensitiveWords?: boolean; // 检查敏感词
    checkStyle?: boolean;        // 检查文风
  };
}
```

**请求示例**:
```json
{
  "projectId": "my-novel-001",
  "chapterId": "chapter-005",
  "dimensions": ["plot_structure", "char_depth", "ai_tells"],
  "options": {
    "checkContinuity": true,
    "checkAITells": true,
    "checkSensitiveWords": true,
    "checkStyle": true
  }
}
```

**响应示例**:
```json
{
  "data": {
    "message": "Audit task started",
    "taskId": "task-901234",
    "projectId": "my-novel-001",
    "statusUrl": "/api/inkos/status/task-901234",
    "streamUrl": "/api/inkos/stream/task-901234?projectId=my-novel-001"
  },
  "requestId": "req-jkl012",
  "timestamp": "2024-03-28T12:00:00.000Z"
}
```

**状态码**:
- `202` - 任务创建成功
- `400` - 请求参数无效 (缺少 projectId 或格式错误)
- `500` - 服务器错误

---

### 获取任务状态

#### `GET /api/inkos/status/:taskId`

获取异步任务的状态和结果。

**响应示例**:
```json
{
  "data": {
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
  },
  "requestId": "req-mno345",
  "timestamp": "2024-03-28T12:02:00.000Z"
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
  "data": {
    "message": "Task cancelled",
    "taskId": "task-123456"
  },
  "requestId": "req-pqr678",
  "timestamp": "2024-03-28T12:03:00.000Z"
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

### 标准错误响应格式

所有 API 错误都使用统一的响应格式：

```typescript
interface ApiErrorResponse {
  error: {
    code: string;        // 机器可读的错误代码
    message: string;     // 人类可读的错误信息
    details?: unknown[]; // 附加错误详情
  };
  requestId: string;     // 请求唯一标识
  timestamp: string;     // ISO 8601 时间戳
}
```

**错误响应示例**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "projectId",
        "message": "Required",
        "code": "invalid_type"
      }
    ]
  },
  "requestId": "req-abc123",
  "timestamp": "2024-03-28T12:00:00.000Z"
}
```

### 错误代码

| 错误代码 | HTTP 状态码 | 描述 |
|---------|------------|------|
| `BAD_REQUEST` | 400 | 请求格式错误 |
| `INVALID_INPUT` | 400 | 输入数据无效 |
| `MISSING_PARAMETER` | 400 | 缺少必要参数 |
| `VALIDATION_ERROR` | 400 | 数据验证失败 |
| `UNAUTHORIZED` | 401 | 未授权 |
| `FORBIDDEN` | 403 | 禁止访问 |
| `NOT_FOUND` | 404 | 资源不存在 |
| `CONFLICT` | 409 | 资源冲突 |
| `INTERNAL_ERROR` | 500 | 服务器内部错误 |
| `SERVICE_UNAVAILABLE` | 503 | 服务不可用 |
| `TIMEOUT` | 504 | 请求超时 |
| `DEPENDENCY_ERROR` | 502 | 依赖服务错误 |

### 常见错误示例

**缺少必填参数**:
```json
{
  "error": {
    "code": "MISSING_PARAMETER",
    "message": "Missing required parameter: projectId",
    "details": [
      {
        "field": "projectId",
        "message": "This parameter is required"
      }
    ]
  },
  "requestId": "req-xyz789",
  "timestamp": "2024-03-28T12:00:00.000Z"
}
```

**验证失败**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "chapterNumber",
        "message": "Expected number, received string",
        "code": "invalid_type"
      },
      {
        "field": "options.temperature",
        "message": "Number must be less than or equal to 2",
        "code": "too_big"
      }
    ]
  },
  "requestId": "req-xyz789",
  "timestamp": "2024-03-28T12:00:00.000Z"
}
```

**任务不存在**:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Task not found: task-999999"
  },
  "requestId": "req-xyz789",
  "timestamp": "2024-03-28T12:00:00.000Z"
}
```

---

## 示例代码

### JavaScript/TypeScript
```typescript
import { inkosApiClient } from './services/inkosApiClient';

// 运行审计 (使用 POST 方法)
const result = await inkosApiClient.runAudit('my-novel-001', {
  chapterId: 'chapter-005',
  dimensions: ['plot_structure', 'char_depth'],
  checkContinuity: true,
  checkAITells: true,
});

console.log('Task ID:', result.data.taskId);

// 等待完成
const finalStatus = await inkosApiClient.pollTaskStatus(result.data.taskId, {
  onProgress: (task) => {
    console.log(`Progress: ${task.progress}%`);
  },
});

console.log('Status:', finalStatus.status);
```

### Python
```python
import requests
import json

# 运行审计 (使用 POST 方法)
response = requests.post(
    'http://localhost:3001/api/inkos/audit',
    json={
        'projectId': 'my-novel-001',
        'chapterId': 'chapter-005',
        'dimensions': ['plot_structure', 'char_depth'],
        'options': {
            'checkContinuity': True,
            'checkAITells': True,
        }
    }
)

if response.status_code == 202:
    data = response.json()
    task_id = data['data']['taskId']
    print(f'Task ID: {task_id}')

    # 轮询状态
    import time
    while True:
        status = requests.get(f'http://localhost:3001/api/inkos/status/{task_id}')
        status_data = status.json()['data']

        print(f"Progress: {status_data.get('progress', 0)}%")

        if status_data['status'] in ['completed', 'failed', 'cancelled']:
            break

        time.sleep(2)
else:
    error = response.json()
    print(f"Error: {error['error']['code']} - {error['error']['message']}")
```

### cURL
```bash
# 运行审计
curl -X POST http://localhost:3001/api/inkos/audit \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "my-novel-001",
    "chapterId": "chapter-005",
    "options": {
      "checkContinuity": true,
      "checkAITells": true
    }
  }'

# 获取任务状态
curl http://localhost:3001/api/inkos/status/task-901234
```

---

## 更新日志

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.1.0 | 2024-03-29 | 统一错误响应格式；移除 GET /audit，统一使用 POST |
| v1.0.0 | 2024-03-28 | 初始 API 发布 |
