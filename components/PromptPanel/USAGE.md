# PromptPanel 组件使用指南

## 概述

PromptPanel 是一个用于管理和编辑 AI 提示词的核心组件，支持三种显示模式和多层级的 prompt 覆盖机制。

## 文件结构

```
components/PromptPanel/
├── index.ts           # 统一导出
├── PromptPanel.tsx    # 主组件
├── PromptBadge.tsx    # 折叠徽章
├── PromptEditor.tsx   # 编辑器
├── EffectBadge.tsx    # 生效层级Badge
└── ParameterControl.tsx # 参数控制
```

## 基础用法

### 1. 紧凑模式（Compact）

```tsx
import { PromptPanel } from './components/PromptPanel';
import { PROMPT_REGISTRY_LITERARY } from './config/prompts';

// 在侧边栏或工具栏中
<PromptPanel
  mode="compact"
  prompts={Object.values(PROMPT_REGISTRY_LITERARY)}
  projectOverrides={project.customPrompts}
  onSave={(key, content, level) => {
    // 保存逻辑
  }}
  onReset={(key, level) => {
    // 重置逻辑
  }}
/>;
```

### 2. 折叠模式（Collapsed）

```tsx
<PromptPanel
  mode="collapsed"
  moduleType="plot"
  prompts={plotRelatedPrompts}
  projectOverrides={project.customPrompts}
  moduleOverrides={moduleCustomPrompts}
  onSave={handleSave}
  onReset={handleReset}
/>
```

### 3. 展开模式（Expanded）

```tsx
<PromptPanel
  mode="expanded"
  moduleType="world"
  prompts={worldPrompts}
  projectOverrides={project.customPrompts}
  moduleOverrides={moduleCustomPrompts}
  onSave={handleSave}
  onReset={handleReset}
  onResetAll={handleResetAll}
/>
```

### 4. 模态框模式

```tsx
const [showTuner, setShowTuner] = useState(false);

{
  showTuner && (
    <PromptPanel
      isModal
      title="AI 调教台"
      subtitle={`针对《${project.title}》自定义系统提示词`}
      prompts={allPrompts}
      projectOverrides={project.customPrompts}
      onSave={handleSave}
      onReset={handleReset}
      onClose={() => setShowTuner(false)}
    />
  );
}
```

## 组件 API

### PromptPanelProps

| 属性               | 类型                                     | 默认值        | 描述           |
| ------------------ | ---------------------------------------- | ------------- | -------------- |
| `mode`             | `'compact' \| 'collapsed' \| 'expanded'` | `'collapsed'` | 显示模式       |
| `moduleType`       | `ModuleType`                             | `'global'`    | 关联的模块类型 |
| `prompts`          | `PromptItem[]`                           | 必填          | prompt 列表    |
| `projectOverrides` | `Record<string, string>`                 | `{}`          | 项目级覆盖     |
| `moduleOverrides`  | `Record<string, string>`                 | `{}`          | 模块级覆盖     |
| `onSave`           | `(key, content, level) => void`          | 必填          | 保存回调       |
| `onReset`          | `(key, level) => void`                   | 必填          | 重置回调       |
| `onResetAll`       | `(level) => void`                        | -             | 全部重置回调   |
| `onClose`          | `() => void`                             | -             | 关闭回调       |
| `isModal`          | `boolean`                                | `false`       | 是否模态框     |
| `disabled`         | `boolean`                                | `false`       | 是否禁用       |
| `title`            | `string`                                 | `'AI 调教台'` | 标题           |
| `subtitle`         | `string`                                 | -             | 副标题         |

### ModuleType

```typescript
type ModuleType =
  | 'world' // 世界观
  | 'character' // 角色创建
  | 'plot' // 情节编织
  | 'drafting' // 写作工坊
  | 'echo' // Echo 审查
  | 'global'; // 全局设置
```

## 子组件

### EffectBadge

显示 prompt 的生效层级：

```tsx
import { EffectBadge, getEffectLevel } from './components/PromptPanel';

// 使用
<EffectBadge level="PROJECT" size="sm" />;

// 自动计算层级
const level = getEffectLevel(hasModuleOverride, hasProjectOverride);
```

层级说明：

- 🟢 **DEFAULT** - 使用系统预设
- 🟡 **PROJECT** - 项目级覆盖
- 🔴 **MODULE** - 当前模块特化

### PromptBadge

折叠状态徽章：

```tsx
import { PromptBadge } from './components/PromptPanel';

<PromptBadge
  availableCount={12}
  modifiedCount={3}
  onClick={() => setShowPanel(true)}
  compact={true}
/>;
```

### ParameterControl

参数控制组件：

```tsx
import { ParameterControl, ParameterConfig } from './components/PromptPanel';

const config: ParameterConfig = {
  key: 'creativity',
  label: '创意度',
  type: 'slider',
  min: 0,
  max: 1,
  step: 0.1,
  value: 0.7,
  onChange: (val) => setCreativity(val),
};

<ParameterControl config={config} />;
```

支持的参数类型：

- `slider` - 滑块控制
- `select` - 下拉选择
- `toggle` - 开关切换

## 集成到现有项目

### 替换 PromptTuner

```tsx
// 旧代码
import { PromptTuner } from './components/PromptTuner';

{
  showTuner && <PromptTuner onClose={() => setShowTuner(false)} />;
}

// 新代码
import { PromptPanel } from './components/PromptPanel';
import { PROMPT_REGISTRY_LITERARY, PROMPT_REGISTRY_WEB_NOVEL } from './config/prompts';

const activeRegistry =
  project.creativeSettings?.promptProfile === 'WEB_NOVEL'
    ? PROMPT_REGISTRY_WEB_NOVEL
    : PROMPT_REGISTRY_LITERARY;

{
  showTuner && (
    <PromptPanel
      isModal
      prompts={Object.values(activeRegistry)}
      projectOverrides={project.customPrompts}
      onSave={(key, content) => {
        updateProject({
          customPrompts: { ...project.customPrompts, [key]: content },
        });
      }}
      onReset={(key) => {
        const updated = { ...project.customPrompts };
        delete updated[key];
        updateProject({ customPrompts: updated });
      }}
      onResetAll={() => {
        updateProject({ customPrompts: {} });
      }}
      onClose={() => setShowTuner(false)}
    />
  );
}
```

### 在模块中使用

```tsx
import { PromptPanel, MODULE_PROMPT_MAP } from './components/PromptPanel';

// 世界观模块
const worldPrompts = Object.values(PROMPT_REGISTRY_LITERARY).filter((p) =>
  MODULE_PROMPT_MAP.world.includes(p.key)
);

<PromptPanel
  mode="collapsed"
  moduleType="world"
  prompts={worldPrompts}
  projectOverrides={project.customPrompts}
  onSave={handleSave}
  onReset={handleReset}
/>;
```

## 样式定制

组件使用 Tailwind CSS，与现有暗色主题风格一致：

- 背景：`bg-slate-800/40`
- 边框：`border-slate-700/60`
- 强调色：`purple-500` (主题色), `orange-400` (交互), `amber-400` (警告)

## 最佳实践

1. **层级优先级**：MODULE > PROJECT > DEFAULT
2. **使用 compact 模式**在工具栏中快速访问
3. **使用模态框模式**进行完整编辑
4. **按模块筛选**相关 prompts 以减少干扰
