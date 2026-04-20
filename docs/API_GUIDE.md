# Muse API 技术文档

## 📋 目录

- [快速开始](#快速开始)
- [架构概览](#架构概览)
- [核心模块](#核心模块)
- [API服务](#api服务)
- [数据转换](#数据转换)
- [错误处理](#错误处理)
- [最佳实践](#最佳实践)

---

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 生成文档

```bash
# 生成API文档
npm run docs:api

# 查看文档
npm run docs:serve
```

---

## 🏗️ 架构概览

### 三层架构

```
┌─────────────────────────────────────────┐
│         Frontend Components             │
│  (React, Zustand Store, UI Layer)      │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         API Service Layer               │
│  (Validation, Transformation, Error)    │
│  - ProjectService                      │
│  - GraphService                        │
│  - CharacterService                    │
│  - EchoService                         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         HTTP Client Layer               │
│  (ApiClient, Request/Response)         │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         Backend API Server              │
│  (Express, Controllers, Services)      │
└─────────────────────────────────────────┘
```

### 数据流

```
Frontend State (ProjectState)
    ↓ (transformReverse)
DTO (Data Transfer Object)
    ↓ (ApiClient.fetch)
Backend API
    ↓ (JSON Response)
DTO
    ↓ (transform)
Frontend State
```

---

## 📦 核心模块

### 1. ApiClient - HTTP客户端

**位置**: `services/api/client.ts`

**功能**:
- 统一的HTTP请求方法（GET, POST, PUT, PATCH, DELETE）
- 自动错误处理
- 类型安全的请求和响应

**使用示例**:

```typescript
import { apiClient } from '@/services/api';

// GET请求
const projects = await apiClient.get<ProjectDTO[]>('/projects');

// POST请求
const newProject = await apiClient.post<ProjectDTO>('/projects', {
  title: '新项目',
  genre: '玄幻',
});

// PUT请求
const updated = await apiClient.put<ProjectDTO>('/projects/123', {
  title: '更新标题',
});

// DELETE请求
await apiClient.delete('/projects/123');
```

**类型签名**:

```typescript
class ApiClient {
  get<T>(endpoint: string, signal?: AbortSignal): Promise<T>
  post<T>(endpoint: string, data: unknown): Promise<T>
  put<T>(endpoint: string, data: unknown): Promise<T>
  patch<T>(endpoint: string, data: unknown): Promise<T>
  delete<T>(endpoint: string): Promise<T>
}
```

---

### 2. 数据转换器

**位置**: `services/api/transformers/`

**功能**:
- DTO ↔ Frontend State双向转换
- 默认值处理
- 数据验证和清理

**ProjectTransformer示例**:

```typescript
import { projectTransformer } from '@/services/api';

// DTO -> State
const state = projectTransformer.transform(projectDTO);

// State -> DTO
const dto = projectTransformer.transformReverse(projectState);

// 数组转换
const states = projectTransformer.transformArray(projectDTOs);
```

---

### 3. 数据验证器

**位置**: `services/api/validators/`

**功能**:
- 使用Zod进行运行时验证
- 类型安全的解析
- 详细的错误消息

**ProjectValidator示例**:

```typescript
import {
  validateCreateProject,
  safeValidateCreateProject
} from '@/services/api';

// 抛出错误的验证
try {
  const validated = validateCreateProject(rawData);
} catch (error) {
  console.error(error.message);
}

// 返回结果的验证
const result = safeValidateCreateProject(rawData);
if (result.success) {
  const project = result.data;
} else {
  console.error(result.error);
}
```

---

## 🔌 API服务

### 项目服务 (ProjectService)

**功能**: 项目CRUD操作、列表查询、搜索

**API端点**:

```typescript
// 获取所有项目
GET /api/projects
Response: ProjectSummary[]

// 获取单个项目
GET /api/projects/:id
Response: ProjectDTO

// 创建项目
POST /api/projects
Body: CreateProjectDTO
Response: ProjectDTO

// 更新项目
PUT /api/projects/:id
Body: UpdateProjectDTO
Response: ProjectDTO

// 删除项目
DELETE /api/projects/:id
Response: { success: boolean }

// 搜索项目
GET /api/projects/search?q=keyword
Response: ProjectSummary[]
```

**使用示例**:

```typescript
import { projectApi } from '@/services/api';

// 列表
const projects = await projectApi.list();

// 获取
const project = await projectApi.get('project-id');

// 创建
const created = await projectApi.create({
  title: '新项目',
  genre: '玄幻',
  premise: '前提',
});

// 更新
const updated = await projectApi.update('project-id', {
  title: '新标题',
});

// 删除
await projectApi.delete('project-id');

// 搜索
const results = await projectApi.search('关键词');
```

---

### 图谱服务 (GraphService)

**功能**: 知识图谱查询、节点关系分析

**API端点**:

```typescript
// 获取完整图谱
GET /api/graph/:projectId
Response: GraphDTO

// 获取节点邻居
GET /api/graph/:projectId/neighbors/:nodeId
Response: NodeNeighborsDTO

// 获取子图
POST /api/graph/:projectId/subgraph
Body: { nodeIds: string[] }
Response: SubgraphResponse
```

**使用示例**:

```typescript
import { graphApi } from '@/services/api';

// 获取完整图谱
const graph = await graphApi.get('project-id');

// 获取节点邻居
const neighbors = await graphApi.getNodeNeighbors('project-id', 'node-id');

// 获取子图
const subgraph = await graphApi.getSubgraph('project-id', ['node1', 'node2']);
```

---

### 角色服务 (CharacterService)

**功能**: 角色管理、关系分析、演化追踪

**API端点**:

```typescript
// 获取角色特质
GET /api/characters/:projectId/traits/:characterId
Response: CharacterTraitsDTO

// 获取角色演化
GET /api/characters/:projectId/evolution/:characterId
Response: CharacterEvolutionDTO

// 分析角色关系
GET /api/characters/:projectId/relationships/:characterId
Response: RelationshipTimelineDTO
```

**使用示例**:

```typescript
import { characterApi } from '@/services/api';

// 获取角色特质
const traits = await characterApi.getTraits('project-id', 'char-id');

// 获取角色演化
const evolution = await characterApi.getEvolution('project-id', 'char-id');

// 分析关系
const relationships = await characterApi.getRelationships('project-id', 'char-id');
```

---

## 🔄 数据转换

### 转换模式

#### 1. DTO → State (Backend → Frontend)

```typescript
// Backend Response
{
  "id": "123",
  "title": "项目标题",
  "genre": "玄幻",
  "createdAt": 1234567890,
  "lastModified": 1234567890
}

    ↓ transform()

// Frontend State
{
  id: "123",
  title: "项目标题",
  genre: "玄幻",
  createdAt: 1234567890,
  lastModified: 1234567890,
  // + 默认值
  characters: [],
  worldSettings: [],
  chapters: [],
  // ... other fields
}
```

#### 2. State → DTO (Frontend → Backend)

```typescript
// Frontend State
{
  id: "123",
  title: "项目标题",
  genre: "玄幻",
  creativeSettings: { /*...*/ },
  // ... other fields
}

    ↓ transformReverse()

// Backend Request
{
  "id": "123",
  "title": "项目标题",
  "genre": "玄幻",
  "creativeSettings": { /*...*/ },
  // ... other fields
}
```

---

## ⚠️ 错误处理

### 错误类型

```typescript
class ApiError extends Error {
  code: string;          // 错误代码
  statusCode?: number;   // HTTP状态码
  details?: unknown;     // 详细错误信息
}
```

### 错误处理模式

#### 1. 使用ApiError

```typescript
import { ApiError } from '@/services/api';

try {
  await apiClient.get('/api/projects');
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API Error:', error.code);
    console.error('Status:', error.statusCode);
    console.error('Message:', error.message);
  }
}
```

#### 2. 使用错误处理工具

```typescript
import { withApiErrorHandling } from '@/services/api';

const result = await withApiErrorHandling(async () => {
  return await apiClient.get('/api/projects');
});

if (result.success) {
  const data = result.data;
} else {
  console.error('Error:', result.error);
}
```

#### 3. 使用服务层自动错误处理

```typescript
import { projectService } from '@/services/api/services';

const project = await projectService.get('project-id');
// 服务层已处理错误，返回默认值或抛出统一错误
```

---

## ✅ 最佳实践

### 1. 使用服务层而非直接调用API

❌ **不推荐**:

```typescript
const project = await apiClient.get(`/api/projects/${id}`);
```

✅ **推荐**:

```typescript
const project = await projectApi.get(id);
// 或
const project = await projectService.get(id);
```

### 2. 始终使用类型

❌ **不推荐**:

```typescript
const project = await apiClient.get('/api/projects/123') as any;
```

✅ **推荐**:

```typescript
const project = await apiClient.get<ProjectDTO>('/api/projects/123');
```

### 3. 验证输入数据

❌ **不推荐**:

```typescript
await projectApi.create(rawData);
```

✅ **推荐**:

```typescript
const validated = validateCreateProject(rawData);
await projectApi.create(validated);
```

### 4. 处理错误

❌ **不推荐**:

```typescript
const project = await apiClient.get('/api/projects/123');
// 假设总是成功
```

✅ **推荐**:

```typescript
try {
  const project = await apiClient.get('/api/projects/123');
} catch (error) {
  if (error instanceof ApiError) {
    // 处理特定错误
  }
}
```

### 5. 使用转换器

❌ **不推荐**:

```typescript
const state = {
  id: dto.id,
  title: dto.title || '未命名',
  genre: dto.genre || '',
  // 手动映射所有字段...
};
```

✅ **推荐**:

```typescript
const state = projectTransformer.transform(dto);
```

---

## 📚 更多信息

- [TypeScript类型定义](../types/api.ts)
- [API响应规范](./ApiResponse.md)
- [数据验证指南](./VALIDATION.md)
- [错误处理最佳实践](./ERROR_HANDLING.md)

---

**最后更新**: 2026-04-20
**版本**: v1.0.0
