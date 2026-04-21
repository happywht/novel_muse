/**
 * Performance Optimization Tools
 *
 * 性能优化工具包，提供数据库查询优化、缓存策略、连接池优化等功能
 */

import { PrismaClient } from '@prisma/client';
import { getGlobalMonitor, getGlobalDatabaseMonitor } from './index';

interface QueryOptimizationResult {
  originalQuery: string;
  optimizedQuery: string;
  improvements: string[];
  estimatedSpeedup: number; // 预计性能提升倍数
  indexRecommendations: Array<{
    tableName: string;
    columnName: string;
    reason: string;
    sql: string;
  }>;
}

interface CacheOptimizationResult {
  endpoint: string;
  recommendedTTL: number;
  recommendedStrategy: string;
  estimatedImprovement: string;
}

interface ConnectionPoolConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMillis: number;
  idleTimeoutMillis: number;
  reapIntervalMillis: number;
}

export class PerformanceOptimizer {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * 分析并优化数据库查询
   */
  async optimizeQuery(query: string): Promise<QueryOptimizationResult> {
    const improvements: string[] = [];
    let optimizedQuery = query;
    let estimatedSpeedup = 1.0;

    // 检查 1: SELECT * 优化
    if (query.includes('SELECT *')) {
      improvements.push('避免使用 SELECT *，只查询需要的列以减少数据传输');
      estimatedSpeedup *= 1.2;
    }

    // 检查 2: 缺少 WHERE 子句
    if (query.match(/SELECT\s+.*\s+FROM\s+\w+/i) && !query.includes('WHERE')) {
      improvements.push('添加 WHERE 子句限制结果集大小');
      estimatedSpeedup *= 2.0;
    }

    // 检查 3: LIKE 优化
    if (query.includes('LIKE') && query.includes('%')) {
      improvements.push('LIKE 前缀通配符查询会导致全表扫描，考虑使用全文索引');
      estimatedSpeedup *= 3.0;
    }

    // 检查 4: ORDER BY 优化
    if (query.includes('ORDER BY') && !query.includes('LIMIT')) {
      improvements.push('ORDER BY 操作在没有 LIMIT 的情况下可能很慢，考虑添加 LIMIT');
      estimatedSpeedup *= 1.5;
    }

    // 检查 5: 子查询优化
    if (query.includes('(SELECT')) {
      improvements.push('考虑将子查询重写为 JOIN 操作以提高性能');
      optimizedQuery = this.convertSubqueryToJoin(query);
      estimatedSpeedup *= 2.0;
    }

    // 检查 6: N+1 查询检测
    if (this.detectNPlusOneQuery(query)) {
      improvements.push('检测到可能的 N+1 查询问题，考虑使用 include 或批量查询');
      estimatedSpeedup *= 5.0;
    }

    // 生成索引建议
    const indexRecommendations = this.generateIndexRecommendations(query);

    return {
      originalQuery: query,
      optimizedQuery,
      improvements,
      estimatedSpeedup: Math.round(estimatedSpeedup * 10) / 10,
      indexRecommendations
    };
  }

  /**
   * 将子查询转换为 JOIN
   */
  private convertSubqueryToJoin(query: string): string {
    // 简化的子查询转换逻辑
    // 实际应用中应该使用更复杂的查询解析器
    return query; // 这里应该返回转换后的查询
  }

  /**
   * 检测 N+1 查询问题
   */
  private detectNPlusOneQuery(query: string): boolean {
    // 简化的检测逻辑
    // 实际应用中应该分析查询模式和执行频率
    return false;
  }

