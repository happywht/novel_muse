/**
 * System Performance Monitor
 *
 * 系统性能监控服务，监控系统资源使用情况
 * 包括CPU、内存、磁盘I/O、网络I/O等
 */

import { getGlobalMonitor } from './monitor';
import * as os from 'os';

interface SystemMetrics {
  timestamp: number;
  cpuUsage: number; // 0-1
  memoryUsage: number; // MB
  memoryPercentage: number; // 0-1
  freeMemory: number; // MB
  totalMemory: number; // MB
  loadAverage: number[]; // 1分钟、5分钟、15分钟
  uptime: number; // 秒
  platform: string;
  arch: string;
}

interface ProcessMetrics {
  timestamp: number;
  pid: number;
  memoryUsage: number; // MB
  cpuUsage: number; // 0-1
  uptime: number; // 秒
}

interface SystemPerformanceReport {
  period: {
    start: number;
    end: number;
  };
  summary: {
    avgCpuUsage: number;
    avgMemoryUsage: number;
    peakMemoryUsage: number;
    maxCpuUsage: number;
    systemUptime: number;
  };
  trends: {
    cpu: Array<{ timestamp: number; value: number }>;
    memory: Array<{ timestamp: number; value: number }>;
  };
  alerts: string[];
}

interface SystemMonitorConfig {
  samplingInterval?: number; // 采样间隔（毫秒）
  enableCpuMonitoring?: boolean;
  enableMemoryMonitoring?: boolean;
  enableLoadAverageMonitoring?: boolean;
  retentionPeriod?: number; // 数据保留时间（毫秒）
}

export class SystemMonitor {
  private metrics: SystemMetrics[] = [];
  private processMetrics: ProcessMetrics[] = [];
  private config: Required<SystemMonitorConfig>;
  private samplingTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private startTime: number = Date.now();

  constructor(config: SystemMonitorConfig = {}) {
    this.config = {
      samplingInterval: config.samplingInterval || 5000, // 5秒
      enableCpuMonitoring: config.enableCpuMonitoring ?? true,
      enableMemoryMonitoring: config.enableMemoryMonitoring ?? true,
      enableLoadAverageMonitoring: config.enableLoadAverageMonitoring ?? true,
      retentionPeriod: config.retentionPeriod || 24 * 60 * 60 * 1000 // 24小时
    };

    // 启动定期采样
    this.startSampling();
  }

