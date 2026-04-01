# 角色模板 (Character Templates) 详细分析

**分析日期**: 2026-03-31
**模板来源**: `config/templates/character.ts`
**模板数量**: 3 个

---

## 模板清单

| # | ID | 名称 | 分类 | 区块数 | 变量数 | 复杂度 |
|---|----|------|------|--------|--------|--------|
| 1 | `batch_generate_characters` | 批量生成角色 | generation | 3 | 3 | ⭐⭐ 简单 |
| 2 | `generate_single_character` | 生成单个角色 | generation | 3 | 5 | ⭐⭐ 简单 |
| 3 | `shura_field_conflict` | 修罗场冲突 | generation | 5 | 14 | ⭐⭐⭐⭐ 复杂 |

---

## 1. batch_generate_characters (批量生成角色) ⭐⭐

### 基本信息
- **ID**: `batch_generate_characters`
- **名称**: Batch Generate Characters
- **分类**: generation
- **版本**: 1.0.0
- **描述**: 基于故事前提和类型批量生成多个角色

### System Prompt
```
You are an expert character designer for novels and creative writing...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~100 字
- **核心角色定义**: 角色设计专家，创建多维度角色

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `story_context` | 故事上下文 | context | user_input | 无 | ✅ |
| 2 | `character_config` | 角色配置要求 | task | static | 无 | ✅ |
| 3 | `core_requirements` | 核心要求 | constraint | static | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `premise` | string | critical | user_input | ✅ | 故事前提/梗概 |
| `genre` | string | critical | project_state | ✅ | 小说类型 |
| `settingText` | string | critical | project_state | ✅ | 世界设定描述 |

### 变量统计
- **Critical**: 3 个
- **Important**: 0 个
- **Optional**: 0 个
- **总计**: 3 个变量

---

## 2. generate_single_character (生成单个角色) ⭐⭐

### 基本信息
- **ID**: `generate_single_character`
- **名称**: Generate Single Character
- **分类**: generation
- **版本**: 1.0.0
- **描述**: 生成单个详细角色，包含深度字段（欲望、恐惧、签名、弱点、阵营）

### System Prompt
```
You are an expert character designer for novels...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~100 字
- **核心角色定义**: 角色设计专家，创建心理深度角色

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `story_context` | 故事上下文 | context | computed | 无 | ✅ |
| 2 | `character_basics` | 角色基础信息 | context | user_input | 无 | ✅ |
| 3 | `generation_requirements` | 生成要求 | task | static | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 描述 |
|--------|------|--------|------|------|------|
| `name` | string | critical | user_input | ✅ | 角色名称 |
| `role` | string | critical | user_input | ✅ | 角色定位（主角/反派/导师等） |
| `premise` | string | critical | user_input | ✅ | 故事梗概 |
| `genre` | string | critical | project_state | ✅ | 小说类型 |
| `settingText` | string | optional | computed | ❌ | 风格要求 |

### 变量统计
- **Critical**: 4 个
- **Important**: 0 个
- **Optional**: 1 个
- **总计**: 5 个变量

### 特色字段
- **desire**: 核心欲望
- **fear**: 核心恐惧
- **signature**: 签名特征
- **weakness**: 弱点/缺陷
- **alignment**: 道德阵营（守序善良/混乱邪恶等）

---

## 3. shura_field_conflict (修罗场冲突) ⭐⭐⭐⭐

### 基本信息
- **ID**: `shura_field_conflict`
- **名称**: Shura Field Conflict
- **分类**: generation
- **版本**: 1.0.0
- **描述**: 生成高密度多角色冲突场景，包含多层对抗和反转

### System Prompt
```
You are a master conflict scene designer specializing in multi-character confrontations...
```
- **可编辑**: ✅ 完全可编辑
- **字数**: ~120 字
- **核心角色定义**: 冲突场景设计大师，专精多角色对抗

### User Prompt 区块分析

