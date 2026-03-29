# P2阶段：Forge模块图谱集成技术设计文档

**文档版本**: v1.0
**创建日期**: 2026-03-21
**作者**: Backend Technical Lead
**状态**: 设计阶段

---

## 一、概述

### 1.1 背景

Forge模块是创作工坊的核心组件，负责场景正文生成、文学润色和Echo提取。根据评估报告（`.codebuddy/plans/Echoes_Outliner_Forge图谱化评估报告.md`），Forge不需要独立图谱化，但需要与知识图谱进行双向集成：

- **输入端**：从图谱获取创作上下文（角色状态、伏笔、关系）
- **输出端**：将生成结果写入图谱（Echo同步、状态更新）

### 1.2 目标

1. 在场景生成前，从图谱获取完整的上下文信息
2. 在场景生成后，自动将提取的Echo同步到图谱
3. 建立章节与图谱的关联关系
4. 实现角色PhysicalStatus的自动更新

### 1.3 范围

- 新增Forge图谱上下文查询服务
- 扩展现有`generateSceneFromIngredients`函数
- 实现Echo自动同步到图谱
- 创建章节与图谱的关联

---

## 二、现有架构分析

### 2.1 当前数据流

```
用户选择角色/地点/情节
        ↓
handleGenerate() [useDraftingActions.ts]
        ↓
fetchPhysicalStatus() + fetchUnresolvedForeshadowing() + fetchRelatedSubgraph()
        ↓
generateSceneFromIngredients() [writing.ts]
        ↓
生成正文 → 触发状态分析 → 创建Echo
        ↓
用户确认 → handleCommitToManuscript() → 保存到Chapters
```

### 2.2 现有图谱查询能力

| 函数                             | 位置            | 功能               |
| -------------------------------- | --------------- | ------------------ |
| `getPhysicalStatus()`            | `queries.ts`    | 获取角色位置和状态 |
| `fetchUnresolvedForeshadowing()` | `apiService.ts` | 获取未回收伏笔     |
| `fetchRelatedSubgraph()`         | `apiService.ts` | 获取相关子图       |
| `getPlotNodeContext()`           | `queries.ts`    | 获取情节节点上下文 |
| `getCharacterConflicts()`        | `queries.ts`    | 获取角色冲突       |

### 2.3 当前集成状态

`generateSceneFromIngredients`已支持以下图谱参数：

- `graphContext?: string` - 图谱上下文
- `physicalStatus: PhysicalStatus[]` - 角色物理状态
- `unresolvedForeshadowing: KnowledgeTriple[]` - 未回收伏笔

但存在以下问题：

1. 上下文获取分散在多个API调用中
2. 缺少关系走向（trajectory）的获取
3. 生成后没有自动同步到图谱
4. 章节与图谱的关联未建立

---

## 三、接口设计

### 3.1 ForgeGraphContext 接口

```typescript
/**
 * Forge生成所需的完整图谱上下文
 * 位于：types.ts 或 services/forgeContext.ts
 */
export interface ForgeGraphContext {
  // 角色信息（包含物理状态和关系）
  characters: Array<{
    id: string;
    name: string;
    physicalStatus: {
      location: string;
      state: string;
      isDead: boolean;
    };
    // 当前关系走向
    relationships: Array<{
      targetId: string;
      targetName: string;
      type: CharacterRelationType;
      description?: string;
      trajectory?: 'rising' | 'falling' | 'stable';
      weight?: number;
    }>;
    // 角色特征（用于深度写作）
    traits?: {
      desire?: string;
      fear?: string;
      weakness?: string;
      signature?: string;
    };
  }>;

  // 未回收的伏笔
  unresolvedForeshadowing: Array<{
    id: string;
    subject: string;
    subjectType: 'CHARACTER' | 'WORLD';
    relation: string;
    object: string;
    objectType: 'CHARACTER' | 'WORLD';
    status: 'OPEN' | 'RESOLVED' | 'ABANDONED';
    createdAt: number;
    chapterOrigin?: string; // 伏笔来源章节
  }>;

  // 场景地点上下文
  locationContext?: {
    id: string;
    title: string;
    category: 'Geography' | 'Magic/Tech' | 'Society' | 'History' | 'Other';
    content: string;
    parentLocation?: string;
    relatedCharacters?: string[];
  };

  // 情节上下文
  plotContext?: {
    currentPlotNode?: {
      id: string;
      title: string;
      content: string;
      beatTag?: BeatTag;
      order: number;
    };
    previousPlotNodes?: Array<{
      id: string;
      title: string;
      summary: string;
      order: number;
    }>;
    conflictScenario?: {
      type: ConflictType;
      participants: string[];
      stakes: string;
      intensity: number;
    };
  };

  // 分支信息
  branchInfo?: {
    activeBranchId: string;
    branchDescription?: string;
  };
}
```

### 3.2 ForgeResult 接口

