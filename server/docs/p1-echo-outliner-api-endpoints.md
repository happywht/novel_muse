# P1 Echo和Outliner图谱查询API端点文档

## 概述

本文档描述了为P1 Echo和Outliner模块新增的8个图谱查询API端点。这些端点提供了关系演变追踪、伏笔管理、矛盾检测和章节分析等功能。

## API端点列表

### 1. Echo相关端点

#### 1.1 获取角色关系演变时间线

**端点**: `GET /api/graph/:projectId/relationships/timeline`

**描述**: 查询两个角色之间的关系演变时间线,展示他们关系的历史变化。

**查询参数**:

- `character1Id` (必需): 第一个角色的ID
- `character2Id` (必需): 第二个角色的ID

**返回数据**:

```json
[
  {
    "timestamp": 1234567890,
    "echoId": "echo-123",
    "relation": "ALLY_OF",
    "trajectory": "IMPROVING",
    "weight": 0.8,
    "description": "角色A和角色B建立了盟友关系"
  }
]
```

**调用函数**: `getRelationshipTimeline(projectId, character1Id, character2Id)`

---

#### 1.2 获取未回收的伏笔列表

**端点**: `GET /api/graph/:projectId/echoes/foreshadowing`

**描述**: 查询项目中所有未回收的伏笔,帮助作者追踪需要回收的情节线索。

**查询参数**:

- `branchId` (可选): 分支ID,默认为'main'

**返回数据**:

```json
[
  {
    "subject": "主角",
    "relation": "持有",
    "object": "神秘钥匙",
    "echoId": "echo-456",
    "createdAt": 1234567890,
    "relatedChapter": "第三章"
  }
]
```

**调用函数**: `getEchoForeshadowing(projectId, branchId)`

---

#### 1.3 检测Echo矛盾

**端点**: `GET /api/graph/:projectId/echoes/contradictions`

**描述**: 自动检测Echo中存在的关系矛盾、状态不一致和时间错误。

**返回数据**:

```json
[
  {
    "type": "RELATIONSHIP_CONFLICT",
    "description": "角色A和角色B同时存在敌对和盟友关系",
    "entities": ["角色A", "角色B"],
    "conflictingEchoes": ["echo-123", "echo-456"],
    "severity": "HIGH"
  }
]
```

**调用函数**: `detectContradictions(projectId)`

---

#### 1.4 获取实体的Echo历史

**端点**: `GET /api/graph/:projectId/echoes/:targetId/history`

**描述**: 获取特定实体(角色或世界设定)的所有Echo变更历史。

**URL参数**:

- `targetId`: 目标实体的ID

**返回数据**:

```json
[
  {
    "echoId": "echo-123",
    "description": "角色状态变更",
    "status": "ACCEPTED",
    "timestamp": 1234567890,
    "triples": [...]
  }
]
```

**调用函数**: `getEchoHistory(projectId, targetId)`

---

### 2. Outliner相关端点

#### 2.1 获取章节依赖关系

**端点**: `GET /api/graph/:projectId/chapters/:chapterId/dependencies`

**描述**: 查询章节的所有依赖关系,包括涉及的角色、场景、情节节点和前后章节关系。

**URL参数**:

- `chapterId`: 章节ID

**返回数据**:

```json
{
  "chapter": {...},
  "plotNode": {...},
  "involvedCharacters": [...],
  "setLocation": {...},
  "beats": [...],
  "predecessor": {...},
  "successor": {...}
}
```

**调用函数**: `getChapterDependencies(projectId, chapterId)`

---

#### 2.2 获取章节角色网络

**端点**: `GET /api/graph/:projectId/chapters/:chapterId/character-network`

**描述**: 查询章节涉及的角色网络,包括角色列表和他们之间的关系。

**URL参数**:

- `chapterId`: 章节ID

**返回数据**:

```json
{
  "characters": [...],
  "relationships": [
    {
      "subject": "角色A",
      "relation": "ALLY_OF",
      "object": "角色B",
      "weight": 0.9
    }
  ]
}
```

**调用函数**: `getChapterCharacterNetwork(projectId, chapterId)`

---

#### 2.3 追踪伏笔链

**端点**: `GET /api/graph/:projectId/chapters/:chapterId/foreshadowing-chain`

**描述**: 追踪伏笔从埋设到回收的完整链路。

