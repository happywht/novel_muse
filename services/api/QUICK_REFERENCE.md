# API 服务层快速参考

## 🚀 快速开始

### 导入服务

```typescript
// 推荐方式：导入具体服务
import { projectService } from '@/services/api';
import { graphService } from '@/services/api';
import { echoService } from '@/services/api';
import { characterService } from '@/services/api';

// 或使用统一导出
import { services } from '@/services/api';
const projectService = await services.project();
```

### 基本使用

```typescript
// 获取项目列表
const projects = await projectService.list();

// 创建项目
const project = await projectService.create({
  title: '新项目',
  genre: '玄幻'
});

// 更新项目
await projectService.update(project.id, {
  title: '更新后的标题'
});

// 删除项目
await projectService.delete(project.id);
```

## 📋 服务方法速查表

### ProjectService

| 方法 | 参数 | 返回类型 | 描述 |
|-----|------|---------|------|
| `list()` | - | `Promise<ProjectState[]>` | 获取项目列表 |
| `get(id)` | `id: string` | `Promise<ProjectState>` | 获取单个项目 |
| `create(data)` | `Partial<ProjectState>` | `Promise<ProjectState>` | 创建新项目 |
| `update(id, data)` | `id: string, data: Partial<ProjectState>` | `Promise<void>` | 更新项目 |
| `delete(id)` | `id: string` | `Promise<void>` | 删除项目 |
| `syncFull(project)` | `ProjectState` | `Promise<void>` | 完整同步 |
| `getStatistics(projectId)` | `projectId: string` | `Promise<Statistics>` | 获取统计信息 |
| `getChapter(projectId, chapterId)` | `projectId: string, chapterId: string` | `Promise<ChapterContent>` | 获取章节内容 |
| `getChaptersContent(projectId)` | `projectId: string` | `Promise<ChapterContent[]>` | 获取所有章节 |

### GraphService

| 方法 | 参数 | 返回类型 | 描述 |
|-----|------|---------|------|
| `getGraph(projectId)` | `projectId: string` | `Promise<GraphDTO>` | 获取完整图谱 |
| `getNodeNeighbors(projectId, nodeId)` | `projectId: string, nodeId: string` | `Promise<NodeNeighborsDTO>` | 获取节点邻居 |
| `getSubgraph(projectId, params)` | `projectId: string, params` | `Promise<SubgraphResponse>` | 查询子图 |
| `addNode(projectId, node)` | `projectId: string, node` | `Promise<GraphNodeDTO>` | 添加节点 |
| `addEdge(projectId, edge)` | `projectId: string, edge` | `Promise<void>` | 添加边 |
| `deleteNode(projectId, nodeId)` | `projectId: string, nodeId: string` | `Promise<void>` | 删除节点 |
| `deleteEdge(projectId, edgeId)` | `projectId: string, edgeId: string` | `Promise<void>` | 删除边 |

### EchoService

| 方法 | 参数 | 返回类型 | 描述 |
|-----|------|---------|------|
| `list(projectId)` | `projectId: string` | `Promise<Echo[]>` | 获取所有 Echo |
| `get(projectId, echoId)` | `projectId: string, echoId: string` | `Promise<Echo>` | 获取单个 Echo |
| `create(projectId, echo)` | `projectId: string, echo` | `Promise<Echo>` | 创建 Echo |
| `update(projectId, echoId, echo)` | `projectId: string, echoId: string, echo` | `Promise<void>` | 更新 Echo |
| `delete(projectId, echoId)` | `projectId: string, echoId: string` | `Promise<void>` | 删除 Echo |
| `batchOperation(projectId, operation, echoIds)` | `projectId: string, operation, echoIds` | `Promise<Result>` | 批量操作 |

### CharacterService

| 方法 | 参数 | 返回类型 | 描述 |
|-----|------|---------|------|
| `list(projectId)` | `projectId: string` | `Promise<Character[]>` | 获取所有角色 |
| `get(projectId, characterId)` | `projectId: string, characterId: string` | `Promise<Character>` | 获取单个角色 |
| `create(projectId, character)` | `projectId: string, character` | `Promise<Character>` | 创建角色 |
| `update(projectId, characterId, character)` | `projectId: string, characterId: string, character` | `Promise<void>` | 更新角色 |
| `delete(projectId, characterId)` | `projectId: string, characterId: string` | `Promise<void>` | 删除角色 |
| `getRelationshipNetwork(projectId, characterId)` | `projectId: string, characterId: string` | `Promise<Network>` | 获取关系网络 |
| `getEvolutionHistory(projectId, characterId)` | `projectId: string, characterId: string` | `Promise<History[]>` | 获取演变历史 |

## 🔧 工具函数

### API 响应工具