```typescript
/**
 * Forge生成结果（用于同步到图谱）
 */
export interface ForgeResult {
  // 生成的正文
  content: string;

  // 章节信息
  chapter?: {
    id: string;
    title: string;
    order: number;
    plotNodeId?: string;
  };

  // 提取的Echo
  echoes: Array<{
    id: string;
    type: 'CHARACTER' | 'WORLD';
    targetId?: string;
    targetName: string;
    description: string;
    reason: string;
    status: 'PENDING' | 'ACCEPTED' | 'AUTO_ACCEPTED';
    timestamp: number;
    triples?: KnowledgeTriple[];
    confidence?: number;
    extractionEvidence?: string;
  }>;

  // 新的伏笔
  newForeshadowing?: KnowledgeTriple[];

  // 角色状态更新
  physicalStatusUpdates?: Array<{
    characterId: string;
    characterName: string;
    previousLocation?: string;
    newLocation?: string;
    previousState?: string;
    newState?: string;
  }>;
}
```

### 3.3 SyncResult 接口

```typescript
/**
 * 图谱同步结果
 */
export interface ForgeSyncResult {
  success: boolean;
  createdNodes: string[]; // 创建的节点ID
  createdEdges: string[]; // 创建的边ID
  updatedNodes: string[]; // 更新的节点ID
  createdEchoes: string[]; // 创建的Echo ID
  errors: Array<{
    type: string;
    message: string;
    details?: any;
  }>;
}
```

---

## 四、后端服务设计

### 4.1 新增查询函数

位置：`server/src/services/graph/queries.ts`

#### 4.1.1 getForgeContext

```typescript
/**
 * 获取Forge生成所需的完整图谱上下文
 * @param projectId 项目ID
 * @param characterIds 参与角色ID数组
 * @param locationIds 场景地点ID数组
 * @param plotNodeId 情节节点ID（可选）
 * @param branchId 分支ID（默认main）
 */
export const getForgeContext = async (
  projectId: string,
  characterIds: string[],
  locationIds: string[],
  plotNodeId?: string,
  branchId: string = 'main'
): Promise<ForgeGraphContext> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 1. 获取角色信息和物理状态
    const characters = await getCharactersWithContext(session, projectId, characterIds, branchId);

    // 2. 获取未回收的伏笔
    const unresolvedForeshadowing = await getUnresolvedForeshadowing(session, projectId, branchId);

    // 3. 获取地点上下文
    const locationContext =
      locationIds.length > 0
        ? await getLocationContext(session, projectId, locationIds[0], branchId)
        : undefined;

    // 4. 获取情节上下文
    const plotContext = plotNodeId
      ? await getPlotContext(session, projectId, plotNodeId, branchId)
      : undefined;

    return {
      characters,
      unresolvedForeshadowing,
      locationContext,
      plotContext,
      branchInfo: {
        activeBranchId: branchId,
      },
    };
  } finally {
    await session.close();
  }
};
```

#### 4.1.2 getCharactersWithContext

```typescript
/**
 * 获取角色的完整上下文（状态+关系+特征）
 */
const getCharactersWithContext = async (
  session: Session,
  projectId: string,
  characterIds: string[],
  branchId: string
): Promise<ForgeGraphContext['characters']> => {
  // 查询角色基本信息 + 物理状态
  const charsResult = await session.run(
    `MATCH (c:Character {projectId: $projectId})
         WHERE c.id IN $characterIds
         AND (c.branchId IS NULL OR c.branchId = 'main' OR c.branchId = $branchId)
         OPTIONAL MATCH (c)-[locRel:LOCATED_IN]->(l:WorldSetting)
         WHERE (locRel.branchId IS NULL OR locRel.branchId = 'main' OR locRel.branchId = $branchId)
         RETURN c.id as id,
                c.name as name,
                c.state as state,
                c.isDead as isDead,
                c.desire as desire,
                c.fear as fear,
                c.weakness as weakness,
                c.signature as signature,
                l.title as location`,
    { projectId, characterIds, branchId }
  );

  const characters = [];

  for (const charRecord of charsResult.records) {
    const charId = charRecord.get('id');

    // 查询该角色的关系
    const relsResult = await session.run(
      `MATCH (c:Character {id: $charId, projectId: $projectId})
             -[r:ENEMY_OF|ALLY_OF|LOVES|KIN_OF|MENTORS|RIVAL_OF|SERVES|FRIEND_OF|RELATED_TO]->
             (target:Character {projectId: $projectId})
             WHERE (r.branchId IS NULL OR r.branchId = 'main' OR r.branchId = $branchId)
             RETURN target.id as targetId,
                    target.name as targetName,
                    type(r) as type,
                    r.description as description,
                    r.trajectory as trajectory,
                    r.weight as weight`,
      { projectId, charId, branchId }
    );

    characters.push({
      id: charId,
      name: charRecord.get('name'),
      physicalStatus: {
        location: charRecord.get('location') || '未知地点',
        state: charRecord.get('state') || '正常',
        isDead: charRecord.get('isDead') === true,
      },
      relationships: relsResult.records.map((r) => ({
        targetId: r.get('targetId'),
        targetName: r.get('targetName'),
        type: r.get('type') as CharacterRelationType,
        description: r.get('description'),
        trajectory: r.get('trajectory'),
        weight: r.get('weight')?.toNumber?.(),
      })),
      traits: {
        desire: charRecord.get('desire'),
        fear: charRecord.get('fear'),
        weakness: charRecord.get('weakness'),
        signature: charRecord.get('signature'),
      },
    });
  }

  return characters;
};
```

