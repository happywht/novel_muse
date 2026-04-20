# 性能优化使用指南

## 🚀 快速开始

### 1. 性能监控使用

#### 自动监控（推荐）
应用启动时会自动进行性能监控，无需额外配置。

```typescript
// 在浏览器控制台中查看性能报告
// 启动完成后自动输出详细报告
```

#### 手动监控
如需手动监控特定功能：

```typescript
import { performanceMonitor } from './utils/performanceMonitor';

// 开始监控
performanceMonitor.startMonitoring();

// 标记时间点
performanceMonitor.mark('operation-start');

// ... 你的业务逻辑 ...

performanceMonitor.mark('operation-end');

// 结束监控并生成报告
performanceMonitor.endMonitoring();
```

### 2. 网络状态监控使用

#### 在组件中使用
```typescript
import { useNetworkStatus } from './hooks/useNetworkStatus';

function MyComponent() {
  const isOnline = useNetworkStatus();

  return (
    <div>
      {isOnline ? '🌐 在线' : '📡 离线'}
    </div>
  );
}
```

#### 详细网络信息
```typescript
import { useNetworkInformation } from './hooks/useNetworkStatus';

function NetworkInfo() {
  const networkInfo = useNetworkInformation();

  return (
    <div>
      <p>连接类型: {networkInfo.effectiveType}</p>
      <p>下行速度: {networkInfo.downlink} Mbps</p>
      <p>往返时间: {networkInfo.rtt} ms</p>
      <p>省流量模式: {networkInfo.saveData ? '是' : '否'}</p>
    </div>
  );
}
```

### 3. 数据来源指示器使用

#### 基础使用
```typescript
import { DataSourceIndicator } from './components/DataSourceIndicator';

function AppHeader() {
  const useBackend = useProjectStore(state => state.useBackend);
  const isOnline = useNetworkStatus();

  return (
    <DataSourceIndicator useBackend={useBackend} isOnline={isOnline} />
  );
}
```

#### 紧凑版本
```typescript
import { CompactDataSourceIndicator } from './components/DataSourceIndicator';

// 在空间有限的地方使用紧凑版本
<CompactDataSourceIndicator useBackend={useBackend} isOnline={isOnline} />
```

### 4. 骨架屏使用

#### 完整页面骨架屏
```typescript
import { LoadingSkeleton } from './components/LoadingSkeleton';

function App() {
  const isLoading = useProjectStore(state => state.isLoading);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return <MainContent />;
}
```

#### 内容区域加载器
```typescript
import { ContentLoader } from './components/LoadingSkeleton';

function DataLoader() {
  const [loading, setLoading] = useState(true);

  return (
    <div>
      {loading ? (
        <ContentLoader text="正在加载数据..." />
      ) : (
        <Content />
      )}
    </div>
  );
}
```

## 🧪 性能测试

### 浏览器控制台测试

#### 1. 基础性能测试
```javascript
// 在浏览器控制台中运行
performanceTest()
```

输出示例：
```
🧪 [性能测试] 开始性能测试套件
测试 1: 快速后端检测
✅ 后端检测成功: 245ms
测试 2: 配置加载性能
✅ 配置加载: 12ms
测试 3: IndexedDB 读取性能
✅ IndexedDB 读取: 156ms
📊 [性能测试] 测试结果:
   backendCheck: 245ms ✅ 通过 (目标: <1000ms)
   configLoad: 12ms ✅ 通过 (目标: <1000ms)
   indexedDBRead: 156ms ✅ 通过 (目标: <1000ms)
```

#### 2. 性能基线创建
```javascript
// 创建当前性能基线
createPerformanceBaseline()
```

#### 3. 实时监控
```javascript
// 访问性能监控器
performanceMonitor.getMetrics()

// 查看特定指标
const metrics = performanceMonitor.getMetrics();
console.log('启动时间:', metrics.initDuration, 'ms');
console.log('后端检测:', metrics.backendCheckDuration, 'ms');
```

### Chrome DevTools 测试

#### Performance 标签
1. 打开 Chrome DevTools (F12)
2. 切换到 **Performance** 标签
3. 点击 **Record** 按钮
4. 刷新页面或执行操作
5. 停止录制
6. 分析时间线

#### 关键指标查看
- **FCP** (First Contentful Paint): 首次内容绘制
- **LCP** (Largest Contentful Paint): 最大内容绘制
- **TTI** (Time to Interactive): 可交互时间
- **Long Tasks**: 长任务检测（>50ms）

### Lighthouse 测试

#### 命令行测试
```bash
# 安装 Lighthouse (如果未安装)
npm install -g lighthouse

# 运行 Lighthouse 测试
lighthouse http://localhost:3000 --view
```

