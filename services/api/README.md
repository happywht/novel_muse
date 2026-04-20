# API 服务层文档

## 📋 目录

- [架构概述](#架构概述)
- [数据流](#数据流)
- [使用指南](#使用指南)
- [API 参考](#api-参考)
- [最佳实践](#最佳实践)
- [迁移指南](#迁移指南)

## 🏗️ 架构概述

本 API 层提供三层封装，确保前后端数据模型的完全隔离：

```
┌─────────────────────────────────────────────────────────────┐
│                        前端组件层                             │
│                    (使用 ProjectState)                        │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        服务层 (推荐)                          │
│  - 数据验证 (Zod Schema)                                      │
│  - 模型转换 (Transformer)                                     │
│  - 错误处理 (ApiError)                                        │
│  - 类型安全 (TypeScript)                                      │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      API 层 (兼容)                            │
│  - 直接调用后端接口                                           │
│  - 返回原始 DTO 数据                                          │
│  - 手动处理转换                                               │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      HTTP 客户端层                            │
│  - 基础请求封装                                               │
│  - 统一错误处理                                               │
└─────────────────────────────┬───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         后端 API                              │
└─────────────────────────────────────────────────────────────┘
```

### 📁 目录结构

```
services/api/
├── index.ts                    # 统一导出入口
├── client.ts                   # HTTP 客户端封装
├── ApiResponse.ts              # API 响应工具 ⭐
│
├── transformers/               # 数据转换器 ⭐
│   ├── Transformer.ts          # 转换器基类
│   └── ProjectTransformer.ts   # 项目转换器
│
├── validators/                 # 数据验证器 ⭐
│   └── ProjectValidator.ts     # 项目验证器
│
├── services/                   # 服务层 (推荐) ⭐
│   ├── index.ts                # 服务统一导出
│   ├── ProjectService.ts       # 项目服务
│   ├── GraphService.ts         # 图谱服务
│   ├── EchoService.ts          # Echo 服务
│   └── CharacterService.ts     # 角色服务
│
├── projectApi.ts               # 项目 API (兼容)
├── graphApi.ts                 # 图谱 API (兼容)
├── characterApi.ts             # 角色 API (兼容)
├── echoApi.ts                  # Echo API (兼容)
├── forgeApi.ts                 # Forge API (兼容)
├── chapterApi.ts               # 章节 API (兼容)
└── systemApi.ts                # 系统 API (兼容)
```

## 🎯 设计优势

### 1. **前后端模型隔离**
- 前端使用前端模型（ProjectState）
- 后端使用后端模型（ProjectDTO）
- 通过转换器实现双向转换

### 2. **数据验证**
- 使用 Zod Schema 进行运行时验证
- 自动验证输入数据格式
- 友好的验证错误信息

### 3. **统一错误处理**
- 标准化的 API 响应格式
- 统一的错误类型（ApiError）
- 一致的错误处理机制

### 4. **类型安全**
- 完整的 TypeScript 类型支持
- 编译时错误检测
- IDE 自动补全

### 5. **向后兼容**
- 旧的 API 层仍然可用
- 支持渐进式迁移
- 不破坏现有代码

## 🔄 数据流

### 服务层推荐流程

```typescript
// 前端状态 → 验证 → 转换为 DTO → HTTP 请求 → 后端
前端模型(ProjectState)
    ↓ validateCreateProject(data)  // Zod 验证
    ↓ transformReverse(data)        // 转换为 DTO
    ↓ apiClient.post()              // HTTP 请求
    ↓
后端接收 DTO

// 后端响应 → 验证 → 转换为前端模型 → 组件使用
后端响应
    ↓ validateApiResponse(response)  // 验证响应格式
    ↓ extractApiResponseData()       // 提取数据
    ↓ transform(dto)                 // 转换为前端模型
    ↓
前端组件使用 ProjectState
```

## 📖 使用指南

### 推荐方式：使用服务层 ⭐

#### 项目服务

```typescript
import { projectService } from '@/services/api';

// 获取项目列表（自动验证和转换）
const projects = await projectService.list();

// 创建项目（自动验证）
const newProject = await projectService.create({
  title: '新项目',
  genre: '玄幻',
  premise: '这是一个新的故事'
});

// 更新项目（自动验证）
await projectService.update(projectId, {
  title: '更新后的标题',
  genre: '仙侠'
});

// 获取单个项目
const project = await projectService.get(projectId);

// 删除项目
await projectService.delete(projectId);

// 获取统计信息
const stats = await projectService.getStatistics(projectId);
```

#### 图谱服务

```typescript
import { graphService } from '@/services/api';

// 获取完整图谱
const graph = await graphService.getGraph(projectId);

// 获取节点邻居
const neighbors = await graphService.getNodeNeighbors(projectId, nodeId);

// 查询子图
const subgraph = await graphService.getSubgraph(projectId, {
  centerNodeId: 'node1',
  depth: 2
});

// 添加节点
const newNode = await graphService.addNode(projectId, {
  label: '新节点',
  type: 'Character',
  properties: {}
});
```

#### Echo 服务

```typescript
import { echoService } from '@/services/api';

// 获取所有 Echo
const echoes = await echoService.list(projectId);

// 创建 Echo
const newEcho = await echoService.create(projectId, {
  type: 'CHARACTER',
  timestamp: Date.now(),
  content: '角色发生了变化',
  relatedChapterId: 'chapter1'
});

// 批量操作
await echoService.batchOperation(projectId, 'ACCEPT', ['echo1', 'echo2']);
```

#### 角色服务

```typescript
import { characterService } from '@/services/api';

// 获取所有角色
const characters = await characterService.list(projectId);

// 创建角色
const newCharacter = await characterService.create(projectId, {
  name: '张三',
  role: '主角',
  physicalStatus: '健康'
});

// 获取角色关系网络
const network = await characterService.getRelationshipNetwork(projectId, characterId);
```

### 兼容方式：使用 API 层

```typescript
import { projectApi, projectTransformer } from '@/services/api';

// 直接调用（需要手动处理 DTO）
const dto = await projectApi.get(id);
const project = projectTransformer.transform(dto);

// 创建项目
const response = await projectApi.create();
const project = await projectApi.get(response.id);
```

### 使用统一导出对象

```typescript
import { services } from '@/services/api';

// 按需加载服务
const projectService = await services.project();
const graphService = await services.graph();

// 使用服务
const projects = await projectService.list();
const graph = await graphService.getGraph(projectId);
```

## 📖 使用指南

### 推荐的新用法

```typescript
// 导入统一 API 对象
import { api } from '@/services/api';

// 调用各种 API
const projects = await api.project.list();
const project = await api.project.get(id);
const graph = await api.graph.get(projectId);
const traits = await api.character.getTraits(projectId, characterId);
```

### 或者导入特定模块

```typescript
// 按需导入特定模块（Tree Shaking 优化）
import { projectApi } from '@/services/api';
import { graphApi } from '@/services/api';

const projects = await projectApi.list();
const graph = await graphApi.get(projectId);
```

### 旧的用法（仍然支持）

```typescript
// 原有的导入方式仍然有效
import { fetchProject, fetchGraph } from '@/services/apiService';

const project = await fetchProject(id);
const graph = await fetchGraph(projectId);
```

## 🔧 模块说明

### client.ts - HTTP 客户端封装

统一的 HTTP 请求处理，提供：
- `get<T>(endpoint)` - GET 请求
- `post<T>(endpoint, data)` - POST 请求
- `put<T>(endpoint, data)` - PUT 请求
- `patch<T>(endpoint, data)` - PATCH 请求
- `delete(endpoint)` - DELETE 请求

### projectApi.ts - 项目管理

负责项目的基础 CRUD 操作：
- `list()` - 获取项目列表
- `get(id)` - 获取单个项目
- `create()` - 创建新项目
- `syncFull(project)` - 完整同步
- `patch(id, delta)` - 部分更新
- `delete(id)` - 删除项目
- `getChapter(projectId, chapterId)` - 获取章节
- `getChaptersContent(projectId)` - 获取所有章节
- `getStatistics(projectId)` - 获取统计数据

### graphApi.ts - 知识图谱

负责知识图谱相关操作：
- `get(projectId, types?)` - 获取图谱
- `getNeighbors(projectId, nodeId)` - 获取节点邻居
- `createEdge(projectId, sourceId, targetId, type)` - 创建边
- `getSubgraph(projectId, anchors, branchId?)` - 获取子图
- `getNarrativeInsights(projectId, branchId?)` - 叙事洞察
- `getPhysicalStatus(projectId, characterNames, branchId?)` - 身体状态
- `getUnresolvedForeshadowing(projectId, branchId?)` - 未回收伏笔
- `mergeBranch(projectId, branchId)` - 合并分支
- `getFactions(projectId)` - 获取势力
- `simulatePropagation(projectId, triggerName, changeDescription)` - 状态传播
- `getPlotNodeContext(projectId, plotNodeId?)` - 情节节点上下文
- `checkConsistency(projectId)` - 一致性检查

### characterApi.ts - 角色管理

负责角色相关操作：
- `getTraits(projectId, characterId)` - 获取角色特质
- `getEvolution(projectId, characterId)` - 获取角色演变
- `getForeshadowing(projectId, characterId)` - 获取角色伏笔
- `getRelationshipTimeline(projectId, char1Id, char2Id)` - 关系时间线
- `getEchoForeshadowing(projectId, branchId?)` - Echo 伏笔
- `detectContradictions(projectId)` - 检测矛盾

### echoApi.ts - Echo 批量操作

负责 Echo 的批量操作：
- `batchAccept(projectId, echoIds, syncToGraph?)` - 批量接受
- `batchReject(projectId, echoIds)` - 批量拒绝
- `undoBatch(projectId, operationId?)` - 撤销操作
- `getHistory(projectId)` - 操作历史

### forgeApi.ts - Forge 图谱

负责 Forge 功能：
- `getContext(projectId, options?)` - 获取上下文
- `syncResult(projectId, result)` - 同步结果

### chapterApi.ts - 章节分析

负责章节相关分析：
- `getDependencies(projectId, chapterId)` - 章节依赖
- `getCharacterNetwork(projectId, chapterId)` - 角色网络
- `getConflictHeatmap(projectId)` - 冲突热力图

### systemApi.ts - 系统健康

负责系统检查：
- `checkHealth(timeout?)` - 检查后端健康

## 🚀 迁移指南

### 自动迁移

如果你的代码使用了旧的 API，可以按照以下模式进行迁移：

```typescript
// 旧代码
import { fetchProject, syncProject } from '@/services/apiService';
const project = await fetchProject(id);
await syncProject(project);

// 新代码
import { projectApi } from '@/services/api';
const project = await projectApi.get(id);
await projectApi.syncFull(project);
```

### 常见迁移模式

| 旧 API | 新 API |
|--------|--------|
| `fetchProject(id)` | `projectApi.get(id)` |
| `fetchProjectList()` | `projectApi.list()` |
| `syncProject(project)` | `projectApi.syncFull(project)` |
| `patchProject(id, delta)` | `projectApi.patch(id, delta)` |
| `fetchGraph(projectId, types)` | `graphApi.get(projectId, types)` |
| `fetchNeighbors(projectId, nodeId)` | `graphApi.getNeighbors(projectId, nodeId)` |
| `batchAcceptEchoes(projectId, echoIds)` | `echoApi.batchAccept(projectId, echoIds)` |

## 📊 性能优化

### Tree Shaking 支持

```typescript
// ✅ 推荐：只导入需要的模块
import { projectApi } from '@/services/api';

// ❌ 避免：导入所有 API（虽然向后兼容）
import * as apiService from '@/services/apiService';
```

### 缓存策略

所有带有缓存的 API 都已经在新模块中保留：
- 项目列表缓存
- 图谱缓存
- 统计数据缓存
- 叙事洞察缓存

缓存策略通过 `cacheManager` 统一管理。

## 🧪 测试建议

### 单元测试

```typescript
import { projectApi } from '@/services/api';
import { apiClient } from '@/services/api/client';

// Mock HTTP 客户端
vi.mock('@/services/api/client');

test('projectApi.list should return projects', async () => {
  const mockProjects = [{ id: '1', name: 'Test' }];
  vi.spyOn(apiClient, 'get').mockResolvedValue(mockProjects);

  const result = await projectApi.list();
  expect(result).toEqual(mockProjects);
});
```

## 🔄 未来扩展

要添加新的 API 模块：

1. 创建新的文件 `services/api/newFeatureApi.ts`
2. 使用 `apiClient` 进行 HTTP 调用
3. 在 `services/api/index.ts` 中导出
4. 添加到 `api` 统一导出对象

示例：

```typescript
// services/api/newFeatureApi.ts
import { apiClient } from './client';

export const newFeatureApi = {
  get: (id: string) => apiClient.get(`/new-feature/${id}`),
  create: (data: any) => apiClient.post('/new-feature', data),
};
```

```typescript
// services/api/index.ts
export { newFeatureApi } from './newFeatureApi';

export const api = {
  // ... existing
  newFeature: newFeatureApi,
};
```

## 📝 注意事项

1. **向后兼容**: 旧的 `apiService.ts` 仍然可用，但建议迁移到新模块
2. **错误处理**: HTTP 客户端统一处理错误，抛出标准化的 Error 对象
3. **类型安全**: 所有 API 都有完整的 TypeScript 类型定义
4. **缓存**: 带有缓存的 API 自动处理缓存失效和更新

## 🎓 总结

这次重构实现了：

- ✅ 文件大小从 693 行减少到每个模块 26-140 行
- ✅ 清晰的领域模块划分
- ✅ 更好的可维护性和可测试性
- ✅ 完整的 TypeScript 类型支持
- ✅ 向后兼容，支持渐进式迁移
- ✅ Tree Shaking 优化支持
- ✅ 统一的错误处理和缓存策略
