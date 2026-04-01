# TemplatePreview 组件

> 实时预览合并后的模板效果

## 快速开始

```tsx
import React, { useState } from 'react';
import { TemplatePreview } from './TemplatePreview';
import { mergeTemplateConfig } from '../../services/templateMerge';

/**
 * 基本用法示例
 */
export const BasicExample = () => {
  const [variableValues, setVariableValues] = useState({
    genre: '玄幻',
    mainCharacter: '李逍遥',
  });

  // 合并模板配置
  const mergedResult = mergeTemplateConfig(
    'scene_generation',
    null, // 项目级覆盖
    null  // 用户级偏好
  );

  return (
    <TemplatePreview
      mergedResult={mergedResult}
      variableValues={variableValues}
      defaultExpanded={true}
      showVariables={true}
      showSources={true}
      enableLivePreview={true}
    />
  );
};

/**
 * 带覆盖的示例
 */
export const OverrideExample = () => {
  const projectOverride = {
    templateId: 'scene_generation',
    systemInstruction: '自定义系统指令...',
    blocks: {
    genre_info: {
      blockId: 'genre_info',
      template: '[类型]: {{genre}}\n[风格]: {{style}}',
      order: 1,
    },
  },
  variableDefaults: {
    targetWordCount: 5000,
  },
  };

  const mergedResult = mergeTemplateConfig(
    'scene_generation',
    projectOverride,
    null
  );

  return (
    <TemplatePreview
      mergedResult={mergedResult}
      defaultExpanded={true}
      showSources={true}
    />
  );
};
```

## API 雛成
组件通过 `PromptPanel/index.ts` 导出:

## 类型定义
- `TemplatePreviewProps`: 组件属性接口
- `BlockPreview`: 区块预览数据结构

## 核心功能
1. **模板预览**
   - 显示合并后的 system prompt
   - 显示合并后的 user prompt blocks
   - 支持变量渲染预览
   - Token 估算

2. **高亮覆盖**
   - 项目级覆盖使用紫色背景
   - 显示来源标记(默认/项目/用户)
   - "已覆盖"徽章

3. **复制功能**
   - 复制系统指令
   - 复制单个区块
   - 复制完整提示
   - 复制成功反馈
4. **变量管理**
   - 显示变量列表
   - 显示变量值
   - 标记必填变量
   - 显示变量来源
5. **交互功能**
   - 可折叠面板
   - 切换原始/渲染视图
   - 滚动内容
   - 响应式设计

## 属性
- `mergedResult`: 合并后的模板结果(必需)
- `variableValues`: 变量值对象(可选)
- `defaultExpanded`: 是否默认展开(默认: false)
- `maxHeight`: 最大高度(默认: 600px)
- `showVariables`: 是否显示变量列表(默认: true)
- `showSources`: 是否显示来源标记(默认: true)
- `enableLivePreview`: 是否启用实时预览(默认: true)

## 示例
查看 `TemplatePreview.example.tsx` 获取完整示例。

## 样式
组件使用 Tailwind CSS，与现有代码库风格一致:
- 暗色主题(slate-800/900)
- 紫色强调色(purple-500/600)
- 响应式设计
- 流畅的过渡动画
