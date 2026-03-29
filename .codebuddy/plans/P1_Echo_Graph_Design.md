# P1阶段： Echo模块图谱化详细技术方案

**版本**: v1.0.0
**设计日期**: 2026-03-21
**阶段**: P1（Echoes模块图谱化)
**前置阶段**: P0 (Character和PlotNode图谱化 - 已完成)

**设计者**: Backend Technical Lead

---

## 一、设计背景

### 1.1 集成目标

基于P0阶段Character和PlotNode图谱化的成功实施，现需要将Echoes模块集成到知识图谱系统中,实现以下核心功能：

1. **关系三元组同步** - 将Echo中的KnowledgeTriple同步到图谱作为边
2. **Echo节点管理** - 创建Echo节点并建立与Character/WorldSetting的关联
3. **时序查询** - 支持基于时间线的关系演变分析
4. **矛盾检测** - 利用图谱遍历检测关系矛盾

5. **伏笔追踪** - 追踪未回收的伏笔

### 1.2 技术决策

**存储方案**: 复用P0阶段的Neo4j图数据库
**同步策略**: 采用双写策略（MySQL + Neo4j）
**冲突处理**: 乐观锁 + 冲突检测
**分支支持**: 支持多分支并行实验

---

## 二、Schema设计

### 2.1 Echo节点Schema

```cypher
// 创建约束
CREATE CONSTRAINT echo_id_unique IF NOT EXISTS FOR (e:Echo) REQUIRE e.id IS UNIQUE;
CREATE CONSTRAINT echo_project_id IF NOT EXISTS FOR (e:Echo) REQUIRE (e.projectId, e.id) EXISTS (id, projectId);
CREATE INDEX echo_target_idx IF NOT EXISTS FOR (e:Echo) ON (e.targetId, e.projectId);
CREATE INDEX echo_timestamp_index IF NOT EXISTS FOR (e:Echo) on (e.timestamp, e.projectId);
CREATE INDEX echo_status_index IF NOT EXISTS FOR (e:Echo) on (e.status, e.projectId);
```

#### 属性定义

| 属性名               | 类型   | 必需 | 索引 | 说明                                                               |
| -------------------- | ------ | ---- | ---- | ------------------------------------------------------------------ |
| `id`                 | String | ✓    | ✓    | 唯一标识符（UUID）                                                 |
| `projectId`          | String | ✓    | ✓    | 项目ID（多租户隔离）                                               |
| `type`               | String | ✓    | ✓    | 类型： 'CHARACTER' 或 'WORLD'                                      |
| `targetId`           | String | ✓    | ✓    | 目标实体ID（Character或WorldSetting）                              |
| `targetName`         | String | ✓    |      | 目标实体名称                                                       |
| `description`        | String | ✓    |      | 变更描述                                                           |
| `reason`             | String |      |      | 变更原因                                                           |
| `status`             | String | ✓    |      | 状态： PENDING/ACCEPTED/REJECTED/PREDICTION/ARCHIVED/AUTO_ACCEPTED |
| `timestamp`          | Long   | ✓    | ✓    | 时间戳（毫秒级）                                                   |
| `confidence`         | Float  |      |      | AI置信度 0-1                                                       |
| `extractionEvidence` | String |      |      | 原文依据                                                           |
| `branchId`           | String |      |      | 分支ID，默认 'main'                                                |
| `sourceChapterId`    | String |      |      | 来源章节ID                                                         |
| `triplesJson`        | String |      |      | 三元组JSON字符串（存储KnowledgeTriple数组）                        |
| `createdAt`          | Long   | ✓    |      | 创建时间                                                           |
| `updatedAt`          | Long   |      |      | 更新时间                                                           |

| `createdBy` | String | | | 创建者： 'AI' / 'USER' / 'SYSTEM' |
| `source` | String | | | 数据来源： 'STRUCTURED_DATA' / 'AI_EXTRACTED' / 'MANUAL' |

### 2.2 KnowledgeTriple Schema

```cypher
// 注意: KnowledgeTriple 不作为独立节点存储，而是作为属性嵌入在关系边上
// 或关系创建时，直接使用边属性存储三元组信息
```

三元组数据存储在关系边的属性中:
| 属性名 | 类型 | 必需 | 说明 |
|--------|------|------|------|
| `subject` | String | ✓ | 主体（角色名或实体名） |
| `relation` | String | ✓ | 关系类型（如 ENEMY_OF, LOVES） |
| `object` | String | ✓ | 客体（角色名/实体名） |
| `weight` | Integer | | 关系强度 0-100，默认 50 |
| `trajectory` | String | | 关系走向: rising/falling/stable |
| `isForeshadowing` | Boolean | | 是否为伏笔，默认 false |
| `status` | String | | 状态: OPEN/RESOLVED/ABANDONED |
| `branchId` | String | | 分支ID |
| `sourceEchoId` | String | | 来源Echo ID |
| `createdAt` | Long | | 创建时间 |
| `updatedAt` | Long | | 更新时间 |

---

