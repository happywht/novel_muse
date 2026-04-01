# 剧情模板 (Plot Templates) 详细分析

**分析日期**: 2026-03-31
**模板来源**: `config/templates/plot.ts`
**模板数量**: 6 个

---

## 模板清单

| # | ID | 名称 | 分类 | 区块数 | 变量数 | 复杂度 |
|---|----|------|------|--------|--------|--------|
| 1 | `generate_plot` | 生成剧情 | generation | 6 | 6 | ⭐⭐⭐ 中等 |
| 2 | `rewrite_plot` | 重写剧情 | refinement | 5 | 5 | ⭐⭐⭐ 中等 |
| 3 | `analyze_plot_rhythm` | 分析剧情节奏 | analysis | 3 | 1 | ⭐⭐ 简单 |
| 4 | `split_plot_node_into_chapters` | 拆分章节 | generation | 5 | 6 | ⭐⭐⭐⭐ 复杂 |
| 5 | `regenerate_chapter_outline` | 重新生成章节大纲 | refinement | 8 | 7 | ⭐⭐⭐⭐ 复杂 |
| 6 | `generate_twist_hooks` | 生成转折钩子 | generation | 4 | 2 | ⭐⭐ 简单 |

---

## 1. generate_plot (生成剧情) ⭐⭐⭐

### 基本信息
- **ID**: `generate_plot`
- **名称**: Generate Plot Outline
- **分类**: generation
- **版本**: 1.0.0
- **描述**: 基于故事上下文和元素生成结构化剧情大纲

### System Prompt
```
You are a master storyteller and narrative architect...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~100 字
- **核心角色定义**: 故事大师和叙事架构师

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `core_premise` | 核心前提 | context | user_input | 无 | ✅ |
| 2 | `character_info` | 角色信息 | context | computed | `contextStr != null && contextStr !== ""` | ✅ |
| 3 | `world_settings` | 世界设定 | context | computed | `relevantSettings != null && relevantSettings !== ""` | ✅ |
| 4 | `graph_context` | 知识图谱上下文 | context | computed | `graphContext != null && graphContext !== ""` | ✅ |
| 5 | `lookup_table` | 参考信息 | context | computed | `lookupTable != null && lookupTable !== ""` | ✅ |
| 6 | `task_requirements` | 任务要求 | task | static | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `premise` | string | critical | user_input | ✅ | 故事前提/梗概 |
| `genre` | string | critical | project_state | ✅ | 小说类型 |
| `template` | string | critical | user_input | ✅ | 剧情结构模板 |
| `contextStr` | string | important | computed | ❌ | 角色上下文和关系 |
| `relevantSettings` | string | important | computed | ❌ | 相关世界设定 |
| `graphContext` | string | optional | computed | ❌ | 知识图谱上下文 |
| `lookupTable` | string | optional | computed | ❌ | 参考映射表 |

### 变量统计
- **Critical**: 3 个
- **Important**: 2 个
- **Optional**: 2 个
- **总计**: 6 个变量（文档中只列出7个，实际代码有7个）

---

## 2. rewrite_plot (重写剧情) ⭐⭐⭐

### 基本信息
- **ID**: `rewrite_plot`
- **名称**: Rewrite Plot
- **分类**: refinement
- **版本**: 1.0.0
- **描述**: 基于修改指令重写现有剧情大纲

### System Prompt
```
You are a narrative revision specialist...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~80 字
- **核心角色定义**: 叙事修订专家

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `genre_context` | 类型上下文 | context | computed | 无 | ✅ |
| 2 | `character_context` | 角色上下文 | context | computed | `contextStr != null && contextStr !== ""` | ✅ |
| 3 | `lookup_table` | 参考信息 | context | computed | `lookupTable != null && lookupTable !== ""` | ✅ |
| 4 | `current_plot` | 当前剧情 | context | user_input | 无 | ✅ |
| 5 | `modification_directive` | 修改指令 | task | user_input | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `genre` | string | critical | project_state | ✅ | 小说类型 |
| `currentPlot` | string | critical | user_input | ✅ | 当前剧情大纲 |
| `directive` | string | critical | user_input | ✅ | 修改指令 |
| `contextStr` | string | important | computed | ❌ | 角色上下文 |
| `lookupTable` | string | optional | computed | ❌ | 参考映射表 |

### 变量统计
- **Critical**: 3 个
- **Important**: 1 个
- **Optional**: 1 个
- **总计**: 5 个变量

---

## 3. analyze_plot_rhythm (分析剧情节奏) ⭐⭐

### 基本信息
- **ID**: `analyze_plot_rhythm`
- **名称**: Analyze Plot Rhythm
- **分类**: analysis
- **版本**: 1.0.0
- **描述**: 分析剧情大纲节奏和张力曲线

