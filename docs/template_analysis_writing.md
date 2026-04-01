# 写作模板 (Writing Templates) 详细分析

**分析日期**: 2026-03-31
**模板来源**: `config/templates/writing.ts`
**模板数量**: 8 个

---

## 模板清单

| # | ID | 名称 | 分类 | 区块数 | 变量数 | 复杂度 |
|---|----|------|------|--------|--------|--------|
| 1 | `scene_generation` | 场景生成 | generation | 11 | 21 | ⭐⭐⭐⭐⭐ 最高 |
| 2 | `expand_scene` | 场景扩写 | generation | 4 | 5 | ⭐⭐ 简单 |
| 3 | `rewrite_local` | 局部重写 | refinement | 4 | 5 | ⭐⭐ 简单 |
| 4 | `summarize_chapter` | 章节摘要 | utility | 2 | 2 | ⭐ 最简单 |
| 5 | `balance_suggestions` | 平衡建议 | utility | 3 | 3 | ⭐⭐ 简单 |
| 6 | `writing_base` | 写作基础 | generation | 1 | 1 | ⭐ 最简单 |
| 7 | `polish_draft` | 草稿润色 | refinement | 2 | 2 | ⭐ 最简单 |
| 8 | `chat_with_persona` | 角色对话 | utility | 3 | 7 | ⭐⭐⭐ 中等 |

---

## 1. scene_generation (场景生成) ⭐⭐⭐⭐⭐

### 基本信息
- **ID**: `scene_generation`
- **名称**: Scene Generation
- **分类**: generation
- **版本**: 1.0.0
- **描述**: 基于配料系统的完整场景生成，用于小说创作

### System Prompt
```
You are a master novelist with deep expertise in creative writing, narrative structure, and genre conventions...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~150 字
- **核心角色定义**: 资深小说家，精通创意写作、叙事结构和类型惯例

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `genre_info` | 类型信息 | context | computed | 无 | ✅ |
| 2 | `global_context` | 全局故事弧 | context | computed | `rollingSummary != null && rollingSummary !== ""` | ✅ |
| 3 | `tiered_memory` | 分层记忆 | context | computed | 无 | ✅ |
| 4 | `logic_anchors` | 逻辑锚点 | context | computed | `physicalStatus != null && physicalStatus.length > 0` | ✅ |
| 5 | `chekhov_gun` | 契诃夫之枪 | context | computed | `unresolvedForeshadowing != null && unresolvedForeshadowing.length > 0` | ✅ |
| 6 | `active_settings` | 活跃设定 | context | user_input | `activeSettings != null && activeSettings.length > 0` | ✅ |
| 7 | `world_context` | 世界上下文 | context | computed | `relevantSettings != null && relevantSettings.length > 0` | ✅ |
| 8 | `core_constraints` | 核心约束 | constraint | computed | 无 | ✅ |
| 9 | `twist_hook` | 转折钩子 | task | user_input | `twistHook != null && twistHook !== ""` | ✅ |
| 10 | `plot_beat` | 情节拍 | task | user_input | 无 | ✅ |
| 11 | `quality_constraints` | 质量约束 | constraint | static | 无 | ✅ |

### 区块依赖关系图
```
genre_info ─────────────────────────────────────────────┐
                                                        │
global_context ◄── rollingSummary存在 ─────────────────┤
                                                        │
tiered_memory ◄── tieredContext存在 ───────────────────┤
                                                        │
logic_anchors ◄── physicalStatus.length > 0 ───────────┤
                                                        │
chekhov_gun ◄── unresolvedForeshadowing.length > 0 ────┤ 上下文层
                                                        │
active_settings ◄── activeSettings.length > 0 ─────────┤
                                                        │
world_context ◄── relevantSettings.length > 0 ─────────┤
                                                        │
core_constraints ◄── povName/pacingInstruction ────────┤
                                                        │
twist_hook ◄── twistHook存在 ──────────────────────────┤ 任务层
plot_beat ──────────────────────────────────────────────┤
                                                        │