```typescript
import {
  createSuccessResponse,
  createErrorResponse,
  validateApiResponse,
  extractApiResponseData,
  ApiError
} from '@/services/api';

// 创建成功响应
const response = createSuccessResponse(data, '操作成功');

// 创建错误响应
const error = createErrorResponse('操作失败', 'ERROR_CODE');

// 验证响应
const validated = validateApiResponse(rawResponse);

// 提取数据
const data = extractApiResponseData(validated);
```

### 数据验证

```typescript
import {
  validateCreateProject,
  validateUpdateProject,
  safeValidateCreateProject,
  safeValidateUpdateProject
} from '@/services/api';

// 验证创建数据（抛出错误）
const validated = validateCreateProject(data);

// 安全验证（不抛出错误）
const result = safeValidateCreateProject(data);
if (result.success) {
  console.log(result.data);
} else {
  console.error(result.error);
}
```

### 转换器

```typescript
import { projectTransformer } from '@/services/api';

// DTO → 前端模型
const project = projectTransformer.transform(dto);

// 前端模型 → DTO
const dto = projectTransformer.transformReverse(project);

// 批量转换
const projects = projectTransformer.transformArray(dtos);

// 安全转换（处理 null）
const project = projectTransformer.transformSafe(dto);
```

## ❌ 错误处理

### 基本错误处理

```typescript
import { ApiError } from '@/services/api';

try {
  const project = await projectService.get(id);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API 错误:', error.message);
    console.error('错误代码:', error.code);
    console.error('状态码:', error.statusCode);
  }
}
```

### 创建错误处理装饰器

```typescript
async function handleApiCall<T>(
  fn: () => Promise<T>,
  onError?: (error: ApiError) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) {
      onError?.(error);
      console.error('API 错误:', error.message);
    }
    return null;
  }
}

// 使用
const project = await handleApiCall(
  () => projectService.get(id),
  (error) => console.error('处理错误:', error.code)
);
```

## 🔄 迁移对照表

### 项目 API

| 旧 API (projectApi) | 新 API (projectService) |
|---------------------|-------------------------|
| `list()` | `list()` |
| `get(id)` | `get(id)` |
| `create()` | `create(data)` |
| `syncFull(project)` | `syncFull(project)` |
| `patch(id, delta)` | `update(id, data)` |
| `delete(id)` | `delete(id)` |
| `getStatistics(projectId)` | `getStatistics(projectId)` |
| `getChapter(projectId, chapterId)` | `getChapter(projectId, chapterId)` |

### 图谱 API

| 旧 API (graphApi) | 新 API (graphService) |
|-------------------|----------------------|
| `get(projectId, types)` | `getGraph(projectId)` |
| `getNeighbors(projectId, nodeId)` | `getNodeNeighbors(projectId, nodeId)` |
| `getSubgraph(projectId, anchors)` | `getSubgraph(projectId, params)` |

### Echo API

| 旧 API (echoApi) | 新 API (echoService) |
|------------------|---------------------|
| `batchAccept(projectId, echoIds)` | `batchOperation(projectId, 'ACCEPT', echoIds)` |
| `batchReject(projectId, echoIds)` | `batchOperation(projectId, 'REJECT', echoIds)` |

## 📝 常见模式

### 获取并处理数据

```typescript
try {
  const projects = await projectService.list();
  projects.forEach(project => {
    console.log(project.title, project.genre);
  });
} catch (error) {
  console.error('获取项目列表失败');
}
```

### 创建并使用新对象

```typescript
try {
  const project = await projectService.create({
    title: '新项目',
    genre: '玄幻'
  });
  console.log('创建成功:', project.id);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('创建失败:', error.message);
  }
}
```

### 批量操作

```typescript
try {
  const result = await echoService.batchOperation(
    projectId,
    'ACCEPT',
    echoIds
  );
  console.log('操作成功:', result.affectedCount);
} catch (error) {
  console.error('批量操作失败');
}
```

## 🎯 最佳实践

### 1. 使用服务层单例

```typescript
// ✅ 推荐
import { projectService } from '@/services/api';

// ❌ 避免
import { ProjectService } from '@/services/api';
const service = new ProjectService();
```

### 2. 利用类型推断

```typescript
// ✅ 推荐：让 TypeScript 自动推断
const project = await projectService.get(id);

// ❌ 避免：不必要的类型标注
const project: ProjectState = await projectService.get(id);
```

### 3. 统一错误处理

```typescript
// ✅ 推荐：创建统一的错误处理函数
async function safeApiCall<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('API 错误:', error.message);
    }
    return null;
  }
}
```

### 4. 使用数据验证

```typescript
// ✅ 推荐：验证用户输入
const result = safeValidateCreateProject(userData);
if (!result.success) {
  console.error('验证失败:', result.error);
  return;
}
```

## 🔗 相关文档

- [完整文档](./README.md)
- [迁移指南](./MIGRATION.md)
- [实现总结](./IMPLEMENTATION_SUMMARY.md)
- [使用示例](./examples/usage.ts)

---

**版本**: 1.0.0
**最后更新**: 2025-11-13