## 三、关系类型设计

### 3.1 Echo核心关系

| 关系类型          | 起点 | 终点                   | 属性                                       | 说明                             |
| ----------------- | ---- | ---------------------- | ------------------------------------------ | -------------------------------- |
| `AFFECTS`         | Echo | Character/WorldSetting | confidence, timestamp, description, reason | Echo影响的目标实体               |
| `CONTAINS_TRIPLE` | Echo | KnowledgeTriple        | -                                          | Echo包含的知识三元组（逻辑关系） |
| `CAuses`          | Echo | Echo                   | probability, description                   | 因果关系（推演）                 |
| `contradicts`     | Echo | Echo                   | reason, contradictionType                  | 矛盾关系                         |
| `generated_from`  | Echo | Chapter                | -                                          | Echo从章节中提取                 |
| `resolved_by`     | Echo | User                   | -                                          | Echo被用户解决                   |

### 3.2 实体关系（继承P0）

以下关系类型在P0阶段已实现:
| 关系类型 | 起点 | 终点 | 属性 | 说明 |
|----------|------|------|------|------|
| `ENEMY_OF` | Character | Character | weight, reason, trajectory, isForeshadowing, status, source | 敌对关系 |
| `ALLY_OF` | Character | Character | ... | 盟友关系 |
| `LOVES` | Character | Character | ... | 爱慕关系 |
| `KIN_OF` | Character | Character | ... | 亲属关系 |
| `MENTORS` | Character | Character | ... | 师徒关系 |
| `RIVAL_OF` | Character | Character | ... | 竞争关系 |
| `SERVES` | Character | Character | ... | 效忠关系 |
| `FRIEND_OF` | Character | Character | ... | 朋友关系 |
| `RELATED_TO` | Character | Character | ... | 通用关系 |
| `INVolved_in` | Character | PlotNode | - | 角色参与情节 |
| `located_in` | Character | WorldSetting | - | 角色位置 |
| `contains` | WorldSetting | WorldSetting | - | 设定包含关系 |
| `originated_from` | Character | WorldSetting | - | 角色起源地 |
| `resides_in` | Character | WorldSetting | - | 角色居住地 |
| `implements` | Chapter | PlotNode | - | 章节实现情节 |
| `precedes` | Chapter | Chapter | - | 章节顺序 |
| `has_conflict_participant` | PlotNode | Character | conflictType, stakes, intensity | 冲突参与者 |
| `located_in` | PlotNode | WorldSetting | - | 情节地点 |
| `involves` | PlotNode/Chapter | Character | - | 涉及角色 |

### 3.3 关系类型白名单

为确保安全性和一致性，所有关系类型必须通过白名单验证:

```typescript
const VALID_ECHO_RELATION_TYPES = new Set([
  // Echo核心关系
  'AFFECTS',
  'CONTAINS_TRIPLE',
  'CAUSES',
  'CONTRADICTS',
  'GENERATED_FROM',
  'RESOLVED_BY',
  // Character-Character关系
  'ENEMY_OF',
  'ALLY_OF',
  'LOVES',
  'KIN_OF',
  'MENTORS',
  'RIVAL_OF',
  'SERVES',
  'FRIEND_OF',
  'RELATED_TO',
  // Character-WorldSetting关系
  'ORIGINATED_FROM',
  'RESIDES_IN',
  'CONTROLS_TERRITORY',
  'EXILED_FROM',
  'LOCATED_IN',
  // PlotNode关系
  'INVOLVES',
  'HAS_CONFLICT_PARTICIPANT',
  'PRECEDES',
  'IMPLEMENTS',
  // Chapter关系
  'POV_IS',
  // WorldSetting关系
  'CONTAINS',
]);
```

---

## 四、sync.ts增强设计

### 4.1 syncEchoToGraph函数

```typescript
/**
 * 将单个Echo同步到图谱
 * @param echo Echo对象
 * @param projectId 项目ID
 */
export async function syncEchoToGraph(echo: Echo, projectId: string): Promise<void> {
  const driver = getDriver();
  const session = driver.session();

  const syncLockKey = `echo_${echo.id}`;

  try {
    // 1. 检查是否已有该Echo的同步锁
    if (syncLocks.has(syncLockKey)) {
      await syncLocks.get(syncLockKey);
    }

    const syncPromise = doSyncEcho(echo, projectId);
    syncLocks.set(syncLockKey, syncPromise);

    try {
      await syncPromise;
    } finally {
      if (syncLocks.get(syncLockKey) === syncPromise) {
        syncLocks.delete(syncLockKey);
      }
    }
  } finally {
    await session.close();
  }
}
```

### 4.2 doSyncEcho实现