quality_constraints ────────────────────────────────────┘ 约束层
```

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 默认值 | 描述 |
|--------|------|--------|------|------|--------|------|
| `genre` | string | critical | project_state | ✅ | - | 小说类型 |
| `plotBeat` | string | critical | user_input | ✅ | - | 场景情节目标 |
| `genreContext` | string | critical | computed | ✅ | - | 类型规则 |
| `rollingSummary` | string | important | project_state | ❌ | - | 全局故事摘要 |
| `tieredContext` | string | important | computed | ❌ | - | 分层记忆上下文 |
| `physicalStatus` | object | important | computed | ❌ | - | 角色物理状态数组 |
| `unresolvedForeshadowing` | object | important | computed | ❌ | - | 未解决伏笔数组 |
| `activeSettings` | object | important | user_input | ❌ | - | 活跃世界设定 |
| `relevantSettings` | object | important | computed | ❌ | - | RAG过滤的世界设定 |
| `pacingInstruction` | string | important | computed | ❌ | `[Pacing Control: Balanced Progression]...` | 节奏控制指令 |
| `povName` | string | important | user_input | ❌ | - | POV角色名 |
| `targetWordCount` | number | important | user_input | ❌ | 3000 | 目标字数 |
| `twistHook` | string | optional | user_input | ❌ | - | 情节转折指令 |
| `activeCharacters` | object | optional | user_input | ❌ | - | 活跃角色数组 |
| `allWorldSettings` | object | optional | project_state | ❌ | - | 全部世界设定 |
| `previousStoryContext` | string | optional | computed | ❌ | - | 前文上下文 |
| `echoes` | object | optional | project_state | ❌ | - | 状态变化回声 |
| `activeChapterId` | string | optional | user_input | ❌ | - | 当前章节ID |
| `pacing` | string | optional | user_input | ❌ | BALANCED | 节奏模式 |
| `settings` | object | optional | project_state | ❌ | - | 创意设置 |
| `graphContext` | string | optional | computed | ❌ | - | 知识图谱上下文 |

### 变量统计
- **Critical**: 3 个 (`genre`, `plotBeat`, `genreContext`)
- **Important**: 9 个
- **Optional**: 9 个
- **总计**: 21 个变量

### 可编辑性评估
| 组件 | 可编辑 | 影响范围 | 风险等级 |
|------|--------|----------|----------|
| System Prompt | ✅ | 模型行为、写作风格 | 中 |
| 区块模板 | ✅ | 输出格式、信息呈现 | 低 |
| 区块条件 | ✅ | 区块显示逻辑 | 中 |
| 变量定义 | ✅ | 数据绑定 | 高 |
| 变量默认值 | ✅ | 回退行为 | 低 |

---

## 2. expand_scene (场景扩写) ⭐⭐

### 基本信息
- **ID**: `expand_scene`
- **名称**: Expand Scene
- **分类**: generation
- **版本**: 1.0.0
- **描述**: 从前提和情节大纲扩写场景

### System Prompt
```
You are a creative writing assistant specializing in scene expansion...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~80 字
- **核心角色定义**: 创意写作助手，专精场景扩写

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `story_context` | 故事上下文 | context | derived | 无 | ✅ |
| 2 | `context_info` | 角色和世界上下文 | context | computed | `contextStr != null && contextStr !== ""` | ✅ |
| 3 | `plot_outline` | 情节大纲 | context | user_input | 无 | ✅ |
| 4 | `writing_task` | 写作任务 | task | user_input | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `genre` | string | critical | project_state | ✅ | 小说类型 |
| `premise` | string | critical | user_input | ✅ | 核心前提 |
| `plotOutline` | string | critical | user_input | ✅ | 当前情节大纲 |
| `userPrompt` | string | critical | user_input | ✅ | 具体写作任务 |
| `contextStr` | string | important | computed | ❌ | 格式化的上下文字符串 |

### 变量统计
- **Critical**: 4 个
- **Important**: 1 个
- **Optional**: 0 个
- **总计**: 5 个变量

---

## 3. rewrite_local (局部重写) ⭐⭐

### 基本信息
- **ID**: `rewrite_local`
- **名称**: Rewrite Local Text
- **分类**: refinement
- **版本**: 1.0.0
- **描述**: 基于上下文的局部文本重写

### System Prompt
```
You are an expert text revision assistant for novels...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~100 字
- **核心角色定义**: 小说文本修订专家

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `genre_context` | 类型上下文 | context | computed | 无 | ✅ |
| 2 | `user_instructions` | 用户指令 | task | user_input | 无 | ✅ |
| 3 | `surrounding_context` | 周围上下文 | context | user_input | 无 | ✅ |
| 4 | `text_to_rewrite` | 待重写文本 | constraint | static | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `genre` | string | critical | project_state | ✅ | 小说类型 |
| `selectedText` | string | critical | user_input | ✅ | 待重写的文本 |
| `instruction` | string | critical | user_input | ✅ | 重写指令 |
| `contextBefore` | string | important | user_input | ❌ | 选区前文 |
| `contextAfter` | string | important | user_input | ❌ | 选区后文 |

### 变量统计
- **Critical**: 3 个
- **Important**: 2 个
- **Optional**: 0 个
- **总计**: 5 个变量

---

## 4. summarize_chapter (章节摘要) ⭐

### 基本信息
- **ID**: `summarize_chapter`
- **名称**: Summarize Chapter
- **分类**: utility
- **版本**: 1.0.0
- **描述**: 生成简洁的章节摘要

### System Prompt
```
You are a professional literary editor...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~80 字
- **核心角色定义**: 专业文学编辑

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `chapter_info` | 章节信息 | context | user_input | 无 | ✅ |
| 2 | `summary_requirements` | 摘要要求 | constraint | static | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `title` | string | critical | user_input | ✅ | 章节标题 |
| `content` | string | critical | user_input | ✅ | 章节内容 |

### 变量统计
- **Critical**: 2 个
- **Important**: 0 个
- **Optional**: 0 个
- **总计**: 2 个变量

---

