# Echoes、Outliner、Forge模块图谱化潜力评估报告

**评估日期**: 2026-03-21
**评估范围**: Echoes模块、Outliner模块、Forge模块
**评估目标**: 分析各模块数据结构复杂度、交叉关系、图谱化优先级

---

## 一、Echoes模块分析

### 1.1 数据结构概览

```typescript
interface Echo {
  id: string;
  type: 'CHARACTER' | 'WORLD';
  targetId: string;           // 目标实体ID
  targetName: string;         // 目标实体名称
  description: string;        // 变更描述
  reason: string;             // 变更原因
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'PREDICTION' | 'ARCHIVED' | 'AUTO_ACCEPTED';
  timestamp: number;
  triples?: KnowledgeTriple[]; // 知识三元组（关系变更）
  branchId?: string;          // 分支ID
  confidence?: number;        // AI置信度 0-1
  extractionEvidence?: string; // 原文依据
}

interface KnowledgeTriple {
  subject: string;            // 主体
  relation: string;           // 关系类型
  object: string;             // 客体
  weight?: number;            // 关系强度 0-100
  trajectory?: string;        // 关系走向: rising, falling, stable
  isForeshadowing?: boolean;  // 是否为伏笔
  status?: 'OPEN' | 'RESOLVED' | 'ABANDONED';
  branchId?: string;
}
```

### 1.2 关系复杂度评估

| 维度 | 评分 | 说明 |
|------|------|------|
| **实体关联** | ★★★★★ | 直接关联Character和WorldSetting实体 |
| **关系三元组** | ★★★★★ | 已包含KnowledgeTriple结构，天然支持图谱化 |
| **时序性** | ★★★★☆ | 有timestamp，支持时间线分析 |
| **状态追踪** | ★★★★★ | 多种状态（PENDING/ACCEPTED/REJECTED等），支持关系演变 |
| **置信度** | ★★★★☆ | 有confidence字段，支持关系强度评估 |

### 1.3 已有图谱功能

1. **完整性检查系统** (`echoUtils.ts`)
   - 孤立节点检测（ORPHAN_NODE）
   - 矛盾关系检测（CONTRADICTION）
   - 待确认Echo检测（PENDING_ECHO）
   - 健康度评分计算

2. **关系三元组可视化**
   - 在EchoChamber中已展示三元组关系
   - 支持关系强度（weight）和走向（trajectory）可视化

3. **蝴蝶效应推演**
   - `deduceWorldConsequences()` 函数支持关系传播预测

### 1.4 图谱化建议

**优先级**: ★★★★★（最高）

Echoes模块是整个系统中最适合图谱化的模块，原因：
- 数据结构已包含三元组格式
- 与Character/WorldSetting有直接关联
- 已有完整性检查和矛盾检测逻辑
- 支持时序分析和状态演变

**图谱节点类型**:
- `Echo` - 变更事件节点
- `Character` - 角色节点
- `WorldSetting` - 世界设定节点

**图谱关系类型**:
- `AFFECTS` - Echo影响实体
- `CHANGES_RELATION` - 变更关系
- `CAUSES` - 因果关系（推演）
- `CONTRADICTS` - 矛盾关系

---

## 二、Outliner模块分析

### 2.1 数据结构概览

