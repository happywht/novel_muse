# API 层迁移指南

## 🎯 迁移目标

从旧的 API 层迁移到新的服务层，获得更好的类型安全、数据验证和错误处理。

## 📊 迁移对比

### 旧方式（API 层）

```typescript
import { projectApi, projectTransformer } from '@/services/api';

// ❌ 需要手动处理 DTO 转换
const dto = await projectApi.get(id);
const project = projectTransformer.transform(dto);

// ❌ 没有数据验证
const response = await projectApi.create();
const newProject = await projectApi.get(response.id);

// ❌ 错误处理不统一
try {
  const data = await apiClient.get(url);
} catch (error) {
  // 需要手动处理各种错误类型
}
```

### 新方式（服务层）⭐

```typescript
import { projectService } from '@/services/api';

// ✅ 自动处理转换
const project = await projectService.get(id);

// ✅ 自动数据验证
const newProject = await projectService.create({
  title: '新项目',
  genre: '玄幻'
});

// ✅ 统一的错误处理
try {
  const project = await projectService.get(id);
} catch (error) {
  if (error instanceof ApiError) {
    // 标准化的错误对象
  }
}
```

## 🔄 常见迁移场景

### 1. 获取项目列表

**旧代码：**
```typescript
import { projectApi } from '@/services/api';

const summaries = await projectApi.list();
// 需要手动处理摘要信息
```

**新代码：**
```typescript
import { projectService } from '@/services/api';

const projects = await projectService.list();
// 直接返回前端模型
```

### 2. 创建项目

**旧代码：**
```typescript
import { projectApi } from '@/services/api';

const response = await projectApi.create();
const project = await projectApi.get(response.id);
// 需要两次请求
```

**新代码：**
```typescript
import { projectService } from '@/services/api';

const project = await projectService.create({
  title: '新项目',
  genre: '玄幻'
});
// 一次请求完成，自动验证
```

### 3. 更新项目

**旧代码：**
```typescript
import { projectApi } from '@/services/api';

await projectApi.patch(id, {
  title: '新标题'
});
// 没有验证
```

**新代码：**
```typescript
import { projectService } from '@/services/api';

await projectService.update(id, {
  title: '新标题'
});
// 自动验证数据格式
```

### 4. 图谱操作

**旧代码：**
```typescript
import { graphApi } from '@/services/api';

const graph = await graphApi.get(projectId);
// 返回原始 DTO
```

**新代码：**
```typescript
import { graphService } from '@/services/api';

const graph = await graphService.getGraph(projectId);
// 统一的接口命名
```

### 5. 错误处理

**旧代码：**
```typescript
import { projectApi } from '@/services/api';

try {
  const project = await projectApi.get(id);
} catch (error) {
  // 需要手动判断错误类型
  if (error instanceof Error) {
    console.error(error.message);
  }
}
```

**新代码：**
```typescript
import { projectService, ApiError } from '@/services/api';

try {
  const project = await projectService.get(id);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API 错误:', error.message, error.code);
    // 可以访问错误代码和状态码
  }
}
```

## 📋 迁移清单

### 步骤 1: 更新导入

```typescript
// 旧导入
import { projectApi, graphApi, echoApi } from '@/services/api';

// 新导入
import { projectService, graphService, echoService } from '@/services/api';
```

### 步骤 2: 更新方法调用

```typescript
// 项目 API
projectApi.get(id) → projectService.get(id)
projectApi.list() → projectService.list()
projectApi.create() → projectService.create(data)
projectApi.patch(id, data) → projectService.update(id, data)
projectApi.delete(id) → projectService.delete(id)

// 图谱 API
graphApi.get(projectId) → graphService.getGraph(projectId)
graphApi.getNeighbors(projectId, nodeId) → graphService.getNodeNeighbors(projectId, nodeId)

// Echo API
echoApi.batchAccept(projectId, echoIds) → echoService.batchOperation(projectId, 'ACCEPT', echoIds)
echoApi.batchReject(projectId, echoIds) → echoService.batchOperation(projectId, 'REJECT', echoIds)
```

### 步骤 3: 更新错误处理

```typescript
// 添加 ApiError 导入
import { ApiError } from '@/services/api';

// 使用 instanceof 检查
if (error instanceof ApiError) {
  // 处理 API 错误
}
```

### 步骤 4: 移除手动转换

```typescript
// 删除这样的代码
import { projectTransformer } from '@/services/api';
const dto = await projectApi.get(id);
const project = projectTransformer.transform(dto);

// 替换为
const project = await projectService.get(id);
```

## 🎓 最佳实践

### 1. 使用服务层单例

```typescript
// ✅ 推荐：直接导入服务单例
import { projectService } from '@/services/api';

// ❌ 避免：创建新的服务实例
import { ProjectService } from '@/services/api';
const service = new ProjectService();
```

### 2. 利用类型推断

```typescript
// ✅ 让 TypeScript 自动推断类型
const project = await projectService.get(id);
// project 的类型自动推断为 ProjectState

// ❌ 避免手动指定类型
const project: ProjectState = await projectService.get(id);
```

### 3. 统一错误处理

```typescript
// ✅ 创建统一的错误处理函数
async function handleApiCall<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('API 错误:', error.message);
      // 显示用户友好的错误信息
    }
    return null;
  }
}

// 使用
const project = await handleApiCall(() => projectService.get(id));
```

### 4. 使用数据验证

```typescript
import { safeValidateCreateProject } from '@/services/api';

// ✅ 安全验证（不抛出错误）
const result = safeValidateCreateProject(userData);
if (!result.success) {
  console.error('验证失败:', result.error);
  return;
}
// 使用验证后的数据
```

## ⚠️ 注意事项

### 1. 向后兼容

旧的 API 层仍然可用，但推荐新代码使用服务层：

```typescript
// 旧代码仍然可以工作
import { projectApi } from '@/services/api';
const data = await projectApi.get(id);
```

### 2. 性能考虑

服务层增加了验证和转换步骤，但性能影响可忽略不计：

- **验证开销**: 通常 < 1ms
- **转换开销**: 通常 < 1ms
- **网络延迟**: 通常 > 100ms

相比之下，网络延迟是主要瓶颈。

### 3. 错误处理

所有服务方法都可能抛出 `ApiError`，需要适当处理：

```typescript
try {
  const project = await projectService.get(id);
  // 使用 project
} catch (error) {
  // 总是处理错误
}
```

## 🚀 迁移计划

### 阶段 1: 新功能使用服务层

- 所有新开发的代码使用服务层
- 旧代码保持不变

### 阶段 2: 逐步迁移现有代码

- 按模块逐步迁移
- 每次迁移一个功能模块
- 确保测试通过

### 阶段 3: 完全迁移

- 所有代码使用服务层
- 考虑废弃旧的 API 层

## 📞 获取帮助

如果在迁移过程中遇到问题：

1. 查看 `/services/api/examples/usage.ts` 中的使用示例
2. 参考 `/services/api/README.md` 中的详细文档
3. 运行测试确保功能正常

---

**记住**: 迁移是渐进式的，不需要一次性完成所有更改。
