# 世界观模板 (World Templates) 详细分析

**分析日期**: 2026-03-31
**模板来源**: `config/templates/world.ts`
**模板数量**: 6 个

---

## 模板清单

| # | ID | 名称 | 分类 | 区块数 | 变量数 | 复杂度 |
|---|----|------|------|--------|--------|--------|
| 1 | `batch_generate_settings` | 批量生成设定 | generation | 3 | 5 | ⭐⭐ 简单 |
| 2 | `expand_world_lore` | 扩展世界传说 | refinement | 3 | 3 | ⭐⭐ 简单 |
| 3 | `analyze_state_changes` | 分析状态变化 | analysis | 4 | 4 | ⭐⭐⭐ 中等 |
| 4 | `extract_echoes` | 提取回声 | analysis | 4 | 3 | ⭐⭐⭐ 中等 |
| 5 | `consolidate_memory` | 整合记忆 | refinement | 4 | 4 | ⭐⭐ 简单 |
| 6 | `deduce_world_consequences` | 推导世界后果 | analysis | 5 | 4 | ⭐⭐⭐ 中等 |

---

## 1. batch_generate_settings (批量生成设定) ⭐⭐

### 基本信息
- **ID**: `batch_generate_settings`
- **名称**: Batch Generate World Settings
- **分类**: generation
- **版本**: 1.0.0
- **描述**: 基于故事上下文批量生成世界观设定/传说条目

### System Prompt
```
You are a world-building expert for novels and creative writing...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~100 字
- **核心角色定义**: 世界构建专家，创建沉浸式世界设定

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `story_context` | 故事上下文 | context | user_input | 无 | ✅ |
| 2 | `category_guidance` | 分类指导 | constraint | user_input | `categoryGuidance != null && categoryGuidance !== ""` | ✅ |
| 3 | `general_requirements` | 通用要求 | task | static | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 默认值 | 描述 |
|--------|------|--------|------|------|--------|------|
| `premise` | string | critical | user_input | ✅ | - | 故事前提 |
| `genre` | string | critical | project_state | ✅ | - | 小说类型 |
| `category` | string | critical | user_input | ✅ | - | 设定分类 |
| `count` | number | critical | user_input | ✅ | 5 | 生成条目数 |
| `categoryGuidance` | string | optional | user_input | ❌ | - | 分类特定指导 |

### 变量统计
- **Critical**: 4 个
- **Important**: 0 个
- **Optional**: 1 个
- **总计**: 5 个变量

---

## 2. expand_world_lore (扩展世界传说) ⭐⭐

### 基本信息
- **ID**: `expand_world_lore`
- **名称**: Expand World Lore
- **分类**: refinement
- **版本**: 1.0.0
- **描述**: 扩展和深化现有世界设定条目

### System Prompt
```
You are a world-building specialist focused on deepening and enriching existing world lore...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~100 字
- **核心角色定义**: 世界构建专家，专注于深化和丰富现有传说

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `genre_context` | 类型上下文 | context | user_input | 无 | ✅ |
| 2 | `current_content` | 当前设定内容 | context | user_input | 无 | ✅ |
| 3 | `task_requirements` | 任务要求 | task | static | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `genre` | string | critical | project_state | ✅ | 小说类型 |
| `title` | string | critical | user_input | ✅ | 设定标题 |
| `currentContent` | string | critical | user_input | ✅ | 当前设定内容 |

### 变量统计
- **Critical**: 3 个
- **Important**: 0 个
- **Optional**: 0 个
- **总计**: 3 个变量

---

## 3. analyze_state_changes (分析状态变化) ⭐⭐⭐

### 基本信息
- **ID**: `analyze_state_changes`
- **名称**: Analyze State Changes
- **分类**: analysis
- **版本**: 1.0.0
- **描述**: 从场景内容中提取状态变化建议（角色状态/世界环境）