```typescript
interface Chapter {
  id: string;
  title: string;
  content: string;
  summary?: string;           // 章节细纲
  expectedPOV?: string;       // 视角人物
  plotNodeId?: string;        // 关联PlotNode
  order: number;
  lastModified: number;
  beats?: ChapterBeat[];      // 场景节拍链
  metadata?: Array<{key: string, value: string}>;
}

interface ChapterBeat {
  id: string;
  type: 'CONTENT' | 'ACTION' | 'DIALOGUE' | 'TWIST';
  description: string;
  isCompleted: boolean;
}

interface PlotNode {
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

### 2.2 关系复杂度评估

| 维度 | 评分 | 说明 |
|------|------|------|
| **实体关联** | ★★★★☆ | Chapter关联PlotNode，PlotNode关联Character/Location |
| **层级关系** | ★★★★★ | PlotNode → Chapter → ChapterBeat 三级结构 |
| **时序性** | ★★★★★ | 有order字段，严格时序 |
| **冲突分析** | ★★★★☆ | 有conflictScenario结构 |
| **内容关联** | ★★★☆☆ | content为文本，需要NLP提取关系 |

### 2.3 已有分析功能

1. **冲突可视化** (`conflictVisualization.ts`)
   - 冲突热力图生成
   - 角色压力曲线
   - 冲突类型分布（内心/人际/外部）
   - 修罗场节点识别

2. **章节平衡分析** (`ChapterBalanceAnalyzer.tsx`)
   - 字数平衡
   - 节奏控制
   - 角色出场频率
   - POV视角分配

3. **结构审计**
   - 章节与情节节点对齐检查
   - 跑偏风险预警

### 2.4 图谱化建议

**优先级**: ★★★★☆（高）

Outliner模块适合图谱化，但复杂度略低于Echoes：
- 层级结构清晰（PlotNode → Chapter → Beat）
- 已有冲突分析基础设施
- 与Character/Location有关联

**图谱节点类型**:
- `PlotNode` - 情节节点
- `Chapter` - 章节
- `ChapterBeat` - 场景节拍
- `Conflict` - 冲突场景

**图谱关系类型**:
- `EXPANDS_TO` - PlotNode展开为Chapter
- `CONTAINS` - Chapter包含Beat
- `INVOLVES` - 章节涉及角色/地点
- `CONFLICTS_WITH` - 冲突关系
- `FORESHADOWS` - 伏笔关系（跨章节）

---

## 三、Forge模块分析

### 3.1 模块定位

Forge模块是**创作工坊**（DraftingRoom的一部分），主要功能：
- 场景正文生成
- 文学润色（五感增强、镜头语言、心理侧写等）
- 局部重写
- Echo提取与确认

### 3.2 数据流分析

```
用户输入 → ForgeSidebar（选择角色/地点/情节）→
generateSceneFromIngredients() → 生成正文 →
DraftEditor（编辑）→ 提取Echo → EchoSummaryCard（确认）
```

### 3.3 关系复杂度评估

| 维度 | 评分 | 说明 |
|------|------|------|
| **实体关联** | ★★★☆☆ | 使用Character/WorldSetting作为输入，不存储关系 |
| **关系产生** | ★★★★★ | 生成内容产生新的Echo和关系三元组 |
| **时序性** | ★★☆☆☆ | 无独立时序，依赖Chapter |
| **数据持久化** | ★★☆☆☆ | 主要为临时状态，结果存入Draft/Chapter/Echo |

### 3.4 图谱化建议

**优先级**: ★★☆☆☆（低）

Forge模块本身**不适合**作为独立图谱模块，原因：
- 它是创作工具，不是数据存储模块
- 产生的关系已通过Echo机制处理
- 无独立持久化数据结构

**但Forge与图谱的集成点**:
1. **输入端**: 从图谱获取角色状态、位置、关系上下文
2. **输出端**: 将生成内容的关系变更写入图谱（通过Echo）

**推荐集成方式**:
- 在生成场景时，从图谱查询`PhysicalStatus`和`unresolvedForeshadowing`
- 生成后自动提取Echo并写入图谱

---

## 四、模块间交叉关系分析

### 4.1 数据流向图

```
                    ┌─────────────────────────────────────┐
                    │           知识图谱 (Neo4j)          │
                    │  - Character节点                    │
                    │  - WorldSetting节点                 │
                    │  - 关系边                           │
                    └──────────────┬──────────────────────┘
                                   │
           ┌───────────────────────┼───────────────────────┐
           │                       │                       │
           ▼                       ▼                       ▼
    ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
    │   Echoes     │      │   Outliner   │      │    Forge     │
    │   模块       │      │    模块      │      │    模块      │
    └──────┬───────┘      └──────┬───────┘      └──────┬───────┘
           │                     │                     │
           │  产生关系变更        │  产生章节内容        │  提取Echo
           │  (KnowledgeTriple)  │  (Chapter)          │  (关系三元组)
           │                     │                     │
           └─────────────────────┴─────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────────────────┐
                    │          Echoes (回响池)            │
                    │  - 状态变更建议                     │
                    │  - 关系三元组                       │
                    │  - 置信度评估                       │
                    └─────────────────────────────────────┘
```

### 4.2 交叉关系矩阵

| 模块A | 模块B | 关系类型 | 数据依赖 |
|-------|-------|----------|----------|
| Echoes | Character | 状态变更 | Echo.targetId → Character.id |
| Echoes | WorldSetting | 设定变更 | Echo.targetId → WorldSetting.id |
| Echoes | Outliner | 章节来源 | Echo可从Chapter内容提取 |
| Outliner | PlotNode | 层级展开 | Chapter.plotNodeId → PlotNode.id |
| Outliner | Character | 角色出场 | PlotNode.relatedCharacters |
| Outliner | WorldSetting | 场景设定 | PlotNode.relatedLocations |
| Forge | Echoes | 产生回响 | 生成内容 → 提取Echo |
| Forge | Character | 使用角色 | 生成时引用角色设定 |
| Forge | WorldSetting | 使用设定 | 生成时引用世界设定 |

### 4.3 图谱化后的数据流

```
1. 用户在Forge中生成场景
   ↓
2. AI提取Echo（包含KnowledgeTriple）
   ↓
3. 用户在Echoes中审核并采纳
   ↓
4. 采纳的Echo同步到图谱：
   - 更新Character节点属性
   - 更新WorldSetting节点属性
   - 创建/更新/删除关系边
   ↓
5. Outliner的章节与图谱关联：
   - Chapter节点关联参与的Character
   - PlotNode节点关联冲突场景
   ↓
