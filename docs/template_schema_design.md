# 模板抽象层数据库 Schema 设计

## 一、概述

本文档定义 Prompt 模板系统的数据库存储结构，支持三级覆盖机制（用户级 > 项目级 > 默认级），实现模板配置的持久化存储。

## 二、现有结构分析

### 2.1 数据库模型 (Prisma Schema)

**Project 模型中的现有字段：**
```prisma
model Project {
  id               String    @id @default(cuid())
  // ...
  customPrompts    String?   @db.LongText // JSON blob - 现有字段
  // ...
}
```

**现有 customPrompts 使用方式：**
- 类型：`Record<string, string>`
- 用途：存储简单的键值对覆盖
- 限制：仅支持字符串值，无法存储结构化数据

### 2.2 模板结构定义

**核心类型 (来自 `types/promptTemplate.ts`)：**
```typescript
interface PromptTemplateDefinition {
  id: string;                      // 模板ID
  label: string;                   // 显示名称
  description: string;             // 描述
  category: TemplateCategory;      // 分类
  systemTemplate: string;          // 系统指令模板
  userTemplate: string;            // 用户提示模板
  variables: PromptVariable[];     // 变量列表
  sections: TemplateSection[];     // 区块列表
  version?: string;
  author?: string;
  tags?: string[];
}

interface PromptBlock {
  id: string;
  title: string;
  template: string;                // 模板字符串，含 {{variable}}
  condition?: string;              // 条件表达式（JavaScript）
  order: number;
  metadata?: BlockMetadata;
}

interface PromptVariable {
  name: string;
  type: VariableType;
  tier: VariableTier;
  source: VariableSource;
  required: boolean;
  description: string;
  display: {
    collapsible: boolean;
    previewLength: number;
    badge?: string;
  };
  defaultValue?: unknown;
}
```

## 三、Schema 设计方案

### 3.1 数据库字段设计

**方案：扩展 Project 模型**

```prisma
model Project {
  // ... 现有字段 ...

  // 模板覆盖配置（JSON blob）
  customTemplates   String?   @db.LongText // 新增字段：存储结构化模板覆盖

  // 保留现有字段用于向后兼容
  customPrompts     String?   @db.LongText // 保留：简单的字符串覆盖
}
```

### 3.2 TypeScript 接口定义

#### 3.2.1 模板覆盖结构

```typescript
/**
 * 模板覆盖配置
 * 存储在 project.customTemplates 中
 */
export interface TemplateOverrideConfig {
  version: string;                          // Schema 版本号，如 "1.0.0"
  lastModified: string;                     // ISO 8601 时间戳
  templates: Record<string, TemplateOverride>; // 模板ID -> 覆盖配置
}

/**
 * 单个模板的覆盖配置
 */
export interface TemplateOverride {
  templateId: string;                       // 模板ID，如 "scene_generation"

  // === 可覆盖字段 ===

  // 系统指令覆盖
  systemInstruction?: string;               // 覆盖默认的系统指令

  // 区块覆盖（按区块ID索引）
  blocks?: Record<string, BlockOverride>;   // 区块ID -> 覆盖配置

  // 变量默认值覆盖
  variableDefaults?: Record<string, unknown>; // 变量名 -> 默认值

  // 元数据
  metadata?: {
    modifiedAt?: string;                    // 修改时间
    modifiedBy?: string;                    // 修改用户ID
    notes?: string;                         // 备注
  };
}

/**
 * 区块覆盖配置
 */
export interface BlockOverride {
  blockId: string;                          // 区块ID，如 "genre_info"

  // === 可覆盖字段 ===

  // 模板内容覆盖
  template?: string;                        // 覆盖区块模板

  // 条件覆盖
  condition?: string | null;                // 覆盖显示条件（null表示移除条件）

  // 排序覆盖
  order?: number;                           // 覆盖区块顺序

  // 是否禁用该区块
  disabled?: boolean;                       // true则完全跳过该区块

  // 元数据覆盖
  metadata?: Partial<BlockMetadata>;        // 覆盖区块元数据
}

/**
 * 区块元数据
 */
export interface BlockMetadata {
  tier: 'task' | 'context' | 'style' | 'constraint' | 'format' | 'other';
  isStatic: boolean;
  dataSource: 'static' | 'user_input' | 'computed' | 'derived';
  description?: string;
}
```

#### 3.2.2 用户级偏好配置（可选扩展）

