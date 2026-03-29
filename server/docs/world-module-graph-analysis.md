# World世界观模块 - 图谱化潜力评估报告

**分析日期**: 2026-03-21
**分析范围**: WorldSetting 数据结构、关系复杂度、图谱化价值

---

## 一、数据结构分析

### 1.1 当前WorldSetting接口定义

```typescript
// types.ts (Line 123-133)
export interface WorldSetting {
  id: string;
  category: 'Geography' | 'Magic/Tech' | 'Society' | 'History' | 'Other';
  title: string;
  content: string;

  // 层级关系（已规划但未在数据库实现）
  parentId?: string; // 父级设定ID（如：王国下的城市）
  importance?: number; // 重要性等级 1-10
  tags?: string[]; // 设定标签
}
```

### 1.2 数据库存储结构

```prisma
// prisma/schema.prisma (Line 62-71)
model WorldSetting {
  id        String  @id @default(cuid())
  category  String
  title     String
  content   String  @db.LongText
  projectId String
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
}
```

**关键发现**:

- 数据库层面**未实现** `parentId`, `importance`, `tags` 字段
- 前端类型定义已预留，但实际存储缺失
- 这意味着层级关系目前无法持久化

---

## 二、关系复杂度评估

### 2.1 已实现的图谱关系

| 关系类型          | 方向                             | 描述                   | 实现状态           |
| ----------------- | -------------------------------- | ---------------------- | ------------------ |
| `CONTAINS`        | Parent -> Child                  | 层级包含（王国->城市） | 代码存在但数据缺失 |
| `ORIGINATED_FROM` | Character -> WorldSetting        | 角色出生地             | 已实现             |
| `RESIDES_IN`      | Character -> WorldSetting        | 角色居住地             | 已实现             |
| `LOCATED_IN`      | PlotNode -> WorldSetting         | 情节发生地             | 已实现             |
| `INVOLVES`        | Chapter/PlotNode -> WorldSetting | 涉及的地点             | 已实现             |

### 2.2 潜在的关系类型（未实现）

```typescript
// sync.ts 中查询但未同步的关系类型
'DEPENDS_ON'; // 依赖关系（如：魔法系统依赖某种矿石）
'CONFLICTS_WITH'; // 冲突关系（如：两个国家的领土争端）
'ADJACENT_TO'; // 相邻关系（如：两个城市接壤）
'CONTROLS_TERRITORY'; // 角色控制的领地
'EXILED_FROM'; // 角色被流放的地点
```

### 2.3 关系复杂度矩阵

```
                    WorldSetting  Character  PlotNode  Chapter
WorldSetting         [层级]       [角色-地]   [情节-地]   [章节-地]
Character            [地-角色]      [角色间]    [情节-人]   [章节-人]
PlotNode             [地-情节]     [人-情节]    [情节链]    [实现]
Chapter              [地-章节]     [人-章节]    [实现]      [章节链]
```

**复杂度评分**: 7/10

- 存在多维度的交叉关系
- 层级关系可递归（王国->省->城市->街区）
- 与角色、情节有双向关联

---

## 三、图谱化价值评估

### 3.1 高价值场景

#### 场景1: 地理层级导航

```
王国A
├── 省份B
│   ├── 城市C
│   │   └── 街区D（发生谋杀案的地点）
│   └── 森林E（主角修炼之地）
└── 边境要塞F（与敌国接壤）
```

**价值**: 查询"主角所在城市属于哪个王国"需要递归查询，图谱效率高。

#### 场景2: 角色地理轨迹追踪

```
角色A --[ORIGINATED_FROM]--> 城市B
角色A --[RESIDES_IN]--> 城市C
角色A --[EXILED_FROM]--> 王国D
```

**价值**: 分析角色的迁徙路线、流亡历史，生成"人物地理档案"。

#### 场景3: 情节与地点的交叉分析

