# P2阶段：WorldSetting模块图谱化详细技术设计

**文档版本**: v1.0
**设计日期**: 2026-03-21
**设计者**: Backend Technical Lead
**实施阶段**: P2（基于P0-P1已完成）

---

## 目录

1. [概述](#1-概述)
2. [当前状态分析](#2-当前状态分析)
3. [Schema增强设计](#3-schema增强设计)
4. [关系设计详解](#4-关系设计详解)
5. [sync.ts实现方案](#5-syncts实现方案)
6. [queries.ts实现方案](#6-queriests实现方案)
7. [数据迁移策略](#7-数据迁移策略)
8. [测试计划](#8-测试计划)
9. [风险评估](#9-风险评估)

---

## 1. 概述

### 1.1 背景与目标

P0-P1阶段已完成：

- P0: Character节点和关系图谱化（CharacterRelation）
- P1: PlotNode节点和关系图谱化（PlotNode-Character, PlotNode-Location关联）

P2阶段目标：

1. **增强WorldSetting节点**：添加aliases等新属性
2. **完善层级关系**：CONTAINS, BORDERS, PART_OF
3. **角色-设定关联**：ORIGINATED_FROM, RESIDES_IN, CONTROLS_TERRITORY, EXILED_FROM
4. **实现高级查询**：层级树、地理位置上下文、领土控制等

### 1.2 设计原则

| 原则           | 说明                         |
| -------------- | ---------------------------- |
| **增量式增强** | 基于现有实现，不破坏已有功能 |
| **数据完整性** | 确保关系双向一致性           |
| **查询性能**   | 优化图遍历查询性能           |
| **可扩展性**   | 支持未来新增关系类型         |

---

## 2. 当前状态分析

### 2.1 已有实现（sync.ts）

✅ **已实现的WorldSetting功能**：

```typescript
// 1. WorldSetting节点创建（带category标签）
MERGE (w:WorldSetting:${categoryLabel} {id: $id, projectId: $projectId})
SET w += {title, content, importance, tags, createdAt, updatedAt}

// 2. CONTAINS关系（基于parentId）
MATCH (parent:WorldSetting {id: $parentId})
MATCH (child:WorldSetting {id: $childId})
MERGE (parent)-[:CONTAINS]->(child)

// 3. Character-WorldSetting关系
(c:Character)-[:ORIGINATED_FROM]->(w:WorldSetting)  // originLocation
(c:Character)-[:RESIDES_IN]->(w:WorldSetting)       // residence
(c:Character)-[:CONTROLS_TERRITORY]->(w:WorldSetting) // controlledTerritories
(c:Character)-[:EXILED_FROM]->(w:WorldSetting)      // exiledFrom
```

✅ **已有的查询功能（queries.ts）**：

- `getProjectGraph()` - 获取完整图谱（包含WorldSetting）
- `getPhysicalStatus()` - 获取角色物理状态（包含location）

### 2.2 缺失功能

❌ **待实现**：

1. WorldSetting节点缺少`aliases`属性
2. 缺少`BORDERS`关系（地理相邻）
3. 缺少`PART_OF`关系（CONTAINS的逆关系，便于查询）
4. 缺少专用查询函数：
   - `getWorldSettingHierarchy()`
   - `getCharacterLocationContext()`
   - `getLocationCharacters()`
   - `getTerritoryControl()`

---

## 3. Schema增强设计

### 3.1 WorldSetting节点属性增强

#### 3.1.1 types.ts 更新

```typescript
export interface WorldSetting {
  id: string;
  category: 'Geography' | 'Magic/Tech' | 'Society' | 'History' | 'Other';
  title: string;
  content: string;

  // 层级关系
  parentId?: string; // 父级设定ID（如：王国下的城市）
  importance?: number; // 重要性等级 1-10
  tags?: string[]; // 设定标签

  // ===== P2 新增 =====
  aliases?: string[]; // 别名数组（如：["帝都", "皇城", "王都"]）
  borders?: string[]; // 相邻设定ID数组（用于地理相邻关系）
}
```

#### 3.1.2 services/schemas.ts 更新

```typescript
export const AiWorldSettingSchema = z.object({
  title: z.string().min(1, '设定标题不能为空'),
  category: z.enum(['Geography', 'Magic/Tech', 'Society', 'History', 'Other']).default('Other'),
  content: z.string().default(''),

  // P2 新增
  aliases: z.array(z.string()).optional().describe('设定别名'),
  borders: z.array(z.string()).optional().describe('相邻地点ID（仅Geography类别）'),
  parentId: z.string().optional().describe('父级设定ID'),
  importance: z.number().min(1).max(10).optional(),
  tags: z.array(z.string()).optional(),
});
```

### 3.2 Neo4j Schema扩展

#### 3.2.1 新增属性索引

```cypher
// 1. 为aliases数组创建全文索引（支持别名搜索）
CALL db.index.fulltext.createNodeIndex(
  'worldSettingAliasIndex',
  ['WorldSetting'],
  ['aliases']
);

// 2. 为importance创建索引（支持按重要性排序）
CREATE INDEX worldSettingImportanceIndex IF NOT EXISTS
FOR (w:WorldSetting)
ON (w.importance);
```

#### 3.2.2 新增关系约束

```cypher
// 确保关系唯一性
CREATE CONSTRAINT unique_borders IF NOT EXISTS
FOR ()-[r:BORDERS]-()
REQUIRE r.id IS UNIQUE;
```

---

## 4. 关系设计详解

### 4.1 层级关系设计

#### 4.1.1 CONTAINS关系（父包含子）

**方向**：父节点 → 子节点
**语义**：父设定包含子设定

**示例**：

```
(王国)-[:CONTAINS]->(省份A)
(王国)-[:CONTAINS]->(省份B)
(省份A)-[:CONTAINS]->(城市1)
(省份A)-[:CONTAINS]->(城市2)
```

**关系属性**：

```typescript
interface CONTAINSProperties {
  createdAt: number; // 创建时间
  source: 'STRUCTURED_DATA' | 'MANUAL'; // 数据来源
}
```

**Cypher创建语句**：

```cypher
MATCH (parent:WorldSetting {id: $parentId, projectId: $projectId})
MATCH (child:WorldSetting {id: $childId, projectId: $projectId})
MERGE (parent)-[r:CONTAINS]->(child)
SET r.createdAt = timestamp(),
    r.source = 'STRUCTURED_DATA'
```

#### 4.1.2 PART_OF关系（子属于父）

**方向**：子节点 → 父节点
**语义**：子设定属于父设定（CONTAINS的逆关系）

**设计理由**：

- 便于从子节点向上查询祖先链
- 优化"查询某地点所属的所有上级地区"场景
- 减少图遍历的方向判断

**示例**：

```
(城市1)-[:PART_OF]->(省份A)-[:PART_OF]->(王国)
```

**实现策略**：

- 创建CONTAINS时，同时创建PART_OF（双向关系）
- 确保关系一致性

```cypher
MATCH (parent:WorldSetting {id: $parentId, projectId: $projectId})
MATCH (child:WorldSetting {id: $childId, projectId: $projectId})
// 创建双向关系
MERGE (parent)-[:CONTAINS {createdAt: timestamp()}]->(child)
MERGE (child)-[:PART_OF {createdAt: timestamp()}]->(parent)
```

### 4.2 地理关系设计

#### 4.2.1 BORDERS关系（地理相邻）

**方向**：双向关系
**语义**：两个地理位置相邻

**约束**：

- 仅适用于`category: 'Geography'`的节点
- 必须在同一层级（即parentId相同）
- 双向对称关系（A与B相邻 ⟺ B与A相邻）

**关系属性**：

```typescript
interface BORDERSProperties {
  borderType?: 'LAND' | 'SEA' | 'MOUNTAIN' | 'RIVER'; // 边界类型
  description?: string; // 边界描述（如"以黑河为界"）
  createdAt: number;
}
```

**示例**：

```
(城市1)-[:BORDERS {borderType: 'RIVER', description: '以黑河为界'}]-(城市2)
(国家A)-[:BORDERS {borderType: 'LAND'}]-(国家B)
```

**Cypher创建语句**：

```cypher
MATCH (a:WorldSetting {id: $idA, projectId: $projectId, category: 'Geography'})
MATCH (b:WorldSetting {id: $idB, projectId: $projectId, category: 'Geography'})
// 确保层级相同（可选）
WHERE a.parentId = b.parentId
// 创建双向关系
MERGE (a)-[r1:BORDERS]->(b)
MERGE (b)-[r2:BORDERS]->(a)
SET r1 += {borderType: $borderType, description: $description, createdAt: timestamp()},
    r2 += {borderType: $borderType, description: $description, createdAt: timestamp()}
```

### 4.3 角色-设定关联关系

#### 4.3.1 ORIGINATED_FROM（起源地）

**方向**：Character → WorldSetting
**语义**：角色出生于/起源于该地点

**关系属性**：

```typescript
interface ORIGINATED_FROMProperties {
  year?: string; // 出生年份（如"龙历205年"）
  description?: string; // 描述（如"出生于王家村"）
  createdAt: number;
}
```

**示例**：

```
(张三:Character)-[:ORIGINATED_FROM {year: "龙历205年"}]->(王家村:WorldSetting)
```

#### 4.3.2 RESIDES_IN（居住地）

**方向**：Character → WorldSetting
**语义**：角色当前居住地

**关系属性**：

```typescript
interface RESIDES_INProperties {
  since?: string; // 居住起始时间
  isCurrent: boolean; // 是否当前居住地
  description?: string; // 描述
  createdAt: number;
}
```

**示例**：

```
(张三:Character)-[:RESIDES_IN {since: "龙历230年", isCurrent: true}]->(帝都:WorldSetting)
```

#### 4.3.3 CONTROLS_TERRITORY（控制领地）

**方向**：Character → WorldSetting
**语义**：角色控制/统治该领地

**关系属性**：

```typescript
interface CONTROLS_TERRITORYProperties {
  controlType?: 'SOVEREIGN' | 'GOVERNOR' | 'MILITARY'; // 统治类型
  since?: string; // 控制起始时间
  legitimacy?: number; // 合法性 0-100
  description?: string;
  createdAt: number;
}
```

**示例**：

```
(国王:Character)-[:CONTROLS_TERRITORY {controlType: 'SOVEREIGN', legitimacy: 95}]->(王国:WorldSetting)
(将军:Character)-[:CONTROLS_TERRITORY {controlType: 'MILITARY', legitimacy: 60}]->(边疆省:WorldSetting)
```

#### 4.3.4 EXILED_FROM（流放地）

**方向**：Character → WorldSetting
**语义**：角色被流放自该地点

**关系属性**：

```typescript
interface EXILED_FROMProperties {
  year?: string; // 流放年份
  reason?: string; // 流放原因
  isReturned?: boolean; // 是否已返回
  description?: string;
  createdAt: number;
}
```

**示例**：

```
(贵族:Character)-[:EXILED_FROM {year: "龙历240年", reason: "政治斗争失败"}]->(帝都:WorldSetting)
```

---

## 5. sync.ts实现方案

### 5.1 增强WorldSetting节点同步

#### 5.1.1 添加aliases和borders属性

**文件位置**：`server/src/services/graph/sync.ts`

**修改位置**：`syncProjectToGraph()` 函数中的 WorldSetting 同步部分

```typescript
// 3. Create WorldSetting nodes with category as label
const worldSettingLabel = Neo4jErrorHelper.withTimeout(
  session.run(
    `MERGE (w:WorldSetting:${categoryLabel} {id: $id, projectId: $projectId})
         SET w += {
            title: $title,
            content: $content,
            importance: $importance,
            tags: $tags,
            aliases: $aliases,      // P2 新增
            borders: $borders,      // P2 新增
            createdAt: $createdAt,
            updatedAt: $updatedAt
         }`,
    {
      id: ws.id,
      projectId,
      title: ws.title,
      content: ws.content,
      importance: ws.importance || 5,
      tags: ws.tags || [],
      aliases: ws.aliases || [], // P2 新增
      borders: ws.borders || [], // P2 新增
      createdAt: ws.createdAt || Date.now(),
      updatedAt: ws.updatedAt || Date.now(),
    }
  ),
  'create world setting node'
);
```

### 5.2 增强层级关系同步

#### 5.2.1 创建双向层级关系

**修改位置**：`syncProjectToGraph()` 中的 CONTAINS 关系创建部分

```typescript
// 3.5.1. Create CONTAINS and PART_OF relationships (层级包含)
if (ws.parentId) {
  try {
    await Neo4jErrorHelper.withTimeout(
      session.run(
        `MATCH (parent:WorldSetting {id: $parentId, projectId: $projectId})
                 MATCH (child:WorldSetting {id: $childId, projectId: $projectId})
                 // 创建双向关系
                 MERGE (parent)-[r1:CONTAINS]->(child)
                 MERGE (child)-[r2:PART_OF]->(parent)
                 SET r1 += {createdAt: timestamp(), source: 'STRUCTURED_DATA'},
                     r2 += {createdAt: timestamp(), source: 'STRUCTURED_DATA'}`,
        {
          parentId: ws.parentId,
          childId: ws.id,
          projectId,
        }
      ),
      'create contains relationship'
    );
  } catch (err) {
    console.warn(`Failed to create CONTAINS/PART_OF relationship for ${ws.title}:`, err);
  }
}
```

### 5.3 新增BORDERS关系同步

**插入位置**：在 WorldSetting 节点创建后，CONTAINS 关系创建前

```typescript
// 3.5.0. Create BORDERS relationships (地理相邻关系)
for (const ws of worldSettings) {
  // 仅处理 Geography 类型的设定
  if (ws.category !== 'Geography' || !ws.borders || ws.borders.length === 0) {
    continue;
  }

  for (const borderId of ws.borders) {
    try {
      await Neo4jErrorHelper.withTimeout(
        session.run(
          `MATCH (a:WorldSetting {id: $idA, projectId: $projectId, category: 'Geography'})
                     MATCH (b:WorldSetting {id: $idB, projectId: $projectId, category: 'Geography'})
                     // 创建双向关系
                     MERGE (a)-[r1:BORDERS]->(b)
                     MERGE (b)-[r2:BORDERS]->(a)
                     SET r1 += {createdAt: timestamp(), source: 'STRUCTURED_DATA'},
                         r2 += {createdAt: timestamp(), source: 'STRUCTURED_DATA'}`,
          {
            idA: ws.id,
            idB: borderId,
            projectId,
          }
        ),
        'create borders relationship'
      );
    } catch (err) {
      console.warn(`Failed to create BORDERS relationship for ${ws.title} <-> ${borderId}:`, err);
    }
  }
}
console.log(`✅ Synced WorldSetting BORDERS relationships for project ${projectId}`);
```

### 5.4 增强Character-WorldSetting关系同步

**修改位置**：`syncProjectToGraph()` 中的 Character-WorldSetting 关系部分

```typescript
// 3.5.2. Create Character-WorldSetting relationships (角色与设定关联)
for (const char of characters) {
  // 如果角色有 originLocation 字段，创建 ORIGINATED_FROM 关系
  if (char.originLocation) {
    try {
      await Neo4jErrorHelper.withTimeout(
        session.run(
          `MATCH (c:Character {id: $charId, projectId: $projectId})
                     MATCH (w:WorldSetting {id: $locId, projectId: $projectId})
                     MERGE (c)-[r:ORIGINATED_FROM]->(w)
                     SET r += {createdAt: timestamp(), source: 'STRUCTURED_DATA'}`,
          { charId: char.id, locId: char.originLocation, projectId }
        ),
        'create originated_from relationship'
      );
    } catch (err) {
      console.warn(`Failed to create ORIGINATED_FROM for ${char.name}:`, err);
    }
  }

  // 如果角色有 residence 字段，创建 RESIDES_IN 关系
  if (char.residence) {
    try {
      await Neo4jErrorHelper.withTimeout(
        session.run(
          `MATCH (c:Character {id: $charId, projectId: $projectId})
                     MATCH (w:WorldSetting {id: $resId, projectId: $projectId})
                     MERGE (c)-[r:RESIDES_IN]->(w)
                     SET r += {isCurrent: true, createdAt: timestamp(), source: 'STRUCTURED_DATA'}`,
          { charId: char.id, resId: char.residence, projectId }
        ),
        'create resides_in relationship'
      );
    } catch (err) {
      console.warn(`Failed to create RESIDES_IN for ${char.name}:`, err);
    }
  }

  // 如果角色有 controlledTerritories 字段，创建 CONTROLS_TERRITORY 关系
  if (char.controlledTerritories && char.controlledTerritories.length > 0) {
    for (const territoryId of char.controlledTerritories) {
      try {
        await Neo4jErrorHelper.withTimeout(
          session.run(
            `MATCH (c:Character {id: $charId, projectId: $projectId})
                         MATCH (w:WorldSetting {id: $territoryId, projectId: $projectId})
                         MERGE (c)-[r:CONTROLS_TERRITORY]->(w)
                         SET r += {createdAt: timestamp(), source: 'STRUCTURED_DATA'}`,
            { charId: char.id, territoryId, projectId }
          ),
          'create controls_territory relationship'
        );
      } catch (err) {
        console.warn(`Failed to create CONTROLS_TERRITORY for ${char.name}:`, err);
      }
    }
  }

  // 如果角色有 exiledFrom 字段，创建 EXILED_FROM 关系
  if (char.exiledFrom && char.exiledFrom.length > 0) {
    for (const exiledLocationId of char.exiledFrom) {
      try {
        await Neo4jErrorHelper.withTimeout(
          session.run(
            `MATCH (c:Character {id: $charId, projectId: $projectId})
                         MATCH (w:WorldSetting {id: $exiledLocationId, projectId: $projectId})
                         MERGE (c)-[r:EXILED_FROM]->(w)
                         SET r += {createdAt: timestamp(), source: 'STRUCTURED_DATA'}`,
            { charId: char.id, exiledLocationId, projectId }
          ),
          'create exiled_from relationship'
        );
      } catch (err) {
        console.warn(`Failed to create EXILED_FROM for ${char.name}:`, err);
      }
    }
  }
}
console.log(`✅ Synced Character-WorldSetting relationships for project ${projectId}`);
```

---

## 6. queries.ts实现方案

### 6.1 getWorldSettingHierarchy()

**功能**：获取WorldSetting的完整层级树

**输入参数**：

```typescript
interface GetWorldSettingHierarchyParams {
  projectId: string;
  rootId?: string; // 可选：指定根节点，不指定则返回所有根节点
  maxDepth?: number; // 最大深度，默认不限制
  includeProperties?: boolean; // 是否包含节点属性，默认true
}
```

**返回结构**：

```typescript
interface WorldSettingTreeNode {
  id: string;
  title: string;
  category: string;
  importance?: number;
  children?: WorldSettingTreeNode[];
  properties?: Record<string, any>;
}
```

**Cypher查询**：

```cypher
// 方案1: 使用递归CTE（Neo4j 4.4+）
MATCH (root:WorldSetting {projectId: $projectId})
WHERE (NOT exists((root)-[:PART_OF]->()) OR root.id = $rootId)
CALL {
    WITH root
    MATCH path = (root)-[:CONTAINS*0..10]->(child:WorldSetting)
    RETURN path
}
UNWIND path as p
RETURN nodes(p) as nodes, relationships(p) as rels
```

**TypeScript实现**：

```typescript
/**
 * 获取WorldSetting的完整层级树
 * @param projectId 项目ID
 * @param rootId 可选的根节点ID，不指定则返回所有根节点
 * @param maxDepth 最大深度，默认10
 * @returns 层级树结构
 */
export const getWorldSettingHierarchy = async (
  projectId: string,
  rootId?: string,
  maxDepth: number = 10
): Promise<WorldSettingTreeNode[]> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 1. 查询所有CONTAINS关系
    const result = await session.run(
      `MATCH (parent:WorldSetting {projectId: $projectId})-[r:CONTAINS]->(child:WorldSetting)
             RETURN parent.id as parentId, parent.title as parentTitle,
                    child.id as childId, child.title as childTitle,
                    child.category as category, child.importance as importance
             ORDER BY parent.importance DESC, child.importance DESC`,
      { projectId, maxDepth }
    );

    // 2. 构建树形结构
    const nodeMap = new Map<string, WorldSettingTreeNode>();
    const rootNodes: WorldSettingTreeNode[] = [];

    // 第一遍：创建所有节点
    result.records.forEach((record) => {
      const parentId = record.get('parentId');
      const childId = record.get('childId');

      if (!nodeMap.has(parentId)) {
        nodeMap.set(parentId, {
          id: parentId,
          title: record.get('parentTitle'),
          category: 'Unknown',
          children: [],
        });
      }

      if (!nodeMap.has(childId)) {
        nodeMap.set(childId, {
          id: childId,
          title: record.get('childTitle'),
          category: record.get('category'),
          importance: record.get('importance'),
          children: [],
        });
      }
    });

    // 第二遍：建立父子关系
    result.records.forEach((record) => {
      const parentId = record.get('parentId');
      const childId = record.get('childId');
      const parent = nodeMap.get(parentId);
      const child = nodeMap.get(childId);

      if (parent && child) {
        parent.children!.push(child);
      }
    });

    // 3. 找出根节点（没有PART_OF关系的节点）
    const allNodes = Array.from(nodeMap.values());
    const childIds = new Set(result.records.map((r) => r.get('childId')));

    allNodes.forEach((node) => {
      if (!childIds.has(node.id)) {
        rootNodes.push(node);
      }
    });

    // 4. 如果指定了rootId，只返回该根节点
    if (rootId) {
      const specificRoot = rootNodes.find((n) => n.id === rootId);
      return specificRoot ? [specificRoot] : [];
    }

    return rootNodes;
  } catch (error) {
    console.error('Failed to get WorldSetting hierarchy:', error);
    throw error;
  } finally {
    await session.close();
  }
};
```

### 6.2 getCharacterLocationContext()

**功能**：获取角色的完整地理位置上下文（包含层级链）

**输入参数**：

```typescript
interface GetCharacterLocationContextParams {
  projectId: string;
  characterId: string;
}
```

**返回结构**：

```typescript
interface CharacterLocationContext {
  characterId: string;
  characterName: string;
  origin?: {
    location: WorldSettingBasic;
    hierarchy: WorldSettingBasic[]; // 从当前位置到根的层级链
  };
  residence?: {
    location: WorldSettingBasic;
    hierarchy: WorldSettingBasic[];
    isCurrent: boolean;
  };
  controlledTerritories?: Array<{
    location: WorldSettingBasic;
    hierarchy: WorldSettingBasic[];
    controlType?: string;
  }>;
  exiledFrom?: Array<{
    location: WorldSettingBasic;
    hierarchy: WorldSettingBasic[];
    reason?: string;
  }>;
}

interface WorldSettingBasic {
  id: string;
  title: string;
  category: string;
  importance?: number;
}
```

**Cypher查询**：

```typescript
export const getCharacterLocationContext = async (
  projectId: string,
  characterId: string
): Promise<CharacterLocationContext | null> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 查询角色的所有位置关系
    const result = await session.run(
      `MATCH (c:Character {id: $characterId, projectId: $projectId})
             OPTIONAL MATCH (c)-[origin:ORIGINATED_FROM]->(originLoc:WorldSetting)
             OPTIONAL MATCH (c)-[res:RESIDES_IN]->(resLoc:WorldSetting)
             OPTIONAL MATCH (c)-[control:CONTROLS_TERRITORY]->(controlLoc:WorldSetting)
             OPTIONAL MATCH (c)-[exile:EXILED_FROM]->(exileLoc:WorldSetting)

             // 查询层级链
             OPTIONAL MATCH path = (originLoc)-[:PART_OF*0..10]->(originAncestor:WorldSetting)
             OPTIONAL MATCH path2 = (resLoc)-[:PART_OF*0..10]->(resAncestor:WorldSetting)
             OPTIONAL MATCH path3 = (controlLoc)-[:PART_OF*0..10]->(controlAncestor:WorldSetting)
             OPTIONAL MATCH path4 = (exileLoc)-[:PART_OF*0..10]->(exileAncestor:WorldSetting)

             RETURN c.name as characterName,
                    originLoc, collect(distinct originAncestor) as originAncestors,
                    resLoc, collect(distinct resAncestor) as resAncestors, res.isCurrent,
                    controlLoc, collect(distinct controlAncestor) as controlAncestors, control.controlType,
                    exileLoc, collect(distinct exileAncestor) as exileAncestors, exile.reason`,
      { characterId, projectId }
    );

    if (result.records.length === 0) {
      return null;
    }

    const record = result.records[0];
    const context: CharacterLocationContext = {
      characterId,
      characterName: record.get('characterName'),
    };

    // 处理起源地
    const originLoc = record.get('originLoc');
    if (originLoc) {
      context.origin = {
        location: nodeToBasic(originLoc),
        hierarchy: record.get('originAncestors').map(nodeToBasic),
      };
    }

    // 处理居住地
    const resLoc = record.get('resLoc');
    if (resLoc) {
      context.residence = {
        location: nodeToBasic(resLoc),
        hierarchy: record.get('resAncestors').map(nodeToBasic),
        isCurrent: record.get('res.isCurrent') || false,
      };
    }

    // 处理控制领地（可能有多个）
    const controlLocs = result.records
      .filter((r) => r.get('controlLoc'))
      .map((r) => ({
        location: nodeToBasic(r.get('controlLoc')),
        hierarchy: r.get('controlAncestors').map(nodeToBasic),
        controlType: r.get('control.controlType'),
      }));

    if (controlLocs.length > 0) {
      context.controlledTerritories = controlLocs;
    }

    // 处理流放地（可能有多个）
    const exileLocs = result.records
      .filter((r) => r.get('exileLoc'))
      .map((r) => ({
        location: nodeToBasic(r.get('exileLoc')),
        hierarchy: r.get('exileAncestors').map(nodeToBasic),
        reason: r.get('exile.reason'),
      }));

    if (exileLocs.length > 0) {
      context.exiledFrom = exileLocs;
    }

    return context;
  } catch (error) {
    console.error('Failed to get character location context:', error);
    throw error;
  } finally {
    await session.close();
  }
};

// 辅助函数：Neo4j节点转基本结构
function nodeToBasic(node: any): WorldSettingBasic {
  return {
    id: node.properties.id,
    title: node.properties.title,
    category: node.properties.category,
    importance: node.properties.importance,
  };
}
```

### 6.3 getLocationCharacters()

**功能**：获取某地点的所有关联角色

**输入参数**：

```typescript
interface GetLocationCharactersParams {
  projectId: string;
  locationId: string;
  includeDescendants?: boolean; // 是否包含子地点的角色
}
```

**返回结构**：

```typescript
interface LocationCharacterInfo {
  characterId: string;
  characterName: string;
  role: string;
  relationType: 'ORIGINATED_FROM' | 'RESIDES_IN' | 'CONTROLS_TERRITORY' | 'EXILED_FROM';
  relationProperties?: Record<string, any>;
}

interface LocationCharactersResult {
  locationId: string;
  locationTitle: string;
  characters: LocationCharacterInfo[];
  descendantLocations?: Array<{
    locationId: string;
    locationTitle: string;
    characters: LocationCharacterInfo[];
  }>;
}
```

**TypeScript实现**：

```typescript
export const getLocationCharacters = async (
  projectId: string,
  locationId: string,
  includeDescendants: boolean = false
): Promise<LocationCharactersResult> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 1. 查询当前地点的角色
    const currentResult = await session.run(
      `MATCH (loc:WorldSetting {id: $locationId, projectId: $projectId})
             OPTIONAL MATCH (c:Character)-[r:ORIGINATED_FROM|RESIDES_IN|CONTROLS_TERRITORY|EXILED_FROM]->(loc)
             RETURN loc.title as locationTitle,
                    collect(DISTINCT {
                        characterId: c.id,
                        characterName: c.name,
                        role: c.role,
                        relationType: type(r),
                        relationProperties: properties(r)
                    }) as characters`,
      { locationId, projectId }
    );

    if (currentResult.records.length === 0) {
      throw new Error(`Location ${locationId} not found`);
    }

    const record = currentResult.records[0];
    const result: LocationCharactersResult = {
      locationId,
      locationTitle: record.get('locationTitle'),
      characters: record.get('characters').filter((c: any) => c.characterId),
    };

    // 2. 如果需要，查询子地点的角色
    if (includeDescendants) {
      const descendantsResult = await session.run(
        `MATCH (parent:WorldSetting {id: $locationId, projectId: $projectId})
                 MATCH (parent)-[:CONTAINS*1..10]->(child:WorldSetting)
                 OPTIONAL MATCH (c:Character)-[r:ORIGINATED_FROM|RESIDES_IN|CONTROLS_TERRITORY|EXILED_FROM]->(child)
                 RETURN child.id as locationId, child.title as locationTitle,
                        collect(DISTINCT {
                            characterId: c.id,
                            characterName: c.name,
                            role: c.role,
                            relationType: type(r),
                            relationProperties: properties(r)
                        }) as characters`,
        { locationId, projectId }
      );

      result.descendantLocations = descendantsResult.records.map((r) => ({
        locationId: r.get('locationId'),
        locationTitle: r.get('locationTitle'),
        characters: r.get('characters').filter((c: any) => c.characterId),
      }));
    }

    return result;
  } catch (error) {
    console.error('Failed to get location characters:', error);
    throw error;
  } finally {
    await session.close();
  }
};
```

### 6.4 getTerritoryControl()

**功能**：获取领土控制关系网络

**输入参数**：

```typescript
interface GetTerritoryControlParams {
  projectId: string;
  locationId?: string; // 可选：指定地点，不指定则返回所有
  characterId?: string; // 可选：指定角色，不指定则返回所有
}
```

**返回结构**：

```typescript
interface TerritoryControlNode {
  type: 'Character' | 'WorldSetting';
  id: string;
  name: string;
  properties?: Record<string, any>;
}

interface TerritoryControlEdge {
  source: string;
  target: string;
  relationType: 'CONTROLS_TERRITORY';
  properties?: {
    controlType?: string;
    legitimacy?: number;
    since?: string;
  };
}

interface TerritoryControlResult {
  nodes: TerritoryControlNode[];
  edges: TerritoryControlEdge[];
}
```

**TypeScript实现**：

```typescript
export const getTerritoryControl = async (
  projectId: string,
  locationId?: string,
  characterId?: string
): Promise<TerritoryControlResult> => {
  const d = getDriver();
  const session = d.session();

  try {
    let query: string;
    let params: any = { projectId };

    if (characterId) {
      // 查询特定角色的控制领地
      query = `
                MATCH (c:Character {id: $characterId, projectId: $projectId})
                MATCH (c)-[r:CONTROLS_TERRITORY]->(w:WorldSetting)
                RETURN c, r, w
            `;
      params.characterId = characterId;
    } else if (locationId) {
      // 查询特定地点的控制者
      query = `
                MATCH (c:Character)-[r:CONTROLS_TERRITORY]->(w:WorldSetting {id: $locationId, projectId: $projectId})
                RETURN c, r, w
            `;
      params.locationId = locationId;
    } else {
      // 查询所有控制关系
      query = `
                MATCH (c:Character)-[r:CONTROLS_TERRITORY]->(w:WorldSetting {projectId: $projectId})
                RETURN c, r, w
            `;
    }

    const result = await session.run(query, params);

    const nodes: TerritoryControlNode[] = [];
    const edges: TerritoryControlEdge[] = [];
    const nodeIds = new Set<string>();

    result.records.forEach((record) => {
      const char = record.get('c');
      const world = record.get('w');
      const rel = record.get('r');

      // 添加角色节点（避免重复）
      if (!nodeIds.has(char.properties.id)) {
        nodes.push({
          type: 'Character',
          id: char.properties.id,
          name: char.properties.name,
          properties: {
            role: char.properties.role,
            archetype: char.properties.archetype,
          },
        });
        nodeIds.add(char.properties.id);
      }

      // 添加地点节点（避免重复）
      if (!nodeIds.has(world.properties.id)) {
        nodes.push({
          type: 'WorldSetting',
          id: world.properties.id,
          name: world.properties.title,
          properties: {
            category: world.properties.category,
            importance: world.properties.importance,
          },
        });
        nodeIds.add(world.properties.id);
      }

      // 添加边
      edges.push({
        source: char.properties.id,
        target: world.properties.id,
        relationType: 'CONTROLS_TERRITORY',
        properties: {
          controlType: rel.properties.controlType,
          legitimacy: rel.properties.legitimacy,
          since: rel.properties.since,
        },
      });
    });

    return { nodes, edges };
  } catch (error) {
    console.error('Failed to get territory control:', error);
    throw error;
  } finally {
    await session.close();
  }
};
```

---

## 7. 数据迁移策略

### 7.1 迁移步骤

#### 阶段1：Schema准备（不破坏现有功能）

```cypher
// 1. 添加新属性（可选字段，不影响现有数据）
MATCH (w:WorldSetting)
SET w.aliases = CASE WHEN w.aliases IS NULL THEN [] ELSE w.aliases END,
    w.borders = CASE WHEN w.borders IS NULL THEN [] ELSE w.borders END

// 2. 创建新索引
CREATE INDEX worldSettingImportanceIndex IF NOT EXISTS
FOR (w:WorldSetting)
ON (w.importance);

// 3. 创建全文索引（Neo4j 4.4+）
CALL db.index.fulltext.createNodeIndex(
  'worldSettingAliasIndex',
  ['WorldSetting'],
  ['aliases']
);
```

#### 阶段2：关系补充（幂等操作）

```cypher
// 为已有CONTAINS关系添加PART_OF逆关系
MATCH (parent:WorldSetting)-[r:CONTAINS]->(child:WorldSetting)
WHERE NOT exists((child)-[:PART_OF]->(parent))
CREATE (child)-[:PART_OF {createdAt: r.createdAt, source: r.source}]->(parent)
```

#### 阶段3：数据验证

```cypher
// 检查CONTAINS和PART_OF的一致性
MATCH (parent)-[:CONTAINS]->(child)
WHERE NOT exists((child)-[:PART_OF]->(parent))
RETURN parent.title, child.title as missing_part_of

// 检查孤立节点
MATCH (w:WorldSetting)
WHERE NOT exists((w)-[:PART_OF]->()) AND NOT exists((w)-[:CONTAINS]->())
RETURN w.title as isolated_world_setting
```

### 7.2 回滚策略

如果迁移失败，可以安全回滚：

```cypher
// 1. 删除新增的PART_OF关系
MATCH ()-[r:PART_OF]->()
DELETE r

// 2. 删除新增的BORDERS关系
MATCH ()-[r:BORDERS]-()
DELETE r

// 3. 移除新增属性
MATCH (w:WorldSetting)
REMOVE w.aliases, w.borders
```

---

## 8. 测试计划

### 8.1 单元测试

#### 8.1.1 sync.ts测试用例

```typescript
describe('WorldSetting Graph Sync', () => {
  test('should create WorldSetting node with aliases', async () => {
    const ws: WorldSetting = {
      id: 'ws-1',
      title: '帝都',
      category: 'Geography',
      content: '帝国的首都',
      aliases: ['皇城', '王都'],
      borders: ['ws-2', 'ws-3'],
    };

    await syncProjectToGraph(projectId, { worldSettings: [ws] });

    const node = await getNode('ws-1');
    expect(node.properties.aliases).toEqual(['皇城', '王都']);
  });

  test('should create CONTAINS and PART_OF relationships', async () => {
    const parent: WorldSetting = { id: 'ws-1', title: '王国', category: 'Geography', content: '' };
    const child: WorldSetting = {
      id: 'ws-2',
      title: '省份',
      category: 'Geography',
      content: '',
      parentId: 'ws-1',
    };

    await syncProjectToGraph(projectId, { worldSettings: [parent, child] });

    const contains = await getRelationship('ws-1', 'ws-2', 'CONTAINS');
    const partOf = await getRelationship('ws-2', 'ws-1', 'PART_OF');

    expect(contains).toBeDefined();
    expect(partOf).toBeDefined();
  });

  test('should create BORDERS relationships', async () => {
    const ws1: WorldSetting = {
      id: 'ws-1',
      title: '城市A',
      category: 'Geography',
      content: '',
      borders: ['ws-2'],
    };
    const ws2: WorldSetting = {
      id: 'ws-2',
      title: '城市B',
      category: 'Geography',
      content: '',
      borders: ['ws-1'],
    };

    await syncProjectToGraph(projectId, { worldSettings: [ws1, ws2] });

    const border1 = await getRelationship('ws-1', 'ws-2', 'BORDERS');
    const border2 = await getRelationship('ws-2', 'ws-1', 'BORDERS');

    expect(border1).toBeDefined();
    expect(border2).toBeDefined();
  });

  test('should create Character-WorldSetting relationships', async () => {
    const char: Character = {
      id: 'char-1',
      name: '张三',
      role: '主角',
      archetype: '英雄',
      description: '',
      originLocation: 'ws-1',
      residence: 'ws-2',
      controlledTerritories: ['ws-3'],
      exiledFrom: ['ws-4'],
    };

    const locations = ['ws-1', 'ws-2', 'ws-3', 'ws-4'].map((id) => ({
      id,
      title: `地点${id}`,
      category: 'Geography',
      content: '',
    }));

    await syncProjectToGraph(projectId, { characters: [char], worldSettings: locations });

    expect(await getRelationship('char-1', 'ws-1', 'ORIGINATED_FROM')).toBeDefined();
    expect(await getRelationship('char-1', 'ws-2', 'RESIDES_IN')).toBeDefined();
    expect(await getRelationship('char-1', 'ws-3', 'CONTROLS_TERRITORY')).toBeDefined();
    expect(await getRelationship('char-1', 'ws-4', 'EXILED_FROM')).toBeDefined();
  });
});
```

#### 8.1.2 queries.ts测试用例

```typescript
describe('WorldSetting Graph Queries', () => {
  beforeEach(async () => {
    // 准备测试数据
    await seedTestData();
  });

  test('getWorldSettingHierarchy should return correct tree', async () => {
    const hierarchy = await getWorldSettingHierarchy(projectId);

    expect(hierarchy).toHaveLength(1); // 1个根节点
    expect(hierarchy[0].title).toBe('王国');
    expect(hierarchy[0].children).toHaveLength(2); // 2个省份
  });

  test('getCharacterLocationContext should return full hierarchy', async () => {
    const context = await getCharacterLocationContext(projectId, 'char-1');

    expect(context?.origin?.hierarchy).toHaveLength(3); // 城市 -> 省份 -> 王国
    expect(context?.residence?.location.title).toBe('帝都');
  });

  test('getLocationCharacters should return all related characters', async () => {
    const result = await getLocationCharacters(projectId, 'ws-1', true);

    expect(result.characters).toContainEqual(
      expect.objectContaining({ characterName: '张三', relationType: 'ORIGINATED_FROM' })
    );
    expect(result.descendantLocations).toBeDefined();
  });

  test('getTerritoryControl should return control network', async () => {
    const network = await getTerritoryControl(projectId);

    expect(network.nodes).toHaveLength(5); // 2 characters + 3 locations
    expect(network.edges).toHaveLength(3); // 3 control relationships
  });
});
```

### 8.2 集成测试

#### 8.2.1 前端集成测试

```typescript
describe('WorldSetting UI Integration', () => {
    test('should display hierarchy tree in WorldPanel', async () => {
        render(<WorldPanel projectId={projectId} />);

        await waitFor(() => {
            expect(screen.getByText('王国')).toBeInTheDocument();
            expect(screen.getByText('省份A')).toBeInTheDocument();
        });
    });

    test('should show character location context in CharacterDetail', async () => {
        render(<CharacterDetail characterId="char-1" />);

        await waitFor(() => {
            expect(screen.getByText(/出生地：/)).toBeInTheDocument();
            expect(screen.getByText('帝都')).toBeInTheDocument();
        });
    });
});
```

### 8.3 性能测试

#### 8.3.1 查询性能基准

```typescript
describe('WorldSetting Performance', () => {
  test('getWorldSettingHierarchy should complete within 500ms', async () => {
    const start = Date.now();
    await getWorldSettingHierarchy(projectId);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500);
  });

  test('getCharacterLocationContext should complete within 200ms', async () => {
    const start = Date.now();
    await getCharacterLocationContext(projectId, 'char-1');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(200);
  });
});
```

---

## 9. 风险评估

### 9.1 技术风险

| 风险               | 影响 | 概率 | 缓解措施                                   |
| ------------------ | ---- | ---- | ------------------------------------------ |
| **数据迁移失败**   | 高   | 低   | 实施分阶段迁移，提供回滚脚本               |
| **查询性能下降**   | 中   | 中   | 添加索引，优化Cypher查询，使用查询计划分析 |
| **关系不一致**     | 中   | 低   | 实现双向关系验证，定期数据一致性检查       |
| **前端兼容性问题** | 低   | 中   | 保持旧API兼容，渐进式前端更新              |

### 9.2 业务风险

| 风险             | 影响 | 概率 | 缓解措施                 |
| ---------------- | ---- | ---- | ------------------------ |
| **用户体验中断** | 高   | 低   | 分阶段部署，保持向后兼容 |
| **数据丢失**     | 极高 | 极低 | 数据备份，事务性操作     |
| **性能退化**     | 中   | 中   | 性能监控，优化查询       |

### 9.3 应急预案

#### 场景1：迁移过程中断

**症状**：数据库连接断开，迁移脚本执行中断

**应急措施**：

1. 检查数据库连接状态
2. 执行数据一致性检查
3. 如果不一致，执行回滚脚本
4. 修复问题后重新迁移

#### 场景2：查询性能严重下降

**症状**：查询响应时间超过2秒

**应急措施**：

1. 检查索引是否创建成功
2. 使用`EXPLAIN`分析慢查询
3. 临时禁用复杂查询功能
4. 优化查询或添加缓存层

#### 场景3：关系数据不一致

**症状**：CONTAINS存在但PART_OF缺失

**应急措施**：

1. 执行一致性修复脚本
2. 记录不一致数据用于分析
3. 修复sync.ts中的关系创建逻辑

---

## 10. 实施时间表

### 10.1 开发阶段（预计2周）

| 任务                     | 工作量 | 负责人       | 开始日期 | 结束日期 |
| ------------------------ | ------ | ------------ | -------- | -------- |
| Schema设计与评审         | 2天    | Backend Lead | Day 1    | Day 2    |
| types.ts和schemas.ts更新 | 1天    | Backend Dev  | Day 3    | Day 3    |
| sync.ts增强实现          | 3天    | Backend Dev  | Day 4    | Day 6    |
| queries.ts查询函数实现   | 4天    | Backend Dev  | Day 7    | Day 10   |
| 单元测试编写             | 2天    | Backend Dev  | Day 11   | Day 12   |
| 集成测试与调试           | 2天    | Full Team    | Day 13   | Day 14   |

### 10.2 测试阶段（预计1周）

| 任务            | 工作量 | 负责人        | 开始日期 | 结束日期 |
| --------------- | ------ | ------------- | -------- | -------- |
| 数据迁移测试    | 2天    | Backend Dev   | Day 15   | Day 16   |
| 性能测试与优化  | 2天    | Backend Dev   | Day 17   | Day 18   |
| 前端集成测试    | 1天    | Frontend Dev  | Day 19   | Day 19   |
| UAT用户验收测试 | 2天    | Product Owner | Day 20   | Day 21   |

### 10.3 部署阶段（预计2天）

| 任务               | 工作量 | 负责人       | 开始日期 | 结束日期 |
| ------------------ | ------ | ------------ | -------- | -------- |
| 生产环境Schema迁移 | 1天    | DevOps       | Day 22   | Day 22   |
| 生产环境数据迁移   | 1天    | Backend Lead | Day 23   | Day 23   |
| 监控与验证         | 1天    | Full Team    | Day 24   | Day 24   |

---

## 11. 验收标准

### 11.1 功能验收标准

✅ **WorldSetting节点增强**：

- [ ] 支持aliases属性存储和查询
- [ ] 支持borders属性存储
- [ ] 全文索引支持别名搜索

✅ **层级关系**：

- [ ] CONTAINS关系正确创建
- [ ] PART_OF逆关系正确创建
- [ ] 层级树查询返回正确结构

✅ **地理关系**：

- [ ] BORDERS关系正确创建（双向）
- [ ] 仅Geography类型节点支持

✅ **角色-设定关联**：

- [ ] ORIGINATED_FROM关系正确创建
- [ ] RESIDES_IN关系正确创建
- [ ] CONTROLS_TERRITORY关系正确创建
- [ ] EXILED_FROM关系正确创建

✅ **查询功能**：

- [ ] getWorldSettingHierarchy返回完整层级树
- [ ] getCharacterLocationContext返回完整位置上下文
- [ ] getLocationCharacters返回所有关联角色
- [ ] getTerritoryControl返回控制网络

### 11.2 性能验收标准

- [ ] 层级树查询响应时间 < 500ms（1000节点以内）
- [ ] 角色位置上下文查询 < 200ms
- [ ] 地点角色查询 < 300ms
- [ ] 领土控制查询 < 400ms

### 11.3 质量验收标准

- [ ] 单元测试覆盖率 > 80%
- [ ] 所有测试用例通过
- [ ] 无严重Bug
- [ ] 代码通过Lint检查
- [ ] 数据迁移验证通过

---

## 12. 后续优化建议

### 12.1 短期优化（1-2个月）

1. **缓存层**：
   - 为频繁查询的层级树添加Redis缓存
   - 缓存TTL设置为5分钟

2. **查询优化**：
   - 使用`PROFILE`分析慢查询
   - 优化Cypher查询语句
   - 添加复合索引

3. **前端优化**：
   - 实现层级树虚拟滚动
   - 添加查询结果缓存

### 12.2 长期优化（3-6个月）

1. **AI增强**：
   - 实现自动提取WorldSetting关系
   - 基于图谱推荐相关设定

2. **可视化增强**：
   - 实现3D地图可视化
   - 添加关系演变动画

3. **高级分析**：
   - 实现地理影响力分析
   - 添加领土冲突预测

---

## 附录A：Cypher查询速查

### A.1 层级查询

```cypher
// 查询完整层级树
MATCH path = (root:WorldSetting {projectId: $projectId})-[:CONTAINS*0..10]->(child)
WHERE NOT exists((root)-[:PART_OF]->())
RETURN path

// 查询某节点的所有祖先
MATCH (child:WorldSetting {id: $id})-[:PART_OF*]->(ancestor:WorldSetting)
RETURN ancestor

// 查询某节点的所有后代
MATCH (parent:WorldSetting {id: $id})-[:CONTAINS*]->(descendant:WorldSetting)
RETURN descendant
```

### A.2 角色位置查询

```cypher
// 查询某地点的所有角色
MATCH (c:Character)-[r:ORIGINATED_FROM|RESIDES_IN|CONTROLS_TERRITORY|EXILED_FROM]->(w:WorldSetting {id: $id})
RETURN c, type(r) as relationType, properties(r) as relationProps

// 查询某角色的完整位置上下文
MATCH (c:Character {id: $id})-[r:ORIGINATED_FROM|RESIDES_IN]->(loc:WorldSetting)-[:PART_OF*]->(ancestor:WorldSetting)
RETURN loc, ancestor
```

### A.3 地理关系查询

```cypher
// 查询相邻地点
MATCH (a:WorldSetting {id: $id})-[:BORDERS]-(b:WorldSetting)
RETURN b

// 查询相邻地点的角色
MATCH (a:WorldSetting {id: $id})-[:BORDERS]-(b:WorldSetting)<-[r]-(c:Character)
RETURN b, c, type(r) as relationType
```

---

## 附录B：错误处理指南

### B.1 常见错误及处理

| 错误代码 | 错误信息                      | 原因                  | 解决方案                       |
| -------- | ----------------------------- | --------------------- | ------------------------------ |
| `WS001`  | WorldSetting not found        | 节点不存在            | 检查ID是否正确，确保节点已同步 |
| `WS002`  | Invalid parentId              | 父节点不存在          | 验证parentId，确保父节点已创建 |
| `WS003`  | Circular dependency detected  | 循环依赖              | 检查层级关系，避免A→B→A        |
| `WS004`  | Geography constraint violated | 非地理节点使用BORDERS | 仅Geography类型支持BORDERS     |
| `WS005`  | Relationship already exists   | 关系已存在            | 使用MERGE而非CREATE            |

### B.2 错误处理代码示例

```typescript
try {
  await getWorldSettingHierarchy(projectId);
} catch (error) {
  if (error.code === 'WS001') {
    // 节点不存在，触发同步
    await syncProjectToGraph(projectId, projectData);
    // 重试查询
    return await getWorldSettingHierarchy(projectId);
  } else if (error.code === 'WS003') {
    // 循环依赖，记录并通知用户
    logger.error('Circular dependency in WorldSetting hierarchy', { projectId });
    throw new UserFacingError('世界设定存在循环依赖，请检查层级关系');
  } else {
    // 未知错误，向上抛出
    throw error;
  }
}
```

---

**文档结束**

**下一步行动**：

1. 团队评审本设计文档
2. 确认实施时间表
3. 开始Schema设计与评审
4. 进入开发阶段