```typescript
/**
 * 执行Echo同步逻辑
 */
async function doSyncEcho(echo: Echo, projectId: string): Promise<void> {
  const session = getDriver().session();

  try {
    // 1. 创建或更新Echo节点
    await session.run(
      `MERGE (e:Echo {id: $id, projectId: $projectId})
             SET e.type = $type,
                 e.targetId = $targetId,
                 e.targetName = $targetName,
                 e.description = $description,
                 e.reason = $reason,
                 e.status = $status,
                 e.timestamp = $timestamp,
                 e.confidence = $confidence,
                 e.extractionEvidence = $extractionEvidence,
                 e.branchId = $branchId,
                 e.sourceChapterId = $sourceChapterId,
                 e.triplesJson = $triplesJson,
                 e.updatedAt = timestamp()`,
      {
        id: echo.id,
        projectId,
        type: echo.type,
        targetId: echo.targetId,
        targetName: echo.targetName,
        description: echo.description,
        reason: echo.reason || '',
        status: echo.status,
        timestamp: echo.timestamp,
        confidence: echo.confidence || 0.5,
        extractionEvidence: echo.extractionEvidence || '',
        branchId: echo.branchId || 'main',
        sourceChapterId: echo.sourceChapterId || '',
        triplesJson: JSON.stringify(echo.triples || []),
      }
    );

    // 2. 创建AFFECTS关系（如果状态为ACCEPTED)
    if (echo.status === 'ACCEPTED' || echo.status === 'AUTO_ACCEPTED') {
      if (echo.type === 'CHARACTER') {
        await session.run(
          `MATCH (e:Echo {id: $echoId, projectId: $projectId})
                     MATCH (c:Character {id: $targetId, projectId: $projectId})
                     MERGE (e)-[:AFFECTS]->(c)
                     ON CREATE SET r.confidence = $confidence, r.timestamp = $timestamp
                     ON MATCH SET r.confidence = $confidence, r.timestamp = $timestamp`,
          {
            echoId: echo.id,
            projectId,
            targetId: echo.targetId,
            confidence: echo.confidence || 0.5,
            timestamp: echo.timestamp,
          }
        );
      } else if (echo.type === 'WORLD') {
        await session.run(
          `MATCH (e:Echo {id: $echoId, projectId: $projectId})
                     MATCH (w:WorldSetting {id: $targetId, projectId: $projectId})
                     MERGE (e)-[:AFFECTS]->(w)
                     ON CREATE SET r.confidence = $confidence, r.timestamp = $timestamp
                     ON MATCH SET r.confidence = $confidence, r.timestamp = $timestamp`,
          {
            echoId: echo.id,
            projectId,
            targetId: echo.targetId,
            confidence: echo.confidence || 0.5,
            timestamp: echo.timestamp,
          }
        );
      }

      // 3. 同步关系三元组到图谱
      if (echo.triples && echo.triples.length > 0) {
        await syncTriplesToGraph(echo, projectId, session);
      }
    } else if (echo.status === 'REJECTED') {
      // 4. 如果状态为REJECTED， 删除相关的关系边（但保留Echo节点）
      await cleanupRejectedEcho(echo.id, projectId, session);
    }

    console.log(`✅ Synced Echo ${echo.id} to graph with status ${echo.status}`);
  } finally {
    await session.close();
  }
}
```

### 4.3 syncTriplesToGraph实现

```typescript
/**
 * 同步关系三元组到图谱
 * 将三元组转换为实际的图关系边
 */
async function syncTriplesToGraph(echo: Echo, projectId: string, session: Session): Promise<void> {
  for (const triple of echo.triples) {
    // 安全验证关系类型
    const relType = sanitizeRelationType(triple.relation);

    // 射线检测： 根据subject和object名称查找对应的节点
    // 可能是Character或WorldSetting节点
    try {
      await session.run(
        `MATCH (s {projectId: $projectId})
                 WHERE (s:Character AND s.name = $subject)
                    OR (s:WorldSetting AND s.title = $subject)
                 MATCH (o {projectId: $projectId})
                 WHERE (o:Character AND o.name = $object)
                    OR (o:WorldSetting AND o.title = $object)
                 MERGE (s)-[r:${relType}]->(o)
                 ON CREATE SET
                    r.sourceEchoId = $echoId,
                    r.weight = $weight,
                    r.trajectory = $trajectory,
                    r.isForeshadowing = $isForeshadowing,
                    r.status = $status,
                    r.branchId = $branchId,
                    r.reason = $reason,
                    r.createdAt = timestamp()
                 ON MATCH SET
                    r.sourceEchoId = $echoId,
                    r.weight = $weight,
                    r.trajectory = $trajectory,
                    r.isForeshadowing = $isForeshadowing,
                    r.status = $status,
                    r.branchId = $branchId,
                    r.reason = $reason,
                    r.updatedAt = timestamp()`,
        {
          projectId,
          subject: triple.subject,
          object: triple.object,
          echoId: echo.id,
          relType,
          weight: triple.weight || 50,
          trajectory: triple.trajectory || 'stable',
          isForeshadowing: triple.isForeshadowing || false,
          status: triple.status || 'OPEN',
          branchId: triple.branchId || echo.branchId || 'main',
          reason: echo.description || '',
        }
      );
    } catch (err) {
      console.warn(`Failed to sync triple ${triple.subject}-[:${relType}]->${triple.object}:`, err);
    }
  }
}
```

