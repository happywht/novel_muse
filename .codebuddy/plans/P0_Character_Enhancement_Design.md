# P0 Character 模块图谱化增强技术设计文档

**设计日期**: 2026-03-21
**分支**: feature/character-knowledge-graph
**设计者**: Backend Technical Lead
**优先级**: P0 (最高)

---

## 一、概述

### 1.1 目标

Character 模块是整个系统的核心实体，当前存在以下痛点：
- `relationships` 字段为 string 类型，无法直接用于图谱查询
- 新字段（`alignment`, `tags`, `desire`, `fear`, `signature`, `contrast`, `weakness`）已定义但未使用
- 角色-世界设定关联字段（`originLocation`, `residence`）未充分利用
- 缺乏角色深度属性的图谱化支持

### 1.2 设计原则

1. **属性存实体，关系存图谱** - 属性型字段保留在 Character 实体，关系型字段迁移到图谱
2. **双写保持兼容** - 新旧格式同时写入，确保向后兼容
3. **渐进式迁移** - 支持旧数据运行时自动转换
4. **增量同步优先** - 减少全量同步开销

### 1.3 影响范围

| 文件 | 影响等级 | 改动类型 |
|------|---------|---------|
| `server/src/services/graph/sync.ts` | 🔴 高 | 新增同步函数 |
| `server/src/services/graph/queries.ts` | 🔴 高 | 新增查询 API |
| `types.ts` | 🟡 中 | 扩展字段定义 |
| `services/schemas.ts` | 🟡 中 | 解析逻辑调整 |
| `components/CharacterCreator.tsx` | 🟡 中 | UI 展示增强 |
| `components/CharacterRelations.tsx` | 🟢 低 | 已支持新格式 |
| `utils/characterRelations.ts` | 🟢 低 | 已实现转换逻辑 |
| `store/useProjectStore.ts` | 🟡 中 | 新增图谱查询方法 |

---

## 二、数据模型设计

### 2.1 Character 接口扩展分析

**当前字段分类**:

| 字段 | 类型 | 图谱化需求 | 优先级 |
|------|------|----------|-------|
| `id` | string | 图谱节点主键 | P0 |
| `name` | string | 节点标签 | P0 |
| `role` | string | 节点属性 | P0 |
| `archetype` | string | 节点属性 | P0 |
| `description` | string | 节点属性 | P0 |
| `alignment` | string | **新增图谱属性** | P1 |
| `tags` | string[] | **新增图谱标签** | P1 |
| `desire` | string | **新增图谱属性** | P1 |
| `fear` | string | **新增图谱属性** | P1 |
| `signature` | string | **新增图谱属性** | P1 |
| `contrast` | string | **新增图谱属性** | P2 |
| `weakness` | string | **新增图谱属性** | P2 |
| `relationships` | string | **保留（兼容）** | P0 |
| `structuredRelations` | CharacterRelation[] | **图谱关系边** | P0 |
| `originLocation` | string | **图谱关系边** | P1 |
| `residence` | string | **图谱关系边** | P1 |
| `controlledTerritories` | string[] | **图谱关系边** | P2 |
| `exiledFrom` | string[] | **图谱关系边** | P2 |

### 2.2 节点属性扩展方案

**Neo4j Character 节点扩展**:

```cypher
// 当前 Character 节点结构
(:Character {
  id: string,
  name: string,
  role: string,
  archetype: string,
  description: string,
  projectId: string,
  state: string,
  isDead: boolean,
  branchId: string
})

// 扩展后的 Character 节点结构
(:Character {
  id: string,
  name: string,
  role: string,
  archetype: string,
  description: string,
  projectId: string,
  state: string,
  isDead: boolean,
  branchId: string,

  // P1 新增属性
  alignment: string,        // 道德阵营
  tags: string[],           // 角色标签（Neo4j 数组类型）
  desire: string,           // 核心欲望
  fear: string,             // 核心恐惧
  signature: string,        // 标志性特征

  // P2 新增属性
  contrast: string,         // 反差萌点
  weakness: string,         // 弱点/缺陷

  // 系统字段
  lastModified: integer,
  createdAt: integer
})
```

### 2.3 新的关系类型设计

**角色-世界设定关系**:

| 关系类型 | 源 → 目标 | 含义 | 属性 |
|----------|----------|------|------|
| `ORIGINATED_FROM` | Character → WorldSetting | 起源/出生地 | `{since: date}` |
| `RESIDES_IN` | Character → WorldSetting | 当前居住地 | `{since: date, branchId: string}` |
| `CONTROLS_TERRITORY` | Character → WorldSetting | 控制的领地 | `{since: date, authority: string}` |
| `EXILED_FROM` | Character → WorldSetting | 被流放地 | `{since: date, reason: string}` |

**角色深度属性关系（可选，用于复杂场景）**:

| 关系类型 | 源 → 目标 | 含义 | 用途 |
|----------|----------|------|------|
| `HAS_DESIRE` | Character → Desire | 拥有欲望 | 多欲望支持 |
| `HAS_FEAR` | Character → Fear | 拥有恐惧 | 多恐惧支持 |
| `HAS_TRAIT` | Character → Trait | 拥有特质 | 标签扩展 |

> **设计决策**: 初期采用属性存储，仅在需要复杂关系时扩展为节点

### 2.4 类型定义更新