#### 4.1.3 getUnresolvedForeshadowing

```typescript
/**
 * 获取未回收的伏笔（从关系边中提取）
 */
const getUnresolvedForeshadowing = async (
  session: Session,
  projectId: string,
  branchId: string
): Promise<ForgeGraphContext['unresolvedForeshadowing']> => {
  const result = await session.run(
    `MATCH (a {projectId: $projectId})-[r {isForeshadowing: true, status: 'OPEN'}]->(b {projectId: $projectId})
         WHERE (r.branchId IS NULL OR r.branchId = 'main' OR r.branchId = $branchId)
         RETURN elementId(r) as id,
                a.name as subject,
                labels(a)[0] as subjectType,
                type(r) as relation,
                b.name as object,
                labels(b)[0] as objectType,
                r.status as status,
                r.createdAt as createdAt,
                r.chapterOrigin as chapterOrigin`,
    { projectId, branchId }
  );

  return result.records.map((r) => ({
    id: r.get('id'),
    subject: r.get('subject'),
    subjectType: r.get('subjectType') === 'Character' ? 'CHARACTER' : 'WORLD',
    relation: r.get('relation'),
    object: r.get('object'),
    objectType: r.get('objectType') === 'Character' ? 'CHARACTER' : 'WORLD',
    status: r.get('status') || 'OPEN',
    createdAt: r.get('createdAt')?.toNumber?.() || Date.now(),
    chapterOrigin: r.get('chapterOrigin'),
  }));
};
```

#### 4.1.4 getLocationContext

```typescript
/**
 * 获取地点上下文
 */
const getLocationContext = async (
  session: Session,
  projectId: string,
  locationId: string,
  branchId: string
): Promise<ForgeGraphContext['locationContext']> => {
  const result = await session.run(
    `MATCH (w:WorldSetting {id: $locationId, projectId: $projectId})
         OPTIONAL MATCH (parent:WorldSetting)-[:CONTAINS]->(w)
         OPTIONAL MATCH (c:Character)-[:RESIDES_IN]->(w)
         RETURN w.id as id,
                w.title as title,
                w.category as category,
                w.content as content,
                parent.title as parentLocation,
                collect(c.name) as relatedCharacters`,
    { projectId, locationId }
  );

  if (result.records.length === 0) return undefined;

  const record = result.records[0];
  return {
    id: record.get('id'),
    title: record.get('title'),
    category: record.get('category') || 'Other',
    content: record.get('content') || '',
    parentLocation: record.get('parentLocation'),
    relatedCharacters: record.get('relatedCharacters'),
  };
};
```

#### 4.1.5 getPlotContext

```typescript
/**
 * 获取情节上下文
 */
const getPlotContext = async (
  session: Session,
  projectId: string,
  plotNodeId: string,
  branchId: string
): Promise<ForgeGraphContext['plotContext']> => {
  // 获取当前情节节点
  const currentResult = await session.run(
    `MATCH (pn:PlotNode {id: $plotNodeId, projectId: $projectId})
         RETURN pn.id as id,
                pn.title as title,
                pn.content as content,
                pn.beatTag as beatTag,
                pn.order as order,
                pn.conflictScenario as conflictScenario`,
    { projectId, plotNodeId }
  );

  if (currentResult.records.length === 0) return undefined;

  const current = currentResult.records[0];

  // 获取前驱节点（最近3个）
  const prevResult = await session.run(
    `MATCH (prev:PlotNode {projectId: $projectId})
         WHERE prev.order < $currentOrder
         RETURN prev.id as id,
                prev.title as title,
                prev.content as summary,
                prev.order as order
         ORDER BY prev.order DESC
         LIMIT 3`,
    { projectId, currentOrder: current.get('order')?.toNumber?.() || 0 }
  );

  const conflictScenario = current.get('conflictScenario');
  let parsedConflict = undefined;
  if (conflictScenario) {
    try {
      parsedConflict =
        typeof conflictScenario === 'string' ? JSON.parse(conflictScenario) : conflictScenario;
    } catch (e) {
      console.warn('Failed to parse conflictScenario:', e);
    }
  }

  return {
    currentPlotNode: {
      id: current.get('id'),
      title: current.get('title'),
      content: current.get('content') || '',
      beatTag: current.get('beatTag'),
      order: current.get('order')?.toNumber?.() || 0,
    },
    previousPlotNodes: prevResult.records.map((r) => ({
      id: r.get('id'),
      title: r.get('title'),
      summary: r.get('summary') || '',
      order: r.get('order')?.toNumber?.() || 0,
    })),
    conflictScenario: parsedConflict,
  };
};
```

