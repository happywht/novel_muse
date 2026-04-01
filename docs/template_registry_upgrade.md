# TemplateRegistry 持久化升级方案

## 1. 现有实现分析

### 1.1 架构概览

当前模板系统采用静态定义方式，核心文件结构如下：

```
config/templates/
├── index.ts          # 统一导出入口
├── defaults.ts       # 默认模板定义 + TemplateRegistry
├── character.ts      # 角色相关模板
├── world.ts          # 世界观相关模板
├── plot.ts           # 情节相关模板
├── writing.ts        # 写作相关模板
├── audit.ts          # 审计相关模板
└── categoryRules.ts  # 分类规则
```

### 1.2 核心类型定义

```typescript
// types/promptTemplate.ts

// 模板变量
interface TemplateVariable {
  name: string;                    // 变量标识符
  type: 'string' | 'string[]' | 'number' | 'boolean' | 'object';
  tier: VariableTier;              // critical | important | optional
  source: VariableSource;          // user_input | project_state | computed | derived | optional
  required: boolean;
  description: string;
  display?: string;
  defaultValue?: unknown;
}

// Prompt区块
interface PromptBlock {
  id: string;
  title: string;
  template: string;                // 含 {{variable}} 占位符
  condition?: string;              // 条件表达式
  order: number;
  metadata?: BlockMetadata;
}

// 完整模板定义
interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'generation' | 'analysis' | 'refinement' | 'utility';
  systemInstruction: string;
  userPromptBlocks: PromptBlock[];
  variables: TemplateVariable[];
  metadata?: {
    version?: string;
    author?: string;
    lastUpdated?: string;
    tags?: string[];
  };
}
```

### 1.3 现有核心函数

```typescript
// config/templates/defaults.ts

// 模板注册表（静态）
export const DEFAULT_TEMPLATES: Record<string, PromptTemplate> = {
  scene_generation: SCENE_GENERATION_TEMPLATE,
  batch_generate_characters: BATCH_GENERATE_CHARACTERS_TEMPLATE,
  // ... 约30个模板
};

// 获取模板
export function getTemplate(templateId: string): PromptTemplate | undefined {
  return DEFAULT_TEMPLATES[templateId];
}

// 渲染用户提示
export function renderUserPromptBlocks(
  templateId: string,
  variables: Record<string, any>
): string;

// 验证变量
export function validateTemplateVariables(
  templateId: string,
  providedVariables: Record<string, unknown>
): { valid: boolean; missing: string[] };
```

### 1.4 渲染流程

```
用户请求 -> getTemplate(templateId)
         -> validateTemplateVariables(templateId, variables)
         -> renderUserPromptBlocks(templateId, variables)
         -> 组装 systemInstruction + userPrompt
         -> 发送给AI服务
```

**渲染特性：**
- 支持 `{{variable}}` 简单变量替换
- 支持 `{{#each array}}...{{/each}}` 循环
- 支持 `{{#if condition}}...{{/if}}` 条件渲染
- 支持 `{{this.property}}` 循环内对象属性
- 支持 `{{@index}}` 循环索引

---

## 2. 持久化方案设计

### 2.1 三级合并策略

```
优先级: 用户级覆盖 > 项目级覆盖 > 默认模板
        (最高)                          (最低)
```

**合并维度：**

| 维度 | 用户级覆盖 | 项目级覆盖 | 默认模板 |
|------|-----------|-----------|---------|
| systemInstruction | 完全替换 | 完全替换 | 基础定义 |
| userPromptBlocks | 按ID合并/覆盖 | 按ID合并/覆盖 | 完整定义 |
| variables | 追加/覆盖 | 追加/覆盖 | 完整定义 |
| metadata | 合并 | 合并 | 基础定义 |

### 2.2 数据库模型设计

#### 2.2.1 新增 Prisma Schema