```typescript
// types.ts 扩展

/**
 * 角色深度属性（用于图谱查询）
 */
export interface CharacterDepthAttributes {
  alignment?: string;      // 道德阵营
  tags?: string[];         // 角色标签
  desire?: string;         // 核心欲望
  fear?: string;           // 核心恐惧
  signature?: string;      // 标志性特征
  contrast?: string;       // 反差萌点
  weakness?: string;       // 弱点/缺陷
}

/**
 * 角色-世界设定关系
 */
export interface CharacterWorldRelation {
  characterId: string;
  worldSettingId: string;
  relationType: 'ORIGINATED_FROM' | 'RESIDES_IN' | 'CONTROLS_TERRITORY' | 'EXILED_FROM';
  properties?: {
    since?: string;
    authority?: string;
    reason?: string;
    branchId?: string;
  };
}

/**
 * 图谱角色节点完整结构
 */
export interface GraphCharacterNode {
  id: string;
  name: string;
  label: string;
  type: 'Character';
  properties: {
    role: string;
    archetype: string;
    description: string;
    alignment?: string;
    tags?: string[];
    desire?: string;
    fear?: string;
    signature?: string;
    contrast?: string;
    weakness?: string;
    state?: string;
    isDead?: boolean;
    lastModified?: number;
    branchId?: string;
    projectId: string;
  };
}
```

---

## 三、同步逻辑设计

### 3.1 新增同步函数

#### 3.1.1 `syncCharacterDepthAttributes`

```typescript
// server/src/services/graph/sync.ts

/**
 * 同步角色深度属性到图谱
 * @param character 角色对象
 * @param projectId 项目ID
 */
export const syncCharacterDepthAttributes = async (
  character: Character,
  projectId: string
): Promise<void> => {
  const d = getDriver();
  const session = d.session();

  try {
    await session.run(
      `MATCH (c:Character {id: $charId, projectId: $projectId})
       SET c.alignment = $alignment,
           c.tags = $tags,
           c.desire = $desire,
           c.fear = $fear,
           c.signature = $signature,
           c.contrast = $contrast,
           c.weakness = $weakness,
           c.lastModified = timestamp()`,
      {
        charId: character.id,
        projectId,
        alignment: character.alignment || null,
        tags: character.tags || [],
        desire: character.desire || null,
        fear: character.fear || null,
        signature: character.signature || null,
        contrast: character.contrast || null,
        weakness: character.weakness || null,
      }
    );
    console.log(`🔗 Synced depth attributes for character ${character.name}`);
  } finally {
    await session.close();
  }
};
```

#### 3.1.2 `syncCharacterWorldRelations`

```typescript
// server/src/services/graph/sync.ts

/**
 * 同步角色-世界设定关系
 * @param character 角色对象
 * @param projectId 项目ID
 */
export const syncCharacterWorldRelations = async (
  character: Character,
  projectId: string
): Promise<void> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 1. 删除现有关系
    await session.run(
      `MATCH (c:Character {id: $charId, projectId: $projectId})
       -[r:ORIGINATED_FROM|RESIDES_IN|CONTROLS_TERRITORY|EXILED_FROM]->
       (:WorldSetting)
       DELETE r`,
      { charId: character.id, projectId }
    );

    // 2. 创建起源地关系
    if (character.originLocation) {
      await session.run(
        `MATCH (c:Character {id: $charId, projectId: $projectId})
         MATCH (w:WorldSetting {id: $worldId, projectId: $projectId})
         MERGE (c)-[r:ORIGINATED_FROM]->(w)
         SET r.since = date()`,
        { charId: character.id, worldId: character.originLocation, projectId }
      );
    }

    // 3. 创建居住地关系
    if (character.residence) {
      await session.run(
        `MATCH (c:Character {id: $charId, projectId: $projectId})
         MATCH (w:WorldSetting {id: $worldId, projectId: $projectId})
         MERGE (c)-[r:RESIDES_IN]->(w)
         SET r.since = date()`,
        { charId: character.id, worldId: character.residence, projectId }
      );
    }

    // 4. 创建控制领地关系
    if (character.controlledTerritories && character.controlledTerritories.length > 0) {
      for (const territoryId of character.controlledTerritories) {
        await session.run(
          `MATCH (c:Character {id: $charId, projectId: $projectId})
           MATCH (w:WorldSetting {id: $worldId, projectId: $projectId})
           MERGE (c)-[r:CONTROLS_TERRITORY]->(w)
           SET r.authority = 'ruler'`,
          { charId: character.id, worldId: territoryId, projectId }
        );
      }
    }

    // 5. 创建流放地关系
    if (character.exiledFrom && character.exiledFrom.length > 0) {
      for (const locationId of character.exiledFrom) {
        await session.run(
          `MATCH (c:Character {id: $charId, projectId: $projectId})
           MATCH (w:WorldSetting {id: $worldId, projectId: $projectId})
           MERGE (c)-[r:EXILED_FROM]->(w)`,
          { charId: character.id, worldId: locationId, projectId }
        );
      }
    }

    console.log(`🔗 Synced world relations for character ${character.name}`);
  } finally {
    await session.close();
  }
};
```

#### 3.1.3 `syncSingleCharacter` (增量同步)

```typescript
// server/src/services/graph/sync.ts

/**
 * 增量同步单个角色（用于实时更新）
 * @param character 角色对象
 * @param projectId 项目ID
 */
export const syncSingleCharacter = async (
  character: Character,
  projectId: string
): Promise<void> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 1. 更新/创建节点
    await session.run(
      `MERGE (c:Character {id: $id, projectId: $projectId})
       SET c.name = $name,
           c.role = $role,
           c.archetype = $archetype,
           c.description = $description,
           c.alignment = $alignment,
           c.tags = $tags,
           c.desire = $desire,
           c.fear = $fear,
           c.signature = $signature,
           c.contrast = $contrast,
           c.weakness = $weakness,
           c.lastModified = timestamp()`,
      {
        id: character.id,
        projectId,
        name: character.name,
        role: character.role || '',
        archetype: character.archetype || '',
        description: (character.description || '').substring(0, 500),
        alignment: character.alignment || null,
        tags: character.tags || [],
        desire: character.desire || null,
        fear: character.fear || null,
        signature: character.signature || null,
        contrast: character.contrast || null,
        weakness: character.weakness || null,
      }
    );

    // 2. 同步关系（如果提供了 structuredRelations）
    if (character.structuredRelations && character.structuredRelations.length > 0) {
      for (const rel of character.structuredRelations) {
        const targetName = rel.targetName || rel.targetCharacterName;
        if (!targetName) continue;

        const relType = sanitizeRelationType(rel.type || 'RELATED_TO');

        await session.run(
          `MATCH (s:Character {id: $charId, projectId: $projectId})
           MATCH (o:Character {projectId: $projectId})
           WHERE o.name = $targetName OR o.id = $targetId
           MERGE (s)-[r:${relType}]->(o)
           ON CREATE SET r.weight = $weight, r.description = $description, r.createdAt = timestamp()
           ON MATCH SET r.weight = $weight, r.description = $description, r.updatedAt = timestamp()`,
          {
            charId: character.id,
            projectId,
            targetName,
            targetId: rel.targetCharacterId || targetName,
            weight: rel.weight || 50,
            description: rel.description || '',
          }
        );
      }
    }

    // 3. 同步世界设定关系
    await syncCharacterWorldRelations(character, projectId);

    console.log(`🔗 Incremental sync completed for character ${character.name}`);
  } finally {
    await session.close();
  }
};
```