### 4.2 新增同步函数

位置：`server/src/services/graph/sync.ts`

#### 4.2.1 syncForgeResult

```typescript
/**
 * 同步Forge生成结果到图谱
 * @param projectId 项目ID
 * @param result Forge生成结果
 * @param branchId 分支ID
 */
export const syncForgeResult = async (
  projectId: string,
  result: ForgeResult,
  branchId: string = 'main'
): Promise<ForgeSyncResult> => {
  const d = getDriver();
  const session = d.session();
  const syncResult: ForgeSyncResult = {
    success: true,
    createdNodes: [],
    createdEdges: [],
    updatedNodes: [],
    createdEchoes: [],
    errors: [],
  };

  try {
    // 1. 创建/更新章节节点
    if (result.chapter) {
      await syncChapter(session, projectId, result.chapter, syncResult);
    }

    // 2. 同步Echo到图谱
    for (const echo of result.echoes) {
      await syncEcho(session, projectId, echo, branchId, syncResult);
    }

    // 3. 同步新的伏笔
    if (result.newForeshadowing) {
      for (const triple of result.newForeshadowing) {
        await syncForeshadowing(
          session,
          projectId,
          triple,
          result.chapter?.id,
          branchId,
          syncResult
        );
      }
    }

    // 4. 更新角色物理状态
    if (result.physicalStatusUpdates) {
      for (const update of result.physicalStatusUpdates) {
        await updatePhysicalStatus(session, projectId, update, syncResult);
      }
    }

    // 5. 创建章节与角色的关联
    if (result.chapter) {
      await linkChapterToEntities(session, projectId, result.chapter.id, result.echoes, syncResult);
    }
  } catch (error) {
    syncResult.success = false;
    syncResult.errors.push({
      type: 'SYNC_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    });
  } finally {
    await session.close();
  }

  return syncResult;
};
```

#### 4.2.2 syncChapter

```typescript
/**
 * 创建/更新章节节点
 */
const syncChapter = async (
  session: Session,
  projectId: string,
  chapter: ForgeResult['chapter'],
  syncResult: ForgeSyncResult
): Promise<void> => {
  if (!chapter) return;

  const result = await session.run(
    `MERGE (ch:Chapter {id: $chapterId, projectId: $projectId})
         SET ch.title = $title,
             ch.order = $order,
             ch.plotNodeId = $plotNodeId,
             ch.lastModified = timestamp()
         RETURN ch.id as id`,
    {
      projectId,
      chapterId: chapter.id,
      title: chapter.title,
      order: chapter.order,
      plotNodeId: chapter.plotNodeId || null,
    }
  );

  if (result.records.length > 0) {
    syncResult.createdNodes.push(result.records[0].get('id'));
  }
};
```

#### 4.2.3 syncEcho

```typescript
/**
 * 同步单个Echo到图谱
 */
const syncEcho = async (
  session: Session,
  projectId: string,
  echo: ForgeResult['echoes'][0],
  branchId: string,
  syncResult: ForgeSyncResult
): Promise<void> => {
  // 1. 创建Echo节点
  const echoResult = await session.run(
    `CREATE (e:Echo {
            id: $echoId,
            projectId: $projectId,
            type: $type,
            targetId: $targetId,
            targetName: $targetName,
            description: $description,
            reason: $reason,
            status: $status,
            timestamp: $timestamp,
            triples: $triples,
            confidence: $confidence,
            extractionEvidence: $evidence,
            branchId: $branchId
        })
        RETURN e.id as id`,
    {
      projectId,
      echoId: echo.id,
      type: echo.type,
      targetId: echo.targetId || null,
      targetName: echo.targetName,
      description: echo.description,
      reason: echo.reason,
      status: echo.status,
      timestamp: echo.timestamp,
      triples: echo.triples ? JSON.stringify(echo.triples) : null,
      confidence: echo.confidence || 0.5,
      evidence: echo.extractionEvidence || null,
      branchId,
    }
  );

  const echoId = echoResult.records[0]?.get('id');
  if (echoId) {
    syncResult.createdEchoes.push(echoId);
  }

  // 2. 创建Echo与目标实体的关联
  if (echo.targetId) {
    const targetType = echo.type === 'CHARACTER' ? 'Character' : 'WorldSetting';
    await session.run(
      `MATCH (e:Echo {id: $echoId})
             MATCH (target:${targetType} {id: $targetId, projectId: $projectId})
             MERGE (e)-[:AFFECTS]->(target)`,
      { echoId, targetId: echo.targetId, projectId }
    );
    syncResult.createdEdges.push(`${echoId}-AFFECTS-${echo.targetId}`);
  }

  // 3. 如果Echo包含三元组，同步关系变更
  if (echo.triples && echo.triples.length > 0) {
    for (const triple of echo.triples) {
      await syncTripleFromEcho(session, projectId, triple, echo.timestamp, branchId, syncResult);
    }
  }
};
```