```prisma
// server/prisma/schema.prisma

model TemplateOverride {
  id            String   @id @default(cuid())
  templateId    String                       // 关联的模板ID，如 "scene_generation"
  level         String                       // "user" | "project"
  projectId     String?                      // 项目级覆盖时必填
  userId        String?                      // 用户级覆盖时必填（未来扩展）

  // 覆盖内容（JSON存储）
  systemInstruction String?                  // 覆盖的系统指令
  userPromptBlocks  String?  @db.LongText    // JSON: PromptBlock[] 增量
  variables         String?  @db.LongText    // JSON: TemplateVariable[] 增量
  metadata          String?  @db.Text        // JSON: 覆盖的元数据

  // 管理字段
  isActive      Boolean  @default(true)
  version       Int      @default(1)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // 索引
  @@unique([templateId, level, projectId, userId])  // 确保唯一性
  @@index([templateId])
  @@index([projectId])
  @@index([userId])
}

// 项目表中增加模板配置字段（可选）
model Project {
  // ... 现有字段
  templateOverridesEnabled Boolean @default(false)  // 是否启用模板覆盖
}
```

#### 2.2.2 JSON 存储结构

**userPromptBlocks 增量格式：**
```typescript
interface PromptBlockOverride {
  id: string;                       // 要覆盖的block ID
  action: 'replace' | 'append' | 'prepend' | 'delete';
  template?: string;                // 新模板内容
  condition?: string;               // 新条件
  order?: number;                   // 新顺序
  insertAfter?: string;             // 在指定block后插入
  insertBefore?: string;            // 在指定block前插入
}

// 示例：在 genre_info 后添加自定义block
[
  {
    "id": "custom_style_guide",
    "action": "append",
    "insertAfter": "genre_info",
    "template": "[Style Guide]\n{{customStyle}}",
    "order": 1.5
  },
  {
    "id": "logic_anchors",
    "action": "replace",
    "template": "[Logic Anchors]\n{{customLogic}}"
  }
]
```

**variables 增量格式：**
```typescript
interface VariableOverride {
  name: string;
  action: 'add' | 'modify' | 'remove';
  type?: VariableType;
  tier?: VariableTier;
  source?: VariableSource;
  required?: boolean;
  description?: string;
  defaultValue?: unknown;
}

// 示例
[
  {
    "name": "customStyle",
    "action": "add",
    "type": "string",
    "tier": "optional",
    "source": "user_input",
    "required": false,
    "description": "自定义风格指南"
  }
]
```

### 2.3 核心函数签名设计