### 3.2 修改现有同步逻辑

**修改 `doSyncProject` 中的 Character 节点创建部分**:

```typescript
// server/src/services/graph/sync.ts (修改)

// 2. Create Character nodes (扩展版本)
if (projectData.characters?.length > 0) {
  for (const char of projectData.characters) {
    await session.run(
      `CREATE (c:Character {
        id: $id,
        name: $name,
        role: $role,
        archetype: $archetype,
        description: $description,
        projectId: $projectId,
        // 新增深度属性
        alignment: $alignment,
        tags: $tags,
        desire: $desire,
        fear: $fear,
        signature: $signature,
        contrast: $contrast,
        weakness: $weakness,
        // 系统字段
        lastModified: timestamp()
      })`,
      {
        id: char.id,
        name: char.name,
        role: char.role || '',
        archetype: char.archetype || '',
        description: (char.description || '').substring(0, 500),
        projectId,
        alignment: char.alignment || null,
        tags: char.tags || [],
        desire: char.desire || null,
        fear: char.fear || null,
        signature: char.signature || null,
        contrast: char.contrast || null,
        weakness: char.weakness || null,
      }
    );
  }

  // ... 角色关系同步代码保持不变 ...

  // 新增：同步角色-世界设定关系
  for (const char of projectData.characters) {
    await syncCharacterWorldRelations(char, projectId);
  }
}
```

### 3.3 同步触发时机

| 触发点 | 同步类型 | 调用函数 |
|--------|---------|---------|
| 项目加载 | 全量同步 | `syncProjectToGraph` |
| 角色创建 | 增量同步 | `syncSingleCharacter` |
| 角色更新 | 增量同步 | `syncSingleCharacter` |
| 角色删除 | 增量删除 | `deleteCharacterFromGraph` |
| 批量生成 | 全量同步 | `syncProjectToGraph` |
| Echo 接受 | 增量同步 | `syncSingleCharacter` |

### 3.4 增量同步 vs 全量同步

```typescript
// store/useProjectStore.ts (修改)

syncToBackend: async () => {
  const { useBackend, project } = get();
  if (!useBackend) return;

  if (_saveTimer) clearTimeout(_saveTimer);
  set({ isSaving: true });

  _saveTimer = setTimeout(async () => {
    try {
      const id = project.id;

      // 检测是否只有角色深度属性变更
      const depthAttrKeys = ['alignment', 'tags', 'desire', 'fear', 'signature', 'contrast', 'weakness'];
      const hasOnlyDepthChanges = Object.keys(_pendingPatch).every(key =>
        key === 'characters' &&
        // 检查是否只有深度属性变更
        isOnlyDepthAttributeChange(_pendingPatch.characters, project.characters)
      );

      if (hasOnlyDepthChanges) {
        // 增量同步：只同步变更的角色
        console.log('☁️ Incremental Sync (Character Depth) to backend:', id);
        const changedChars = getChangedCharacters(_pendingPatch.characters, project.characters);
        for (const char of changedChars) {
          await patchCharacterDepth(id, char);
        }
      } else if (Object.keys(_pendingPatch).some(key =>
        ['characters', 'worldSettings', 'plotNodes', 'echoes', 'chapters'].includes(key)
      )) {
        // 全量同步
        console.log('☁️ Full Sync (PUT) to backend:', id);
        await syncProject({ ...project, lastModified: Date.now() });
      } else if (Object.keys(_pendingPatch).length > 0) {
        // 项目属性增量同步
        console.log('☁️ Incremental Sync (PATCH) to backend:', id);
        await patchProject(id, { ..._pendingPatch, lastModified: Date.now() });
      }

      _pendingPatch = {};
      set({ isSaving: false });
    } catch (err) {
      console.warn('Backend sync failed:', err);
      set({ isSaving: false });
    }
  }, syncInterval);
},
```

---

## 四、查询 API 设计

### 4.1 新增查询函数

#### 4.1.1 `getCharacterWithDepth`

