# 模板系统使用指南

## 快速开始

### 1. 基本概念

模板系统允许你将 Prompt 定义为结构化的模板,而不是手动拼接字符串。

**旧方式 (手动拼接)**:
```typescript
const prompt = `
小说类型: ${genre}
剧情目标: ${plotBeat}
上下文: ${context}
`;
```

**新方式 (模板系统)**:
```typescript
const templateData = {
  genre,
  plotBeat,
  context
};

const userPrompt = renderUserPromptBlocks('scene_generation', templateData);

return await executeModelTask(
  'scene_generation',
  instruction,
  userPrompt,
  model,
  temperature,
  undefined,
  2048,
  { templateId: 'scene_generation', templateData }  // 传递模板选项
);
```

### 2. 模板定义

模板定义在 `config/templates/defaults.ts` 中:

```typescript
const SCENE_GENERATION_TEMPLATE: PromptTemplate = {
  id: 'scene_generation',
  name: 'Scene Generation',
  description: '场景生成模板',
  category: 'generation',

  // 系统指令
  systemInstruction: `You are a master novelist...`,

  // 用户 Prompt 块
  userPromptBlocks: [
    {
      id: 'genre_info',
      title: 'Genre Information',
      order: 1,
      template: `Novel Genre: {{genre}}

{{genreContext}}`,
    },
    // ... 更多块
  ],

  // 变量定义
  variables: [
    {
      name: 'genre',
      type: 'string',
      tier: 'critical',  // critical | important | optional
      source: 'project_state',
      required: true,
      description: '小说类型',
      display: 'Novel Genre',
    },
    // ... 更多变量
  ],
};
```

### 3. 模板语法

#### 简单变量
```typescript
template: `小说类型: {{genre}}`
// 数据: { genre: '玄幻' }
// 输出: 小说类型: 玄幻
```