### 4.4 cleanupRejectedEcho实现

```typescript
/**
 * 清理被拒绝的Echo相关的关系边
 */
async function cleanupRejectedEcho(
  echoId: string,
  projectId: string,
  session: Session
): Promise<void> {
  // 删除由该Echo创建的关系边
  await session.run(
    `MATCH (e:Echo {id: $echoId, projectId: $projectId})
         OPTIONAL MATCH (e)-[:CONTAINS_TRIPLE]->(t)
         DETACH DELETE t
         WITH e, r
         WHERE (r)-[rel]->()
         AND r.sourceEchoId = $echoId
         DELETE r`,
    { echoId, projectId }
  );
}
```

### 4.5 sanitizeRelationType安全函数

```typescript
/**
 * 安全验证关系类型（复用P0阶段的实现）
 */
function sanitizeRelationType(relation: string): string {
  if (!relation || typeof relation !== 'string') {
    return 'RELATED_TO';
  }

  const normalized = relation.toUpperCase().replace(/[^A-Z0-9_]/g, '');

  if (VALID_ECHO_RELATION_TYPES.has(normalized)) {
    return normalized;
  }

  // 尝试简化格式映射（如 ENEMY -> ENEMY_OF）
  const simplifiedMapping: Record<string, string> = {
    ENEMY: 'ENEMY_OF',
    ALLY: 'ALLY_OF',
    LOVE: 'LOVES',
    KIN: 'KIN_OF',
    MENTOR: 'MENTORS',
    RIVAL: 'RIVAL_OF',
    SERVE: 'SERVES',
    FRIEND: 'FRIEND_OF',
  };

  if (simplifiedMapping[normalized]) {
    return simplifiedMapping[normalized];
  }

  console.warn(`[Graph Security] Unknown relation type "${relation}" -> fallback to RELATED_TO`);
  return 'RELATED_TO';
}
```

---

## 五、 queries.ts增强设计

### 5.1 getCharacterEvolutionHistory

```typescript
/**
 * 蟥询角色的关系演变历史
 * @param projectId 项目ID
 * @param characterId 角色ID
 * @param limit 返回记录数限制，默认50
 */
export async function getCharacterEvolutionHistory(
    projectId: string,
    characterId: string,
    limit: number = 50
): Promise<Array<{
    echoId: string;
    timestamp: number;
    echoType: 'CHARACTER' | 'WORLD';
    status: string;
    description: string;
    reason: string;
    confidence: number;
    triples: Array<{
        subject: string;
        relation: string;
        object: string;
        weight: number;
        trajectory: string;
        isForeshadowing: boolean;
        status: string;
    }>;
}>> {
    const driver = getDriver();
    const session = driver.session();

    try {
        // 1. 获取角色名称
        const charResult = await session.run(
            `MATCH (c:Character {id: $characterId, projectId: $projectId})
             RETURN c.name as name`,
            { projectId, characterId }
        );

        if (charResult.records.length === 0) {
            return [];
        }

        const characterName = charResult.records[0].get('name');

        // 2. 查询与该角色相关的所有Echo
        const result = await session.run(
            `MATCH (e:Echo {projectId: $projectId})
             WHERE (e.targetId = $characterId OR e.targetName = $characterName)
             AND e.status IN ['ACCEPTED', 'AUTO_ACCEPTED', 'ARCHIVED']
             OPTIONAL MATCH (e)-[:AFFECTS]->(target)
             RETURN e.id as echoId,
                    e.timestamp as timestamp,
                    e.type as echoType,
                    e.status as status,
                    e.description as description,
                    e.reason as reason,
                    e.confidence as confidence,
                    target.name as targetName,
                    target.id as targetId,
                    labels(target) as targetLabels
 e.triplesJson as triplesJson
 triplesJson,
        { projectId, characterId, characterName, limit }
        );

        // 3. 解析三元组JSON
 {
            const echoId = record.get('echoId');
            const timestamp = record.get('timestamp');
            const echoType = record.get('echoType');
            const status = record.get('status');
            const description = record.get('description');
            const reason = record.get('reason');
            const confidence = record.get('confidence');
            const triplesJson = record.get('triplesJson');

            let triples: any[] = [];
            try {
                triples = triplesJson ? JSON.parse(triplesJson) : [];
            } catch (e) {
                console.warn(`Failed to parse triples JSON for echo ${echoId}:`, e);
            }

            // 过滤与该角色相关的三元组
            const relevantTriples = triples.filter((t: any) =>
                t.subject === characterName || t.object === characterName
            );

            if (relevantTriples.length > 0) {
                results.push({
                    echoId,
                    timestamp: typeof timestamp === 'object' ? timestamp.toNumber() : timestamp,
                    echoType,
                    status,
                    description,
                    reason,
                    confidence: confidence || 0.5,
                    triples: relevantTriples
                });
            }
        }

        // 4. 按时间戳排序
        results.sort((a, b) => b.timestamp - a.timestamp);

        return results.slice(0, limit);
    } finally {
        await session.close();
    }
}
```

### 5.2 getUnresolvedForeshadowing

```typescript
/**
 * 查询未回收的伏笔
 * @param projectId 项目ID
 * @param limit 返回记录数限制，默认100
 */
