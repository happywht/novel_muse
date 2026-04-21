# 后端性能监控系统使用指南

## 概述

本项目的后端性能监控系统提供了全面的性能监控、分析和优化功能，帮助您识别和解决性能瓶颈，提升系统整体性能。

## 主要功能

### 1. API 性能监控
- 自动记录所有 API 请求的响应时间
- 统计错误率和请求频率
- 识别慢端点和高负载接口
- 提供端点级别的性能统计

### 2. 数据库性能监控
- 自动检测慢查询（默认阈值：1秒）
- 分析查询性能并提供优化建议
- 生成索引建议
- 监控连接池状态

### 3. 系统资源监控
- CPU 使用率监控
- 内存使用监控
- 负载平均值监控
- 进程级别的资源使用追踪

### 4. 性能告警
- 响应时间超限告警
- 错误率过高告警
- 内存使用过高告警
- 并发请求数超限告警

### 5. 性能分析工具
- 自动检测性能瓶颈
- 生成优化建议
- 提供性能报告
- 缓存策略推荐

## API 接口

### 性能概览
```bash
GET /api/performance/overview
```
获取系统整体性能概览，包括 API、数据库、系统指标和告警信息。

### API 性能统计
```bash
GET /api/performance/api/stats?endpoint=/api/graph/:projectId&limit=50
```
获取 API 端点的详细性能统计。

### 数据库性能报告
```bash
GET /api/performance/database/report?periodStart=1234567890&periodEnd=1234567890
```
生成数据库性能报告，包括慢查询分析和索引建议。

### 慢查询列表
```bash
GET /api/performance/database/slow-queries?limit=20
```
获取慢查询列表，包含查询语句、耗时和优化建议。

### 性能瓶颈检测
```bash
GET /api/performance/bottlenecks
```
自动检测系统中的性能瓶颈并按影响程度排序。

### 优化建议
```bash
GET /api/performance/recommendations
```
获取基于当前性能数据的优化建议。

### 综合性能报告
```bash
GET /api/performance/report
```
生成包含 API、数据库、系统性能和优化建议的综合报告。

## 配置选项

### 性能监控器配置
```typescript
{
  maxMetricsHistory: 10000,           // 最大指标历史记录数
  alertThresholds: {
    responseTime: 3000,               // 响应时间阈值（毫秒）
    errorRate: 0.05,                  // 错误率阈值（5%）
    memoryUsage: 1024,                // 内存使用阈值（MB）
    cpuUsage: 0.8,                    // CPU 使用阈值（80%）
    concurrentRequests: 100           // 并发请求阈值
  },
  samplingRate: 1,                    // 采样率（100%）
  enableAlerts: true,                 // 启用告警
  enableProfiling: false              // 启用性能分析
}
```

### 数据库监控器配置
```typescript
{
  slowQueryThreshold: 1000,           // 慢查询阈值（毫秒）
  enableQueryLogging: true,           // 启用查询日志
  enableAutoIndex: true,              // 启用自动索引建议
  maxSlowQueryHistory: 1000           // 最大慢查询历史记录数
}
```

### 系统监控器配置
```typescript
{
  samplingInterval: 5000,             // 采样间隔（毫秒）
  enableCpuMonitoring: true,          // 启用 CPU 监控
  enableMemoryMonitoring: true,       // 启用内存监控
  enableLoadAverageMonitoring: true,  // 启用负载监控
  retentionPeriod: 86400000           // 数据保留时间（24小时）
}
```

## 使用示例

### 1. 在代码中直接使用监控器

```typescript
import { getGlobalMonitor, getGlobalDatabaseMonitor, getGlobalSystemMonitor } from './services/performance';

// 记录自定义性能指标
const monitor = getGlobalMonitor();
monitor.recordMetric({
  timestamp: Date.now(),
  type: 'custom',
  name: 'dataProcessing',
  duration: 150,
  metadata: {
    recordsProcessed: 1000,
    processingMethod: 'batch'
  }
});

// 获取性能报告
const report = monitor.generateReport();
console.log('性能报告:', report);

// 检测性能瓶颈
const bottlenecks = monitor.detectBottlenecks();
console.log('性能瓶颈:', bottlenecks);
```