#### 条件渲染
```typescript
template: `{{#if povName}}
- **视角锁定**: 必须严格以【{{povName}}】的视角叙事。
{{/if}}`
// 数据: { povName: '林远' }
// 输出: - **视角锁定**: 必须严格以【林远】的视角叙事。
```

#### 循环渲染
```typescript
template: `{{#each physicalStatus}}
- [{{this.name}}]: 位于 [{{this.location}}], 状态: [{{this.state}}]
{{/each}}`
// 数据: {
//   physicalStatus: [
//     { name: '林远', location: '修炼室', state: '健康' },
//     { name: '芈岚', location: '大殿', state: '受伤' }
//   ]
// }
// 输出:
// - [林远]: 位于 [修炼室], 状态: [健康]
// - [芈岚]: 位于 [大殿], 状态: [受伤]
```

#### 嵌套循环
```typescript
template: `{{#each relevantSettingsByCategory}}
[{{this.category}}]:
{{#each this.items}}
  - {{this.title}}: {{this.content}}
{{/each}}
{{/each}}`
// 数据: {
//   relevantSettingsByCategory: [
//     {
//       category: '修炼体系',
//       items: [
//         { title: '境界划分', content: '练气-筑基-金丹...' },
//         { title: '功法等级', content: '天地玄黄...' }
//       ]
//     }
//   ]
// }
// 输出:
// [修炼体系]:
//   - 境界划分: 练气-筑基-金丹...
//   - 功法等级: 天地玄黄...
```

#### 循环内条件
```typescript
template: `{{#each physicalStatus}}
- [{{this.name}}]: 状态: [{{this.state}}]{{#if this.isDead}} (已死亡){{/if}}
{{/each}}`
// 数据: {
//   physicalStatus: [
//     { name: '林远', state: '健康', isDead: false },
//     { name: '反派', state: '死亡', isDead: true }
//   ]
// }
// 输出:
// - [林远]: 状态: [健康]
// - [反派]: 状态: [死亡] (已死亡)
```

### 4. 渲染函数

使用 `renderUserPromptBlocks` 函数渲染模板:

```typescript
import { renderUserPromptBlocks } from '../../config/templates/defaults';

const templateData = {
  genre: '玄幻',
  plotBeat: '主角突破境界',
  // ... 更多变量
};

const userPrompt = renderUserPromptBlocks('scene_generation', templateData);
```

### 5. 调用 AI 模型

使用 `executeModelTask` 并传递模板选项:

```typescript
return await executeModelTask(
  'scene_generation',  // 任务类型
  instruction,         // 系统指令
  userPrompt,          // 渲染后的用户 Prompt
  'gemini-3-flash-preview',
  0.9,
  undefined,
  2048,
  { templateId: 'scene_generation', templateData }  // 模板选项
);
```

## 最佳实践

### 1. 变量分级

将变量分为三个重要级别:

- **critical**: 必需变量,缺失会导致生成失败
- **important**: 重要变量,显著影响输出质量
- **optional**: 可选变量,用于增强上下文

```typescript
{
  name: 'genre',
  tier: 'critical',  // 必需
  required: true,
},
{
  name: 'twistHook',
  tier: 'optional',  // 可选
  required: false,
}
```

### 2. 条件渲染

使用条件渲染避免空白内容:

```typescript
{
  template: `{{#if twistHook}}
[剧情反转]: {{twistHook}}
{{/if}}`,
  condition: 'twistHook != null && twistHook !== ""',
}
```

### 3. 默认值

为可选变量提供默认值:

```typescript
{
  name: 'targetWordCount',
  type: 'number',
  tier: 'important',
  defaultValue: 3000,
}
```

### 4. 块排序

使用 `order` 属性控制块的渲染顺序:

```typescript
userPromptBlocks: [
  { id: 'genre', order: 1, ... },
  { id: 'context', order: 2, ... },
  { id: 'constraints', order: 10, ... },
]
```

## 调试技巧

### 1. 查看渲染结果

```typescript
const userPrompt = renderUserPromptBlocks('scene_generation', templateData);
console.log('Rendered prompt:', userPrompt);
console.log('Length:', userPrompt.length);
```

### 2. 检查变量值

```typescript
console.log('Template data:', JSON.stringify(templateData, null, 2));
```

### 3. 验证模板

使用 `validateTemplateVariables` 验证必填变量:

```typescript
import { validateTemplateVariables } from '../../config/templates/defaults';

const validation = validateTemplateVariables('scene_generation', templateData);
if (!validation.valid) {
  console.error('Missing required variables:', validation.missing);
}
```

## 示例:迁移现有函数

假设要将 `expandScene` 函数迁移到模板系统:

### 步骤 1: 定义模板

在 `config/templates/defaults.ts` 中添加:

```typescript
const SCENE_EXPANSION_TEMPLATE: PromptTemplate = {
  id: 'scene_expansion',
  name: 'Scene Expansion',
  category: 'generation',
  systemInstruction: `...`,
  userPromptBlocks: [
    {
      id: 'basic_info',
      order: 1,
      template: `Novel Genre: {{genre}}
Core Premise: {{premise}}

{{contextStr}}

Current Plot Outline:
{{plotOutline}}

Writing Task:
{{userPrompt}}`,
    },
  ],
  variables: [
    { name: 'genre', tier: 'critical', ... },
    { name: 'premise', tier: 'critical', ... },
    // ... 更多变量
  ],
};

// 添加到默认模板
export const DEFAULT_TEMPLATES: Record<string, PromptTemplate> = {
  scene_generation: SCENE_GENERATION_TEMPLATE,
  scene_expansion: SCENE_EXPANSION_TEMPLATE,  // 新增
};
```

### 步骤 2: 修改函数

```typescript
export const expandScene = async (
  premise: string,
  genre: string,
  plotOutline: string,
  userPrompt: string,
  characters: Character[],
  worldSettings: WorldSetting[],
  settings?: CreativeSettings,
  echoes: Echo[] = []
): Promise<string> => {
  const instruction = getInstructionWithSettings('scene_expansion', settings);
  const contextStr = formatContext(characters, worldSettings, echoes);

  // 使用模板系统
  const templateData = {
    genre,
    premise,
    plotOutline,
    userPrompt,
    contextStr,
  };

  const renderedPrompt = renderUserPromptBlocks('scene_expansion', templateData);

  try {
    return await executeModelTask(
      'expandScene',
      instruction,
      renderedPrompt,
      'gemini-3-flash-preview',
      settings?.creativity || 0.9,
      undefined,
      undefined,
      { templateId: 'scene_expansion', templateData }
    ) || "生成失败。";
  } catch (error) {
    console.error("Gemini Scene Expansion Error:", error);
    throw error;
  }
};
```

## 总结

模板系统提供了结构化、可维护的 Prompt 管理方式,支持复杂的渲染逻辑,同时保持代码清晰。建议逐步将现有的字符串拼接代码迁移到模板系统。
