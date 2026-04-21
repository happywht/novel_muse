/**
 * Performance Monitoring API Routes
 *
 * 提供性能监控数据的访问接口
 */

import { Router, Request, Response } from 'express';
import {
  getGlobalMonitor,
  getGlobalDatabaseMonitor,
  getGlobalSystemMonitor
} from '../services/performance';
import { prisma } from '../index';

const router = Router();

// ============================================================
// 性能监控根端点
// ============================================================

/**
 * GET /api/performance
 *
 * 获取性能监控服务信息和可用端点
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const monitor = getGlobalMonitor();
    const systemMonitor = getGlobalSystemMonitor();

    res.json({
      service: 'Performance Monitoring API',
      version: '1.0.0',
      status: 'active',
      timestamp: new Date().toISOString(),
      endpoints: {
        overview: '/api/performance/overview',
        endpoints: '/api/performance/endpoints',
        database: '/api/performance/database',
        system: '/api/performance/system',
        alerts: '/api/performance/alerts',
        metrics: '/api/performance/metrics'
      },
      monitoring: {
        apiRequests: monitor.getConfig().enableAlerts ? 'enabled' : 'disabled',
        systemMetrics: 'enabled',
        samplingInterval: `${systemMonitor.getConfig().samplingInterval}ms`
      }
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to fetch performance service information',
      message: error.message
    });
  }
});

// ============================================================
// 性能概览
// ============================================================

/**
 * GET /api/performance/overview
 *
 * 获取性能概览信息
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const monitor = getGlobalMonitor();
    const dbMonitor = getGlobalDatabaseMonitor(prisma);
    const systemMonitor = getGlobalSystemMonitor();

    const endpointStats = monitor.getEndpointStats();
    const databaseStats = monitor.getDatabaseStats();
    const systemMetrics = systemMonitor.getCurrentMetrics();
    const activeAlerts = monitor.getAlerts(false);

    // 计算总体指标
    const allApiMetrics = Object.values(endpointStats);
    const totalRequests = allApiMetrics.reduce((sum, stats) => sum + stats.count, 0);
    const totalErrors = allApiMetrics.reduce((sum, stats) => sum + (stats.count * stats.errorRate), 0);
    const avgResponseTime = allApiMetrics.length > 0
      ? allApiMetrics.reduce((sum, stats) => sum + stats.avgDuration, 0) / allApiMetrics.length
      : 0;

    const overview = {
      timestamp: Date.now(),
      api: {
        totalRequests,
        totalErrors: Math.round(totalErrors),
        avgResponseTime: Math.round(avgResponseTime),
        errorRate: totalRequests > 0 ? totalErrors / totalRequests : 0,
        activeRequests: monitor.getActiveRequestCount(),
        endpointsCount: Object.keys(endpointStats).length
      },
      database: {
        totalQueries: databaseStats.reduce((sum, stats) => sum + stats.count, 0),
        avgQueryDuration: Math.round(
          databaseStats.length > 0
            ? databaseStats.reduce((sum, stats) => sum + stats.avgDuration, 0) / databaseStats.length
            : 0
        ),
        slowQueries: dbMonitor.getSlowQueries().length
      },
      system: {
        cpuUsage: systemMetrics.cpuUsage,
        memoryUsage: systemMetrics.memoryUsage,
        memoryPercentage: systemMetrics.memoryPercentage,
        uptime: systemMetrics.uptime,
        loadAverage: systemMetrics.loadAverage
      },
      alerts: {
        activeCount: activeAlerts.length,
        recent: activeAlerts.slice(-5)
      }
    };

    res.json({
      success: true,
      data: overview
    });
  } catch (error: any) {
    console.error('获取性能概览失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// API 性能监控
// ============================================================

/**
 * GET /api/performance/api/stats
 *
 * 获取 API 性能统计
 */