  /**
   * 生成索引建议
   */
  private generateIndexRecommendations(query: string): Array<{
    tableName: string;
    columnName: string;
    reason: string;
    sql: string;
  }> {
    const recommendations: Array<{
      tableName: string;
      columnName: string;
      reason: string;
      sql: string;
    }> = [];

    // 提取 WHERE 子句中的列
    const whereMatch = query.match(/WHERE\s+(\w+)\.(\w+)\s*=/i);
    if (whereMatch) {
      recommendations.push({
        tableName: whereMatch[1],
        columnName: whereMatch[2],
        reason: 'WHERE 子句中使用的列',
        sql: `CREATE INDEX idx_${whereMatch[1]}_${whereMatch[2]} ON ${whereMatch[1]}(${whereMatch[2]});`
      });
    }

    // 提取 JOIN 条件中的列
    const joinMatch = query.match(/JOIN\s+(\w+)\s+ON\s+(\w+)\.(\w+)\s*=/i);
    if (joinMatch) {
      recommendations.push({
        tableName: joinMatch[2],
        columnName: joinMatch[3],
        reason: 'JOIN 条件中使用的列',
        sql: `CREATE INDEX idx_${joinMatch[2]}_${joinMatch[3]} ON ${joinMatch[2]}(${joinMatch[3]});`
      });
    }

    // 提取 ORDER BY 中的列
    const orderMatch = query.match(/ORDER BY\s+(\w+)\.(\w+)/i);
    if (orderMatch) {
      recommendations.push({
        tableName: orderMatch[1],
        columnName: orderMatch[2],
        reason: 'ORDER BY 操作中使用的列',
        sql: `CREATE INDEX idx_${orderMatch[1]}_${orderMatch[2]} ON ${orderMatch[1]}(${orderMatch[2]});`
      });
    }

    return recommendations;
  }

  /**
   * 优化连接池配置
   */
  async optimizeConnectionPool(currentConfig: ConnectionPoolConfig): Promise<{
    recommended: ConnectionPoolConfig;
    reasons: string[];
  }> {
    const monitor = getGlobalMonitor();
    const systemMonitor = await import('./systemMonitor').then(m => new m.SystemMonitor());
    const systemInfo = systemMonitor.getSystemInfo();

    const recommended: ConnectionPoolConfig = { ...currentConfig };
    const reasons: string[] = [];

    // 基于 CPU 核心数优化
    const optimalConnections = systemInfo.cpuCores * 2 + 1;
    if (currentConfig.maxConnections > optimalConnections * 2) {
      recommended.maxConnections = optimalConnections;
      reasons.push(`最大连接数应该接近 CPU 核心数 × 2 + 1 (${optimalConnections})`);
    }

    // 优化超时时间
    if (currentConfig.acquireTimeoutMillis > 30000) {
      recommended.acquireTimeoutMillis = 10000;
      reasons.push('获取连接超时时间设置为 10 秒以避免长时间阻塞');
    }

    // 优化空闲连接超时
    if (currentConfig.idleTimeoutMillis > 300000) {
      recommended.idleTimeoutMillis = 300000; // 5 分钟
      reasons.push('空闲连接超时设置为 5 分钟以释放资源');
    }

    return { recommended, reasons };
  }

  /**
   * 分析端点缓存策略
   */
  analyzeCachingStrategy(endpoint: string, stats: {
    avgDuration: number;
    requestCount: number;
    errorRate: number;
  }): CacheOptimizationResult {
    const { avgDuration, requestCount, errorRate } = stats;
    let recommendedTTL = 5 * 60 * 1000; // 默认 5 分钟
    let recommendedStrategy = 'Medium caching';
    let estimatedImprovement = '20-30% 响应时间减少';

    // 高频请求
    if (requestCount > 1000) {
      recommendedTTL = 10 * 60 * 1000; // 10 分钟
      recommendedStrategy = 'Aggressive caching';
      estimatedImprovement = '50-70% 响应时间减少，80% 缓存命中率';
    }

    // 慢速端点
    if (avgDuration > 1000) {
      recommendedTTL = 30 * 60 * 1000; // 30 分钟
      recommendedStrategy = 'Long-term caching';
      estimatedImprovement = '90% 响应时间减少，95% 缓存命中率';
    }

    // 高错误率
    if (errorRate > 0.1) {
      recommendedTTL = 1 * 60 * 1000; // 1 分钟
      recommendedStrategy = 'Short-term caching';
      estimatedImprovement = '10-20% 响应时间减少，减少服务器负载';
    }

    return {
      endpoint,
      recommendedTTL,
      recommendedStrategy,
      estimatedImprovement
    };
  }