export async function getUnresolvedForeshadowing(
  projectId: string,
  limit: number = 100
): Promise<
  Array<{
    tripleId: string;
    subject: string;
    relation: string;
    object: string;
    weight: number;
    trajectory: string;
    echoId: string;
    echoTimestamp: number;
    echoDescription: string;
    sourceChapterId: string;
  }>
> {
  const driver = getDriver();
  const session = driver.session();

  try {
    // 查询所有isForeshadowing=true且status='OPEN'的关系边
    const result = await session.run(
      `MATCH ()-[r]->()
             WHERE ()-[:AFFECTS]->(:Echo {projectId: $projectId})
             AND r.isForeshadowing = true
             AND r.status = 'OPEN'
             RETURN
                elementId(r) as tripleId,
                startNode().name as subject,
                type(r) as relation,
                endNode().name as object,
                r.weight as weight,
                r.trajectory as trajectory,
                r.sourceEchoId as echoId,
                e.timestamp as echoTimestamp,
                e.description as echoDescription,
                e.sourceChapterId as sourceChapterId
             ORDER BY e.timestamp DESC
             LIMIT $limit`,
      { projectId, limit }
    );

    return result.records.map((record) => ({
      tripleId: record.get('tripleId'),
      subject: record.get('subject'),
      relation: record.get('relation'),
      object: record.get('object'),
      weight: record.get('weight'),
      trajectory: record.get('trajectory'),
      echoId: record.get('echoId'),
      echoTimestamp: record.get('echoTimestamp'),
      echoDescription: record.get('echoDescription'),
      sourceChapterId: record.get('sourceChapterId'),
    }));
  } finally {
    await session.close();
  }
}
```

### 5.3 getRelationshipTimeline

```typescript
/**
 * 查询关系时间线（两个角色之间的关系演变)
 * @param projectId 项目ID
 * @param character1Id 角色1 ID
 * @param character2Id 角色2 ID
 * @param limit 返回记录数限制，默认50
 */
export async function getRelationshipTimeline(
  projectId: string,
  character1Id: string,
  character2Id: string,
  limit: number = 50
): Promise<
  Array<{
    echoId: string;
    timestamp: number;
    relation: string;
    weight: number;
    trajectory: string;
    description: string;
    reason: string;
    sourceChapterId: string;
  }>
> {
  const driver = getDriver();
  const session = driver.session();

  try {
    // 1. 获取角色名称
    const charResult = await session.run(
      `MATCH (c1:Character {id: $char1Id, projectId: $projectId})
             MATCH (c2:Character {id: $char2Id, projectId: $projectId})
             RETURN c1.name as name1, c2.name as name2`,
      { projectId, char1Id: character1Id, char2Id: character2Id }
    );

    if (charResult.records.length === 0) {
      return [];
    }

    const name1 = charResult.records[0].get('name1');
    const name2 = charResult.records[0].get('name2');

    // 2. 查询两个角色之间的关系演变
    const result = await session.run(
      `MATCH (e:Echo {projectId: $projectId})
             WHERE e.status IN ['ACCEPTED', 'AUTO_ACCEPTED', 'ARCHIVED']
             OPTIONAL MATCH (e)-[:AFFECTS]->(c:Character)
             WITH e, triples(e.triplesJson) as triplesJson
             UNWIND triplesJson as triple
             WITH CASE
                WHEN (triple.subject = $name1 AND triple.object = $name2)
                OR (triple.subject = $name2 AND triple.object = $name1)
             RETURN e.id as echoId,
                    e.timestamp as timestamp,
                    triple.relation as relation,
                    triple.weight as weight,
                    triple.trajectory as trajectory,
                    e.description as description,
                    e.reason as reason,
                    e.sourceChapterId as sourceChapterId
             ORDER BY e.timestamp ASC
             LIMIT $limit`,
      { projectId, name1, name2, limit }
    );

    return result.records.map((record) => ({
      echoId: record.get('echoId'),
      timestamp: record.get('timestamp'),
      relation: record.get('relation'),
      weight: record.get('weight'),
      trajectory: record.get('trajectory'),
      description: record.get('description'),
      reason: record.get('reason'),
      sourceChapterId: record.get('sourceChapterId'),
    }));
  } finally {
    await session.close();
  }
}
```

### 5.4 detectContradictions

```typescript
/**
 * 检测关系矛盾
 * @param projectId 项目ID
 */
export async function detectContradictions(projectId: string): Promise<
  Array<{
    type: 'RELATIONSHIP_CONFLICT' | 'LOCATION_MISMATCH' | 'FACTUAL_INCONSISTENCY';
    character1: string;
    character2?: string;
    description: string;
    confidence: number;
    evidence: Array<{
      relation1: string;
      relation2: string;
      echoId1: string;
      echoId2: string;
    }>;
  }>
