# 审核模板 (Audit Templates) 详细分析

**分析日期**: 2026-03-31
**模板来源**: `config/templates/audit.ts`
**模板数量**: 4 个

---

## 模板清单

| # | ID | 名称 | 分类 | 区块数 | 变量数 | 复杂度 |
|---|----|------|------|--------|--------|--------|
| 1 | `audit_plot` | 剧情审核 | analysis | 4 | 3 | ⭐⭐ 简单 |
| 2 | `audit_chapter_plan` | 章节计划审核 | analysis | 3 | 4 | ⭐⭐⭐ 中等 |
| 3 | `extract_knowledge_triples` | 提取知识三元组 | analysis | 2 | 1 | ⭐⭐ 简单 |
| 4 | `audit_chapter_content` | 章节内容审核 | analysis | 3 | 10 | ⭐⭐⭐ 中等 |

---

## 1. audit_plot (剧情审核) ⭐⭐

### 基本信息
- **ID**: `audit_plot`
- **名称**: Audit Plot
- **分类**: analysis
- **版本**: 1.0.0
- **描述**: 深度剧情审核，检查逻辑、节奏和一致性

### System Prompt
```
You are a senior narrative analyst specializing in plot logic, pacing, and story structure...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~100 字
- **核心角色定义**: 资深叙事分析师，专精剧情逻辑、节奏和故事结构

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `core_premise` | 核心前提 | context | user_input | 无 | ✅ |
| 2 | `context` | 角色和世界上下文 | context | computed | `contextStr != null && contextStr !== ""` | ✅ |
| 3 | `current_plot` | 当前剧情大纲 | context | user_input | 无 | ✅ |
| 4 | `audit_instructions` | 审核任务 | constraint | static | 无 | ✅ |

### 审核维度
| 维度 | 检查内容 |
|------|----------|
| 逻辑一致性 | 剧情漏洞、矛盾、不合理事件 |
| 角色动机 | 行为是否符合既定性格和目标 |
| 节奏分析 | 叙事节奏是否合适，有无拖沓或仓促 |
| 世界观一致性 | 是否遵守已建立的世界规则 |
| 叙事结构 | 情节拍之间的因果关系是否清晰 |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `premise` | string | critical | user_input | ✅ | 故事核心前提/梗概 |
| `contextStr` | string | important | computed | ❌ | 角色和世界上下文 |
| `currentPlot` | string | critical | user_input | ✅ | 待审核的当前剧情大纲 |

### 变量统计
- **Critical**: 2 个
- **Important**: 1 个
- **Optional**: 0 个
- **总计**: 3 个变量

### 输出要求
- Markdown 格式报告
- 必须包含"可操作建议列表"用于自动修复流程

---

## 2. audit_chapter_plan (章节计划审核) ⭐⭐⭐

### 基本信息
- **ID**: `audit_chapter_plan`
- **名称**: Audit Chapter Plan
- **分类**: analysis
- **版本**: 1.0.0
- **描述**: 审核章节计划的对齐性、偏离度和逻辑矛盾

### System Prompt
```
You are a senior chapter planner and narrative structure...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~80 字
- **核心角色定义**: 资深章节规划师和叙事结构专家

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `core_premise` | 核心前提 | context | user_input | 无 | ✅ |
| 2 | `chapters` | 章节计划 | context | user_input | 无 | ✅ |
| 3 | `audit_task` | 审核任务 | constraint | static | 无 | ✅ |

### 审核类型
| 类型 | 描述 |
|------|------|
| align (对齐检查) | 章节计划是否完成情节节点设定的所有核心目标 |
| drift (偏离检测) | 是否引入与主线无关的支线，或偏离角色动机 |
| contradiction (逻辑矛盾) | 章节之间是否存在逻辑不一致 |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `genre` | string | critical | project_state | ✅ | 小说类型 |
| `targetNode` | object | critical | user_input | ✅ | 目标情节节点 |
| `chapters` | object | critical | user_input | ✅ | 待审核的章节计划数组 |
| `premise` | string | important | user_input | ❌ | 故事核心前提 |

### 变量统计
- **Critical**: 3 个
- **Important**: 1 个
- **Optional**: 0 个
- **总计**: 4 个变量

### 输出格式
```json
{
  "is_aligned": true/false,
  "issues": [
    {
      "type": "gap/drift/contradiction",
      "description": "问题描述",
      "suggestion": "修复建议"
    }
  ]
}
```

---

## 3. extract_knowledge_triples (提取知识三元组) ⭐⭐

### 基本信息
- **ID**: `extract_knowledge_triples`
- **名称**: Extract Knowledge Triples
- **分类**: analysis
- **版本**: 1.0.0
- **描述**: 从文本中提取知识三元组（主语-谓语-宾语）用于知识图谱

