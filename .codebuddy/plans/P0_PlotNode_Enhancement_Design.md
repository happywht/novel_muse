# PlotNode 模块图谱化增强详细技术方案

**文档版本**: v1.0
**创建日期**: 2026-03-21
**设计负责人**: Backend Technical Lead
**优先级**: P0 (高优先级)

---

## 目录

1. [背景与目标](#一背景与目标)
2. [冲突场景图谱化设计](#二冲突场景图谱化设计)
3. [情节依赖关系设计](#三情节依赖关系设计)
4. [查询 API 设计](#四查询-api-设计)
5. [前端可视化设计](#五前端可视化设计)
6. [与 Character 模块联动](#六与-character-模块联动)
7. [实施步骤清单](#七实施步骤清单)
8. [风险评估与缓解](#八风险评估与缓解)

---

## 一、背景与目标

### 1.1 当前状态分析

**现有 PlotNode 结构** (`types.ts:65-81`):

```typescript
export interface PlotNode {
  id: string;
  title: string;
  content: string;
  order: number;
  beatTag?: BeatTag;
  relatedCharacters?: string[];
  relatedLocations?: string[];
  relatedChapters?: string[];
  conflictScenario?: {
    type: ConflictType;
    participants: string[];
    stakes: string;
    intensity: number;
  };
}
```

**现有图谱同步** (`server/src/services/graph/sync.ts:309-406`):
- PlotNode 节点已创建
- INVOLVES 关系已建立 (PlotNode -> Character)
- LOCATED_IN 关系已建立 (PlotNode -> WorldSetting)
- PRECEDES 关系已建立 (PlotNode -> PlotNode)
- HAS_CONFLICT_PARTICIPANT 关系已建立

**当前问题**:
1. `conflictScenario` 作为 PlotNode 的内嵌字段，无法独立查询和管理
2. 缺乏情节之间的多样化依赖关系（仅 PRECEDES）
3. 冲突解决建议、依赖链分析等高级查询未实现
4. 前端可视化能力有限

### 1.2 设计目标

| 目标 | 描述 | 优先级 |
|------|------|--------|
| 独立冲突节点 | 将 conflictScenario 提升为独立 Conflict 节点 | P0 |
| 依赖关系增强 | 新增 CAUSES, ENABLES, BLOCKS 等关系类型 | P0 |
| 高级查询 API | 实现依赖链、冲突建议、高强度冲突等查询 | P0 |
| 可视化增强 | 冲突热力图、依赖关系图、参与者网络图 | P1 |
| 模块联动 | 与 Character 模块深度整合 | P1 |

---

## 二、冲突场景图谱化设计

### 2.1 冲突场景字段分析

**现有 conflictScenario 字段**:

```typescript
conflictScenario?: {
  type: ConflictType;        // 'CONFRONTATION' | 'CLIMAX' | 'TWIST' | null
  participants: string[];    // 参与角色ID数组
  stakes: string;            // 赌注/冲突核心
  intensity: number;         // 1-10强度等级
}
```

**扩展字段建议**:

```typescript
interface ConflictScenario {
  id: string;                      // 冲突唯一ID
  type: ConflictType;              // 冲突类型
  participants: string[];          // 参与角色ID
  stakes: string;                  // 赌注
  intensity: number;               // 强度 1-10

  // 扩展字段
  status: 'PENDING' | 'ACTIVE' | 'RESOLVED' | 'ABANDONED';  // 冲突状态
  resolution?: string;             // 解决方式描述
  triggeredAt?: string;            // 触发时间（故事内时间）
  resolvedAt?: string;             // 解决时间
  relatedConflicts?: string[];     // 关联冲突ID
  tags?: string[];                 // 冲突标签
  emotionalImpact?: number;        // 情感影响度 1-10
  narrativeWeight?: number;        // 叙事权重 1-10
}
```

### 2.2 独立 Conflict 节点方案

#### 2.2.1 节点定义

```cypher
// Conflict 节点 Schema
CREATE (c:Conflict {
  id: String,                      // 唯一标识
  projectId: String,               // 项目ID
  title: String,                   // 冲突标题
  type: String,                    // CONFRONTATION | CLIMAX | TWIST
  stakes: String,                  // 冲突核心/赌注
  intensity: Integer,              // 1-10
  status: String,                  // PENDING | ACTIVE | RESOLVED | ABANDONED
  resolution: String,              // 解决方式
  emotionalImpact: Integer,        // 1-10
  narrativeWeight: Integer,        // 1-10
  tags: List<String>,              // 冲突标签
  createdAt: Integer,              // 创建时间戳
  updatedAt: Integer               // 更新时间戳
})
```

#### 2.2.2 关系定义

```cypher
// 冲突与情节节点的关系
(pn:PlotNode)-[:HAS_CONFLICT]->(c:Conflict)

// 冲突与参与角色的关系（带属性）
(c:Conflict)-[r:INVOLVES_PARTICIPANT]->(char:Character)
  r.role: String,                  // 参与者角色（主角/反派/调解者）
  r.motivation: String,            // 参与动机
  r.outcome: String,               // 参与结果
  r.sidesWith: String              // 站队（如适用）

// 冲突之间的关联
(c1:Conflict)-[:TRIGGERS]->(c2:Conflict)
(c1:Conflict)-[:RESOLVES]->(c2:Conflict)
(c1:Conflict)-[:ESCALATES]->(c2:Conflict)

// 冲突与地点的关系
(c:Conflict)-[:OCCURS_AT]->(w:WorldSetting)

// 冲突与章节的关系
(ch:Chapter)-[:CONTAINS_CONFLICT]->(c:Conflict)
```

### 2.3 冲突-角色关系设计

#### 2.3.1 角色在冲突中的参与模式

```
┌─────────────────────────────────────────────────────────────┐
│                    Conflict Node                             │
│  {id, type: "CONFRONTATION", intensity: 8, stakes: "王位"}  │
└─────────────────────────────────────────────────────────────┘
           │                    │                    │
           │ INVOLVES_PARTICIPANT                   │
           │ {role: "PROTAGONIST"}                  │ {role: "ANTAGONIST"}
           ▼                    ▼                    ▼
    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
    │  Character   │    │  Character   │    │  Character   │
    │  "林远"      │    │  "芈岚"      │    │  "屈氏"      │
    │  {side: A}   │    │  {side: A}   │    │  {side: B}   │
    └──────────────┘    └──────────────┘    └──────────────┘
```

#### 2.3.2 冲突期间的角色关系变化

```cypher
// 冲突期间角色关系变化追踪
(char1:Character)-[r:RELATION_DURING_CONFLICT]->(char2:Character)
  r.conflictId: String,            // 关联冲突ID
  r.beforeState: String,           // 冲突前关系状态
  r.duringState: String,           // 冲突期间关系状态
  r.afterState: String,            // 冲突后关系状态
  r.changeReason: String           // 变化原因
```

### 2.4 数据迁移方案

#### 2.4.1 迁移脚本

```typescript
// server/src/migrations/extractConflictNodes.ts

import { getDriver } from '../services/graph/client';

/**
 * 从现有 PlotNode.conflictScenario 提取独立 Conflict 节点
 */
export async function migrateConflictNodes(projectId: string): Promise<void> {
    const driver = getDriver();
    const session = driver.session();

    try {
        // 1. 查找所有包含 conflictScenario 的 PlotNode
        const result = await session.run(
            `MATCH (pn:PlotNode {projectId: $projectId})
             WHERE pn.conflictScenario IS NOT NULL
             RETURN pn.id as plotNodeId, pn.conflictScenario as conflict`,
            { projectId }
        );

        for (const record of result.records) {
            const plotNodeId = record.get('plotNodeId');
            const conflict = record.get('conflict');

            // 2. 创建独立 Conflict 节点
            const conflictId = `conflict_${plotNodeId}`;
            await session.run(
                `CREATE (c:Conflict {
                    id: $conflictId,
                    projectId: $projectId,
                    title: $title,
                    type: $type,
                    stakes: $stakes,
                    intensity: $intensity,
                    status: 'ACTIVE',
                    createdAt: timestamp()
                })
                WITH c
                MATCH (pn:PlotNode {id: $plotNodeId})
                CREATE (pn)-[:HAS_CONFLICT]->(c)
                WITH c
                UNWIND $participants as participantId
                MATCH (char:Character {id: participantId, projectId: $projectId})
                CREATE (c)-[:INVOLVES_PARTICIPANT {role: 'PARTICIPANT'}]->(char)`,
                {
                    conflictId,
                    projectId,
                    plotNodeId,
                    title: `冲突: ${conflict.type || '未知类型'}`,
                    type: conflict.type || 'CONFRONTATION',
                    stakes: conflict.stakes || '',
                    intensity: conflict.intensity || 5,
                    participants: conflict.participants || []
                }
            );
        }

        console.log(`Migrated ${result.records.length} conflict nodes for project ${projectId}`);
    } finally {
        await session.close();
    }
}
```

---

## 三、情节依赖关系设计

### 3.1 情节因果关系分析

**当前依赖关系**: 仅 `PRECEDES`（时序关系）

**需要补充的因果关系**:

| 关系类型 | 含义 | 示例 |
|----------|------|------|
| `CAUSES` | A 直接导致 B | 谋杀导致调查 |
| `ENABLES` | A 为 B 创造条件 | 获得钥匙允许开门 |
| `BLOCKS` | A 阻碍 B | 误会阻止合作 |
| `TRIGGERS` | A 触发 B 的发生 | 爆发触发战争 |
| `RESOLVES` | A 解决 B | 和谈解决冲突 |
| `FORESHADOWS` | A 伏笔预示 B | 早期线索预示反转 |
| `CALLBACK_TO` | A 回应 B | 后期事件回应早期伏笔 |

### 3.2 PRECEDES 关系增强

#### 3.2.1 添加关系属性

```cypher
// 增强的 PRECEDES 关系
(pn1:PlotNode)-[r:PRECEDES]->(pn2:PlotNode)
  r.temporalGap: Integer,          // 时间间隔（故事内时间单位）
  r.isImmediate: Boolean,          // 是否紧邻
  r.transitionType: String,        // 过渡类型（时间跳跃/场景切换/连续）
  r.narrativeBridge: String        // 叙事桥接描述
```

#### 3.2.2 Cypher 实现

```cypher
// 创建带属性的 PRECEDES 关系
MATCH (a:PlotNode {id: $idA, projectId: $projectId})
MATCH (b:PlotNode {id: $idB, projectId: $projectId})
MERGE (a)-[r:PRECEDES]->(b)
SET r.temporalGap = $temporalGap,
    r.isImmediate = $isImmediate,
    r.transitionType = $transitionType,
    r.narrativeBridge = $narrativeBridge
```

### 3.3 新依赖关系类型

#### 3.3.1 关系类型定义

```typescript
// types.ts 扩展

export type PlotDependencyType =
  | 'PRECEDES'      // 时序前驱
  | 'CAUSES'        // 因果导致
  | 'ENABLES'       // 条件允许
  | 'BLOCKS'        // 阻碍
  | 'TRIGGERS'      // 触发
  | 'RESOLVES'      // 解决
  | 'FORESHADOWS'   // 伏笔
  | 'CALLBACK_TO';  // 回应

export interface PlotDependency {
  sourceId: string;
  targetId: string;
  type: PlotDependencyType;
  description?: string;
  strength?: number;           // 依赖强度 1-10
  isOptional?: boolean;        // 是否可选依赖
  condition?: string;          // 触发条件
}
```

#### 3.3.2 图谱关系创建

```cypher
// 通用情节依赖关系创建
MATCH (source:PlotNode {id: $sourceId, projectId: $projectId})
MATCH (target:PlotNode {id: $targetId, projectId: $projectId})
MERGE (source)-[r:CAUSES]->(target)  // 可替换为其他类型
SET r.description = $description,
    r.strength = $strength,
    r.isOptional = $isOptional,
    r.condition = $condition,
    r.createdAt = timestamp()
```

### 3.4 依赖链分析

#### 3.4.1 依赖链查询

```cypher
// 获取情节的完整依赖链（深度可达）
MATCH path = (start:PlotNode {id: $plotNodeId, projectId: $projectId})
             -[:CAUSES|ENABLES|TRIGGERS*1..10]->
             (end:PlotNode {projectId: $projectId})
RETURN [node in nodes(path) | {id: node.id, title: node.title}] as chain,
       [rel in relationships(path) | {
           type: type(rel),
           description: rel.description,
           strength: rel.strength
       }] as dependencies
ORDER BY length(path)
```

#### 3.4.2 关键路径分析

```cypher
// 找出影响目标情节的关键路径（高强度依赖链）
MATCH path = (start:PlotNode {projectId: $projectId})
             -[:CAUSES|ENABLES|TRIGGERS*1..10]->
             (target:PlotNode {id: $targetId, projectId: $projectId})
WITH path, reduce(total = 0, rel in relationships(path) | total + coalesce(rel.strength, 5)) as totalStrength
ORDER BY totalStrength DESC
LIMIT 5
RETURN [node in nodes(path) | node.title] as criticalPath,
       totalStrength
```

---

## 四、查询 API 设计

### 4.1 getPlotDependencies() - 获取情节依赖

#### 4.1.1 API 定义

```typescript
// server/src/services/graph/queries.ts

export interface PlotDependencyResult {
  nodeId: string;
  nodeTitle: string;
  dependencies: {
    direction: 'INCOMING' | 'OUTGOING';
    type: PlotDependencyType;
    relatedNode: {
      id: string;
      title: string;
    };
    description?: string;
    strength?: number;
  }[];
}

/**
 * 获取情节节点的所有依赖关系
 * @param projectId 项目ID
 * @param plotNodeId 情节节点ID
 * @param depth 查询深度（默认3）
 * @param includeTypes 包含的关系类型（可选）
 */
export const getPlotDependencies = async (
  projectId: string,
  plotNodeId: string,
  depth: number = 3,
  includeTypes?: PlotDependencyType[]
): Promise<PlotDependencyResult> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 构建关系类型过滤
    const relTypes = includeTypes
      ? includeTypes.join('|')
      : 'PRECEDES|CAUSES|ENABLES|BLOCKS|TRIGGERS|RESOLVES|FORESHADOWS|CALLBACK_TO';

    // 查询入向依赖
    const incomingResult = await session.run(
      `MATCH (source:PlotNode {projectId: $projectId})
       -[r:${relTypes}*1..${depth}]->
       (target:PlotNode {id: $plotNodeId, projectId: $projectId})
       RETURN source.id as sourceId,
              source.title as sourceTitle,
              type(last(r)) as relType,
              last(r).description as description,
              last(r).strength as strength`,
      { projectId, plotNodeId }
    );

    // 查询出向依赖
    const outgoingResult = await session.run(
      `MATCH (source:PlotNode {id: $plotNodeId, projectId: $projectId})
       -[r:${relTypes}*1..${depth}]->
       (target:PlotNode {projectId: $projectId})
       RETURN target.id as targetId,
              target.title as targetTitle,
              type(last(r)) as relType,
              last(r).description as description,
              last(r).strength as strength`,
      { projectId, plotNodeId }
    );

    // 获取节点基本信息
    const nodeResult = await session.run(
      `MATCH (pn:PlotNode {id: $plotNodeId, projectId: $projectId})
       RETURN pn.id as id, pn.title as title`,
      { projectId, plotNodeId }
    );

    if (nodeResult.records.length === 0) {
      throw new Error(`PlotNode ${plotNodeId} not found`);
    }

    return {
      nodeId: nodeResult.records[0].get('id'),
      nodeTitle: nodeResult.records[0].get('title'),
      dependencies: [
        ...incomingResult.records.map(r => ({
          direction: 'INCOMING' as const,
          type: r.get('relType') as PlotDependencyType,
          relatedNode: {
            id: r.get('sourceId'),
            title: r.get('sourceTitle')
          },
          description: r.get('description'),
          strength: r.get('strength')?.toNumber()
        })),
        ...outgoingResult.records.map(r => ({
          direction: 'OUTGOING' as const,
          type: r.get('relType') as PlotDependencyType,
          relatedNode: {
            id: r.get('targetId'),
            title: r.get('targetTitle')
          },
          description: r.get('description'),
          strength: r.get('strength')?.toNumber()
        }))
      ]
    };
  } finally {
    await session.close();
  }
};
```

### 4.2 getConflictResolutionSuggestions() - 冲突解决建议

#### 4.2.1 API 定义

```typescript
// server/src/services/graph/queries.ts

export interface ConflictResolutionSuggestion {
  conflictId: string;
  conflictTitle: string;
  suggestions: {
    type: 'COMPROMISE' | 'VICTORY' | 'ESCALATION' | 'DEATH' | 'RECONCILIATION' | 'EXTERNAL';
    description: string;
    impactAnalysis: {
      affectedCharacters: string[];
      narrativeImpact: string;
      recommendedFollowingPlot: string;
    };
    probability: number;  // 0-1
    narrativeCost: number; // 1-10
  }[];
}

/**
 * 获取冲突解决建议
 * 基于冲突参与者关系、历史冲突模式、叙事结构生成建议
 */
export const getConflictResolutionSuggestions = async (
  projectId: string,
  conflictId: string
): Promise<ConflictResolutionSuggestion> => {
  const d = getDriver();
  const session = d.session();

  try {
    // 1. 获取冲突基本信息
    const conflictResult = await session.run(
      `MATCH (c:Conflict {id: $conflictId, projectId: $projectId})
       RETURN c.id as id, c.title as title, c.type as type,
              c.stakes as stakes, c.intensity as intensity`,
      { projectId, conflictId }
    );

    if (conflictResult.records.length === 0) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    const conflict = conflictResult.records[0];

    // 2. 获取参与者及其关系网络
    const participantsResult = await session.run(
      `MATCH (c:Conflict {id: $conflictId, projectId: $projectId})
       -[r:INVOLVES_PARTICIPANT]->(char:Character)
       OPTIONAL MATCH (char)-[rel]-(other:Character)
       WHERE type(rel) IN ['ENEMY_OF', 'ALLY_OF', 'LOVES', 'KIN_OF']
       RETURN char.id as charId, char.name as charName, r.role as role,
              collect({type: type(rel), other: other.name}) as relationships`,
      { projectId, conflictId }
    );

    // 3. 分析参与者关系模式
    const participants = participantsResult.records.map(r => ({
      id: r.get('charId'),
      name: r.get('charName'),
      role: r.get('role'),
      relationships: r.get('relationships')
    }));

    // 4. 生成解决建议（基于关系模式分析）
    const suggestions = generateResolutionSuggestions(participants, {
      type: conflict.get('type'),
      stakes: conflict.get('stakes'),
      intensity: conflict.get('intensity')?.toNumber() || 5
    });

    return {
      conflictId: conflict.get('id'),
      conflictTitle: conflict.get('title'),
      suggestions
    };
  } finally {
    await session.close();
  }
};

/**
 * 基于关系模式生成解决建议
 */
function generateResolutionSuggestions(
  participants: any[],
  conflict: { type: string; stakes: string; intensity: number }
): ConflictResolutionSuggestion['suggestions'] {
  const suggestions: ConflictResolutionSuggestion['suggestions'] = [];

  // 分析参与者之间的敌对/盟友关系
  const hasEnemyRelation = participants.some(p =>
    p.relationships.some((r: any) => r.type === 'ENEMY_OF')
  );
  const hasKinRelation = participants.some(p =>
    p.relationships.some((r: any) => r.type === 'KIN_OF')
  );
  const hasLoveRelation = participants.some(p =>
    p.relationships.some((r: any) => r.type === 'LOVES')
  );

  // 基于关系模式生成建议
  if (hasKinRelation) {
    suggestions.push({
      type: 'RECONCILIATION',
      description: '基于血缘关系，双方可能通过家庭调解实现和解',
      impactAnalysis: {
        affectedCharacters: participants.map(p => p.name),
        narrativeImpact: '情感深度增加，为后续家庭剧情铺垫',
        recommendedFollowingPlot: '安排家庭聚会或回忆场景'
      },
      probability: 0.7,
      narrativeCost: 3
    });
  }

  if (hasLoveRelation && conflict.intensity < 8) {
    suggestions.push({
      type: 'COMPROMISE',
      description: '基于感情纽带，双方可能选择各退一步',
      impactAnalysis: {
        affectedCharacters: participants.map(p => p.name),
        narrativeImpact: '关系得到修复，为感情发展创造空间',
        recommendedFollowingPlot: '安排私下对话或表白场景'
      },
      probability: 0.6,
      narrativeCost: 4
    });
  }

  if (hasEnemyRelation) {
    suggestions.push({
      type: 'VICTORY',
      description: '通过正面对抗决出胜负',
      impactAnalysis: {
        affectedCharacters: participants.map(p => p.name),
        narrativeImpact: '明确力量对比，推动主线发展',
        recommendedFollowingPlot: '安排决战或关键对峙场景'
      },
      probability: 0.5,
      narrativeCost: 7
    });

    suggestions.push({
      type: 'ESCALATION',
      description: '冲突升级，卷入更多势力',
      impactAnalysis: {
        affectedCharacters: participants.map(p => p.name),
        narrativeImpact: '扩大冲突规模，增加故事张力',
        recommendedFollowingPlot: '引入第三方势力或更大危机'
      },
      probability: 0.4,
      narrativeCost: 8
    });
  }

  // 外部干预选项
  suggestions.push({
    type: 'EXTERNAL',
    description: '外部事件或第三方介入改变冲突走向',
    impactAnalysis: {
      affectedCharacters: participants.map(p => p.name),
      narrativeImpact: '引入意外因素，增加故事不可预测性',
      recommendedFollowingPlot: '设计外部危机或新角色登场'
    },
    probability: 0.3,
    narrativeCost: 5
  });

  return suggestions.sort((a, b) => b.probability - a.probability);
}
```

### 4.3 getHighIntensityConflicts() - 增强版

#### 4.3.1 增强功能

```typescript
// server/src/services/graph/queries.ts

export interface HighIntensityConflictResult {
  conflict: {
    id: string;
    title: string;
    type: string;
    intensity: number;
    stakes: string;
    status: string;
  };
  plotNode: {
    id: string;
    title: string;
    order: number;
  };
  participants: {
    id: string;
    name: string;
    role: string;
    faction?: string;  // 所属阵营
  }[];
  relatedConflicts: {
    id: string;
    title: string;
    relationship: 'TRIGGERS' | 'ESCALATES' | 'RESOLVES';
  }[];
  narrativeContext: {
    precedingPlot: string[];
    followingPlot: string[];
    chaptersInvolved: string[];
  };
}

/**
 * 增强版高强度冲突查询
 * @param projectId 项目ID
 * @param minIntensity 最低强度阈值（默认7）
 * @param includeResolved 是否包含已解决的冲突
 */
export const getHighIntensityConflictsEnhanced = async (
  projectId: string,
  minIntensity: number = 7,
  includeResolved: boolean = false
): Promise<HighIntensityConflictResult[]> => {
  const d = getDriver();
  const session = d.session();

  try {
    const statusFilter = includeResolved
      ? ''
      : 'AND c.status IN ["PENDING", "ACTIVE"]';

    const result = await session.run(
      `MATCH (pn:PlotNode {projectId: $projectId})-[:HAS_CONFLICT]->(c:Conflict)
       WHERE c.intensity >= $minIntensity ${statusFilter}

       // 获取参与者信息
       OPTIONAL MATCH (c)-[part:INVOLVES_PARTICIPANT]->(char:Character)

       // 获取关联冲突
       OPTIONAL MATCH (c)-[rel:TRIGGERS|ESCALATES|RESOLVES]-(related:Conflict)

       // 获取前后情节
       OPTIONAL MATCH (prev:PlotNode)-[:PRECEDES]->(pn)
       OPTIONAL MATCH (pn)-[:PRECEDES]->(next:PlotNode)

       // 获取关联章节
       OPTIONAL MATCH (ch:Chapter)-[:CONTAINS_CONFLICT]->(c)

       WITH c, pn,
            collect(DISTINCT {
              id: char.id,
              name: char.name,
              role: part.role
            }) as participants,
            collect(DISTINCT {
              id: related.id,
              title: related.title,
              relationship: type(rel)
            }) as relatedConflicts,
            collect(DISTINCT prev.title) as precedingPlot,
            collect(DISTINCT next.title) as followingPlot,
            collect(DISTINCT ch.title) as chaptersInvolved

       RETURN c.id as conflictId, c.title as conflictTitle,
              c.type as conflictType, c.intensity as intensity,
              c.stakes as stakes, c.status as status,
              pn.id as plotNodeId, pn.title as plotNodeTitle, pn.order as plotNodeOrder,
              participants, relatedConflicts,
              precedingPlot, followingPlot, chaptersInvolved

       ORDER BY c.intensity DESC`,
      { projectId, minIntensity }
    );

    return result.records.map(record => ({
      conflict: {
        id: record.get('conflictId'),
        title: record.get('conflictTitle'),
        type: record.get('conflictType'),
        intensity: record.get('intensity')?.toNumber() || 0,
        stakes: record.get('stakes'),
        status: record.get('status')
      },
      plotNode: {
        id: record.get('plotNodeId'),
        title: record.get('plotNodeTitle'),
        order: record.get('plotNodeOrder')?.toNumber() || 0
      },
      participants: record.get('participants').filter((p: any) => p.id),
      relatedConflicts: record.get('relatedConflicts').filter((r: any) => r.id),
      narrativeContext: {
        precedingPlot: record.get('precedingPlot'),
        followingPlot: record.get('followingPlot'),
        chaptersInvolved: record.get('chaptersInvolved')
      }
    }));
  } finally {
    await session.close();
  }
};
```

---

## 五、前端可视化设计

### 5.1 冲突强度热力图

#### 5.1.1 组件设计

```tsx
// components/PlotWeaver/ConflictHeatmap.tsx

import React, { useMemo } from 'react';
import { PlotNode } from '../../types';

interface ConflictHeatmapProps {
  plotNodes: PlotNode[];
  onNodeClick?: (nodeId: string) => void;
}

export const ConflictHeatmap: React.FC<ConflictHeatmapProps> = ({
  plotNodes,
  onNodeClick
}) => {
  // 计算热力图数据
  const heatmapData = useMemo(() => {
    return plotNodes.map(node => ({
      id: node.id,
      title: node.title,
      order: node.order,
      intensity: node.conflictScenario?.intensity || 0,
      type: node.conflictScenario?.type || null,
      participants: node.conflictScenario?.participants?.length || 0
    }));
  }, [plotNodes]);

  // 获取颜色映射
  const getIntensityColor = (intensity: number): string => {
    if (intensity === 0) return 'bg-slate-800';
    if (intensity <= 3) return 'bg-blue-500/60';
    if (intensity <= 5) return 'bg-yellow-500/60';
    if (intensity <= 7) return 'bg-orange-500/60';
    return 'bg-red-500/60';
  };

  // 获取冲突类型图标
  const getTypeIcon = (type: string | null): string => {
    switch (type) {
      case 'CONFRONTATION': return '⚔️';
      case 'CLIMAX': return '🔥';
      case 'TWIST': return '🔄';
      default: return '○';
    }
  };

  return (
    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
      <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
        <span className="text-red-400">🔥</span> 冲突强度热力图
      </h3>

      {/* 图例 */}
      <div className="flex gap-2 mb-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-500/60"></span> 低 (1-3)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-500/60"></span> 中 (4-5)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-orange-500/60"></span> 高 (6-7)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500/60"></span> 极高 (8-10)
        </span>
      </div>

      {/* 热力图网格 */}
      <div className="grid grid-cols-10 gap-1">
        {heatmapData.map((node) => (
          <div
            key={node.id}
            onClick={() => onNodeClick?.(node.id)}
            className={`
              aspect-square rounded cursor-pointer transition-all
              ${getIntensityColor(node.intensity)}
              hover:ring-2 hover:ring-muse-400
              flex items-center justify-center text-xs
            `}
            title={`${node.title}\n强度: ${node.intensity}\n参与者: ${node.participants}`}
          >
            {getTypeIcon(node.type)}
          </div>
        ))}
      </div>

      {/* 统计信息 */}
      <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-3 gap-4 text-xs text-slate-400">
        <div>
          <span className="block text-slate-500">总冲突数</span>
          <span className="text-lg font-bold text-white">
            {heatmapData.filter(d => d.intensity > 0).length}
          </span>
        </div>
        <div>
          <span className="block text-slate-500">平均强度</span>
          <span className="text-lg font-bold text-white">
            {(heatmapData.reduce((sum, d) => sum + d.intensity, 0) / heatmapData.length).toFixed(1)}
          </span>
        </div>
        <div>
          <span className="block text-slate-500">高风险冲突</span>
          <span className="text-lg font-bold text-red-400">
            {heatmapData.filter(d => d.intensity >= 7).length}
          </span>
        </div>
      </div>
    </div>
  );
};
```

### 5.2 情节依赖关系图

#### 5.2.1 组件设计

```tsx
// components/PlotWeaver/DependencyGraph.tsx

import React, { useEffect, useRef, useState } from 'react';
import { ForceGraph2D } from 'react-force-graph';
import { PlotNode } from '../../types';

interface DependencyGraphProps {
  plotNodes: PlotNode[];
  dependencies: Array<{
    source: string;
    target: string;
    type: string;
    strength?: number;
  }>;
  onNodeClick?: (nodeId: string) => void;
}

interface GraphNode {
  id: string;
  name: string;
  order: number;
  hasConflict: boolean;
}

interface GraphLink {
  source: string;
  target: string;
  type: string;
  strength: number;
}

export const DependencyGraph: React.FC<DependencyGraphProps> = ({
  plotNodes,
  dependencies,
  onNodeClick
}) => {
  const graphRef = useRef<any>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // 构建图数据
  const graphData = {
    nodes: plotNodes.map(node => ({
      id: node.id,
      name: node.title || `情节 ${node.order + 1}`,
      order: node.order,
      hasConflict: !!node.conflictScenario
    })),
    links: dependencies.map(dep => ({
      source: dep.source,
      target: dep.target,
      type: dep.type,
      strength: dep.strength || 5
    }))
  };

  // 获取关系颜色
  const getLinkColor = (type: string): string => {
    const colors: Record<string, string> = {
      'PRECEDES': '#64748b',
      'CAUSES': '#ef4444',
      'ENABLES': '#22c55e',
      'BLOCKS': '#f59e0b',
      'TRIGGERS': '#8b5cf6',
      'RESOLVES': '#06b6d4',
      'FORESHADOWS': '#ec4899',
      'CALLBACK_TO': '#84cc16'
    };
    return colors[type] || '#64748b';
  };

  // 获取节点颜色
  const getNodeColor = (node: GraphNode): string => {
    if (selectedNode === node.id) return '#a855f7';
    if (node.hasConflict) return '#ef4444';
    return '#3b82f6';
  };

  // 节点点击处理
  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(node.id);
    onNodeClick?.(node.id);
  };

  // 自定义节点渲染
  const paintNode = (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const size = 12 / globalScale;
    const fontSize = 10 / globalScale;

    // 绘制节点圆
    ctx.beginPath();
    ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
    ctx.fillStyle = getNodeColor(node);
    ctx.fill();
    ctx.strokeStyle = selectedNode === node.id ? '#ffffff' : 'transparent';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 绘制标签
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(node.name.slice(0, 10), node.x, node.y + size + fontSize);
  };

  // 自定义边渲染
  const paintLink = (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const lineWidth = (link.strength / 5) * 2 / globalScale;

    ctx.beginPath();
    ctx.moveTo(link.source.x, link.source.y);
    ctx.lineTo(link.target.x, link.target.y);
    ctx.strokeStyle = getLinkColor(link.type);
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // 绘制箭头
    const angle = Math.atan2(link.target.y - link.source.y, link.target.x - link.source.x);
    const arrowSize = 6 / globalScale;
    const targetX = link.target.x - (12 / globalScale) * Math.cos(angle);
    const targetY = link.target.y - (12 / globalScale) * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(targetX, targetY);
    ctx.lineTo(
      targetX - arrowSize * Math.cos(angle - Math.PI / 6),
      targetY - arrowSize * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      targetX - arrowSize * Math.cos(angle + Math.PI / 6),
      targetY - arrowSize * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = getLinkColor(link.type);
    ctx.fill();
  };

  return (
    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
      <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
        <span className="text-blue-400">🔗</span> 情节依赖关系图
      </h3>

      {/* 图例 */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {[
          { type: 'CAUSES', label: '导致', color: '#ef4444' },
          { type: 'ENABLES', label: '允许', color: '#22c55e' },
          { type: 'BLOCKS', label: '阻碍', color: '#f59e0b' },
          { type: 'TRIGGERS', label: '触发', color: '#8b5cf6' },
          { type: 'FORESHADOWS', label: '伏笔', color: '#ec4899' }
        ].map(item => (
          <span key={item.type} className="flex items-center gap-1">
            <span className="w-3 h-0.5" style={{ backgroundColor: item.color }}></span>
            {item.label}
          </span>
        ))}
      </div>

      {/* 力导向图 */}
      <div className="h-[400px] rounded-lg overflow-hidden bg-slate-950">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          nodeCanvasObject={paintNode}
          linkCanvasObject={paintLink}
          onNodeClick={handleNodeClick}
          nodeRelSize={12}
          linkDirectionalArrowLength={6}
          linkDirectionalArrowRelPos={0.9}
          linkCurvature={0.1}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      </div>

      {/* 选中节点信息 */}
      {selectedNode && (
        <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
          <div className="text-sm text-slate-300">
            选中: {plotNodes.find(n => n.id === selectedNode)?.title}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            入向依赖: {dependencies.filter(d => d.target === selectedNode).length} |
            出向依赖: {dependencies.filter(d => d.source === selectedNode).length}
          </div>
        </div>
      )}
    </div>
  );
};
```

### 5.3 冲突参与者网络图

#### 5.3.1 组件设计

```tsx
// components/PlotWeaver/ConflictParticipantNetwork.tsx

import React, { useMemo } from 'react';
import { PlotNode, Character } from '../../types';

interface ConflictParticipantNetworkProps {
  plotNodes: PlotNode[];
  characters: Character[];
  selectedConflictId?: string;
}

interface NetworkNode {
  id: string;
  name: string;
  type: 'character' | 'conflict';
  intensity?: number;
  conflictType?: string;
}

interface NetworkLink {
  source: string;
  target: string;
  type: string;
}

export const ConflictParticipantNetwork: React.FC<ConflictParticipantNetworkProps> = ({
  plotNodes,
  characters,
  selectedConflictId
}) => {
  // 构建网络数据
  const { nodes, links } = useMemo(() => {
    const networkNodes: NetworkNode[] = [];
    const networkLinks: NetworkLink[] = [];

    // 添加冲突节点
    plotNodes.forEach(node => {
      if (node.conflictScenario) {
        const conflictId = `conflict_${node.id}`;
        networkNodes.push({
          id: conflictId,
          name: node.title || `冲突`,
          type: 'conflict',
          intensity: node.conflictScenario.intensity,
          conflictType: node.conflictScenario.type || undefined
        });

        // 添加参与者链接
        node.conflictScenario.participants?.forEach(participantId => {
          const char = characters.find(c => c.id === participantId);
          if (char) {
            // 确保角色节点只添加一次
            if (!networkNodes.find(n => n.id === char.id)) {
              networkNodes.push({
                id: char.id,
                name: char.name,
                type: 'character'
              });
            }

            networkLinks.push({
              source: conflictId,
              target: char.id,
              type: 'PARTICIPATES_IN'
            });
          }
        });
      }
    });

    return { nodes: networkNodes, links: networkLinks };
  }, [plotNodes, characters]);

  // 按冲突强度排序
  const conflictsByIntensity = useMemo(() => {
    return nodes
      .filter(n => n.type === 'conflict')
      .sort((a, b) => (b.intensity || 0) - (a.intensity || 0));
  }, [nodes]);

  // 获取冲突颜色
  const getConflictColor = (intensity?: number): string => {
    if (!intensity) return 'bg-slate-600';
    if (intensity <= 3) return 'bg-blue-500';
    if (intensity <= 5) return 'bg-yellow-500';
    if (intensity <= 7) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
      <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
        <span className="text-purple-400">🕸️</span> 冲突参与者网络
      </h3>

      {/* 冲突列表 */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
        {conflictsByIntensity.map(conflict => (
          <div
            key={conflict.id}
            className={`
              p-3 rounded-lg border transition-all cursor-pointer
              ${selectedConflictId === conflict.id
                ? 'border-muse-400 bg-muse-400/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`
                  w-2 h-2 rounded-full
                  ${getConflictColor(conflict.intensity)}
                `}></span>
                <span className="text-sm text-white">{conflict.name}</span>
              </div>
              <span className="text-xs text-slate-400">
                强度: {conflict.intensity}
              </span>
            </div>

            {/* 参与者 */}
            <div className="mt-2 flex flex-wrap gap-1">
              {links
                .filter(l => l.source === conflict.id)
                .map(link => {
                  const char = nodes.find(n => n.id === link.target);
                  return char ? (
                    <span
                      key={link.target}
                      className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300"
                    >
                      {char.name}
                    </span>
                  ) : null;
                })}
            </div>
          </div>
        ))}
      </div>

      {/* 角色参与统计 */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        <h4 className="text-xs text-slate-500 mb-2">角色参与冲突数</h4>
        <div className="space-y-1">
          {characters
            .map(char => ({
              name: char.name,
              conflictCount: links.filter(l => l.target === char.id).length
            }))
            .filter(c => c.conflictCount > 0)
            .sort((a, b) => b.conflictCount - a.conflictCount)
            .slice(0, 5)
            .map(char => (
              <div key={char.name} className="flex items-center justify-between text-xs">
                <span className="text-slate-300">{char.name}</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{ width: `${(char.conflictCount / conflictsByIntensity.length) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-slate-400 w-4 text-right">{char.conflictCount}</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
```

---

## 六、与 Character 模块联动

### 6.1 角色参与情节完整链路

#### 6.1.1 数据流设计

```
┌──────────────────────────────────────────────────────────────────┐
│                    Character 模块                                 │
│  {id, name, structuredRelations, originLocation, residence...}   │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ INVOLVES / HAS_CONFLICT_PARTICIPANT
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    PlotNode 模块                                  │
│  {id, title, content, relatedCharacters[], conflictScenario}     │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ IMPLEMENTS / CONTAINS_CONFLICT
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Chapter 模块                                   │
│  {id, title, content, plotNodeId, expectedPOV}                   │
└──────────────────────────────────────────────────────────────────┘
```

#### 6.1.2 完整链路查询

```cypher
// 获取角色参与的完整情节链路
MATCH (c:Character {id: $characterId, projectId: $projectId})

// 1. 获取直接参与的情节
OPTIONAL MATCH (pn:PlotNode)-[:INVOLVES]->(c)

// 2. 获取参与冲突的情节
OPTIONAL MATCH (conflict:Conflict)-[:INVOLVES_PARTICIPANT]->(c)
OPTIONAL MATCH (conflictPn:PlotNode)-[:HAS_CONFLICT]->(conflict)

// 3. 获取实现的章节
OPTIONAL MATCH (ch:Chapter)-[:IMPLEMENTS]->(pn)
OPTIONAL MATCH (conflictCh:Chapter)-[:CONTAINS_CONFLICT]->(conflict)

// 4. 获取角色的POV章节
OPTIONAL MATCH (povCh:Chapter)-[:POV_IS]->(c)

WITH c,
     collect(DISTINCT {id: pn.id, title: pn.title, type: 'direct'}) as directPlots,
     collect(DISTINCT {id: conflictPn.id, title: conflictPn.title, type: 'conflict'}) as conflictPlots,
     collect(DISTINCT {id: ch.id, title: ch.title}) as implementedChapters,
     collect(DISTINCT {id: povCh.id, title: povCh.title}) as povChapters

RETURN {
  character: c.name,
  directPlots: directPlots,
  conflictPlots: conflictPlots,
  implementedChapters: implementedChapters,
  povChapters: povChapters,
  totalInvolvement: size(directPlots) + size(conflictPlots)
} as involvement
```

### 6.2 冲突场景中的角色关系

#### 6.2.1 冲突期间关系变化追踪

```typescript
// server/src/services/graph/queries.ts

export interface ConflictCharacterRelation {
  characterId: string;
  characterName: string;
  conflictId: string;
  conflictTitle: string;
  role: string;              // 参与角色
  side?: string;             // 站队
  relationChanges: {
    targetCharacterId: string;
    targetCharacterName: string;
    beforeState: string;
    duringState: string;
    afterState: string;
    changeReason: string;
  }[];
}

/**
 * 获取冲突场景中的角色关系变化
 */
export const getConflictCharacterRelations = async (
  projectId: string,
  conflictId: string
): Promise<ConflictCharacterRelation[]> => {
  const d = getDriver();
  const session = d.session();

  try {
    const result = await session.run(
      `MATCH (c:Conflict {id: $conflictId, projectId: $projectId})

       // 获取参与者
       MATCH (c)-[part:INVOLVES_PARTICIPANT]->(char:Character)

       // 获取参与者之间的关系变化
       OPTIONAL MATCH (char)-[rel:RELATION_DURING_CONFLICT {conflictId: $conflictId}]->(other:Character)

       WITH c, char, part,
            collect({
              targetCharacterId: other.id,
              targetCharacterName: other.name,
              beforeState: rel.beforeState,
              duringState: rel.duringState,
              afterState: rel.afterState,
              changeReason: rel.changeReason
            }) as relationChanges

       RETURN char.id as characterId,
              char.name as characterName,
              c.id as conflictId,
              c.title as conflictTitle,
              part.role as role,
              part.sidesWith as side,
              relationChanges`,
      { projectId, conflictId }
    );

    return result.records.map(record => ({
      characterId: record.get('characterId'),
      characterName: record.get('characterName'),
      conflictId: record.get('conflictId'),
      conflictTitle: record.get('conflictTitle'),
      role: record.get('role'),
      side: record.get('side'),
      relationChanges: record.get('relationChanges').filter((r: any) => r.targetCharacterId)
    }));
  } finally {
    await session.close();
  }
};
```

#### 6.2.2 冲突对角色关系的影响分析

```cypher
// 分析冲突对角色关系网络的总体影响
MATCH (c:Conflict {id: $conflictId, projectId: $projectId})

// 获取所有参与者
MATCH (c)-[:INVOLVES_PARTICIPANT]->(participant:Character)

// 分析参与者之间的现有关系
OPTIONAL MATCH (participant)-[existingRel]-(other:Character)
WHERE other IN [(c)-[:INVOLVES_PARTICIPANT]->(p) | p]
AND type(existingRel) IN ['ENEMY_OF', 'ALLY_OF', 'LOVES', 'KIN_OF', 'RIVAL_OF']

WITH c, participant, collect(DISTINCT {
  other: other.name,
  relationType: type(existingRel),
  weight: existingRel.weight
}) as existingRelations

RETURN {
  conflictId: c.id,
  conflictTitle: c.title,
  intensity: c.intensity,
  participants: collect({
    name: participant.name,
    existingRelations: existingRelations
  }),
  // 预测冲突影响
  predictedImpact: CASE
    WHEN c.intensity >= 8 THEN 'SEVERE'
    WHEN c.intensity >= 5 THEN 'MODERATE'
    ELSE 'MINOR'
  END
} as impactAnalysis
```

---

## 七、实施步骤清单

### 7.1 阶段一：数据结构准备（2-3天）

#### 任务清单

- [ ] **T1.1** 扩展 `types.ts` 中的 `ConflictScenario` 接口
  ```typescript
  // 文件: types.ts
  // 添加扩展字段: id, status, resolution, emotionalImpact, narrativeWeight
  ```

- [ ] **T1.2** 定义 `PlotDependencyType` 枚举和相关接口
  ```typescript
  // 文件: types.ts
  // 添加 PlotDependencyType, PlotDependency 接口
  ```

- [ ] **T1.3** 更新 `services/schemas.ts` Zod 验证规则
  ```typescript
  // 文件: services/schemas.ts
  // 扩展 AiPlotNodeSchema 支持新的 conflictScenario 字段
  ```

### 7.2 阶段二：图谱层改造（3-4天）

#### 任务清单

- [ ] **T2.1** 创建独立 Conflict 节点同步逻辑
  ```typescript
  // 文件: server/src/services/graph/sync.ts
  // 添加 syncConflictNodes() 函数
  ```

- [ ] **T2.2** 实现情节依赖关系同步
  ```typescript
  // 文件: server/src/services/graph/sync.ts
  // 扩展 syncProjectToGraph() 支持 CAUSES, ENABLES, BLOCKS 等关系
  ```

- [ ] **T2.3** 创建数据迁移脚本
  ```typescript
  // 文件: server/src/migrations/extractConflictNodes.ts
  // 从现有 conflictScenario 提取独立 Conflict 节点
  ```

- [ ] **T2.4** 添加关系白名单
  ```typescript
  // 文件: server/src/services/graph/sync.ts
  // 在 VALID_RELATION_TYPES 中添加新的依赖关系类型
  ```

### 7.3 阶段三：查询 API 实现（3-4天）

#### 任务清单

- [ ] **T3.1** 实现 `getPlotDependencies()` API
  ```typescript
  // 文件: server/src/services/graph/queries.ts
  // 获取情节依赖关系（入向/出向）
  ```

- [ ] **T3.2** 实现 `getConflictResolutionSuggestions()` API
  ```typescript
  // 文件: server/src/services/graph/queries.ts
  // 基于关系模式生成冲突解决建议
  ```

- [ ] **T3.3** 增强 `getHighIntensityConflicts()` API
  ```typescript
  // 文件: server/src/services/graph/queries.ts
  // 添加关联冲突、叙事上下文等信息
  ```

- [ ] **T3.4** 实现 `getConflictCharacterRelations()` API
  ```typescript
  // 文件: server/src/services/graph/queries.ts
  // 获取冲突期间的角色关系变化
  ```

- [ ] **T3.5** 添加 REST API 路由
  ```typescript
  // 文件: server/src/routes/graph.ts
  // 暴露新的查询 API
  ```

### 7.4 阶段四：前端可视化（4-5天）

#### 任务清单

- [ ] **T4.1** 实现 `ConflictHeatmap` 组件
  ```typescript
  // 文件: components/PlotWeaver/ConflictHeatmap.tsx
  // 冲突强度热力图
  ```

- [ ] **T4.2** 实现 `DependencyGraph` 组件
  ```typescript
  // 文件: components/PlotWeaver/DependencyGraph.tsx
  // 情节依赖关系图（力导向图）
  ```

- [ ] **T4.3** 实现 `ConflictParticipantNetwork` 组件
  ```typescript
  // 文件: components/PlotWeaver/ConflictParticipantNetwork.tsx
  // 冲突参与者网络图
  ```

- [ ] **T4.4** 集成到 `PlotWeaver` 主界面
  ```typescript
  // 文件: components/PlotWeaver.tsx
  // 在 AuxiliaryDrawer 中添加新标签页
  ```

- [ ] **T4.5** 添加冲突配置器增强
  ```typescript
  // 文件: components/PlotWeaver/PlotCard.tsx
  // 增强冲突配置器 UI
  ```

### 7.5 阶段五：测试与文档（2天）

#### 任务清单

- [ ] **T5.1** 编写单元测试
  ```typescript
  // 文件: server/src/__tests__/graph/queries.test.ts
  // 测试新查询 API
  ```

- [ ] **T5.2** 编写集成测试
  ```typescript
  // 文件: server/src/__tests__/integration/plotEnhancement.test.ts
  // 测试完整数据流
  ```

- [ ] **T5.3** 更新 API 文档
  ```markdown
  // 文件: server/docs/api.md
  // 记录新增的 API 端点
  ```

- [ ] **T5.4** 更新用户手册
  ```markdown
  // 文件: docs/user-guide/plot-weaver.md
  // 说明新的可视化功能
  ```

---

## 八、风险评估与缓解

### 8.1 技术风险

| 风险 | 等级 | 缓解措施 |
|------|------|---------|
| 数据迁移失败 | 高 | 1. 先备份；2. 渐进迁移；3. 提供回滚脚本 |
| 图谱查询性能 | 中 | 1. 添加索引；2. 限制查询深度；3. 使用缓存 |
| 前端渲染性能 | 中 | 1. 虚拟化长列表；2. 限制节点数量；3. WebGL 渲染 |
| API 兼容性 | 低 | 保持旧 API 可用，新 API 独立 |

### 8.2 数据迁移风险

```typescript
// 回滚脚本示例
// server/src/migrations/rollbackConflictNodes.ts

export async function rollbackConflictNodes(projectId: string): Promise<void> {
    const driver = getDriver();
    const session = driver.session();

    try {
        // 删除所有独立 Conflict 节点
        await session.run(
            `MATCH (c:Conflict {projectId: $projectId})
             DETACH DELETE c`,
            { projectId }
        );

        // 恢复 PlotNode.conflictScenario 字段（从备份）
        // ... 实现恢复逻辑

        console.log(`Rolled back conflict nodes for project ${projectId}`);
    } finally {
        await session.close();
    }
}
```

### 8.3 性能优化建议

```cypher
// 创建索引以提升查询性能
CREATE INDEX conflict_project_id IF NOT EXISTS FOR (c:Conflict) ON (c.projectId);
CREATE INDEX conflict_intensity IF NOT EXISTS FOR (c:Conflict) ON (c.intensity);
CREATE INDEX conflict_status IF NOT EXISTS FOR (c:Conflict) ON (c.status);

// 创建复合索引
CREATE INDEX conflict_project_status IF NOT EXISTS
FOR (c:Conflict) ON (c.projectId, c.status, c.intensity);
```

---

## 附录：关键文件清单

| 文件路径 | 改动类型 | 说明 |
|----------|---------|------|
| `types.ts` | 修改 | 扩展 ConflictScenario, 添加 PlotDependency |
| `services/schemas.ts` | 修改 | 更新 Zod 验证规则 |
| `server/src/services/graph/sync.ts` | 修改 | 添加 Conflict 节点同步, 依赖关系同步 |
| `server/src/services/graph/queries.ts` | 修改 | 添加新查询 API |
| `server/src/routes/graph.ts` | 修改 | 添加 REST API 路由 |
| `components/PlotWeaver.tsx` | 修改 | 集成可视化组件 |
| `components/PlotWeaver/ConflictHeatmap.tsx` | 新增 | 冲突热力图组件 |
| `components/PlotWeaver/DependencyGraph.tsx` | 新增 | 依赖关系图组件 |
| `components/PlotWeaver/ConflictParticipantNetwork.tsx` | 新增 | 参与者网络图组件 |
| `server/src/migrations/extractConflictNodes.ts` | 新增 | 数据迁移脚本 |

---

**文档结束**

**审阅者**: 请在实施前确认以下决策点：
1. [ ] Conflict 节点是否需要独立的 UI 管理界面
2. [ ] 依赖关系类型是否需要根据项目类型调整
3. [ ] 可视化组件的默认渲染方式（Canvas vs SVG）
4. [ ] 数据迁移的执行时机（项目加载时 vs 手动触发）
