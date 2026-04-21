# 前端性能监控和优化系统使用指南

## 📋 系统概述

本系统为小说架构师项目提供了完整的前端性能监控和优化解决方案，包括：

- **Core Web Vitals监控**：实时监控LCP、FID、CLS等关键指标
- **性能报告组件**：可视化展示性能数据和评分
- **性能优化工具**：代码分割、懒加载、资源优化等功能
- **React Hooks**：便捷的性能监控和优化接口

## 🚀 快速开始

### 1. 在应用中初始化性能监控

```tsx
// App.tsx
import { initPerformanceMonitoring } from '@/services/performance';
import { PerformanceDashboard } from '@/components/performance';

function App() {
  // 启动性能监控
  useEffect(() => {
    initPerformanceMonitoring();
  }, []);

  return (
    <div>
      {/* 性能监控仪表板 */}
      <PerformanceDashboard
        autoStart={true}
        updateInterval={5000}
        showDetails={true}
      />
    </div>
  );
}
```

### 2. 使用性能监控Hook

```tsx
import { usePerformanceMonitor } from '@/hooks';

function MyComponent() {
  const { report, vitals, isMonitoring } = usePerformanceMonitor({
    autoStart: true,
    updateInterval: 5000,
    onPerformanceUpdate: (report) => {
      console.log('性能评分:', report.score.overall);
    }
  });

  return (
    <div>
      <p>监控状态: {isMonitoring ? '运行中' : '已停止'}</p>
      <p>LCP: {vitals.lcp?.toFixed(0)}ms</p>
      <p>性能评分: {report?.score.overall}</p>
    </div>
  );
}
```

### 3. 使用性能优化工具

```tsx
import { useLazyLoad, useOptimizedImage, useDebounce } from '@/hooks';

function OptimizedComponent() {
  // 懒加载组件
  const { ref, isVisible } = useLazyLoad({
    threshold: 0.1,
    triggerOnce: true,
  });

  // 图片优化
  const { imgRef, imgSrc, isLoaded } = useOptimizedImage('/image.jpg', {
    enableWebP: true,
    quality: 85,
    lazy: true,
  });

  // 防抖搜索
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      performSearch(debouncedQuery);
    }
  }, [debouncedQuery]);

  return (
    <div ref={ref}>
      {isVisible && (
        <>
          <img ref={imgRef} src={imgSrc} alt="Optimized" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索..."
          />
        </>
      )}
    </div>
  );
}
```

## 📊 组件使用示例

### 性能仪表板 (PerformanceDashboard)

完整的性能监控仪表板，显示所有关键指标和优化建议。

```tsx
import { PerformanceDashboard } from '@/components/performance';

function MonitoringPage() {
  return (
    <div>
      <PerformanceDashboard
        autoStart={true}
        updateInterval={5000}
        showDetails={true}
        showResources={true}
        className="w-full"
      />
    </div>
  );
}
```

### 迷你性能报告 (PerformanceMiniReport)

轻量级性能报告组件，适合嵌入到现有界面中。

```tsx
import { PerformanceMiniReport } from '@/components/performance';

function Header() {
  return (
    <header>
      <h1>小说架构师</h1>
      <PerformanceMiniReport
        compact={true}
        showLabels={false}
        className="ml-4"
      />
    </header>
  );
}
```

### 性能评分徽章 (PerformanceScoreBadge)

显示当前性能评分的徽章组件。

```tsx
import { PerformanceScoreBadge } from '@/components/performance';

function StatusPanel() {
  return (
    <div>
      <h2>系统状态</h2>
      <PerformanceScoreBadge />
    </div>
  );
}
```

### 性能图表 (PerformanceCharts)

性能数据的可视化图表展示。

```tsx
import { PerformanceCharts } from '@/components/performance';

function AnalyticsPage() {
  return (
    <PerformanceCharts
      historySize={20}
      updateInterval={5000}
      className="w-full"
    />
  );
}
```

## 🛠️ 性能优化工具使用

### 资源预加载

```tsx
import { preloadResource } from '@/services/performance';

// 预加载重要资源
useEffect(() => {
  const preload = async () => {
    const result = await preloadResource('/api/important-data', 'high');
    if (result.success) {
      console.log('预加载成功，耗时:', result.duration);
    }
  };
  preload();
}, []);
```

### 图片优化

```tsx
import { optimizeImageUrl } from '@/services/performance';

function ImageComponent({ src }) {
  const optimizedSrc = optimizeImageUrl(src, {
    enableWebP: true,
    quality: 85,
  });

  return <img src={optimizedSrc} alt="Optimized" />;
}
```

### 性能测量

```tsx
import { measurePerformance } from '@/services/performance';

function processLargeData(data) {
  return measurePerformance('data-processing', () => {
    // 处理大数据的逻辑
    return data.map(item => transformItem(item));
  });
}
```

### 防抖和节流

```tsx
import { debounce, throttle } from '@/services/performance';

// 防抖搜索输入
const debouncedSearch = debounce((query: string) => {
  performSearch(query);
}, 300);

// 节流滚动事件
const throttledScroll = throttle(() => {
  handleScroll();
}, 100);
```

## 📈 性能指标说明

### Core Web Vitals

