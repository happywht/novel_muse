# Muse 知识图谱 Schema 设计文档

**版本**: v1.0.0
**设计日期**: 2026-03-21
**数据库**: Neo4j 5.x
**设计者**: 数据库专家团队

---

## 目录

1. [设计原则](#1-设计原则)
2. [节点类型规范](#2-节点类型规范)
3. [关系类型规范](#3-关系类型规范)
4. [跨模块关系设计](#4-跨模块关系设计)
5. [数据一致性约束](#5-数据一致性约束)
6. [扩展性设计](#6-扩展性设计)
7. [索引与约束](#7-索引与约束)
8. [Cypher CREATE 语句](#8-cypher-create-语句)
9. [ER 图描述](#9-er-图描述)
10. [版本兼容策略](#10-版本兼容策略)

---

## 1. 设计原则

### 1.1 核心原则

| 原则                       | 说明                               |
| -------------------------- | ---------------------------------- |
| **属性存实体，关系存图谱** | 节点存储实体属性，边存储关系元数据 |
| **双写保持兼容**           | 图谱与 MySQL 保持同步，支持回退    |
| **渐进式迁移**             | 新功能优先使用图谱，旧数据逐步迁移 |
| **分支隔离**               | 支持沙盒分支，便于实验性创作       |
| **创作者主权**             | AI 提取的关系需人工确认后生效      |

### 1.2 命名规范

```
节点标签:   PascalCase     (Character, WorldSetting, PlotNode)
关系类型:   SCREAMING_SNAKE_CASE  (ENEMY_OF, LOCATED_IN, INVOLVES)
属性名:     camelCase      (projectId, targetName, createdAt)
```

### 1.3 全局属性

所有节点必须包含以下全局属性：

| 属性名      | 类型   | 必需 | 说明                                                    |
| ----------- | ------ | ---- | ------------------------------------------------------- |
| `id`        | String | ✓    | 全局唯一标识符（UUID 或时间戳）                         |
| `projectId` | String | ✓    | 所属项目 ID，用于多租户隔离                             |
| `branchId`  | String |      | 分支 ID，默认 'main'                                    |
| `createdAt` | Long   | ✓    | 创建时间戳                                              |
| `updatedAt` | Long   |      | 最后更新时间戳                                          |
| `source`    | String |      | 数据来源：'STRUCTURED_DATA' / 'AI_EXTRACTED' / 'MANUAL' |

---

## 2. 节点类型规范

### 2.1 Character（角色）

**标签**: `:Character`

| 属性名        | 类型         | 必需 | 索引 | 说明                         |
| ------------- | ------------ | ---- | ---- | ---------------------------- |
| `id`          | String       | ✓    | ✓    | 唯一标识符                   |
| `projectId`   | String       | ✓    | ✓    | 项目 ID                      |
| `name`        | String       | ✓    | ✓    | 角色名称                     |
| `role`        | String       | ✓    |      | 角色定位（主角/反派/导师等） |
| `archetype`   | String       |      |      | 角色原型                     |
| `description` | String       |      |      | 详细描述（限 500 字符）      |
| `alignment`   | String       |      |      | 道德阵营                     |
| `tags`        | List[String] |      |      | 角色标签数组                 |
| `desire`      | String       |      |      | 核心欲望                     |
| `fear`        | String       |      |      | 核心恐惧                     |
| `signature`   | String       |      |      | 标志性特征                   |
| `contrast`    | String       |      |      | 反差萌点                     |
| `weakness`    | String       |      |      | 弱点/缺陷                    |
| `state`       | String       |      |      | 当前状态（正常/受伤/死亡）   |
| `isDead`      | Boolean      |      |      | 是否死亡                     |
| `branchId`    | String       |      |      | 分支 ID                      |
| `createdAt`   | Long         | ✓    |      | 创建时间                     |
| `updatedAt`   | Long         |      |      | 更新时间                     |

**Cypher 示例**:

```cypher
CREATE (c:Character {
  id: 'char_001',
  projectId: 'proj_123',
  name: '林远',
  role: '主角',
  archetype: '改革者',
  description: '楚国农业改革家，智慧超群',
  alignment: '守序善良',
  tags: ['高智商', '洁癖晚期', '口嫌体正直'],
  desire: '改变楚国落后的农业制度',
  fear: '改革失败导致百姓受苦',
  signature: '左手习惯性转玉扳指',
  contrast: '表面冷酷实则内心柔软',
  weakness: '不擅长处理人际关系',
  state: '正常',
  isDead: false,
  branchId: 'main',
  createdAt: timestamp(),
  source: 'STRUCTURED_DATA'
})
```

---

### 2.2 WorldSetting（世界设定）

**标签**: `:WorldSetting` + 动态分类标签（`:Geography`, `:Magic_Tech`, `:Society`, `:History`, `:Other`）

| 属性名       | 类型         | 必需 | 索引 | 说明                     |
| ------------ | ------------ | ---- | ---- | ------------------------ |
| `id`         | String       | ✓    | ✓    | 唯一标识符               |
| `projectId`  | String       | ✓    | ✓    | 项目 ID                  |
| `title`      | String       | ✓    | ✓    | 设定标题                 |
| `category`   | String       | ✓    |      | 分类                     |
| `content`    | String       |      |      | 详细内容（限 1000 字符） |
| `parentId`   | String       |      |      | 父级设定 ID              |
| `importance` | Integer      |      |      | 重要性等级 1-10          |
| `tags`       | List[String] |      |      | 设定标签                 |
| `branchId`   | String       |      |      | 分支 ID                  |
| `createdAt`  | Long         | ✓    |      | 创建时间                 |
| `updatedAt`  | Long         |      |      | 更新时间                 |

**Cypher 示例**:

```cypher
CREATE (w:WorldSetting:Geography {
  id: 'world_001',
  projectId: 'proj_123',
  title: '楚国',
  category: 'Geography',
  content: '南方大国，气候温润，农业发达',
  parentId: null,
  importance: 10,
  tags: ['主要舞台', '农业文明'],
  branchId: 'main',
  createdAt: timestamp()
})
```

---

### 2.3 PlotNode（情节节点）

**标签**: `:PlotNode`

| 属性名              | 类型    | 必需 | 索引 | 说明                                   |
| ------------------- | ------- | ---- | ---- | -------------------------------------- |
| `id`                | String  | ✓    | ✓    | 唯一标识符                             |
| `projectId`         | String  | ✓    | ✓    | 项目 ID                                |
| `title`             | String  | ✓    | ✓    | 情节标题                               |
| `content`           | String  |      |      | 情节内容/节拍描述                      |
| `order`             | Integer | ✓    | ✓    | 排序序号                               |
| `beatTag`           | String  |      |      | 叙事里程碑标签                         |
| `conflictType`      | String  |      |      | 冲突类型（CONFRONTATION/CLIMAX/TWIST） |
| `conflictStakes`    | String  |      |      | 冲突赌注/核心                          |
| `conflictIntensity` | Integer |      |      | 冲突强度 1-10                          |
| `branchId`          | String  |      |      | 分支 ID                                |
| `createdAt`         | Long    | ✓    |      | 创建时间                               |
| `updatedAt`         | Long    |      |      | 更新时间                               |

**BeatTag 枚举值**:

- `INCITING_INCIDENT` - 激励事件
- `PLOT_POINT_1` - 第一幕转折点
- `MIDPOINT` - 中点
- `PLOT_POINT_2` - 第二幕转折点
- `CLIMAX` - 高潮
- `RESOLUTION` - 结局
- `OTHER` - 其他

**Cypher 示例**:

```cypher
CREATE (pn:PlotNode {
  id: 'plot_001',
  projectId: 'proj_123',
  title: '林远与屈氏的第一次冲突',
  content: '林远提出农业改革方案，遭到屈氏贵族的强烈反对',
  order: 1,
  beatTag: 'INCITING_INCIDENT',
  conflictType: 'CONFRONTATION',
  conflictStakes: '改革能否启动',
  conflictIntensity: 7,
  branchId: 'main',
  createdAt: timestamp()
})
```

---

### 2.4 Chapter（章节）

**标签**: `:Chapter`

| 属性名       | 类型    | 必需 | 索引 | 说明              |
| ------------ | ------- | ---- | ---- | ----------------- |
| `id`         | String  | ✓    | ✓    | 唯一标识符        |
| `projectId`  | String  | ✓    | ✓    | 项目 ID           |
| `title`      | String  | ✓    | ✓    | 章节标题          |
| `content`    | String  |      |      | 章节正文          |
| `summary`    | String  |      |      | 章节摘要          |
| `order`      | Integer | ✓    | ✓    | 章节序号          |
| `pov`        | String  |      |      | 视角人物名称      |
| `plotNodeId` | String  |      |      | 关联的情节节点 ID |
| `wordCount`  | Integer |      |      | 字数统计          |
| `branchId`   | String  |      |      | 分支 ID           |
| `createdAt`  | Long    | ✓    |      | 创建时间          |
| `updatedAt`  | Long    |      |      | 更新时间          |

**Cypher 示例**:

```cypher
CREATE (ch:Chapter {
  id: 'ch_001',
  projectId: 'proj_123',
  title: '第一章 风起云涌',
  content: '...',
  summary: '林远初到郢都，目睹楚国农业之落后',
  order: 1,
  pov: '林远',
  plotNodeId: 'plot_001',
  wordCount: 3500,
  branchId: 'main',
  createdAt: timestamp()
})
```

---

### 2.5 Event（时间线事件）

**标签**: `:Event`

| 属性名        | 类型   | 必需 | 索引 | 说明                              |
| ------------- | ------ | ---- | ---- | --------------------------------- |
| `id`          | String | ✓    | ✓    | 唯一标识符                        |
| `projectId`   | String | ✓    | ✓    | 项目 ID                           |
| `title`       | String | ✓    | ✓    | 事件标题                          |
| `description` | String |      |      | 事件描述                          |
| `worldDate`   | String |      |      | 世界观内日期                      |
| `type`        | String | ✓    |      | 事件类型（SCENE/BACKGROUND/ECHO） |
| `branchId`    | String |      |      | 分支 ID                           |
| `createdAt`   | Long   | ✓    |      | 创建时间                          |

**Cypher 示例**:

```cypher
CREATE (e:Event {
  id: 'evt_001',
  projectId: 'proj_123',
  title: '农业改革提案',
  description: '林远向楚王提交农业改革提案',
  worldDate: '楚历205年 春',
  type: 'SCENE',
  branchId: 'main',
  createdAt: timestamp()
})
```

---

### 2.6 Echo（状态变更回响）

**标签**: `:Echo`

| 属性名               | 类型   | 必需 | 索引 | 说明                                                                |
| -------------------- | ------ | ---- | ---- | ------------------------------------------------------------------- |
| `id`                 | String | ✓    | ✓    | 唯一标识符                                                          |
| `projectId`          | String | ✓    | ✓    | 项目 ID                                                             |
| `targetId`           | String | ✓    |      | 目标实体 ID                                                         |
| `targetType`         | String | ✓    |      | 目标类型（CHARACTER/WORLD）                                         |
| `targetName`         | String | ✓    |      | 目标名称                                                            |
| `description`        | String | ✓    |      | 变更描述                                                            |
| `reason`             | String |      |      | 变更原因                                                            |
| `status`             | String | ✓    |      | 状态（PENDING/ACCEPTED/REJECTED/AUTO_ACCEPTED/PREDICTION/ARCHIVED） |
| `confidence`         | Float  |      |      | AI 置信度 0-1                                                       |
| `extractionEvidence` | String |      |      | 提取依据原文                                                        |
| `branchId`           | String |      |      | 分支 ID                                                             |
| `createdAt`          | Long   | ✓    |      | 创建时间                                                            |

**状态流转**:

```
PENDING ──(confidence >= 0.85)──> AUTO_ACCEPTED ──> ACCEPTED
    │
    ├──> REJECTED
    │
    └──> PREDICTION
```

**Cypher 示例**:

```cypher
CREATE (e:Echo {
  id: 'echo_001',
  projectId: 'proj_123',
  targetId: 'char_001',
  targetType: 'CHARACTER',
  targetName: '林远',
  description: '林远受了轻伤',
  reason: '与屈氏家臣发生冲突',
  status: 'PENDING',
  confidence: 0.92,
  extractionEvidence: '原文第15段：林远捂着受伤的左臂...',
  branchId: 'main',
  createdAt: timestamp()
})
```

---

### 2.7 Draft（草稿）

**标签**: `:Draft`

| 属性名             | 类型    | 必需 | 索引 | 说明        |
| ------------------ | ------- | ---- | ---- | ----------- |
| `id`               | String  | ✓    | ✓    | 唯一标识符  |
| `projectId`        | String  | ✓    | ✓    | 项目 ID     |
| `title`            | String  | ✓    |      | 草稿标题    |
| `content`          | String  |      |      | 草稿内容    |
| `relatedPlotPoint` | String  |      |      | 关联情节 ID |
| `version`          | Integer |      |      | 版本号      |
| `branchId`         | String  |      |      | 分支 ID     |
| `createdAt`        | Long    | ✓    |      | 创建时间    |
| `updatedAt`        | Long    |      |      | 更新时间    |

---

### 2.8 Foreshadowing（伏笔）

**标签**: `:Foreshadowing`

| 属性名              | 类型   | 必需 | 索引 | 说明                            |
| ------------------- | ------ | ---- | ---- | ------------------------------- |
| `id`                | String | ✓    | ✓    | 唯一标识符                      |
| `projectId`         | String | ✓    | ✓    | 项目 ID                         |
| `title`             | String | ✓    |      | 伏笔标题                        |
| `description`       | String |      |      | 伏笔描述                        |
| `status`            | String | ✓    |      | 状态（OPEN/RESOLVED/ABANDONED） |
| `plantedChapterId`  | String |      |      | 埋设章节 ID                     |
| `resolvedChapterId` | String |      |      | 回收章节 ID                     |
| `branchId`          | String |      |      | 分支 ID                         |
| `createdAt`         | Long   | ✓    |      | 创建时间                        |
| `resolvedAt`        | Long   |      |      | 回收时间                        |

---

## 3. 关系类型规范

### 3.1 角色间关系（Character ↔ Character）

| 关系类型     | 方向性    | 属性                               | 说明             |
| ------------ | --------- | ---------------------------------- | ---------------- |
| `ENEMY_OF`   | 有向      | weight, reason, source             | 敌对关系         |
| `ALLY_OF`    | 有向      | weight, reason, source             | 盟友关系         |
| `LOVES`      | 有向      | weight, reason, source, trajectory | 爱慕关系         |
| `KIN_OF`     | 双向      | weight, reason, source             | 亲属关系         |
| `MENTORS`    | 有向      | weight, reason, source             | 师徒关系         |
| `RIVAL_OF`   | 双向      | weight, reason, source             | 竞争关系         |
| `SERVES`     | 有向      | weight, reason, source             | 效忠关系         |
| `FRIEND_OF`  | 双向      | weight, reason, source             | 朋友关系         |
| `RELATED_TO` | 有向/双向 | weight, reason, source             | 通用关系（兜底） |

**关系属性详解**:

| 属性名       | 类型    | 必需 | 说明                                        |
| ------------ | ------- | ---- | ------------------------------------------- |
| `weight`     | Integer |      | 关系强度 0-100，默认 50                     |
| `reason`     | String  |      | 关系原因/描述                               |
| `source`     | String  |      | 来源（STRUCTURED_DATA/AI_EXTRACTED/MANUAL） |
| `trajectory` | String  |      | 关系走向（rising/falling/stable）           |
| `branchId`   | String  |      | 分支 ID                                     |
| `createdAt`  | Long    |      | 创建时间                                    |
| `updatedAt`  | Long    |      | 更新时间                                    |

**Cypher 示例**:

```cypher
MATCH (a:Character {id: 'char_001', projectId: 'proj_123'})
MATCH (b:Character {id: 'char_002', projectId: 'proj_123'})
MERGE (a)-[r:ENEMY_OF]->(b)
SET r.weight = 85,
    r.reason = '政治立场的根本冲突',
    r.source = 'STRUCTURED_DATA',
    r.trajectory = 'rising',
    r.branchId = 'main',
    r.createdAt = timestamp()
```

---

### 3.2 情节关联关系（PlotNode 相关）

| 关系类型                   | 源 → 目标               | 属性                            | 说明           |
| -------------------------- | ----------------------- | ------------------------------- | -------------- |
| `INVOLVES`                 | PlotNode → Character    |                                 | 情节涉及的角色 |
| `LOCATED_AT`               | PlotNode → WorldSetting |                                 | 情节发生地点   |
| `HAS_CONFLICT_PARTICIPANT` | PlotNode → Character    | conflictType, stakes, intensity | 冲突参与者     |
| `PRECEDES`                 | PlotNode → PlotNode     |                                 | 情节时序关系   |
| `CAUSES`                   | PlotNode → PlotNode     | weight                          | 因果关系       |

**HAS_CONFLICT_PARTICIPANT 属性**:

| 属性名         | 类型    | 说明                       |
| -------------- | ------- | -------------------------- |
| `conflictType` | String  | CONFRONTATION/CLIMAX/TWIST |
| `stakes`       | String  | 冲突赌注/核心              |
| `intensity`    | Integer | 冲突强度 1-10              |
| `branchId`     | String  | 分支 ID                    |

---

### 3.3 章节关联关系（Chapter 相关）

| 关系类型     | 源 → 目标               | 属性 | 说明         |
| ------------ | ----------------------- | ---- | ------------ |
| `IMPLEMENTS` | Chapter → PlotNode      |      | 章节实现情节 |
| `INVOLVES`   | Chapter → Character     |      | 章节涉及角色 |
| `LOCATED_IN` | Chapter → WorldSetting  |      | 章节发生地点 |
| `POV_IS`     | Chapter → Character     |      | 视角人物     |
| `PRECEDES`   | Chapter → Chapter       |      | 章节顺序     |
| `PLANTS`     | Chapter → Foreshadowing |      | 埋设伏笔     |
| `RESOLVES`   | Chapter → Foreshadowing |      | 回收伏笔     |

---

### 3.4 角色与世界设定关系（Character ↔ WorldSetting）

| 关系类型             | 源 → 目标                | 属性      | 说明                 |
| -------------------- | ------------------------ | --------- | -------------------- |
| `ORIGINATED_FROM`    | Character → WorldSetting |           | 起源/出生地          |
| `RESIDES_IN`         | Character → WorldSetting |           | 居住地               |
| `CONTROLS_TERRITORY` | Character → WorldSetting |           | 控制领地             |
| `EXILED_FROM`        | Character → WorldSetting |           | 被流放地             |
| `LOCATED_IN`         | Character → WorldSetting | timestamp | 当前位置（带时间戳） |

---

### 3.5 世界设定层级关系（WorldSetting 相关）

| 关系类型         | 源 → 目标                   | 属性 | 说明                  |
| ---------------- | --------------------------- | ---- | --------------------- |
| `CONTAINS`       | WorldSetting → WorldSetting |      | 层级包含（王国→城市） |
| `ADJACENT_TO`    | WorldSetting → WorldSetting |      | 地理相邻              |
| `DEPENDS_ON`     | WorldSetting → WorldSetting |      | 依赖关系              |
| `CONFLICTS_WITH` | WorldSetting → WorldSetting |      | 冲突关系              |

---

### 3.6 事件关联关系（Event 相关）

| 关系类型      | 源 → 目标            | 属性 | 说明         |
| ------------- | -------------------- | ---- | ------------ |
| `INVOLVED_IN` | Character → Event    |      | 角色参与事件 |
| `OCCURRED_AT` | Event → WorldSetting |      | 事件发生地点 |
| `PRECEDES`    | Event → Event        |      | 事件时序     |
| `TRIGGERS`    | Event → Event        |      | 事件触发     |

---

### 3.7 Echo 关联关系

| 关系类型          | 源 → 目标                     | 属性                      | 说明            |
| ----------------- | ----------------------------- | ------------------------- | --------------- |
| `HAS_ECHO`        | Character/WorldSetting → Echo |                           | 实体关联的 Echo |
| `SUGGESTS_CHANGE` | Echo → Character/WorldSetting | field, oldValue, newValue | 建议的变更      |
| `DERIVED_FROM`    | Echo → Chapter                |                           | 从哪个章节提取  |

---

### 3.8 伏笔关系（Foreshadowing 相关）

| 关系类型      | 源 → 目标                    | 属性 | 说明     |
| ------------- | ---------------------------- | ---- | -------- |
| `INVOLVES`    | Foreshadowing → Character    |      | 涉及角色 |
| `RELATES_TO`  | Foreshadowing → WorldSetting |      | 涉及设定 |
| `PLANTED_IN`  | Foreshadowing → Chapter      |      | 埋设章节 |
| `RESOLVED_IN` | Foreshadowing → Chapter      |      | 回收章节 |

---

## 4. 跨模块关系设计

### 4.1 Character ↔ PlotNode ↔ Chapter 三角关系

```
┌─────────────┐
│  Character  │
└──────┬──────┘
       │
       │ INVOLVES (情节涉及角色)
       │ HAS_CONFLICT_PARTICIPANT (冲突参与)
       ▼
┌─────────────┐         IMPLEMENTS          ┌───────────┐
│  PlotNode   │ ──────────────────────────> │  Chapter  │
└─────────────┘                             └─────┬─────┘
       ▲                                          │
       │                                          │
       │ PRECEDES (情节时序)                       │ INVOLVES (章节涉及角色)
       │                                          │ POV_IS (视角人物)
       │                                          ▼
       └──────────────────────────────────── Character
```

**典型查询：获取章节的完整上下文**

```cypher
// 查询某章节涉及的所有角色、情节、地点
MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
OPTIONAL MATCH (ch)-[:IMPLEMENTS]->(pn:PlotNode)
OPTIONAL MATCH (pn)-[:INVOLVES]->(c:Character)
OPTIONAL MATCH (pn)-[:LOCATED_AT]->(w:WorldSetting)
OPTIONAL MATCH (ch)-[:POV_IS]->(pov:Character)
RETURN ch, pn, collect(DISTINCT c) as characters, w, pov
```

---

### 4.2 Character ↔ WorldSetting ↔ Chapter 时空关系

```
┌─────────────┐
│  Character  │
└──────┬──────┘
       │
       ├─ ORIGINATED_FROM ─> WorldSetting (出生地)
       │
       ├─ RESIDES_IN ──────> WorldSetting (居住地)
       │
       ├─ LOCATED_IN ──────> WorldSetting (当前位置)
       │
       └─ CONTROLS_TERRITORY > WorldSetting (控制领地)

┌─────────────┐
│  Chapter    │
└──────┬──────┘
       │
       └─ LOCATED_IN ──────> WorldSetting (章节发生地点)
```

**典型查询：获取角色在不同地点的活动轨迹**

```cypher
// 查询角色参与的所有章节及其地点
MATCH (c:Character {id: $characterId, projectId: $projectId})
MATCH (ch:Chapter {projectId: $projectId})-[:INVOLVES]->(c)
OPTIONAL MATCH (ch)-[:LOCATED_IN]->(w:WorldSetting)
RETURN ch.title as chapter, ch.order as order, w.title as location
ORDER BY ch.order
```

---

### 4.3 Character ↔ Conflict ↔ PlotNode 冲突链路

```
┌─────────────┐
│  Character  │ ◄────── HAS_CONFLICT_PARTICIPANT ──────┐
└──────┬──────┘                                        │
       │                                               │
       │ ENEMY_OF / RIVAL_OF                          │
       │                                               │
       ▼                                               │
┌─────────────┐                                 ┌─────────────┐
│  Character  │ ────── INVOLVES ─────────────>  │  PlotNode   │
└─────────────┘                                 └─────────────┘
                                                      │
                                                      │ PRECEDES
                                                      ▼
                                                ┌─────────────┐
                                                │  PlotNode   │
                                                └─────────────┘
```

**典型查询：获取角色参与的所有冲突场景**

```cypher
// 查询角色参与的高强度冲突（intensity >= 7）
MATCH (c:Character {id: $characterId, projectId: $projectId})
MATCH (pn:PlotNode {projectId: $projectId})-[r:HAS_CONFLICT_PARTICIPANT]->(c)
WHERE r.intensity >= 7
OPTIONAL MATCH (pn)-[:HAS_CONFLICT_PARTICIPANT]->(other:Character)
WHERE other.id <> $characterId
RETURN pn.title as plotNode,
       r.conflictType as type,
       r.stakes as stakes,
       r.intensity as intensity,
       collect(other.name) as opponents
ORDER BY r.intensity DESC
```

---

### 4.4 Character ↔ Foreshadowing ↔ Chapter 伏笔链路

```
┌─────────────┐
│  Chapter    │ ── PLANTS ──> ┌──────────────┐ ── INVOLVES ──> ┌─────────────┐
└─────────────┘               │ Foreshadowing│                 │  Character  │
                              └──────┬───────┘                 └─────────────┘
                                     │
                                     │ RESOLVED_IN
                                     ▼
                              ┌─────────────┐
                              │  Chapter    │
                              └─────────────┘
```

**典型查询：获取未回收的伏笔**

```cypher
// 查询所有未回收的伏笔及其涉及的角色
MATCH (f:Foreshadowing {projectId: $projectId, status: 'OPEN'})
OPTIONAL MATCH (f)-[:INVOLVES]->(c:Character)
OPTIONAL MATCH (f)-[:PLANTED_IN]->(plantedChapter:Chapter)
OPTIONAL MATCH (f)-[:RELATES_TO]->(w:WorldSetting)
RETURN f.id as id,
       f.title as title,
       f.description as description,
       plantedChapter.title as plantedIn,
       collect(DISTINCT c.name) as characters,
       collect(DISTINCT w.title) as settings
```

---

## 5. 数据一致性约束

### 5.1 图谱与 MySQL 同步策略

```
┌──────────────────────────────────────────────────────────────────┐
│                      数据同步架构                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐    双写（同步）    ┌──────────┐                   │
│  │  MySQL   │ ◄───────────────► │  Neo4j   │                   │
│  │ (主存储)  │                   │ (图谱层)  │                   │
│  └──────────┘                   └──────────┘                   │
│       │                              │                          │
│       │                              │                          │
│       ▼                              ▼                          │
│  ┌──────────────────────────────────────────────────────┐      │
│  │              同步策略                                  │      │
│  ├──────────────────────────────────────────────────────┤      │
│  │  1. 创建操作: MySQL → Neo4j (事务内)                  │      │
│  │  2. 更新操作: MySQL → Neo4j (异步，2秒延迟)           │      │
│  │  3. 删除操作: MySQL → Neo4j (级联删除)                │      │
│  │  4. 关系变更: Neo4j 优先，异步回写 MySQL              │      │
│  │  5. 冲突检测: Neo4j 查询 + 人工确认                   │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**同步触发时机**:

| 操作        | 触发方式 | 延迟   | 一致性级别     |
| ----------- | -------- | ------ | -------------- |
| 创建实体    | 同步双写 | 0ms    | 强一致         |
| 更新实体    | 异步同步 | 2000ms | 最终一致       |
| 删除实体    | 同步级联 | 0ms    | 强一致         |
| 创建关系    | 图谱优先 | 0ms    | 强一致（图谱） |
| AI 提取关系 | 异步同步 | N/A    | 最终一致       |

---

### 5.2 冲突检测规则

```typescript
// 冲突类型定义
interface LogicConflict {
  type:
    | 'LOCATION_MISMATCH'
    | 'RELATIONSHIP_CONFLICT'
    | 'FACTUAL_INCONSISTENCY'
    | 'TEMPORAL_VIOLATION';
  description: string;
  truthInGraph: string;
  extractedFact: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  suggestedResolution: string;
}

// 冲突检测规则
const CONFLICT_DETECTION_RULES = [
  {
    type: 'LOCATION_MISMATCH',
    pattern: '角色位置不一致',
    cypher: `
      MATCH (c:Character)-[:LOCATED_IN]->(current:WorldSetting)
      WHERE c.name = $characterName AND current.title <> $extractedLocation
      RETURN current.title as truthInGraph
    `,
    severity: 'HIGH',
  },
  {
    type: 'RELATIONSHIP_CONFLICT',
    pattern: '关系类型冲突',
    cypher: `
      MATCH (a:Character)-[r]->(b:Character)
      WHERE a.name = $subject AND b.name = $object
      AND type(r) IN ['ENEMY_OF', 'ALLY_OF', 'LOVES', 'KIN_OF']
      AND type(r) <> $extractedRelation
      RETURN type(r) as truthInGraph
    `,
    severity: 'MEDIUM',
  },
  {
    type: 'TEMPORAL_VIOLATION',
    pattern: '时间线违规',
    cypher: `
      MATCH (e1:Event)-[:PRECEDES]->(e2:Event)
      WHERE e1.worldDate > e2.worldDate
      RETURN e1.title + ' should come after ' + e2.title as violation
    `,
    severity: 'HIGH',
  },
];
```

---

### 5.3 数据完整性校验

**校验规则**:

| 规则                     | 类型 | 说明                                |
| ------------------------ | ---- | ----------------------------------- |
| `FK_CHARACTER_EXISTS`    | 外键 | PlotNode.relatedCharacters 必须存在 |
| `FK_WORLDSETTING_EXISTS` | 外键 | PlotNode.relatedLocations 必须存在  |
| `FK_PLOTNODE_EXISTS`     | 外键 | Chapter.plotNodeId 必须存在         |
| `UNIQUE_ORDER`           | 唯一 | Chapter.order 在项目内唯一          |
| `VALID_BEAT_TAG`         | 枚举 | PlotNode.beatTag 必须在枚举值内     |
| `VALID_RELATION_TYPE`    | 枚举 | 关系类型必须在白名单内              |

**完整性校验 Cypher**:

```cypher
// 检查悬空引用
MATCH (pn:PlotNode {projectId: $projectId})
UNWIND pn.relatedCharacters AS charId
WHERE NOT EXISTS { (c:Character {id: charId, projectId: $projectId}) }
RETURN 'DANGLING_REFERENCE' as type, pn.id as plotNodeId, charId as missingCharacterId

// 检查章节顺序重复
MATCH (ch1:Chapter {projectId: $projectId})
MATCH (ch2:Chapter {projectId: $projectId})
WHERE ch1.order = ch2.order AND ch1.id <> ch2.id
RETURN 'DUPLICATE_ORDER' as type, ch1.id as chapter1, ch2.id as chapter2, ch1.order as order
```

---

## 6. 扩展性设计

### 6.1 自定义关系类型

**机制**: 通过 `RELATED_TO` 关系 + `customType` 属性支持自定义关系

```cypher
// 自定义关系示例
MATCH (a:Character {id: 'char_001'})
MATCH (b:Character {id: 'char_002'})
MERGE (a)-[r:RELATED_TO]->(b)
SET r.customType = '前世仇人',
    r.weight = 90,
    r.description = '前世结下的血海深仇',
    r.branchId = 'main'
```

**自定义关系注册表**:

```typescript
interface CustomRelationType {
  id: string;
  projectId: string;
  name: string; // 显示名称
  description: string; // 描述
  direction: 'DIRECTED' | 'UNDIRECTED' | 'BIDIRECTIONAL';
  allowedSourceTypes: string[]; // 允许的源节点类型
  allowedTargetTypes: string[]; // 允许的目标节点类型
  color: string; // 可视化颜色
  icon: string; // 图标
  createdBy: string; // 创建者
  createdAt: number;
}
```

---

### 6.2 扩展属性机制

**动态属性存储**:

```cypher
// 使用 Map 类型存储扩展属性
CREATE (c:Character {
  id: 'char_001',
  name: '林远',
  // 标准属性
  role: '主角',
  // 扩展属性（JSON 字符串）
  extendedProperties: '{"customField1": "value1", "customField2": {"nested": "value2"}}'
})
```

**扩展属性 Schema**:

```typescript
interface ExtendedProperty {
  key: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'JSON';
  value: any;
  scope: 'GLOBAL' | 'PROJECT' | 'ENTITY';
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
}
```

---

### 6.3 版本兼容策略

**版本化节点属性**:

```cypher
// 节点包含 schema 版本号
CREATE (c:Character {
  id: 'char_001',
  _schemaVersion: '1.2.0',  // Schema 版本
  _migratedAt: timestamp(), // 迁移时间
  _migrationSource: '1.1.0', // 从哪个版本迁移
  name: '林远',
  // ...其他属性
})
```

**版本迁移脚本模板**:

```typescript
interface MigrationScript {
  fromVersion: string;
  toVersion: string;
  description: string;
  up: string; // 升级 Cypher
  down: string; // 降级 Cypher
}

const migrations: MigrationScript[] = [
  {
    fromVersion: '1.0.0',
    toVersion: '1.1.0',
    description: '添加 conflictIntensity 字段到 HAS_CONFLICT_PARTICIPANT 关系',
    up: `
      MATCH ()-[r:HAS_CONFLICT_PARTICIPANT]->()
      WHERE r.intensity IS NULL
      SET r.intensity = 5
    `,
    down: `
      MATCH ()-[r:HAS_CONFLICT_PARTICIPANT]->()
      REMOVE r.intensity
    `,
  },
];
```

---

## 7. 索引与约束

### 7.1 必需索引

```cypher
// ========== 节点索引 ==========

// 唯一性约束（同时也是索引）
CREATE CONSTRAINT character_id_unique IF NOT EXISTS
FOR (c:Character) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT worldsetting_id_unique IF NOT EXISTS
FOR (w:WorldSetting) REQUIRE w.id IS UNIQUE;

CREATE CONSTRAINT plotnode_id_unique IF NOT EXISTS
FOR (pn:PlotNode) REQUIRE pn.id IS UNIQUE;

CREATE CONSTRAINT chapter_id_unique IF NOT EXISTS
FOR (ch:Chapter) REQUIRE ch.id IS UNIQUE;

CREATE CONSTRAINT event_id_unique IF NOT EXISTS
FOR (e:Event) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT echo_id_unique IF NOT EXISTS
FOR (e:Echo) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT draft_id_unique IF NOT EXISTS
FOR (d:Draft) REQUIRE d.id IS UNIQUE;

CREATE CONSTRAINT foreshadowing_id_unique IF NOT EXISTS
FOR (f:Foreshadowing) REQUIRE f.id IS UNIQUE;

// 复合索引（用于多租户隔离查询）
CREATE INDEX character_project_id IF NOT EXISTS
FOR (c:Character) ON (c.projectId, c.id);

CREATE INDEX worldsetting_project_id IF NOT EXISTS
FOR (w:WorldSetting) ON (w.projectId, w.id);

CREATE INDEX plotnode_project_order IF NOT EXISTS
FOR (pn:PlotNode) ON (pn.projectId, pn.order);

CREATE INDEX chapter_project_order IF NOT EXISTS
FOR (ch:Chapter) ON (ch.projectId, ch.order);

// 名称索引（用于搜索）
CREATE INDEX character_name IF NOT EXISTS
FOR (c:Character) ON (c.name);

CREATE INDEX worldsetting_title IF NOT EXISTS
FOR (w:WorldSetting) ON (w.title);

CREATE INDEX plotnode_title IF NOT EXISTS
FOR (pn:PlotNode) ON (pn.title);

// 分支索引（用于分支隔离查询）
CREATE INDEX character_branch IF NOT EXISTS
FOR (c:Character) ON (c.projectId, c.branchId);

CREATE INDEX chapter_branch IF NOT EXISTS
FOR (ch:Chapter) ON (ch.projectId, ch.branchId);

// 状态索引（用于 Echo 查询）
CREATE INDEX echo_status IF NOT EXISTS
FOR (e:Echo) ON (e.projectId, e.status);

CREATE INDEX foreshadowing_status IF NOT EXISTS
FOR (f:Foreshadowing) ON (f.projectId, f.status);

// 时间索引（用于时间线查询）
CREATE INDEX event_world_date IF NOT EXISTS
FOR (e:Event) ON (e.projectId, e.worldDate);

// 全文索引（用于搜索）
CREATE FULLTEXT INDEX character_fulltext IF NOT EXISTS
FOR (c:Character)
ON EACH [c.name, c.description, c.role];

CREATE FULLTEXT INDEX worldsetting_fulltext IF NOT EXISTS
FOR (w:WorldSetting)
ON EACH [w.title, w.content];

CREATE FULLTEXT INDEX plotnode_fulltext IF NOT EXISTS
FOR (pn:PlotNode)
ON EACH [pn.title, pn.content];
```

### 7.2 推荐索引（可选）

```cypher
// 性能优化索引
CREATE INDEX character_alignment IF NOT EXISTS
FOR (c:Character) ON (c.alignment);

CREATE INDEX plotnode_beattag IF NOT EXISTS
FOR (pn:PlotNode) ON (pn.beatTag);

CREATE INDEX worldsetting_category IF NOT EXISTS
FOR (w:WorldSetting) ON (w.category);
```

---

## 8. Cypher CREATE 语句

### 8.1 完整初始化脚本

```cypher
// ============================================================
// Muse 知识图谱 Schema 初始化脚本
// 版本: 1.0.0
// ============================================================

// ========== 1. 创建约束和索引 ==========

// 唯一性约束
CREATE CONSTRAINT character_id_unique IF NOT EXISTS
FOR (c:Character) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT worldsetting_id_unique IF NOT EXISTS
FOR (w:WorldSetting) REQUIRE w.id IS UNIQUE;

CREATE CONSTRAINT plotnode_id_unique IF NOT EXISTS
FOR (pn:PlotNode) REQUIRE pn.id IS UNIQUE;

CREATE CONSTRAINT chapter_id_unique IF NOT EXISTS
FOR (ch:Chapter) REQUIRE ch.id IS UNIQUE;

CREATE CONSTRAINT event_id_unique IF NOT EXISTS
FOR (e:Event) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT echo_id_unique IF NOT EXISTS
FOR (e:Echo) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT foreshadowing_id_unique IF NOT EXISTS
FOR (f:Foreshadowing) REQUIRE f.id IS UNIQUE;

// 复合索引
CREATE INDEX character_project_id IF NOT EXISTS
FOR (c:Character) ON (c.projectId, c.id);

CREATE INDEX worldsetting_project_id IF NOT EXISTS
FOR (w:WorldSetting) ON (w.projectId, w.id);

CREATE INDEX plotnode_project_order IF NOT EXISTS
FOR (pn:PlotNode) ON (pn.projectId, pn.order);

CREATE INDEX chapter_project_order IF NOT EXISTS
FOR (ch:Chapter) ON (ch.projectId, ch.order);

// 全文索引
CREATE FULLTEXT INDEX character_fulltext IF NOT EXISTS
FOR (c:Character)
ON EACH [c.name, c.description, c.role];

CREATE FULLTEXT INDEX worldsetting_fulltext IF NOT EXISTS
FOR (w:WorldSetting)
ON EACH [w.title, w.content];

CREATE FULLTEXT INDEX plotnode_fulltext IF NOT EXISTS
FOR (pn:PlotNode)
ON EACH [pn.title, pn.content];

// ========== 2. 创建示例数据（可选） ==========

// 创建示例项目（用于测试）
// 注意：实际使用时由应用层创建

// 示例角色
CREATE (c1:Character {
  id: 'example_char_001',
  projectId: 'example_project',
  name: '示例角色A',
  role: '主角',
  archetype: '英雄',
  description: '这是一个示例角色',
  alignment: '守序善良',
  tags: ['勇敢', '正义'],
  state: '正常',
  isDead: false,
  branchId: 'main',
  createdAt: timestamp(),
  source: 'MANUAL'
});

CREATE (c2:Character {
  id: 'example_char_002',
  projectId: 'example_project',
  name: '示例角色B',
  role: '反派',
  archetype: '阴影',
  description: '这是另一个示例角色',
  alignment: '混乱邪恶',
  tags: ['狡猾', '残忍'],
  state: '正常',
  isDead: false,
  branchId: 'main',
  createdAt: timestamp(),
  source: 'MANUAL'
});

// 创建示例关系
MATCH (a:Character {id: 'example_char_001'})
MATCH (b:Character {id: 'example_char_002'})
MERGE (a)-[r:ENEMY_OF]->(b)
SET r.weight = 85,
    r.reason = '立场的根本冲突',
    r.source = 'MANUAL',
    r.branchId = 'main',
    r.createdAt = timestamp();

// 清理示例数据（如需删除）
// MATCH (n {projectId: 'example_project'}) DETACH DELETE n;
```

### 8.2 常用操作 Cypher

**创建角色**:

```cypher
CREATE (c:Character {
  id: $id,
  projectId: $projectId,
  name: $name,
  role: $role,
  archetype: $archetype,
  description: $description,
  alignment: $alignment,
  tags: $tags,
  desire: $desire,
  fear: $fear,
  signature: $signature,
  contrast: $contrast,
  weakness: $weakness,
  state: '正常',
  isDead: false,
  branchId: 'main',
  createdAt: timestamp(),
  source: 'STRUCTURED_DATA'
})
RETURN c
```

**创建角色关系**:

```cypher
MATCH (a:Character {id: $sourceId, projectId: $projectId})
MATCH (b:Character {id: $targetId, projectId: $projectId})
MERGE (a)-[r:ENEMY_OF]->(b)
ON CREATE SET
  r.weight = $weight,
  r.reason = $reason,
  r.source = $source,
  r.trajectory = $trajectory,
  r.branchId = 'main',
  r.createdAt = timestamp()
ON MATCH SET
  r.weight = $weight,
  r.reason = $reason,
  r.updatedAt = timestamp()
RETURN r
```

**创建情节节点**:

```cypher
CREATE (pn:PlotNode {
  id: $id,
  projectId: $projectId,
  title: $title,
  content: $content,
  order: $order,
  beatTag: $beatTag,
  conflictType: $conflictType,
  conflictStakes: $conflictStakes,
  conflictIntensity: $conflictIntensity,
  branchId: 'main',
  createdAt: timestamp()
})
WITH pn
UNWIND $relatedCharacterIds AS charId
MATCH (c:Character {id: charId, projectId: $projectId})
MERGE (pn)-[:INVOLVES]->(c)
WITH pn
UNWIND $relatedLocationIds AS locId
MATCH (w:WorldSetting {id: locId, projectId: $projectId})
MERGE (pn)-[:LOCATED_AT]->(w)
RETURN pn
```

**创建冲突参与者关系**:

```cypher
MATCH (pn:PlotNode {id: $plotNodeId, projectId: $projectId})
UNWIND $participantIds AS participantId
MATCH (c:Character {id: participantId, projectId: $projectId})
MERGE (pn)-[r:HAS_CONFLICT_PARTICIPANT]->(c)
SET r.conflictType = $conflictType,
    r.stakes = $stakes,
    r.intensity = $intensity,
    r.branchId = 'main'
```

**查询项目图谱**:

```cypher
MATCH (n {projectId: $projectId})
OPTIONAL MATCH (n)-[r]-(m {projectId: $projectId})
RETURN n, r, m,
       labels(n) as sourceLabels,
       labels(m) as targetLabels,
       type(r) as relationType,
       properties(r) as relationProps
```

**删除项目所有数据**:

```cypher
MATCH (n {projectId: $projectId})
DETACH DELETE n
```

---

## 9. ER 图描述

### 9.1 核心实体关系图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              Muse 知识图谱 ER 图                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────┐                              ┌─────────────┐
│  Character  │◄─────────────────────────────│  PlotNode   │
├─────────────┤                              ├─────────────┤
│ id          │                              │ id          │
│ projectId   │                              │ projectId   │
│ name        │◄── INVOLVES ─────────────────│ title       │
│ role        │◄── HAS_CONFLICT_PARTICIPANT ─│ content     │
│ archetype   │                              │ order       │
│ description │                              │ beatTag     │
│ alignment   │                              │ conflictType│
│ tags[]      │                              └──────┬──────┘
│ desire      │                                     │
│ fear        │                                     │
│ signature   │                              ┌──────▼──────┐
│ contrast    │                              │   Chapter   │
│ weakness    │                              ├─────────────┤
│ state       │                              │ id          │
│ isDead      │◄── INVOLVES ─────────────────│ projectId   │
└──────┬──────┘◄── POV_IS ───────────────────│ title       │
       │                                      │ content     │
       │                                      │ summary     │
       │                                      │ order       │
       │                                      │ pov         │
       │                                      │ plotNodeId  │
       │                                      └──────┬──────┘
       │                                             │
       │ ENEMY_OF / ALLY_OF / LOVES / KIN_OF        │
       │ MENTORS / RIVAL_OF / SERVES / FRIEND_OF    │
       │                                             │
       ▼                                             │
┌─────────────┐                              ┌──────▼──────┐
│  Character  │                              │ WorldSetting│
└─────────────┘                              ├─────────────┤
                                             │ id          │
┌─────────────┐◄── LOCATED_AT ───────────────│ projectId   │
│ WorldSetting│◄── LOCATED_IN ───────────────│ title       │
├─────────────┤                              │ category    │
│ id          │                              │ content     │
│ projectId   │◄── ORIGINATED_FROM ──────────│ parentId    │
│ title       │◄── RESIDES_IN ───────────────│ importance  │
│ category    │◄── CONTROLS_TERRITORY ───────│ tags[]      │
│ content     │◄── EXILED_FROM ──────────────└─────────────┘
│ parentId    │
│ importance  │◄── CONTAINS ─────────────────┐
│ tags[]      │◄── ADJACENT_TO ──────────────│
└─────────────┘◄── DEPENDS_ON ───────────────│
                    CONFLICTS_WITH ───────────┘

┌─────────────┐                              ┌─────────────┐
│    Event    │◄─────────────────────────────│   Echo      │
├─────────────┤                              ├─────────────┤
│ id          │                              │ id          │
│ projectId   │◄── INVOLVED_IN ──────────────│ projectId   │
│ title       │◄── OCCURRED_AT ──────────────│ targetId    │
│ description │◄── PRECEDES ─────────────────│ targetType  │
│ worldDate   │◄── TRIGGERS ─────────────────│ targetName  │
│ type        │                              │ description │
└─────────────┘                              │ reason      │
                                             │ status      │
┌─────────────┐                              │ confidence  │
│Foreshadowing│                              │ branchId    │
├─────────────┤                              └─────────────┘
│ id          │
│ projectId   │◄── INVOLVES ─────────────────┐
│ title       │◄── RELATES_TO ───────────────│
│ description │                              │
│ status      │◄── PLANTED_IN ───────────────┐
│plantedChapId│◄── RESOLVED_IN ──────────────│ Chapter
│resolvedChapId│                             │
└─────────────┘                              └─────────────┘
```

### 9.2 关系类型汇总图

```
┌─────────────────────────────────────────────────────────────────┐
│                       关系类型网络图                            │
└─────────────────────────────────────────────────────────────────┘

                    Character
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
   ENEMY_OF        LOCATED_IN      INVOLVED_IN
   ALLY_OF         ORIGINATED_FROM     │
   LOVES           RESIDES_IN          │
   KIN_OF          CONTROLS_TERRITORY  │
   MENTORS         EXILED_FROM         │
   RIVAL_OF                            │
   SERVES                              ▼
   FRIEND_OF                        Event
        │
        │
        ▼
     PlotNode
        │
        │ INVOLVES
        │ LOCATED_AT
        │ HAS_CONFLICT_PARTICIPANT
        │ PRECEDES
        │ CAUSES
        │
        ▼
     Chapter ──────── IMPLEMENTS ────────► PlotNode
        │
        │ INVOLVES
        │ LOCATED_IN
        │ POV_IS
        │ PRECEDES
        │ PLANTS
        │ RESOLVES
        │
        ▼
   Foreshadowing
        │
        │ INVOLVES
        │ RELATES_TO
        │ PLANTED_IN
        │ RESOLVED_IN
        │
        ▼
   Character / WorldSetting

     WorldSetting
        │
        │ CONTAINS
        │ ADJACENT_TO
        │ DEPENDS_ON
        │ CONFLICTS_WITH
        │
        ▼
     WorldSetting

      Echo
        │
        │ HAS_ECHO
        │ SUGGESTS_CHANGE
        │ DERIVED_FROM
        │
        ▼
   Character / WorldSetting / Chapter
```

---

## 10. 版本兼容策略

### 10.1 版本号规范

```
Schema 版本号: MAJOR.MINOR.PATCH

- MAJOR: 破坏性变更（删除节点类型、删除关系类型、删除必需属性）
- MINOR: 向后兼容的功能增加（新增节点类型、新增关系类型、新增可选属性）
- PATCH: 向后兼容的问题修复（索引优化、性能改进）
```

### 10.2 版本迁移矩阵

| 当前版本 | 目标版本 | 迁移类型 | 风险等级 |
| -------- | -------- | -------- | -------- |
| 1.0.0    | 1.1.0    | MINOR    | 低       |
| 1.1.0    | 1.2.0    | MINOR    | 低       |
| 1.2.0    | 2.0.0    | MAJOR    | 高       |

### 10.3 迁移执行流程

```
1. 备份数据
   ├── Neo4j 数据库备份
   └── 导出当前 Schema

2. 执行迁移脚本
   ├── 创建新索引/约束
   ├── 添加新属性（默认值）
   ├── 数据转换
   └── 删除废弃属性（MAJOR 版本）

3. 验证迁移
   ├── 检查节点数量
   ├── 检查关系数量
   ├── 运行测试查询
   └── 验证应用程序功能

4. 回滚准备
   ├── 保留备份 7 天
   └── 记录回滚步骤
```

### 10.4 版本检测 API

```cypher
// 检查当前 Schema 版本
MATCH (m:_SchemaMetadata {projectId: $projectId})
RETURN m.version as version, m.updatedAt as lastUpdated

// 更新 Schema 版本
MERGE (m:_SchemaMetadata {projectId: $projectId})
SET m.version = $newVersion,
    m.updatedAt = timestamp(),
    m.previousVersion = $previousVersion
```

---

## 附录 A: 关系类型白名单

```typescript
export const VALID_RELATION_TYPES = new Set([
  // 角色间关系
  'ENEMY_OF',
  'ALLY_OF',
  'LOVES',
  'KIN_OF',
  'MENTORS',
  'RIVAL_OF',
  'SERVES',
  'FRIEND_OF',
  'RELATED_TO',

  // 系统内置关系
  'INVOLVED_IN',
  'HAS_ECHO',
  'POV_IS',
  'PRECEDES',
  'IMPLEMENTS',
  'INVOLVES',
  'LOCATED_IN',
  'LOCATED_AT',
  'CAUSES',
  'TRIGGERS',
  'OCCURRED_AT',

  // WorldSetting 相关
  'CONTAINS',
  'ADJACENT_TO',
  'DEPENDS_ON',
  'CONFLICTS_WITH',

  // Character-WorldSetting
  'ORIGINATED_FROM',
  'RESIDES_IN',
  'CONTROLS_TERRITORY',
  'EXILED_FROM',

  // PlotNode 相关
  'HAS_CONFLICT_PARTICIPANT',

  // Foreshadowing 相关
  'PLANTS',
  'RESOLVES',
  'RELATES_TO',
  'PLANTED_IN',
  'RESOLVED_IN',

  // Echo 相关
  'SUGGESTS_CHANGE',
  'DERIVED_FROM',
]);
```

---

## 附录 B: 中文关系映射表

```typescript
export const CHINESE_TO_RELATION_TYPE: Record<string, string> = {
  // 敌对关系
  敌人: 'ENEMY_OF',
  敌对: 'ENEMY_OF',
  仇人: 'ENEMY_OF',
  仇敌: 'ENEMY_OF',
  死敌: 'ENEMY_OF',
  宿敌: 'ENEMY_OF',

  // 盟友关系
  盟友: 'ALLY_OF',
  同盟: 'ALLY_OF',
  伙伴: 'ALLY_OF',
  同伴: 'ALLY_OF',

  // 爱情关系
  爱: 'LOVES',
  爱慕: 'LOVES',
  恋人: 'LOVES',
  情人: 'LOVES',
  暗恋: 'LOVES',
  喜欢: 'LOVES',

  // 亲情关系
  亲人: 'KIN_OF',
  亲属: 'KIN_OF',
  家人: 'KIN_OF',
  亲戚: 'KIN_OF',

  // 师徒关系
  师父: 'MENTORS',
  师傅: 'MENTORS',
  徒弟: 'MENTORS',
  师徒: 'MENTORS',
  导师: 'MENTORS',

  // 竞争关系
  竞争: 'RIVAL_OF',
  对手: 'RIVAL_OF',
  敌手: 'RIVAL_OF',

  // 效忠关系
  效忠: 'SERVES',
  下属: 'SERVES',
  仆人: 'SERVES',

  // 友谊关系
  朋友: 'FRIEND_OF',
  好友: 'FRIEND_OF',
  友情: 'FRIEND_OF',
};
```

---

## 附录 C: 常用查询模板

### C.1 获取项目完整图谱

```cypher
CALL {
  MATCH (n {projectId: $projectId})
  RETURN n, null as r, null as m, 'node' as type
  UNION ALL
  MATCH (a {projectId: $projectId})-[r]->(b {projectId: $projectId})
  RETURN a as n, r, b as m, 'edge' as type
}
RETURN n, r, m, type
```

### C.2 获取角色关系网络

```cypher
MATCH (c:Character {id: $characterId, projectId: $projectId})
OPTIONAL MATCH (c)-[r1]-(other:Character {projectId: $projectId})
WHERE type(r1) IN ['ENEMY_OF', 'ALLY_OF', 'LOVES', 'KIN_OF', 'MENTORS', 'RIVAL_OF', 'SERVES', 'FRIEND_OF']
RETURN c,
       collect(DISTINCT {node: other, relation: type(r1), direction: CASE WHEN startNode(r1) = c THEN 'OUT' ELSE 'IN' END}) as relationships
```

### C.3 获取章节上下文

```cypher
MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
OPTIONAL MATCH (ch)-[:IMPLEMENTS]->(pn:PlotNode)
OPTIONAL MATCH (pn)-[:INVOLVES]->(c:Character)
OPTIONAL MATCH (pn)-[:LOCATED_AT]->(w:WorldSetting)
OPTIONAL MATCH (ch)-[:POV_IS]->(pov:Character)
OPTIONAL MATCH (prev:Chapter {projectId: $projectId})-[:PRECEDES]->(ch)
OPTIONAL MATCH (ch)-[:PRECEDES]->(next:Chapter {projectId: $projectId})
RETURN ch, pn,
       collect(DISTINCT c) as characters,
       w as location,
       pov as povCharacter,
       prev as previousChapter,
       next as nextChapter
```

### C.4 获取未解决伏笔

```cypher
MATCH (f:Foreshadowing {projectId: $projectId, status: 'OPEN'})
OPTIONAL MATCH (f)-[:INVOLVES]->(c:Character)
OPTIONAL MATCH (f)-[:PLANTED_IN]->(plantedChapter:Chapter)
OPTIONAL MATCH (f)-[:RELATES_TO]->(w:WorldSetting)
RETURN f.id as id,
       f.title as title,
       f.description as description,
       plantedChapter.title as plantedIn,
       plantedChapter.order as plantedOrder,
       collect(DISTINCT c.name) as characters,
       collect(DISTINCT w.title) as settings
ORDER BY plantedOrder
```

### C.5 获取高强度冲突场景

```cypher
MATCH (pn:PlotNode {projectId: $projectId})-[r:HAS_CONFLICT_PARTICIPANT]->(c:Character)
WHERE r.intensity >= 7
WITH pn, r, collect(DISTINCT c) as participants
RETURN pn.id as plotNodeId,
       pn.title as title,
       pn.order as order,
       r.conflictType as conflictType,
       r.stakes as stakes,
       r.intensity as intensity,
       [p IN participants | p.name] as participantNames
ORDER BY r.intensity DESC, pn.order
```

### C.6 蝴蝶效应模拟

```cypher
MATCH (n {projectId: $projectId})
WHERE n.name = $triggerName OR n.title = $triggerName
MATCH (n)-[r]-(m {projectId: $projectId})
RETURN n.name as source,
       type(r) as relationType,
       m.name as affected,
       coalesce(r.weight, 50) as weight,
       CASE
         WHEN type(r) IN ['ALLY_OF', 'LOVES', 'KIN_OF', 'MENTORS'] AND $isNegative = true THEN 'NEGATIVE'
         WHEN type(r) IN ['ALLY_OF', 'LOVES', 'KIN_OF', 'MENTORS'] AND $isNegative = false THEN 'POSITIVE'
         WHEN type(r) = 'ENEMY_OF' AND $isNegative = true THEN 'POSITIVE'
         WHEN type(r) = 'ENEMY_OF' AND $isNegative = false THEN 'NEGATIVE'
         ELSE 'NEUTRAL'
       END as impact
ORDER BY weight DESC
```

---

## 文档变更历史

| 版本  | 日期       | 变更内容 | 作者           |
| ----- | ---------- | -------- | -------------- |
| 1.0.0 | 2026-03-21 | 初始版本 | 数据库专家团队 |

---

**文档结束**
