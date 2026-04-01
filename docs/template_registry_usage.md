# TemplateRegistry 持久化功能使用指南

## 概述

`TemplateRegistry` 现已支持三级模板覆盖持久化,允许项目级别的模板自定义配置。本文档介绍如何使用新功能。

## 核心功能

### 1. 异步模板加载

#### `loadProjectOverrides(projectId: string): Promise<void>`

加载项目级模板覆盖配置。此方法会从数据库的 `project.customPrompts` 字段读取配置并缓存到内存中。

**参数:**
- `projectId`: 项目ID

**示例:**
```typescript
import { loadProjectOverrides } from './services/templateRegistry';

// 在服务启动时预加载项目配置
await loadProjectOverrides('project-123');
```

### 2. 获取合并后的模板

#### `getMergedTemplate(templateId: string, options?: TemplateLoadOptions): Promise<MergedTemplateResult | null>`

获取合并后的模板,支持三级覆盖: 用户级 > 项目级 > 默认级。

**参数:**
- `templateId`: 模板ID (如 `scene_generation`)
- `options`: 加载选项
  - `projectId`: 项目ID (可选)
  - `userId`: 用户ID (可选, 未来扩展)
  - `skipCache`: 是否跳过缓存 (默认 false)

**返回值:**
```typescript
interface MergedTemplateResult {
  template: PromptTemplateDefinition;  // 合并后的模板
  appliedOverride?: TemplateOverride;   // 应用的覆盖配置
  sources: TemplateFieldSources;       // 字段来源映射
  warnings: string[];                  // 合并警告
}
```

**示例:**
```typescript
import { getMergedTemplate } from './services/templateRegistry';

// 获取合并后的模板
const result = await getMergedTemplate('scene_generation', {
  projectId: 'project-123'
});

if (result) {
  console.log('合并后的模板:', result.template);
  console.log('字段来源:', result.sources);
  console.log('警告:', result.warnings);
}
```

### 3. 缓存管理

#### `invalidateCache(templateId: string, projectId?: string): void`

清除模板缓存。

**参数:**
- `templateId`: 模板ID
- `projectId`: 项目ID (可选, 如果不提供则清除该模板的所有缓存)

**示例:**
```typescript
import { invalidateCache } from './services/templateRegistry';

// 清除特定项目的模板缓存
invalidateCache('scene_generation', 'project-123');

// 清除所有项目的该模板缓存
invalidateCache('scene_generation');
```

#### `invalidateProjectCache(projectId: string): void`

清除项目的所有模板缓存。

**示例:**
```typescript
import { invalidateProjectCache } from './services/templateRegistry';

// 清除项目的所有模板缓存
invalidateProjectCache('project-123');
```

#### `clearAllTemplateCache(): void`

清除所有模板缓存。

**示例:**
```typescript
import { clearAllTemplateCache } from './services/templateRegistry';

// 清除所有缓存
clearAllTemplateCache();
```

### 4. 向后兼容方法

#### `getTemplate(id: string): PromptTemplateDefinition | null`

同步方法,返回默认模板或内存中的覆盖模板(不访问数据库)。

**示例:**
```typescript
import { getTemplate } from './services/templateRegistry';

// 获取模板(同步,不访问数据库)
const template = getTemplate('scene_generation');
```

#### `getTemplateAsync(id: string, options?: TemplateLoadOptions): Promise<PromptTemplateDefinition | null>`

异步方法,支持数据库持久化。

**示例:**
```typescript
import { templateRegistry } from './services/templateRegistry';

// 获取模板(异步,支持持久化)
const template = await templateRegistry.getTemplateAsync('scene_generation', {
  projectId: 'project-123'
});
```

## 缓存策略

### L1 内存缓存
- **TTL**: 5分钟 (300,000ms)
- **缓存键**: `${templateId}:${projectId || 'default'}`
- **缓存内容**: `MergedTemplateResult` 对象

### 缓存失效策略
1. **模板更新时**: 自动清除相关缓存
2. **项目删除时**: 清除项目的所有缓存
3. **手动刷新**: 使用 `invalidateCache` 或 `skipCache: true`

## 使用场景

### 场景 1: API 路由中使用

```typescript
// server/src/routes/generate.ts
import { getMergedTemplate } from '../../../services/templateRegistry';

router.post('/api/generate/scene', async (req, res) => {
  const { projectId } = req.body;

  // 获取合并后的模板
  const result = await getMergedTemplate('scene_generation', { projectId });

  if (!result) {
    return res.status(404).json({ error: 'Template not found' });
  }

  // 使用合并后的模板
  const { template, sources } = result;

  // 渲染提示词
  const prompt = renderPrompt(template, req.body.variables);

  res.json({ prompt, sources });
});
```

### 场景 2: 更新模板覆盖后清除缓存

```typescript
// server/src/routes/templateOverrides.ts
import { invalidateCache } from '../../../services/templateRegistry';
import { prisma } from '../../db';

router.put('/api/projects/:projectId/templates/:templateId', async (req, res) => {
  const { projectId, templateId } = req.params;
  const override = req.body;

  // 更新数据库
  await prisma.project.update({
    where: { id: projectId },
    data: {
      customPrompts: JSON.stringify({
        version: '1.0.0',
        lastModified: new Date().toISOString(),
        templates: {
          [templateId]: override
        }
      })
    }
  });

  // 清除缓存
  invalidateCache(templateId, projectId);

  res.json({ success: true });
});
```

### 场景 3: 服务启动时预热缓存
```typescript
// server/src/index.ts
import { loadProjectOverrides } from './services/templateRegistry';
import { prisma } from './db';

async function warmupCache() {
  // 获取活跃项目列表
  const activeProjects = await prisma.project.findMany({
    where: { updatedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 } } },
    select: { id: true }
  });

  // 预加载配置
  await Promise.all(
    activeProjects.map(p => loadProjectOverrides(p.id))
  );

  console.log(`预热缓存完成: ${activeProjects.length} 个项目`);
}

```

## 性能考虑

### 缓存命中率
- **目标**: > 90% (预热后)
- **监控**: 使用 `getCacheStats()` 方法

### 延迟
- **缓存命中**: < 1ms
- **缓存未命中**: < 50ms (数据库查询 + 合并)
- **模板合并**: < 10ms

## 迁移指南

### 从旧 API 迁移

```typescript
// 旧代码 (同步)
import { getTemplate } from './config/templates/defaults';
const template = getTemplate('scene_generation');

// 新代码 (异步)
import { getMergedTemplate } from './services/templateRegistry';
const result = await getMergedTemplate('scene_generation', { projectId });
const template = result?.template;
```

### 保持向后兼容
如果不需要持久化功能,可以继续使用同步方法:
```typescript
import { getTemplate } from './services/templateRegistry';
const template = getTemplate('scene_generation');
```

## 故障排除

### 缓存不一致
**症状**: 模板更新后仍然使用旧值

**解决**: 手动清除缓存
```typescript
invalidateCache(templateId, projectId);
```

### 数据库加载失败
**症状**: 控制台显示 "Failed to load project overrides"

**解决**: 检查数据库连接和 `customPrompts` 字段格式

## 最佳实践

1. **预热缓存**: 服务启动时预加载活跃项目的配置
2. **及时清除**: 模板更新后立即清除缓存
3. **监控统计**: 定期检查缓存命中率
4. **错误处理**: 始终处理 `null` 返回值
5. **日志记录**: 记录关键操作和警告

## 相关文档
- [模板 Schema 设计](./template_schema_design.md)
- [TemplateRegistry 升级方案](./template_registry_upgrade.md)
- [模板合并逻辑](./templateMerge.ts)