#### 4.2.4 syncTripleFromEcho

```typescript
/**
 * 从Echo的三元组同步关系到图谱
 */
const syncTripleFromEcho = async (
  session: Session,
  projectId: string,
  triple: KnowledgeTriple,
  timestamp: number,
  branchId: string,
  syncResult: ForgeSyncResult
): Promise<void> => {
  // 安全处理关系类型
  const relationType = sanitizeRelationType(triple.relation);

  // 查找或创建主体和客体节点
  // 这里假设主体和客体都是已存在的角色或世界设定
  const result = await session.run(
    `MATCH (subject {name: $subjectName, projectId: $projectId})
         MATCH (object {name: $objectName, projectId: $projectId})
         MERGE (subject)-[r:${relationType}]->(object)
         SET r.weight = $weight,
             r.trajectory = $trajectory,
             r.isForeshadowing = $isForeshadowing,
             r.status = $status,
             r.branchId = $branchId,
             r.lastUpdated = $timestamp
         RETURN subject.id as subjectId, object.id as objectId`,
    {
      projectId,
      subjectName: triple.subject,
      objectName: triple.object,
      weight: triple.weight || 50,
      trajectory: triple.trajectory || 'stable',
      isForeshadowing: triple.isForeshadowing || false,
      status: triple.status || 'RESOLVED',
      branchId,
      timestamp,
    }
  );

  if (result.records.length > 0) {
    syncResult.updatedNodes.push(result.records[0].get('subjectId'));
    syncResult.updatedNodes.push(result.records[0].get('objectId'));
  }
};
```

#### 4.2.5 updatePhysicalStatus

```typescript
/**
 * 更新角色物理状态
 */
const updatePhysicalStatus = async (
  session: Session,
  projectId: string,
  update: ForgeResult['physicalStatusUpdates'][0],
  syncResult: ForgeSyncResult
): Promise<void> => {
  // 更新角色状态
  await session.run(
    `MATCH (c:Character {id: $characterId, projectId: $projectId})
         SET c.state = $newState`,
    {
      projectId,
      characterId: update.characterId,
      newState: update.newState || update.previousState,
    }
  );

  // 更新位置关系
  if (update.newLocation && update.newLocation !== update.previousLocation) {
    // 删除旧的位置关系
    await session.run(
      `MATCH (c:Character {id: $characterId, projectId: $projectId})
             -[r:LOCATED_IN]->(old:WorldSetting)
             DELETE r`,
      { projectId, characterId: update.characterId }
    );

    // 创建新的位置关系
    await session.run(
      `MATCH (c:Character {id: $characterId, projectId: $projectId})
             MATCH (l:WorldSetting {title: $locationTitle, projectId: $projectId})
             MERGE (c)-[:LOCATED_IN]->(l)`,
      { projectId, characterId: update.characterId, locationTitle: update.newLocation }
    );
  }

  syncResult.updatedNodes.push(update.characterId);
};
```

#### 4.2.6 linkChapterToEntities

```typescript
/**
 * 创建章节与实体的关联
 */
const linkChapterToEntities = async (
  session: Session,
  projectId: string,
  chapterId: string,
  echoes: ForgeResult['echoes'],
  syncResult: ForgeSyncResult
): Promise<void> => {
  // 从Echo中提取涉及的角色和地点
  const characterIds = new Set<string>();
  const locationIds = new Set<string>();

  for (const echo of echoes) {
    if (echo.type === 'CHARACTER' && echo.targetId) {
      characterIds.add(echo.targetId);
    }
  }

  // 创建章节与角色的关联
  for (const charId of characterIds) {
    await session.run(
      `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
             MATCH (c:Character {id: $charId, projectId: $projectId})
             MERGE (ch)-[:INVOLVES_CHARACTER]->(c)`,
      { projectId, chapterId, charId }
    );
    syncResult.createdEdges.push(`${chapterId}-INVOLVES_CHARACTER-${charId}`);
  }

  // 创建章节与Echo的关联
  for (const echo of echoes) {
    await session.run(
      `MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})
             MATCH (e:Echo {id: $echoId, projectId: $projectId})
             MERGE (ch)-[:GENERATED_ECHO]->(e)`,
      { projectId, chapterId, echoId: echo.id }
    );
  }
};
```

---

## 五、API端点设计

### 5.1 新增端点

