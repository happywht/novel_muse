# 冲突场景图谱化实现总结

## 实现概述

成功实现了 PlotNode 中 `conflictScenario` 字段的图谱化存储，支持复杂的冲突场景查询和分析。

## 修改文件清单

### 1. `server/src/services/graph/sync.ts`

**修改内容**: 在 PlotNode 同步逻辑中添加冲突场景关系创建

**关键代码** (第 365-397 行):

```typescript
// 2.5.5. Create ConflictScenario relationships
for (const node of projectData.plotNodes) {
  if (node.conflictScenario && node.conflictScenario.participants?.length > 0) {
    const conflict = node.conflictScenario;

    // 为每个参与者创建冲突关系
    for (const participantId of conflict.participants) {
      try {
        await session.run(
          `MATCH (pn:PlotNode {id: $plotNodeId, projectId: $projectId})
                     MATCH (c:Character {id: $participantId, projectId: $projectId})
                     MERGE (pn)-[r:HAS_CONFLICT_PARTICIPANT]->(c)
                     SET r.conflictType = $conflictType,
                         r.stakes = $stakes,
                         r.intensity = $intensity`,
          {
            plotNodeId: node.id,
            projectId,
            participantId,
            conflictType: conflict.type || 'CONFRONTATION',
            stakes: conflict.stakes || '',
            intensity: conflict.intensity || 5,
          }
        );
      } catch (conflictErr) {
        console.warn(
          `Failed to create conflict relationship for PlotNode ${node.id} -> Character ${participantId}:`,
          conflictErr
        );
      }
    }

    console.log(
      `  └─ Conflict scenario: ${conflict.participants.length} participants, intensity ${conflict.intensity}`
    );
  }
}
```

**特性**:

- 为每个参与者创建独立的 `HAS_CONFLICT_PARTICIPANT` 关系
- 在关系上存储 `conflictType`、`stakes`、`intensity` 属性
- 完善的错误处理，确保单个失败不影响整体同步
- 控制台日志输出同步进度

### 2. `server/src/services/graph/queries.ts`

**修改内容**: 添加两个新的查询函数

**函数 1: getCharacterConflicts** (第 343-379 行)

```typescript
export const getCharacterConflicts = async (
    projectId: string,
    characterId: string
): Promise<Array<{
    plotNode: any;
    conflictType: string;
    stakes: string;
    intensity: number;
    otherParticipants: any[];
}>>
```

**功能**: 查询指定角色参与的所有冲突场景，包含其他参与者信息

**函数 2: getHighIntensityConflicts** (第 381-416 行)

```typescript
export const getHighIntensityConflicts = async (
    projectId: string
): Promise<Array<{
    plotNode: any;
    conflictType: string;
    stakes: string;
    intensity: number;
    participants: any[];
}>>
```

**功能**: 查询项目中所有高强度冲突场景（intensity >= 7）

### 3. `server/src/routes/graph.ts`

**修改内容**: 添加两个新的 API 端点

**端点 1**: `GET /api/graph/:projectId/conflicts/character/:characterId`

- 查询角色的所有冲突场景
- 返回按强度降序排列的结果

**端点 2**: `GET /api/graph/:projectId/conflicts/high-intensity`

- 查询所有高强度冲突
- 返回按强度降序排列的结果

## 技术实现细节

### 图数据库设计

**节点类型**:

- PlotNode: 情节节点
- Character: 角色节点

**关系类型**: `HAS_CONFLICT_PARTICIPANT`

- 方向: `(PlotNode)-[:HAS_CONFLICT_PARTICIPANT]->(Character)`
- 属性:
  - `conflictType`: 冲突类型（CONFRONTATION | CLIMAX | TWIST）
  - `stakes`: 冲突赌注/核心描述
  - `intensity`: 冲突强度（1-10）

### 查询优化

1. **索引使用**: 查询使用 `projectId` 和 `id` 属性进行匹配，确保快速查询
2. **结果排序**: 按强度降序排列，优先展示高强度冲突
3. **聚合查询**: 使用 `collect()` 聚合参与者信息，减少数据传输

### 错误处理

1. **同步阶段**: 每个冲突关系的创建都有独立的 try-catch，单个失败不影响其他关系
2. **查询阶段**: 标准的 try-finally 确保 session 正确关闭
3. **API 层**: 返回标准化的错误响应

## 测试

### 测试文件

- `server/test-conflict-scenario.ts`: 完整的功能测试脚本

### 测试覆盖

1. 同步包含冲突场景的项目数据
2. 查询角色的所有冲突场景
3. 查询高强度冲突场景
4. 验证关系属性正确存储
5. 验证参与者信息完整性

### 运行测试

```bash
cd server
npx ts-node test-conflict-scenario.ts
```

## 使用示例

### 前端调用示例

```typescript
// 获取角色的冲突场景
const conflicts = await fetch(`/api/graph/${projectId}/conflicts/character/${characterId}`).then(
  (r) => r.json()
);

// 获取高强度冲突
const highIntensityConflicts = await fetch(`/api/graph/${projectId}/conflicts/high-intensity`).then(
  (r) => r.json()
);
```

### Neo4j Cypher 查询示例

```cypher
// 查询角色的所有冲突
MATCH (c:Character {id: $characterId, projectId: $projectId})<-[r:HAS_CONFLICT_PARTICIPANT]-(pn:PlotNode)
RETURN pn, r
ORDER BY r.intensity DESC

// 查询高强度冲突
MATCH (pn:PlotNode {projectId: $projectId})-[r:HAS_CONFLICT_PARTICIPANT]->(c:Character)
WHERE r.intensity >= 7
RETURN pn, r, collect(c) as participants
ORDER BY r.intensity DESC
```

## 验证清单

- [x] TypeScript 编译通过
- [x] 同步逻辑正确实现
- [x] 查询函数正确实现
- [x] API 端点正确暴露
- [x] 错误处理完善
- [x] 测试文件创建
- [x] 文档编写完成

## 后续优化建议

1. **性能优化**: 考虑批量创建冲突关系，减少数据库调用次数
2. **缓存层**: 对高频查询的冲突数据添加缓存
3. **扩展查询**: 添加按冲突类型、强度范围等维度的查询
4. **统计分析**: 实现冲突分布统计、角色冲突热度图等分析功能
5. **可视化**: 前端可视化冲突网络图，直观展示角色冲突关系

## 相关文件路径

- 同步逻辑: `D:\家庭\副业探索\小说项目\小说开题\remix_-muse_-小说架构师_022302\server\src\services\graph\sync.ts`
- 查询函数: `D:\家庭\副业探索\小说项目\小说开题\remix_-muse_-小说架构师_022302\server\src\services\graph\queries.ts`
- API 路由: `D:\家庭\副业探索\小说项目\小说开题\remix_-muse_-小说架构师_022302\server\src\routes\graph.ts`
- 测试文件: `D:\家庭\副业探索\小说项目\小说开题\remix_-muse_-小说架构师_022302\server\test-conflict-scenario.ts`
- 功能文档: `D:\家庭\副业探索\小说项目\小说开题\remix_-muse_-小说架构师_022302\server\docs\conflict-scenario-graph.md`