## 5. balance_suggestions (平衡建议) ⭐⭐

### 基本信息
- **ID**: `balance_suggestions`
- **名称**: AI Balance Suggestions
- **分类**: utility
- **版本**: 1.0.0
- **描述**: 分析章节结构并提供优化建议

### System Prompt
```
You are a senior novel editor and structure consultant...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~100 字
- **核心角色定义**: 资深小说编辑和结构顾问

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `chapter_data` | 章节数据 | context | computed | 无 | ✅ |
| 2 | `context_info` | 上下文信息 | context | computed | 无 | ✅ |
| 3 | `analysis_requirements` | 分析要求 | task | static | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `chapterInfo` | string | critical | computed | ✅ | JSON格式章节信息 |
| `characterNames` | string | critical | computed | ✅ | 逗号分隔的角色名列表 |
| `plotBeatCount` | number | critical | computed | ✅ | 情节点数量 |

### 变量统计
- **Critical**: 3 个
- **Important**: 0 个
- **Optional**: 0 个
- **总计**: 3 个变量

---

## 6. writing_base (写作基础) ⭐

### 基本信息
- **ID**: `writing_base`
- **名称**: Writing Base
- **分类**: generation
- **版本**: 1.0.0
- **描述**: 通用基础文本生成模板

### System Prompt
```
You are a creative writing assistant...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~30 字
- **核心角色定义**: 创意写作助手

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `user_prompt` | 用户提示 | task | user_input | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `prompt` | string | critical | user_input | ✅ | 用户写作提示 |

### 变量统计
- **Critical**: 1 个
- **Important**: 0 个
- **Optional**: 0 个
- **总计**: 1 个变量

---

## 7. polish_draft (草稿润色) ⭐

### 基本信息
- **ID**: `polish_draft`
- **名称**: Polish Draft
- **分类**: refinement
- **版本**: 1.0.0
- **描述**: 润色和优化草稿内容

### System Prompt
```
You are an expert prose editor and stylist...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~80 字
- **核心角色定义**: 散文编辑和文体专家

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `polish_instructions` | 润色指令 | task | user_input | 无 | ✅ |
| 2 | `content_to_polish` | 待润色内容 | task | user_input | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `content` | string | critical | user_input | ✅ | 待润色的草稿内容 |
| `modeInstruction` | string | critical | user_input | ✅ | 润色模式指令 |

### 变量统计
- **Critical**: 2 个
- **Important**: 0 个
- **Optional**: 0 个
- **总计**: 2 个变量

---

## 8. chat_with_persona (角色对话) ⭐⭐⭐

### 基本信息
- **ID**: `chat_with_persona`
- **名称**: Chat With Persona
- **分类**: utility
- **版本**: 1.0.0
- **描述**: 与故事角色进行沉浸式角色扮演对话

### System Prompt
```
You are an immersive role-playing AI that embodies story characters...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~100 字
- **核心角色定义**: 沉浸式角色扮演AI

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `character_profile` | 角色档案 | context | derived | 无 | ✅ |
| 2 | `conversation_history` | 对话历史 | context | computed | `historyText != null && historyText !== ""` | ✅ |
| 3 | `current_message` | 当前消息 | task | user_input | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `characterName` | string | critical | user_input | ✅ | 角色名称 |
| `message` | string | critical | user_input | ✅ | 用户消息 |
| `characterRole` | string | important | project_state | ❌ | 角色定位 |
| `characterDescription` | string | important | project_state | ❌ | 角色描述 |
| `characterRelationships` | string | important | computed | ❌ | 人物关系 |
| `historyText` | string | optional | computed | ❌ | 对话历史 |

### 变量统计
- **Critical**: 2 个
- **Important**: 3 个
- **Optional**: 1 个
- **总计**: 7 个变量（文档中只列出了6个，需要核对源码）

---

## 写作模板总结

### 复杂度分布
| 复杂度级别 | 模板数量 | 模板列表 |
|------------|----------|----------|
| ⭐⭐⭐⭐⭐ 最高 | 1 | `scene_generation` |
| ⭐⭐⭐ 中等 | 1 | `chat_with_persona` |
| ⭐⭐ 简单 | 3 | `expand_scene`, `rewrite_local`, `balance_suggestions` |
| ⭐ 最简单 | 3 | `summarize_chapter`, `writing_base`, `polish_draft` |

### 共性模式
1. **Context-Task-Constraint 结构**: 大多数模板遵循"上下文 → 任务 → 约束"的层级结构
2. **条件渲染**: 使用 `condition` 表达式控制区块显示
3. **变量分层**: Critical/Important/Optional 三级重要性
4. **Handlebars 模板**: 使用 `{{variable}}` 和 `{{#each}}` 语法

### 抽象层编辑建议
1. **scene_generation** 是最复杂的模板，需要完整的区块编辑器支持
2. 条件表达式需要表达式编辑器
3. 变量管理需要类型验证和来源追踪
4. 建议实现区块拖拽排序功能

---

*文档创建时间: 2026-03-31*
*最后更新: 2026-03-31*