### System Prompt
```
You are a professional novel setting analyst...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~100 字
- **核心角色定义**: 小说设定分析师，识别永久性事件

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `context` | 上下文信息 | context | computed | `contextSection != null \|\| foreshadowingSection != null` | ✅ |
| 2 | `lookup_table` | 实体映射表 | context | computed | 无 | ✅ |
| 3 | `scene_content` | 待分析文本 | task | user_input | 无 | ✅ |
| 4 | `task_requirements` | 提取要求 | constraint | static | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `sceneContent` | string | critical | user_input | ✅ | 场景内容文本 |
| `lookupTable` | string | critical | computed | ✅ | 实体映射表 |
| `contextSection` | string | optional | computed | ❌ | 前文背景 |
| `foreshadowingSection` | string | optional | computed | ❌ | 待回收伏笔 |

### 变量统计
- **Critical**: 2 个
- **Important**: 0 个
- **Optional**: 2 个
- **总计**: 4 个变量

### 重大事件判定标准
1. **永久角色状态变化**: 死亡、残疾、获得/失去能力
2. **获得情节重要物品**: 影响未来情节的非普通物品
3. **定性关系变化**: 盟友变敌人、新关系、关系破裂
4. **世界规则改变/破坏**: 重要地点毁灭、权力结构变化
5. **秘密揭露**: 影响未来情节的重要信息

### 置信度评分
- 0.9-1.0: 非常确定，文本明确描述
- 0.7-0.9: 相当确定，合理推断
- 0.5-0.7: 大致确定，多种可能解释
- <0.5: 不确定，建议不提取

---

## 4. extract_echoes (提取回声) ⭐⭐⭐

### 基本信息
- **ID**: `extract_echoes`
- **名称**: Extract Echoes
- **分类**: analysis
- **版本**: 1.0.0
- **描述**: 从小说文本中自动提取Echo事件（状态变化），支持知识图谱集成

### System Prompt
```
You are an expert narrative analyst specializing in tracking story continuity and state changes...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~80 字
- **核心角色定义**: 叙事分析专家，追踪故事连续性和状态变化

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `entity_lookup` | 实体参考 | context | computed | 无 | ✅ |
| 2 | `text_content` | 小说文本片段 | task | user_input | 无 | ✅ |
| 3 | `recent_changes` | 最近确认变化 | context | computed | `recentChangesSummary != null && recentChangesSummary !== ""` | ✅ |
| 4 | `extraction_requirements` | 提取要求 | constraint | static | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `text` | string | critical | user_input | ✅ | 小说正文 |
| `lookupTable` | string | critical | computed | ✅ | 实体映射表 |
| `recentChangesSummary` | string | optional | computed | ❌ | 最近状态变化摘要 |

### 变量统计
- **Critical**: 2 个
- **Important**: 0 个
- **Optional**: 1 个
- **总计**: 3 个变量

### Echo 输出字段
- `targetId`: 匹配实体ID
- `targetName`: 实体名称
- `description`: 发生了什么
- `reason`: 为何重要
- `confidence`: 0-1置信度
- `extractionEvidence`: 原文引用
- `triples`: 知识图谱三元组数组

---

## 5. consolidate_memory (整合记忆) ⭐⭐

### 基本信息
- **ID**: `consolidate_memory`
- **名称**: Consolidate Memory
- **分类**: refinement
- **版本**: 1.0.0
- **描述**: 将近期事件（Echoes）整合到实体描述中作为长期记忆

