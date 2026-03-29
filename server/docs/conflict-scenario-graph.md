# 冲突场景图谱化功能

## 概述

该功能将 PlotNode 中的 `conflictScenario` 字段图谱化，存储在 Neo4j 图数据库中，以便进行复杂的冲突分析和查询。

## 数据结构

### ConflictScenario 字段

```typescript
conflictScenario?: {
    type: 'CONFRONTATION' | 'CLIMAX' | 'TWIST' | null;
    participants: string[]; // 参与角色ID数组
    stakes: string;         // 赌注/冲突核心
    intensity: number;      // 1-10强度等级
}
```

### 图数据库存储

使用 `HAS_CONFLICT_PARTICIPANT` 关系类型连接 PlotNode 和 Character：

```
(PlotNode)-[r:HAS_CONFLICT_PARTICIPANT]->(Character)
```

关系属性：

- `conflictType`: 冲突类型（CONFRONTATION | CLIMAX | TWIST）
- `stakes`: 赌注/冲突核心描述
- `intensity`: 强度等级（1-10）

## API 端点

### 1. 获取角色参与的所有冲突场景

**端点**: `GET /api/graph/:projectId/conflicts/character/:characterId`

**返回示例**:

```json
[
  {
    "plotNode": {
      "id": "plot-1",
      "title": "初次相遇",
      "content": "张三和李四初次相遇",
      "order": 1
    },
    "conflictType": "CONFRONTATION",
    "stakes": "两人之间的第一次冲突，争夺关键资源",
    "intensity": 6,
    "otherParticipants": [
      {
        "id": "char-2",
        "name": "李四",
        "role": "反派"
      }
    ]
  }
]
```

### 2. 获取所有高强度冲突（intensity >= 7）

**端点**: `GET /api/graph/:projectId/conflicts/high-intensity`

**返回示例**:

```json
[
  {
    "plotNode": {
      "id": "plot-2",
      "title": "高潮对决",
      "content": "最终决战",
      "order": 2
    },
    "conflictType": "CLIMAX",
    "stakes": "生死的较量，决定整个故事的走向",
    "intensity": 10,
    "participants": [
      {
        "id": "char-1",
        "name": "张三",
        "role": "主角"
      },
      {
        "id": "char-2",
        "name": "李四",
        "role": "反派"
      }
    ]
  }
]
```

## 使用场景

1. **角色冲突分析**: 查询某角色参与的所有冲突，了解角色在故事中的冲突轨迹
2. **情节强度分布**: 通过高强度冲突查询，快速定位故事的关键转折点
3. **冲突解决追踪**: 结合时间线分析冲突的演进和解决状态

## 测试

运行测试脚本：

```bash
npx ts-node test-conflict-scenario.ts
```

## 实现文件

- **同步逻辑**: `server/src/services/graph/sync.ts` - 在 PlotNode 同步中添加冲突场景关系创建
- **查询函数**: `server/src/services/graph/queries.ts` - 提供冲突场景查询函数
- **API 路由**: `server/src/routes/graph.ts` - 暴露 REST API 端点

## 注意事项

1. 冲突关系存储在关系边上，而非独立节点
2. 每个参与者都会创建一条独立的关系
3. 错误处理确保单个冲突关系失败不影响整体同步流程
4. 查询结果按强度降序排列