```typescript
// config/templates/registry.ts

import { PromptTemplate, PromptBlock, TemplateVariable } from '../../types/promptTemplate';
import { prisma } from '../../server/db';

// ============================================================
// 类型定义
// ============================================================

interface TemplateLoadOptions {
  projectId?: string;
  userId?: string;
  skipCache?: boolean;
}

interface MergedTemplate {
  template: PromptTemplate;
  sources: {
    systemInstruction: 'default' | 'project' | 'user';
    userPromptBlocks: Record<string, 'default' | 'project' | 'user'>;
    variables: Record<string, 'default' | 'project' | 'user'>;
  };
}

interface CacheEntry {
  template: MergedTemplate;
  timestamp: number;
  ttl: number;
}

// ============================================================
// 缓存管理
// ============================================================

const templateCache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 5 * 60 * 1000; // 5分钟

function getCacheKey(templateId: string, options: TemplateLoadOptions): string {
  return `${templateId}:${options.projectId || 'none'}:${options.userId || 'none'}`;
}

function invalidateCache(templateId: string, options?: TemplateLoadOptions): void {
  if (options) {
    const key = getCacheKey(templateId, options);
    templateCache.delete(key);
  } else {
    // 清除该模板ID相关的所有缓存
    for (const key of templateCache.keys()) {
      if (key.startsWith(templateId)) {
        templateCache.delete(key);
      }
    }
  }
}

// ============================================================
// 核心加载函数
// ============================================================

/**
 * 加载项目级模板覆盖
 * @param projectId 项目ID
 * @returns 模板覆盖映射
 */
export async function loadProjectOverrides(
  projectId: string
): Promise<Map<string, Partial<PromptTemplate>>> {
  const overrides = await prisma.templateOverride.findMany({
    where: {
      projectId,
      level: 'project',
      isActive: true,
    },
  });

  const result = new Map<string, Partial<PromptTemplate>>();

  for (const override of overrides) {
    const partial: Partial<PromptTemplate> = {};

    if (override.systemInstruction) {
      partial.systemInstruction = override.systemInstruction;
    }

    if (override.userPromptBlocks) {
      partial.userPromptBlocks = JSON.parse(override.userPromptBlocks);
    }

    if (override.variables) {
      partial.variables = JSON.parse(override.variables);
    }

    result.set(override.templateId, partial);
  }

  return result;
}

/**
 * 加载用户级模板覆盖（预留扩展）
 * @param userId 用户ID
 * @returns 模板覆盖映射
 */
export async function loadUserOverrides(
  userId: string
): Promise<Map<string, Partial<PromptTemplate>>> {
  // TODO: 实现用户级覆盖
  return new Map();
}

/**
 * 获取合并后的模板
 * @param templateId 模板ID
 * @param options 加载选项
 * @returns 合并后的模板及来源信息
 */
export async function getMergedTemplate(
  templateId: string,
  options: TemplateLoadOptions = {}
): Promise<MergedTemplate | null> {
  const cacheKey = getCacheKey(templateId, options);

  // 检查缓存
  if (!options.skipCache) {
    const cached = templateCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.template;
    }
  }

  // 1. 获取默认模板
  const defaultTemplate = DEFAULT_TEMPLATES[templateId];
  if (!defaultTemplate) {
    return null;
  }

  // 2. 加载覆盖
  const projectOverrides = options.projectId
    ? await loadProjectOverrides(options.projectId)
    : new Map();

  const userOverrides = options.userId
    ? await loadUserOverrides(options.userId)
    : new Map();

  // 3. 执行合并
  const merged = mergeTemplates(
    defaultTemplate,
    projectOverrides.get(templateId),
    userOverrides.get(templateId)
  );

  // 4. 更新缓存
  templateCache.set(cacheKey, {
    template: merged,
    timestamp: Date.now(),
    ttl: DEFAULT_TTL,
  });

  return merged;
}

// ============================================================
// 合并逻辑
// ============================================================

function mergeTemplates(
  base: PromptTemplate,
  projectOverride?: Partial<PromptTemplate>,
  userOverride?: Partial<PromptTemplate>
): MergedTemplate {
  const sources = {
    systemInstruction: 'default' as 'default' | 'project' | 'user',
    userPromptBlocks: {} as Record<string, 'default' | 'project' | 'user'>,
    variables: {} as Record<string, 'default' | 'project' | 'user'>,
  };

  // 合并 systemInstruction
  let systemInstruction = base.systemInstruction;
  if (projectOverride?.systemInstruction) {
    systemInstruction = projectOverride.systemInstruction;
    sources.systemInstruction = 'project';
  }
  if (userOverride?.systemInstruction) {
    systemInstruction = userOverride.systemInstruction;
    sources.systemInstruction = 'user';
  }

  // 合并 userPromptBlocks
  const blockMap = new Map<string, PromptBlock>();
  for (const block of base.userPromptBlocks) {
    blockMap.set(block.id, { ...block });
    sources.userPromptBlocks[block.id] = 'default';
  }

  // 应用项目级block覆盖
  if (projectOverride?.userPromptBlocks) {
    applyBlockOverrides(blockMap, projectOverride.userPromptBlocks, sources.userPromptBlocks, 'project');
  }

  // 应用用户级block覆盖
  if (userOverride?.userPromptBlocks) {
    applyBlockOverrides(blockMap, userOverride.userPromptBlocks, sources.userPromptBlocks, 'user');
  }

  // 合并 variables
  const variableMap = new Map<string, TemplateVariable>();
  for (const variable of base.variables) {
    variableMap.set(variable.name, { ...variable });
    sources.variables[variable.name] = 'default';
  }

  // 应用项目级变量覆盖
  if (projectOverride?.variables) {
    applyVariableOverrides(variableMap, projectOverride.variables, sources.variables, 'project');
  }

  // 应用用户级变量覆盖
  if (userOverride?.variables) {
    applyVariableOverrides(variableMap, userOverride.variables, sources.variables, 'user');
  }

  // 构建最终模板
  const mergedTemplate: PromptTemplate = {
    id: base.id,
    name: base.name,
    description: base.description,
    category: base.category,
    systemInstruction,
    userPromptBlocks: Array.from(blockMap.values()).sort((a, b) => a.order - b.order),
    variables: Array.from(variableMap.values()),
    metadata: {
      ...base.metadata,
      merged: true,
      mergeSources: {
        project: !!projectOverride,
        user: !!userOverride,
      },
    },
  };

  return { template: mergedTemplate, sources };
}

function applyBlockOverrides(
  blockMap: Map<string, PromptBlock>,
  overrides: (PromptBlockOverride | PromptBlock)[],
  sources: Record<string, 'default' | 'project' | 'user'>,
  level: 'project' | 'user'
): void {
  for (const override of overrides) {
    // 兼容两种格式：PromptBlockOverride 或直接的 PromptBlock
    if ('action' in override) {
      const blockOverride = override as PromptBlockOverride;

      switch (blockOverride.action) {
        case 'replace':
          if (blockMap.has(blockOverride.id)) {
            const existing = blockMap.get(blockOverride.id)!;
            blockMap.set(blockOverride.id, {
              ...existing,
              template: blockOverride.template ?? existing.template,
              condition: blockOverride.condition ?? existing.condition,
              order: blockOverride.order ?? existing.order,
            });
            sources[blockOverride.id] = level;
          }
          break;

        case 'delete':
          blockMap.delete(blockOverride.id);
          delete sources[blockOverride.id];
          break;

        case 'append':
        case 'prepend':
          const newBlock: PromptBlock = {
            id: blockOverride.id,
            title: blockOverride.id,
            template: blockOverride.template || '',
            order: blockOverride.order ?? 0,
            condition: blockOverride.condition,
          };

          if (blockOverride.insertAfter && blockMap.has(blockOverride.insertAfter)) {
            const refBlock = blockMap.get(blockOverride.insertAfter)!;
            newBlock.order = refBlock.order + 0.1;
          } else if (blockOverride.insertBefore && blockMap.has(blockOverride.insertBefore)) {
            const refBlock = blockMap.get(blockOverride.insertBefore)!;
            newBlock.order = refBlock.order - 0.1;
          }

          blockMap.set(newBlock.id, newBlock);
          sources[newBlock.id] = level;
          break;
      }
    } else {
      // 直接的 PromptBlock 对象，完全替换
      const block = override as PromptBlock;
      blockMap.set(block.id, block);
      sources[block.id] = level;
    }
  }
}

function applyVariableOverrides(
  variableMap: Map<string, TemplateVariable>,
  overrides: (VariableOverride | TemplateVariable)[],
  sources: Record<string, 'default' | 'project' | 'user'>,
  level: 'project' | 'user'
): void {
  for (const override of overrides) {
    if ('action' in override) {
      const varOverride = override as VariableOverride;

      switch (varOverride.action) {
        case 'add':
        case 'modify':
          const existing = variableMap.get(varOverride.name);
          const newVar: TemplateVariable = {
            name: varOverride.name,
            type: varOverride.type ?? existing?.type ?? 'string',
            tier: varOverride.tier ?? existing?.tier ?? 'optional',
            source: varOverride.source ?? existing?.source ?? 'optional',
            required: varOverride.required ?? existing?.required ?? false,
            description: varOverride.description ?? existing?.description ?? '',
            defaultValue: varOverride.defaultValue ?? existing?.defaultValue,
          };
          variableMap.set(varOverride.name, newVar);
          sources[varOverride.name] = level;
          break;

        case 'remove':
          variableMap.delete(varOverride.name);
          delete sources[varOverride.name];
          break;
      }
    } else {
      // 直接的 TemplateVariable 对象
      const variable = override as TemplateVariable;
      variableMap.set(variable.name, variable);
      sources[variable.name] = level;
    }
  }
}

// ============================================================
// 便捷函数（向后兼容）
// ============================================================

/**
 * 获取模板（向后兼容版本）
 * 优先使用合并后的模板，无覆盖时返回默认模板
 */
export async function getTemplateAsync(
  templateId: string,
  options?: TemplateLoadOptions
): Promise<PromptTemplate | undefined> {
  const merged = await getMergedTemplate(templateId, options);
  return merged?.template;
}

/**
 * 渲染用户提示（支持覆盖）
 */
export async function renderUserPromptBlocksAsync(
  templateId: string,
  variables: Record<string, unknown>,
  options?: TemplateLoadOptions
): Promise<string> {
  const merged = await getMergedTemplate(templateId, options);
  if (!merged) {
    throw new Error(`Template not found: ${templateId}`);
  }

  return renderBlocks(merged.template.userPromptBlocks, variables);
}

// 内部渲染函数
function renderBlocks(blocks: PromptBlock[], variables: Record<string, unknown>): string {
  // 复用现有的渲染逻辑
  // 这里简化实现，实际应调用 defaults.ts 中的逻辑
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);
  const renderedBlocks: string[] = [];

  for (const block of sortedBlocks) {
    // 检查条件
    if (block.condition) {
      const shouldRender = evaluateCondition(block.condition, variables);
      if (!shouldRender) continue;
    }

    let renderedBlock = block.template;
    // ... 渲染逻辑（复用现有实现）

    if (renderedBlock.trim()) {
      renderedBlocks.push(renderedBlock);
    }
  }

  return renderedBlocks.join('\n\n');
}
```