### System Prompt
```
You are an archivist responsible for maintaining novel world consistency...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~100 字
- **核心角色定义**: 档案管理员，维护小说世界一致性

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `entity_info` | 实体信息 | context | user_input | 无 | ✅ |
| 2 | `current_description` | 当前归档描述 | context | user_input | 无 | ✅ |
| 3 | `new_memories` | 待整合新记忆 | context | computed | 无 | ✅ |
| 4 | `task_requirements` | 整合要求 | constraint | static | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `targetName` | string | critical | user_input | ✅ | 实体名称 |
| `targetType` | string | critical | user_input | ✅ | 实体类型（CHARACTER/WORLD） |
| `currentDescription` | string | critical | user_input | ✅ | 当前描述 |
| `echoText` | string | critical | computed | ✅ | 待整合的事件列表 |

### 变量统计
- **Critical**: 4 个
- **Important**: 0 个
- **Optional**: 0 个
- **总计**: 4 个变量

### 整合规则
1. **更新状态**: 反映状态变化（伤害、失去物品、获得能力）
2. **丰富背景**: 将发生的事件写成"过去历史"
3. **保持连贯**: 重写描述使其流畅自然
4. **简化**: 删除不再重要的细节

---

## 6. deduce_world_consequences (推导世界后果) ⭐⭐⭐

### 基本信息
- **ID**: `deduce_world_consequences`
- **名称**: Deduce World Consequences
- **分类**: analysis
- **版本**: 1.0.0
- **描述**: 基于近期事件使用蝴蝶效应逻辑预测连锁反应和后果

### System Prompt
```
You are an omniscient world simulator (World Engine)...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~100 字
- **核心角色定义**: 全知世界模拟器（世界引擎）

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `genre_context` | 类型上下文 | context | computed | 无 | ✅ |
| 2 | `trigger_events` | 触发事件 | context | computed | 无 | ✅ |
| 3 | `entity_lookup` | 可用实体 | context | computed | 无 | ✅ |
| 4 | `graph_context` | 知识图谱上下文 | context | computed | `graphContext != null && graphContext !== ""` | ✅ |
| 5 | `deduction_requirements` | 推理要求 | constraint | static | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `genre` | string | critical | project_state | ✅ | 小说类型 |
| `triggers` | string | critical | computed | ✅ | 触发事件列表 |
| `lookupTable` | string | critical | computed | ✅ | 实体映射表 |
| `graphContext` | string | optional | computed | ❌ | 知识图谱上下文 |

### 变量统计
- **Critical**: 3 个
- **Important**: 0 个
- **Optional**: 1 个
- **总计**: 4 个变量

### 推理规则
1. **蝴蝶效应**: 小事件可引发大变化（国王被刺 → 继位战争 → 内战）
2. **实体匹配**: 必须从映射表选择受影响实体
3. **图谱集成**: 使用知识图谱中的角色关系（仇恨、亲属、从属）
4. **逻辑一致性**: 推理必须符合世界设定
5. **制造冲突**: 预测结果应增加故事张力和冲突

---

## 世界观模板总结

### 复杂度分布
| 复杂度级别 | 模板数量 | 模板列表 |
|------------|----------|----------|
| ⭐⭐⭐ 中等 | 3 | `analyze_state_changes`, `extract_echoes`, `deduce_world_consequences` |
| ⭐⭐ 简单 | 3 | `batch_generate_settings`, `expand_world_lore`, `consolidate_memory` |

### 共性模式
1. **实体映射表**: 分析类模板都依赖 `lookupTable` 进行实体匹配
2. **条件上下文**: 使用 `condition` 控制可选上下文区块的显示
3. **静态约束区块**: `*_requirements` 区块通常是静态的任务定义
4. **知识图谱集成**: `extract_echoes` 和 `deduce_world_consequences` 支持三元组输出

### 特殊机制
1. **Echo 系统集成**: `extract_echoes` → `consolidate_memory` 形成记忆整合链
2. **蝴蝶效应推理**: `deduce_world_consequences` 使用知识图谱进行关系推理
3. **置信度评分**: 分析类模板使用 0-1 置信度评分机制

### 变量来源分布
| 来源类型 | 使用次数 | 模板示例 |
|----------|----------|----------|
| user_input | 10 | `premise`, `sceneContent`, `text` |
| computed | 12 | `lookupTable`, `triggers`, `echoText` |
| project_state | 5 | `genre` |
| static | 0 | - |

### 可编辑性评估
| 模板 | System Prompt | 区块模板 | 变量定义 | 总体风险 |
|------|--------------|----------|----------|----------|
| batch_generate_settings | 低 | 低 | 低 | 低 |
| expand_world_lore | 低 | 低 | 低 | 低 |
| analyze_state_changes | 中 | 中 | 中 | 中 |
| extract_echoes | 中 | 中 | 中 | 中 |
| consolidate_memory | 低 | 低 | 低 | 低 |
| deduce_world_consequences | 中 | 中 | 中 | 中 |

### 抽象层编辑建议
1. **实体映射表**需要可视化编辑器支持
2. **知识图谱上下文**需要关联图谱可视化
3. **条件表达式**需要表达式编辑器（支持 `!=null && !==""` 模式）
4. **置信度评分**可作为配置项调整阈值

---

*文档创建时间: 2026-03-31*
*最后更新: 2026-03-31*
