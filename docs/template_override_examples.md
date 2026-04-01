# 模板覆盖系统使用示例

本文档提供模板覆盖系统的实际使用示例。

## 一、基本概念

### 三级覆盖优先级

```
用户级 (User Level)     - 最高优先级
    ↓
项目级 (Project Level)  - 中等优先级
    ↓
默认级 (Default Level)  - 最低优先级（代码中的 DEFAULT_TEMPLATES）
```

## 二、项目级覆盖示例

### 示例 1：修改系统指令

```typescript
import { TemplateOverrideConfig } from './types/templateOverride';

const projectOverride: TemplateOverrideConfig = {
  version: '1.0.0',
  lastModified: '2026-03-31T10:30:00Z',
  templates: {
    scene_generation: {
      templateId: 'scene_generation',
      systemInstruction: `你是一位资深的玄幻小说作家，擅长：
1. 构建复杂的世界观体系
2. 刻画立体的人物形象
3. 设计引人入胜的剧情转折

请用专业但易懂的语言进行创作。`,
    },
  },
};

// 保存到数据库
await db.project.update({
  where: { id: projectId },
  data: {
    customTemplates: JSON.stringify(projectOverride),
  },
});
```

### 示例 2：禁用某个区块

```typescript
const projectOverride: TemplateOverrideConfig = {
  version: '1.0.0',
  lastModified: '2026-03-31T10:30:00Z',
  templates: {
    scene_generation: {
      templateId: 'scene_generation',
      blocks: {
        chekhov_gun: {
          blockId: 'chekhov_gun',
          disabled: true, // 禁用契诃夫之枪区块
        },
      },
    },
  },
};
```

### 示例 3：修改区块模板

```typescript
const projectOverride: TemplateOverrideConfig = {
  version: '1.0.0',
  lastModified: '2026-03-31T10:30:00Z',
  templates: {
    scene_generation: {
      templateId: 'scene_generation',
      blocks: {
        quality_constraints: {
          blockId: 'quality_constraints',
          template: `[质量与风格要求 (严格遵守)]
1. 避免使用陈词滥调和俗套表达
2. 对话要符合人物性格，避免千篇一律
3. 描写要有画面感，多用动词少用形容词
4. 保持叙事节奏，避免冗长拖沓
5. 注重细节的真实性和逻辑一致性`,
          order: 20, // 移到最后
        },
      },
    },
  },
};
```

### 示例 4：调整区块顺序

```typescript
const projectOverride: TemplateOverrideConfig = {
  version: '1.0.0',
  lastModified: '2026-03-31T10:30:00Z',
  templates: {
    scene_generation: {
      templateId: 'scene_generation',
      blocks: {
        plot_beat: {
          blockId: 'plot_beat',
          order: 1, // 将情节拍移到最前面
        },
        genre_info: {
          blockId: 'genre_info',
          order: 2,
        },
        global_context: {
          blockId: 'global_context',
          order: 3,
        },
      },
    },
  },
};
```

### 示例 5：修改变量默认值

```typescript
const projectOverride: TemplateOverrideConfig = {
  version: '1.0.0',
  lastModified: '2026-03-31T10:30:00Z',
  templates: {
    scene_generation: {
      templateId: 'scene_generation',
      variableDefaults: {
        targetWordCount: 5000,      // 默认字数改为 5000
        creativityLevel: 0.85,      // 默认创意值 0.85
      },
    },
    summarize_chapter: {
      templateId: 'summarize_chapter',
      variableDefaults: {
        maxSummaryLength: 500,      // 摘要最大长度 500 字
      },
    },
  },
};
```

### 示例 6：修改区块显示条件

```typescript
const projectOverride: TemplateOverrideConfig = {
  version: '1.0.0',
  lastModified: '2026-03-31T10:30:00Z',
  templates: {
    scene_generation: {
      templateId: 'scene_generation',
      blocks: {
        global_context: {
          blockId: 'global_context',
          // 移除条件，始终显示
          condition: null,
        },
        chekhov_gun: {
          blockId: 'chekhov_gun',
          // 修改条件：只有超过 3 个未解决的伏笔时才显示
          condition: 'unresolvedForeshadowing != null && unresolvedForeshadowing.length > 3',
        },
      },
    },
  },
};
```

## 三、用户级偏好示例

### 示例 7：全局变量默认值

```typescript
import { UserTemplatePreferences } from './types/templateOverride';

const userPreferences: UserTemplatePreferences = {
  version: '1.0.0',
  lastModified: '2026-03-31T10:30:00Z',

  // 全局默认值（适用于所有模板）
  globalVariableDefaults: {
    creativityLevel: 0.8,  // 用户偏好较高的创意值
  },

  // 按模板类型的偏好
  templatePreferences: {
    scene_generation: {
      defaultCreativity: 0.9,
      frequentVariables: {
        targetWordCount: 3000,  // 该用户常用 3000 字
      },
    },
    summarize_chapter: {
      frequentVariables: {
        maxSummaryLength: 300,  // 该用户偏好较短的摘要
      },
    },
  },
};

// 存储在 localStorage
localStorage.setItem('userTemplatePreferences', JSON.stringify(userPreferences));
```

