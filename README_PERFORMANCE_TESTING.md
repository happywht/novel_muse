# 性能测试快速开始指南

## 🚀 快速开始

### 1. 运行所有性能测试

```bash
npm run test:performance
```

这将运行所有性能测试套件并生成详细报告。

### 2. 设置性能基准

```bash
npm run test:performance:baseline
```

运行此命令将当前性能结果设为基准，用于后续对比。

### 3. 运行Lighthouse审计

```bash
# 首先启动开发服务器
npm run dev

# 在另一个终端运行Lighthouse审计
npm run test:lighthouse
```

## 📊 性能测试套件

### 页面加载性能测试
测试应用的首次加载性能，包括：
- 首次内容绘制 (FCP)
- 最大内容绘制 (LCP)
- 累积布局偏移 (CLS)
- 首次输入延迟 (FID)
- Time to First Byte (TTFB)

### 组件渲染性能测试
测试React组件的渲染性能，包括：
- 初始渲染性能
- 组件更新性能
- 大数据量处理
- 虚拟化列表性能
- React优化技术效果

### API性能测试
测试后端API的性能，包括：
- 单个请求响应时间
- 并发请求处理
- 批量操作性能
- 错误处理和重试
- 缓存效果

### 内存泄漏检测
检测应用程序的内存问题，包括：
- 定时器泄漏
- 事件监听器泄漏
- DOM节点泄漏
- 闭包泄漏
- 内存使用趋势

## 📈 性能报告

测试完成后，报告将保存在以下位置：

```
reports/
├── performance/
│   ├── report-[timestamp].json    # JSON格式详细数据
│   ├── report-[timestamp].html    # 可视化HTML报告
│   └── report-[timestamp].md      # Markdown格式摘要
└── lighthouse/
    ├── summary-[timestamp].json   # Lighthouse审计摘要
    ├── summary-[timestamp].html   # 可视化报告
    └── [route]-[timestamp].json   # 各路由详细报告
```

## 🎯 性能目标

### Core Web Vitals

| 指标 | 良好 | 需改进 | 差 |
|------|------|--------|-----|
| FCP | < 1.8s | < 3.0s | > 3.0s |
| LCP | < 2.5s | < 4.0s | > 4.0s |
| CLS | < 0.1 | < 0.25 | > 0.25 |
| FID | < 100ms | < 300ms | > 300ms |
| TTFB | < 800ms | < 1.8s | > 1.8s |

### 组件渲染性能

| 场景 | 目标时间 | 最大时间 |
|------|----------|----------|
| 简单组件 | < 50ms | < 100ms |
| 100项列表 | < 200ms | < 500ms |
| 1000项列表 | < 1000ms | < 2000ms |
| 状态更新 | < 16ms | < 50ms |

### API性能

| 操作 | 目标响应时间 | 最大响应时间 |
|------|-------------|-------------|
| GET请求 | < 200ms | < 500ms |
| POST请求 | < 300ms | < 800ms |
| 并发10请求 | < 500ms | < 1000ms |
| 并发100请求 | < 2000ms | < 5000ms |

## 🔧 单独运行特定测试

### 运行页面加载性能测试

```bash
npx vitest run tests/performance/page-load-performance.test.ts
```

### 运行组件渲染性能测试

```bash
npx vitest run tests/performance/component-rendering-performance.test.ts
```

### 运行API性能测试

```bash
npx vitest run tests/performance/api-performance.test.ts
```

### 运行内存泄漏检测

```bash
npx vitest run tests/performance/memory-leak-detection.test.ts
```

## 📝 性能优化建议

### 1. 代码分割

```typescript
// 路由级别的代码分割
const CharacterModule = lazy(() => import('./components/modules/character'));
```

### 2. 组件优化

```typescript
// 使用React.memo
const MemoizedComponent = React.memo(({ data }) => {
  // 组件实现
});

// 使用useMemo和useCallback
const Component = ({ items }) => {
  const sortedItems = useMemo(() => {
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const handleClick = useCallback((id) => {
    // 处理点击
  }, []);

  return <div>{/* 组件内容 */}</div>;
};
```

### 3. 虚拟化长列表

```typescript
import { FixedSizeList } from 'react-window';

const VirtualizedList = ({ items }) => {
  const Row = ({ index, style }) => (
    <div style={style}>{items[index].name}</div>
  );

  return (
    <FixedSizeList
      height={600}
      itemCount={items.length}
      itemSize={50}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

### 4. 图片优化

```typescript
<img
  src="/api/image-resize?width=800&quality=80"
  loading="lazy"
  decoding="async"
  alt="Optimized image"
/>
```

## 🚨 性能告警

当性能出现回归时，测试会自动发出告警：

```
⚠️ 性能回归检测:
  - 页面加载性能: +15.5% (1500ms → 1733ms)
  - API响应时间: +12.3% (200ms → 225ms)
```

## 📚 详细文档

更多详细信息请参阅 [完整性能测试文档](./docs/PERFORMANCE_TESTING.md)

## 🔗 相关资源

- [Web Vitals](https://web.dev/vitals/)
- [React性能优化](https://react.dev/learn/render-and-commit)
- [Lighthouse文档](https://github.com/GoogleChrome/lighthouse)
- [Vitest文档](https://vitest.dev/)

---

**注意**: 性能测试结果可能因硬件、网络状况等因素有所不同。建议在一致的环境中运行测试，并多次运行取平均值以获得准确结果。
