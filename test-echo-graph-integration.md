# EchoChamber 图谱查询集成测试指南

## 已实现功能

### 1. 关系时间线 (Relationship Timeline)

- **位置**: 图谱查询面板 → "关系时间线" 区域
- **使用方法**:
  1. 点击"图谱查询"按钮展开面板
  2. 在"关系时间线"区域选择两个不同的角色
  3. 点击"查询"按钮
- **API调用**: `fetchRelationshipTimeline(projectId, char1Id, char2Id)`
- **显示内容**:
  - 关系类型 (relation)
  - 时间戳 (timestamp)
  - 关系强度 (weight) - 以进度条显示
  - 关系趋势 (trajectory) - 上升↑/下降↓/稳定→
  - 描述 (description)

### 2. 未回收伏笔面板 (Foreshadowing Panel)

- **位置**: 图谱查询面板 → "未回收伏笔" 区域
- **自动加载**: 打开图谱查询面板时自动加载
- **手动刷新**: 点击"刷新"按钮
- **API调用**: `fetchEchoForeshadowing(projectId)`
- **显示内容**:
  - 三元组关系 (subject → relation → object)
  - 来源章节 (relatedChapter)
  - 创建时间 (createdAt)
  - 伏笔总数统计

### 3. 矛盾检测 (Contradiction Detection)

- **位置**: 图谱查询面板 → "矛盾检测" 区域
- **使用方法**: 点击"检测矛盾"按钮
- **API调用**: `detectContradictions(projectId)`
- **显示内容**:
  - 矛盾类型 (RELATIONSHIP_CONFLICT / STATE_MISMATCH / TEMPORAL_ERROR)
  - 严重程度 (HIGH 🔴 / MEDIUM 🟡 / LOW 🟢)
  - 问题描述 (description)
  - 涉及实体 (entities)

### 4. Echo采纳时同步到图谱

- **位置**: Echo列表中每个Echo的"采纳"按钮
- **使用方法**: 悬停在待处理的Echo上，点击"✓"按钮
- **API调用**: `POST /api/graph/:projectId/echoes/:echoId/accept`
- **功能**: 采纳Echo并自动同步到Neo4j图谱

## UI设计

### 新增图标

- `Network`: 图谱查询按钮
- `Users`: 关系时间线区域
- `GitBranch`: 未回收伏笔区域
- `AlertTriangle`: 矛盾检测区域

### 样式特点

- 保持与现有UI风格一致
- 使用slate、muse、amber、rose配色方案
- 支持暗色主题
- 响应式滚动区域

## 技术实现

### 状态管理

```typescript
// Graph Query States
const [selectedChar1Id, setSelectedChar1Id] = useState<string | null>(null);
const [selectedChar2Id, setSelectedChar2Id] = useState<string | null>(null);
const [relationshipTimeline, setRelationshipTimeline] = useState<RelationshipTimelineItem[]>([]);
const [foreshadowingList, setForeshadowingList] = useState<ForeshadowingItem[]>([]);
const [contradictions, setContradictions] = useState<ContradictionItem[]>([]);
const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
const [isLoadingForeshadowing, setIsLoadingForeshadowing] = useState(false);
const [isLoadingContradictions, setIsLoadingContradictions] = useState(false);
const [showGraphPanel, setShowGraphPanel] = useState(false);
```

### 类型定义

```typescript
interface RelationshipTimelineItem {
  timestamp: number;
  echoId: string;
  relation: string;
  trajectory: string;
  weight: number;
  description: string;
}

interface ForeshadowingItem {
  subject: string;
  relation: string;
  object: string;
  echoId: string;
  createdAt: number;
  relatedChapter?: string;
}

interface ContradictionItem {
  type: 'RELATIONSHIP_CONFLICT' | 'STATE_MISMATCH' | 'TEMPORAL_ERROR';
  description: string;
  entities: string[];
  conflictingEchoes: string[];
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
}
```

### API集成

- 所有API调用都通过 `services/apiService.ts` 中的函数
- 支持错误处理和加载状态
- 使用 async/await 模式

## 测试步骤

### 1. 测试关系时间线

```bash
# 确保后端服务器运行
cd server
npm run dev

# 前端开发服务器
npm run dev
```

1. 打开应用并进入 EchoChamber
2. 点击"图谱查询"按钮
3. 在"关系时间线"区域选择两个角色
4. 点击"查询"按钮
5. 验证时间线数据显示正确

### 2. 测试伏笔追踪

1. 打开图谱查询面板
2. 验证"未回收伏笔"区域自动加载
3. 点击"刷新"按钮测试手动刷新
4. 检查伏笔列表显示格式

### 3. 测试矛盾检测

1. 在图谱查询面板中点击"检测矛盾"按钮
2. 验证矛盾列表显示
3. 检查严重程度颜色编码

### 4. 测试Echo采纳同步

1. 找到一个待处理的Echo
2. 悬停并点击"✓"采纳按钮
3. 验证提示消息"Echo已采纳并同步到图谱"
4. 检查后端Neo4j图谱是否更新

## 文件修改

### 修改的文件

- `components/EchoChamber.tsx`
  - 新增图谱查询状态管理
  - 新增图谱查询面板UI
  - 新增图谱查询处理函数
  - 修改Echo采纳逻辑以支持图谱同步

### 依赖的文件（未修改）

- `services/apiService.ts` - 提供图谱查询API
- `types.ts` - 类型定义

## 注意事项

1. **后端依赖**: 所有图谱查询功能需要后端Neo4j服务运行
2. **权限检查**: 确保用户有权限访问图谱数据
3. **性能优化**: 图谱查询结果可以考虑缓存
4. **错误处理**: 所有API调用都有错误处理和用户提示
5. **UI一致性**: 保持与现有EchoChamber风格一致

## 未来改进建议

1. **实时更新**: 使用WebSocket实现图谱数据实时更新
2. **可视化**: 添加关系图谱可视化组件
3. **过滤选项**: 添加时间范围、关系类型等过滤选项
4. **批量操作**: 支持批量采纳Echo并同步到图谱
5. **导出功能**: 支持导出图谱查询结果
