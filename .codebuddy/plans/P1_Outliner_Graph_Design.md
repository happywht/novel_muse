# P1阶段 Outliner模块图谱化详细技术方案

**版本**: v1.0.0
**设计日期**: 2026-03-21
**前置阶段**: P0（Character和PlotNode图谱化）已完成
**设计者**: Backend Technical Lead

---

## 目录

1. [设计目标](#1-设计目标)
2. [节点Schema设计](#2-节点schema设计)
3. [关系类型设计](#3-关系类型设计)
4. [sync.ts增强方案](#4-syncts增强方案)
5. [queries.ts增强方案](#5-queriests增强方案)
6. [数据迁移策略](#6-数据迁移策略)
7. [性能优化建议](#7-性能优化建议)
8. [测试策略](#8-测试策略)

---

## 1. 设计目标

### 1.1 核心目标

| 目标             | 说明                                                       |
| ---------------- | ---------------------------------------------------------- |
| **章节图谱化**   | 将Chapter和ChapterBeat纳入知识图谱，建立完整的叙事结构网络 |
| **层级关系建立** | 实现 PlotNode → Chapter → ChapterBeat 的三级层级关系       |
| **交叉关联增强** | 建立章节与角色、地点、伏笔的关联网络                       |
| **查询能力提升** | 支持章节依赖分析、角色网络、伏笔追踪、冲突热力图等高级查询 |

### 1.2 与P0阶段的兼容性

```typescript
// P0已实现：
// - Character节点 + 关系边（ENEMY_OF, ALLY_OF等）
// - PlotNode节点 + 冲突关系（HAS_CONFLICT_PARTICIPANT）
// - WorldSetting节点 + 层级关系（CONTAINS）

// P1新增：
// - Chapter节点
// - ChapterBeat节点
// - EXPANDS_TO关系（PlotNode → Chapter）
// - CONTAINS_BEAT关系（Chapter → ChapterBeat）
// - FORESHADOWS关系（跨章节伏笔）
```

---

## 2. 节点Schema设计

### 2.1 Chapter节点

**标签**: `:Chapter`

| 属性名         | 类型    | 必需 | 索引 | 说明                             |
| -------------- | ------- | ---- | ---- | -------------------------------- |
| `id`           | String  | ✓    | ✓    | 唯一标识符（UUID）               |
| `projectId`    | String  | ✓    | ✓    | 项目ID                           |
| `title`        | String  | ✓    |      | 章节标题                         |
| `content`      | String  |      |      | 章节正文内容                     |
| `summary`      | String  |      |      | 章节细纲/摘要                    |
| `order`        | Integer | ✓    |      | 章节顺序                         |
| `expectedPOV`  | String  |      |      | 视角人物名称                     |
| `plotNodeId`   | String  |      |      | 关联的PlotNode ID                |
| `wordCount`    | Integer |      |      | 字数统计                         |
| `status`       | String  |      |      | 章节状态：DRAFT/OUTLINE/COMPLETE |
| `lastModified` | Long    |      |      | 最后修改时间戳                   |
| `branchId`     | String  |      |      | 分支ID，默认'main'               |
| `createdAt`    | Long    | ✓    |      | 创建时间戳                       |
| `updatedAt`    | Long    |      |      | 更新时间戳                       |

**Cypher创建约束**:

```cypher
// 创建唯一性约束（同时创建索引）
CREATE CONSTRAINT chapter_id_unique IF NOT EXISTS
FOR (c:Chapter) REQUIRE c.id IS UNIQUE;

// 为projectId创建索引（多租户查询优化）
CREATE INDEX chapter_project_idx IF NOT EXISTS
FOR (c:Chapter) ON (c.projectId);

// 为order创建索引（排序查询优化）
CREATE INDEX chapter_order_idx IF NOT EXISTS
FOR (c:Chapter) ON (c.order);
```

### 2.2 ChapterBeat节点

**标签**: `:ChapterBeat`

| 属性名           | 类型    | 必需 | 索引 | 说明                                    |
| ---------------- | ------- | ---- | ---- | --------------------------------------- |
| `id`             | String  | ✓    | ✓    | 唯一标识符（UUID）                      |
| `projectId`      | String  | ✓    | ✓    | 项目ID                                  |
| `chapterId`      | String  | ✓    | ✓    | 所属章节ID                              |
| `type`           | String  | ✓    |      | 节拍类型：CONTENT/ACTION/DIALOGUE/TWIST |
| `description`    | String  | ✓    |      | 节拍描述                                |
| `order`          | Integer | ✓    |      | 节拍顺序                                |
| `isCompleted`    | Boolean | ✓    |      | 是否已完成                              |
| `estimatedWords` | Integer |      |      | 预估字数                                |
| `createdAt`      | Long    | ✓    |      | 创建时间戳                              |
| `updatedAt`      | Long    |      |      | 更新时间戳                              |

**Cypher创建约束**:

```cypher
// 创建唯一性约束
CREATE CONSTRAINT chapter_beat_id_unique IF NOT EXISTS
FOR (cb:ChapterBeat) REQUIRE cb.id IS UNIQUE;

// 为chapterId创建索引
CREATE INDEX chapter_beat_chapter_idx IF NOT EXISTS
FOR (cb:ChapterBeat) ON (cb.chapterId);

// 复合索引（projectId + order）
CREATE INDEX chapter_beat_project_order_idx IF NOT EXISTS
FOR (cb:ChapterBeat) ON (cb.projectId, cb.order);
```

### 2.3 Foreshadowing节点（伏笔追踪）

**标签**: `:Foreshadowing`

> 复用已有的KnowledgeTriple结构，但作为独立节点存储，便于跨章节追踪

| 属性名             | 类型    | 必需 | 索引 | 说明                                     |
| ------------------ | ------- | ---- | ---- | ---------------------------------------- |
| `id`               | String  | ✓    | ✓    | 唯一标识符                               |
| `projectId`        | String  | ✓    | ✓    | 项目ID                                   |
| `subject`          | String  | ✓    |      | 主体（角色/物品/事件）                   |
| `relation`         | String  | ✓    |      | 关系描述（如"埋下"、"暗示"）             |
| `object`           | String  | ✓    |      | 客体（伏笔内容）                         |
| `type`             | String  | ✓    |      | 伏笔类型：ITEM/RELATIONSHIP/EVENT/SECRET |
| `status`           | String  | ✓    |      | 状态：OPEN/RESOLVED/ABANDONED            |
| `weight`           | Integer |      |      | 重要程度 1-10                            |
| `plantChapterId`   | String  |      |      | 埋下伏笔的章节ID                         |
| `resolveChapterId` | String  |      |      | 回收伏笔的章节ID                         |
| `description`      | String  |      |      | 伏笔详细描述                             |
| `createdAt`        | Long    | ✓    |      | 创建时间戳                               |
| `resolvedAt`       | Long    |      |      | 回收时间戳                               |

**Cypher创建约束**:

```cypher
CREATE CONSTRAINT foreshadowing_id_unique IF NOT EXISTS
FOR (f:Foreshadowing) REQUIRE f.id IS UNIQUE;

CREATE INDEX foreshadowing_status_idx IF NOT EXISTS
FOR (f:Foreshadowing) ON (f.status);

CREATE INDEX foreshadowing_plant_chapter_idx IF NOT EXISTS
FOR (f:Foreshadowing) ON (f.plantChapterId);
```

---

## 3. 关系类型设计

### 3.1 层级关系

#### 3.1.1 EXPANDS_TO（展开关系）

**方向**: `(PlotNode) -[:EXPANDS_TO]-> (Chapter)`

| 属性名      | 类型   | 说明       |
| ----------- | ------ | ---------- |
| `createdAt` | Long   | 创建时间戳 |
| `branchId`  | String | 分支ID     |

**语义**: 一个PlotNode可以展开为多个Chapter，表示情节节点的具体化实现

```cypher
// 示例：PlotNode展开为Chapter
MATCH (pn:PlotNode {id: $plotNodeId, projectId: $projectId})
MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
MERGE (pn)-[r:EXPANDS_TO]->(ch)
SET r.createdAt = timestamp(), r.branchId = $branchId
```

#### 3.1.2 CONTAINS_BEAT（包含节拍）

**方向**: `(Chapter) -[:CONTAINS_BEAT]-> (ChapterBeat)`

| 属性名      | 类型    | 说明       |
| ----------- | ------- | ---------- |
| `order`     | Integer | 节拍顺序   |
| `createdAt` | Long    | 创建时间戳 |

**语义**: Chapter包含多个ChapterBeat，表示章节的细粒度结构

```cypher
// 示例：Chapter包含Beat
MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
MATCH (cb:ChapterBeat {id: $beatId, projectId: $projectId})
MERGE (ch)-[r:CONTAINS_BEAT]->(cb)
SET r.order = $order, r.createdAt = timestamp()
```

### 3.2 章节关联关系

#### 3.2.1 INVOLVES_CHARACTER（涉及角色）

**方向**: `(Chapter) -[:INVOLVES_CHARACTER]-> (Character)`

| 属性名       | 类型    | 说明                                                          |
| ------------ | ------- | ------------------------------------------------------------- |
| `role`       | String  | 角色在章节中的作用（PROTAGONIST/ANTAGONIST/SUPPORTING/CAMEO） |
| `screenTime` | Integer | 出场时长（字数或百分比）                                      |
| `createdAt`  | Long    | 创建时间戳                                                    |

**语义**: 章节涉及的角色，支持角色出场统计和网络分析

```cypher
// 示例：章节涉及角色
MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
MATCH (c:Character {id: $characterId, projectId: $projectId})
MERGE (ch)-[r:INVOLVES_CHARACTER]->(c)
SET r.role = $role, r.screenTime = $screenTime
```

#### 3.2.2 SET_IN_LOCATION（场景设定）

**方向**: `(Chapter) -[:SET_IN_LOCATION]-> (WorldSetting)`

| 属性名      | 类型    | 说明                 |
| ----------- | ------- | -------------------- |
| `duration`  | Integer | 场景持续时长（字数） |
| `isPrimary` | Boolean | 是否为主要场景       |
| `createdAt` | Long    | 创建时间戳           |

**语义**: 章节发生的地点，支持场景分布分析

```cypher
// 示例：章节场景设定
MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
MATCH (w:WorldSetting {id: $locationId, projectId: $projectId})
MERGE (ch)-[r:SET_IN_LOCATION]->(w)
SET r.isPrimary = $isPrimary, r.duration = $duration
```

### 3.3 伏笔关系

#### 3.3.1 PLANTS_FORESHADOWING（埋下伏笔）

**方向**: `(Chapter) -[:PLANTS_FORESHADOWING]-> (Foreshadowing)`

| 属性名      | 类型   | 说明               |
| ----------- | ------ | ------------------ |
| `position`  | String | 伏笔在章节中的位置 |
| `createdAt` | Long   | 创建时间戳         |

#### 3.3.2 RESOLVES_FORESHADOWING（回收伏笔）

**方向**: `(Chapter) -[:RESOLVES_FORESHADOWING]-> (Foreshadowing)`

| 属性名         | 类型    | 说明                |
| -------------- | ------- | ------------------- |
| `satisfaction` | Integer | 伏笔回收满意度 1-10 |
| `resolvedAt`   | Long    | 回收时间戳          |

#### 3.3.3 FORESHADOWS（跨章节伏笔链）

**方向**: `(Chapter) -[:FORESHADOWS]-> (Chapter)`

| 属性名        | 类型    | 说明            |
| ------------- | ------- | --------------- |
| `type`        | String  | 伏笔类型        |
| `description` | String  | 伏笔描述        |
| `weight`      | Integer | 伏笔重要度 1-10 |

**语义**: 前章埋下的伏笔在后章回收，建立跨章节的叙事联系

```cypher
// 示例：跨章节伏笔链
MATCH (ch1:Chapter {id: $fromChapterId, projectId: $projectId})
MATCH (ch2:Chapter {id: $toChapterId, projectId: $projectId})
MERGE (ch1)-[r:FORESHADOWS]->(ch2)
SET r.type = $type, r.description = $description, r.weight = $weight
```

### 3.4 章节顺序关系（已存在，增强）

#### 3.4.1 PRECEDES（章节顺序）

**方向**: `(Chapter) -[:PRECEDES]-> (Chapter)`

> 此关系已在P0阶段实现，P1阶段保持兼容

### 3.5 关系类型白名单更新

在 `sync.ts` 中更新 `VALID_RELATION_TYPES`：

```typescript
const VALID_RELATION_TYPES = new Set([
  // P0 - 角色关系
  'ENEMY_OF',
  'ALLY_OF',
  'LOVES',
  'KIN_OF',
  'MENTORS',
  'RIVAL_OF',
  'SERVES',
  'FRIEND_OF',
  'RELATED_TO',

  // P0 - 系统关系
  'INVOLVED_IN',
  'HAS_ECHO',
  'POV_IS',
  'PRECEDES',
  'INVOLVES',
  'LOCATED_IN',
  'IMPLEMENTS',

  // P0 - WorldSetting关系
  'CONTAINS',
  'ORIGINATED_FROM',
  'RESIDES_IN',
  'CONTROLS_TERRITORY',
  'EXILED_FROM',
  'HAS_CONFLICT_PARTICIPANT',

  // P1 - Outliner关系（新增）
  'EXPANDS_TO', // PlotNode → Chapter
  'CONTAINS_BEAT', // Chapter → ChapterBeat
  'INVOLVES_CHARACTER', // Chapter → Character
  'SET_IN_LOCATION', // Chapter → WorldSetting
  'PLANTS_FORESHADOWING', // Chapter → Foreshadowing
  'RESOLVES_FORESHADOWING', // Chapter → Foreshadowing
  'FORESHADOWS', // Chapter → Chapter（跨章节伏笔）
]);
```

---

## 4. sync.ts增强方案

### 4.1 新增 syncChapterToGraph 函数

```typescript
/**
 * 将章节数据同步到图谱
 * @param projectId 项目ID
 * @param chapterData 章节数据
 * @param plotNodeMap PlotNode映射（用于建立EXPANDS_TO关系）
 * @param characterMap Character映射（用于建立INVOLVES_CHARACTER关系）
 * @param worldSettingMap WorldSetting映射（用于建立SET_IN_LOCATION关系）
 */
export const syncChapterToGraph = async (
  projectId: string,
  chapterData: any,
  plotNodeMap?: Map<string, any>,
  characterMap?: Map<string, any>,
  worldSettingMap?: Map<string, any>
): Promise<void> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 1. 创建Chapter节点
    await session.run(
      `MERGE (ch:Chapter {id: $id, projectId: $projectId})
             SET ch.title = $title,
                 ch.content = $content,
                 ch.summary = $summary,
                 ch.order = $order,
                 ch.expectedPOV = $expectedPOV,
                 ch.plotNodeId = $plotNodeId,
                 ch.wordCount = $wordCount,
                 ch.status = $status,
                 ch.lastModified = $lastModified,
                 ch.updatedAt = timestamp()`,
      {
        id: chapterData.id,
        projectId,
        title: chapterData.title,
        content: (chapterData.content || '').substring(0, 50000), // 限制内容长度
        summary: (chapterData.summary || '').substring(0, 2000),
        order: chapterData.order,
        expectedPOV: chapterData.expectedPOV || '',
        plotNodeId: chapterData.plotNodeId || null,
        wordCount: chapterData.content?.length || 0,
        status: chapterData.status || 'DRAFT',
        lastModified: chapterData.lastModified || Date.now(),
      }
    );

    // 2. 创建EXPANDS_TO关系（PlotNode → Chapter）
    if (chapterData.plotNodeId && plotNodeMap?.has(chapterData.plotNodeId)) {
      await session.run(
        `MATCH (pn:PlotNode {id: $plotNodeId, projectId: $projectId})
                 MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
                 MERGE (pn)-[r:EXPANDS_TO]->(ch)
                 SET r.createdAt = timestamp()`,
        { plotNodeId: chapterData.plotNodeId, chapterId: chapterData.id, projectId }
      );
    }

    // 3. 同步ChapterBeats
    if (chapterData.beats && Array.isArray(chapterData.beats)) {
      await syncChapterBeats(session, projectId, chapterData.id, chapterData.beats);
    }

    // 4. 创建INVOLVES_CHARACTER关系
    // 从PlotNode继承角色关系
    if (chapterData.plotNodeId && plotNodeMap?.has(chapterData.plotNodeId)) {
      const plotNode = plotNodeMap.get(chapterData.plotNodeId);
      if (plotNode.relatedCharacters && Array.isArray(plotNode.relatedCharacters)) {
        for (const charId of plotNode.relatedCharacters) {
          await session.run(
            `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
                         MATCH (c:Character {id: $charId, projectId: $projectId})
                         MERGE (ch)-[r:INVOLVES_CHARACTER]->(c)
                         SET r.role = 'SUPPORTING', r.createdAt = timestamp()`,
            { chapterId: chapterData.id, charId, projectId }
          );
        }
      }
    }

    // 5. 创建SET_IN_LOCATION关系
    // 从PlotNode继承地点关系
    if (chapterData.plotNodeId && plotNodeMap?.has(chapterData.plotNodeId)) {
      const plotNode = plotNodeMap.get(chapterData.plotNodeId);
      if (plotNode.relatedLocations && Array.isArray(plotNode.relatedLocations)) {
        for (const locId of plotNode.relatedLocations) {
          await session.run(
            `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
                         MATCH (w:WorldSetting {id: $locId, projectId: $projectId})
                         MERGE (ch)-[r:SET_IN_LOCATION]->(w)
                         SET r.isPrimary = true, r.createdAt = timestamp()`,
            { chapterId: chapterData.id, locId, projectId }
          );
        }
      }
    }

    // 6. 处理POV角色关联
    if (chapterData.expectedPOV) {
      await session.run(
        `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
                 MATCH (c:Character {projectId: $projectId})
                 WHERE toLower(c.name) CONTAINS toLower($pov)
                 MERGE (ch)-[r:POV_IS]->(c)
                 SET r.createdAt = timestamp()`,
        { chapterId: chapterData.id, pov: chapterData.expectedPOV, projectId }
      );
    }

    console.log(`✅ Synced Chapter ${chapterData.id} to graph`);
  } finally {
    await session.close();
  }
};

/**
 * 同步章节节拍
 */
const syncChapterBeats = async (
  session: any,
  projectId: string,
  chapterId: string,
  beats: any[]
): Promise<void> => {
  for (let i = 0; i < beats.length; i++) {
    const beat = beats[i];

    // 创建ChapterBeat节点
    await session.run(
      `MERGE (cb:ChapterBeat {id: $id, projectId: $projectId})
             SET cb.chapterId = $chapterId,
                 cb.type = $type,
                 cb.description = $description,
                 cb.order = $order,
                 cb.isCompleted = $isCompleted,
                 cb.updatedAt = timestamp()`,
      {
        id: beat.id,
        projectId,
        chapterId,
        type: beat.type || 'CONTENT',
        description: (beat.description || '').substring(0, 1000),
        order: i,
        isCompleted: beat.isCompleted || false,
      }
    );

    // 创建CONTAINS_BEAT关系
    await session.run(
      `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
             MATCH (cb:ChapterBeat {id: $beatId, projectId: $projectId})
             MERGE (ch)-[r:CONTAINS_BEAT]->(cb)
             SET r.order = $order`,
      { chapterId, beatId: beat.id, order: i }
    );
  }

  console.log(`  └─ Synced ${beats.length} beats for chapter ${chapterId}`);
};
```

### 4.2 新增 syncForeshadowingToGraph 函数

```typescript
/**
 * 同步伏笔到图谱
 * @param projectId 项目ID
 * @param foreshadowingData 伏笔数据
 */
export const syncForeshadowingToGraph = async (
  projectId: string,
  foreshadowingData: {
    id: string;
    subject: string;
    relation: string;
    object: string;
    type: string;
    status: 'OPEN' | 'RESOLVED' | 'ABANDONED';
    plantChapterId?: string;
    resolveChapterId?: string;
    description?: string;
    weight?: number;
  }
): Promise<void> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 1. 创建Foreshadowing节点
    await session.run(
      `MERGE (f:Foreshadowing {id: $id, projectId: $projectId})
             SET f.subject = $subject,
                 f.relation = $relation,
                 f.object = $object,
                 f.type = $type,
                 f.status = $status,
                 f.plantChapterId = $plantChapterId,
                 f.resolveChapterId = $resolveChapterId,
                 f.description = $description,
                 f.weight = $weight,
                 f.updatedAt = timestamp()`,
      {
        id: foreshadowingData.id,
        projectId,
        subject: foreshadowingData.subject,
        relation: foreshadowingData.relation,
        object: foreshadowingData.object,
        type: foreshadowingData.type,
        status: foreshadowingData.status,
        plantChapterId: foreshadowingData.plantChapterId || null,
        resolveChapterId: foreshadowingData.resolveChapterId || null,
        description: (foreshadowingData.description || '').substring(0, 1000),
        weight: foreshadowingData.weight || 5,
      }
    );

    // 2. 创建PLANTS_FORESHADOWING关系
    if (foreshadowingData.plantChapterId) {
      await session.run(
        `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
                 MATCH (f:Foreshadowing {id: $foreshadowingId, projectId: $projectId})
                 MERGE (ch)-[r:PLANTS_FORESHADOWING]->(f)
                 SET r.createdAt = timestamp()`,
        {
          chapterId: foreshadowingData.plantChapterId,
          foreshadowingId: foreshadowingData.id,
          projectId,
        }
      );
    }

    // 3. 创建RESOLVES_FORESHADOWING关系
    if (foreshadowingData.resolveChapterId && foreshadowingData.status === 'RESOLVED') {
      await session.run(
        `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
                 MATCH (f:Foreshadowing {id: $foreshadowingId, projectId: $projectId})
                 MERGE (ch)-[r:RESOLVES_FORESHADOWING]->(f)
                 SET r.resolvedAt = timestamp()`,
        {
          chapterId: foreshadowingData.resolveChapterId,
          foreshadowingId: foreshadowingData.id,
          projectId,
        }
      );
    }

    // 4. 创建跨章节FORESHADOWS关系
    if (foreshadowingData.plantChapterId && foreshadowingData.resolveChapterId) {
      await session.run(
        `MATCH (ch1:Chapter {id: $plantChapterId, projectId: $projectId})
                 MATCH (ch2:Chapter {id: $resolveChapterId, projectId: $projectId})
                 MERGE (ch1)-[r:FORESHADOWS]->(ch2)
                 SET r.type = $type,
                     r.description = $description,
                     r.weight = $weight`,
        {
          plantChapterId: foreshadowingData.plantChapterId,
          resolveChapterId: foreshadowingData.resolveChapterId,
          type: foreshadowingData.type,
          description: foreshadowingData.description || '',
          weight: foreshadowingData.weight || 5,
          projectId,
        }
      );
    }

    console.log(`✅ Synced Foreshadowing ${foreshadowingData.id} to graph`);
  } finally {
    await session.close();
  }
};
```

### 4.3 更新 doSyncProject 函数

在现有的 `doSyncProject` 函数中，增强 Chapter 同步逻辑：

```typescript
// 在 doSyncProject 中替换现有的 Chapter 同步逻辑（第8步）

// 8. Enhanced Chapter sync with P1 features
if (projectData.chapters?.length > 0) {
  const sortedChapters = [...projectData.chapters].sort((a, b) => a.order - b.order);

  // 构建映射表
  const plotNodeMap = new Map((projectData.plotNodes || []).map((pn: any) => [pn.id, pn]));
  const characterMap = new Map((projectData.characters || []).map((c: any) => [c.id, c]));
  const worldSettingMap = new Map((projectData.worldSettings || []).map((w: any) => [w.id, w]));

  // 同步每个章节
  for (let i = 0; i < sortedChapters.length; i++) {
    const ch = sortedChapters[i];

    // 调用新的 syncChapterToGraph
    await syncChapterToGraph(projectId, ch, plotNodeMap, characterMap, worldSettingMap);

    // 创建章节顺序关系
    if (i > 0) {
      await session.run(
        `MATCH (prev:Chapter {id: $prevId, projectId: $projectId})
                 MATCH (curr:Chapter {id: $currId, projectId: $projectId})
                 MERGE (prev)-[:PRECEDES]->(curr)`,
        { prevId: sortedChapters[i - 1].id, currId: ch.id, projectId }
      );
    }
  }

  console.log(`✅ Synced ${sortedChapters.length} chapters with P1 graph features`);
}

// 9. Sync foreshadowing data (if exists)
if (projectData.foreshadowings?.length > 0) {
  for (const foreshadowing of projectData.foreshadowings) {
    await syncForeshadowingToGraph(projectId, foreshadowing);
  }
  console.log(`✅ Synced ${projectData.foreshadowings.length} foreshadowings`);
}
```

---

## 5. queries.ts增强方案

### 5.1 getChapterDependencies - 章节依赖关系查询

```typescript
/**
 * 章节依赖关系接口
 */
export interface ChapterDependencies {
  currentChapter: any;
  prerequisiteChapters: Array<{
    chapter: any;
    relationshipType: string;
    reason: string;
    distance: number;
  }>;
  dependentChapters: Array<{
    chapter: any;
    relationshipType: string;
    reason: string;
    distance: number;
  }>;
  involvedCharacters: any[];
  involvedLocations: any[];
  unresolvedForeshadowings: any[];
}

/**
 * 获取章节的依赖关系
 * @param projectId 项目ID
 * @param chapterId 章节ID
 * @param maxDepth 最大查询深度（默认3）
 */
export const getChapterDependencies = async (
  projectId: string,
  chapterId: string,
  maxDepth: number = 3
): Promise<ChapterDependencies> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 1. 获取当前章节
    const currentResult = await session.run(
      `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId}) RETURN ch`,
      { projectId, chapterId }
    );

    if (currentResult.records.length === 0) {
      return {
        currentChapter: null,
        prerequisiteChapters: [],
        dependentChapters: [],
        involvedCharacters: [],
        involvedLocations: [],
        unresolvedForeshadowings: [],
      };
    }

    const currentChapter = currentResult.records[0].get('ch').properties;

    // 2. 获取前置章节（通过PRECEDES和FORESHADOWS关系）
    const prereqResult = await session.run(
      `MATCH path = (prev:Chapter {projectId: $projectId})-[:PRECEDES|FORESHADOWS*1..${maxDepth}]->(ch:Chapter {id: $chapterId})
             RETURN DISTINCT prev, length(path) as distance,
                    [r in relationships(path) | type(r)] as relTypes
             ORDER BY distance`,
      { projectId, chapterId }
    );

    // 3. 获取后继章节（通过PRECEDES和FORESHADOWS关系）
    const depResult = await session.run(
      `MATCH path = (ch:Chapter {id: $chapterId})-[:PRECEDES|FORESHADOWS*1..${maxDepth}]->(next:Chapter {projectId: $projectId})
             RETURN DISTINCT next, length(path) as distance,
                    [r in relationships(path) | type(r)] as relTypes
             ORDER BY distance`,
      { projectId, chapterId }
    );

    // 4. 获取涉及的角色
    const charsResult = await session.run(
      `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})-[:INVOLVES_CHARACTER|POV_IS]->(c:Character)
             RETURN DISTINCT c`,
      { projectId, chapterId }
    );

    // 5. 获取涉及的地点
    const locsResult = await session.run(
      `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})-[:SET_IN_LOCATION]->(w:WorldSetting)
             RETURN DISTINCT w`,
      { projectId, chapterId }
    );

    // 6. 获取未解决的伏笔
    const foreshadowingsResult = await session.run(
      `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})-[:PLANTS_FORESHADOWING]->(f:Foreshadowing)
             WHERE f.status = 'OPEN'
             RETURN f`,
      { projectId, chapterId }
    );

    return {
      currentChapter,
      prerequisiteChapters: prereqResult.records.map((r) => ({
        chapter: r.get('prev').properties,
        relationshipType: r.get('relTypes').join(' -> '),
        reason: r.get('relTypes').includes('FORESHADOWS') ? '伏笔关联' : '情节顺序',
        distance: r.get('distance').toNumber ? r.get('distance').toNumber() : r.get('distance'),
      })),
      dependentChapters: depResult.records.map((r) => ({
        chapter: r.get('next').properties,
        relationshipType: r.get('relTypes').join(' -> '),
        reason: r.get('relTypes').includes('FORESHADOWS') ? '伏笔回收' : '情节延续',
        distance: r.get('distance').toNumber ? r.get('distance').toNumber() : r.get('distance'),
      })),
      involvedCharacters: charsResult.records.map((r) => r.get('c').properties),
      involvedLocations: locsResult.records.map((r) => r.get('w').properties),
      unresolvedForeshadowings: foreshadowingsResult.records.map((r) => r.get('f').properties),
    };
  } finally {
    await session.close();
  }
};
```