```
查询: "发生在王国A领土内的所有冲突场景"
MATCH (pn:PlotNode)-[:LOCATED_IN]->(w:WorldSetting)<-[:CONTAINS*]-(kingdom:WorldSetting {title: "王国A"})
WHERE pn.conflictScenario IS NOT NULL
RETURN pn, w
```

**价值**: 复杂查询在关系型数据库中需要多次JOIN，图谱原生支持。

### 3.2 低价值场景

- **简单的CRUD操作**: 增删改查单个设定条目，图谱无优势
- **全文搜索**: 标题/内容搜索，传统索引更高效
- **独立条目管理**: 无关系连接的设定，图谱无法提供额外价值

---

## 四、当前图谱实现状态

### 4.1 Neo4j 同步代码分析

**已实现** (`server/src/services/graph/sync.ts`):

```typescript
// Line 408-424: 创建 WorldSetting 节点
await session.run(
  `MERGE (w:WorldSetting:${categoryLabel} {id: $id, projectId: $projectId})
   SET w.title = $title, w.category = $category, w.content = $content`,
  { id, title, category, content, projectId }
);

// Line 429-443: 创建 CONTAINS 关系（基于 parentId）
if (ws.parentId) {
  await session.run(
    `MATCH (parent:WorldSetting {id: $parentId})
     MATCH (child:WorldSetting {id: $childId})
     MERGE (parent)-[:CONTAINS]->(child)`,
    { parentId: ws.parentId, childId: ws.id, projectId }
  );
}
```

**已实现** (`server/src/services/graph/queries.ts`):

```typescript
// Line 424-487: 获取世界设定网络
export const getWorldSettingNetwork = async (projectId, settingId?, depth = 2) => {
  // 获取 WorldSetting 之间的关系
  // 获取关联的角色
  // 获取关联的情节节点
};

// Line 521-563: 获取层级结构
export const getSettingHierarchy = async (projectId, rootSettingId?) => {
  // 查找所有顶级节点
  // 递归获取子节点
};
```

### 4.2 数据流断点分析

```
[前端 WorldBuilder] --(parentId, tags)--> [types.ts]
                                              |
                                              v
[API projects.ts] --(只同步 id,category,title,content)--> [Prisma DB]
                                              |
                                              v
[graph/sync.ts] --(尝试使用 parentId)--> [Neo4j] --(失败: parentId 为 undefined)
```

**核心问题**: 前端类型定义了 `parentId`，但数据库 schema 缺失该字段，导致同步时数据丢失。

---

## 五、图谱化建议

### 5.1 是否需要图谱化？

**结论**: **需要，且已有良好基础**

**理由**:

1. 已有 Neo4j 同步代码框架
2. 查询函数已实现（`getWorldSettingNetwork`, `getSettingHierarchy`）
3. 与角色、情节的交叉关系已在图谱中
4. 层级查询需求明确（地理、组织结构）

### 5.2 优先级评估

| 优先级 | 任务                       | 工作量 | 价值           |
| ------ | -------------------------- | ------ | -------------- |
| P0     | 数据库添加 `parentId` 字段 | 0.5天  | 高             |
| P0     | API同步时传递 `parentId`   | 0.5天  | 高             |
| P1     | 实现 `tags` 字段           | 1天    | 中             |
| P1     | 实现 `importance` 字段     | 0.5天  | 低             |
| P2     | 添加 `DEPENDS_ON` 关系     | 2天    | 中             |
| P2     | 添加 `ADJACENT_TO` 关系    | 2天    | 中             |
| P3     | 实现地理可视化UI           | 5天    | 高（用户价值） |

### 5.3 实施路径

#### Phase 1: 修复现有功能（1天）

```sql
-- 1. 数据库迁移
ALTER TABLE WorldSetting ADD COLUMN parentId VARCHAR(255);
ALTER TABLE WorldSetting ADD COLUMN importance INT DEFAULT 5;
ALTER TABLE WorldSetting ADD COLUMN tags TEXT; -- JSON array
```