### 2.4 API 路由设计

```typescript
// server/routes/templateOverrides.ts

import { Router } from 'express';
import { prisma } from '../db';
import { invalidateCache } from '../../config/templates/registry';

const router = Router();

// 获取项目的所有模板覆盖
router.get('/projects/:projectId/template-overrides', async (req, res) => {
  const { projectId } = req.params;

  const overrides = await prisma.templateOverride.findMany({
    where: { projectId, isActive: true },
    orderBy: { updatedAt: 'desc' },
  });

  res.json(overrides);
});

// 获取特定模板的覆盖
router.get('/projects/:projectId/template-overrides/:templateId', async (req, res) => {
  const { projectId, templateId } = req.params;

  const override = await prisma.templateOverride.findUnique({
    where: {
      templateId_level_projectId_userId: {
        templateId,
        level: 'project',
        projectId,
        userId: null,
      },
    },
  });

  res.json(override);
});

// 创建或更新模板覆盖
router.put('/projects/:projectId/template-overrides/:templateId', async (req, res) => {
  const { projectId, templateId } = req.params;
  const { systemInstruction, userPromptBlocks, variables, metadata } = req.body;

  const override = await prisma.templateOverride.upsert({
    where: {
      templateId_level_projectId_userId: {
        templateId,
        level: 'project',
        projectId,
        userId: null,
      },
    },
    update: {
      systemInstruction,
      userPromptBlocks: userPromptBlocks ? JSON.stringify(userPromptBlocks) : null,
      variables: variables ? JSON.stringify(variables) : null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      version: { increment: 1 },
    },
    create: {
      templateId,
      level: 'project',
      projectId,
      systemInstruction,
      userPromptBlocks: userPromptBlocks ? JSON.stringify(userPromptBlocks) : null,
      variables: variables ? JSON.stringify(variables) : null,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });

  // 使缓存失效
  invalidateCache(templateId, { projectId });

  res.json(override);
});

// 删除模板覆盖
router.delete('/projects/:projectId/template-overrides/:templateId', async (req, res) => {
  const { projectId, templateId } = req.params;

  await prisma.templateOverride.delete({
    where: {
      templateId_level_projectId_userId: {
        templateId,
        level: 'project',
        projectId,
        userId: null,
      },
    },
  });

  // 使缓存失效
  invalidateCache(templateId, { projectId });

  res.status(204).send();
});

export default router;
```