| # | 区块ID | 标题 | 层级 | 数据来源 | 条件表达式 | 可编辑 |
|---|--------|------|------|----------|------------|--------|
| 1 | `character_profiles` | 角色档案 | context | computed | 无 | ✅ |
| 2 | `location_context` | 场景地点 | context | computed | `locationContext != null && locationContext !== ""` | ✅ |
| 3 | `world_context` | 世界约束 | context | computed | `worldContext != null && worldContext !== ""` | ✅ |
| 4 | `plot_background` | 剧情背景 | context | user_input | 无 | ✅ |
| 5 | `generation_requirements` | 生成要求 | constraint | derived | 无 | ✅ |

### 变量分析

| 变量名 | 类型 | 重要性 | 来源 | 必填 | 默认值 | 描述 |
|--------|------|--------|------|------|--------|------|
| `characterContext` | string | critical | computed | ✅ | - | 格式化的角色档案 |
| `plotContext` | string | critical | user_input | ✅ | - | 情节背景 |
| `intensityLevel` | number | critical | user_input | ✅ | 7 | 冲突强度(1-10) |
| `participantCount` | number | critical | computed | ✅ | - | 参与人数 |
| `relatedCharacterIds` | string | critical | computed | ✅ | - | JSON数组格式的角色ID |
| `intensityDescription` | string | critical | computed | ✅ | - | 强度等级描述 |
| `genre` | string | important | project_state | ❌ | - | 小说类型 |
| `worldContext` | string | important | computed | ❌ | - | 世界观约束 |
| `locationContext` | string | optional | computed | ❌ | - | 场景地点 |
| `relatedLocationId` | string | optional | computed | ❌ | '' | 地点ID数组 |
| `allCharacters` | object | optional | project_state | ❌ | - | 全部角色列表 |
| `worldSettings` | object | optional | project_state | ❌ | - | 世界观设定 |
| `locationId` | string | optional | user_input | ❌ | - | 指定地点ID |
| `selectedCharacters` | object | optional | user_input | ❌ | - | 选中的角色数组 |

### 变量统计
- **Critical**: 6 个
- **Important**: 2 个
- **Optional**: 6 个
- **总计**: 14 个变量

### 冲突类型定义
- **CONFRONTATION**: 直接对抗、争论、谈判
- **CLIMAX**: 高潮冲突、决定性时刻
- **TWIST**: 反转冲突、真相揭露、背叛

### 输出格式
```json
{
  "title": "情节标题（突出核心冲突）",
  "content": "详细的多角色冲突场景描述",
  "beatTag": "CLIMAX | PLOT_POINT_2 | MIDPOINT",
  "relatedCharacters": ["id1", "id2"],
  "relatedLocations": ["locId"],
  "conflictScenario": {
    "type": "CONFRONTATION | CLIMAX | TWIST",
    "participants": ["id1", "id2"],
    "stakes": "核心赌注",
    "intensity": 7
  }
}
```

---

## 角色模板总结

### 复杂度分布
| 复杂度级别 | 模板数量 | 模板列表 |
|------------|----------|----------|
| ⭐⭐⭐⭐ 复杂 | 1 | `shura_field_conflict` |
| ⭐⭐ 简单 | 2 | `batch_generate_characters`, `generate_single_character` |

### 共性模式
1. **Context-Task-Constraint 三层结构**: 所有模板都遵循此结构
2. **静态任务描述**: `*_requirements` 区块通常是静态的，包含生成规则
3. **项目状态变量**: `genre` 是通用的重要上下文变量
4. **用户输入核心变量**: 角色名、定位、情节背景等

### 特殊机制
1. **shura_field_conflict** 的动态参数注入：
   - `participantCount` 和 `intensityLevel` 直接嵌入模板
   - 使用 derived 数据源进行参数计算

### 可编辑性评估
| 模板 | System Prompt | 区块模板 | 变量定义 | 总体风险 |
|------|--------------|----------|----------|----------|
| batch_generate_characters | 低 | 低 | 低 | 低 |
| generate_single_character | 低 | 低 | 低 | 低 |
| shura_field_conflict | 中 | 中 | 高 | 中 |

### 抽象层编辑建议
1. **shura_field_conflict** 需要表达式编辑器支持动态参数注入
2. 冲突类型（CONFRONTATION/CLIMAX/TWIST）可以作为枚举变量配置
3. 强度等级需要关联描述映射表

---

*文档创建时间: 2026-03-31*
*最后更新: 2026-03-31*
