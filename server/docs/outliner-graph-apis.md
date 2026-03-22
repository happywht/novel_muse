# Outliner Graph Query APIs 文档

本文档说明了 P1 阶段实现的 Outliner 模块图谱查询功能。

## 概述

这四个 API 函数提供了章节级别的图谱查询能力，支持 Outliner 模块的知识图谱可视化功能。

## API 函数

### 1. getChapterDependencies

获取章节的依赖关系，包括关联的情节节点、涉及的角色、场景地点、节拍列表以及前后章节。

**函数签名：**
```typescript
export const getChapterDependencies = async (
    projectId: string,
    chapterId: string
): Promise<{
    chapter: any;
    plotNode?: any;
    involvedCharacters: any[];
    setLocation?: any;
    beats: any[];
    predecessor?: any;
    successor?: any;
}>
```

**参数：**
- `projectId`: 项目ID
- `chapterId`: 章节ID

**返回值：**
- `chapter`: 章节基本信息（id, title, order, summary, pov等）
- `plotNode`: 关联的情节节点（通过 IMPLEMENTS 关系）
- `involvedCharacters`: 涉及的角色列表（通过 INVOLVES 关系）
- `setLocation`: 场景地点（通过 LOCATED_IN 关系）
- `beats`: 章节节拍列表（从章节 beats 属性解析）
- `predecessor`: 前驱章节（通过 PRECEDES 关系）
- `successor`: 后继章节（通过 PRECEDES 关系）

**Cypher 查询示例：**
```cypher
// 获取章节基本信息
MATCH (ch:Chapter {id: $chapterId, projectId: $projectId}) RETURN ch

// 获取关联的 PlotNode
MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})-[:IMPLEMENTS]->(pn:PlotNode) RETURN pn

// 获取涉及的角色
MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})-[:INVOLVES]->(c:Character) RETURN DISTINCT c

// 获取场景地点
MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})-[:LOCATED_IN]->(w:WorldSetting) RETURN w

// 获取前驱章节
MATCH (prev:Chapter {projectId: $projectId})-[:PRECEDES]->(ch:Chapter {id: $chapterId}) RETURN prev

// 获取后继章节
MATCH (ch:Chapter {id: $chapterId})-[:PRECEDES]->(next:Chapter {projectId: $projectId}) RETURN next
```

**使用场景：**
- 章节详情面板显示
- 章节依赖关系可视化
- 章节编辑时的上下文参考

---

### 2. getChapterCharacterNetwork

获取章节涉及的角色网络，包括角色列表和角色之间的关系。

**函数签名：**
```typescript
export const getChapterCharacterNetwork = async (
    projectId: string,
    chapterId: string
): Promise<{
    characters: any[];
    relationships: Array<{
        subject: string;
        relation: string;
        object: string;
        weight: number;
    }>;
}>
```

**参数：**
- `projectId`: 项目ID
- `chapterId`: 章节ID

**返回值：**
- `characters`: 章节涉及的角色列表
- `relationships`: 角色之间的关系数组
  - `subject`: 关系主体（角色名称）
  - `relation`: 关系类型（如 ENEMY_OF, ALLY_OF, LOVES 等）
  - `object`: 关系客体（角色名称）
  - `weight`: 关系强度（0-100）

**数据来源：**
1. 角色之间的关系边（Character 节点之间的关系）
2. KnowledgeTriple 中的关系数据（可能包含更多细节）

**Cypher 查询示例：**
```cypher
// 获取章节涉及的角色
MATCH (ch:Chapter {id: $chapterId, projectId: $projectId})-[:INVOLVES]->(c:Character)
RETURN DISTINCT c

// 获取角色之间的关系（通过关系边）
MATCH (c1:Character {projectId: $projectId})-[r]->(c2:Character {projectId: $projectId})
WHERE c1.name IN $charNames AND c2.name IN $charNames
AND type(r) IN ['ENEMY_OF', 'ALLY_OF', 'LOVES', 'KIN_OF', 'MENTORS', 'RIVAL_OF', 'SERVES', 'FRIEND_OF', 'RELATED_TO']
RETURN c1.name as subject, type(r) as relation, c2.name as object, r.weight as weight

// 获取 KnowledgeTriple 中的关系
MATCH (t:KnowledgeTriple {projectId: $projectId})
WHERE t.subject IN $charNames AND t.object IN $charNames
RETURN t.subject as subject, t.relation as relation, t.object as object, t.weight as weight
```

