# PromptPreviewDrawer 使用指南

## 概述

`PromptPreviewDrawer` 是一个用于在高级模式下展示完整 Prompt 组装过程的抽屉式组件。它从右侧滑入，展示各个上下文模块，支持折叠/展开每个模块，并显示 Token 统计。

## 功能特性

- ✅ 抽屉式展示（从右侧滑入）
- ✅ 展示各个上下文模块（指令、记忆、图谱、上下文等）
- ✅ 支持折叠/展开每个模块
- ✅ 显示 Token 统计
- ✅ 复制完整 Prompt
- ✅ 深色主题 + 毛玻璃效果
- ✅ 平滑动画

## 安装

组件已经包含在 `components/PromptPanel` 中，可以直接导入使用：

```typescript
import { PromptPreviewDrawer } from '../components/PromptPanel';
import type { PromptPreviewDrawerProps } from '../components/PromptPanel';
```

## 基本使用

```typescript
import React, { useState } from 'react';
import { PromptPreviewDrawer } from '../components/PromptPanel';
import { AppSection } from '../types';

const MyComponent: React.FC = () => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const projectContext = {
        chapters: [], // 章节数据
        characters: [], // 角色数据
        worldSettings: [], // 世界设定数据
        echoes: [], // 回声数据
        plotOutline: '', // 情节大纲
        activeChapterId: 'chapter-1',
        activeCharacters: [],
        activeSettings: [],
        physicalStatus: [],
        unresolvedForeshadowing: [],
        graphContext: '图谱上下文内容'
    };

    const creativeSettings = {
        tone: '史诗',
        style: '文学',
        creativity: 0.8,
        targetAudience: '成年读者'
    };

    return (
        <div>
            <button onClick={() => setIsDrawerOpen(true)}>
                预览 Prompt
            </button>

            <PromptPreviewDrawer
                promptKey="writing_base"
                moduleId={AppSection.DRAFTING}
                creativeSettings={creativeSettings}
                projectContext={projectContext}
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
            />
        </div>
    );
};
```

## Props 参数

### PromptPreviewDrawerProps

| 参数               | 类型                | 必填 | 说明                |
| ------------------ | ------------------- | ---- | ------------------- |
| `promptKey`        | `string`            | ✅   | 要预览的 Prompt key |
| `moduleId`         | `AppSection`        | ✅   | 当前模块 ID         |
| `creativeSettings` | `CreativeSettings?` | ❌   | 创作设置            |
| `projectContext`   | `object`            | ✅   | 项目上下文数据      |
| `isOpen`           | `boolean`           | ✅   | 是否打开抽屉        |
| `onClose`          | `() => void`        | ✅   | 关闭抽屉的回调      |

### projectContext 结构

```typescript
{
    chapters: Chapter[];              // 章节列表
    characters: Character[];          // 角色列表
    worldSettings: WorldSetting[];    // 世界设定列表
    echoes: Echo[];                   // 回声列表
    plotOutline?: string;             // 情节大纲
    activeChapterId?: string;         // 当前活跃章节 ID
    activeCharacters?: Character[];   // 活跃角色列表
    activeSettings?: WorldSetting[];  // 活跃设定列表
    physicalStatus?: any[];           // 物理状态
    unresolvedForeshadowing?: any[];  // 未解决的伏笔
    graphContext?: string;            // 知识图谱上下文
}
```

## 上下文模块说明

组件会展示以下 7 个上下文模块：

1. **基础系统指令** - AI 的基本角色设定
2. **分层记忆上下文**
   - L1: 当前场景上下文
   - L2: 章节级上下文
   - L3: 项目全局上下文
3. **知识图谱上下文** - 知识图谱中的关系数据
4. **活跃上下文** - 活跃的角色和设定
5. **回声上下文** - 待处理的回声
6. **用户意图** - 当前操作和意图
7. **创作设置** - 创作风格和参数

## Token 统计

组件会在底部显示 Token 统计面板，包括：

- 总 Tokens 数量
- 模块数量

## 样式定制

组件使用 Tailwind CSS，采用深色主题和毛玻璃效果：

- 背景色: `bg-slate-900/95`
- 毛玻璃效果: `backdrop-blur-xl`
- 边框: `border-slate-700/50`
- 文字: `text-slate-200`, `text-slate-300`, `text-slate-400`

## 高级用法

### 与 PromptPanel 集成

```typescript
import { PromptPanel, PromptPreviewDrawer } from '../components/PromptPanel';

const PromptManager: React.FC = () => {
    const [showPreview, setShowPreview] = useState(false);
    const [selectedPromptKey, setSelectedPromptKey] = useState('');

    const handlePreviewPrompt = (key: string) => {
        setSelectedPromptKey(key);
        setShowPreview(true);
    };

    return (
        <>
            <PromptPanel
                moduleId={AppSection.DRAFTING}
                onPromptChange={(key, value, params) => {
                    // 可以在这里添加预览按钮
                }}
            />

            <PromptPreviewDrawer
                promptKey={selectedPromptKey}
                moduleId={AppSection.DRAFTING}
                projectContext={projectContext}
                isOpen={showPreview}
                onClose={() => setShowPreview(false)}
            />
        </>
    );
};
```

### 复制完整 Prompt

组件提供了复制功能，用户可以点击"复制完整 Prompt"按钮将完整的 Prompt 文本复制到剪贴板。

## 相关服务

### PromptAssemblyService

`PromptAssemblyService` 是负责组装 Prompt 的服务类，提供以下方法：

```typescript
// 组装完整的 Prompt 上下文
PromptAssemblyService.assembleContext(
    promptKey: string,
    creativeSettings: any,
    projectContext: any,
    moduleId: string
): PromptAssemblyContext

// 计算总 Token 数
PromptAssemblyService.calculateTotalTokens(
    context: PromptAssemblyContext
): number

// 组装完整的 Prompt 文本
PromptAssemblyService.assembleFullPromptText(
    context: PromptAssemblyContext
): string
```

## 类型定义

所有类型定义都在 `types/advancedMode.ts` 中：

- `PromptAssemblyContext` - Prompt 组装上下文
- `ContextSection` - 上下文模块
- `TieredMemoryContext` - 分层记忆上下文
- `PromptPreviewDrawerProps` - 组件属性
- `ContextModuleCardProps` - 模块卡片属性
- `TokenStats` - Token 统计

## 注意事项

1. 确保传入的 `projectContext` 数据完整，以便正确组装 Prompt
2. Token 估算是基于简化算法（中文 1.5 字/token，英文 4 字符/token）
3. 组件会在打开时自动重新组装 Prompt
4. 复制功能需要浏览器支持 Clipboard API

## 示例项目

查看 `components/DraftingRoom/ForgeSidebar.tsx` 中的实际使用示例。

## 更新日志

### v1.0.0 (2026-03-26)

- ✨ 初始版本发布
- ✅ 实现基础功能
- ✅ 支持 7 个上下文模块展示
- ✅ Token 统计功能
- ✅ 复制完整 Prompt 功能