```typescript
/**
 * 用户级模板偏好
 * 存储在独立的 userPreferences 表或 localStorage
 */
export interface UserTemplatePreferences {
  version: string;
  lastModified: string;

  // 全局默认值覆盖
  globalVariableDefaults?: Record<string, unknown>;

  // 按模板类型的偏好
  templatePreferences?: Record<string, TemplateTypePreference>;
}

export interface TemplateTypePreference {
  // 默认创意值
  defaultCreativity?: number;

  // 默认区块启用状态
  defaultBlockStatus?: Record<string, boolean>;

  // 常用变量值
  frequentVariables?: Record<string, unknown>;
}
```

## 四、三级覆盖系统

### 4.1 覆盖优先级

```
用户级 (User Level)
    ↓ (如果未定义)
项目级 (Project Level)
    ↓ (如果未定义)
默认级 (Default Level - 代码中的 DEFAULT_TEMPLATES)
```

### 4.2 合并逻辑

```typescript
/**
 * 合并模板配置
 */
export function mergeTemplateConfig(
  templateId: string,
  projectOverride: TemplateOverride | undefined,
  userPreference: UserTemplatePreferences | undefined
): PromptTemplateDefinition {
  // 1. 获取默认模板
  const defaultTemplate = DEFAULT_TEMPLATES[templateId];
  if (!defaultTemplate) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // 2. 如果没有覆盖，直接返回默认模板
  if (!projectOverride && !userPreference) {
    return defaultTemplate;
  }

  // 3. 应用项目级覆盖
  let merged = { ...defaultTemplate };

  if (projectOverride) {
    // 3.1 覆盖系统指令
    if (projectOverride.systemInstruction) {
      merged.systemInstruction = projectOverride.systemInstruction;
    }

    // 3.2 覆盖区块
    if (projectOverride.blocks) {
      merged.userPromptBlocks = merged.userPromptBlocks.map(block => {
        const override = projectOverride.blocks[block.id];
        if (!override) return block;

        // 应用覆盖
        return {
          ...block,
          template: override.template ?? block.template,
          condition: override.condition ?? block.condition,
          order: override.order ?? block.order,
          metadata: override.metadata
            ? { ...block.metadata, ...override.metadata }
            : block.metadata,
          // 注意：如果 disabled 为 true，则该区块会在渲染时被过滤
        };
      });
    }

    // 3.3 覆盖变量默认值
    if (projectOverride.variableDefaults) {
      merged.variables = merged.variables.map(variable => {
        const overrideValue = projectOverride.variableDefaults[variable.name];
        if (overrideValue !== undefined) {
          return {
            ...variable,
            defaultValue: overrideValue,
          };
        }
        return variable;
      });
    }
  }

  // 4. 应用用户级偏好（如果有）
  if (userPreference?.globalVariableDefaults) {
    // 合并全局默认值
    merged.variables = merged.variables.map(variable => {
      const globalDefault = userPreference.globalVariableDefaults[variable.name];
      if (globalDefault !== undefined && variable.defaultValue === undefined) {
        return {
          ...variable,
          defaultValue: globalDefault,
        };
      }
      return variable;
    });
  }

  return merged;
}
```

### 4.3 渲染时的区块过滤

```typescript
/**
 * 过滤并排序区块
 */
export function filterAndSortBlocks(
  blocks: PromptBlock[],
  override: TemplateOverride | undefined
): PromptBlock[] {
  return blocks
    .filter(block => {
      // 检查是否被禁用
      const blockOverride = override?.blocks?.[block.id];
      if (blockOverride?.disabled) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      // 使用覆盖的顺序或原始顺序
      const orderA = override?.blocks?.[a.id]?.order ?? a.order;
      const orderB = override?.blocks?.[b.id]?.order ?? b.order;
      return orderA - orderB;
    });
}
```

## 五、数据存储格式

### 5.1 JSON 存储示例

**project.customTemplates 字段内容：**