**使用场景：**
- 章节角色关系网络可视化
- 角色交互分析
- 冲突预测和建议

---

### 3. getForeshadowingChain

获取伏笔链追踪，显示伏笔在不同章节中的出现和解决情况。

**函数签名：**
```typescript
export const getForeshadowingChain = async (
    projectId: string,
    foreshadowingId: string
): Promise<{
    source: any;
    chain: Array<{
        chapter: any;
        status: 'PLANTED' | 'HINTED' | 'RESOLVED';
    }>;
}>
```

**参数：**
- `projectId`: 项目ID
- `foreshadowingId`: 伏笔ID（KnowledgeTriple 的 ID）

**返回值：**
- `source`: 伏笔源信息（KnowledgeTriple 节点）
  - `subject`: 伏笔主体
  - `relation`: 伏笔关系
  - `object`: 伏笔客体
  - `isForeshadowing`: true
  - `status`: 'OPEN' | 'RESOLVED' | 'ABANDONED'
- `chain`: 伏笔链数组
  - `chapter`: 章节信息
  - `status`: 伏笔状态
    - `PLANTED`: 伏笔埋设
    - `HINTED`: 伏笔提示
    - `RESOLVED`: 伏笔回收

**状态映射逻辑：**
- KnowledgeTriple.status = 'OPEN' → 'PLANTED'
- KnowledgeTriple.status = 'RESOLVED' → 'RESOLVED'
- 其他情况 → 'HINTED'

**Cypher 查询示例：**
```cypher
// 获取伏笔源信息
MATCH (t:KnowledgeTriple {id: $foreshadowingId, projectId: $projectId, isForeshadowing: true})
RETURN t

// 查找所有引用此伏笔的章节
MATCH (t:KnowledgeTriple {id: $foreshadowingId, projectId: $projectId})
OPTIONAL MATCH (pn:PlotNode {projectId: $projectId})-[:HAS_FORESHADOWING]->(t)
OPTIONAL MATCH (ch:Chapter {projectId: $projectId})-[:IMPLEMENTS]->(pn)
OPTIONAL MATCH (ch2:Chapter {projectId: $projectId})-[:INVOLVES]->(c:Character)
    WHERE c.name = t.subject OR c.name = t.object
WITH COALESCE(ch, ch2) as chapter, t.status as tripleStatus
WHERE chapter IS NOT NULL
RETURN DISTINCT chapter,
       CASE
           WHEN tripleStatus = 'OPEN' THEN 'PLANTED'
           WHEN tripleStatus = 'RESOLVED' THEN 'RESOLVED'
           ELSE 'HINTED'
       END as status
ORDER BY chapter.order
```

**使用场景：**
- 伏笔追踪面板
- 伏笔完整性检查
- 伏笔回收提醒

---

### 4. getConflictHeatmapData

获取冲突热力图数据，显示所有章节的冲突强度和类型。

**函数签名：**
```typescript
export const getConflictHeatmapData = async (
    projectId: string
): Promise<Array<{
    chapterId: string;
    chapterTitle: string;
    intensity: number;
    conflictType: string;
    participants: string[];
}>>
```

**参数：**
- `projectId`: 项目ID

**返回值：**
返回一个数组，每个元素包含：
- `chapterId`: 章节ID
- `chapterTitle`: 章节标题
- `intensity`: 冲突强度（0-10）
- `conflictType`: 冲突类型（CONFRONTATION, CLIMAX, TWIST, NONE）
- `participants`: 参与角色名称列表

**冲突数据来源：**
1. PlotNode 的 `conflictScenario` 属性（主要来源）
   - `type`: 冲突类型
   - `intensity`: 冲突强度（1-10）
   - `participants`: 参与角色ID数组

2. 章节涉及的角色列表（辅助推断）
   - 如果有2个及以上角色但没有冲突场景，推断为基础冲突（intensity=3）

**Cypher 查询示例：**
```cypher
MATCH (ch:Chapter {projectId: $projectId})
OPTIONAL MATCH (ch)-[:IMPLEMENTS]->(pn:PlotNode)
OPTIONAL MATCH (ch)-[:INVOLVES]->(c:Character)
WITH ch, pn, collect(DISTINCT c.name) as charNames
RETURN ch.id as chapterId,
       ch.title as chapterTitle,
       ch.order as chapterOrder,
       pn.conflictScenario as conflictScenario,
       charNames as participants
ORDER BY chapterOrder
```