位置：`server/src/routes/graph.ts`

```typescript
// GET /api/graph/:projectId/forge-context
// 获取Forge生成所需的完整图谱上下文
router.get('/:projectId/forge-context', async (req, res) => {
  const { projectId } = req.params;
  const { characterIds, locationIds, plotNodeId, branchId } = req.query;

  try {
    const context = await getForgeContext(
      projectId,
      JSON.parse((characterIds as string) || '[]'),
      JSON.parse((locationIds as string) || '[]'),
      plotNodeId as string,
      (branchId as string) || 'main'
    );
    res.json(context);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get forge context' });
  }
});

// POST /api/graph/:projectId/forge-sync
// 同步Forge生成结果到图谱
router.post('/:projectId/forge-sync', async (req, res) => {
  const { projectId } = req.params;
  const { result, branchId } = req.body;

  try {
    const syncResult = await syncForgeResult(projectId, result as ForgeResult, branchId || 'main');
    res.json(syncResult);
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync forge result' });
  }
});
```

---

## 六、前端集成

### 6.1 新增API调用

位置：`services/apiService.ts`

```typescript
/**
 * 获取Forge图谱上下文
 */
export const fetchForgeContext = async (
  projectId: string,
  characterIds: string[],
  locationIds: string[],
  plotNodeId?: string,
  branchId: string = 'main'
): Promise<ForgeGraphContext> => {
  const cacheKey = generateCacheKey(
    'forgeContext',
    projectId,
    characterIds.join(','),
    locationIds.join(','),
    plotNodeId || '',
    branchId
  );

  const cached = await cacheManager.get<ForgeGraphContext>(cacheKey);
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({
    characterIds: JSON.stringify(characterIds),
    locationIds: JSON.stringify(locationIds),
    branchId,
  });
  if (plotNodeId) params.append('plotNodeId', plotNodeId);

  const response = await fetch(`${API_BASE}/graph/${projectId}/forge-context?${params}`);
  if (!response.ok) throw new Error('Failed to fetch forge context');

  const data = await response.json();
  await cacheManager.set(cacheKey, data);

  return data;
};

/**
 * 同步Forge结果到图谱
 */
export const syncForgeResultApi = async (
  projectId: string,
  result: ForgeResult,
  branchId: string = 'main'
): Promise<ForgeSyncResult> => {
  const response = await fetch(`${API_BASE}/graph/${projectId}/forge-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ result, branchId }),
  });
  if (!response.ok) throw new Error('Failed to sync forge result');
  return response.json();
};
```

### 6.2 修改useDraftingActions

位置：`components/DraftingRoom/useDraftingActions.ts`

```typescript
// 导入新的API
import { fetchForgeContext, syncForgeResultApi } from '../../services/apiService';

// 修改handleGenerate函数
const handleGenerate = async () => {
  // ... existing validation code ...

  setIsGenerating(true);
  setExtractedEchoes([]);
  try {
    const activeCharacters = (project.characters || []).filter((c) => selectedChars.includes(c.id));
    const activeSettings = (project.worldSettings || []).filter((w) =>
      selectedSettingIds.includes(w.id)
    );

    let forgeContext: ForgeGraphContext | undefined;
    let physicalStatus: PhysicalStatus[] = [];
    let unresolvedForeshadowing: KnowledgeTriple[] = [];
    let graphContext: string | undefined;

    if (useBackend) {
      // 使用新的统一API获取完整上下文
      forgeContext = await fetchForgeContext(
        project.id,
        selectedChars,
        selectedSettingIds,
        localPlotNodeId || undefined,
        activeBranchId
      );

      // 从上下文中提取所需数据
      physicalStatus = forgeContext.characters.map((c) => ({
        name: c.name,
        location: c.physicalStatus.location,
        state: c.physicalStatus.state,
        isDead: c.physicalStatus.isDead,
      }));

      unresolvedForeshadowing = forgeContext.unresolvedForeshadowing.map((f) => ({
        subject: f.subject,
        relation: f.relation,
        object: f.object,
        status: f.status,
      }));

      // 构建图谱上下文字符串
      graphContext = buildGraphContextString(forgeContext);
    }

    const result = await generateSceneFromIngredients(
      project.genre,
      plotBeat,
      activeCharacters,
      activeSettings,
      project.worldSettings || [],
      effectiveCreativeSettings,
      previousContext,
      pacing,
      project.echoes || [],
      targetWordCount,
      povCharName,
      rollingSummary,
      activeChapterId || undefined,
      activeTwist || undefined,
      graphContext,
      physicalStatus,
      unresolvedForeshadowing
    );

    // ... existing result handling code ...
  } catch (e) {
    // ... error handling ...
  } finally {
    setIsGenerating(false);
  }
};