```json
{
  "version": "1.0.0",
  "lastModified": "2026-03-31T10:30:00Z",
  "templates": {
    "scene_generation": {
      "templateId": "scene_generation",
      "systemInstruction": "你是一位专业的小说作家，专注于玄幻小说创作...",
      "blocks": {
        "genre_info": {
          "blockId": "genre_info",
          "template": "[小说类型]: {{genre}}\n\n{{genreContext}}",
          "order": 1
        },
        "chekhov_gun": {
          "blockId": "chekhov_gun",
          "disabled": true
        },
        "quality_constraints": {
          "blockId": "quality_constraints",
          "template": "[质量要求]\n1. 避免陈词滥调\n2. 保持逻辑一致性\n3. 注重细节描写",
          "order": 20
        }
      },
      "variableDefaults": {
        "targetWordCount": 5000,
        "creativityLevel": 0.8
      },
      "metadata": {
        "modifiedAt": "2026-03-31T10:30:00Z",
        "modifiedBy": "user_123",
        "notes": "针对玄幻场景优化的模板"
      }
    },
    "summarize_chapter": {
      "templateId": "summarize_chapter",
      "variableDefaults": {
        "maxSummaryLength": 500
      }
    }
  }
}
```

### 5.2 数据大小估算

**单个模板覆盖：**
- 系统指令覆盖：~500 字符 = 0.5 KB
- 区块覆盖（平均 3 个）：~300 字符/区块 = 0.9 KB
- 变量默认值（平均 5 个）：~200 字符 = 0.2 KB
- 元数据：~100 字符 = 0.1 KB
- **单模板总计：~1.7 KB**

**项目级存储（假设 10 个模板覆盖）：**
- 总计：~17 KB
- MySQL LongText 容量：4 GB
- **完全满足需求**

## 六、API 接口设计

### 6.1 获取合并后的模板

```typescript
// GET /api/projects/:projectId/templates/:templateId
interface GetTemplateResponse {
  template: PromptTemplateDefinition;
  override?: TemplateOverride;
  sources: {
    systemInstruction: 'default' | 'project' | 'user';
    blocks: Record<string, 'default' | 'project' | 'user'>;
    variables: Record<string, 'default' | 'project' | 'user'>;
  };
}
```

### 6.2 更新模板覆盖

```typescript
// PATCH /api/projects/:projectId/templates/:templateId
interface UpdateTemplateRequest {
  systemInstruction?: string;
  blocks?: Record<string, BlockOverride>;
  variableDefaults?: Record<string, unknown>;
}

interface UpdateTemplateResponse {
  success: boolean;
  override: TemplateOverride;
  merged: PromptTemplateDefinition;
}
```

### 6.3 重置模板覆盖

```typescript
// DELETE /api/projects/:projectId/templates/:templateId
interface ResetTemplateResponse {
  success: boolean;
  default: PromptTemplateDefinition;
}
```

## 七、迁移策略

### 7.1 从 customPrompts 迁移

**现有 customPrompts 格式：**
```json
{
  "scene_generation": "你是一位专业的小说作家...",
  "summarize_chapter": "请总结以下章节内容..."
}
```

**迁移脚本：**
```typescript
async function migrateCustomPrompts(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { customPrompts: true },
  });

  if (!project?.customPrompts) return;

  const oldPrompts = JSON.parse(project.customPrompts);
  const newConfig: TemplateOverrideConfig = {
    version: '1.0.0',
    lastModified: new Date().toISOString(),
    templates: {},
  };

  // 转换格式
  for (const [templateId, systemInstruction] of Object.entries(oldPrompts)) {
    newConfig.templates[templateId] = {
      templateId,
      systemInstruction: systemInstruction as string,
    };
  }

  // 保存新格式
  await db.project.update({
    where: { id: projectId },
    data: {
      customTemplates: JSON.stringify(newConfig),
      // 保留 customPrompts 用于向后兼容
    },
  });
}
```

### 7.2 向后兼容

**读取逻辑：**
```typescript
async function getProjectTemplates(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { customTemplates: true, customPrompts: true },
  });

  // 优先使用新格式
  if (project?.customTemplates) {
    return JSON.parse(project.customTemplates);
  }

  // 回退到旧格式
  if (project?.customPrompts) {
    return migrateOnTheFly(JSON.parse(project.customPrompts));
  }

  return null;
}
```

## 八、安全与验证

### 8.1 数据验证