### 5.2 getChapterCharacterNetwork - 章节角色网络查询

```typescript
/**
 * 章节角色网络接口
 */
export interface ChapterCharacterNetwork {
  chapterId: string;
  chapterTitle: string;
  characters: Array<{
    id: string;
    name: string;
    role: string;
    screenTime?: number;
    povCharacter: boolean;
  }>;
  relationships: Array<{
    source: string;
    sourceName: string;
    target: string;
    targetName: string;
    type: string;
    weight?: number;
    trajectory?: string;
  }>;
  factions: Array<{
    name: string;
    members: string[];
    dominantRelation: string;
  }>;
}

/**
 * 获取章节的角色网络
 * @param projectId 项目ID
 * @param chapterId 章节ID
 */
export const getChapterCharacterNetwork = async (
  projectId: string,
  chapterId: string
): Promise<ChapterCharacterNetwork | null> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 1. 获取章节基本信息
    const chapterResult = await session.run(
      `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId}) RETURN ch.id, ch.title`,
      { projectId, chapterId }
    );

    if (chapterResult.records.length === 0) {
      return null;
    }

    // 2. 获取章节涉及的角色
    const charsResult = await session.run(
      `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})-[r:INVOLVES_CHARACTER|POV_IS]->(c:Character)
             RETURN c.id as id, c.name as name, c.role as role,
                    r.screenTime as screenTime,
                    type(r) = 'POV_IS' as isPov`,
      { projectId, chapterId }
    );

    const characterIds = charsResult.records.map((r) => r.get('id'));

    // 3. 获取角色之间的关系（限定在章节涉及的角色范围内）
    const relsResult = await session.run(
      `MATCH (c1:Character {projectId: $projectId})-[r]->(c2:Character {projectId: $projectId})
             WHERE type(r) IN ['ENEMY_OF', 'ALLY_OF', 'LOVES', 'KIN_OF', 'MENTORS', 'RIVAL_OF', 'SERVES', 'FRIEND_OF']
             AND c1.id IN $characterIds AND c2.id IN $characterIds
             RETURN c1.id as source, c1.name as sourceName,
                    c2.id as target, c2.name as targetName,
                    type(r) as type, r.weight as weight, r.trajectory as trajectory`,
      { projectId, characterIds }
    );

    // 4. 分析角色阵营（基于关系强度）
    const factionResult = await session.run(
      `MATCH (c1:Character {projectId: $projectId})-[r:ALLY_OF|FRIEND_OF|KIN_OF|MENTORS]->(c2:Character {projectId: $projectId})
             WHERE c1.id IN $characterIds AND c2.id IN $characterIds
             WITH collect(DISTINCT c1) + collect(DISTINCT c2) as allChars
             UNWIND allChars as char
             WITH char, [(char)-[r:ALLY_OF|FRIEND_OF|KIN_OF|MENTORS]->(ally) | ally.name] as allies
             RETURN char.name as name, allies
             LIMIT 10`,
      { projectId, characterIds }
    );

    return {
      chapterId,
      chapterTitle: chapterResult.records[0].get('ch.title'),
      characters: charsResult.records.map((r) => ({
        id: r.get('id'),
        name: r.get('name'),
        role: r.get('role') || 'SUPPORTING',
        screenTime: r.get('screenTime'),
        povCharacter: r.get('isPov'),
      })),
      relationships: relsResult.records.map((r) => ({
        source: r.get('source'),
        sourceName: r.get('sourceName'),
        target: r.get('target'),
        targetName: r.get('targetName'),
        type: r.get('type'),
        weight: r.get('weight'),
        trajectory: r.get('trajectory'),
      })),
      factions: factionResult.records.map((r) => ({
        name: `${r.get('name')}阵营`,
        members: r.get('allies') || [],
        dominantRelation: 'ALLY_OF',
      })),
    };
  } finally {
    await session.close();
  }
};
```