---

## 3. 缓存策略

### 3.1 多级缓存架构

```
┌─────────────────────────────────────────────────────────┐
│                    客户端请求                            │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  L1: 内存缓存 (Map)                                      │
│  - TTL: 5分钟                                            │
│  - 按模板ID+项目ID+用户ID索引                             │
│  - 命中后直接返回                                        │
└─────────────────────────────────────────────────────────┘
                           │ Miss
                           ▼
┌─────────────────────────────────────────────────────────┐
│  L2: 数据库查询                                          │
│  - 查询 TemplateOverride 表                              │
│  - 合并默认模板                                          │
│  - 写入L1缓存                                           │
└─────────────────────────────────────────────────────────┘
```

### 3.2 缓存失效策略

```typescript
// 缓存失效触发条件
interface CacheInvalidationTriggers {
  // 模板覆盖更新时
  onOverrideUpdate: (templateId: string, projectId: string) => void;

  // 模板覆盖删除时
  onOverrideDelete: (templateId: string, projectId: string) => void;

  // 项目删除时（级联）
  onProjectDelete: (projectId: string) => void;

  // 手动刷新
  onManualRefresh: (templateId?: string, options?: TemplateLoadOptions) => void;
}

// 实现
export function invalidateCache(
  templateId: string,
  options?: TemplateLoadOptions
): void {
  if (options?.projectId) {
    // 清除特定项目+模板的缓存
    const pattern = `${templateId}:${options.projectId}`;
    for (const key of templateCache.keys()) {
      if (key.startsWith(pattern)) {
        templateCache.delete(key);
      }
    }
  } else {
    // 清除该模板的所有缓存
    for (const key of templateCache.keys()) {
      if (key.startsWith(`${templateId}:`)) {
        templateCache.delete(key);
      }
    }
  }
}

// 批量失效（项目删除时）
export function invalidateProjectCache(projectId: string): void {
  for (const key of templateCache.keys()) {
    if (key.includes(`:${projectId}:`)) {
      templateCache.delete(key);
    }
  }
}
```

