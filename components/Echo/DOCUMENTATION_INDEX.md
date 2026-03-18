# Echo渐进式确认UI - 文档索引

## 项目概览

本目录包含Echo系统渐进式确认UI的完整实现，包括组件代码、文档和示例。

## 文件结构

```
components/Echo/
├── 📦 核心组件
│   ├── echoUtils.ts              # 辅助函数和类型定义
│   ├── EchoSummaryCard.tsx       # 摘要卡片组件
│   ├── EchoReviewPanel.tsx       # 审核面板组件
│   ├── EchoDemo.tsx              # 演示组件
│   └── index.ts                  # 导出文件
│
├── 📚 文档
│   ├── README.md                 # 使用指南（从这里开始）
│   ├── QUICKSTART.md             # 快速入门（5分钟上手）
│   ├── IMPLEMENTATION.md         # 实施总结（技术细节）
│   ├── CHANGELOG.md              # 变更清单（部署指南）
│   ├── SUMMARY.md                # 完成报告（项目总结）
│   ├── VISUAL_PREVIEW.txt        # 视觉预览（UI设计）
│   └── DOCUMENTATION_INDEX.md    # 本文件（文档导航）
│
└── 🎯 总计
    ├── 代码文件: 5个 (~710行)
    └── 文档文件: 7个 (~50KB)
```

## 快速导航

### 🚀 我想快速开始
→ 阅读 [QUICKSTART.md](./QUICKSTART.md)
- 5分钟快速入门
- 常见场景示例
- 代码片段参考

### 📖 我想了解如何使用
→ 阅读 [README.md](./README.md)
- 组件API文档
- 使用方法
- 最佳实践
- 类型定义