### 5.3 getForeshadowingChain - 伏笔链追踪查询

```typescript
/**
 * 伏笔链接口
 */
export interface ForeshadowingChain {
  foreshadowings: Array<{
    id: string;
    subject: string;
    relation: string;
    object: string;
    type: string;
    status: string;
    plantChapter?: any;
    resolveChapter?: any;
    distance: number;
    weight?: number;
  }>;
  statistics: {
    total: number;
    open: number;
    resolved: number;
    abandoned: number;
    averageDistance: number;
  };
  timeline: Array<{
    chapterOrder: number;
    chapterTitle: string;
    planted: number;
    resolved: number;
  }>;
}

/**
 * 获取项目的伏笔链
 * @param projectId 项目ID
 * @param chapterId 起始章节ID（可选，不传则获取整个项目的伏笔链）
 */
export const getForeshadowingChain = async (
  projectId: string,
  chapterId?: string
): Promise<ForeshadowingChain> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 1. 获取伏笔列表
    const foreshadowingsResult = chapterId
      ? await session.run(
          `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})-[:PLANTS_FORESHADOWING|RESOLVES_FORESHADOWING]->(f:Foreshadowing)
                 OPTIONAL MATCH (plantCh:Chapter)-[:PLANTS_FORESHADOWING]->(f)
                 OPTIONAL MATCH (resolveCh:Chapter)-[:RESOLVES_FORESHADOWING]->(f)
                 RETURN f, plantCh, resolveCh`,
          { projectId, chapterId }
        )
      : await session.run(
          `MATCH (f:Foreshadowing {projectId: $projectId})
                 OPTIONAL MATCH (plantCh:Chapter)-[:PLANTS_FORESHADOWING]->(f)
                 OPTIONAL MATCH (resolveCh:Chapter)-[:RESOLVES_FORESHADOWING]->(f)
                 RETURN f, plantCh, resolveCh`,
          { projectId }
        );

    // 2. 计算统计数据
    const statsResult = await session.run(
      `MATCH (f:Foreshadowing {projectId: $projectId})
             WITH count(f) as total,
                  sum(CASE WHEN f.status = 'OPEN' THEN 1 ELSE 0 END) as open,
                  sum(CASE WHEN f.status = 'RESOLVED' THEN 1 ELSE 0 END) as resolved,
                  sum(CASE WHEN f.status = 'ABANDONED' THEN 1 ELSE 0 END) as abandoned
             RETURN total, open, resolved, abandoned`,
      { projectId }
    );

    // 3. 计算伏笔距离（从埋下到回收的章节跨度）
    const distanceResult = await session.run(
      `MATCH (plantCh:Chapter {projectId: $projectId})-[:PLANTS_FORESHADOWING]->(f:Foreshadowing {projectId: $projectId, status: 'RESOLVED'})
             <-[:RESOLVES_FORESHADOWING]-(resolveCh:Chapter {projectId: $projectId})
             WITH avg(resolveCh.order - plantCh.order) as avgDistance
             RETURN avgDistance`,
      { projectId }
    );

    // 4. 构建时间线
    const timelineResult = await session.run(
      `MATCH (ch:Chapter {projectId: $projectId})
             OPTIONAL MATCH (ch)-[:PLANTS_FORESHADOWING]->(planted:Foreshadowing)
             OPTIONAL MATCH (ch)-[:RESOLVES_FORESHADOWING]->(resolved:Foreshadowing)
             RETURN ch.order as order, ch.title as title,
                    count(planted) as planted, count(resolved) as resolved
             ORDER BY ch.order`,
      { projectId }
    );

    const foreshadowings = foreshadowingsResult.records.map((r) => {
      const f = r.get('f').properties;
      const plantCh = r.get('plantCh');
      const resolveCh = r.get('resolveCh');

      let distance = 0;
      if (plantCh && resolveCh) {
        distance = Math.abs((resolveCh.properties.order || 0) - (plantCh.properties.order || 0));
      }

      return {
        id: f.id,
        subject: f.subject,
        relation: f.relation,
        object: f.object,
        type: f.type,
        status: f.status,
        plantChapter: plantCh?.properties,
        resolveChapter: resolveCh?.properties,
        distance,
        weight: f.weight,
      };
    });

    const stats = statsResult.records[0];
    const avgDistance = distanceResult.records[0]?.get('avgDistance');

    return {
      foreshadowings,
      statistics: {
        total: stats?.get('total')?.toNumber?.() || stats?.get('total') || 0,
        open: stats?.get('open')?.toNumber?.() || stats?.get('open') || 0,
        resolved: stats?.get('resolved')?.toNumber?.() || stats?.get('resolved') || 0,
        abandoned: stats?.get('abandoned')?.toNumber?.() || stats?.get('abandoned') || 0,
        averageDistance: avgDistance?.toNumber?.() || avgDistance || 0,
      },
      timeline: timelineResult.records.map((r) => ({
        chapterOrder: r.get('order'),
        chapterTitle: r.get('title'),
        planted: r.get('planted').toNumber?.() || r.get('planted'),
        resolved: r.get('resolved').toNumber?.() || r.get('resolved'),
      })),
    };
  } finally {
    await session.close();
  }
};
```