### 3.3 缓存预热

```typescript
// 服务启动时预热常用模板
export async function warmupCache(projectIds: string[]): Promise<void> {
  const commonTemplates = ['scene_generation', 'batch_generate_characters'];

  for (const projectId of projectIds) {
    for (const templateId of commonTemplates) {
      await getMergedTemplate(templateId, { projectId });
    }
  }
}
```

---

## 4. 向后兼容性保证

### 4.1 兼容策略

```typescript
// config/templates/defaults.ts 保持不变
// 新增异步版本函数

// 同步版本（保持向后兼容）
export function getTemplate(templateId: string): PromptTemplate | undefined {
  return DEFAULT_TEMPLATES[templateId];
}

// 异步版本（支持覆盖）
export async function getTemplateAsync(
  templateId: string,
  options?: TemplateLoadOptions
): Promise<PromptTemplate | undefined> {
  const merged = await getMergedTemplate(templateId, options);
  return merged?.template ?? DEFAULT_TEMPLATES[templateId];
}
```

### 4.2 迁移路径

**Phase 1: 基础设施（不影响现有代码）**
1. 添加 `TemplateOverride` 数据库模型
2. 创建 `registry.ts` 新模块
3. 保持 `defaults.ts` 完全不变

**Phase 2: 渐进式迁移**
1. 新功能使用 `getTemplateAsync`
2. 旧功能保持使用 `getTemplate`
3. 添加功能开关控制覆盖功能