### System Prompt
```
You are an expert story analyst specializing in narrative pacing and tension dynamics...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~60 字
- **核心角色定义**: 故事分析专家，专精叙事节奏和张力动态

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `task_description` | 分析任务 | task | static | 无 | ✅ |
| 2 | `plot_content` | 剧情大纲 | context | computed | 无 | ✅ |
| 3 | `output_format` | 输出格式 | format | static | 无 | ✅ |

### 张力评分标准
| 分数范围 | 含义 |
|----------|------|
| 0-20 | 平静、铺垫、日常生活 |
| 21-40 | 小波澜、伏笔、对话 |
| 41-60 | 冲突升级、障碍出现 |
| 61-80 | 重大转折、危机、战斗 |
| 81-100 | 终极高潮、生死存亡、核心揭秘 |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `plotOutline` | string | critical | project_state | ✅ | 完整剧情大纲 |

### 变量统计
- **Critical**: 1 个
- **Important**: 0 个
- **Optional**: 0 个
- **总计**: 1 个变量

### 输出格式
```json
[
  {
    "beat": "章节名称或关键情节",
    "tension": 0-100,
    "description": "此节拍简述"
  }
]
```

---

## 4. split_plot_node_into_chapters (拆分章节) ⭐⭐⭐⭐

### 基本信息
- **ID**: `split_plot_node_into_chapters`
- **名称**: Split Plot Node Into Chapters
- **分类**: generation
- **版本**: 1.0.0
- **描述**: 将情节拍拆分为详细章节大纲，包含场景节拍

### System Prompt
```
You are a master story architect specializing in chapter structure and scene beats...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~80 字
- **核心角色定义**: 故事架构大师，专精章节结构和场景节拍

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `genre_info` | 类型信息 | context | computed | 无 | ✅ |
| 2 | `global_context` | 全局故事上下文 | context | computed | 无 | ✅ |
| 3 | `character_context` | 角色和世界上下文 | context | computed | 无 | ✅ |
| 4 | `target_node` | 目标情节拍 | task | user_input | 无 | ✅ |
| 5 | `task_requirements` | 任务要求 | constraint | static | 无 | ✅ |

### 场景节拍类型
| 类型 | 含义 |
|------|------|
| CONTENT | 铺垫/描述 |
| ACTION | 动作/事件 |
| DIALOGUE | 关键对话 |
| TWIST | 转折/悬念 |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `genre` | string | critical | project_state | ✅ | 小说类型 |
| `fullPlotSummary` | string | critical | project_state | ✅ | 全局剧情概览 |
| `targetNode` | object | critical | user_input | ✅ | 待拆分的情节节点 |
| `contextStr` | string | important | computed | ❌ | 格式化的角色和世界上下文 |
| `fissionCount` | number | optional | user_input | ❌ | 拆分章节数量 |
| `countInstruction` | string | important | computed | ❌ | 格式化的数量指令 |

### 变量统计
- **Critical**: 3 个
- **Important**: 2 个
- **Optional**: 1 个
- **总计**: 6 个变量

---

## 5. regenerate_chapter_outline (重新生成章节大纲) ⭐⭐⭐⭐

### 基本信息
- **ID**: `regenerate_chapter_outline`
- **名称**: Regenerate Chapter Outline
- **分类**: refinement
- **版本**: 1.0.0
- **描述**: 基于上下文重新生成单个章节大纲

### System Prompt
```
You are a skilled story editor specializing in chapter revision...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~60 字
- **核心角色定义**: 故事编辑专家，专精章节修订

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `genre_info` | 类型信息 | context | computed | 无 | ✅ |
| 2 | `global_context` | 全局故事上下文 | context | computed | 无 | ✅ |
| 3 | `character_context` | 角色和世界上下文 | context | computed | 无 | ✅ |
| 4 | `parent_node` | 父情节拍 | context | user_input | 无 | ✅ |
| 5 | `previous_chapter` | 上一章 | context | computed | `previousChapter != null` | ✅ |
| 6 | `next_chapter` | 下一章 | context | computed | `nextChapter != null` | ✅ |
| 7 | `current_chapter` | 待重写章节 | task | user_input | 无 | ✅ |
| 8 | `task_requirements` | 任务要求 | constraint | static | 无 | ✅ |

### 区块依赖关系图
```
genre_info ─────────────────────────────────────────┐
                                                    │
global_context ─────────────────────────────────────┤
                                                    │
character_context ──────────────────────────────────┤ 上下文层
                                                    │
parent_node ◄── targetNode ─────────────────────────┤
                                                    │
previous_chapter ◄── 存在时显示 ────────────────────┤
                                                    │
next_chapter ◄── 存在时显示 ────────────────────────┤
                                                    │
current_chapter ◄── chapterToRewrite ───────────────┤ 任务层
                                                    │