> {
  const driver = getDriver();
  const session = driver.session();

  try {
    const contradictions: any[] = [];

    // 1. 检测关系矛盾（如A和B是敌人，但B说A是朋友）
    const relationConflictResult = await session.run(
      `MATCH (c1:Character {projectId: $projectId})-[r1]->(c2:Character {projectId: $projectId})
             MATCH (c2)-[r2]->(c1)
             WHERE r1.isForeshadowing = false AND r2.isForeshadowing = false
             AND (
                 (type(r1) = 'ENEMY_OF' AND type(r2) = 'ALLY_OF')
                 OR (type(r1) = 'ALLY_OF' AND type(r2) = 'ENEMY_OF')
                 OR (type(r1) = 'LOVES' AND type(r2) = 'ENEMY_OF')
                 OR (type(r2) = 'LOVES' AND type(r1) = 'ENEMY_OF')
             )
             RETURN c1.name as character1,
                    c2.name as character2,
                    type(r1) as r1Type,
                    type(r2) as r2Type,
                    r1.sourceEchoId as echoId1,
                    r2.sourceEchoId as echoId2,
                    r1.weight as r1Weight,
                    r2.weight as r2Weight`,
      { projectId }
    );

    for (const record of relationConflictResult.records) {
      const r1Type = record.get('r1Type');
      const r2Type = record.get('r2Type');
      contradictions.push({
        type: 'RELATIONSHIP_CONFLICT',
        character1: record.get('character1'),
        character2: record.get('character2'),
        description: `${record.get('character1')} 和 ${record.get('character2')} 之间存在关系矛盾: ${record.get('character1')}${r1Type}${record.get('character2')}, 但${record.get('character2')}${r2Type}${record.get('character1')}`,
        confidence: 0.8,
        evidence: [
          {
            relation1: `${r1Type} (强度: ${record.get('r1Weight')})`,
            relation2: `${r2Type} (强度: ${record.get('r2Weight')})`,
            echoId1: record.get('echoId1'),
            echoId2: record.get('echoId2'),
          },
        ],
      });
    }

    // 2. 检测位置矛盾（角色同时出现在两个不同的地点）
    const locationConflictResult = await session.run(
      `MATCH (c:Character {projectId: $projectId})
             MATCH (c)-[r1:LOCATED_IN]->(l1:WorldSetting)
             MATCH (c)-[r2:LOCATED_IN]->(l2:WorldSetting)
             WHERE l1.id <> l2.id
             AND r1.branchId = 'main' AND r2.branchId = 'main'
             RETURN c.name as character1,
                    l1.title as location1,
                    l2.title as location2,
                    r1.sourceEchoId as echoId1,
                    r2.sourceEchoId as echoId2`,
      { projectId }
    );

    for (const record of locationConflictResult.records) {
      contradictions.push({
        type: 'LOCATION_MISMATCH',
        character1: record.get('character1'),
        character2: undefined,
        description: `${record.get('character1')} 同时出现在两个不同的地点: ${record.get('location1')} 和 ${record.get('location2')}`,
        confidence: 0.9,
        evidence: [
          {
            relation1: `位于 ${record.get('location1')}`,
            relation2: `位于 ${record.get('location2')}`,
            echoId1: record.get('echoId1'),
            echoId2: record.get('echoId2'),
          },
        ],
      });
    }

    // 3. 检测事实矛盾（角色死亡但后续情节仍出现）
    // TODO: 鷻加更多矛盾检测规则

    return contradictions;
  } finally {
    await session.close();
  }
}
```

### 5.5 getEchoNetwork (新增)

```typescript
/**
 * 查询Echo的影响网络
 * @param projectId 项目ID
 * @param echoId Echo ID
 * @param depth 查询深度，默认2
 */