6. 下次Forge生成时，从图谱获取最新状态
```

---

## 五、图谱化优先级排序

### 5.1 优先级评估表

| 模块 | 优先级 | 理由 | 实现复杂度 |
|------|--------|------|-----------|
| **Echoes** | P0（最高） | 已有三元组结构，直接映射到图谱 | ★★☆☆☆ |
| **Outliner** | P1（高） | 层级结构清晰，冲突分析有价值 | ★★★☆☆ |
| **Forge** | P2（低） | 作为工具集成，不需要独立图谱化 | ★☆☆☆☆ |

### 5.2 实施路线图

#### Phase 1: Echoes图谱化（1-2周）
- [ ] 将Echo中的KnowledgeTriple同步到图谱
- [ ] 实现Echo节点与Character/WorldSetting的关联
- [ ] 添加关系演变时序查询

#### Phase 2: Outliner图谱化（2-3周）
- [ ] 创建Chapter和PlotNode节点
- [ ] 建立层级关系（EXPANDS_TO, CONTAINS）
- [ ] 集成冲突可视化到图谱查询

#### Phase 3: Forge集成（1周）
- [ ] 生成前从图谱查询PhysicalStatus
- [ ] 生成后自动将Echo写入图谱
- [ ] 实现伏笔追踪（Chekhov's Gun）

---

## 六、技术建议

### 6.1 图谱Schema扩展

```cypher
// Echo相关节点和关系
CREATE CONSTRAINT echo_id IF NOT EXISTS FOR (e:Echo) REQUIRE e.id IS UNIQUE;

// Echo到实体的关系
(e:Echo)-[:AFFECTS]->(c:Character)
(e:Echo)-[:AFFECTS]->(w:WorldSetting)

// Echo中的三元组关系
(e:Echo)-[:CONTAINS_TRIPLE]->(t:Triple)
(t:Triple)-[:HAS_SUBJECT]->(subject)
(t:Triple)-[:HAS_OBJECT]->(obj)
(t:Triple)-[:HAS_RELATION]->(r:RelationType)

// Outliner相关节点
CREATE CONSTRAINT chapter_id IF NOT EXISTS FOR (ch:Chapter) REQUIRE ch.id IS UNIQUE;
CREATE CONSTRAINT plot_node_id IF NOT EXISTS FOR (pn:PlotNode) REQUIRE pn.id IS UNIQUE;

// 层级关系
(pn:PlotNode)-[:EXPANDS_TO]->(ch:Chapter)
(ch:Chapter)-[:CONTAINS_BEAT]->(cb:ChapterBeat)

// 章节关联
(ch:Chapter)-[:INVOLVES_CHARACTER]->(c:Character)
(ch:Chapter)-[:SET_IN_LOCATION]->(w:WorldSetting)
```

### 6.2 查询示例

```cypher
// 1. 查询某角色的关系演变历史
MATCH (c:Character {id: $characterId})<-[:AFFECTS]-(e:Echo)
MATCH (e)-[:CONTAINS_TRIPLE]->(t:Triple)
WHERE t.subject = c.name OR t.object = c.name
RETURN e.timestamp, t.subject, t.relation, t.object, t.trajectory
ORDER BY e.timestamp

// 2. 查询某章节涉及的所有关系变更
MATCH (ch:Chapter {id: $chapterId})<-[:GENERATED_FROM]-(e:Echo)
MATCH (e)-[:CONTAINS_TRIPLE]->(t:Triple)
RETURN t

// 3. 查询未回收的伏笔
MATCH (t:Triple)
WHERE t.isForeshadowing = true AND t.status = 'OPEN'
RETURN t.subject, t.relation, t.object

// 4. 查询冲突热力图数据
MATCH (pn:PlotNode)-[:EXPANDS_TO]->(ch:Chapter)
WHERE pn.conflictScenario IS NOT NULL
RETURN ch.title, pn.conflictScenario.intensity, pn.conflictScenario.participants
ORDER BY pn.conflictScenario.intensity DESC
```

---

## 七、结论

### 7.1 核心发现

1. **Echoes是最成熟的图谱化候选**
   - 数据结构天然适配三元组
   - 已有完整性检查基础设施
   - 与核心实体（Character/WorldSetting）强关联

2. **Outliner具有较高的图谱化价值**
   - 层级结构（PlotNode → Chapter → Beat）适合图遍历
   - 冲突分析功能可通过图谱增强
   - 支持伏笔追踪等高级功能

3. **Forge不需要独立图谱化**
   - 作为创作工具，其主要价值在于产生数据
   - 产生的Echo已经覆盖了关系变更
   - 应作为图谱的消费者和生产者集成

### 7.2 推荐行动

1. **立即开始Echoes图谱化**（P0）
2. **规划Outliner图谱化**（P1）
3. **设计Forge-图谱集成接口**（P2）

---

**报告编写**: Backend Developer Agent
**版本**: v1.0
