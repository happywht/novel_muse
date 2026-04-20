# Echo渐进式确认UI - 快速入门指南

## 5分钟快速开始

### 1. 基础使用 - EchoSummaryCard

```tsx
import { EchoSummaryCard } from '../Echo';
import { Echo } from '../../types';

const MyComponent = () => {
  const [echoes, setEchoes] = useState<Echo[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);

  const handleExtract = async () => {
    setIsExtracting(true);
    // 调用AI提取服务
    const extracted = await analyzeStateChanges(content, characters, settings);
    setEchoes(extracted);
    setIsExtracting(false);
  };

  const handleAccept = (echo: Echo) => {
    // 采纳逻辑
    updateProject({ echoes: [...project.echoes, { ...echo, status: 'ACCEPTED' }] });
    setEchoes(prev => prev.filter(e => e.id !== echo.id));
  };

  return (
    <EchoSummaryCard
      echoes={echoes}
      isExtracting={isExtracting}
      onExtract={handleExtract}
      onAccept={handleAccept}
      onReject={(echo) => setEchoes(prev => prev.filter(e => e.id !== echo.id))}
    />
  );
};
```

### 2. 审核面板 - EchoReviewPanel

```tsx
import { EchoReviewPanel } from '../Echo';

const ReviewPage = () => {
  const [pendingEchoes, setPendingEchoes] = useState<Echo[]>([]);

  const handleBatchAccept = (selected: Echo[]) => {
    // 批量采纳
    updateProject({
      echoes: [...project.echoes, ...selected.map(e => ({ ...e, status: 'ACCEPTED' }))]
    });
    setPendingEchoes(prev => prev.filter(e => !selected.find(s => s.id === e.id)));
  };

  return (
    <EchoReviewPanel
      echoes={pendingEchoes}
      onAccept={(echo) => {/* 单个采纳 */}}
      onReject={(echo) => {/* 单个拒绝 */}}
      onBatchAccept={handleBatchAccept}
      onBatchReject={(selected) => {/* 批量拒绝 */}}
    />
  );
};
```

### 3. 辅助函数使用

```tsx
import { categorizeEchoes, getConfidenceConfig } from '../Echo';

const MyAnalysis = () => {
  const echoes = [...]; // 你的Echo数组

  // 分类
  const categorized = categorizeEchoes(echoes);
  console.log('高置信度:', categorized.high.length);
  console.log('待审核:', categorized.medium.length);
  console.log('低置信度:', categorized.low.length);

  // 获取配置
  const config = getConfidenceConfig(0.92);
  console.log('颜色:', config.bg);    // 'bg-emerald-900/20'
  console.log('图标:', config.icon);  // '✅'

  return (
    <div>
      高置信度: {categorized.high.length} 个
      待审核: {categorized.medium.length} 个
    </div>
  );
};
```

## 常见场景

### 场景1: 集成到现有页面

```tsx
// 在你的页面组件中
import { EchoSummaryCard } from '../Echo';

const DraftingPage = () => {
  // ... 现有代码

  return (
    <div>
      {/* 你的内容 */}
      <div className="editor-content">
        {/* 编辑器内容 */}
      </div>

      {/* 添加EchoSummaryCard */}
      {generatedContent && (
        <EchoSummaryCard
          echoes={extractedEchoes}
          isExtracting={isExtracting}
          onExtract={handleExtractEchoes}
          onAccept={handleAddEcho}
          onReject={(echo) => setExtractedEchoes(prev => prev.filter(e => e.id !== echo.id))}
        />
      )}
    </div>
  );
};
```

### 场景2: 创建独立的审核页面

```tsx
import { EchoReviewPanel } from '../Echo';

const EchoReviewPage = () => {
  const [echoes, setEchoes] = useState<Echo[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');

  useEffect(() => {
    // 加载待审核的Echoes
    const pending = project.echoes.filter(e => e.status === 'PENDING');
    setEchoes(pending);
  }, []);

  const handleAccept = (echo: Echo) => {
    updateProject({
      echoes: project.echoes.map(e =>
        e.id === echo.id ? { ...e, status: 'ACCEPTED' } : e
      )
    });
    setEchoes(prev => prev.filter(e => e.id !== echo.id));
  };

  return (
    <div className="flex h-screen">
      <div className="flex-1">
        {/* 主内容区 */}
      </div>
      <div className="w-1/3">
        <EchoReviewPanel
          echoes={echoes}
          onAccept={handleAccept}
          onReject={(echo) => {
            updateProject({
              echoes: project.echoes.map(e =>
                e.id === echo.id ? { ...e, status: 'REJECTED' } : e
              )
            });
            setEchoes(prev => prev.filter(e => e.id !== echo.id));
          }}
        />
      </div>
    </div>
  );
};
```

### 场景3: 自定义置信度阈值

```tsx
import { categorizeEchoes } from '../Echo';

const CustomThresholdComponent = () => {
  const echoes = [...];

  // 自定义分类逻辑
  const customCategorize = (echoes: Echo[]) => {
    return {
      veryHigh: echoes.filter(e => (e.confidence || 0) >= 0.95),
      high: echoes.filter(e => (e.confidence || 0) >= 0.85 && (e.confidence || 0) < 0.95),
      medium: echoes.filter(e => (e.confidence || 0) >= 0.6 && (e.confidence || 0) < 0.85),
      low: echoes.filter(e => (e.confidence || 0) < 0.6)
    };
  };

  const categorized = customCategorize(echoes);

  return (
    <div>
      <div>非常确定: {categorized.veryHigh.length}</div>
      <div>高置信度: {categorized.high.length}</div>
      <div>中等: {categorized.medium.length}</div>
      <div>低: {categorized.low.length}</div>
    </div>
  );
};
```