router.get('/api/stats', async (req: Request, res: Response) => {
  try {
    const monitor = getGlobalMonitor();
    const { endpoint, limit = 50 } = req.query;

    let stats;
    if (endpoint) {
      const endpointStats = monitor.getEndpointStats(endpoint as string);
      stats = { [endpoint as string]: endpointStats[endpoint as string] };
    } else {
      stats = monitor.getEndpointStats();
    }

    // 限制返回的端点数量
    const entries = Object.entries(stats);
    const limitedStats = limit
      ? Object.fromEntries(entries.slice(0, parseInt(limit as string, 10)))
      : stats;

    res.json({
      success: true,
      data: {
        endpoints: limitedStats,
        summary: {
          totalEndpoints: Object.keys(stats).length,
          returnedEndpoints: Object.keys(limitedStats).length
        }
      }
    });
  } catch (error: any) {
    console.error('获取 API 统计失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/performance/api/report
 *
 * 生成 API 性能报告
 */
router.get('/api/report', async (req: Request, res: Response) => {
  try {
    const monitor = getGlobalMonitor();
    const { periodStart, periodEnd } = req.query;

    const report = monitor.generateReport(
      periodStart ? parseInt(periodStart as string, 10) : undefined,
      periodEnd ? parseInt(periodEnd as string, 10) : undefined
    );

    res.json({
      success: true,
      data: report
    });
  } catch (error: any) {
    console.error('生成 API 报告失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// 数据库性能监控
// ============================================================

/**
 * GET /api/performance/database/stats
 *
 * 获取数据库性能统计
 */
router.get('/database/stats', async (req: Request, res: Response) => {
  try {
    const dbMonitor = getGlobalDatabaseMonitor(prisma);
    const stats = dbMonitor.getQueryStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('获取数据库统计失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/performance/database/slow-queries
 *
 * 获取慢查询列表
 */
router.get('/database/slow-queries', async (req: Request, res: Response) => {
  try {
    const dbMonitor = getGlobalDatabaseMonitor(prisma);
    const { limit = 20 } = req.query;

    const slowQueries = dbMonitor.getSlowQueries(parseInt(limit as string, 10));

    res.json({
      success: true,
      data: {
        count: slowQueries.length,
        queries: slowQueries
      }
    });
  } catch (error: any) {
    console.error('获取慢查询失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/performance/database/report
 *
 * 生成数据库性能报告
 */
router.get('/database/report', async (req: Request, res: Response) => {
  try {
    const dbMonitor = getGlobalDatabaseMonitor(prisma);
    const { periodStart, periodEnd } = req.query;

    const report = await dbMonitor.generateReport(
      periodStart ? parseInt(periodStart as string, 10) : undefined,
      periodEnd ? parseInt(periodEnd as string, 10) : undefined
    );

    res.json({
      success: true,
      data: report
    });
  } catch (error: any) {
    console.error('生成数据库报告失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/performance/database/connection-pool
 *
 * 获取连接池状态
 */
router.get('/database/connection-pool', async (req: Request, res: Response) => {
  try {
    const dbMonitor = getGlobalDatabaseMonitor(prisma);
    const poolStats = await dbMonitor.getConnectionPoolStats();

    res.json({
      success: true,
      data: poolStats
    });
  } catch (error: any) {
    console.error('获取连接池状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// 系统性能监控
// ============================================================

/**
 * GET /api/performance/system/current
 *
 * 获取当前系统指标
 */
router.get('/system/current', async (req: Request, res: Response) => {
  try {
    const systemMonitor = getGlobalSystemMonitor();
    const metrics = systemMonitor.getCurrentMetrics();
    const processMetrics = systemMonitor.getProcessMetrics();

    res.json({
      success: true,
      data: {
        system: metrics,
        process: processMetrics
      }
    });
  } catch (error: any) {
    console.error('获取系统指标失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/performance/system/history
 *
 * 获取系统指标历史
 */
router.get('/system/history', async (req: Request, res: Response) => {
  try {
    const systemMonitor = getGlobalSystemMonitor();
    const { limit = 100 } = req.query;

    const history = systemMonitor.getMetricsHistory(parseInt(limit as string, 10));

    res.json({
      success: true,
      data: {
        count: history.length,
        metrics: history
      }
    });
  } catch (error: any) {
    console.error('获取系统历史失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/performance/system/report
 *
 * 生成系统性能报告
 */
router.get('/system/report', async (req: Request, res: Response) => {
  try {
    const systemMonitor = getGlobalSystemMonitor();
    const { periodStart, periodEnd } = req.query;

    const report = systemMonitor.generateReport(
      periodStart ? parseInt(periodStart as string, 10) : undefined,
      periodEnd ? parseInt(periodEnd as string, 10) : undefined
    );

    res.json({
      success: true,
      data: report
    });
  } catch (error: any) {
    console.error('生成系统报告失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/performance/system/info
 *
 * 获取系统信息
 */
router.get('/system/info', async (req: Request, res: Response) => {
  try {
    const systemMonitor = getGlobalSystemMonitor();
    const info = systemMonitor.getSystemInfo();

    res.json({
      success: true,
      data: info
    });
  } catch (error: any) {
    console.error('获取系统信息失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// 性能分析
// ============================================================

/**
 * GET /api/performance/bottlenecks
 *
 * 检测性能瓶颈
 */
router.get('/bottlenecks', async (req: Request, res: Response) => {
  try {
    const monitor = getGlobalMonitor();
    const { bottlenecks } = monitor.detectBottlenecks();

    res.json({
      success: true,
      data: {
        count: bottlenecks.length,
        bottlenecks
      }
    });
  } catch (error: any) {
    console.error('检测性能瓶颈失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/performance/recommendations
 *
 * 获取性能优化建议
 */
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const monitor = getGlobalMonitor();
    const report = monitor.generateReport();

    res.json({
      success: true,
      data: {
        count: report.recommendations.length,
        recommendations: report.recommendations
      }
    });
  } catch (error: any) {
    console.error('获取优化建议失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// 告警管理
// ============================================================

/**
 * GET /api/performance/alerts
 *
 * 获取告警列表
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const monitor = getGlobalMonitor();
    const { resolved } = req.query;

    const alerts = monitor.getAlerts(
      resolved === undefined ? undefined : resolved === 'true'
    );

    res.json({
      success: true,
      data: {
        count: alerts.length,
        alerts
      }
    });
  } catch (error: any) {
    console.error('获取告警列表失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/performance/alerts/:alertId/resolve
 *
 * 解决告警
 */
router.post('/alerts/:alertId/resolve', async (req: Request, res: Response) => {
  try {
    const monitor = getGlobalMonitor();
    const { alertId } = req.params;

    const success = monitor.resolveAlert(alertId);

    if (success) {
      res.json({
        success: true,
        message: '告警已解决',
        data: { alertId }
      });
    } else {
      res.status(404).json({
        success: false,
        error: '告警不存在'
      });
    }
  } catch (error: any) {
    console.error('解决告警失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// 综合报告
// ============================================================

/**
 * GET /api/performance/report
 *
 * 生成综合性能报告
 */
router.get('/report', async (req: Request, res: Response) => {
  try {
    const monitor = getGlobalMonitor();
    const dbMonitor = getGlobalDatabaseMonitor(prisma);
    const systemMonitor = getGlobalSystemMonitor();

    const { periodStart, periodEnd } = req.query;

    const apiReport = monitor.generateReport(
      periodStart ? parseInt(periodStart as string, 10) : undefined,
      periodEnd ? parseInt(periodEnd as string, 10) : undefined
    );

    const dbReport = await dbMonitor.generateReport(
      periodStart ? parseInt(periodStart as string, 10) : undefined,
      periodEnd ? parseInt(periodEnd as string, 10) : undefined
    );

    const systemReport = systemMonitor.generateReport(
      periodStart ? parseInt(periodStart as string, 10) : undefined,
      periodEnd ? parseInt(periodEnd as string, 10) : undefined
    );

    const bottlenecks = monitor.detectBottlenecks();

    res.json({
      success: true,
      data: {
        period: apiReport.period,
        api: apiReport,
        database: dbReport,
        system: systemReport,
        bottlenecks: bottlenecks.bottlenecks,
        summary: {
          totalRequests: apiReport.summary.totalRequests,
          totalErrors: apiReport.summary.totalErrors,
          avgResponseTime: apiReport.summary.avgResponseTime,
          errorRate: apiReport.summary.errorRate,
          slowQueries: dbReport.summary.slowQueries,
          activeAlerts: apiReport.alerts.length,
          recommendations: apiReport.recommendations.length
        }
      }
    });
  } catch (error: any) {
    console.error('生成综合报告失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================
// 配置管理
// ============================================================

/**
 * GET /api/performance/config
 *
 * 获取监控配置
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const monitor = getGlobalMonitor();
    const dbMonitor = getGlobalDatabaseMonitor(prisma);
    const systemMonitor = getGlobalSystemMonitor();

    res.json({
      success: true,
      data: {
        monitor: monitor.getConfig(),
        database: dbMonitor.getConfig(),
        system: systemMonitor.getConfig()
      }
    });
  } catch (error: any) {
    console.error('获取配置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/performance/config
 *
 * 更新监控配置
 */
router.put('/config', async (req: Request, res: Response) => {
  try {
    const { monitor, database, system } = req.body;

    if (monitor) {
      const monitorInstance = getGlobalMonitor();
      monitorInstance.updateConfig(monitor);
    }

    if (database) {
      const dbMonitor = getGlobalDatabaseMonitor(prisma);
      dbMonitor.updateConfig(database);
    }

    if (system) {
      const systemMonitor = getGlobalSystemMonitor();
      systemMonitor.updateConfig(system);
    }

    res.json({
      success: true,
      message: '配置已更新'
    });
  } catch (error: any) {
    console.error('更新配置失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export { router as performanceRouter };