### 5.4 getConflictHeatmapData - 冲突热力图数据查询

```typescript
/**
 * 冲突热力图数据接口
 */
export interface ConflictHeatmapData {
  chapters: Array<{
    id: string;
    title: string;
    order: number;
    conflictIntensity: number;
    conflictCount: number;
    conflictTypes: string[];
  }>;
  characters: Array<{
    id: string;
    name: string;
    totalConflicts: number;
    maxIntensity: number;
    avgIntensity: number;
    conflictChapters: number[];
  }>;
  heatmap: Array<{
    chapterId: string;
    chapterOrder: number;
    characterId: string;
    characterName: string;
    intensity: number;
    conflictType: string;
  }>;
  summary: {
    totalConflicts: number;
    avgIntensity: number;
    highIntensityCount: number;
    conflictTypeDistribution: Record<string, number>;
  };
}

/**
 * 获取冲突热力图数据
 * @param projectId 项目ID
 * @param chapterRange 章节范围（可选，格式：{start: number, end: number}）
 */
export const getConflictHeatmapData = async (
  projectId: string,
  chapterRange?: { start: number; end: number }
): Promise<ConflictHeatmapData> => {
  const d = getDriver();
  const session = d.session();

  try {
    const orderFilter = chapterRange ? `AND ch.order >= $startOrder AND ch.order <= $endOrder` : '';

    // 1. 获取章节级冲突数据
    const chaptersResult = await session.run(
      `MATCH (ch:Chapter {projectId: $projectId})
             WHERE 1=1 ${orderFilter}
             OPTIONAL MATCH (pn:PlotNode {projectId: $projectId})-[:EXPANDS_TO]->(ch)
             OPTIONAL MATCH (pn)-[r:HAS_CONFLICT_PARTICIPANT]->(c:Character)
             WITH ch, collect(DISTINCT {type: r.conflictType, intensity: r.intensity}) as conflicts
             RETURN ch.id as id, ch.title as title, ch.order as order,
                    conflicts,
                    size(conflicts) as conflictCount,
                    avg([conf in conflicts WHERE conf.intensity IS NOT NULL | conf.intensity]) as avgIntensity`,
      { projectId, startOrder: chapterRange?.start, endOrder: chapterRange?.end }
    );

    // 2. 获取角色级冲突数据
    const charactersResult = await session.run(
      `MATCH (c:Character {projectId: $projectId})
             OPTIONAL MATCH (pn:PlotNode {projectId: $projectId})-[r:HAS_CONFLICT_PARTICIPANT]->(c)
             OPTIONAL MATCH (pn)-[:EXPANDS_TO]->(ch:Chapter)
             WHERE 1=1 ${orderFilter}
             WITH c, collect(DISTINCT {intensity: r.intensity, chapterOrder: ch.order}) as conflicts
             RETURN c.id as id, c.name as name,
                    size(conflicts) as totalConflicts,
                    max([conf in conflicts | conf.intensity]) as maxIntensity,
                    avg([conf in conflicts | conf.intensity]) as avgIntensity,
                    [conf in conflicts WHERE conf.chapterOrder IS NOT NULL | conf.chapterOrder] as conflictChapters`,
      { projectId, startOrder: chapterRange?.start, endOrder: chapterRange?.end }
    );

    // 3. 获取热力图矩阵数据
    const heatmapResult = await session.run(
      `MATCH (ch:Chapter {projectId: $projectId})
             WHERE 1=1 ${orderFilter}
             MATCH (pn:PlotNode {projectId: $projectId})-[:EXPANDS_TO]->(ch)
             MATCH (pn)-[r:HAS_CONFLICT_PARTICIPANT]->(c:Character)
             RETURN ch.id as chapterId, ch.order as chapterOrder,
                    c.id as characterId, c.name as characterName,
                    r.intensity as intensity, r.conflictType as conflictType`,
      { projectId, startOrder: chapterRange?.start, endOrder: chapterRange?.end }
    );

    // 4. 获取汇总统计
    const summaryResult = await session.run(
      `MATCH (pn:PlotNode {projectId: $projectId})-[r:HAS_CONFLICT_PARTICIPANT]->(c:Character)
             WITH count(r) as totalConflicts,
                  avg(r.intensity) as avgIntensity,
                  sum(CASE WHEN r.intensity >= 7 THEN 1 ELSE 0 END) as highIntensityCount,
                  r.conflictType as conflictType
             RETURN totalConflicts, avgIntensity, highIntensityCount,
                    collect({type: conflictType, count: count(r)}) as typeDistribution`,
      { projectId }
    );

    const chapters = chaptersResult.records.map((r) => {
      const conflicts = r.get('conflicts') || [];
      const conflictTypes = [...new Set(conflicts.map((c: any) => c.type).filter(Boolean))];

      return {
        id: r.get('id'),
        title: r.get('title'),
        order: r.get('order'),
        conflictIntensity: r.get('avgIntensity') || 0,
        conflictCount: r.get('conflictCount').toNumber?.() || r.get('conflictCount'),
        conflictTypes,
      };
    });

    const characters = charactersResult.records.map((r) => ({
      id: r.get('id'),
      name: r.get('name'),
      totalConflicts: r.get('totalConflicts').toNumber?.() || r.get('totalConflicts'),
      maxIntensity: r.get('maxIntensity') || 0,
      avgIntensity: r.get('avgIntensity') || 0,
      conflictChapters: r.get('conflictChapters') || [],
    }));

    const heatmap = heatmapResult.records.map((r) => ({
      chapterId: r.get('chapterId'),
      chapterOrder: r.get('chapterOrder'),
      characterId: r.get('characterId'),
      characterName: r.get('characterName'),
      intensity: r.get('intensity') || 5,
      conflictType: r.get('conflictType') || 'CONFRONTATION',
    }));

    const summaryData = summaryResult.records[0];
    const typeDistribution: Record<string, number> = {};
    (summaryData?.get('typeDistribution') || []).forEach((item: any) => {
      typeDistribution[item.type || 'UNKNOWN'] = item.count.toNumber?.() || item.count;
    });

    return {
      chapters,
      characters,
      heatmap,
      summary: {
        totalConflicts:
          summaryData?.get('totalConflicts')?.toNumber?.() ||
          summaryData?.get('totalConflicts') ||
          0,
        avgIntensity: summaryData?.get('avgIntensity') || 0,
        highIntensityCount:
          summaryData?.get('highIntensityCount')?.toNumber?.() ||
          summaryData?.get('highIntensityCount') ||
          0,
        conflictTypeDistribution: typeDistribution,
      },
    };
  } finally {
    await session.close();
  }
};
```