```typescript
/**
 * 验证模板覆盖配置
 */
export function validateTemplateOverride(
  override: TemplateOverride,
  templateId: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 验证模板ID存在
  if (!DEFAULT_TEMPLATES[templateId]) {
    errors.push(`Template not found: ${templateId}`);
  }

  // 2. 验证系统指令长度
  if (override.systemInstruction) {
    if (override.systemInstruction.length > 10000) {
      warnings.push('System instruction exceeds 10000 characters');
    }
  }

  // 3. 验证区块覆盖
  if (override.blocks) {
    const template = DEFAULT_TEMPLATES[templateId];
    const validBlockIds = new Set(template.userPromptBlocks.map(b => b.id));

    for (const [blockId, blockOverride] of Object.entries(override.blocks)) {
      if (!validBlockIds.has(blockId)) {
        errors.push(`Invalid block ID: ${blockId}`);
      }

      // 验证区块模板语法
      if (blockOverride.template) {
        const syntaxErrors = validateTemplateSyntax(blockOverride.template);
        errors.push(...syntaxErrors);
      }

      // 验证条件表达式
      if (blockOverride.condition) {
        const conditionErrors = validateConditionSyntax(blockOverride.condition);
        errors.push(...conditionErrors);
      }
    }
  }

  // 4. 验证变量默认值
  if (override.variableDefaults) {
    const template = DEFAULT_TEMPLATES[templateId];
    const validVarNames = new Set(template.variables.map(v => v.name));

    for (const varName of Object.keys(override.variableDefaults)) {
      if (!validVarNames.has(varName)) {
        warnings.push(`Unknown variable: ${varName}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

### 8.2 SQL 注入防护

所有模板内容存储为 JSON 字符串，通过 Prisma 参数化查询插入，无 SQL 注入风险。

### 8.3 XSS 防护

模板内容在渲染时使用 Handlebars 转义，前端显示时使用 React 自动转义。

## 九、性能优化

### 9.1 缓存策略

```typescript
class TemplateCache {
  private cache = new LRUCache<string, PromptTemplateDefinition>({
    max: 100,
    ttl: 1000 * 60 * 5, // 5分钟
  });

  getKey(projectId: string, templateId: string): string {
    return `${projectId}:${templateId}`;
  }

  get(projectId: string, templateId: string): PromptTemplateDefinition | undefined {
    return this.cache.get(this.getKey(projectId, templateId));
  }

  set(projectId: string, templateId: string, template: PromptTemplateDefinition): void {
    this.cache.set(this.getKey(projectId, templateId), template);
  }

  invalidate(projectId: string, templateId?: string): void {
    if (templateId) {
      this.cache.delete(this.getKey(projectId, templateId));
    } else {
      // 清除该项目的所有缓存
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${projectId}:`)) {
          this.cache.delete(key);
        }
      }
    }
  }
}
```

### 9.2 懒加载

仅在需要渲染模板时才加载和合并配置，避免预加载所有模板。

## 十、扩展性考虑

### 10.1 模板版本控制

未来可扩展支持模板版本历史：

```typescript
interface TemplateVersionHistory {
  templateId: string;
  versions: {
    version: string;
    override: TemplateOverride;
    timestamp: string;
    modifiedBy: string;
    changeNote?: string;
  }[];
}
```

### 10.2 模板共享

未来可支持项目间模板共享：

```typescript
interface SharedTemplate {
  id: string;
  name: string;
  description: string;
  override: TemplateOverride;
  createdBy: string;
  isPublic: boolean;
  tags: string[];
}
```

## 十一、实施清单

### Phase 2.1: 数据库迁移
- [ ] 添加 `customTemplates` 字段到 Project 模型
- [ ] 创建数据库迁移脚本
- [ ] 执行迁移并测试

### Phase 2.2: 类型定义
- [ ] 创建 `types/templateOverride.ts`
- [ ] 定义 `TemplateOverrideConfig` 接口
- [ ] 定义 `TemplateOverride` 接口
- [ ] 定义 `BlockOverride` 接口

### Phase 2.3: 合并逻辑
- [ ] 实现 `mergeTemplateConfig` 函数
- [ ] 实现 `filterAndSortBlocks` 函数
- [ ] 添加单元测试

### Phase 2.4: API 实现
- [ ] 实现 GET /api/projects/:projectId/templates/:templateId
- [ ] 实现 PATCH /api/projects/:projectId/templates/:templateId
- [ ] 实现 DELETE /api/projects/:projectId/templates/:templateId
- [ ] 添加验证和错误处理

### Phase 2.5: 迁移工具
- [ ] 实现 customPrompts -> customTemplates 迁移脚本
- [ ] 实现向后兼容读取逻辑
- [ ] 测试迁移过程

---

**文档版本：** 1.0.0
**创建时间：** 2026-03-31
**作者：** Database Specialist
**相关文档：**
- `docs/prompt_template_analyse_list.md` - 模板分析总览
- `types/promptTemplate.ts` - 类型定义
- `config/templates/defaults.ts` - 默认模板