### 2. 使用数据库监控器

```typescript
import { PrismaClient } from '@prisma/client';
import { getGlobalDatabaseMonitor } from './services/performance';

const prisma = new PrismaClient();
const dbMonitor = getGlobalDatabaseMonitor(prisma);

// 获取慢查询
const slowQueries = dbMonitor.getSlowQueries(10);
console.log('慢查询:', slowQueries);

// 生成数据库性能报告
const dbReport = await dbMonitor.generateReport();
console.log('数据库报告:', dbReport);
```

### 3. 使用性能优化工具

```typescript
import { getGlobalOptimizer } from './services/performance';

const optimizer = getGlobalOptimizer(prisma);

// 优化查询
const optimization = await optimizer.optimizeQuery(
  'SELECT * FROM Character WHERE projectId = ?'
);
console.log('查询优化建议:', optimization);

// 生成优化报告
const report = await optimizer.generateOptimizationReport();
console.log('优化报告:', report);
```

## 性能优化建议

### 1. 数据库查询优化
- **避免 SELECT ***：只查询需要的列
- **使用 WHERE 子句**：限制结果集大小
- **创建适当的索引**：为 WHERE、JOIN、ORDER BY 子句中的列创建索引
- **避免 N+1 查询**：使用 Prisma 的 `include` 或批量查询
- **优化 LIKE 查询**：考虑使用全文索引

### 2. API 响应优化
- **实施缓存策略**：为不常变化的数据设置缓存
- **使用分页**：避免返回大量数据
- **压缩响应**：启用 gzip 压缩（已默认启用）
- **优化数据序列化**：只返回必要的字段

### 3. 连接池优化
- **设置合理的连接数**：基于 CPU 核心数设置
- **配置超时时间**：避免长时间阻塞
- **定期清理空闲连接**：释放系统资源

### 4. 系统资源优化
- **监控内存使用**：及时发现内存泄漏
- **优化 CPU 密集型操作**：考虑异步处理或工作队列
- **负载均衡**：在高并发场景下分发请求

## 性能告警处理

当系统触发性能告警时，建议按以下步骤处理：

1. **响应时间告警**
   - 检查 `/api/performance/api/stats` 查看慢端点
   - 分析端点的数据库查询是否需要优化
   - 考虑实施缓存策略

2. **错误率告警**
   - 检查日志文件查找错误原因
   - 分析 `/api/performance/alerts` 查看告警详情
   - 修复代码中的错误或改善异常处理

3. **内存使用告警**
   - 检查是否存在内存泄漏
   - 分析内存使用趋势 `/api/performance/system/report`
   - 考虑增加服务器内存或优化数据结构

4. **并发请求告警**
   - 检查是否有突发流量
   - 考虑实施限流策略
   - 分析是否需要水平扩展

## 监控数据导出

性能监控数据可以通过以下方式导出：

### 1. JSON 格式导出
```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:3001/api/performance/report" \
  > performance-report.json
```

### 2. 特定时间段导出
```bash
curl -H "X-API-Key: your-api-key" \
  "http://localhost:3001/api/performance/report?periodStart=1609459200000&periodEnd=1609545600000" \
  > performance-report-period.json
```

## 最佳实践

1. **定期查看性能报告**：建议每周查看一次综合性能报告
2. **设置合理的告警阈值**：根据业务需求调整告警阈值
3. **持续优化**：根据监控数据持续优化系统性能
4. **性能测试**：在生产环境部署前进行充分的性能测试
5. **文档记录**：记录性能优化过程和结果，便于后续参考

## 故障排查

### 性能监控不工作
1. 检查性能监控是否已初始化
2. 确认 `NODE_ENV` 环境变量设置正确
3. 查看服务器日志是否有错误信息

### 数据不准确
1. 确认采样率设置合理
2. 检查系统时间是否正确
3. 验证监控器的配置参数

### 性能影响
1. 如果监控系统本身影响性能，可以降低采样率
2. 禁用不需要的监控功能
3. 调整数据保留时间以减少内存占用

## 技术支持

如有问题或建议，请联系开发团队或提交 Issue。