---

## 6. 数据迁移策略

### 6.1 增量迁移方案

由于P0阶段已实现基础的Chapter同步，P1阶段采用增量迁移策略：

```typescript
/**
 * P1数据迁移脚本
 * 将现有Chapter数据迁移到新的图谱结构
 */
export const migrateToP1Graph = async (projectId: string): Promise<void> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 1. 为现有Chapter节点添加新属性
    await session.run(
      `MATCH (ch:Chapter {projectId: $projectId})
             SET ch.status = COALESCE(ch.status, 'DRAFT'),
                 ch.wordCount = COALESCE(ch.wordCount, size(ch.content)),
                 ch.updatedAt = COALESCE(ch.updatedAt, timestamp())`,
      { projectId }
    );

    // 2. 建立EXPANDS_TO关系（基于plotNodeId属性）
    await session.run(
      `MATCH (ch:Chapter {projectId: $projectId})
             WHERE ch.plotNodeId IS NOT NULL
             MATCH (pn:PlotNode {id: ch.plotNodeId, projectId: $projectId})
             MERGE (pn)-[r:EXPANDS_TO]->(ch)
             SET r.createdAt = timestamp()`,
      { projectId }
    );

    // 3. 从PlotNode继承INVOLVES_CHARACTER关系
    await session.run(
      `MATCH (pn:PlotNode {projectId: $projectId})-[:INVOLVES]->(c:Character)
             MATCH (pn)-[:EXPANDS_TO]->(ch:Chapter)
             MERGE (ch)-[r:INVOLVES_CHARACTER]->(c)
             SET r.role = 'SUPPORTING', r.createdAt = timestamp()`,
      { projectId }
    );

    // 4. 从PlotNode继承SET_IN_LOCATION关系
    await session.run(
      `MATCH (pn:PlotNode {projectId: $projectId})-[:LOCATED_IN]->(w:WorldSetting)
             MATCH (pn)-[:EXPANDS_TO]->(ch:Chapter)
             MERGE (ch)-[r:SET_IN_LOCATION]->(w)
             SET r.isPrimary = true, r.createdAt = timestamp()`,
      { projectId }
    );

    console.log(`✅ P1 migration completed for project ${projectId}`);
  } finally {
    await session.close();
  }
};
```