### 🔧 我想了解实现细节
→ 阅读 [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- 完整实现细节
- 技术亮点
- 性能指标
- 测试结果

### 📋 我想查看变更内容
→ 阅读 [CHANGELOG.md](./CHANGELOG.md)
- 详细文件变更
- 部署步骤
- 回滚计划
- 监控指标

### ✅ 我想查看项目总结
→ 阅读 [SUMMARY.md](./SUMMARY.md)
- 执行摘要
- 核心成果
- 用户价值
- 推荐行动

### 🎨 我想查看UI设计
→ 阅读 [VISUAL_PREVIEW.txt](./VISUAL_PREVIEW.txt)
- ASCII art界面展示
- 交互流程图
- 颜色方案
- 动画效果

### 💡 我想查看示例代码
→ 查看 [EchoDemo.tsx](./EchoDemo.tsx)
- 完整演示组件
- 示例数据
- 交互示例
- 统计展示

## 组件文档

### 1. EchoSummaryCard

**用途**: 在DraftingRoom中显示Echo摘要

**位置**: `EchoSummaryCard.tsx`

**Props**:
```typescript
interface EchoSummaryCardProps {
  echoes: Echo[];                  // Echo数组
  isExtracting?: boolean;          // 是否正在提取
  onExtract?: () => void;          // 提取回调
  onAccept?: (echo: Echo) => void; // 采纳回调
  onReject?: (echo: Echo) => void; // 拒绝回调
  onSimulate?: (targetName: string, description: string) => void; // 蝴蝶效应预演
  onViewAll?: () => void;          // 查看全部回调
}
```

**示例**:
```tsx
<EchoSummaryCard
  echoes={extractedEchoes}
  isExtracting={isExtracting}
  onExtract={handleExtractEchoes}
  onAccept={handleAddEcho}
  onReject={(echo) => setExtractedEchoes(prev => prev.filter(e => e.id !== echo.id))}
/>
```

### 2. EchoReviewPanel

**用途**: 侧边栏审核面板，支持批量操作

**位置**: `EchoReviewPanel.tsx`

**Props**:
```typescript
interface EchoReviewPanelProps {
  echoes: Echo[];                  // Echo数组
  onAccept: (echo: Echo) => void;  // 采纳回调
  onReject: (echo: Echo) => void;  // 拒绝回调
  onBatchAccept?: (echoes: Echo[]) => void; // 批量采纳
  onBatchReject?: (echoes: Echo[]) => void; // 批量拒绝
  onClose?: () => void;            // 关闭回调
}
```

**示例**:
```tsx
<EchoReviewPanel
  echoes={pendingEchoes}
  onAccept={handleAccept}
  onReject={handleReject}
  onBatchAccept={handleBatchAccept}
  onBatchReject={handleBatchReject}
/>
```

### 3. 辅助函数

**位置**: `echoUtils.ts`

**主要函数**:
- `categorizeEchoes(echoes)`: 按置信度分类
- `getConfidenceConfig(confidence)`: 获取显示配置
- `getConfidenceBarColor(confidence)`: 获取进度条颜色
- `formatConfidence(confidence)`: 格式化百分比
- `autoAcceptHighConfidence(echoes)`: 自动采纳高置信度

**示例**:
```tsx
import { categorizeEchoes, getConfidenceConfig } from '../Echo';

const categorized = categorizeEchoes(echoes);
console.log(categorized.high.length);  // 高置信度数量

const config = getConfidenceConfig(0.92);
console.log(config.icon);  // '✅'
```

## 核心概念

### 置信度分级

```
┌─────────────────────────────────────┐
│  高置信度 (≥0.85)                   │
│  ✅ 自动采纳                        │
│  颜色: 翡翠绿 (emerald)             │
│  处理: AUTO_ACCEPTED                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  中置信度 (0.5-0.85)                │
│  ⚠️ 需审核                          │
│  颜色: 琥珀黄 (amber)               │
│  处理: PENDING (需人工确认)         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  低置信度 (<0.5)                    │
│  🚫 已过滤                          │
│  颜色: 暗灰 (slate)                 │
│  处理: 默认不显示                   │
└─────────────────────────────────────┘
```

### 数据流

```
1. 用户生成场景
     ↓
2. AI提取状态变更
     - 分析文本
     - 识别重大事件
     - 计算置信度
     - 提取证据
     ↓
3. 显示EchoSummaryCard
     - 分类显示
     - 置信度可视化
     - 证据展示
     ↓
4. 用户审核
     - 查看高置信度（自动采纳）
     - 审核中置信度（需确认）
     - 可选查看低置信度
     ↓
5. 采纳/拒绝
     - 单个操作
     - 批量操作
     - 更新项目状态
```

## 集成指南

### 已集成位置

1. **DraftingRoom/ForgeEditor.tsx** ✅
   - 集成了EchoSummaryCard
   - 替换了旧的Echo区域
   - 支持新的置信度字段

2. **DraftingRoom/useDraftingActions.ts** ✅
   - 更新了handleExtractEchoes
   - 更新了triggerStateAnalysis
   - 支持confidence和extractionEvidence

### 可扩展位置

1. **EchoChamber.tsx**
   - 可以集成EchoReviewPanel
   - 添加批量操作支持
   - 增强审核功能

2. **KnowledgeGraph.tsx**
   - 显示Echo的影响
   - 可视化状态变更
   - 展示关联关系

## 开发指南

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器
npm run dev

# 3. 访问演示页面
# 添加路由到 EchoDemo 组件
```

### 构建和部署

```bash
# 1. 代码检查
npm run lint

# 2. 类型检查
npm run type-check

# 3. 构建
npm run build

# 4. 部署
npm run deploy
```

### 测试

```bash
# 单元测试
npm run test

# E2E测试
npm run test:e2e

# 性能测试
npm run test:perf
```

## 常见问题

### Q1: 如何修改置信度阈值？
**A**: 修改 `echoUtils.ts` 中的 `CONFIDENCE_LEVELS` 配置

### Q2: 如何自定义颜色方案？
**A**: 修改 `CONFIDENCE_LEVELS` 中的 `bg`、`border`、`text` 属性

### Q3: 如何添加新的操作按钮？
**A**: 在组件中添加新的props和按钮，参考现有实现

### Q4: 如何处理大量Echo？
**A**: 使用虚拟滚动（react-window）或分页加载

### Q5: 如何导出Echo数据？
**A**: 使用 `JSON.stringify(echoes)` 或实现导出功能

## 性能优化

### 当前优化
- ✅ useMemo缓存分类结果
- ✅ 条件渲染减少DOM
- ✅ 轻量级实现（无额外依赖）

### 建议优化
- ⚪ 虚拟滚动（100+ Echo时）
- ⚪ Web Worker处理分类
- ⚪ IndexedDB本地缓存

## 版本历史

### v1.0.0 (2026-03-18)
- ✅ 初始实现
- ✅ EchoSummaryCard组件
- ✅ EchoReviewPanel组件
- ✅ 辅助函数库
- ✅ 完整文档

## 贡献指南

### 代码规范
- 遵循TypeScript最佳实践
- 使用函数式组件
- 添加适当的注释
- 编写单元测试

### 文档规范
- 保持文档更新
- 添加代码示例
- 使用清晰的标题
- 提供截图或示意图

## 支持和反馈

### 获取帮助
1. 查看文档（README.md, QUICKSTART.md）
2. 查看示例代码（EchoDemo.tsx）
3. 联系前端团队

### 报告问题
1. 检查已知问题列表
2. 搜索历史问题
3. 创建新issue（包含复现步骤）

### 提供建议
1. 描述使用场景
2. 说明期望行为
3. 提供设计建议

## 许可证

内部项目，仅供团队使用。

---

**文档版本**: 1.0.0
**最后更新**: 2026-03-18
**维护者**: 前端开发团队

## 快速链接

| 文档 | 用途 | 阅读时间 |
|------|------|---------|
| [QUICKSTART.md](./QUICKSTART.md) | 快速入门 | 5分钟 |
| [README.md](./README.md) | 使用指南 | 10分钟 |
| [IMPLEMENTATION.md](./IMPLEMENTATION.md) | 实施细节 | 15分钟 |
| [CHANGELOG.md](./CHANGELOG.md) | 变更清单 | 10分钟 |
| [SUMMARY.md](./SUMMARY.md) | 项目总结 | 5分钟 |
| [VISUAL_PREVIEW.txt](./VISUAL_PREVIEW.txt) | UI设计 | 5分钟 |

**总阅读时间**: 约50分钟（建议按需阅读）