**冲突场景数据解析：**
```typescript
// conflictScenario 可能是字符串或对象
const scenario = typeof conflictScenario === 'string'
    ? JSON.parse(conflictScenario)
    : conflictScenario;

if (scenario) {
    intensity = scenario.intensity || 0;
    conflictType = scenario.type || 'NONE';
}
```

**使用场景：**
- 冲突热力图可视化
- 节奏分析
- 冲突分布概览
- 高冲突章节识别

---

## 图谱关系总结

### Chapter 节点关系

```
Chapter
  ├─[:IMPLEMENTS]→ PlotNode        # 章节实现的情节节点
  ├─[:INVOLVES]→ Character         # 章节涉及的角色
  ├─[:LOCATED_IN]→ WorldSetting    # 章节场景地点
  ├─[:PRECEDES]→ Chapter           # 后继章节
  └─[:POV_IS]→ Character           # POV角色
```

### PlotNode 节点关系

```
PlotNode
  ├─[:INVOLVES]→ Character         # 情节涉及的角色
  ├─[:LOCATED_IN]→ WorldSetting    # 情节发生地点
  ├─[:PRECEDES]→ PlotNode          # 前后情节关系
  └─[:HAS_FORESHADOWING]→ KnowledgeTriple  # 关联的伏笔
```

### Character 节点关系

```
Character
  ├─[:ENEMY_OF]→ Character         # 敌对关系
  ├─[:ALLY_OF]→ Character          # 盟友关系
  ├─[:LOVES]→ Character            # 爱慕关系
  ├─[:KIN_OF]→ Character           # 亲属关系
  ├─[:MENTORS]→ Character          # 师徒关系
  ├─[:RIVAL_OF]→ Character         # 竞争关系
  ├─[:SERVES]→ Character           # 效忠关系
  ├─[:FRIEND_OF]→ Character        # 朋友关系
  └─[:RELATED_TO]→ Character       # 通用关系
```

---

## 性能考虑

### 1. 查询优化

- 使用 `OPTIONAL MATCH` 处理可能不存在的关系，避免查询失败
- 使用 `DISTINCT` 去重，减少数据传输
- 使用 `collect()` 聚合多个结果，减少结果集大小
- 限制查询深度（如 `PRECEDES*1..3`）

### 2. 会话管理

- 所有函数都使用 `try-finally` 确保会话关闭
- 每个查询使用独立的 session，避免会话复用问题

### 3. 错误处理

- 查询结果为空时返回空数组或 null
- JSON 解析失败时记录警告并返回空数组
- 使用 `COALESCE` 处理可能为 null 的值

---

## 测试建议

### 1. 单元测试

```typescript
// 测试 getChapterDependencies
describe('getChapterDependencies', () => {
    it('should return chapter dependencies', async () => {
        const result = await getChapterDependencies('project-1', 'chapter-1');
        expect(result.chapter).toBeDefined();
        expect(result.involvedCharacters).toBeInstanceOf(Array);
    });

    it('should return null for non-existent chapter', async () => {
        const result = await getChapterDependencies('project-1', 'non-existent');
        expect(result.chapter).toBeNull();
    });
});
```

### 2. 集成测试

- 测试完整的图谱查询流程
- 测试与前端组件的集成
- 测试性能（响应时间 < 500ms）

### 3. 边界情况测试

- 空项目（没有章节）
- 章节没有关联的 PlotNode
- 章节没有涉及的角色
- 伏笔没有被任何章节引用

---

## 未来扩展

### 1. 缓存优化

- 实现查询结果缓存（Redis）
- 使用 GraphQL DataLoader 批量查询
- 增量更新缓存策略

### 2. 实时更新

- 实现图谱变更的实时推送
- WebSocket 集成
- 增量图谱更新

### 3. 高级分析

- 章节相似度分析
- 角色互动频率统计
- 冲突强度趋势分析
- 伏笔密度热力图

---

## 相关文件

- 实现文件: `server/src/services/graph/queries.ts`
- 类型定义: `types.ts`
- 图谱同步: `server/src/services/graph/sync.ts`
- 数据库客户端: `server/src/services/graph/client.ts`

---

## 更新日志

### v1.0.0 (2025-03-21)
- 实现四个 Outliner 图谱查询 API
- 支持章节依赖关系查询
- 支持角色网络分析
- 支持伏笔链追踪
- 支持冲突热力图数据查询