**Phase 3: 全面迁移**
1. 所有调用点迁移到异步版本
2. 标记同步版本为 deprecated
3. 完成迁移后移除同步版本

### 4.3 功能开关

```typescript
// config/features.ts
export const FEATURES = {
  TEMPLATE_OVERRIDES: {
    enabled: process.env.ENABLE_TEMPLATE_OVERRIDES === 'true',
    cacheEnabled: true,
    cacheTTL: 5 * 60 * 1000,
  },
};

// 使用
export async function getTemplateAsync(
  templateId: string,
  options?: TemplateLoadOptions
): Promise<PromptTemplate | undefined> {
  if (!FEATURES.TEMPLATE_OVERRIDES.enabled || !options?.projectId) {
    // 功能关闭或无项目上下文时，返回默认模板
    return DEFAULT_TEMPLATES[templateId];
  }

  const merged = await getMergedTemplate(templateId, options);
  return merged?.template ?? DEFAULT_TEMPLATES[templateId];
}
```

---

## 5. 性能考虑

### 5.1 性能指标目标

| 指标 | 目标值 | 说明 |
|------|-------|------|
| 缓存命中延迟 | < 1ms | 内存读取 |
| 缓存未命中延迟 | < 50ms | 数据库查询 + 合并 |
| 模板合并时间 | < 10ms | 单个模板 |
| 内存占用 | < 10MB | 1000个缓存条目 |

### 5.2 优化措施

1. **懒加载**: 只在首次使用时加载覆盖
2. **批量预加载**: 启动时预加载热门模板
3. **增量合并**: 只合并变更部分
4. **压缩存储**: JSON 压缩存储大数据

### 5.3 监控指标

```typescript
interface TemplateMetrics {
  cacheHits: number;
  cacheMisses: number;
  averageLoadTime: number;
  mergeCount: number;
  overrideCount: number;
}

const metrics: TemplateMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  averageLoadTime: 0,
  mergeCount: 0,
  overrideCount: 0,
};

// 使用中间件收集指标
export function metricsMiddleware(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    // 记录指标
  });
  next();
}
```

---

## 6. 安全考虑

### 6.1 输入验证

```typescript
import { z } from 'zod';

const PromptBlockOverrideSchema = z.object({
  id: z.string().max(100),
  action: z.enum(['replace', 'append', 'prepend', 'delete']),
  template: z.string().max(10000).optional(),
  condition: z.string().max(500).optional(),
  order: z.number().optional(),
  insertAfter: z.string().max(100).optional(),
  insertBefore: z.string().max(100).optional(),
});

const VariableOverrideSchema = z.object({
  name: z.string().max(100).regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  action: z.enum(['add', 'modify', 'remove']),
  type: z.enum(['string', 'string[]', 'number', 'boolean', 'object']).optional(),
  tier: z.enum(['critical', 'important', 'optional']).optional(),
  // ...
});

// API中使用
router.put('/projects/:projectId/template-overrides/:templateId', async (req, res) => {
  const validation = PromptBlockOverrideSchema.safeParse(req.body.userPromptBlocks);
  if (!validation.success) {
    return res.status(400).json({ error: validation.error });
  }
  // ...
});
```

### 6.2 权限控制

```typescript
// 只有项目管理员可以修改模板覆盖
router.put('/projects/:projectId/template-overrides/:templateId',
  authenticate,
  requireProjectRole('admin'),
  async (req, res) => {
    // ...
  }
);
```

### 6.3 审计日志