export async function getEchoNetwork(
  projectId: string,
  echoId: string,
  depth: number = 2
): Promise<{
  echo: any;
  affectedEntities: any[];
  causedEchoes: any[];
  contradictedEchoes: any[];
}> {
  const driver = getDriver();
  const session = driver.session();

  try {
    // 1. 获取Echo节点
    const echoResult = await session.run(
      `MATCH (e:Echo {id: $echoId, projectId: $projectId})
             RETURN e`,
      { projectId, echoId }
    );

    if (echoResult.records.length === 0) {
      return {
        echo: null,
        affectedEntities: [],
        causedEchoes: [],
        contradictedEchoes: [],
      };
    }

    const echo = echoResult.records[0].get('e').properties;

    // 2. 获取影响的实体
    const affectedResult = await session.run(
      `MATCH (e:Echo {id: $echoId, projectId: $projectId})-[:AFFECTS]->(target)
             RETURN target`,
      { projectId, echoId }
    );

    // 3. 获取因果关系的Echo
    const causedResult = await session.run(
      `MATCH (e:Echo {id: $echoId, projectId: $projectId})-[:CAUSES*1..${depth}]->(caused:Echo)
             RETURN DISTINCT caused`,
      { projectId, echoId, depth }
    );

    // 4. 获取矛盾关系的Echo
    const contradictedResult = await session.run(
      `MATCH (e:Echo {id: $echoId, projectId: $projectId})-[:CONTRADICTS]-(contra:Echo)
             RETURN DISTINCT contra`,
      { projectId, echoId }
    );

    return {
      echo,
      affectedEntities: affectedResult.records.map((r) => r.get('target').properties),
      causedEchoes: causedResult.records.map((r) => r.get('caused').properties),
      contradictedEchoes: contradictedResult.records.map((r) => r.get('contra').properties),
    };
  } finally {
    await session.close();
  }
}
```

---

## 六、API路由设计

### 6.1 Echo采纳接口

```http
POST /api/graph/echoes/:id/accept
```

**请求参数**:

```json
{
  "projectId": "string",
  "userId": "string"
}
```

**响应**:

```json
{
  "success": true,
  "echoId": "string",
  "graphUpdateResult": {
    "nodesCreated": 0,
    "relationshipsCreated": 0,
    "triplesSynced": 0
  }
}
```

### 6.2 关系时间线接口

```http
GET /api/graph/relationships/timeline?character1Id=xxx&character2Id=yyy
```

**请求参数**:

- `character1Id` (required): 角色1 ID
- `character2Id` (required): 角色2 ID
- `limit` (optional): 返回记录数限制，默认50
  **响应**:

```json
{
  "success": true,
  "timeline": [
    {
      "echoId": "string",
      "timestamp": 1234567890,
      "relation": "ENEMY_OF",
      "weight": 80,
      "trajectory": "rising",
      "description": "string",
      "reason": "string",
      "sourceChapterId": "string"
    }
  ]
}
```

### 6.3 未回收伏笔接口

```http
GET /api/graph/echoes/foreshadowing/unresolved
```

**请求参数**:

- `projectId` (required): 项目ID
- `limit` (optional): 返回记录数限制，默认100
  **响应**:

```json
{
  "success": true,
  "foreshadowing": [
    {
      "tripleId": "string",
      "subject": "string",
      "relation": "string",
      "object": "string",
      "weight": 50,
      "trajectory": "rising",
      "echoId": "string",
      "echoTimestamp": 1234567890,
      "echoDescription": "string",
      "sourceChapterId": "string"
    }
  ]
}
```

### 6.4 矛盾检测接口

```http
GET /api/graph/echoes/contradictions
```

**请求参数**:

- `projectId` (required): 项目ID
  **响应**:

```json
{
  "success": true,
  "contradictions": [
    {
      "type": "RELATIONSHIP_CONFLICT",
      "character1": "string",
      "character2": "string",
      "description": "string",
      "confidence": 0.8,
      "evidence": [
        {
          "relation1": "string",
          "relation2": "string",
          "echoId1": "string",
          "echoId2": "string"
        }
      ]
    }
  ]
}
```

### 6.5 Echo网络接口

```http
GET /api/graph/echoes/:id/network
```

**请求参数**:

- `id` (path parameter): Echo ID
- `depth` (query parameter): 查询深度，默认2
  **响应**:

```json
{
  "success": true,
  "network": {
    "echo": { ... },
    "affectedEntities": [ ... ],
    "causedEchoes": [ ... ],
    "contradictedEchoes": [ ... ]
  }
}
```

---

## 七、实现计划

### 7.1 第一阶段: Schema和基础设施 (1天)

- [x] 创建Neo4j约束和索引
- [x] 更新`types.ts`添加Echo相关类型定义
- [x] 添加`VALID_ECHO_RELATION_TYPES`常量

### 7.2 第二阶段: sync.ts增强 (2-3天)

- [x] 实现`syncEchoToGraph`函数
- [x] 实现`doSyncEcho`核心逻辑
- [x] 实现`syncTriplesToGraph`函数
- [x] 实现`cleanupRejectedEcho`函数
- [x] 复用并增强`sanitizeRelationType`函数
- [x] 编写单元测试

### 7.3 第三阶段: queries.ts增强 (2-3天)

- [x] 实现`getCharacterEvolutionHistory`
- [x] 实现`getUnresolvedForeshadowing`
- [x] 实现`getRelationshipTimeline`
- [x] 实现`detectContradictions`
- [x] 实现`getEchoNetwork`
- [x] 编写单元测试

### 7.4 第四阶段: API路由实现 (1-2天)

- [x] 实现`POST /api/graph/echoes/:id/accept`
- [x] 实现`GET /api/graph/relationships/timeline`
- [x] 实现`GET /api/graph/echoes/foreshadowing/unresolved`
- [x] 实现`GET /api/graph/echoes/contradictions`
- [x] 实现`GET /api/graph/echoes/:id/network`
- [x] 添加API文档和### 7.5 第五阶段: 鉄成与测试 (2-3天)
- [x] 与前端集成
- [x] 端到端测试
- [x] 性能测试
- [x] 文档完善

---

## 八、数据迁移策略

### 8.1 现有Echo数据迁移

对于P0阶段之前已存在的Echo数据，需要执行一次性迁移:

```cypher
// 批量迁移已接受的Echo到图谱
MATCH (e:Echo {projectId: $projectId, status: 'ACCEPTED'})
WHERE NOT (e)-[:AFFECTS]->()
OPTIONAL MATCH (target {id: e.targetId, projectId: e.projectId})
FOREACH (target IN [target] |
    CREATE (e)-[:AFFECTS]->(target)
)
```

### 8.2 三元组数据迁移

对于已接受Echo中的三元组，需要创建对应的关系边:

```cypher
// 批量同步三元组到图谱
MATCH (e:Echo {projectId: $projectId, status: 'ACCEPTED'})
WHERE e.triples IS NOT NULL
WITH e, e.triples as triples
UNWIND triples as triple
MATCH (s {projectId: $projectId})
WHERE (s:Character AND s.name = triple.subject)
 OR (s:WorldSetting AND s.title = triple.subject)