  /**
   * 启动定期采样
   */
  private startSampling(): void {
    // 立即采样一次
    this.sampleSystemMetrics();

    // 定期采样
    this.samplingTimer = setInterval(() => {
      this.sampleSystemMetrics();
    }, this.config.samplingInterval);

    // 定期清理旧数据
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000); // 每小时清理一次
  }

  /**
   * 采样系统指标
   */
  private sampleSystemMetrics(): void {
    const metrics = this.collectSystemMetrics();
    this.metrics.push(metrics);

    // 记录到性能监控器
    const monitor = getGlobalMonitor();

    if (this.config.enableCpuMonitoring) {
      monitor.recordSystemMetric('cpuUsage', metrics.cpuUsage, {
        loadAverage: metrics.loadAverage
      });
    }

    if (this.config.enableMemoryMonitoring) {
      monitor.recordSystemMetric('memoryUsage', metrics.memoryUsage, {
        percentage: metrics.memoryPercentage,
        freeMemory: metrics.freeMemory
      });
    }

    // 限制数据量
    const maxSamples = Math.floor(this.config.retentionPeriod / this.config.samplingInterval);
    if (this.metrics.length > maxSamples) {
      this.metrics.splice(0, this.metrics.length - maxSamples);
    }
  }

  /**
   * 收集系统指标
   */
  private collectSystemMetrics(): SystemMetrics {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // 计算 CPU 使用率
    let cpuUsage = 0;
    if (this.config.enableCpuMonitoring && cpus.length > 0) {
      const startUsage = this.getCpuInfo();
      // 短暂延迟以获取差异
      const start = Date.now();
      while (Date.now() - start < 100) { /* 等待100ms */ }
      const endUsage = this.getCpuInfo();

      const totalDiff = endUsage.total - startUsage.total;
      const idleDiff = endUsage.idle - startUsage.idle;

      if (totalDiff > 0) {
        cpuUsage = 1 - (idleDiff / totalDiff);
      }
    }

    // 获取负载平均值（仅Unix系统）
    let loadAverage: number[] = [0, 0, 0];
    if (this.config.enableLoadAverageMonitoring && os.platform() !== 'win32') {
      loadAverage = os.loadavg();
    }

    return {
      timestamp: Date.now(),
      cpuUsage,
      memoryUsage: usedMemory / (1024 * 1024), // 转换为MB
      memoryPercentage: usedMemory / totalMemory,
      freeMemory: freeMemory / (1024 * 1024), // 转换为MB
      totalMemory: totalMemory / (1024 * 1024), // 转换为MB
      loadAverage,
      uptime: os.uptime(),
      platform: os.platform(),
      arch: os.arch()
    };
  }

  /**
   * 获取 CPU 信息
   */
  private getCpuInfo(): { total: number; idle: number } {
    const cpus = os.cpus();
    let total = 0;
    let idle = 0;

    for (const cpu of cpus) {
      total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
      idle += cpu.times.idle;
    }

    return { total, idle };
  }

  /**
   * 获取进程指标
   */
  getProcessMetrics(): ProcessMetrics {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      timestamp: Date.now(),
      pid: process.pid,
      memoryUsage: memoryUsage.rss / (1024 * 1024), // 转换为MB
      cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // 转换为秒
      uptime: process.uptime()
    };
  }

  /**
   * 获取当前系统指标
   */
  getCurrentMetrics(): SystemMetrics {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : this.collectSystemMetrics();
  }

  /**
   * 获取历史指标
   */
  getMetricsHistory(limit?: number): SystemMetrics[] {
    const history = this.metrics.slice(limit ? -limit : undefined);
    return history;
  }

  /**
   * 计算平均 CPU 使用率
   */
  getAverageCpuUsage(period?: number): number {
    const cutoffTime = Date.now() - (period || this.config.retentionPeriod);
    const relevantMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);

    if (relevantMetrics.length === 0) return 0;

    const totalCpu = relevantMetrics.reduce((sum, m) => sum + m.cpuUsage, 0);
    return totalCpu / relevantMetrics.length;
  }

  /**
   * 计算平均内存使用
   */
  getAverageMemoryUsage(period?: number): number {
    const cutoffTime = Date.now() - (period || this.config.retentionPeriod);
    const relevantMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);

    if (relevantMetrics.length === 0) return 0;

    const totalMemory = relevantMetrics.reduce((sum, m) => sum + m.memoryUsage, 0);
    return totalMemory / relevantMetrics.length;
  }

  /**
   * 获取峰值内存使用
   */
  getPeakMemoryUsage(period?: number): number {
    const cutoffTime = Date.now() - (period || this.config.retentionPeriod);
    const relevantMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);

    if (relevantMetrics.length === 0) return 0;

    return Math.max(...relevantMetrics.map(m => m.memoryUsage));
  }

  /**
   * 生成系统性能报告
   */
  generateReport(periodStart?: number, periodEnd?: number): SystemPerformanceReport {
    const start = periodStart || Date.now() - this.config.retentionPeriod;
    const end = periodEnd || Date.now();

    const periodMetrics = this.metrics.filter(m => m.timestamp >= start && m.timestamp <= end);

    if (periodMetrics.length === 0) {
      return {
        period: { start, end },
        summary: {
          avgCpuUsage: 0,
          avgMemoryUsage: 0,
          peakMemoryUsage: 0,
          maxCpuUsage: 0,
          systemUptime: os.uptime()
        },
        trends: { cpu: [], memory: [] },
        alerts: []
      };
    }

    const cpuValues = periodMetrics.map(m => m.cpuUsage);
    const memoryValues = periodMetrics.map(m => m.memoryUsage);

    const alerts: string[] = [];

    // 检查告警条件
    const avgCpu = cpuValues.reduce((sum, v) => sum + v, 0) / cpuValues.length;
    if (avgCpu > 0.8) {
      alerts.push(`平均CPU使用率过高：${(avgCpu * 100).toFixed(2)}%`);
    }

    const avgMemory = memoryValues.reduce((sum, v) => sum + v, 0) / memoryValues.length;
    if (avgMemory > 1024) { // 1GB
      alerts.push(`平均内存使用过高：${avgMemory.toFixed(2)}MB`);
    }

    const peakMemory = Math.max(...memoryValues);
    if (peakMemory > 2048) { // 2GB
      alerts.push(`峰值内存使用过高：${peakMemory.toFixed(2)}MB`);
    }

    return {
      period: { start, end },
      summary: {
        avgCpuUsage: avgCpu,
        avgMemoryUsage: avgMemory,
        peakMemoryUsage: peakMemory,
        maxCpuUsage: Math.max(...cpuValues),
        systemUptime: os.uptime()
      },
      trends: {
        cpu: periodMetrics.map(m => ({ timestamp: m.timestamp, value: m.cpuUsage })),
        memory: periodMetrics.map(m => ({ timestamp: m.timestamp, value: m.memoryUsage }))
      },
      alerts
    };
  }

  /**
   * 获取系统信息
   */
  getSystemInfo(): {
    platform: string;
    arch: string;
    cpuModel: string;
    cpuCores: number;
    totalMemory: number; // MB
    nodeVersion: string;
    uptime: number; // 秒
  } {
    const cpus = os.cpus();

    return {
      platform: os.platform(),
      arch: os.arch(),
      cpuModel: cpus.length > 0 ? cpus[0].model : 'unknown',
      cpuCores: cpus.length,
      totalMemory: os.totalmem() / (1024 * 1024),
      nodeVersion: process.version,
      uptime: os.uptime()
    };
  }

  /**
   * 清理旧指标
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - this.config.retentionPeriod;

    const beforeCount = this.metrics.length;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoffTime);
    const afterCount = this.metrics.length;

    if (beforeCount > afterCount) {
      console.log(`🧹 清理了 ${beforeCount - afterCount} 条旧系统指标`);
    }
  }

  /**
   * 销毁监控器
   */
  destroy(): void {
    if (this.samplingTimer) {
      clearInterval(this.samplingTimer);
    }
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.metrics = [];
    this.processMetrics = [];
  }

  /**
   * 获取配置
   */
  getConfig(): Required<SystemMonitorConfig> {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<SystemMonitorConfig>): void {
    Object.assign(this.config, updates);

    // 如果采样间隔改变，重启采样定时器
    if (updates.samplingInterval && this.samplingTimer) {
      clearInterval(this.samplingTimer);
      this.startSampling();
    }
  }
}

// 全局系统监控器实例
let globalSystemMonitor: SystemMonitor | null = null;

export const getGlobalSystemMonitor = (): SystemMonitor => {
  if (!globalSystemMonitor) {
    globalSystemMonitor = new SystemMonitor();
  }
  return globalSystemMonitor;
};

export const destroyGlobalSystemMonitor = (): void => {
  if (globalSystemMonitor) {
    globalSystemMonitor.destroy();
    globalSystemMonitor = null;
  }
};
