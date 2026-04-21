/**
 * Database Performance Monitor
 *
 * 数据库性能监控服务，专门用于监控和优化数据库查询性能
 * 包括慢查询检测、查询分析、索引建议等
 */

import { PrismaClient } from '@prisma/client';
import { getGlobalMonitor } from './monitor';

interface QueryPerformanceData {
  query: string;
  params?: any[];
  duration: number;
  timestamp: number;
  rowsAffected?: number;
  executionPlan?: string;
}

interface SlowQueryLog {
  query: string;
  duration: number;
  timestamp: number;
  count: number;
  avgDuration: number;
  params?: any[];
  suggestion?: string;
}

interface IndexRecommendation {
  tableName: string;
  columnName: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  createIndexSQL: string;
}

interface DatabasePerformanceReport {
  period: {
    start: number;
    end: number;
  };
  summary: {
    totalQueries: number;
    slowQueries: number;
    avgQueryDuration: number;
    slowestQuery: {
      query: string;
      duration: number;
    };
  };
  slowQueries: SlowQueryLog[];
  indexRecommendations: IndexRecommendation[];
  connectionPoolStats: {
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
  };
}

interface DatabaseMonitorConfig {
  slowQueryThreshold?: number; // 慢查询阈值（毫秒）
  enableQueryLogging?: boolean; // 是否启用查询日志
  enableAutoIndex?: boolean; // 是否启用自动索引建议
  maxSlowQueryHistory?: number; // 最大慢查询历史记录数
}

