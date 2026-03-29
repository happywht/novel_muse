# Echo渐进式确认UI组件

## 概述

这套组件实现了Echo系统的渐进式确认UI，通过置信度分级和证据展示来提高AI提取的准确性。

## 组件结构

```
components/Echo/
├── echoUtils.ts           # 辅助函数和类型定义
├── EchoSummaryCard.tsx    # Phase 1: 轻量级摘要卡片（用于DraftingRoom）
├── EchoReviewPanel.tsx    # Phase 2: 审核面板（侧边栏）
├── EchoDeepReview.tsx     # Phase 3: 全屏深度审核模式
├── EchoDemo.tsx          # 使用示例
└── index.ts              # 导出文件
```

## 核心功能

### 1. 置信度分级

根据AI提取的confidence值（0-1），自动分为三个级别：

- **高置信度 (≥0.85)**: ✅ 自动采纳
  - 颜色：翡翠绿 (emerald)
  - 处理：自动标记为 AUTO_ACCEPTED

- **中置信度 (0.5-0.85)**: ⚠️ 需审核
  - 颜色：琥珀黄 (amber)
  - 处理：需要人工确认

- **低置信度 (<0.5)**: 🚫 已过滤
  - 颜色：暗灰 (slate)
  - 处理：默认不显示，可展开查看

### 2. 证据展示

每个Echo都会显示：

- **extractionEvidence**: 原文中支持此提取的具体句子
- **置信度进度条**: 可视化显示AI的确信程度
- **置信度百分比**: 精确到百分比

## 使用方法

### EchoSummaryCard（推荐用于DraftingRoom）

```tsx
import { EchoSummaryCard } from '../Echo';

<EchoSummaryCard
  echoes={extractedEchoes}
  isExtracting={isExtracting}
  onExtract={handleExtractEchoes}
  onAccept={handleAddEcho}
  onReject={(echo) => setExtractedEchoes((prev) => prev.filter((e) => e.id !== echo.id))}
  onSimulate={handleSimulatePropagation}
  onViewAll={() => navigateToEchoChamber()}
/>;
```

### EchoReviewPanel（用于侧边栏审核）

```tsx
import { EchoReviewPanel } from '../Echo';

<EchoReviewPanel
  echoes={pendingEchoes}
  chapters={chapters}
  characters={characters}
  onAccept={handleAcceptEcho}
  onReject={handleRejectEcho}
  onBatchAccept={handleBatchAccept}
  onBatchReject={handleBatchReject}
  onUpdate={handleUpdateEcho}
  onSimulate={handleSimulate}
  onClose={() => setShowPanel(false)}
  onOpenDeepReview={() => setShowDeepReview(true)}
/>;
```

### EchoDeepReview（Phase 3: 全屏深度审核模式）

```tsx
import { EchoDeepReview } from '../Echo';

const [showDeepReview, setShowDeepReview] = useState(false);

<EchoDeepReview
  isOpen={showDeepReview}
  onClose={() => setShowDeepReview(false)}
  echoes={echoes}
  chapters={chapters}
  characters={characters}
  onAccept={handleAcceptEcho}
  onReject={handleRejectEcho}
  onBatchAccept={handleBatchAccept}
  onBatchReject={handleBatchReject}
  onUpdate={handleUpdateEcho}
  onSimulate={handleSimulate}
/>;
```

#### EchoDeepReview 功能特性

1. **全屏模态框界面**
   - 从侧边栏点击"深度审核"按钮进入
   - ESC键或关闭按钮退出
   - Ctrl+A 快捷键全选

2. **多维度筛选**
   - 按章节筛选（下拉选择）
   - 按角色筛选（下拉选择）
   - 按置信度筛选（高/中/低）

3. **双栏布局**
   - 左侧：变更概览列表（支持多选、排序）
   - 右侧：详细编辑面板

4. **变更概览列表**
   - 显示筛选后的Echo列表
   - 每个Echo显示：状态图标、目标名称、描述、置信度
   - 支持多选和全选
   - 按时间或置信度排序

5. **详细编辑面板**
   - 显示选中Echo的完整信息
   - 可编辑描述和原因
   - 显示原文依据（extractionEvidence）
   - 置信度进度条
   - 操作按钮：采纳、拒绝、编辑、预演影响

6. **批量操作**
   - 全选当前筛选结果
   - 批量采纳/拒绝

### 辅助函数

```tsx
import { categorizeEchoes, getConfidenceConfig, autoAcceptHighConfidence } from '../Echo';

// 按置信度分类
const categorized = categorizeEchoes(echoes);
console.log(categorized.high); // 高置信度Echoes
console.log(categorized.medium); // 中置信度Echoes
console.log(categorized.low); // 低置信度Echoes

// 获取置信度配置
const config = getConfidenceConfig(0.9);
console.log(config.bg); // 'bg-emerald-900/20'
console.log(config.icon); // '✅'

// 自动采纳高置信度
const { accepted, remaining } = autoAcceptHighConfidence(echoes);
```