**URL参数**:

- `chapterId`: 章节ID

**查询参数**:

- `foreshadowingId` (必需): 伏笔ID

**返回数据**:

```json
{
  "source": {...},
  "chain": [
    {
      "chapter": {...},
      "status": "PLANTED"
    },
    {
      "chapter": {...},
      "status": "HINTED"
    },
    {
      "chapter": {...},
      "status": "RESOLVED"
    }
  ]
}
```

**调用函数**: `getForeshadowingChain(projectId, foreshadowingId)`

---

#### 2.4 获取冲突热力图数据

**端点**: `GET /api/graph/:projectId/conflicts/heatmap`

**描述**: 查询所有章节的冲突强度数据,用于生成冲突热力图。

**返回数据**:

```json
[
  {
    "chapterId": "chapter-1",
    "chapterTitle": "第一章",
    "intensity": 0.8,
    "conflictType": "人际冲突",
    "participants": ["角色A", "角色B"]
  }
]
```

**调用函数**: `getConflictHeatmapData(projectId)`

---

## 实现细节

### 文件位置

- **路由文件**: `server/src/routes/graph.ts`
- **查询函数**: `server/src/services/graph/queries.ts`

### 导入的函数

所有新端点使用的查询函数都从 `../services/graph/queries` 导入:

- `getRelationshipTimeline`
- `getEchoForeshadowing`
- `detectContradictions`
- `getEchoHistory`
- `getChapterDependencies`
- `getChapterCharacterNetwork`
- `getForeshadowingChain`
- `getConflictHeatmapData`

### 错误处理

所有端点都实现了统一的错误处理:

- 参数验证失败返回 `400 Bad Request`
- 查询错误返回 `500 Internal Server Error`
- 所有错误都会记录到控制台

### 路由顺序注意事项

由于Express的路由匹配机制,特定路由(如 `/echoes/foreshadowing`)必须在通用路由(如 `/echoes/:targetId`)之前定义,以避免路由冲突。

## 使用示例

### 示例1: 查询两个角色的关系演变

```javascript
// 请求
GET /api/graph/project-123/relationships/timeline?character1Id=char-1&character2Id=char-2

// 响应
[
  {
    "timestamp": 1234567890,
    "echoId": "echo-1",
    "relation": "NEUTRAL",
    "trajectory": "STABLE",
    "weight": 0.5,
    "description": "初始关系"
  },
  {
    "timestamp": 1234567900,
    "echoId": "echo-2",
    "relation": "ALLY_OF",
    "trajectory": "IMPROVING",
    "weight": 0.8,
    "description": "成为盟友"
  }
]
```

### 示例2: 检测矛盾

```javascript
// 请求
GET / api / graph / project -
  123 /
    echoes /
    contradictions[
      // 响应
      {
        type: 'RELATIONSHIP_CONFLICT',
        description: '张三和李四同时存在敌对和盟友关系',
        entities: ['张三', '李四'],
        conflictingEchoes: ['echo-1', 'echo-5'],
        severity: 'HIGH',
      }
    ];
```

### 示例3: 获取章节依赖

```javascript
// 请求
GET /api/graph/project-123/chapters/chapter-5/dependencies

// 响应
{
  "chapter": {
    "id": "chapter-5",
    "title": "第五章:决战前夕",
    "order": 5
  },
  "plotNode": {...},
  "involvedCharacters": [
    {"id": "char-1", "name": "张三"},
    {"id": "char-2", "name": "李四"}
  ],
  "setLocation": {
    "id": "loc-1",
    "name": "王城"
  },
  "predecessor": {
    "id": "chapter-4",
    "title": "第四章"
  }
}
```

## 测试建议

1. **单元测试**: 为每个端点编写单元测试,验证参数验证和返回数据格式
2. **集成测试**: 测试端点与Neo4j数据库的集成
3. **性能测试**: 测试大量数据情况下的查询性能
4. **错误场景测试**: 测试各种错误场景(缺少参数、数据库错误等)

## 后续优化

1. **缓存**: 对于频繁查询的数据(如冲突热力图)添加缓存层
2. **分页**: 对于返回大量数据的端点(如伏笔列表)添加分页支持
3. **批量查询**: 支持批量查询多个章节的依赖关系
4. **WebSocket**: 对于实时性要求高的查询,考虑使用WebSocket推送更新