export class DatabaseMonitor {
  private prisma: PrismaClient;
  private queryHistory: QueryPerformanceData[] = [];
  private slowQueries: Map<string, SlowQueryLog> = new Map();
  private config: Required<DatabaseMonitorConfig>;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    prisma: PrismaClient,
    config: DatabaseMonitorConfig = {}
  ) {
    this.prisma = prisma;
    this.config = {
      slowQueryThreshold: config.slowQueryThreshold || 1000, // 1秒
      enableQueryLogging: config.enableQueryLogging ?? true,
      enableAutoIndex: config.enableAutoIndex ?? true,
      maxSlowQueryHistory: config.maxSlowQueryHistory || 1000
    };

    // 初始化 Prisma 查询日志
    if (this.config.enableQueryLogging) {
      this.enableQueryLogging();
    }

    // 启动定期清理
    this.startTimers();
  }

  /**
   * 启用 Prisma 查询日志
   */
  private enableQueryLogging(): void {
    this.prisma.$on('query' as any, (event: any) => {
      const queryData: QueryPerformanceData = {
        query: event.query,
        params: event.params,
        duration: event.duration,
        timestamp: Date.now(),
        rowsAffected: event.rowsAffected
      };

      this.recordQuery(queryData);
    });
  }

  /**
   * 记录查询性能数据
   */
  private recordQuery(data: QueryPerformanceData): void {
    // 记录到历史
    this.queryHistory.push(data);

    // 限制历史记录大小
    if (this.queryHistory.length > 10000) {
      this.queryHistory.splice(0, this.queryHistory.length - 10000);
    }

    // 记录到性能监控器
    const monitor = getGlobalMonitor();
    monitor.recordDatabaseQuery(data.query, data.duration, {
      params: data.params,
      rowsAffected: data.rowsAffected
    });

    // 检查是否为慢查询
    if (data.duration > this.config.slowQueryThreshold) {
      this.trackSlowQuery(data);
    }
  }

  /**
   * 跟踪慢查询
   */
  private trackSlowQuery(data: QueryPerformanceData): void {
    const queryKey = this.normalizeQuery(data.query);

    const existing = this.slowQueries.get(queryKey);
    if (existing) {
      existing.count++;
      existing.avgDuration = (existing.avgDuration * (existing.count - 1) + data.duration) / existing.count;
      existing.timestamp = data.timestamp; // 更新为最新时间
    } else {
      this.slowQueries.set(queryKey, {
        query: data.query,
        duration: data.duration,
        timestamp: data.timestamp,
        count: 1,
        avgDuration: data.duration,
        params: data.params,
        suggestion: this.generateQuerySuggestion(data.query, data.duration)
      });

      console.warn(`🐌 慢查询检测: ${data.query.substring(0, 50)}... 耗时 ${data.duration}ms`);
    }

    // 限制慢查询记录数量
    if (this.slowQueries.size > this.config.maxSlowQueryHistory) {
      const oldestKey = Array.from(this.slowQueries.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0][0];
      this.slowQueries.delete(oldestKey);
    }
  }

  /**
   * 标准化查询语句（用于去重）
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\$\d+/g, '?')
      .trim()
      .toLowerCase();
  }

  /**
   * 生成查询优化建议
   */
  private generateQuerySuggestion(query: string, duration: number): string {
    const suggestions: string[] = [];

    // 检查是否缺少 WHERE 子句
    if (query.includes('SELECT') && !query.includes('WHERE')) {
      suggestions.push('考虑添加 WHERE 子句限制结果集大小');
    }

    // 检查是否使用 SELECT *
    if (query.includes('SELECT *')) {
      suggestions.push('避免使用 SELECT *，只查询需要的列');
    }

    // 检查是否使用 LIKE
    if (query.includes('LIKE')) {
      suggestions.push('LIKE 查询可能较慢，考虑使用全文索引');
    }

    // 检查是否使用 ORDER BY
    if (query.includes('ORDER BY') && !query.includes('INDEX')) {
      suggestions.push('ORDER BY 操作可能导致性能问题，确保排序字段有索引');
    }

    // 检查是否使用 JOIN
    if (query.includes('JOIN')) {
      suggestions.push('JOIN 操作可能较慢，确保连接字段有索引');
    }

    // 检查子查询
    if (query.includes('(SELECT')) {
      suggestions.push('考虑将子查询重写为 JOIN');
    }

    return suggestions.length > 0
      ? suggestions.join('; ')
      : '建议分析查询执行计划并添加适当的索引';
  }

  /**
   * 分析查询并生成索引建议
   */
  async analyzeQueryForIndexes(query: string): Promise<IndexRecommendation[]> {
    const recommendations: IndexRecommendation[] = [];

    // 简单的查询模式匹配（生产环境应该使用更复杂的分析）
    const whereMatch = query.match(/WHERE\s+(\w+)\s*=/i);
    if (whereMatch) {
      const tableName = this.extractTableName(query);
      const columnName = whereMatch[1];

      recommendations.push({
        tableName,
        columnName,
        reason: 'WHERE 子句中使用的列应该有索引',
        impact: 'high',
        createIndexSQL: `CREATE INDEX idx_${tableName}_${columnName} ON ${tableName}(${columnName});`
      });
    }

    const joinMatch = query.match(/JOIN\s+\w+\s+ON\s+(\w+)\.(\w+)\s*=/i);
    if (joinMatch) {
      const tableName = joinMatch[1];
      const columnName = joinMatch[2];

      recommendations.push({
        tableName,
        columnName,
        reason: 'JOIN 操作中使用的列应该有索引',
        impact: 'high',
        createIndexSQL: `CREATE INDEX idx_${tableName}_${columnName} ON ${tableName}(${columnName});`
      });
    }

    const orderByMatch = query.match(/ORDER BY\s+(\w+)/i);
    if (orderByMatch) {
      const tableName = this.extractTableName(query);
      const columnName = orderByMatch[1];

      recommendations.push({
        tableName,
        columnName,
        reason: 'ORDER BY 操作中使用的列应该有索引',
        impact: 'medium',
        createIndexSQL: `CREATE INDEX idx_${tableName}_${columnName} ON ${tableName}(${columnName});`
      });
    }

    return recommendations;
  }

  /**
   * 从查询中提取表名
   */
  private extractTableName(query: string): string {
    const match = query.match(/FROM\s+(\w+)/i);
    return match ? match[1] : 'unknown_table';
  }

  /**
   * 获取慢查询列表
   */
  getSlowQueries(limit?: number): SlowQueryLog[] {
    const queries = Array.from(this.slowQueries.values())
      .sort((a, b) => b.avgDuration - a.avgDuration);

    return limit ? queries.slice(0, limit) : queries;
  }

  /**
   * 获取查询性能统计
   */
  getQueryStats(): {
    totalQueries: number;
    slowQueries: number;
    avgQueryDuration: number;
    slowestQuery: QueryPerformanceData | null;
    queryTypes: Record<string, number>;
  } {
    const totalQueries = this.queryHistory.length;
    const slowQueryCount = this.queryHistory.filter(q => q.duration > this.config.slowQueryThreshold).length;

    const totalDuration = this.queryHistory.reduce((sum, q) => sum + q.duration, 0);
    const avgQueryDuration = totalQueries > 0 ? totalDuration / totalQueries : 0;

    const slowestQuery = this.queryHistory.length > 0
      ? this.queryHistory.reduce((slowest, current) =>
          current.duration > slowest.duration ? current : slowest
        )
      : null;

    // 统计查询类型
    const queryTypes: Record<string, number> = {};
    for (const query of this.queryHistory) {
      const type = query.query.trim().split(/\s+/)[0].toUpperCase();
      queryTypes[type] = (queryTypes[type] || 0) + 1;
    }

    return {
      totalQueries,
      slowQueries: slowQueryCount,
      avgQueryDuration,
      slowestQuery,
      queryTypes
    };
  }

  /**
   * 获取连接池统计
   */
  async getConnectionPoolStats(): Promise<{
    activeConnections: number;
    idleConnections: number;
    totalConnections: number;
  }> {
    try {
      // Prisma 不直接提供连接池统计，这里返回模拟数据
      // 实际应用中应该从数据库连接池获取真实统计
      return {
        activeConnections: 1,
        idleConnections: 9,
        totalConnections: 10
      };
    } catch (error) {
      console.error('获取连接池统计失败:', error);
      return {
        activeConnections: 0,
        idleConnections: 0,
        totalConnections: 0
      };
    }
  }

  /**
   * 生成数据库性能报告
   */
  async generateReport(periodStart?: number, periodEnd?: number): Promise<DatabasePerformanceReport> {
    const start = periodStart || Date.now() - 24 * 60 * 60 * 1000; // 默认24小时
    const end = periodEnd || Date.now();

    const periodQueries = this.queryHistory.filter(
      q => q.timestamp >= start && q.timestamp <= end
    );

    const slowQueryData = periodQueries.filter(q => q.duration > this.config.slowQueryThreshold);
    const totalDuration = periodQueries.reduce((sum, q) => sum + q.duration, 0);

    // 生成索引建议
    let indexRecommendations: IndexRecommendation[] = [];
    if (this.config.enableAutoIndex) {
      for (const query of slowQueryData.slice(0, 10)) { // 分析前10个慢查询
        const recommendations = await this.analyzeQueryForIndexes(query.query);
        indexRecommendations.push(...recommendations);
      }
    }

    // 获取连接池统计
    const connectionPoolStats = await this.getConnectionPoolStats();

    return {
      period: { start, end },
      summary: {
        totalQueries: periodQueries.length,
        slowQueries: slowQueryData.length,
        avgQueryDuration: periodQueries.length > 0 ? totalDuration / periodQueries.length : 0,
        slowestQuery: periodQueries.length > 0 ? {
          query: periodQueries.reduce((slowest, q) =>
            q.duration > slowest.duration ? q : slowest
          ).query,
          duration: Math.max(...periodQueries.map(q => q.duration))
        } : { query: '', duration: 0 }
      },
      slowQueries: this.getSlowQueries(20),
      indexRecommendations,
      connectionPoolStats
    };
  }

  /**
   * 分析查询执行计划
   */
  async explainQuery(query: string, params?: any[]): Promise<any> {
    try {
      // 这里应该执行 EXPLAIN 查询
      // MySQL: EXPLAIN FORMAT=JSON SELECT ...
      // 但 Prisma 不直接支持 EXPLAIN，需要使用原始查询
      const result = await this.prisma.$queryRawUnsafe(`EXPLAIN ${query}`, ...(params || []));
      return result;
    } catch (error) {
      console.error('解释查询失败:', error);
      return null;
    }
  }

  /**
   * 清理旧查询历史
   */
  private cleanupOldQueries(): void {
    const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7天前

    const beforeCount = this.queryHistory.length;
    this.queryHistory = this.queryHistory.filter(q => q.timestamp > cutoffTime);
    const afterCount = this.queryHistory.length;

    if (beforeCount > afterCount) {
      console.log(`🧹 清理了 ${beforeCount - afterCount} 条旧查询记录`);
    }

    // 清理过期的慢查询
    const cutoffTimeForSlow = Date.now() - 24 * 60 * 60 * 1000; // 24小时前
    for (const [key, query] of this.slowQueries.entries()) {
      if (query.timestamp < cutoffTimeForSlow) {
        this.slowQueries.delete(key);
      }
    }
  }

  /**
   * 启动定时器
   */
  private startTimers(): void {
    // 每小时清理一次旧查询
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldQueries();
    }, 60 * 60 * 1000);
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.queryHistory = [];
    this.slowQueries.clear();
  }

  /**
   * 获取配置
   */
  getConfig(): Required<DatabaseMonitorConfig> {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<DatabaseMonitorConfig>): void {
    Object.assign(this.config, updates);
  }
}

// 全局数据库监控器实例
let globalDatabaseMonitor: DatabaseMonitor | null = null;

export const getGlobalDatabaseMonitor = (prisma: PrismaClient): DatabaseMonitor => {
  if (!globalDatabaseMonitor) {
    globalDatabaseMonitor = new DatabaseMonitor(prisma);
  }
  return globalDatabaseMonitor;
};

export const destroyGlobalDatabaseMonitor = (): void => {
  if (globalDatabaseMonitor) {
    globalDatabaseMonitor.destroy();
    globalDatabaseMonitor = null;
  }
};