```typescript
// server/src/services/graph/queries.ts

/**
 * 获取角色的完整深度信息
 * @param projectId 项目ID
 * @param characterId 角色ID
 */
export const getCharacterWithDepth = async (
  projectId: string,
  characterId: string
): Promise<{
  character: any;
  relationships: any[];
  worldRelations: any[];
  conflicts: any[];
}> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 1. 获取角色节点（包含深度属性）
    const charResult = await session.run(
      `MATCH (c:Character {id: $charId, projectId: $projectId})
       RETURN c`,
      { charId: characterId, projectId }
    );

    if (charResult.records.length === 0) {
      return { character: null, relationships: [], worldRelations: [], conflicts: [] };
    }

    const character = charResult.records[0].get('c').properties;

    // 2. 获取角色间关系
    const relsResult = await session.run(
      `MATCH (c:Character {id: $charId, projectId: $projectId})-[r]-(other:Character {projectId: $projectId})
       WHERE type(r) IN ['ENEMY_OF', 'ALLY_OF', 'LOVES', 'KIN_OF', 'MENTORS', 'RIVAL_OF', 'SERVES', 'FRIEND_OF', 'RELATED_TO']
       RETURN other.name as targetName, other.id as targetId, type(r) as relationType,
              r.weight as weight, r.description as description, r.trajectory as trajectory,
              CASE WHEN startNode(r) = c THEN 'OUT' ELSE 'IN' END as direction`,
      { charId: characterId, projectId }
    );

    const relationships = relsResult.records.map(r => ({
      targetId: r.get('targetId'),
      targetName: r.get('targetName'),
      relationType: r.get('relationType'),
      weight: r.get('weight')?.toNumber() || 50,
      description: r.get('description') || '',
      trajectory: r.get('trajectory') || 'stable',
      direction: r.get('direction'),
    }));

    // 3. 获取角色-世界设定关系
    const worldRelsResult = await session.run(
      `MATCH (c:Character {id: $charId, projectId: $projectId})-[r:ORIGINATED_FROM|RESIDES_IN|CONTROLS_TERRITORY|EXILED_FROM]->(w:WorldSetting)
       RETURN w.id as settingId, w.title as settingName, type(r) as relationType, properties(r) as props`,
      { charId: characterId, projectId }
    );

    const worldRelations = worldRelsResult.records.map(r => ({
      settingId: r.get('settingId'),
      settingName: r.get('settingName'),
      relationType: r.get('relationType'),
      properties: r.get('props') || {},
    }));

    // 4. 获取角色参与的冲突
    const conflictsResult = await session.run(
      `MATCH (c:Character {id: $charId, projectId: $projectId})<-[:HAS_CONFLICT_PARTICIPANT]-(pn:PlotNode)
       RETURN pn.id as plotNodeId, pn.title as plotNodeTitle,
              exists((pn)-[r:HAS_CONFLICT_PARTICIPANT]->(c)) as isParticipant,
              r.conflictType as conflictType, r.stakes as stakes, r.intensity as intensity`,
      { charId: characterId, projectId }
    );

    const conflicts = conflictsResult.records.map(r => ({
      plotNodeId: r.get('plotNodeId'),
      plotNodeTitle: r.get('plotNodeTitle'),
      conflictType: r.get('conflictType'),
      stakes: r.get('stakes'),
      intensity: r.get('intensity')?.toNumber() || 5,
    }));

    return { character, relationships, worldRelations, conflicts };
  } finally {
    await session.close();
  }
};
```

#### 4.1.2 `searchCharactersByTags`

```typescript
// server/src/services/graph/queries.ts

/**
 * 按标签搜索角色
 * @param projectId 项目ID
 * @param tags 标签数组
 * @param matchAll 是否匹配所有标签（默认任意匹配）
 */
export const searchCharactersByTags = async (
  projectId: string,
  tags: string[],
  matchAll: boolean = false
): Promise<any[]> => {
  const d = getDriver();
  const session = d.session();

  try {
    const query = matchAll
      ? `MATCH (c:Character {projectId: $projectId})
         WHERE ALL(tag IN $tags WHERE tag IN c.tags)
         RETURN c`
      : `MATCH (c:Character {projectId: $projectId})
         WHERE ANY(tag IN $tags WHERE tag IN c.tags)
         RETURN c`;

    const result = await session.run(query, { projectId, tags });
    return result.records.map(r => r.get('c').properties);
  } finally {
    await session.close();
  }
};
```

#### 4.1.3 `getCharactersByAlignment`

```typescript
// server/src/services/graph/queries.ts

/**
 * 按道德阵营查询角色
 * @param projectId 项目ID
 * @param alignmentPattern 阵营模式（支持模糊匹配）
 */
export const getCharactersByAlignment = async (
  projectId: string,
  alignmentPattern: string
): Promise<any[]> => {
  const d = getDriver();
  const session = d.session();

  try {
    const result = await session.run(
      `MATCH (c:Character {projectId: $projectId})
       WHERE c.alignment CONTAINS $pattern
       RETURN c
       ORDER BY c.name`,
      { projectId, pattern: alignmentPattern }
    );
    return result.records.map(r => r.get('c').properties);
  } finally {
    await session.close();
  }
};
```

#### 4.1.4 `getCharacterMotivationNetwork`

```typescript
// server/src/services/graph/queries.ts

/**
 * 获取角色动机网络（欲望和恐惧的关系图）
 * @param projectId 项目ID
 */
export const getCharacterMotivationNetwork = async (
  projectId: string
): Promise<{
  characters: any[];
  desires: string[];
  fears: string[];
}> => {
  const d = getDriver();
  const session = d.session();

  try {
    const result = await session.run(
      `MATCH (c:Character {projectId: $projectId})
       WHERE c.desire IS NOT NULL OR c.fear IS NOT NULL
       RETURN c.id as id, c.name as name, c.desire as desire, c.fear as fear`,
      { projectId }
    );

    const characters = result.records.map(r => ({
      id: r.get('id'),
      name: r.get('name'),
      desire: r.get('desire'),
      fear: r.get('fear'),
    }));

    const desires = [...new Set(characters.filter(c => c.desire).map(c => c.desire))];
    const fears = [...new Set(characters.filter(c => c.fear).map(c => c.fear))];

    return { characters, desires, fears };
  } finally {
    await session.close();
  }
};
```

#### 4.1.5 `getCharactersAtLocation`

```typescript
// server/src/services/graph/queries.ts

/**
 * 获取指定地点的所有角色
 * @param projectId 项目ID
 * @param locationId 世界设定ID
 * @param includeVisitors 是否包含访客（非居住者）
 */
export const getCharactersAtLocation = async (
  projectId: string,
  locationId: string,
  includeVisitors: boolean = false
): Promise<any[]> => {
  const d = getDriver();
  const session = d.session();

  try {
    const relTypes = includeVisitors
      ? 'ORIGINATED_FROM|RESIDES_IN|CONTROLS_TERRITORY'
      : 'RESIDES_IN';

    const result = await session.run(
      `MATCH (c:Character {projectId: $projectId})-[r:${relTypes}]->(w:WorldSetting {id: $locationId})
       RETURN c, type(r) as relationType, r.since as since`,
      { projectId, locationId }
    );

    return result.records.map(r => ({
      character: r.get('c').properties,
      relationType: r.get('relationType'),
      since: r.get('since'),
    }));
  } finally {
    await session.close();
  }
};
```