#### Chrome 扩展测试
1. 安装 [Lighthouse Chrome 扩展](https://chrome.google.com/webstore/detail/lighthouse/blipmdconlkpinefehnmjammfjpmpbjk)
2. 打开要测试的页面
3. 点击 Lighthouse 图标
4. 选择 **Performance** 类别
5. 点击 **Generate report**

### WebPageTest 测试

#### 在线测试
1. 访问 [WebPageTest.org](https://www.webpagetest.org/)
2. 输入你的应用 URL
3. 选择测试位置和浏览器
4. 点击 **Start Test**

#### 关键指标
- **Time to First Byte (TTFB)**
- **First Contentful Paint (FCP)**
- **Speed Index**
- **Largest Contentful Paint (LCP)**
- **Time to Interactive (TTI)**

## 📊 性能指标解读

### Core Web Vitals

#### LCP (Largest Contentful Paint)
- **目标**: < 2.5s
- **含义**: 页面主要内容加载完成时间
- **影响**: 用户体验的第一印象

#### FID (First Input Delay)
- **目标**: < 100ms
- **含义**: 用户首次交互到页面响应的时间
- **影响**: 用户感觉页面是否流畅

#### CLS (Cumulative Layout Shift)
- **目标**: < 0.1
- **含义**: 页面布局稳定性
- **影响**: 防止意外点击和误操作

### 自定义性能指标

#### 启动时间
```typescript
// 目标: < 3000ms
const metrics = performanceMonitor.getMetrics();
if (metrics.initDuration < 3000) {
  console.log('✅ 启动时间达标');
} else {
  console.log('❌ 启动时间需要优化');
}
```

#### 后端检测时间
```typescript
// 目标: < 1000ms
if (metrics.backendCheckDuration < 1000) {
  console.log('✅ 后端检测快速');
} else {
  console.log('❌ 后端检测超时');
}
```

#### 数据加载时间
```typescript
// 目标: < 2000ms
if (metrics.dataLoadDuration < 2000) {
  console.log('✅ 数据加载迅速');
} else {
  console.log('❌ 数据加载缓慢');
}
```

## 🎯 性能优化检查清单

### 启动性能
- [ ] 启动时间 < 3秒
- [ ] 首次绘制 < 1.5秒
- [ ] 可交互时间 < 3秒
- [ ] 无白屏时间
- [ ] 骨架屏正常显示

### 运行时性能
- [ ] 页面交互流畅
- [ ] 无长任务 (>50ms)
- [ ] 内存使用稳定
- [ ] CPU 使用合理
- [ ] 网络请求优化

### 用户体验
- [ ] 加载状态清晰
- [ ] 错误处理友好
- [ ] 离线功能完善
- [ ] 网络状态可见
- [ ] 数据同步透明

## 🔧 性能问题排查

### 常见问题

#### 1. 启动时间过长
**症状**: 应用启动超过 3 秒

**排查步骤**:
```javascript
// 1. 查看性能报告
performanceMonitor.getMetrics()

// 2. 检查具体指标
const metrics = performanceMonitor.getMetrics();
console.log('配置加载:', metrics.configLoadDuration);
console.log('后端检测:', metrics.backendCheckDuration);
console.log('数据加载:', metrics.dataLoadDuration);

// 3. 使用 Chrome DevTools 分析
// Performance 标签 -> Record -> 刷新页面 -> 分析时间线
```

**解决方案**:
- 检查后端检测是否超时
- 优化 IndexedDB 查询
- 减少初始加载的数据量

#### 2. 白屏时间过长
**症状**: 页面长时间空白

**排查步骤**:
```javascript
// 1. 检查 isLoading 状态
const isLoading = useProjectStore(state => state.isLoading);
console.log('Loading state:', isLoading);

// 2. 检查骨架屏是否渲染
// React DevTools -> 检查 LoadingSkeleton 组件
```

**解决方案**:
- 确保 LoadingSkeleton 正确显示
- 检查初始化逻辑是否阻塞
- 优化异步操作顺序

#### 3. 交互响应慢
**症状**: 点击或输入反应迟钝

**排查步骤**:
```javascript
// 1. 检查长任务
// Chrome DevTools -> Performance -> 录制 -> 操作页面 -> 查看 Long Tasks

// 2. 检查事件处理
console.time('click handler');
// 你的点击处理逻辑
console.timeEnd('click handler');
```

**解决方案**:
- 优化事件处理函数
- 使用防抖/节流
- 避免同步大量计算

### 性能调优技巧

#### 1. 代码分割
```typescript
// 懒加载重型组件
const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<Loader />}>
      <HeavyComponent />
    </Suspense>
  );
}
```

#### 2. 内存优化
```typescript
// 及时清理不需要的数据
useEffect(() => {
  const data = loadLargeData();

  return () => {
    // 清理数据
    data = null;
  };
}, []);
```

#### 3. 网络优化
```typescript
// 并行请求
const [data1, data2] = await Promise.all([
  fetch('/api/data1'),
  fetch('/api/data2')
]);
```

## 📈 持续监控

### 性能监控集成

#### 1. 自动监控
```typescript
// 在 main.tsx 中
import { performanceMonitor } from './utils/performanceMonitor';

// 应用启动时自动监控
performanceMonitor.startMonitoring();

window.addEventListener('load', () => {
  performanceMonitor.endMonitoring();
});
```

#### 2. 错误监控
```typescript
// 监控性能相关的错误
window.addEventListener('error', (event) => {
  if (event.message.includes('timeout')) {
    console.warn('性能警告: 操作超时');
  }
});
```

#### 3. 用户指标收集
```typescript
// 收集真实用户性能数据
function reportToAnalytics(metrics: any) {
  // 发送到分析服务
  analytics.track('performance_metrics', {
    startupTime: metrics.initDuration,
    backendCheck: metrics.backendCheckDuration,
    dataLoad: metrics.dataLoadDuration,
  });
}
```

---

**文档版本**: 1.0.0
**最后更新**: 2025-01-18
**维护者**: Frontend Performance Engineer