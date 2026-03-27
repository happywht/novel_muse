# aiCallInterceptor 模板功能快速参考

## 快速开始

### 1. 传统方式（无需修改现有代码）

```typescript
import { interceptAICall, AICallContext } from '../services/aiCallInterceptor';

const context: AICallContext = {
  taskType: 'scene_generation',
  systemInstruction: 'You are a creative writer...',
  userPrompt: 'Generate a scene about...',
  model: 'gemini-3-flash-preview',
  temperature: 0.9,
};

const result = await interceptAICall(context);
```

### 2. 使用模板（新功能）

```typescript
const context: AICallContext = {
  taskType: 'scene_generation',
  templateId: 'scene_generation',
  templateData: {
    genre: '科幻',
    sceneGoal: '建立对立关系',
    mainCharacter: { name: '李明' },
    recentEvents: ['事件1', '事件2'],
    hasForeshadowing: true,
  },
  systemInstruction: 'You are a novelist in {{genre}}...',
  userPrompt: `
【目标】{{sceneGoal}}
【主角】{{mainCharacter.name}}
{{#each recentEvents}}- {{this}}{{/each}}
{{#if hasForeshadowing}}有伏笔{{/if}}
  `,
  model: 'gemini-3-flash-preview',
  temperature: 0.9,
};
```

## 模板语法

### 变量
```typescript
{{variableName}}           // 简单变量
{{object.property}}        // 嵌套属性
```

### 条件
```typescript
{{#if condition}}
  条件为真时显示
{{/if}}
```

### 循环
```typescript
{{#each items}}
  - {{this}}              // 当前项
  - {{@index}}            // 索引（从0开始）
  - {{property}}          // 对象属性
{{/each}}
```

## 接口定义

### AICallContext
```typescript
interface AICallContext {
  // 必需字段
  taskType: string;
  systemInstruction: string;
  userPrompt: string;
  model: string;
  temperature: number;

  // 可选字段
  responseSchema?: any;
  thinkingBudget?: number;

  // 模板相关（可选）
  templateId?: string;
  templateData?: Record<string, any>;
  templateMeta?: {
    label: string;
    description: string;
    variables: Array<{
      name: string;
      value: any;
      tier: 'critical' | 'important' | 'optional';
      tokenCount: number;
    }>;
  };
}
```

### AICallResult
```typescript
interface AICallResult {
  approved: boolean;
  modifiedSystemInstruction?: string;
  modifiedUserPrompt?: string;
  modifiedTemperature?: number;
}
```

## 常见模式

### 1. 嵌套对象
```typescript
templateData: {
  character: {
    name: '李明',
    traits: {
      personality: '冷静',
      strength: '智慧'
    }
  }
}

// 模板
姓名：{{character.name}}
性格：{{character.traits.personality}}
```

### 2. 数组循环
```typescript
templateData: {
  events: [
    { title: '事件1', impact: 'high' },
    { title: '事件2', impact: 'medium' }
  ]
}

// 模板
{{#each events}}
{{@index}}. {{title}} (影响: {{impact}})
{{/each}}
```

### 3. 条件逻辑
```typescript
templateData: {
  hasWeapon: true,
  weaponName: '光剑',
  hasMagic: false,
  magicType: '火系'
}

// 模板
{{#if hasWeapon}}
武器：{{weaponName}}
{{/if}}

{{#if hasMagic}}
魔法：{{magicType}}
{{/if}}
```

### 4. 复杂对象
```typescript
templateData: {
  scene: {
    location: '太空站',
    time: '深夜',
    atmosphere: '紧张',
    characters: ['李明', '王芳']
  }
}

// 模板
【场景设定】
地点：{{scene.location}}
时间：{{scene.time}}
氛围：{{scene.atmosphere}}
在场人物：
{{#each scene.characters}}
- {{this}}
{{/each}}
```

## 最佳实践

### 1. 类型安全
```typescript
interface TemplateData {
  genre: string;
  sceneGoal: string;
  mainCharacter: {
    name: string;
    personality: string;
  };
}

const templateData: TemplateData = {
  genre: '科幻',
  sceneGoal: '建立对立关系',
  mainCharacter: {
    name: '李明',
    personality: '冷静'
  }
};
```

### 2. 变量重要性分级
```typescript
templateMeta: {
  variables: [
    { name: 'genre', tier: 'critical', ... },      // 必需，缺失会导致失败
    { name: 'sceneGoal', tier: 'critical', ... },  // 必需，缺失会导致失败
    { name: 'mainCharacter', tier: 'important', ... }, // 重要，影响质量
    { name: 'recentEvents', tier: 'optional', ... },   // 可选，增强上下文
  ]
}
```

### 3. 动态数据构建
```typescript
// 从项目状态构建
const templateData = {
  genre: projectStore.genre,
  sceneGoal: currentScene.goal,

  // 计算派生数据
  recentEvents: await fetchRecentEvents(),
  hasForeshadowing: foreshadowing.length > 0,

  // 可选字段
  ...(foreshadowing.length > 0 && {
    foreshadowing: foreshadowing[0].description
  })
};
```

## 调试技巧

### 1. 查看渲染结果
```typescript
const result = await interceptAICall(context);
if (result.approved) {
  console.log('渲染后的系统指令:', context.systemInstruction);
  console.log('渲染后的用户提示:', context.userPrompt);
}
```

### 2. 测试模板
```typescript
import { templateEngine } from '../services/templateEngine';

const template = '{{genre}} - {{mainCharacter.name}}';
const data = { genre: '科幻', mainCharacter: { name: '李明' } };

const rendered = templateEngine.render(template, data);
console.log(rendered); // "科幻 - 李明"
```

### 3. 提取变量
```typescript
const variables = templateEngine.extractVariables(template);
console.log(variables);
// [{ name: 'genre', type: 'variable' }, ...]
```

## 常见问题

### Q: 向后兼容吗？
A: 是的，所有新增字段都是可选的，现有代码无需修改。

### Q: 模板渲染失败会怎样？
A: 会回退到原始字符串，并在控制台输出错误信息。

### Q: 支持哪些模板语法？
A: 支持变量替换、条件渲染（#if）、循环渲染（#each）。

### Q: 如何在UI中显示模板信息？
A: 使用 `templateMeta` 字段，`PromptConfirmDialog` 组件会自动显示。

### Q: 可以嵌套对象吗？
A: 可以，使用点号语法：`{{object.property.nestedProperty}}`。

### Q: 如何处理数组？
A: 使用 `{{#each array}}...{{/each}}` 循环，`{{this}}` 引用当前项。

## 相关文件

- `services/aiCallInterceptor.ts` - 主要文件
- `services/templateEngine.ts` - 模板引擎
- `components/common/PromptConfirmDialog.tsx` - UI组件
- `docs/template-usage-examples.ts` - 完整示例
- `docs/aiCallInterceptor-template-upgrade.md` - 详细文档

## 获取帮助

- 查看完整文档：`docs/aiCallInterceptor-template-upgrade.md`
- 查看示例代码：`docs/template-usage-examples.ts`
- 查看模板定义：`config/templates/defaults.ts`