### 4.2 API 路由设计

```typescript
// server/src/routes/graph.ts (新增路由)

import { Router } from 'express';
import {
  getCharacterWithDepth,
  searchCharactersByTags,
  getCharactersByAlignment,
  getCharacterMotivationNetwork,
  getCharactersAtLocation,
} from '../services/graph/queries';
import {
  syncSingleCharacter,
  syncCharacterDepthAttributes,
} from '../services/graph/sync';

const router = Router();

// 获取角色完整信息（包含深度属性）
router.get('/character/:characterId/depth', async (req, res) => {
  const { projectId, characterId } = req.params;
  try {
    const data = await getCharacterWithDepth(projectId, characterId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 按标签搜索角色
router.get('/characters/search/tags', async (req, res) => {
  const { projectId } = req.query;
  const { tags, matchAll } = req.body;
  try {
    const characters = await searchCharactersByTags(projectId, tags, matchAll);
    res.json(characters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 按阵营查询角色
router.get('/characters/search/alignment', async (req, res) => {
  const { projectId, pattern } = req.query;
  try {
    const characters = await getCharactersByAlignment(projectId, pattern as string);
    res.json(characters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取动机网络
router.get('/characters/motivation-network', async (req, res) => {
  const { projectId } = req.query;
  try {
    const data = await getCharacterMotivationNetwork(projectId as string);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取地点的角色
router.get('/location/:locationId/characters', async (req, res) => {
  const { projectId, locationId } = req.params;
  const { includeVisitors } = req.query;
  try {
    const characters = await getCharactersAtLocation(
      projectId,
      locationId,
      includeVisitors === 'true'
    );
    res.json(characters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 增量同步单个角色
router.post('/character/sync', async (req, res) => {
  const { projectId, character } = req.body;
  try {
    await syncSingleCharacter(character, projectId);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

---

## 五、前端集成设计

### 5.1 UI 组件修改方案

#### 5.1.1 CharacterCreator.tsx 增强

**新增深度属性展示区域**:

```tsx
// components/CharacterCreator.tsx (新增部分)