- **LCP (Largest Contentful Paint)**: 最大内容绘制时间
  - 优秀: < 2.5秒
  - 良好: < 4秒
  - 需改进: > 4秒

- **FID (First Input Delay)**: 首次输入延迟
  - 优秀: < 100毫秒
  - 良好: < 300毫秒
  - 需改进: > 300毫秒

- **CLS (Cumulative Layout Shift)**: 累积布局偏移
  - 优秀: < 0.1
  - 良好: < 0.25
  - 需改进: > 0.25

### 其他重要指标

- **FCP (First Contentful Paint)**: 首次内容绘制
  - 优秀: < 1.8秒
  - 良好: < 3秒

- **TTFB (Time to First Byte)**: 首字节时间
  - 优秀: < 800毫秒
  - 良好: < 1.8秒

## 🎯 性能优化建议

### 1. 图片优化

```tsx
// 使用懒加载
const { imgRef, imgSrc, isLoaded } = useOptimizedImage(src, {
  enableWebP: true,
  quality: 85,
  lazy: true,
});
```

### 2. 代码分割

```tsx
// 路由级别的代码分割
const Dashboard = React.lazy(() => import('./Dashboard'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Dashboard />
    </Suspense>
  );
}
```

### 3. 组件懒加载

```tsx
const { ref, isVisible } = useLazyLoad({
  threshold: 0.1,
  triggerOnce: true,
});

return (
  <div ref={ref}>
    {isVisible ? <HeavyComponent /> : <Placeholder />}
  </div>
);
```

### 4. 防抖和节流

```tsx
// 搜索输入防抖
const debouncedSearch = useDebounce(searchQuery, 300);

// 滚动事件节流
const throttledScroll = useThrottle(scrollHandler, 100);
```

## 🔧 配置选项

### 性能监控配置

```tsx
const monitoringOptions = {
  autoStart: true,           // 自动开始监控
  updateInterval: 5000,      // 更新间隔(毫秒)
  stopOnUnmount: true,       // 组件卸载时停止
  onPerformanceUpdate: (report) => {
    // 性能数据更新回调
    console.log('新报告:', report);
  },
  onError: (error) => {
    // 错误处理
    console.error('监控错误:', error);
  }
};
```

### 性能优化配置

```tsx
const optimizationConfig = {
  resources: {
    lazyImages: true,
    enableWebP: true,
    quality: 85,
    responsiveImages: true,
  },
  caching: {
    enableServiceWorker: true,
    strategy: 'networkFirst',
    maxAge: 3600,
  },
  preloading: {
    domains: ['cdn.example.com'],
    preconnectTo: ['https://api.example.com'],
  }
};

initPerformanceOptimizer(optimizationConfig);
```

## 📝 最佳实践

1. **在应用启动时初始化性能监控**
   ```tsx
   useEffect(() => {
     initPerformanceMonitoring();
   }, []);
   ```

2. **使用性能监控Hook跟踪关键操作**
   ```tsx
   const { measure } = usePerformanceMeasurement();
   const result = measure('expensive-operation', () => {
     return performExpensiveCalculation();
   });
   ```

3. **实施懒加载策略**
   ```tsx
   // 组件懒加载
   const { ref, isVisible } = useLazyLoad();

   // 图片懒加载
   const { imgRef, imgSrc } = useOptimizedImage(src, { lazy: true });
   ```

4. **定期检查性能报告**
   ```tsx
   const { report } = usePerformanceMonitor({
     onPerformanceUpdate: (report) => {
       if (report.score.overall < 70) {
         console.warn('性能评分较低，请优化');
       }
     }
   });
   ```

5. **使用性能优化工具**
   ```tsx
   // 防抖用户输入
   const debouncedInput = useDebounce(inputValue, 300);

   // 节流滚动事件
   const throttledScroll = useThrottle(handleScroll, 100);
   ```

## 🐛 故障排除

### 性能监控未启动

确保在客户端环境中调用：
```tsx
useEffect(() => {
  if (typeof window !== 'undefined') {
    initPerformanceMonitoring();
  }
}, []);
```

### 某些指标为0或undefined

某些性能指标需要一定时间才能收集到，建议在页面加载完成后再获取报告：
```tsx
useEffect(() => {
  const timer = setTimeout(() => {
    const report = getPerformanceReport();
    console.log(report);
  }, 3000);

  return () => clearTimeout(timer);
}, []);
```

### 图片优化不生效

确保图片URL是绝对路径或相对于根目录的路径：
```tsx
// 正确
const src = '/images/photo.jpg';

// 错误
const src = 'images/photo.jpg'; // 相对路径
```

## 📚 API参考

详细的API文档请参考各模块的JSDoc注释：

- `services/performance/performanceMonitor.ts` - 性能监控服务
- `services/performance/performanceOptimizer.ts` - 性能优化服务
- `hooks/usePerformanceMonitor.ts` - 性能监控Hooks
- `hooks/usePerformanceOptimization.ts` - 性能优化Hooks
- `components/performance/` - 性能监控组件

## 🎓 学习资源

- [Web Vitals](https://web.dev/vitals/)
- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Resource Hints](https://developer.mozilla.org/en-US/docs/Web/Performance/Resource_hints)

---

**作者**: Frontend Performance Engineer
**创建日期**: 2026-04-21
**最后更新**: 2026-04-21