  /**
   * 批量优化建议
   */
  async generateOptimizationReport(): Promise<{
    database: {
      slowQueries: QueryOptimizationResult[];
      indexRecommendations: string[];
    };
    api: {
      cachingStrategies: CacheOptimizationResult[];
      slowEndpoints: string[];
    };
    connectionPool: {
      current: ConnectionPoolConfig;
      recommended: ConnectionPoolConfig;
      reasons: string[];
    };
    summary: {
      totalImprovements: number;
      estimatedSpeedup: number;
      priorityActions: string[];
    };
  }> {
    const monitor = getGlobalMonitor();
    const dbMonitor = getGlobalDatabaseMonitor(this.prisma);

    // 分析慢查询
    const slowQueries = dbMonitor.getSlowQueries(10);
    const databaseOptimizations: QueryOptimizationResult[] = [];

    for (const slowQuery of slowQueries) {
      const optimization = await this.optimizeQuery(slowQuery.query);
      databaseOptimizations.push(optimization);
    }

    // 收集索引建议
    const indexRecommendations: string[] = [];
    for (const optimization of databaseOptimizations) {
      for (const index of optimization.indexRecommendations) {
        const recommendation = `在表 ${index.tableName} 的列 ${index.columnName} 上创建索引: ${index.sql}`;
        if (!indexRecommendations.includes(recommendation)) {
          indexRecommendations.push(recommendation);
        }
      }
    }

    // 分析 API 端点缓存策略
    const endpointStats = monitor.getEndpointStats();
    const cachingStrategies: CacheOptimizationResult[] = [];
    const slowEndpoints: string[] = [];

    for (const [endpoint, stats] of Object.entries(endpointStats)) {
      if (stats.avgDuration > 1000) {
        slowEndpoints.push(endpoint);
      }

      const strategy = this.analyzeCachingStrategy(endpoint, stats);
      cachingStrategies.push(strategy);
    }

    // 连接池优化
    const currentPoolConfig: ConnectionPoolConfig = {
      maxConnections: 10,
      minConnections: 2,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 300000,
      reapIntervalMillis: 60000
    };

    const poolOptimization = await this.optimizeConnectionPool(currentPoolConfig);

    // 生成优先级建议
    const priorityActions: string[] = [];

    if (slowQueries.length > 0) {
      priorityActions.push(`优化 ${slowQueries.length} 个慢查询，预计性能提升 ${Math.round(databaseOptimizations.reduce((sum, opt) => sum + opt.estimatedSpeedup, 0) / databaseOptimizations.length * 100)}%`);
    }

    if (indexRecommendations.length > 0) {
      priorityActions.push(`创建 ${indexRecommendations.length} 个推荐索引以加速查询`);
    }

    if (slowEndpoints.length > 0) {
      priorityActions.push(`为 ${slowEndpoints.length} 个慢端点实施缓存策略`);
    }

    const totalImprovements =
      databaseOptimizations.length +
      indexRecommendations.length +
      cachingStrategies.length +
      (poolOptimization.recommended.maxConnections !== currentPoolConfig.maxConnections ? 1 : 0);

    const estimatedSpeedup = databaseOptimizations.length > 0
      ? Math.round(databaseOptimizations.reduce((sum, opt) => sum + opt.estimatedSpeedup, 0) / databaseOptimizations.length * 100)
      : 0;

    return {
      database: {
        slowQueries: databaseOptimizations,
        indexRecommendations
      },
      api: {
        cachingStrategies,
        slowEndpoints
      },
      connectionPool: {
        current: currentPoolConfig,
        recommended: poolOptimization.recommended,
        reasons: poolOptimization.reasons
      },
      summary: {
        totalImprovements,
        estimatedSpeedup,
        priorityActions
      }
    };
  }

  /**
   * 应用索引建议
   */
  async applyIndexRecommendation(sql: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.prisma.$executeRawUnsafe(sql);
      return {
        success: true,
        message: '索引创建成功'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `索引创建失败: ${error.message}`
      };
    }
  }

  /**
   * 分析查询执行计划
   */
  async analyzeQueryExecutionPlan(query: string): Promise<{
    plan: any;
    analysis: {
      tableScans: string[];
      indexesUsed: string[];
      potentialBottlenecks: string[];
    };
  }> {
    try {
      const plan = await this.prisma.$queryRawUnsafe(`EXPLAIN FORMAT=JSON ${query}`);

      return {
        plan,
        analysis: {
          tableScans: [],
          indexesUsed: [],
          potentialBottlenecks: []
        }
      };
    } catch (error: any) {
      throw new Error(`分析执行计划失败: ${error.message}`);
    }
  }
}

// 全局优化器实例
let globalOptimizer: PerformanceOptimizer | null = null;

export const getGlobalOptimizer = (prisma: PrismaClient): PerformanceOptimizer => {
  if (!globalOptimizer) {
    globalOptimizer = new PerformanceOptimizer(prisma);
  }
  return globalOptimizer;
};