### 6.2 回滚方案

```typescript
/**
 * P1回滚脚本
 * 删除P1阶段新增的节点和关系，保留P0数据
 */
export const rollbackP1Migration = async (projectId: string): Promise<void> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 1. 删除P1新增的关系
    await session.run(
      `MATCH (:Chapter {projectId: $projectId})-[r:INVOLVES_CHARACTER|SET_IN_LOCATION|PLANTS_FORESHADOWING|RESOLVES_FORESHADOWING|FORESHADOWS]->()
             DELETE r`,
      { projectId }
    );

    // 2. 删除ChapterBeat节点
    await session.run(`MATCH (cb:ChapterBeat {projectId: $projectId}) DETACH DELETE cb`, {
      projectId,
    });

    // 3. 删除Foreshadowing节点
    await session.run(`MATCH (f:Foreshadowing {projectId: $projectId}) DETACH DELETE f`, {
      projectId,
    });

    // 4. 删除EXPANDS_TO关系
    await session.run(
      `MATCH (:PlotNode {projectId: $projectId})-[r:EXPANDS_TO]->(:Chapter {projectId: $projectId})
             DELETE r`,
      { projectId }
    );

    console.log(`⚠️ P1 rollback completed for project ${projectId}`);
  } finally {
    await session.close();
  }
};
```

