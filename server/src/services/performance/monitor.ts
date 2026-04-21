/**
 * Performance Monitoring Service
 *
 * 核心性能监控服务，负责收集、存储和分析系统性能指标
 * 包括API响应时间、数据库查询性能、内存使用、CPU使用、并发请求等
 */

interface PerformanceMetric {
  timestamp: number;
  type: 'api' | 'database' | 'system' | 'cache' | 'custom';
  name: string;
  duration: number;
  metadata?: Record<string, any>;
  tags?: string[];
}

interface PerformanceStats {
  count: number;
  totalDuration: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  lastUpdated: number;
}

interface PerformanceAlert {
  id: string;
  type: 'response_time' | 'error_rate' | 'memory_usage' | 'cpu_usage' | 'concurrent_requests';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  resolved: boolean;
}

interface PerformanceReport {
  period: {
    start: number;
    end: number;
  };
  summary: {
    totalRequests: number;
    totalErrors: number;
    avgResponseTime: number;
    errorRate: number;
    peakConcurrency: number;
  };
  endpoints: Record<string, PerformanceStats>;
  databaseQueries: Record<string, PerformanceStats>;
  systemMetrics: {
    memoryUsage: PerformanceStats;
    cpuUsage: PerformanceStats;
    concurrency: PerformanceStats;
  };
  alerts: PerformanceAlert[];
  recommendations: string[];
}

interface PerformanceConfig {
  maxMetricsHistory?: number; // 最大指标历史记录数（默认：10000）
  alertThresholds?: {
    responseTime?: number; // 响应时间阈值（毫秒）
    errorRate?: number; // 错误率阈值（0-1）
    memoryUsage?: number; // 内存使用阈值（MB）
    cpuUsage?: number; // CPU使用阈值（0-1）
    concurrentRequests?: number; // 并发请求阈值
  };
  samplingRate?: number; // 采样率（0-1，默认：1，即100%采样）
  enableAlerts?: boolean; // 是否启用告警
  enableProfiling?: boolean; // 是否启用性能分析
}

