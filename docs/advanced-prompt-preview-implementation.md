# 高级模式 + 完整 Prompt 预览功能实施记录

## 实施日期

2026-03-26

## 概述

实现了高级模式架构和完整 Prompt 预览功能，允许用户在高级模式下查看 AI 生成正文前的完整 prompt 组装过程。

---

## 完成的任务

### Phase 1: Prompt 配置修复

#### 1.1 添加遗漏的 Prompt Keys

**文件**: `config/prompts.ts`

新增 3 个之前遗漏的 prompt keys:

| Prompt Key       | 模块   | 用途                    |
| ---------------- | ------ | ----------------------- |
| `shura_field`    | PLOT   | 修罗场/多角博弈场景生成 |
| `world_building` | WORLD  | 世界观深度扩充          |
| `echo_analysis`  | ECHOES | 状态变更分析器          |

#### 1.2 更新 MODULE_PROMPT_MAPPING

**文件**: `types/promptPanel.ts`

更新后的模块映射:

```typescript
PLOT: [
  'plot_weaving',
  'plot_rewrite',
  'plot_analysis',
  'audit_plot',
  'plot_node_gen',
  'shura_field',
];
WORLD: ['world_gen', 'world_building'];
ECHOES: ['world_echo_extraction', 'echo_analysis'];
```

---

### Phase 2: 高级模式基础设施

#### 2.1 类型定义

**新建文件**: `types/advancedMode.ts`

定义了完整的类型系统:

- `ModuleId` - 模块标识符（8个模块）
- `AdvancedFeature` - 功能标识符（15个功能）
- `AdvancedModeConfig` - 完整配置接口
- `ContextSection` - 上下文区块定义
- `PromptAssemblyContext` - 完整 Prompt 组装上下文

#### 2.2 增强 useAdvancedMode Hook

**修改文件**: `hooks/useAdvancedMode.ts`

增强功能:

1. **功能级别控制** - `toggleFeature()` 和 `isFeatureEnabled()` 方法
2. **模块关联** - 可选的 `moduleId` 参数
3. **localStorage 持久化** - 完整配置持久化
4. **向后兼容** - 自动迁移旧版本的简单布尔值存储

---

### Phase 3: Prompt 组装服务

#### 3.1 PromptAssemblyService

**新建文件**: `services/promptAssembly.ts`

核心功能:

- `assembleContext()` - 组装完整 Prompt 上下文
- `calculateTotalTokens()` - 计算总 Token 数
- `assembleFullPromptText()` - 组装完整 Prompt 文本
- Token 估算算法（中文 1.5 字/token，英文 4 字符/token）

---

### Phase 4: PromptPreviewDrawer 组件

#### 4.1 主组件

**新建文件**: `components/PromptPanel/PromptPreviewDrawer.tsx`

功能特性:

- 抽屉式展示（从右侧滑入，宽度 600px）
- 7 个上下文模块展示
- 折叠/展开交互
- Token 统计面板
- 复制完整 Prompt 功能
- 深色主题 + 毛玻璃效果 + 平滑动画

#### 4.2 上下文模块

| 模块            | 来源                        | 说明                     |
| --------------- | --------------------------- | ------------------------ |
| 1️⃣ 基础系统指令 | `config/prompts.ts`         | 用户可编辑的 instruction |
| 2️⃣ 分层记忆     | `buildTieredMemory()`       | L1/L2/L3 三层上下文      |
| 3️⃣ 知识图谱     | `graphContext`              | 角色关系和事件链         |
| 4️⃣ 活跃上下文   | `activeCharacters/Settings` | 当前场景的角色和设定     |
| 5️⃣ 命运回响     | `Echo[]`                    | 已接受的状态变更         |
| 6️⃣ 用户意图     | `plotBeat`                  | 本次生成的情节目标       |
| 7️⃣ 创作设置     | `CreativeSettings`          | 风格、类型等元数据       |

---

### Phase 5: Forge 模块集成

#### 5.1 ForgeSidebar 集成

**修改文件**: `components/DraftingRoom/ForgeSidebar.tsx`

集成内容:

- 导入 `PromptPreviewDrawer` 和 `useAdvancedMode`
- 添加 `showPreviewDrawer` 状态管理
- 在 Prompt Tab 中添加"查看完整 Prompt 预览"按钮
- 按钮仅在高级模式下显示
- 传递必要的项目上下文数据

---

## 文件变更汇总

### 新建文件 (4个)

| 文件                                             | 大小  | 说明             |
| ------------------------------------------------ | ----- | ---------------- |
| `types/advancedMode.ts`                          | 9.6KB | 高级模式类型定义 |
| `services/promptAssembly.ts`                     | 11KB  | Prompt 组装服务  |
| `components/PromptPanel/PromptPreviewDrawer.tsx` | 16KB  | 预览抽屉组件     |
| `docs/PromptPreviewDrawer-usage.md`              | 6.7KB | 使用指南         |

### 修改文件 (4个)

| 文件                                       | 变更说明                    |
| ------------------------------------------ | --------------------------- |
| `config/prompts.ts`                        | 添加 3 个遗漏的 prompt keys |
| `types/promptPanel.ts`                     | 更新 MODULE_PROMPT_MAPPING  |
| `hooks/useAdvancedMode.ts`                 | 增强功能级别控制            |
| `components/DraftingRoom/ForgeSidebar.tsx` | 集成预览组件                |

---

## 使用方法

### 启用高级模式

```typescript
// 全局开关
const { isAdvancedMode, toggle } = useAdvancedMode();

// 功能级别控制
const { isFeatureEnabled } = useAdvancedMode();
if (isFeatureEnabled('prompt-preview.drawer')) {
  // 显示预览按钮
}
```

### 在 Forge 模块中使用

1. 进入「自动工坊」模块
2. 启用高级模式（设置面板）
3. 右侧栏切换到「Prompt」Tab
4. 点击「查看完整 Prompt 预览」按钮
5. 查看完整的 prompt 组装过程

---

## 构建验证

```bash
npm run build  # ✅ 成功
```

---

## 后续优化建议

1. **语法高亮** - 为 Prompt 内容添加语法高亮显示
2. **历史记录** - 记录之前生成的 Prompt 以便对比
3. **A/B 测试** - 支持对比不同 prompt 配置的效果
4. **导出功能** - 支持导出完整 Prompt 为文件
5. **性能优化** - 使用 React Query 缓存组装结果

---

_文档生成日期: 2026-03-26_
_对应代码版本: feature/character-knowledge-graph_