// 新增：构建图谱上下文字符串
const buildGraphContextString = (context: ForgeGraphContext): string => {
  let result = '';

  // 添加关系走向信息
  if (context.characters.length > 0) {
    result += '【角色关系走向】\n';
    for (const char of context.characters) {
      if (char.relationships.length > 0) {
        result += `${char.name}的关系:\n`;
        for (const rel of char.relationships) {
          const trajectoryLabel = {
            rising: '升温',
            falling: '恶化',
            stable: '稳定',
          }[rel.trajectory || 'stable'];
          result += `  - 与${rel.targetName}: ${rel.type} (${trajectoryLabel})\n`;
        }
      }
    }
    result += '\n';
  }

  // 添加情节上下文
  if (context.plotContext?.currentPlotNode) {
    result += '【当前情节节点】\n';
    result += `${context.plotContext.currentPlotNode.title}: ${context.plotContext.currentPlotNode.content}\n`;
    if (context.plotContext.conflictScenario) {
      result += `冲突类型: ${context.plotContext.conflictScenario.type}\n`;
      result += `冲突赌注: ${context.plotContext.conflictScenario.stakes}\n`;
    }
    result += '\n';
  }

  return result;
};

// 修改handleCommitToManuscript，添加图谱同步
const handleCommitToManuscript = async () => {
  // ... existing code until save completes ...

  // 保存成功后同步到图谱
  if (useBackend) {
    try {
      const forgeResult: ForgeResult = {
        content: generatedContent,
        chapter: {
          id: chapterIdToUpdate || newChapterId,
          title,
          order,
          plotNodeId: localPlotNodeId || undefined,
        },
        echoes: extractedEchoes.length > 0 ? extractedEchoes : [],
        physicalStatusUpdates: [], // 可从Echo中提取
      };

      const syncResult = await syncForgeResultApi(project.id, forgeResult, activeBranchId);
      if (!syncResult.success) {
        console.warn('Forge sync completed with errors:', syncResult.errors);
      }
    } catch (syncError) {
      console.error('Failed to sync to graph:', syncError);
      // 不阻断用户流程，仅记录错误
    }
  }

  // ... rest of the code ...
};
```

---

## 七、上下文构建优化

### 7.1 增强的上下文构建

修改`services/gemini/writing.ts`中的`generateSceneFromIngredients`：

```typescript
// 在现有physicalStatus和unresolvedForeshadowing基础上
// 增加关系走向和角色特征的上下文

if (forgeContext) {
  // 角色特征（深度写作）
  if (forgeContext.characters.length > 0) {
    context += `【角色心理特征】\n`;
    forgeContext.characters.forEach((char) => {
      if (char.traits) {
        context += `${char.name}:\n`;
        if (char.traits.desire) context += `  - 核心欲望: ${char.traits.desire}\n`;
        if (char.traits.fear) context += `  - 核心恐惧: ${char.traits.fear}\n`;
        if (char.traits.weakness) context += `  - 性格弱点: ${char.traits.weakness}\n`;
        if (char.traits.signature) context += `  - 标志特征: ${char.traits.signature}\n`;
      }
    });
    context += '\n';
  }

  // 关系走向（用于动态关系描写）
  const activeRelationships = forgeContext.characters
    .flatMap((c) => c.relationships)
    .filter((r) => r.trajectory !== 'stable');

  if (activeRelationships.length > 0) {
    context += `【关系动态变化】\n`;
    context += `以下关系正在发生变化，请在写作中体现这种变化趋势：\n`;
    activeRelationships.forEach((rel) => {
      const trend = rel.trajectory === 'rising' ? '升温/改善' : '恶化/紧张';
      context += `- ${rel.targetName}之间的关系正在${trend}\n`;
    });
    context += '\n';
  }

  // 情节上下文
  if (forgeContext.plotContext?.previousPlotNodes) {
    context += `【前情提要】\n`;
    forgeContext.plotContext.previousPlotNodes.forEach((node) => {
      context += `- ${node.title}: ${node.summary.slice(0, 100)}...\n`;
    });
    context += '\n';
  }
}
```

---

## 八、实现计划

### 8.1 阶段一：后端查询服务（2-3天）

| 任务                           | 文件                                   | 优先级 |
| ------------------------------ | -------------------------------------- | ------ |
| 添加ForgeGraphContext接口      | `types.ts`                             | P0     |
| 实现getForgeContext            | `server/src/services/graph/queries.ts` | P0     |
| 实现getCharactersWithContext   | `server/src/services/graph/queries.ts` | P0     |
| 实现getUnresolvedForeshadowing | `server/src/services/graph/queries.ts` | P1     |
| 实现getLocationContext         | `server/src/services/graph/queries.ts` | P1     |
| 实现getPlotContext             | `server/src/services/graph/queries.ts` | P1     |

### 8.2 阶段二：同步服务（2-3天）

| 任务                      | 文件                                | 优先级 |
| ------------------------- | ----------------------------------- | ------ |
| 实现syncForgeResult       | `server/src/services/graph/sync.ts` | P0     |
| 实现syncEcho              | `server/src/services/graph/sync.ts` | P0     |
| 实现syncTripleFromEcho    | `server/src/services/graph/sync.ts` | P0     |
| 实现updatePhysicalStatus  | `server/src/services/graph/sync.ts` | P1     |
| 实现linkChapterToEntities | `server/src/services/graph/sync.ts` | P1     |

### 8.3 阶段三：API和前端集成（2天）

| 任务                         | 文件                                            | 优先级 |
| ---------------------------- | ----------------------------------------------- | ------ |
| 添加API端点                  | `server/src/routes/graph.ts`                    | P0     |
| 添加fetchForgeContext        | `services/apiService.ts`                        | P0     |
| 添加syncForgeResultApi       | `services/apiService.ts`                        | P0     |
| 修改handleGenerate           | `components/DraftingRoom/useDraftingActions.ts` | P0     |
| 修改handleCommitToManuscript | `components/DraftingRoom/useDraftingActions.ts` | P0     |
| 增强上下文构建               | `services/gemini/writing.ts`                    | P1     |

---

## 九、测试计划

### 9.1 单元测试

```typescript
// server/src/services/graph/__tests__/forgeContext.test.ts