```typescript
// 记录所有模板覆盖变更
interface TemplateOverrideAuditLog {
  userId: string;
  projectId: string;
  templateId: string;
  action: 'create' | 'update' | 'delete';
  previousValue?: unknown;
  newValue?: unknown;
  timestamp: Date;
}

export async function logTemplateOverrideChange(log: TemplateOverrideAuditLog): Promise<void> {
  // 存储到审计日志表
}
```

---

## 7. 测试策略

### 7.1 单元测试

```typescript
describe('TemplateRegistry', () => {
  describe('mergeTemplates', () => {
    it('should return base template when no overrides', () => {
      const base = DEFAULT_TEMPLATES['scene_generation'];
      const result = mergeTemplates(base);
      expect(result.template).toEqual(base);
    });

    it('should apply project override for systemInstruction', () => {
      const base = DEFAULT_TEMPLATES['scene_generation'];
      const projectOverride = {
        systemInstruction: 'Custom system instruction',
      };
      const result = mergeTemplates(base, projectOverride);
      expect(result.template.systemInstruction).toBe('Custom system instruction');
      expect(result.sources.systemInstruction).toBe('project');
    });

    it('should merge userPromptBlocks correctly', () => {
      const base = DEFAULT_TEMPLATES['scene_generation'];
      const projectOverride = {
        userPromptBlocks: [
          { id: 'custom_block', action: 'append', template: 'Custom', order: 100 },
        ],
      };
      const result = mergeTemplates(base, projectOverride);
      expect(result.template.userPromptBlocks).toContainEqual(
        expect.objectContaining({ id: 'custom_block' })
      );
    });
  });

  describe('Cache', () => {
    it('should cache merged templates', async () => {
      const templateId = 'scene_generation';
      const projectId = 'test-project';

      // 第一次调用应该miss
      const result1 = await getMergedTemplate(templateId, { projectId });
      expect(result1).toBeDefined();

      // 第二次调用应该命中缓存
      const result2 = await getMergedTemplate(templateId, { projectId });
      expect(result2).toBe(result1); // 同一引用
    });

    it('should invalidate cache on override update', async () => {
      // ...
    });
  });
});
```

### 7.2 集成测试

```typescript
describe('TemplateOverride API', () => {
  it('should create and retrieve override', async () => {
    const projectId = 'test-project';
    const templateId = 'scene_generation';

    // 创建覆盖
    const createRes = await request(app)
      .put(`/projects/${projectId}/template-overrides/${templateId}`)
      .send({
        systemInstruction: 'Test override',
      });

    expect(createRes.status).toBe(200);

    // 获取覆盖
    const getRes = await request(app)
      .get(`/projects/${projectId}/template-overrides/${templateId}`);

    expect(getRes.body.systemInstruction).toBe('Test override');
  });
});
```

---

## 8. 实施计划

### Phase 1: 基础设施（1-2天）
- [ ] 添加 `TemplateOverride` 数据库模型
- [ ] 运行数据库迁移
- [ ] 创建 `registry.ts` 核心模块

### Phase 2: API层（1天）
- [ ] 实现模板覆盖 REST API
- [ ] 添加权限控制
- [ ] 添加输入验证

### Phase 3: 集成（2-3天）
- [ ] 修改现有服务使用 `getTemplateAsync`
- [ ] 添加功能开关
- [ ] 实现缓存预热

### Phase 4: 测试与文档（1天）
- [ ] 编写单元测试
- [ ] 编写集成测试
- [ ] 更新用户文档

---

## 9. 总结

本方案设计了一个完整的模板持久化系统，具有以下特点：

1. **三级合并**: 用户级 > 项目级 > 默认模板
2. **高性能缓存**: 多级缓存，5分钟TTL
3. **向后兼容**: 渐进式迁移，不影响现有功能
4. **灵活覆盖**: 支持指令、区块、变量的增量覆盖
5. **安全可控**: 输入验证、权限控制、审计日志

通过此方案，用户可以为不同项目定制AI生成行为，同时保持系统的稳定性和性能。