// 深度属性展示组件
const CharacterDepthPanel: React.FC<{
  character: Character;
  onUpdate: (updates: Partial<Character>) => void;
}> = ({ character, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-muse-400" />
          角色深度属性
        </h4>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs text-muse-400 hover:text-muse-300"
        >
          {isEditing ? '完成' : '编辑'}
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-3">
          {/* 道德阵营 */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">道德阵营</label>
            <select
              value={character.alignment || ''}
              onChange={(e) => onUpdate({ alignment: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
            >
              <option value="">未设定</option>
              <option value="守序善良">守序善良</option>
              <option value="中立善良">中立善良</option>
              <option value="混乱善良">混乱善良</option>
              <option value="守序中立">守序中立</option>
              <option value="绝对中立">绝对中立</option>
              <option value="混乱中立">混乱中立</option>
              <option value="守序邪恶">守序邪恶</option>
              <option value="中立邪恶">中立邪恶</option>
              <option value="混乱邪恶">混乱邪恶</option>
            </select>
          </div>

          {/* 核心欲望 */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">核心欲望</label>
            <input
              type="text"
              value={character.desire || ''}
              onChange={(e) => onUpdate({ desire: e.target.value })}
              placeholder="角色最想得到什么？"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
            />
          </div>

          {/* 核心恐惧 */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">核心恐惧</label>
            <input
              type="text"
              value={character.fear || ''}
              onChange={(e) => onUpdate({ fear: e.target.value })}
              placeholder="角色最害怕什么？"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
            />
          </div>

          {/* 标志性特征 */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">标志性特征</label>
            <textarea
              value={character.signature || ''}
              onChange={(e) => onUpdate({ signature: e.target.value })}
              placeholder="外貌、行为、习惯、说话方式等"
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white resize-none"
            />
          </div>

          {/* 角色标签 */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">角色标签</label>
            <input
              type="text"
              value={(character.tags || []).join(', ')}
              onChange={(e) => onUpdate({ tags: e.target.value.split(',').map(t => t.trim()) })}
              placeholder="高智商低情商, 洁癖晚期, 腹黑（用逗号分隔）"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
            />
          </div>

          {/* 反差萌点 */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">反差萌点</label>
            <input
              type="text"
              value={character.contrast || ''}
              onChange={(e) => onUpdate({ contrast: e.target.value })}
              placeholder="与表面形象形成反差的特质"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
            />
          </div>

          {/* 弱点/缺陷 */}
          <div>
            <label className="block text-xs text-slate-500 mb-1">弱点/缺陷</label>
            <input
              type="text"
              value={character.weakness || ''}
              onChange={(e) => onUpdate({ weakness: e.target.value })}
              placeholder="角色的致命缺陷"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-xs">
          {character.alignment && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500">阵营:</span>
              <span className="text-slate-300">{character.alignment}</span>
            </div>
          )}
          {character.desire && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500">欲望:</span>
              <span className="text-slate-300 truncate">{character.desire}</span>
            </div>
          )}
          {character.fear && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500">恐惧:</span>
              <span className="text-slate-300 truncate">{character.fear}</span>
            </div>
          )}
          {character.tags && character.tags.length > 0 && (
            <div className="col-span-2 flex flex-wrap gap-1">
              {character.tags.map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-muse-600/20 text-muse-400 rounded text-xs">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

#### 5.1.2 世界设定关联选择器

```tsx
// components/CharacterWorldRelationSelector.tsx

import React from 'react';
import { Character, WorldSetting } from '../types';
import { MapPin, Home, Crown, Ban } from 'lucide-react';

interface Props {
  character: Character;
  worldSettings: WorldSetting[];
  onUpdate: (updates: Partial<Character>) => void;
}

export const CharacterWorldRelationSelector: React.FC<Props> = ({
  character,
  worldSettings,
  onUpdate,
}) => {
  const getLocationLabel = (id: string | undefined) => {
    if (!id) return '未设定';
    const setting = worldSettings.find(w => w.id === id);
    return setting?.title || '未知地点';
  };

  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
      <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
        <MapPin className="w-4 h-4 text-blue-400" />
        地理关联
      </h4>

      <div className="space-y-3">
        {/* 起源地 */}
        <div>
          <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
            <Home className="w-3 h-3" />
            起源/出生地
          </label>
          <select
            value={character.originLocation || ''}
            onChange={(e) => onUpdate({ originLocation: e.target.value || undefined })}
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
          >
            <option value="">未设定</option>
            {worldSettings
              .filter(w => w.category === 'Geography')
              .map(w => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
          </select>
        </div>

        {/* 当前居住地 */}
        <div>
          <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            当前居住地
          </label>
          <select
            value={character.residence || ''}
            onChange={(e) => onUpdate({ residence: e.target.value || undefined })}
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white"
          >
            <option value="">未设定</option>
            {worldSettings
              .filter(w => w.category === 'Geography')
              .map(w => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
          </select>
        </div>

        {/* 控制领地（多选） */}
        <div>
          <label className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
            <Crown className="w-3 h-3" />
            控制领地
          </label>
          <div className="flex flex-wrap gap-2">
            {worldSettings
              .filter(w => w.category === 'Geography')
              .map(w => (
                <label
                  key={w.id}
                  className={`
                    px-3 py-1 rounded-full text-xs cursor-pointer transition-all
                    ${(character.controlledTerritories || []).includes(w.id)
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                      : 'bg-slate-900 text-slate-500 border border-slate-700 hover:border-slate-600'}
                  `}
                >
                  <input
                    type="checkbox"
                    checked={(character.controlledTerritories || []).includes(w.id)}
                    onChange={(e) => {
                      const territories = character.controlledTerritories || [];
                      if (e.target.checked) {
                        onUpdate({ controlledTerritories: [...territories, w.id] });
                      } else {
                        onUpdate({ controlledTerritories: territories.filter(id => id !== w.id) });
                      }
                    }}
                    className="hidden"
                  />
                  {w.title}
                </label>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
```

### 5.2 状态管理更新

```typescript
// store/useProjectStore.ts (新增方法)

interface ProjectStore {
  // ... 现有方法 ...

  // 新增图谱查询方法
  fetchCharacterDepth: (characterId: string) => Promise<void>;
  searchCharactersByTags: (tags: string[], matchAll?: boolean) => Promise<Character[]>;
  fetchCharacterMotivationNetwork: () => Promise<void>;
  fetchCharactersAtLocation: (locationId: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // ... 现有实现 ...

  // 获取角色深度信息（从图谱）
  fetchCharacterDepth: async (characterId: string) => {
    const { useBackend, project } = get();
    if (!useBackend) return;

    try {
      const response = await fetch(`/api/graph/character/${characterId}/depth?projectId=${project.id}`);
      const data = await response.json();

      // 更新本地角色数据（合并深度属性）
      set((state) => ({
        project: {
          ...state.project,
          characters: state.project.characters.map(c =>
            c.id === characterId
              ? { ...c, ...data.character }
              : c
          ),
        },
      }));
    } catch (err) {
      console.warn('Failed to fetch character depth:', err);
    }
  },

  // 按标签搜索角色
  searchCharactersByTags: async (tags: string[], matchAll = false) => {
    const { useBackend, project } = get();
    if (!useBackend) return [];

    try {
      const response = await fetch('/api/graph/characters/search/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, tags, matchAll }),
      });
      return await response.json();
    } catch (err) {
      console.warn('Failed to search characters by tags:', err);
      return [];
    }
  },

  // 获取动机网络
  fetchCharacterMotivationNetwork: async () => {
    const { useBackend, project } = get();
    if (!useBackend) return;

    try {
      const response = await fetch(`/api/graph/characters/motivation-network?projectId=${project.id}`);
      const data = await response.json();
      // 可以存储到单独的状态中用于可视化
      return data;
    } catch (err) {
      console.warn('Failed to fetch motivation network:', err);
    }
  },

  // 获取地点的角色
  fetchCharactersAtLocation: async (locationId: string) => {
    const { useBackend, project } = get();
    if (!useBackend) return;

    try {
      const response = await fetch(
        `/api/graph/location/${locationId}/characters?projectId=${project.id}`
      );
      const data = await response.json();
      return data;
    } catch (err) {
      console.warn('Failed to fetch characters at location:', err);
    }
  },
}));
```

### 5.3 可视化展示方式

#### 5.3.1 KnowledgeGraph.tsx 增强

```tsx
// components/KnowledgeGraph.tsx (新增图层)

// 新增节点颜色配置
const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  // ... 现有配置 ...
  CharacterDesire: { bg: '#f97316', border: '#fb923c', text: '#fff7ed' }, // 橙色表示欲望
  CharacterFear: { bg: '#7c3aed', border: '#8b5cf6', text: '#f5f3ff' },   // 紫色表示恐惧
};

// 新增图层切换
const MOTIVATION_LAYERS = ['Character', 'CharacterDesire', 'CharacterFear'];

// 在工具栏添加动机网络切换
<button
  onClick={() => setActiveLayers(MOTIVATION_LAYERS)}
  className={`
    px-3 py-1 rounded text-xs font-medium transition-colors
    ${JSON.stringify(activeLayers) === JSON.stringify(MOTIVATION_LAYERS)
      ? 'bg-muse-600 text-white'
      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}
  `}
>
  动机网络
</button>
```

#### 5.3.2 角色深度属性标签云

```tsx
// components/CharacterTagCloud.tsx

import React from 'react';
import { Character } from '../types';

interface Props {
  characters: Character[];
  onSelectCharacter: (id: string) => void;
}

export const CharacterTagCloud: React.FC<Props> = ({ characters, onSelectCharacter }) => {
  // 收集所有标签及其出现次数
  const tagCounts = characters.reduce((acc, char) => {
    (char.tags || []).forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  return (
    <div className="flex flex-wrap gap-2 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
      <h4 className="w-full text-sm font-bold text-slate-400 mb-2">角色标签云</h4>
      {sortedTags.map(([tag, count]) => (
        <button
          key={tag}
          onClick={() => {
            // 点击标签筛选角色
            const chars = characters.filter(c => c.tags?.includes(tag));
            if (chars.length === 1) onSelectCharacter(chars[0].id);
          }}
          className="px-3 py-1 bg-muse-600/20 text-muse-400 rounded-full text-xs hover:bg-muse-600/30 transition-colors"
          style={{ fontSize: `${Math.min(1 + count * 0.1, 1.5)}rem` }}
        >
          {tag} ({count})
        </button>
      ))}
    </div>
  );
};
```

---

## 六、数据迁移设计

### 6.1 旧数据兼容方案

**原则**:
1. 运行时自动转换旧格式关系
2. 保留 `relationships` 字段向后兼容
3. 提供可选的数据库迁移脚本

**兼容策略**:

```typescript
// services/schemas.ts (已有逻辑，无需修改)

// 现有的 safeParseAiJson 已经处理了：
// 1. structuredRelations 的标准化
// 2. 关系类型映射
// 3. 旧格式字符串保留

// 前端读取时的兼容处理
// utils/characterRelations.ts (已实现)

export function normalizeCharacterRelations(
  character: Character,
  allCharacters: Character[]
): Character {
  // 1. 优先使用 structuredRelations
  if (character.structuredRelations && character.structuredRelations.length > 0) {
    return character;
  }

  // 2. 自动转换旧格式
  if (character.relationships) {
    const parsed = parseLegacyRelationships(character.relationships);
    const structured = convertLegacyToStructured(parsed, allCharacters);
    return { ...character, structuredRelations: structured };
  }

  // 3. 无数据时返回空数组
  return { ...character, structuredRelations: [] };
}
```

### 6.2 迁移脚本伪代码

```typescript
// scripts/migrateCharacterRelations.ts

import { getDriver } from '../server/src/services/graph/client';

/**
 * 批量迁移脚本：将所有项目的角色关系转换为结构化格式
 * 用法: npx ts-node scripts/migrateCharacterRelations.ts
 */
async function migrateAllProjects() {
  const driver = getDriver();
  const session = driver.session();

  try {
    // 1. 获取所有项目
    const projectsResult = await session.run(
      `MATCH (n {projectId: $projectId})
       RETURN DISTINCT n.projectId as projectId`,
      { projectId: '*' }
    );

    console.log(`Found ${projectsResult.records.length} projects`);

    // 2. 逐项目迁移
    for (const record of projectsResult.records) {
      const projectId = record.get('projectId');
      await migrateProject(projectId);
    }

    console.log('Migration completed!');
  } finally {
    await session.close();
  }
}

async function migrateProject(projectId: string) {
  const driver = getDriver();
  const session = driver.session();

  try {
    console.log(`Migrating project ${projectId}...`);

    // 1. 获取所有角色节点
    const charsResult = await session.run(
      `MATCH (c:Character {projectId: $projectId}) RETURN c`,
      { projectId }
    );

    const characters = charsResult.records.map(r => r.get('c').properties);

    // 2. 为每个角色处理关系
    for (const char of characters) {
      // 2.1 检查是否已有结构化关系
      const existingRels = await session.run(
        `MATCH (c:Character {id: $charId, projectId: $projectId})-[r]->(other:Character)
         WHERE type(r) IN ['ENEMY_OF', 'ALLY_OF', 'LOVES', 'KIN_OF', 'MENTORS', 'RIVAL_OF', 'SERVES', 'FRIEND_OF']
         RETURN type(r) as relType, other.id as targetId, other.name as targetName, r.description as description`,
        { charId: char.id, projectId }
      );

      if (existingRels.records.length > 0) {
        console.log(`  Character ${char.name} already has ${existingRels.records.length} relations, skipping`);
        continue;
      }

      // 2.2 如果没有关系但有 relationships 字符串，需要解析
      // 注意：这里需要调用 AI 服务或使用规则解析
      console.log(`  Character ${char.name} needs relation extraction`);

      // 可以在这里调用 graphLlm.extractCharacterRelationships
      // 或者标记为需要手动处理
    }

    // 3. 同步深度属性（从 MySQL 读取并更新到 Neo4j）
    // 这一步需要从 MySQL 获取完整角色数据
    console.log(`  Syncing depth attributes...`);

  } finally {
    await session.close();
  }
}

// 执行迁移
migrateAllProjects().catch(console.error);
```

### 6.3 增量迁移策略

```typescript
// server/src/services/graph/sync.ts

/**
 * 增量迁移：在首次查询时自动转换
 */
export const ensureCharacterStructuredRelations = async (
  projectId: string,
  characterId: string
): Promise<CharacterRelation[]> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 1. 检查图谱中是否已有关系
    const existingRels = await session.run(
      `MATCH (c:Character {id: $charId, projectId: $projectId})-[r]->(other:Character)
       WHERE type(r) IN ['ENEMY_OF', 'ALLY_OF', 'LOVES', 'KIN_OF', 'MENTORS', 'RIVAL_OF', 'SERVES', 'FRIEND_OF', 'RELATED_TO']
       RETURN type(r) as type, other.id as targetId, other.name as targetName,
              r.weight as weight, r.description as description`,
      { charId: characterId, projectId }
    );

    if (existingRels.records.length > 0) {
      return existingRels.records.map(r => ({
        targetCharacterId: r.get('targetId'),
        targetCharacterName: r.get('targetName'),
        type: r.get('type') as CharacterRelationType,
        weight: r.get('weight')?.toNumber() || 50,
        description: r.get('description') || '',
      }));
    }

    // 2. 如果没有，返回空数组（前端会处理旧格式转换）
    return [];
  } finally {
    await session.close();
  }
};
```

---

## 七、实施步骤清单

### 阶段 1: 后端同步层改造（2-3 天）

- [ ] **1.1** 修改 `server/src/services/graph/sync.ts`
  - [ ] 扩展 Character 节点创建逻辑，添加深度属性
  - [ ] 实现 `syncCharacterDepthAttributes` 函数
  - [ ] 实现 `syncCharacterWorldRelations` 函数
  - [ ] 实现 `syncSingleCharacter` 增量同步函数
  - [ ] 实现 `deleteCharacterFromGraph` 删除函数

- [ ] **1.2** 修改 `server/src/services/graph/queries.ts`
  - [ ] 实现 `getCharacterWithDepth` 查询函数
  - [ ] 实现 `searchCharactersByTags` 查询函数
  - [ ] 实现 `getCharactersByAlignment` 查询函数
  - [ ] 实现 `getCharacterMotivationNetwork` 查询函数
  - [ ] 实现 `getCharactersAtLocation` 查询函数

- [ ] **1.3** 新增 API 路由 `server/src/routes/graph.ts`
  - [ ] GET `/api/graph/character/:characterId/depth`
  - [ ] POST `/api/graph/characters/search/tags`
  - [ ] GET `/api/graph/characters/search/alignment`
  - [ ] GET `/api/graph/characters/motivation-network`
  - [ ] GET `/api/graph/location/:locationId/characters`
  - [ ] POST `/api/graph/character/sync`

### 阶段 2: 前端 UI 增强（3-4 天）

- [ ] **2.1** 修改 `components/CharacterCreator.tsx`
  - [ ] 添加 `CharacterDepthPanel` 组件
  - [ ] 添加深度属性编辑表单
  - [ ] 集成 `CharacterWorldRelationSelector` 组件
  - [ ] 更新角色详情展示区域

- [ ] **2.2** 新增 `components/CharacterWorldRelationSelector.tsx`
  - [ ] 实现起源地选择器
  - [ ] 实现居住地选择器
  - [ ] 实现控制领地多选
  - [ ] 实现流放地多选

- [ ] **2.3** 新增 `components/CharacterTagCloud.tsx`
  - [ ] 实现标签统计
  - [ ] 实现标签云展示
  - [ ] 实现点击筛选功能

- [ ] **2.4** 修改 `components/KnowledgeGraph.tsx`
  - [ ] 添加动机网络图层
  - [ ] 添加角色深度属性可视化
  - [ ] 添加地理关联关系展示

### 阶段 3: 状态管理更新（1-2 天）

- [ ] **3.1** 修改 `store/useProjectStore.ts`
  - [ ] 添加 `fetchCharacterDepth` 方法
  - [ ] 添加 `searchCharactersByTags` 方法
  - [ ] 添加 `fetchCharacterMotivationNetwork` 方法
  - [ ] 添加 `fetchCharactersAtLocation` 方法
  - [ ] 优化 `syncToBackend` 增量同步逻辑

- [ ] **3.2** 修改 `services/apiService.ts`
  - [ ] 添加图谱查询 API 调用函数
  - [ ] 添加增量同步 API 调用函数

### 阶段 4: 数据迁移与测试（2 天）

- [ ] **4.1** 编写迁移脚本
  - [ ] 实现 `scripts/migrateCharacterRelations.ts`
  - [ ] 实现增量迁移逻辑
  - [ ] 添加迁移回滚机制

- [ ] **4.2** 编写测试用例
  - [ ] 单元测试：同步函数
  - [ ] 单元测试：查询函数
  - [ ] 集成测试：API 端点
  - [ ] E2E 测试：前端交互

- [ ] **4.3** 兼容性测试
  - [ ] 测试旧数据自动转换
  - [ ] 测试新旧格式双写
  - [ ] 测试图谱查询回退

### 阶段 5: 文档与发布（1 天）

- [ ] **5.1** 更新 API 文档
  - [ ] 记录新增的图谱查询 API
  - [ ] 记录增量同步 API

- [ ] **5.2** 更新用户手册
  - [ ] 角色深度属性使用指南
  - [ ] 地理关联设置指南

- [ ] **5.3** 发布准备
  - [ ] 代码审查
  - [ ] 性能测试
  - [ ] 发布说明

---

## 八、风险与缓解措施

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| Neo4j 数组类型兼容性 | 🟡 中 | 使用字符串数组，避免复杂类型 |
| 旧数据转换精度 | 🟡 中 | 保留原始字符串，运行时转换 |
| 同步性能瓶颈 | 🟡 中 | 实现增量同步，减少全量同步 |
| 前端状态管理复杂度 | 🟢 低 | 使用 Zustand 切片订阅 |
| API 版本兼容 | 🟢 低 | 保持旧 API 可用 |

---

## 九、验收标准

1. **功能验收**
   - [ ] 角色深度属性可正常编辑和保存
   - [ ] 地理关联关系可正常设置
   - [ ] 图谱查询返回完整深度信息
   - [ ] 标签搜索功能正常工作

2. **性能验收**
   - [ ] 单个角色增量同步 < 200ms
   - [ ] 标签搜索响应 < 500ms
   - [ ] 图谱全量加载 < 2s（100 节点内）

3. **兼容性验收**
   - [ ] 旧项目数据自动转换
   - [ ] 新旧格式双写成功
   - [ ] 回退机制正常工作

---

**文档版本**: 1.0
**最后更新**: 2026-03-21
**审核状态**: 待审核