```typescript
// 2. 更新 API 同步逻辑 (projects.ts Line 379-389)
await tx.worldSetting.createMany({
  data: data.worldSettings.map((w: any) => ({
    id: w.id,
    category: w.category,
    title: w.title,
    content: w.content,
    parentId: w.parentId || null, // 新增
    importance: w.importance || 5, // 新增
    tags: w.tags ? JSON.stringify(w.tags) : null, // 新增
    projectId: id,
  })),
});
```

#### Phase 2: 增强图谱查询（2天）

```typescript
// 3. 新增查询函数
export const findSettingsByTag = async (projectId: string, tag: string) => {
  // 按标签查找设定
};

export const getImportantSettings = async (projectId: string, threshold: number = 7) => {
  // 获取高重要性设定
};

export const getCharacterGeographicHistory = async (projectId: string, characterId: string) => {
  // 获取角色的完整地理历史（出生地、居住地、流放地、控制领地）
};
```

#### Phase 3: UI集成（3天）

- WorldBuilder 添加层级选择器（选择父级设定）
- 知识图谱可视化中显示地理层级
- 角色详情页显示地理关联

---

## 六、风险与限制

### 6.1 技术风险

| 风险                       | 影响 | 缓解措施                       |
| -------------------------- | ---- | ------------------------------ |
| 数据迁移丢失               | 中   | 先备份，增量迁移               |
| 循环引用（A包含B，B包含A） | 高   | 代码校验，数据库约束           |
| 层级过深导致查询慢         | 中   | 限制最大深度为5层              |
| 图谱与关系数据库不一致     | 高   | 单向同步策略（MySQL -> Neo4j） |

### 6.2 业务限制

- **类别隔离**: 不同类别的设定可能有不同的层级结构（地理 vs 魔法系统）
- **跨项目隔离**: WorldSetting 必须严格按 projectId 隔离
- **性能考虑**: 层级查询应在图谱端执行，避免前端递归

---

## 七、结论

### 7.1 图谱化价值总结

| 维度           | 评分       | 说明                             |
| -------------- | ---------- | -------------------------------- |
| 数据结构适配性 | 8/10       | 已有层级字段定义，需补齐数据库   |
| 关系复杂度     | 7/10       | 多维度交叉关系，图谱有明显优势   |
| 查询需求强度   | 6/10       | 层级查询、地理轨迹有价值但非高频 |
| 实施成本       | 4/10       | 基础设施已就绪，仅需补齐数据流   |
| **综合价值**   | **6.5/10** | **建议实施，优先级 P1**          |

### 7.2 关键行动项

1. **立即**: 修复数据库 schema，添加 `parentId` 字段
2. **本周**: 更新 API 同步逻辑，确保图谱关系数据完整
3. **下周**: 实现地理层级可视化 UI
4. **未来**: 考虑添加 `DEPENDS_ON`, `ADJACENT_TO` 等高级关系

### 7.3 与其他模块的对比

| 模块             | 图谱化优先级 | 理由                 |
| ---------------- | ------------ | -------------------- |
| Character        | P0           | 已完成，关系丰富     |
| PlotNode         | P0           | 已完成，情节链关键   |
| **WorldSetting** | **P1**       | **有基础，需补齐**   |
| Draft            | P3           | 弱关联，价值低       |
| Chapter          | P2           | 与情节关联，中等价值 |

---

**评估人**: Backend Developer Agent
**文件路径**:

- 类型定义: `types.ts` (Line 123-133)
- 数据库Schema: `server/prisma/schema.prisma` (Line 62-71)
- 图谱同步: `server/src/services/graph/sync.ts` (Line 408-483)
- 图谱查询: `server/src/services/graph/queries.ts` (Line 424-563)
- API路由: `server/src/routes/projects.ts` (Line 379-389)
