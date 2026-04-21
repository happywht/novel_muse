# 性能测试文档

## 📋 目录

- [概述](#概述)
- [测试架构](#测试架构)
- [性能测试类型](#性能测试类型)
- [安装和配置](#安装和配置)
- [运行测试](#运行测试)
- [性能基准](#性能基准)
- [性能优化建议](#性能优化建议)
- [故障排除](#故障排除)

## 概述

性能测试套件为小说架构师项目提供全面的性能监控和优化工具，包括：

- **页面加载性能测试**: 测试首次内容绘制、最大内容绘制、累积布局偏移等关键指标
- **组件渲染性能测试**: 测试React组件的渲染、更新和交互性能
- **API性能测试**: 测试API响应时间、并发处理和错误处理性能
- **内存泄漏检测**: 检测应用程序的内存使用情况和潜在泄漏点
- **Lighthouse集成**: 自动化性能审计和报告生成

## 测试架构

### 目录结构

```
tests/
performance/
├── setup.ts                          # 性能测试设置和工具函数
├── page-load-performance.test.ts     # 页面加载性能测试
├── component-rendering-performance.test.ts  # 组件渲染性能测试
├── api-performance.test.ts           # API性能测试
└── memory-leak-detection.test.ts     # 内存泄漏检测测试

scripts/
├── performance-test.ts               # 性能测试运行脚本
└── lighthouse-runner.ts              # Lighthouse审计脚本

reports/
├── performance/                      # 性能测试报告
│   ├── report-*.json                # JSON格式报告
│   ├── report-*.html                # HTML格式报告
│   └── baseline.json                # 性能基准数据
└── lighthouse/                       # Lighthouse审计报告
    ├── summary-*.json               # 审计摘要
    ├── summary-*.html               # HTML报告
    └── [route]-*.json               # 各路由详细报告
```

### 核心组件

#### 1. PerformanceTestUtils

提供性能测试的通用工具函数：

```typescript
// 测量函数执行时间
const { result, duration } = await measureExecutionTime(
  async () => await someAsyncOperation(),
  'operation-name'
);

// 测量内存使用
const memory = measureMemoryUsage();

// 模拟API调用
await simulateAPICall('/api/test', 100, 200);

// 批量性能测试
const results = await runBatchPerformanceTest(tests, iterations);
```

#### 2. PerformanceAssertions

性能相关的断言工具：

```typescript
// 断言执行时间
assertExecutionTime(duration, threshold);

// 断言性能回归
assertPerformanceRegression(current, baseline, threshold);

// 断言内存使用
assertMemoryUsage(usedMemory, threshold);

// 断言吞吐量
assertThroughput(operations, duration, minimumThroughput);
```

#### 3. 性能监控器

集成的性能监控系统：

```typescript
import { performanceMonitor } from './services/monitoring/performanceMonitor';

// 开始监控
performanceMonitor.startMonitoring();

// 记录自定义指标
performanceMonitor.recordMetric('custom-metric', value);

// 获取性能报告
const report = performanceMonitor.getReport();

// 导出性能数据
const data = performanceMonitor.exportData();
```

## 性能测试类型

### 1. 页面加载性能测试

#### Core Web Vitals

| 指标 | 良好 | 需改进 | 差 |
|------|------|--------|-----|
| FCP (First Contentful Paint) | < 1.8s | < 3.0s | > 3.0s |
| LCP (Largest Contentful Paint) | < 2.5s | < 4.0s | > 4.0s |
| CLS (Cumulative Layout Shift) | < 0.1 | < 0.25 | > 0.25 |
| FID (First Input Delay) | < 100ms | < 300ms | > 300ms |
| TTFB (Time to First Byte) | < 800ms | < 1.8s | > 1.8s |

#### 测试覆盖

- ✅ 首次内容绘制 (FCP)
- ✅ 最大内容绘制 (LCP)
- ✅ 累积布局偏移 (CLS)
- ✅ 首次输入延迟 (FID)
- ✅ Time to First Byte (TTFB)
- ✅ 资源加载性能
- ✅ 路由切换性能
- ✅ 渐进式加载
- ✅ 网络条件模拟
- ✅ 缓存性能

### 2. 组件渲染性能测试

#### 测试场景

- **初始渲染**: 测试组件首次渲染的性能
- **组件更新**: 测试组件状态更新的性能
- **大量数据**: 测试处理大量数据的性能
- **虚拟化**: 测试虚拟化列表的性能
- **React优化**: 测试memo、useMemo、useCallback的优化效果
- **并发特性**: 测试useTransition和useDeferredValue的性能

#### 性能基准

| 场景 | 目标时间 | 最大时间 |
|------|----------|----------|
| 简单组件渲染 | < 50ms | < 100ms |
| 100项列表渲染 | < 200ms | < 500ms |
| 1000项列表渲染 | < 1000ms | < 2000ms |
| 状态更新 | < 16ms | < 50ms |
| 路由切换 | < 200ms | < 500ms |

### 3. API性能测试

#### 测试类型

- **单个请求**: 测试单个API请求的响应时间
- **并发请求**: 测试处理并发请求的能力
- **批量操作**: 测试批量API操作的性能
- **错误处理**: 测试错误处理和重试机制
- **缓存效果**: 测试缓存对性能的影响

#### 性能目标

| 操作 | 目标响应时间 | 最大响应时间 |
|------|-------------|-------------|
| GET请求 | < 200ms | < 500ms |
| POST请求 | < 300ms | < 800ms |
| PUT请求 | < 300ms | < 800ms |
| DELETE请求 | < 200ms | < 500ms |
| 并发10请求 | < 500ms | < 1000ms |
| 并发100请求 | < 2000ms | < 5000ms |

### 4. 内存泄漏检测

#### 检测项目

- ✅ 定时器清理
- ✅ 事件监听器清理
- ✅ DOM节点引用
- ✅ 闭包泄漏
- ✅ 组件状态清理
- ✅ 第三方库泄漏

#### 内存使用限制

| 场景 | 内存限制 | 说明 |
|------|----------|------|
| 简单组件 | < 10MB | 单个组件的内存使用 |
| 列表组件 | < 50MB | 包含大量数据的组件 |
| 页面总内存 | < 200MB | 整个页面的内存使用 |
| 内存增长 | < 30% | 多次操作后的内存增长率 |

## 安装和配置

### 1. 安装依赖

```bash
# 安装开发和测试依赖
npm install --save-dev

# 或使用pnpm
pnpm install --save-dev
```

### 2. 配置测试环境

确保 `vitest.config.ts` 包含以下配置：

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30000, // 性能测试需要更长的超时时间
  },
});
```

### 3. 安装Lighthouse (可选)

```bash
npm install -g lighthouse

# 或作为开发依赖
npm install --save-dev lighthouse
```

## 运行测试

### 1. 运行所有性能测试

```bash
# 使用npm
npm run test:performance

# 使用pnpm
pnpm test:performance

# 直接运行脚本
npx ts-node scripts/performance-test.ts
```

### 2. 运行特定测试套件

```bash
# 页面加载性能测试
npx vitest run tests/performance/page-load-performance.test.ts

# 组件渲染性能测试
npx vitest run tests/performance/component-rendering-performance.test.ts

# API性能测试
npx vitest run tests/performance/api-performance.test.ts

# 内存泄漏检测
npx vitest run tests/performance/memory-leak-detection.test.ts
```

### 3. 设置性能基准

```bash
# 设置新的性能基准
npm run test:performance -- --set-baseline

# 或使用脚本
npx ts-node scripts/performance-test.ts --set-baseline
```

### 4. 运行Lighthouse审计

```bash
# 运行Lighthouse审计（需要先启动开发服务器）
npm run dev  # 在另一个终端
npx ts-node scripts/lighthouse-runner.ts

# 指定自定义URL
npx ts-node scripts/lighthouse-runner.ts --url=http://localhost:3000
```

### 5. 生成性能报告

测试运行后会自动生成以下报告：

- **JSON报告**: 机器可读的详细数据
- **HTML报告**: 可视化的性能报告
- **Markdown报告**: 适合文档的性能摘要

报告保存在以下目录：

```
reports/
├── performance/           # 性能测试报告
│   ├── report-*.json
│   ├── report-*.html
│   └── report-*.md
└── lighthouse/           # Lighthouse审计报告
    ├── summary-*.json
    ├── summary-*.html
    └── summary-*.md
```

## 性能基准

### 建立性能基准

性能基准用于对比不同版本之间的性能变化：

```bash
# 1. 设置基准
npm run test:performance -- --set-baseline

# 2. 运行测试并对比
npm run test:performance

# 3. 查看对比结果
cat reports/performance/report-*.html
```

### 基准数据结构

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "results": [
    {
      "name": "页面加载性能测试",
      "status": "pass",
      "duration": 1500,
      "metrics": {
        "fcp": 1200,
        "lcp": 2000,
        "cls": 0.05
      }
    }
  ]
}
```

### 性能回归检测

当性能回归超过阈值（默认10%）时，测试会发出警告：

```
⚠️ 性能回归检测:
  - 页面加载性能: +15.5% (1500ms → 1733ms)
  - API响应时间: +12.3% (200ms → 225ms)
```

## 性能优化建议

### 1. 页面加载优化

#### 代码分割

```typescript
// 懒加载路由组件
const CharacterModule = lazy(() => import('./components/modules/character'));

// 懒加载大型组件
const HeavyComponent = lazy(() => import('./components/HeavyComponent'));
```

#### 资源优化

```typescript
// 图片优化
<img
  src="/api/image-resize?width=800&quality=80"
  loading="lazy"
  decoding="async"
/>

// 字体优化
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
```

#### 预加载关键资源

```typescript
// 预加载重要数据
useEffect(() => {
  prefetchData('/api/characters');
}, []);
```

### 2. 组件渲染优化

#### 使用React.memo

```typescript
const ExpensiveComponent = React.memo(({ data }) => {
  // 组件实现
}, (prevProps, nextProps) => {
  // 自定义比较函数
  return prevProps.data.id === nextProps.data.id;
});
```

#### 使用useMemo和useCallback

```typescript
const MemoizedComponent = ({ items, onSelect }) => {
  // 缓存计算结果
  const sortedItems = useMemo(() => {
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  // 缓存回调函数
  const handleClick = useCallback((id) => {
    onSelect(id);
  }, [onSelect]);

  return <div>{/* 组件内容 */}</div>;
};
```

#### 虚拟化长列表

```typescript
import { FixedSizeList } from 'react-window';

const VirtualizedList = ({ items }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      {items[index].name}
    </div>
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

### 3. API性能优化

#### 请求批处理

```typescript
// 批处理API请求
const batchAPI = {
  requests: [],
  timer: null,

  addRequest(request) {
    this.requests.push(request);

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.flush();
    }, 50); // 50ms批处理窗口
  },

  async flush() {
    const responses = await Promise.all(
      this.requests.map(req => fetch(req.url, req.options))
    );

    this.requests = [];
    return responses;
  }
};
```

#### 请求节流和防抖

```typescript
// 节流
const throttledFetch = throttle(async (url) => {
  return await fetch(url);
}, 1000);

// 防抖
const debouncedSearch = debounce(async (query) => {
  return await searchAPI(query);
}, 300);
```

#### 响应缓存

```typescript
const cache = new Map();

async function cachedFetch(url) {
  if (cache.has(url)) {
    return cache.get(url);
  }

  const response = await fetch(url);
  const data = await response.json();

  cache.set(url, data);

  // 设置缓存过期
  setTimeout(() => {
    cache.delete(url);
  }, 60000); // 1分钟

  return data;
}
```

### 4. 内存优化

#### 清理副作用

```typescript
const Component = () => {
  useEffect(() => {
    const subscription = dataSource.subscribe();

    // 清理函数
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <div>{/* 组件内容 */}</div>;
};
```

#### 避免内存泄漏

```typescript
// 正确的事件监听器清理
const Component = () => {
  useEffect(() => {
    const handleResize = () => {
      // 处理resize
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <div>{/* 组件内容 */}</div>;
};
```

#### 大数据处理

```typescript
// 分批处理大数据
function processLargeData(data, batchSize = 100) {
  const results = [];

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const processed = processBatch(batch);
    results.push(...processed);

    // 让出控制权
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return results;
}
```

## 性能监控

### 实时性能监控

```typescript
import { performanceMonitor } from './services/monitoring/performanceMonitor';

// 在应用启动时开始监控
performanceMonitor.startMonitoring();

// 定期获取性能报告
setInterval(() => {
  const report = performanceMonitor.getReport();
  console.log('性能报告:', report);

  // 发送到监控服务
  sendToMonitoringService(report);
}, 60000); // 每分钟
```

### 性能告警

```typescript
// 设置性能告警阈值
const alerts = report.alerts;

alerts.forEach(alert => {
  if (alert.level === 'error' || alert.level === 'critical') {
    // 发送告警通知
    sendAlertNotification(alert);
  }
});
```

### 性能趋势分析

```typescript
// 记录历史性能数据
const performanceHistory = [];

function recordPerformanceMetrics(report) {
  performanceHistory.push({
    timestamp: Date.now(),
    metrics: report.summary,
  });

  // 保持最近30天的数据
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const filtered = performanceHistory.filter(
    record => record.timestamp > thirtyDaysAgo
  );

  // 分析趋势
  analyzePerformanceTrend(filtered);
}
```

## 故障排除

### 常见问题

#### 1. 测试超时

**问题**: 性能测试经常超时

**解决方案**:
```typescript
// 增加测试超时时间
vitest.config.ts:
testTimeout: 60000, // 60秒

// 或在特定测试中设置
it('should complete', async () => {
  // 测试代码
}, { timeout: 60000 });
```

#### 2. 内存测试不稳定

**问题**: 内存泄漏检测结果不稳定

**解决方案**:
```typescript
// 多次运行测试取平均值
const iterations = 5;
const results = [];

for (let i = 0; i < iterations; i++) {
  const result = await runMemoryTest();
  results.push(result);
  await cleanup();
}

const average = calculateAverage(results);
```

#### 3. 性能基准不一致

**问题**: 性能基准测试结果差异很大

**解决方案**:
```typescript
// 在一致的环境中运行测试
// 1. 关闭其他应用
// 2. 使用相同的硬件
// 3. 多次运行取平均值
// 4. 预热系统（运行几次测试后再记录结果）
```

#### 4. Lighthouse审计失败

**问题**: Lighthouse审计无法完成

**解决方案**:
```bash
# 1. 确保开发服务器正在运行
npm run dev

# 2. 检查端口是否正确
npx ts-node scripts/lighthouse-runner.ts --url=http://localhost:5173

# 3. 使用Chrome的headless模式
# 在脚本中已配置：--chrome-flags="--headless"
```

### 性能问题诊断流程

1. **识别问题**: 通过性能测试发现异常指标
2. **分析原因**: 使用性能分析工具找出瓶颈
3. **实施优化**: 根据分析结果进行针对性优化
4. **验证效果**: 重新运行性能测试验证改进
5. **建立监控**: 设置持续监控防止回归

### 性能分析工具

- **Chrome DevTools**: Performance、Memory、Network面板
- **React DevTools**: Profiler组件
- **Lighthouse**: 综合性能审计
- **Webpack Bundle Analyzer**: 打包分析
- **source-map-explorer**: 代码大小分析

## 最佳实践

### 1. 性能测试原则

- **早期测试**: 在开发早期就开始性能测试
- **持续测试**: 将性能测试集成到CI/CD流程
- **真实场景**: 测试基于真实用户场景
- **多轮测试**: 多次运行取平均值以确保准确性
- **环境一致**: 在一致的环境中运行测试

### 2. 性能优化策略

- **测量优先**: 先测量再优化，避免过早优化
- **关注关键路径**: 优化用户最关心的性能指标
- **渐进式优化**: 逐步优化，每次改进都要验证
- **平衡取舍**: 在性能、功能、可维护性之间找到平衡

### 3. 性能监控

- **设置基准**: 建立性能基准作为对比标准
- **持续监控**: 在生产环境中持续监控性能
- **告警机制**: 设置性能告警及时发现问题
- **趋势分析**: 分析性能趋势预测潜在问题

### 4. 团队协作

- **性能文化**: 建立性能优先的团队文化
- **知识分享**: 定期分享性能优化经验
- **代码审查**: 在代码审查中关注性能影响
- **文档维护**: 及时更新性能测试文档

## 参考资源

- [Web Vitals](https://web.dev/vitals/)
- [React性能优化](https://react.dev/learn/render-and-commit)
- [Lighthouse文档](https://github.com/GoogleChrome/lighthouse)
- [Vitest文档](https://vitest.dev/)
- [性能测试最佳实践](https://web.dev/fast/)

---

**文档版本**: 1.0.0
**最后更新**: 2025-01-15
**维护者**: 性能测试团队