MATCH (o {projectId: $projectId})
WHERE (o:Character AND o.name = triple.object)
 Or (o:WorldSetting AND o.title = triple.object)
MERGE (s)-[r:RELATED_TO]->(o)
ON CREATE SET
    r.sourceEchoId = e.id,
    r.weight = triple.weight,
    r.trajectory = triple.trajectory,
    r.isForeshadowing = triple.isForeshadowing,
    r.status = triple.status
    r.branchId = e.branchId
```

---

## 九、性能优化建议

### 9.1 索引优化

```cypher
// 复合索引优化查询
CREATE INDEX echo_project_status_idx IF NOT EXISTS
    FOR (e:Echo) ON (e.projectId, e.status, e.timestamp);
```

### 9.2 查询优化

- 使用`EXPLAIN`分析查询计划
- 对深度遍历使用`PRAGMA`设置超时
- 对大数据集使用分页查询

### 9.3 缓存策略

- 对频繁访问的Echo数据添加Redis缓存
- 对关系时间线添加短期缓存（5分钟）
- 对矛盾检测结果添加长期缓存（1小时）

---

## 十、安全考虑

### 10.1 Cypher注入防护

- 所有关系类型必须通过白名单验证
- 所有用户输入必须参数化
- 禁止字符串拼接构建Cypher查询

### 10.2 权限控制

- Echo采纳操作需要用户认证
- 图谱查询需要项目权限验证
- 分支隔离需要严格的branchId检查

### 10.3 数据隔离

- 确保多租户数据隔离（projectId）
- 分支数据隔离（branchId）
- 防止跨项目数据泄露

---

## 十一、测试计划

### 11.1 单元测试

- `syncEchoToGraph`函数测试
- `syncTriplesToGraph`函数测试
- 所有查询函数的测试
- 安全函数测试

### 11.2 集成测试

- API路由端到端测试
- 前后端集成测试
- 图谱同步一致性测试

### 11.3 性能测试

- 大量Echo同步性能测试
- 复杂查询性能测试
- 并发同步性能测试

---

## 十二、风险与缓解

### 12.1 技术风险

| 风险          | 影响              | 缓解措施                      |
| ------------- | ----------------- | ----------------------------- |
| Neo4j连接失败 | Echo无法同步      | 添加重试机制，降级到MySQL查询 |
| 数据不一致    | 图谱与MySQL不同步 | 添加一致性检查工具，定期同步  |
| 并发同步冲突  | 数据覆盖          | 使用同步锁，乐观锁机制        |
| 大数据集性能  | 查询超时          | 添加分页，索引优化，缓存      |

### 12.2 业务风险

| 风险       | 影响             | 缓解措施                       |
| ---------- | ---------------- | ------------------------------ |
| Echo误采纳 | 错误数据进入图谱 | 添加确认对话框，支持撤销操作   |
| 矛盾误报   | 用户体验差       | 调整矛盾检测阈值，添加人工审核 |
| 伏笔遗漏   | 剧情漏洞         | 定期提醒，伏笔报告             |

---

## 十三、文档清单

### 13.1 技术文档

- [ ] P1_Echo_Graph_Design.md (本文档)
- [ ] API文档更新
- [ ] Schema变更文档
- [ ] 数据迁移指南

### 13.2 运维文档

- [ ] 部署检查清单
- [ ] 监控指标配置
- [ ] 故障排查指南

---

## 十四、总结

P1阶段Echo模块图谱化将在P0阶段的基础上，进一步丰富知识图谱的内容，实现以下核心价值:

1. **关系追踪**: 完整追踪角色和世界设定的关系变更历史
2. **时序分析**: 支持基于时间线的关系演变分析
3. **矛盾检测**: 自动检测关系矛盾和事实冲突
4. **伏笔管理**: 追踪未回收的伏笔，提醒作者
5. **因果推演**: 支持蝴蝶效应推演，预测关系传播
   本设计遵循"属性存实体，关系存图谱"的核心原则，与P0阶段保持一致的技术栈和设计风格，确保系统的可维护性和可扩展性。