## 类型定义

```typescript
interface Echo {
  id: string;
  type: 'CHARACTER' | 'WORLD';
  targetId: string;
  targetName: string;
  description: string;
  reason: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'PREDICTION' | 'ARCHIVED' | 'AUTO_ACCEPTED';
  timestamp: number;
  // MVP: 准确性提升字段
  confidence?: number; // 0-1: AI置信度
  extractionEvidence?: string; // 原文依据
}

interface CategorizedEchoes {
  high: Echo[]; // 高置信度 (≥0.85)
  medium: Echo[]; // 中置信度 (0.5-0.85)
  low: Echo[]; // 低置信度 (<0.5)
  total: number;
}
```

## 设计规范

### 颜色方案

```typescript
// 高置信度 - 翡翠绿
const highConfidence = {
  bg: 'bg-emerald-900/20',
  border: 'border-emerald-500/50',
  text: 'text-emerald-400',
  icon: '✅',
};

// 中置信度 - 琥珀黄
const mediumConfidence = {
  bg: 'bg-amber-900/20',
  border: 'border-amber-500/50',
  text: 'text-amber-400',
  icon: '⚠️',
};

// 低置信度 - 暗灰
const lowConfidence = {
  bg: 'bg-slate-900/20',
  border: 'border-slate-700/50',
  text: 'text-slate-500',
  icon: '🚫',
};
```

### 动画效果

- **展开/折叠**: `animate-fade-in`
- **模态框进入**: `animate-scale-in`
- **悬停效果**: `hover:shadow-lg`, `hover:border-{color}-500/50`
- **过渡效果**: `transition-all`, `transition-colors`

## 键盘快捷键

### EchoDeepReview

- `ESC`: 关闭深度审核模式
- `Ctrl+A` / `Cmd+A`: 全选/取消全选当前筛选结果

## 性能优化

1. **使用useMemo**: 对echoes分类和过滤进行缓存
2. **虚拟滚动**: 在EchoReviewPanel中使用（可扩展）
3. **条件渲染**: 只在有内容时才渲染详细列表

## 后续优化方向

1. **批量操作**: 支持全选、反选等高级批量操作
2. **键盘快捷键**: 添加快捷键支持（Ctrl+A全选等）
3. **筛选器**: 按类型、置信度范围筛选
4. **排序**: 按置信度、时间、名称排序
5. **导出**: 导出Echo列表为JSON/CSV
6. **撤销**: 支持撤销最近的操作

## 测试建议

```bash
# 运行演示页面
# 在路由中添加 /echo-demo 路径，指向 EchoDemo 组件

# 测试场景
1. 高置信度Echo自动标记
2. 中置信度Echo需人工审核
3. 低置信度Echo被过滤
4. 批量操作功能
5. 蝴蝶效应预演
```

## 集成到现有系统

### 1. ForgeEditor集成（已完成）

在 `components/DraftingRoom/ForgeEditor.tsx` 中已集成EchoSummaryCard，替换了原有的"命运回响"区域。

### 2. useDraftingActions更新（已完成）

在 `components/DraftingRoom/useDraftingActions.ts` 中已更新：

- `handleExtractEchoes`: 支持confidence和extractionEvidence
- `triggerStateAnalysis`: 支持confidence和extractionEvidence

### 3. 类型定义（已完成）

在 `types.ts` 中已添加：

- `Echo.confidence`: number
- `Echo.extractionEvidence`: string
- `StateChangeRecommendation.confidence`: number
- `StateChangeRecommendation.extractionEvidence`: string

### 4. Gemini服务（已完成）

在 `services/gemini/world.ts` 中已更新：

- `analyzeStateChanges`: 返回confidence和extractionEvidence
- Schema定义已包含这两个字段

## 注意事项

1. **置信度默认值**: 如果AI没有返回confidence，默认为0.7（中置信度）
2. **证据可选**: extractionEvidence是可选字段，可能为空
3. **向后兼容**: 旧的Echo数据（没有confidence）会自动获得默认值0.7
4. **性能考虑**: 大量Echo时建议使用虚拟滚动
5. **用户引导**: 首次使用时建议显示置信度说明

## 贡献指南

如果需要扩展功能：

1. 在 `echoUtils.ts` 中添加辅助函数
2. 保持现有的颜色和动画规范
3. 确保TypeScript类型安全
4. 添加适当的注释和文档
5. 更新README.md