### System Prompt
```
You are a knowledge graph extraction specialist...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~100 字
- **核心角色定义**: 知识图谱提取专家

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `content` | 待提取内容 | task | user_input | 无 | ✅ |
| 2 | `format_requirements` | 格式要求 | format | static | 无 | ✅ |

### 提取要素
| 要素 | 描述 |
|------|------|
| 实体 | URI兼容格式 (e.g., "ex:character:name") |
| 关系 | 特定类型: "knows", "hates", "fears", "enemy_of", "respects", "trusts", "dislikes" |
| 属性 | age, occupation, personality[], goals[], physical{}, location{} |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `content` | string | critical | user_input | ✅ | 待提取知识三元组的内容文本 |

### 变量统计
- **Critical**: 1 个
- **Important**: 0 个
- **Optional**: 0 个
- **总计**: 1 个变量

### 输出格式
```
Triple 1: <subject> <predicate> <object>
Triple 2: <subject> <predicate> <object>
...
```

---

## 4. audit_chapter_content (章节内容审核) ⭐⭐⭐

### 基本信息
- **ID**: `audit_chapter_content`
- **名称**: Audit Chapter Content
- **分类**: analysis
- **版本**: 1.0.0
- **描述**: 审核章节内容的质量、一致性和参与度

### System Prompt
```
You are a senior editor and narrative analyst...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~80 字
- **核心角色定义**: 资深编辑和叙事分析师

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `chapter_content` | 章节内容 | task | user_input | 无 | ✅ |
| 2 | `audit_focus` | 审核重点 | task | user_input | 无 | ✅ |
| 3 | `context` | 上下文 | context | derived | 无 | ✅ |

### 审核重点选项
| 选项 | 描述 | 默认值 |
|------|------|--------|
| `focusPacing` | 关注节奏分析 | true |
| `focusCharacters` | 关注角色一致性 | true |
| `focusPlot` | 关注剧情逻辑 | true |
| `focusEngagement` | 关注读者参与度 | true |
| `focusAll` | 全面审核所有领域 | false |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 默认值 | 描述 |
|--------|------|--------|------|------|--------|------|
| `content` | string | critical | user_input | ✅ | - | 待审核的章节内容 |
| `focusPacing` | boolean | optional | user_input | ❌ | true | 关注节奏分析 |
| `focusCharacters` | boolean | optional | user_input | ❌ | true | 关注角色一致性 |
| `focusPlot` | boolean | optional | user_input | ❌ | true | 关注剧情逻辑 |
| `focusEngagement` | boolean | optional | user_input | ❌ | true | 关注读者参与度 |
| `focusAll` | boolean | optional | user_input | ❌ | false | 全面审核 |
| `genre` | string | optional | project_state | ❌ | - | 小说类型 |
| `styleGuide` | string | optional | project_state | ❌ | - | 风格指南 |
| `premise` | string | optional | project_state | ❌ | - | 故事前提 |
| `characters` | string | optional | project_state | ❌ | - | 角色信息 |

### 变量统计
- **Critical**: 1 个
- **Important**: 0 个
- **Optional**: 9 个
- **总计**: 10 个变量

---

## 审核模板总结

### 复杂度分布
| 复杂度级别 | 模板数量 | 模板列表 |
|------------|----------|----------|
| ⭐⭐⭐ 中等 | 2 | `audit_chapter_plan`, `audit_chapter_content` |
| ⭐⭐ 简单 | 2 | `audit_plot`, `extract_knowledge_triples` |

### 共性模式
1. **JSON 输出**: `audit_chapter_plan` 要求严格的 JSON 输出格式
2. **Markdown 输出**: `audit_plot` 要求 Markdown 格式报告
3. **可选上下文**: 大量使用 optional 变量提供参考上下文
4. **布尔开关**: `audit_chapter_content` 使用多个布尔变量控制审核重点

### 审核维度对比
| 模板 | 逻辑一致性 | 角色一致性 | 节奏分析 | 世界观一致性 | 参与度 |
|------|-----------|-----------|----------|-------------|--------|
| audit_plot | ✅ | ✅ | ✅ | ✅ | ❌ |
| audit_chapter_plan | ✅ | ✅ | ❌ | ❌ | ❌ |
| audit_chapter_content | ✅ | ✅ | ✅ | ❌ | ✅ |

### 变量来源分布
| 来源类型 | 使用次数 | 模板示例 |
|----------|----------|----------|
| user_input | 8 | `premise`, `content`, `chapters` |
| project_state | 6 | `genre`, `styleGuide`, `characters` |
| computed | 1 | `contextStr` |
| derived | 1 | `context` |

### 可编辑性评估
| 模板 | System Prompt | 区块模板 | 变量定义 | 总体风险 |
|------|--------------|----------|----------|----------|
| audit_plot | 低 | 低 | 低 | 低 |
| audit_chapter_plan | 低 | 低 | 低 | 低 |
| extract_knowledge_triples | 低 | 低 | 低 | 低 |
| audit_chapter_content | 低 | 低 | 中 | 低 |

### 抽象层编辑建议
1. **审核重点开关**: `audit_chapter_content` 的布尔开关可使用复选框组件
2. **问题类型枚举**: `audit_chapter_plan` 的 gap/drift/contradiction 可配置
3. **关系类型列表**: `extract_knowledge_triples` 的关系类型可扩展
4. **输出格式**: 不同模板有不同的输出格式要求，需要格式验证

### 特殊机制
1. **自动修复流程**: `audit_plot` 的输出需要包含可操作建议列表
2. **JSON 严格输出**: `audit_chapter_plan` 要求纯 JSON，无开场白
3. **知识图谱集成**: `extract_knowledge_triples` 直接服务于知识图谱构建

---

*文档创建时间: 2026-03-31*
*最后更新: 2026-03-31*
