/**
 * 竞态条件检测和修复工具
 *
 * 检测和修复前端应用中的竞态条件、内存泄漏、状态不一致等问题
 */

interface AsyncOperation {
  id: string;
  startTime: number;
  component: string;
  operation: string;
  status: 'pending' | 'completed' | 'aborted' | 'failed';
  abortController?: AbortController;
}

interface RaceConditionWarning {
  type: 'race_condition' | 'memory_leak' | 'state_inconsistency' | 'stale_data';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  component: string;
  timestamp: number;
  suggestions: string[];
}

export class RaceConditionDetector {
  private operations: Map<string, AsyncOperation> = new Map();
  private warnings: RaceConditionWarning[] = [];
  private maxWarnings = 1000;
  private monitoringEnabled = true;

  /**
   * 注册异步操作
   */
  registerOperation(
    component: string,
    operation: string,
    abortController?: AbortController
  ): string {
    if (!this.monitoringEnabled) return 'noop';

    const id = `${component}_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const asyncOp: AsyncOperation = {
      id,
      startTime: Date.now(),
      component,
      operation,
      status: 'pending',
      abortController
    };

    this.operations.set(id, asyncOp);

    // 检测潜在的竞态条件
    this.detectRaceConditions(component, operation);

    return id;
  }

  /**
   * 完成异步操作
   */
  completeOperation(id: string, success: boolean = true): void {
    const operation = this.operations.get(id);
    if (operation) {
      operation.status = success ? 'completed' : 'failed';
      this.cleanupOperation(id);
    }
  }

  /**
   * 检测竞态条件
   */
  private detectRaceConditions(component: string, operation: string): void {
    const now = Date.now();
    const sameComponentOps = Array.from(this.operations.values()).filter(
      op => op.component === component && op.operation === operation
    );

    // 检测是否有多个相同操作同时进行
    if (sameComponentOps.length > 1) {
      const pendingOps = sameComponentOps.filter(op => op.status === 'pending');

      if (pendingOps.length > 1) {
        this.addWarning({
          type: 'race_condition',
          severity: 'high',
          message: `检测到竞态条件: ${component} 中的 ${operation} 操作有 ${pendingOps.length} 个实例同时运行`,
          component,
          timestamp: now,
          suggestions: [
            '使用AbortController取消之前的请求',
            '实现请求去重机制',
            '添加loading状态检查',
            '使用防抖或节流控制请求频率'
          ]
        });
      }
    }

    // 检测长时间运行的操作
    sameComponentOps.forEach(op => {
      const duration = now - op.startTime;
      if (duration > 10000) { // 10秒
        this.addWarning({
          type: 'race_condition',
          severity: 'medium',
          message: `检测到长时间运行的操作: ${component}.${operation} 已运行 ${duration}ms`,
          component,
          timestamp: now,
          suggestions: [
            '检查操作是否真正完成',
            '添加超时控制',
            '优化查询性能',
            '考虑添加进度指示器'
          ]
        });
      }
    });
  }

  /**
   * 检测内存泄漏
   */
  detectMemoryLeaks(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5分钟

    this.operations.forEach((op, id) => {
      const duration = now - op.startTime;

      if (duration > staleThreshold && op.status === 'pending') {
        this.addWarning({
          type: 'memory_leak',
          severity: 'critical',
          message: `检测到可能的内存泄漏: ${op.component}.${op.operation} 已运行 ${duration}ms 且状态仍为pending`,
          component: op.component,
          timestamp: now,
          suggestions: [
            '组件卸载时取消所有pending请求',
            '使用AbortController',
            '添加cleanup函数',
            '检查是否有闭包引用'
          ]
        });

        // 自动清理长时间运行的请求
        if (op.abortController) {
          op.abortController.abort();
          op.status = 'aborted';
        }
      }
    });
  }

  /**
   * 检测状态不一致
   */
  detectStateInconsistency(
    component: string,
    statePath: string,
    currentValue: any,
    expectedValue: any
  ): void {
    if (currentValue !== expectedValue) {
      this.addWarning({
        type: 'state_inconsistency',
        severity: 'medium',
        message: `状态不一致: ${component}.${statePath} 当前值 ${JSON.stringify(currentValue)} 与预期值 ${JSON.stringify(expectedValue)} 不匹配`,
        component,
        timestamp: Date.now(),
        suggestions: [
          '检查状态更新逻辑',
          '使用状态管理工具（如Zustand）',
          '避免直接修改状态',
          '添加状态验证逻辑'
        ]
      });
    }
  }

  /**
   * 检测过期数据
   */
  detectStaleData(
    component: string,
    dataSource: string,
    dataAge: number,
    maxAge: number = 60000 // 默认1分钟
  ): void {
    if (dataAge > maxAge) {
      this.addWarning({
        type: 'stale_data',
        severity: 'low',
        message: `数据可能过期: ${component} 中的 ${dataSource} 数据年龄 ${dataAge}ms 超过最大允许年龄 ${maxAge}ms`,
        component,
        timestamp: Date.now(),
        suggestions: [
          '实现自动刷新机制',
          '添加数据有效性检查',
          '使用实时数据更新',
          '考虑添加缓存失效策略'
        ]
      });
    }
  }

  /**
   * 添加警告
   */
  private addWarning(warning: RaceConditionWarning): void {
    this.warnings.push(warning);

    // 限制警告数量
    if (this.warnings.length > this.maxWarnings) {
      this.warnings = this.warnings.slice(-this.maxWarnings);
    }

    // 在开发环境中输出到控制台
    if (process.env.NODE_ENV === 'development') {
      console.warn(`🚨 竞态条件检测器警告:`, warning);
    }
  }

  /**
   * 清理操作
   */
  private cleanupOperation(id: string): void {
    // 延迟删除，以便进行统计分析
    setTimeout(() => {
      this.operations.delete(id);
    }, 60000); // 保留1分钟用于分析
  }

  /**
   * 获取所有警告
   */
  getWarnings(filter?: {
    component?: string;
    type?: RaceConditionWarning['type'];
    severity?: RaceConditionWarning['severity'];
    startTime?: number;
    endTime?: number;
  }): RaceConditionWarning[] {
    let filtered = this.warnings;

    if (filter) {
      filtered = filtered.filter(warning => {
        if (filter.component && warning.component !== filter.component) return false;
        if (filter.type && warning.type !== filter.type) return false;
        if (filter.severity && warning.severity !== filter.severity) return false;
        if (filter.startTime && warning.timestamp < filter.startTime) return false;
        if (filter.endTime && warning.timestamp > filter.endTime) return false;
        return true;
      });
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    totalOperations: number;
    activeOperations: number;
    completedOperations: number;
    failedOperations: number;
    abortedOperations: number;
    warningsByType: Record<string, number>;
    warningsBySeverity: Record<string, number>;
  } {
    const operations = Array.from(this.operations.values());

    const warningsByType = this.warnings.reduce((acc, warning) => {
      acc[warning.type] = (acc[warning.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const warningsBySeverity = this.warnings.reduce((acc, warning) => {
      acc[warning.severity] = (acc[warning.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalOperations: operations.length,
      activeOperations: operations.filter(op => op.status === 'pending').length,
      completedOperations: operations.filter(op => op.status === 'completed').length,
      failedOperations: operations.filter(op => op.status === 'failed').length,
      abortedOperations: operations.filter(op => op.status === 'aborted').length,
      warningsByType,
      warningsBySeverity
    };
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const stats = this.getStatistics();
    const recentWarnings = this.getWarnings().slice(0, 10);

    let report = '🔍 竞态条件检测报告\n';
    report += '='.repeat(50) + '\n\n';

    report += '📊 统计信息:\n';
    report += `  - 总操作数: ${stats.totalOperations}\n`;
    report += `  - 活跃操作: ${stats.activeOperations}\n`;
    report += `  - 完成操作: ${stats.completedOperations}\n`;
    report += `  - 失败操作: ${stats.failedOperations}\n`;
    report += `  - 中止操作: ${stats.abortedOperations}\n\n`;

    report += '⚠️ 警告统计:\n';
    Object.entries(stats.warningsByType).forEach(([type, count]) => {
      report += `  - ${type}: ${count}\n`;
    });
    report += '\n';

    if (recentWarnings.length > 0) {
      report += '🚨 最近警告:\n';
      recentWarnings.forEach(warning => {
        report += `  [${warning.severity.toUpperCase()}] ${warning.message}\n`;
        report += `    组件: ${warning.component}\n`;
        report += `    时间: ${new Date(warning.timestamp).toISOString()}\n`;
        if (warning.suggestions.length > 0) {
          report += `    建议:\n`;
          warning.suggestions.forEach(suggestion => {
            report += `      - ${suggestion}\n`;
          });
        }
        report += '\n';
      });
    }

    return report;
  }

  /**
   * 清除所有警告
   */
  clearWarnings(): void {
    this.warnings = [];
  }

  /**
   * 启动定期监控
   */
  startMonitoring(interval: number = 60000): void {
    setInterval(() => {
      this.detectMemoryLeaks();
    }, interval);
  }

  /**
   * 启用/禁用监控
   */
  setMonitoringEnabled(enabled: boolean): void {
    this.monitoringEnabled = enabled;
  }

  /**
   * 销毁检测器
   */
  destroy(): void {
    // 取消所有活跃操作
    this.operations.forEach(op => {
      if (op.abortController && op.status === 'pending') {
        op.abortController.abort();
      }
    });

    this.operations.clear();
    this.warnings = [];
  }
}

// 全局实例
let globalDetector: RaceConditionDetector | null = null;

export const getRaceConditionDetector = (): RaceConditionDetector => {
  if (!globalDetector) {
    globalDetector = new RaceConditionDetector();
    // 在开发环境启动自动监控
    if (process.env.NODE_ENV === 'development') {
      globalDetector.startMonitoring();
    }
  }
  return globalDetector;
};

/**
 * React Hook for race condition detection
 */
export function useRaceConditionDetector(componentName: string) {
  const detector = getRaceConditionDetector();

  return {
    registerOperation: (operation: string, abortController?: AbortController) => {
      return detector.registerOperation(componentName, operation, abortController);
    },
    completeOperation: (id: string, success?: boolean) => {
      detector.completeOperation(id, success);
    },
    detectStateInconsistency: (statePath: string, currentValue: any, expectedValue: any) => {
      detector.detectStateInconsistency(componentName, statePath, currentValue, expectedValue);
    },
    detectStaleData: (dataSource: string, dataAge: number, maxAge?: number) => {
      detector.detectStaleData(componentName, dataSource, dataAge, maxAge);
    },
    getWarnings: () => detector.getWarnings({ component: componentName }),
    getStatistics: () => detector.getStatistics()
  };
}