task_requirements ──────────────────────────────────┘ 约束层
```

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `genre` | string | critical | project_state | ✅ | 小说类型 |
| `fullPlotSummary` | string | critical | project_state | ✅ | 全局剧情概览 |
| `targetNode` | object | critical | user_input | ✅ | 父情节节点 |
| `chapterToRewrite` | object | critical | user_input | ✅ | 待重写章节 |
| `previousChapter` | object | important | project_state | ❌ | 上一章（连续性） |
| `nextChapter` | object | important | project_state | ❌ | 下一章（连续性） |
| `contextStr` | string | important | computed | ❌ | 角色和世界上下文 |

### 变量统计
- **Critical**: 4 个
- **Important**: 3 个
- **Optional**: 0 个
- **总计**: 7 个变量

---

## 6. generate_twist_hooks (生成转折钩子) ⭐⭐

### 基本信息
- **ID**: `generate_twist_hooks`
- **名称**: Generate Twist Hooks
- **分类**: generation
- **版本**: 1.0.0
- **描述**: 生成剧情转折灵感和戏剧性钩子

### System Prompt
```
You are a master story planner specializing in dramatic twists and narrative hooks...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~80 字
- **核心角色定义**: 故事规划大师，专精戏剧转折和叙事钩子

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `requirements` | 要求 | constraint | static | 无 | ✅ |
| 2 | `story_context` | 故事上下文 | context | computed | 无 | ✅ |
| 3 | `plot_target` | 情节目标 | task | user_input | 无 | ✅ |
| 4 | `output_format` | 输出格式 | format | static | 无 | ✅ |

### 转折要求标准
1. **逻辑性**: 意料之外但情理之中
2. **戏剧性**: 瞬间提升张力或改变角色动态
3. **风格匹配**: 适应类型（玄幻/都市/悬疑等）

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `context` | string | critical | project_state | ✅ | 故事背景和记忆上下文 |
| `plotBeat` | string | critical | user_input | ✅ | 目标情节拍 |

### 变量统计
- **Critical**: 2 个
- **Important**: 0 个
- **Optional**: 0 个
- **总计**: 2 个变量

### 输出格式
```
1. 转折构思1
2. 转折构思2
3. 转折构思3
```

---

## 剧情模板总结

### 复杂度分布
| 复杂度级别 | 模板数量 | 模板列表 |
|------------|----------|----------|
| ⭐⭐⭐⭐ 复杂 | 2 | `split_plot_node_into_chapters`, `regenerate_chapter_outline` |
| ⭐⭐⭐ 中等 | 2 | `generate_plot`, `rewrite_plot` |
| ⭐⭐ 简单 | 2 | `analyze_plot_rhythm`, `generate_twist_hooks` |

### 共性模式
1. **全局剧情概览**: 大多数模板依赖 `fullPlotSummary` 保持连续性
2. **角色上下文**: 使用 `contextStr` 提供角色和世界上下文
3. **知识图谱集成**: `generate_plot` 和 `rewrite_plot` 支持知识图谱上下文
4. **条件上下文区块**: 前后章、图谱上下文等使用条件渲染

### 章节生成链
```
generate_plot ──────────────────────────────────────────► 生成剧情大纲
      │
      ▼
split_plot_node_into_chapters ──────────────────────────► 拆分为章节大纲
      │
      ▼
regenerate_chapter_outline ◄── 可迭代重写 ──────────────► 优化单个章节
```

### 变量来源分布
| 来源类型 | 使用次数 | 模板示例 |
|----------|----------|----------|
| project_state | 12 | `genre`, `fullPlotSummary`, `plotOutline` |
| user_input | 10 | `premise`, `targetNode`, `directive` |
| computed | 9 | `contextStr`, `graphContext`, `lookupTable` |
| static | 0 | - |

### 可编辑性评估
| 模板 | System Prompt | 区块模板 | 变量定义 | 总体风险 |
|------|--------------|----------|----------|----------|
| generate_plot | 低 | 低 | 低 | 低 |
| rewrite_plot | 低 | 低 | 低 | 低 |
| analyze_plot_rhythm | 低 | 低 | 低 | 低 |
| split_plot_node_into_chapters | 中 | 中 | 中 | 中 |
| regenerate_chapter_outline | 中 | 中 | 中 | 中 |
| generate_twist_hooks | 低 | 低 | 低 | 低 |

### 抽象层编辑建议
1. **章节数量** (`fissionCount`) 需要数值输入组件
2. **场景节拍类型** (CONTENT/ACTION/DIALOGUE/TWIST) 可配置为枚举
3. **张力评分标准** 可作为可配置的评分量表
4. **前后章条件** 需要支持 `!= null` 条件表达式编辑

---

*文档创建时间: 2026-03-31*
*最后更新: 2026-03-31*