---

## 7. 性能优化建议

### 7.1 索引优化

```cypher
// 复合索引优化
CREATE INDEX chapter_project_order_idx IF NOT EXISTS
FOR (ch:Chapter) ON (ch.projectId, ch.order);

// 全文搜索索引（章节标题和内容）
CREATE FULLTEXT INDEX chapter_fulltext_idx IF NOT EXISTS
FOR (ch:Chapter) ON EACH [ch.title, ch.summary];
```

### 7.2 查询优化建议

1. **限制查询深度**: 在 `getChapterDependencies` 中，默认 `maxDepth=3`，避免过度遍历
2. **使用参数化查询**: 所有查询使用 `$projectId` 等参数，避免Cypher注入
3. **批量操作**: 在同步多个章节时，使用事务批量提交
4. **缓存策略**: 对频繁查询的 `getConflictHeatmapData` 实施结果缓存

### 7.3 分页查询

```typescript
/**
 * 分页获取章节列表
 */
export const getChaptersPaginated = async (
  projectId: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{
  chapters: any[];
  total: number;
  page: number;
  pageSize: number;
}> => {
  const d = getDriver();
  const session = d.session();

  try {
    const skip = (page - 1) * pageSize;

    const result = await session.run(
      `MATCH (ch:Chapter {projectId: $projectId})
             RETURN ch
             ORDER BY ch.order
             SKIP $skip LIMIT $pageSize`,
      { projectId, skip, pageSize }
    );

    const countResult = await session.run(
      `MATCH (ch:Chapter {projectId: $projectId}) RETURN count(ch) as total`,
      { projectId }
    );

    return {
      chapters: result.records.map((r) => r.get('ch').properties),
      total: countResult.records[0].get('total').toNumber(),
      page,
      pageSize,
    };
  } finally {
    await session.close();
  }
};
```