## 四、完整使用流程

### 步骤 1：加载并合并模板

```typescript
import { mergeTemplateConfig } from './services/templateMerge';

async function loadTemplateForRendering(
  projectId: string,
  templateId: string
) {
  // 1. 从数据库加载项目级覆盖
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { customTemplates: true },
  });

  let projectOverride = undefined;
  if (project?.customTemplates) {
    const config = JSON.parse(project.customTemplates);
    projectOverride = config.templates[templateId];
  }

  // 2. 从 localStorage 加载用户级偏好
  let userPreference = undefined;
  const userPrefsStr = localStorage.getItem('userTemplatePreferences');
  if (userPrefsStr) {
    userPreference = JSON.parse(userPrefsStr);
  }

  // 3. 合并模板
  const result = mergeTemplateConfig(
    templateId,
    projectOverride,
    userPreference
  );

  console.log('合并后的模板:', result.template);
  console.log('字段来源:', result.sources);
  console.log('警告:', result.warnings);

  return result;
}
```

### 步骤 2：保存项目级覆盖

```typescript
import { validateTemplateOverride } from './services/templateMerge';

async function saveProjectOverride(
  projectId: string,
  templateId: string,
  override: TemplateOverride
) {
  // 1. 验证覆盖配置
  const validation = validateTemplateOverride(override, templateId);
  if (!validation.valid) {
    throw new Error(`验证失败: ${validation.errors.join(', ')}`);
  }

  // 2. 显示警告（如果有）
  if (validation.warnings.length > 0) {
    console.warn('验证警告:', validation.warnings);
  }

  // 3. 加载现有配置
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { customTemplates: true },
  });

  let config: TemplateOverrideConfig = {
    version: '1.0.0',
    lastModified: new Date().toISOString(),
    templates: {},
  };

  if (project?.customTemplates) {
    config = JSON.parse(project.customTemplates);
  }

  // 4. 更新配置
  config.templates[templateId] = override;
  config.lastModified = new Date().toISOString();

  // 5. 保存到数据库
  await db.project.update({
    where: { id: projectId },
    data: {
      customTemplates: JSON.stringify(config),
    },
  });

  console.log('覆盖配置已保存');
}
```

### 步骤 3：重置为默认模板

```typescript
async function resetTemplateToDefault(
  projectId: string,
  templateId: string
) {
  // 1. 加载现有配置
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { customTemplates: true },
  });

  if (!project?.customTemplates) {
    console.log('没有覆盖配置，无需重置');
    return;
  }

  // 2. 移除指定模板的覆盖
  const config: TemplateOverrideConfig = JSON.parse(project.customTemplates);
  delete config.templates[templateId];

  // 3. 更新时间戳
  config.lastModified = new Date().toISOString();

  // 4. 保存回数据库
  await db.project.update({
    where: { id: projectId },
    data: {
      customTemplates: JSON.stringify(config),
    },
  });

  console.log(`模板 ${templateId} 已重置为默认`);
}
```

## 五、API 集成示例

### Express 路由示例

```typescript
import express from 'express';
import { mergeTemplateConfig, validateTemplateOverride } from './services/templateMerge';

const router = express.Router();

// GET /api/projects/:projectId/templates/:templateId
router.get('/projects/:projectId/templates/:templateId', async (req, res) => {
  try {
    const { projectId, templateId } = req.params;

    // 加载项目级覆盖
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { customTemplates: true },
    });

    let projectOverride = undefined;
    if (project?.customTemplates) {
      const config = JSON.parse(project.customTemplates);
      projectOverride = config.templates[templateId];
    }

    // 合并模板
    const result = mergeTemplateConfig(templateId, projectOverride, undefined);

    res.json({
      template: result.template,
      override: result.appliedOverride,
      sources: result.sources,
      warnings: result.warnings,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/projects/:projectId/templates/:templateId
router.patch('/projects/:projectId/templates/:templateId', async (req, res) => {
  try {
    const { projectId, templateId } = req.params;
    const updates = req.body;

    // 构建覆盖配置
    const override: TemplateOverride = {
      templateId,
      ...updates,
      metadata: {
        modifiedAt: new Date().toISOString(),
        modifiedBy: req.user?.id,
      },
    };

    // 验证
    const validation = validateTemplateOverride(override, templateId);
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors,
      });
    }

    // 保存
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { customTemplates: true },
    });

    let config: TemplateOverrideConfig = {
      version: '1.0.0',
      lastModified: new Date().toISOString(),
      templates: {},
    };

    if (project?.customTemplates) {
      config = JSON.parse(project.customTemplates);
    }

    // 合并现有覆盖和更新
    config.templates[templateId] = {
      ...config.templates[templateId],
      ...override,
    };
    config.lastModified = new Date().toISOString();

    await db.project.update({
      where: { id: projectId },
      data: { customTemplates: JSON.stringify(config) },
    });

    // 返回合并后的结果
    const result = mergeTemplateConfig(templateId, config.templates[templateId], undefined);

    res.json({
      success: true,
      override: config.templates[templateId],
      merged: result.template,
      sources: result.sources,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/projects/:projectId/templates/:templateId
router.delete('/projects/:projectId/templates/:templateId', async (req, res) => {
  try {
    const { projectId, templateId } = req.params;

    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { customTemplates: true },
    });

    if (!project?.customTemplates) {
      return res.json({ success: true, message: 'No override to delete' });
    }

    const config: TemplateOverrideConfig = JSON.parse(project.customTemplates);
    delete config.templates[templateId];
    config.lastModified = new Date().toISOString();

    await db.project.update({
      where: { id: projectId },
      data: { customTemplates: JSON.stringify(config) },
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

## 六、前端集成示例

### React Hook 示例

```typescript
import { useState, useEffect } from 'react';
import { mergeTemplateConfig, validateTemplateOverride } from '../services/templateMerge';
import { TemplateOverride, TemplateOverrideConfig } from '../types/templateOverride';