export class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private alerts: PerformanceAlert[] = [];
  private activeRequests: Map<string, number> = new Map();
  private config: Required<PerformanceConfig>;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private alertCheckTimer: NodeJS.Timeout | null = null;

  constructor(config: PerformanceConfig = {}) {
    this.config = {
      maxMetricsHistory: config.maxMetricsHistory || 10000,
      alertThresholds: {
        responseTime: config.alertThresholds?.responseTime || 3000, // 3秒
        errorRate: config.alertThresholds?.errorRate || 0.05, // 5%
        memoryUsage: config.alertThresholds?.memoryUsage || 1024, // 1GB
        cpuUsage: config.alertThresholds?.cpuUsage || 0.8, // 80%
        concurrentRequests: config.alertThresholds?.concurrentRequests || 100
      },
      samplingRate: config.samplingRate ?? 1,
      enableAlerts: config.enableAlerts ?? true,
      enableProfiling: config.enableProfiling ?? false
    };

    // 启动定期清理和告警检查
    this.startTimers();
  }

  /**
   * 记录性能指标
   */
  recordMetric(metric: PerformanceMetric): void {
    // 采样检查
    if (Math.random() > this.config.samplingRate) {
      return;
    }

    this.metrics.push({
      ...metric,
      timestamp: metric.timestamp || Date.now()
    });

    // 保持指标历史记录在限制内
    if (this.metrics.length > this.config.maxMetricsHistory) {
      const removeCount = this.metrics.length - this.config.maxMetricsHistory;
      this.metrics.splice(0, removeCount);
    }
  }

  /**
   * 记录API请求性能
   */
  recordApiRequest(
    endpoint: string,
    duration: number,
    statusCode: number,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric({
      timestamp: Date.now(),
      type: 'api',
      name: endpoint,
      duration,
      metadata: {
        ...metadata,
        statusCode,
        success: statusCode >= 200 && statusCode < 400
      }
    });

    // 实时检查告警
    if (this.config.enableAlerts) {
      this.checkResponseTimeAlert(endpoint, duration);
    }
  }

  /**
   * 记录数据库查询性能
   */
  recordDatabaseQuery(
    query: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric({
      timestamp: Date.now(),
      type: 'database',
      name: query.substring(0, 100), // 限制查询字符串长度
      duration,
      metadata
    });

    // 实时检查告警
    if (this.config.enableAlerts) {
      this.checkSlowQueryAlert(query, duration);
    }
  }

  /**
   * 记录系统指标
   */
  recordSystemMetric(
    metricName: string,
    value: number,
    metadata?: Record<string, any>
  ): void {
    this.recordMetric({
      timestamp: Date.now(),
      type: 'system',
      name: metricName,
      duration: value,
      metadata
    });

    // 实时检查告警
    if (this.config.enableAlerts) {
      if (metricName === 'memoryUsage') {
        this.checkMemoryUsageAlert(value);
      } else if (metricName === 'cpuUsage') {
        this.checkCpuUsageAlert(value);
      } else if (metricName === 'concurrentRequests') {
        this.checkConcurrencyAlert(value);
      }
    }
  }

  /**
   * 开始请求跟踪
   */
  startRequest(requestId: string): void {
    this.activeRequests.set(requestId, Date.now());
  }

  /**
   * 结束请求跟踪
   */
  endRequest(requestId: string): number {
    const startTime = this.activeRequests.get(requestId);
    if (!startTime) return 0;

    this.activeRequests.delete(requestId);
    return Date.now() - startTime;
  }

  /**
   * 获取当前活动请求数
   */
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }

  /**
   * 计算性能统计
   */
  private calculateStats(metrics: PerformanceMetric[]): PerformanceStats {
    if (metrics.length === 0) {
      return {
        count: 0,
        totalDuration: 0,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        errorRate: 0,
        lastUpdated: Date.now()
      };
    }

    const durations = metrics.map(m => m.duration).sort((a, b) => a - b);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const errorCount = metrics.filter(m => m.metadata?.success === false).length;

    return {
      count: metrics.length,
      totalDuration,
      avgDuration: totalDuration / metrics.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50: durations[Math.floor(durations.length * 0.5)],
      p95: durations[Math.floor(durations.length * 0.95)],
      p99: durations[Math.floor(durations.length * 0.99)],
      errorRate: errorCount / metrics.length,
      lastUpdated: Date.now()
    };
  }

  /**
   * 获取API端点性能统计
   */
  getEndpointStats(endpoint?: string): Record<string, PerformanceStats> {
    const apiMetrics = endpoint
      ? this.metrics.filter(m => m.type === 'api' && m.name === endpoint)
      : this.metrics.filter(m => m.type === 'api');

    const groupedMetrics = apiMetrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetric[]>);

    const stats: Record<string, PerformanceStats> = {};
    for (const [name, metrics] of Object.entries(groupedMetrics)) {
      stats[name] = this.calculateStats(metrics);
    }

    return stats;
  }

  /**
   * 获取数据库查询性能统计
   */
  getDatabaseStats(query?: string): Record<string, PerformanceStats> {
    const dbMetrics = query
      ? this.metrics.filter(m => m.type === 'database' && m.name === query)
      : this.metrics.filter(m => m.type === 'database');

    const groupedMetrics = dbMetrics.reduce((acc, metric) => {
      if (!acc[metric.name]) {
        acc[metric.name] = [];
      }
      acc[metric.name].push(metric);
      return acc;
    }, {} as Record<string, PerformanceMetric[]>);

    const stats: Record<string, PerformanceStats> = {};
    for (const [name, metrics] of Object.entries(groupedMetrics)) {
      stats[name] = this.calculateStats(metrics);
    }

    return stats;
  }

  /**
   * 获取系统指标统计
   */
  getSystemMetrics(): {
    memoryUsage: PerformanceStats;
    cpuUsage: PerformanceStats;
    concurrency: PerformanceStats;
  } {
    const memoryMetrics = this.metrics.filter(m => m.type === 'system' && m.name === 'memoryUsage');
    const cpuMetrics = this.metrics.filter(m => m.type === 'system' && m.name === 'cpuUsage');
    const concurrencyMetrics = this.metrics.filter(m => m.type === 'system' && m.name === 'concurrentRequests');

    return {
      memoryUsage: this.calculateStats(memoryMetrics),
      cpuUsage: this.calculateStats(cpuMetrics),
      concurrency: this.calculateStats(concurrencyMetrics)
    };
  }

  /**
   * 生成性能报告
   */
  generateReport(periodStart?: number, periodEnd?: number): PerformanceReport {
    const start = periodStart || Date.now() - 24 * 60 * 60 * 1000; // 默认24小时
    const end = periodEnd || Date.now();

    const periodMetrics = this.metrics.filter(
      m => m.timestamp >= start && m.timestamp <= end
    );

    const apiMetrics = periodMetrics.filter(m => m.type === 'api');
    const errorCount = apiMetrics.filter(m => m.metadata?.success === false).length;

    // 计算端点统计
    const endpoints = this.getEndpointStats();

    // 计算数据库统计
    const databaseQueries = this.getDatabaseStats();

    // 获取系统指标
    const systemMetrics = this.getSystemMetrics();

    // 获取活跃告警
    const activeAlerts = this.alerts.filter(a => !a.resolved);

    // 生成建议
    const recommendations = this.generateRecommendations(endpoints, databaseQueries, systemMetrics);

    return {
      period: {
        start,
        end
      },
      summary: {
        totalRequests: apiMetrics.length,
        totalErrors: errorCount,
        avgResponseTime: this.calculateStats(apiMetrics).avgDuration,
        errorRate: errorCount / apiMetrics.length || 0,
        peakConcurrency: systemMetrics.concurrency.maxDuration
      },
      endpoints,
      databaseQueries,
      systemMetrics,
      alerts: activeAlerts,
      recommendations
    };
  }

  /**
   * 生成性能优化建议
   */
  private generateRecommendations(
    endpoints: Record<string, PerformanceStats>,
    databaseQueries: Record<string, PerformanceStats>,
    systemMetrics: { memoryUsage: PerformanceStats; cpuUsage: PerformanceStats }
  ): string[] {
    const recommendations: string[] = [];

    // 检查慢端点
    for (const [endpoint, stats] of Object.entries(endpoints)) {
      if (stats.avgDuration > this.config.alertThresholds.responseTime!) {
        recommendations.push(
          `端点 ${endpoint} 平均响应时间 ${stats.avgDuration.toFixed(0)}ms 超过阈值，` +
          `建议实施缓存策略或优化查询逻辑`
        );
      }
      if (stats.errorRate > this.config.alertThresholds.errorRate!) {
        recommendations.push(
          `端点 ${endpoint} 错误率 ${(stats.errorRate * 100).toFixed(2)}% 超过阈值，` +
          `建议检查错误日志和异常处理`
        );
      }
    }

    // 检查慢查询
    for (const [query, stats] of Object.entries(databaseQueries)) {
      if (stats.avgDuration > 1000) { // 1秒
        recommendations.push(
          `数据库查询平均耗时 ${stats.avgDuration.toFixed(0)}ms 超过1秒，` +
          `建议分析查询执行计划并添加索引`
        );
      }
    }

    // 检查内存使用
    if (systemMetrics.memoryUsage.avgDuration > this.config.alertThresholds.memoryUsage!) {
      recommendations.push(
        `平均内存使用 ${(systemMetrics.memoryUsage.avgDuration / 1024 / 1024).toFixed(2)}MB 超过阈值，` +
        `建议检查内存泄漏和优化数据结构`
      );
    }

    // 检查CPU使用
    if (systemMetrics.cpuUsage.avgDuration > this.config.alertThresholds.cpuUsage!) {
      recommendations.push(
        `平均CPU使用 ${(systemMetrics.cpuUsage.avgDuration * 100).toFixed(2)}% 超过阈值，` +
        `建议优化计算密集型操作和实施负载均衡`
      );
    }

    return recommendations;
  }

  /**
   * 检测性能瓶颈
   */
  detectBottlenecks(): {
    bottlenecks: Array<{
      type: string;
      name: string;
      severity: 'high' | 'medium' | 'low';
      impact: number;
      description: string;
    }>;
  } {
    const bottlenecks: Array<{
      type: string;
      name: string;
      severity: 'high' | 'medium' | 'low';
      impact: number;
      description: string;
    }> = [];

    const endpoints = this.getEndpointStats();
    const databaseQueries = this.getDatabaseStats();
    const systemMetrics = this.getSystemMetrics();

    // 检测API瓶颈
    for (const [endpoint, stats] of Object.entries(endpoints)) {
      const impact = stats.avgDuration / this.config.alertThresholds.responseTime!;
      if (impact > 2) {
        bottlenecks.push({
          type: 'api',
          name: endpoint,
          severity: 'high',
          impact,
          description: `端点响应时间过慢（平均${stats.avgDuration.toFixed(0)}ms）`
        });
      } else if (impact > 1.5) {
        bottlenecks.push({
          type: 'api',
          name: endpoint,
          severity: 'medium',
          impact,
          description: `端点响应时间偏慢（平均${stats.avgDuration.toFixed(0)}ms）`
        });
      }
    }

    // 检测数据库瓶颈
    for (const [query, stats] of Object.entries(databaseQueries)) {
      const impact = stats.avgDuration / 1000; // 以1秒为基准
      if (impact > 2) {
        bottlenecks.push({
          type: 'database',
          name: query.substring(0, 50),
          severity: 'high',
          impact,
          description: `数据库查询过慢（平均${stats.avgDuration.toFixed(0)}ms）`
        });
      } else if (impact > 1) {
        bottlenecks.push({
          type: 'database',
          name: query.substring(0, 50),
          severity: 'medium',
          impact,
          description: `数据库查询偏慢（平均${stats.avgDuration.toFixed(0)}ms）`
        });
      }
    }

    // 检测系统资源瓶颈
    if (systemMetrics.memoryUsage.avgDuration > this.config.alertThresholds.memoryUsage!) {
      const impact = systemMetrics.memoryUsage.avgDuration / this.config.alertThresholds.memoryUsage!;
      bottlenecks.push({
        type: 'system',
        name: 'memoryUsage',
        severity: impact > 1.5 ? 'high' : 'medium',
        impact,
        description: `内存使用过高（平均${(systemMetrics.memoryUsage.avgDuration / 1024 / 1024).toFixed(2)}MB）`
      });
    }

    if (systemMetrics.cpuUsage.avgDuration > this.config.alertThresholds.cpuUsage!) {
      const impact = systemMetrics.cpuUsage.avgDuration / this.config.alertThresholds.cpuUsage!;
      bottlenecks.push({
        type: 'system',
        name: 'cpuUsage',
        severity: impact > 1.5 ? 'high' : 'medium',
        impact,
        description: `CPU使用过高（平均${(systemMetrics.cpuUsage.avgDuration * 100).toFixed(2)}%）`
      });
    }

    // 按影响程度排序
    bottlenecks.sort((a, b) => b.impact - a.impact);

    return { bottlenecks };
  }

  /**
   * 告警检查方法
   */
  private checkResponseTimeAlert(endpoint: string, duration: number): void {
    if (duration > this.config.alertThresholds.responseTime!) {
      this.createAlert({
        type: 'response_time',
        severity: duration > this.config.alertThresholds.responseTime! * 2 ? 'critical' : 'warning',
        message: `端点 ${endpoint} 响应时间 ${duration}ms 超过阈值`,
        value: duration,
        threshold: this.config.alertThresholds.responseTime!
      });
    }
  }

  private checkSlowQueryAlert(query: string, duration: number): void {
    if (duration > 1000) { // 1秒
      this.createAlert({
        type: 'response_time',
        severity: duration > 3000 ? 'critical' : 'warning',
        message: `慢查询检测：${query.substring(0, 50)}... 耗时 ${duration}ms`,
        value: duration,
        threshold: 1000
      });
    }
  }

  private checkMemoryUsageAlert(usage: number): void {
    if (usage > this.config.alertThresholds.memoryUsage!) {
      this.createAlert({
        type: 'memory_usage',
        severity: usage > this.config.alertThresholds.memoryUsage! * 1.5 ? 'critical' : 'warning',
        message: `内存使用 ${usage}MB 超过阈值`,
        value: usage,
        threshold: this.config.alertThresholds.memoryUsage!
      });
    }
  }

  private checkCpuUsageAlert(usage: number): void {
    if (usage > this.config.alertThresholds.cpuUsage!) {
      this.createAlert({
        type: 'cpu_usage',
        severity: usage > this.config.alertThresholds.cpuUsage! * 1.2 ? 'critical' : 'warning',
        message: `CPU使用 ${(usage * 100).toFixed(2)}% 超过阈值`,
        value: usage,
        threshold: this.config.alertThresholds.cpuUsage!
      });
    }
  }

  private checkConcurrencyAlert(concurrent: number): void {
    if (concurrent > this.config.alertThresholds.concurrentRequests!) {
      this.createAlert({
        type: 'concurrent_requests',
        severity: concurrent > this.config.alertThresholds.concurrentRequests! * 1.5 ? 'critical' : 'warning',
        message: `并发请求数 ${concurrent} 超过阈值`,
        value: concurrent,
        threshold: this.config.alertThresholds.concurrentRequests!
      });
    }
  }

  /**
   * 创建告警
   */
  private createAlert(alert: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const newAlert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      resolved: false,
      ...alert
    };

    this.alerts.push(newAlert);
    console.warn(`🚨 性能告警: ${newAlert.message}`);

    // 限制告警历史记录
    if (this.alerts.length > 1000) {
      this.alerts.splice(0, this.alerts.length - 1000);
    }
  }

  /**
   * 获取所有告警
   */
  getAlerts(resolved?: boolean): PerformanceAlert[] {
    return resolved === undefined
      ? this.alerts
      : this.alerts.filter(a => a.resolved === resolved);
  }

  /**
   * 解决告警
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      return true;
    }
    return false;
  }

  /**
   * 清理旧指标
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7天前

    const beforeCount = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    const afterCount = this.metrics.length;

    if (beforeCount > afterCount) {
      console.log(`🧹 清理了 ${beforeCount - afterCount} 条旧性能指标`);
    }
  }

  /**
   * 启动定时器
   */
  private startTimers(): void {
    // 每小时清理一次旧指标
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000);

    // 每分钟检查一次告警状态
    if (this.config.enableAlerts) {
      this.alertCheckTimer = setInterval(() => {
        this.checkAlertConditions();
      }, 60 * 1000);
    }
  }

  /**
   * 检查告警条件
   */
  private checkAlertConditions(): void {
    // 检查整体错误率
    const recentMetrics = this.metrics.filter(
      m => m.timestamp > Date.now() - 5 * 60 * 1000 // 最近5分钟
    );

    const apiMetrics = recentMetrics.filter(m => m.type === 'api');
    if (apiMetrics.length > 0) {
      const errorRate = apiMetrics.filter(m => m.metadata?.success === false).length / apiMetrics.length;

      if (errorRate > this.config.alertThresholds.errorRate!) {
        this.createAlert({
          type: 'error_rate',
          severity: errorRate > this.config.alertThresholds.errorRate! * 2 ? 'critical' : 'warning',
          message: `整体错误率 ${(errorRate * 100).toFixed(2)}% 超过阈值`,
          value: errorRate,
          threshold: this.config.alertThresholds.errorRate!
        });
      }
    }
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    if (this.alertCheckTimer) {
      clearInterval(this.alertCheckTimer);
    }
    this.metrics = [];
    this.alerts = [];
    this.activeRequests.clear();
  }

  /**
   * 获取所有指标（用于调试）
   */
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 获取监控器配置
   */
  getConfig(): Required<PerformanceConfig> {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<PerformanceConfig>): void {
    Object.assign(this.config, updates);
  }
}

// 全局监控器实例
let globalMonitor: PerformanceMonitor | null = null;

export const getGlobalMonitor = (): PerformanceMonitor => {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
};

export const destroyGlobalMonitor = (): void => {
  if (globalMonitor) {
    globalMonitor.destroy();
    globalMonitor = null;
  }
};