describe('getForgeContext', () => {
  it('should return character physical status', async () => {
    const context = await getForgeContext(
      'test-project',
      ['char-1', 'char-2'],
      [],
      undefined,
      'main'
    );

    expect(context.characters).toHaveLength(2);
    expect(context.characters[0].physicalStatus).toBeDefined();
  });

  it('should return character relationships with trajectory', async () => {
    const context = await getForgeContext('test-project', ['char-1'], [], undefined, 'main');

    expect(context.characters[0].relationships).toBeDefined();
    expect(context.characters[0].relationships[0].trajectory).toBeDefined();
  });

  it('should return unresolved foreshadowing', async () => {
    const context = await getForgeContext('test-project', [], [], undefined, 'main');

    expect(context.unresolvedForeshadowing).toBeDefined();
  });
});

describe('syncForgeResult', () => {
  it('should create chapter node', async () => {
    const result = await syncForgeResult('test-project', {
      content: 'test',
      chapter: {
        id: 'chapter-1',
        title: 'Test Chapter',
        order: 1,
      },
      echoes: [],
    });

    expect(result.createdNodes).toContain('chapter-1');
  });

  it('should sync echoes to graph', async () => {
    const result = await syncForgeResult('test-project', {
      content: 'test',
      echoes: [
        {
          id: 'echo-1',
          type: 'CHARACTER',
          targetName: 'Test Character',
          description: 'Test change',
          reason: 'Test reason',
          status: 'ACCEPTED',
          timestamp: Date.now(),
        },
      ],
    });

    expect(result.createdEchoes).toContain('echo-1');
  });
});
```

### 9.2 集成测试

```typescript
// tests/integration/forge-graph.test.ts

describe('Forge-Graph Integration', () => {
  it('should provide context for scene generation', async () => {
    // 1. 创建测试项目
    // 2. 添加角色和关系
    // 3. 添加伏笔
    // 4. 调用getForgeContext
    // 5. 验证返回的上下文
  });

  it('should sync generated content to graph', async () => {
    // 1. 生成场景
    // 2. 提取Echo
    // 3. 同步到图谱
    // 4. 验证节点和边创建
  });
});
```

---

## 十、风险与缓解措施

### 10.1 技术风险

| 风险         | 影响         | 缓解措施                             |
| ------------ | ------------ | ------------------------------------ |
| 图谱查询性能 | 生成延迟增加 | 添加缓存、优化查询、限制查询深度     |
| 同步失败     | 数据不一致   | 实现事务、添加重试机制、记录错误日志 |
| 分支隔离     | 数据污染     | 严格使用branchId过滤、测试分支合并   |

### 10.2 兼容性风险

| 风险           | 影响       | 缓解措施                |
| -------------- | ---------- | ----------------------- |
| 旧数据缺少字段 | 查询失败   | 使用可选链、提供默认值  |
| API变更        | 前端不兼容 | 保持向后兼容、版本化API |

---

## 十一、总结

本设计文档详细描述了P2阶段Forge模块与图谱的集成方案，包括：

1. **统一的上下文获取**：通过`getForgeContext`一次性获取所有生成所需信息
2. **自动化的结果同步**：通过`syncForgeResult`将生成结果自动写入图谱
3. **增强的上下文利用**：利用关系走向、角色特征等深度信息提升生成质量
4. **完整的关联建立**：章节与角色、Echo、情节节点的关联

实现后，Forge将成为图谱的活跃消费者和生产者，形成完整的创作-记忆闭环。

---

**下一步行动**：

1. 评审本设计文档
2. 创建实现任务卡片
3. 按阶段开始实现