## 数据结构

### Echo类型定义

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
  triples?: KnowledgeTriple[];
  branchId?: string;

  // MVP: 准确性提升字段（重要！）
  confidence?: number;           // 0-1: AI置信度
  extractionEvidence?: string;   // 原文依据
}
```

### 创建示例Echo

```typescript
const exampleEcho: Echo = {
  id: Date.now().toString(),
  type: 'CHARACTER',
  targetId: 'char-001',
  targetName: '李明',
  description: '左臂在战斗中受重伤',
  reason: '与反派对决时被剑刺中',
  status: 'PENDING',
  timestamp: Date.now(),
  confidence: 0.92,
  extractionEvidence: '李明感到一阵剧痛，反派的剑已经刺穿了他的左臂，鲜血喷涌而出。'
};
```

## 样式定制

### 自定义颜色方案

```tsx
import { CONFIDENCE_LEVELS } from '../Echo';

// 查看默认配置
console.log(CONFIDENCE_LEVELS.HIGH);
// {
//   level: 'HIGH',
//   label: '高置信度',
//   bg: 'bg-emerald-900/20',
//   border: 'border-emerald-500/50',
//   text: 'text-emerald-400',
//   icon: '✅',
//   threshold: { min: 0.85, max: 1.0 }
// }

// 使用自定义样式
const CustomEchoCard = ({ echo }) => {
  const confidence = echo.confidence || 0.7;
  const customBg = confidence >= 0.9 ? 'bg-green-900/30' : 'bg-yellow-900/30';

  return (
    <div className={`p-4 rounded-lg ${customBg}`}>
      {echo.description}
    </div>
  );
};
```

## 性能优化

### 1. 使用useMemo缓存分类结果

```tsx
import { useMemo } from 'react';
import { categorizeEchoes } from '../Echo';

const OptimizedComponent = ({ echoes }) => {
  // 缓存分类结果，避免重复计算
  const categorized = useMemo(() => categorizeEchoes(echoes), [echoes]);

  return (
    <div>
      高置信度: {categorized.high.length}
      待审核: {categorized.medium.length}
    </div>
  );
};
```

### 2. 虚拟滚动（大量Echo时）

```tsx
import { FixedSizeList } from 'react-window';

const VirtualizedEchoList = ({ echoes }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <EchoItem echo={echoes[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={echoes.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

## 调试技巧

### 1. 检查Echo数据

```tsx
const DebugEcho = ({ echo }) => {
  console.log('Echo data:', {
    id: echo.id,
    name: echo.targetName,
    confidence: echo.confidence,
    evidence: echo.extractionEvidence
  });

  return <EchoSummaryCard echoes={[echo]} />;
};
```

### 2. 验证置信度范围

```tsx
const validateConfidence = (confidence: number | undefined): number => {
  if (confidence === undefined) return 0.7; // 默认值
  if (confidence < 0) return 0;
  if (confidence > 1) return 1;
  return confidence;
};

const SafeEchoCard = ({ echo }) => {
  const safeConfidence = validateConfidence(echo.confidence);
  // 使用safeConfidence进行后续操作
};
```

## 常见问题

### Q1: Echo没有显示置信度进度条？
**A**: 检查echo.confidence是否存在。如果AI未返回confidence，默认为0.7。

```tsx
// 确保Echo包含confidence字段
const echo = {
  // ...其他字段
  confidence: 0.85  // 确保这个字段存在
};
```

### Q2: 如何修改置信度阈值？
**A**: 使用categorizeEchoes后手动分类：

```tsx
const customCategorize = (echoes: Echo[]) => {
  const HIGH_THRESHOLD = 0.9;  // 自定义阈值
  const MEDIUM_THRESHOLD = 0.6;

  return {
    high: echoes.filter(e => (e.confidence || 0.7) >= HIGH_THRESHOLD),
    medium: echoes.filter(e => {
      const conf = e.confidence || 0.7;
      return conf >= MEDIUM_THRESHOLD && conf < HIGH_THRESHOLD;
    }),
    low: echoes.filter(e => (e.confidence || 0.7) < MEDIUM_THRESHOLD),
    total: echoes.length
  };
};
```

### Q3: 批量操作后如何更新UI？
**A**: 从state中移除已处理的Echo：

```tsx
const handleBatchAccept = (selected: Echo[]) => {
  const selectedIds = new Set(selected.map(e => e.id));

  // 更新项目
  updateProject({
    echoes: [...project.echoes, ...selected.map(e => ({ ...e, status: 'ACCEPTED' }))]
  });

  // 从本地state移除
  setLocalEchoes(prev => prev.filter(e => !selectedIds.has(e.id)));
};
```

## 下一步

1. 查看 `EchoDemo.tsx` 了解完整示例
2. 阅读 `README.md` 了解详细文档
3. 参考 `IMPLEMENTATION.md` 了解实现细节
4. 查看 `VISUAL_PREVIEW.txt` 了解UI设计

## 获取帮助

- 查看 README.md 获取详细文档
- 查看 IMPLEMENTATION.md 了解实现细节
- 查看 EchoDemo.tsx 查看完整示例
- 联系前端开发团队

---

**最后更新**: 2026-03-18
**版本**: 1.0.0
