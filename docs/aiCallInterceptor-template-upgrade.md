# aiCallInterceptor 模板功能升级说明

## 概述

本次升级为 `aiCallInterceptor.ts` 添加了模板数据支持，允许使用结构化变量数据来渲染提示词模板，同时保持向后兼容性。

## 修改内容

### 1. 新增类型定义

```typescript
export type VariableTier = 'critical' | 'important' | 'optional';

export interface AICallContext {
  // ... 现有字段

  // 新增模板相关字段
  templateId?: string; // 模板ID
  templateData?: Record<string, any>; // 结构化变量数据
  templateMeta?: {
    // 模板元信息（用于UI展示）
    label: string;
    description: string;
    variables: Array<{
      name: string;
      value: any;
      tier: VariableTier;
      tokenCount: number;
    }>;
  };
}
```

### 2. 增强的 `interceptAICall` 函数

现在 `interceptAICall` 会自动检测是否提供了 `templateData` 和 `templateId`：

- **如果提供了模板数据**：使用 `templateEngine` 渲染 `systemInstruction` 和 `userPrompt`
- **如果没有提供模板数据**：直接使用原始字符串（向后兼容）

### 3. 导入依赖

```typescript
import { templateEngine } from './templateEngine';
```

## 使用方式

### 传统方式（向后兼容）

现有代码无需修改，继续工作：

```typescript
const context: AICallContext = {
  taskType: 'scene_generation',
  systemInstruction: 'You are a creative writer...',
  userPrompt: 'Generate a scene about...',
  model: 'gemini-3-flash-preview',
  temperature: 0.9,
};

const result = await interceptAICall(context);
```

### 使用模板数据（新功能）

```typescript
const templateData = {
  genre: '科幻',
  sceneGoal: '建立主角与反派的对立关系',
  mainCharacter: {
    name: '李明',
    personality: '冷静、理性',
  },
  recentEvents: ['事件1', '事件2', '事件3'],
  hasForeshadowing: true,
};

const context: AICallContext = {
  taskType: 'scene_generation',
  templateId: 'scene_generation',
  templateData: templateData,

  // 模板字符串（会被 templateEngine 渲染）
  systemInstruction: `You are a master novelist specializing in {{genre}} fiction...`,

  userPrompt: `
【情节目标】
{{sceneGoal}}

【主角状态】
姓名：{{mainCharacter.name}}
性格：{{mainCharacter.personality}}

【近期事件】
{{#each recentEvents}}
- {{this}}
{{/each}}

{{#if hasForeshadowing}}
【伏笔提示】
有伏笔需要呼应
{{/if}}
  `.trim(),

  model: 'gemini-3-flash-preview',
  temperature: 0.9,

  // 模板元信息（用于UI展示）
  templateMeta: {
    label: '场景生成模板',
    description: '基于配料的完整场景生成',
    variables: [
      {
        name: 'genre',
        value: templateData.genre,
        tier: 'critical',
        tokenCount: 2,
      },
      {
        name: 'sceneGoal',
        value: templateData.sceneGoal,
        tier: 'critical',
        tokenCount: 15,
      },
      // ... 更多变量
    ],
  },
};

const result = await interceptAICall(context);
```

## 模板引擎功能

模板引擎支持以下语法：

### 1. 变量替换

```typescript
{
  {
    variableName;
  }
} // 简单变量
{
  {
    object.property;
  }
} // 嵌套属性
```

### 2. 条件渲染

```typescript
{{#if condition}}
  条件为真时显示的内容
{{/if}}
```

### 3. 循环渲染

```typescript
{{#each items}}
  - {{this}}              // 当前项
  - {{@index}}            // 索引
  - {{property}}          // 对象属性
{{/each}}
```

## 向后兼容性

本次升级完全向后兼容：

1. **现有代码无需修改**：没有使用模板数据的调用继续按原方式工作
2. **可选字段**：所有新增字段都是可选的（`templateId?`, `templateData?`, `templateMeta?`）
3. **错误处理**：模板渲染失败时会回退到原始字符串

## UI 集成

`PromptConfirmDialog` 组件已经支持显示模板信息：

- **模板视图**：显示变量卡片和区块结构
- **完整视图**：显示渲染后的完整提示词
- **编辑模式**：允许用户编辑渲染后的提示词

`templateMeta` 字段提供了丰富的元信息，可以在 UI 中显示：

- 变量名称和值
- 变量重要性分级（critical/important/optional）
- Token 数量估算

## 最佳实践

### 1. 类型安全

为模板数据定义 TypeScript 接口：

```typescript
interface SceneGenerationData {
  genre: string;
  sceneGoal: string;
  mainCharacter: {
    name: string;
    personality: string;
  };
  // ...
}

const templateData: SceneGenerationData = {
  // ...
};
```

### 2. 动态构建模板数据

从项目状态动态构建模板数据：

```typescript
const templateData = {
  genre: projectStore.genre,
  sceneGoal: currentScene.goal,
  recentEvents: await fetchRecentEvents(),
  hasForeshadowing: foreshadowing.length > 0,
};
```

### 3. 错误处理

模板渲染失败时会自动回退到原始字符串，但建议在生产环境中添加更详细的错误日志：

```typescript
// aiCallInterceptor.ts 中已经有错误处理
try {
  // 渲染模板
} catch (error) {
  console.error('Template rendering error:', error);
  // 继续使用原始字符串
}
```

## 相关文件

- `services/aiCallInterceptor.ts` - 主要修改文件
- `services/templateEngine.ts` - 模板引擎实现
- `components/common/PromptConfirmDialog.tsx` - UI 组件
- `config/templates/defaults.ts` - 模板定义
- `docs/template-usage-examples.ts` - 使用示例

## 测试建议

1. **向后兼容性测试**：确保现有调用方式仍然正常工作
2. **模板渲染测试**：测试各种模板语法（变量、条件、循环）
3. **错误处理测试**：测试模板渲染失败时的回退机制
4. **UI 集成测试**：确保 `PromptConfirmDialog` 正确显示模板信息

## 未来扩展

可能的未来扩展方向：

1. **模板注册表**：创建 `TemplateRegistry` 管理所有模板
2. **模板版本控制**：支持模板的版本管理和迁移
3. **模板验证**：在编译时验证模板数据结构
4. **模板编辑器**：可视化模板编辑工具
5. **模板分析**：Token 使用分析和优化建议