export function useTemplateOverride(projectId: string, templateId: string) {
  const [template, setTemplate] = useState(null);
  const [override, setOverride] = useState<TemplateOverride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载模板
  useEffect(() => {
    loadTemplate();
  }, [projectId, templateId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/projects/${projectId}/templates/${templateId}`
      );
      const data = await response.json();

      setTemplate(data.template);
      setOverride(data.override || null);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveOverride = async (updates: Partial<TemplateOverride>) => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/templates/${templateId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setTemplate(data.merged);
      setOverride(data.override);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const resetOverride = async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/templates/${templateId}`,
        { method: 'DELETE' }
      );

      const data = await response.json();
      await loadTemplate();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return {
    template,
    override,
    loading,
    error,
    saveOverride,
    resetOverride,
    reload: loadTemplate,
  };
}
```

### React 组件示例

```tsx
import React, { useState } from 'react';
import { useTemplateOverride } from '../hooks/useTemplateOverride';

export function TemplateEditor({ projectId, templateId }) {
  const {
    template,
    override,
    loading,
    error,
    saveOverride,
    resetOverride,
  } = useTemplateOverride(projectId, templateId);

  const [systemInstruction, setSystemInstruction] = useState('');

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  const handleSave = async () => {
    try {
      await saveOverride({
        systemInstruction,
      });
      alert('保存成功');
    } catch (err) {
      alert('保存失败: ' + err.message);
    }
  };

  const handleReset = async () => {
    if (confirm('确定要重置为默认模板吗？')) {
      await resetOverride();
      setSystemInstruction('');
    }
  };

  return (
    <div className="template-editor">
      <h2>编辑模板: {template?.label}</h2>

      <div className="field">
        <label>系统指令</label>
        <textarea
          value={systemInstruction || template?.systemTemplate}
          onChange={(e) => setSystemInstruction(e.target.value)}
          rows={10}
          cols={80}
        />
      </div>

      <div className="actions">
        <button onClick={handleSave}>保存</button>
        <button onClick={handleReset}>重置为默认</button>
      </div>

      {override && (
        <div className="override-info">
          <p>已应用项目级覆盖</p>
          <p>最后修改: {override.metadata?.modifiedAt}</p>
        </div>
      )}
    </div>
  );
}
```

## 七、最佳实践

### 1. 验证优先

在保存任何覆盖之前，始终进行验证：

```typescript
const validation = validateTemplateOverride(override, templateId);
if (!validation.valid) {
  // 显示错误给用户
  return;
}
if (validation.warnings.length > 0) {
  // 显示警告，让用户确认
}
```

### 2. 渐进式覆盖

只覆盖需要修改的字段，不要复制整个模板：

```typescript
// ✅ 好的做法
const override = {
  templateId: 'scene_generation',
  variableDefaults: {
    targetWordCount: 5000,
  },
};

// ❌ 不好的做法
const override = {
  templateId: 'scene_generation',
  systemInstruction: DEFAULT_TEMPLATES.scene_generation.systemInstruction,
  // ... 复制所有字段
  variableDefaults: {
    targetWordCount: 5000,
  },
};
```

### 3. 使用元数据

记录修改原因和时间：

```typescript
const override = {
  templateId: 'scene_generation',
  systemInstruction: '...',
  metadata: {
    modifiedAt: new Date().toISOString(),
    modifiedBy: userId,
    notes: '针对玄幻场景优化的系统指令',
    changeReason: '提升生成质量',
  },
};
```

### 4. 缓存合并结果

避免重复合并：

```typescript
const cache = new Map<string, any>();

function getCachedTemplate(projectId: string, templateId: string) {
  const cacheKey = `${projectId}:${templateId}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  const result = mergeTemplateConfig(...);
  cache.set(cacheKey, result);
  return result;
}
```

---

**相关文档：**
- [设计文档](./template_schema_design.md)
- [类型定义](../types/templateOverride.ts)
- [合并逻辑](../services/templateMerge.ts)