---

## 8. 测试策略

### 8.1 单元测试

```typescript
// tests/graph/chapter-sync.test.ts

describe('Chapter Graph Sync (P1)', () => {
  const testProjectId = 'test-project-p1';

  beforeAll(async () => {
    // 初始化测试数据
  });

  afterAll(async () => {
    // 清理测试数据
  });

  test('should create Chapter node with all properties', async () => {
    const chapterData = {
      id: 'test-chapter-1',
      title: '测试章节',
      content: '这是测试内容',
      summary: '章节摘要',
      order: 1,
      expectedPOV: '张三',
      plotNodeId: 'test-plot-1',
      beats: [{ id: 'beat-1', type: 'CONTENT', description: '节拍1', isCompleted: false }],
    };

    await syncChapterToGraph(testProjectId, chapterData);

    // 验证节点创建
    const result = await session.run(
      `MATCH (ch:Chapter {id: $id, projectId: $projectId}) RETURN ch`,
      { id: chapterData.id, projectId: testProjectId }
    );

    expect(result.records.length).toBe(1);
    expect(result.records[0].get('ch').properties.title).toBe('测试章节');
  });

  test('should create EXPANDS_TO relationship', async () => {
    // 验证关系创建
  });

  test('should create CONTAINS_BEAT relationship', async () => {
    // 验证节拍关系
  });
});
```

### 8.2 集成测试

```typescript
// tests/graph/chapter-queries.test.ts

describe('Chapter Query APIs (P1)', () => {
  test('getChapterDependencies should return correct dependencies', async () => {
    const deps = await getChapterDependencies(testProjectId, 'chapter-3');

    expect(deps.currentChapter).not.toBeNull();
    expect(deps.prerequisiteChapters.length).toBeGreaterThan(0);
    expect(deps.involvedCharacters.length).toBeGreaterThan(0);
  });

  test('getForeshadowingChain should track open foreshadowings', async () => {
    const chain = await getForeshadowingChain(testProjectId);

    expect(chain.statistics.open).toBeGreaterThan(0);
    expect(chain.timeline.length).toBeGreaterThan(0);
  });

  test('getConflictHeatmapData should return heatmap matrix', async () => {
    const heatmap = await getConflictHeatmapData(testProjectId);

    expect(heatmap.heatmap.length).toBeGreaterThan(0);
    expect(heatmap.summary.totalConflicts).toBeGreaterThan(0);
  });
});
```

### 8.3 性能测试

```typescript
// tests/performance/graph-performance.test.ts

describe('Graph Query Performance', () => {
  test('getChapterDependencies should complete within 500ms', async () => {
    const start = Date.now();
    await getChapterDependencies(largeProjectId, 'chapter-50');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500);
  });

  test('getConflictHeatmapData should handle 100 chapters', async () => {
    const start = Date.now();
    const result = await getConflictHeatmapData(largeProjectId);
    const duration = Date.now() - start;

    expect(result.chapters.length).toBe(100);
    expect(duration).toBeLessThan(1000);
  });
});
```

---

## 9. 实施计划

### 9.1 开发任务拆分

| 任务                               | 预估时间 | 优先级 | 依赖    |
| ---------------------------------- | -------- | ------ | ------- |
| 1. 更新Schema和索引                | 0.5天    | P0     | 无      |
| 2. 实现 syncChapterToGraph         | 1天      | P0     | 任务1   |
| 3. 实现 syncForeshadowingToGraph   | 0.5天    | P1     | 任务1   |
| 4. 实现 getChapterDependencies     | 1天      | P0     | 任务2   |
| 5. 实现 getChapterCharacterNetwork | 1天      | P1     | 任务2   |
| 6. 实现 getForeshadowingChain      | 1天      | P1     | 任务3   |
| 7. 实现 getConflictHeatmapData     | 1天      | P0     | 任务2   |
| 8. 数据迁移脚本                    | 0.5天    | P1     | 任务2-7 |
| 9. 单元测试和集成测试              | 1.5天    | P0     | 任务2-7 |
| 10. 文档和代码审查                 | 0.5天    | P0     | 任务2-9 |

**总计**: 约8-9天

### 9.2 里程碑

- **M1 (Day 2)**: Schema更新完成，sync函数可用
- **M2 (Day 5)**: 核心查询API可用（Dependencies + Heatmap）
- **M3 (Day 7)**: 所有API完成，测试覆盖
- **M4 (Day 9)**: 文档完成，准备发布

---

## 10. 风险与缓解措施

| 风险                     | 影响 | 缓解措施                           |
| ------------------------ | ---- | ---------------------------------- |
| 大量章节数据导致查询超时 | 高   | 实施分页查询，限制深度，添加索引   |
| P0与P1数据冲突           | 中   | 增量迁移，保留兼容性，提供回滚脚本 |
| 伏笔追踪复杂度爆炸       | 中   | 限制伏笔链长度，使用权重过滤       |
| 角色网络查询性能差       | 中   | 使用缓存，限制角色数量，预计算阵营 |

---

## 11. 总结

本技术方案详细设计了P1阶段Outliner模块的图谱化实现，包括：

1. **Schema设计**: Chapter、ChapterBeat、Foreshadowing节点的完整属性定义
2. **关系设计**: 9种新关系类型，覆盖层级、关联、伏笔三大类
3. **Sync增强**: 新增2个同步函数，支持章节和伏笔的图谱化
4. **Query增强**: 新增4个查询API，支持依赖分析、角色网络、伏笔追踪、冲突热力图
5. **迁移策略**: 增量迁移方案，保持P0兼容性
6. **测试策略**: 单元测试、集成测试、性能测试全覆盖

实施本方案后，Outliner模块将具备完整的图谱能力，支持：

- 章节依赖关系的可视化分析
- 章节角色网络的动态展示
- 伏笔链的自动追踪和提醒
- 冲突热力图的实时生成

这将为创作者提供更强大的叙事结构分析工具，提升创作效率和质量。

---

**文档版本**: v1.0.0
**最后更新**: 2026-03-21
**下一步**: 开始实施任务1（更新Schema和索引）
