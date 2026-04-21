/**
 * 事务管理器
 *
 * 解决后端数据库操作的一致性问题，提供事务支持、重试机制、超时控制
 */

import { getDriver } from './client';
import { int, Node, Relationship, Session } from 'neo4j-driver';

interface TransactionOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  isolationLevel?: 'READ_COMMITTED' | 'SNAPSHOT' | 'SERIALIZABLE';
}

interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  retryCount?: number;
  duration?: number;
}

export class TransactionManager {
  private driver: any;
  private defaultOptions: Required<TransactionOptions>;

  constructor(options: TransactionOptions = {}) {
    this.driver = getDriver();
    this.defaultOptions = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      timeout: options.timeout || 30000,
      isolationLevel: options.isolationLevel || 'READ_COMMITTED'
    };
  }

  /**
   * 执行事务的通用方法
   * @param transactionFn 事务函数
   * @param options 事务选项
   */
  async executeTransaction<T>(
    transactionFn: (session: Session) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const startTime = Date.now();
    const mergedOptions = { ...this.defaultOptions, ...options };
    let lastError: Error | undefined;
    let retryCount = 0;

    while (retryCount <= mergedOptions.maxRetries) {
      const session = this.driver.session({
        defaultAccessMode: 'WRITE',
        bookmarks: undefined,
        maxTransactionRetryTime: mergedOptions.timeout
      });

      try {
        const result = await session.executeWrite(async (tx) => {
          // 在事务上下文中执行用户提供的函数
          return await transactionFn(tx as any);
        });

        await session.close();

        return {
          success: true,
          data: result,
          retryCount,
          duration: Date.now() - startTime
        };
      } catch (error) {
        lastError = error as Error;
        await session.close();

        // 检查是否为可重试的错误
        if (this.isRetryableError(error) && retryCount < mergedOptions.maxRetries) {
          retryCount++;
          const delay = mergedOptions.retryDelay * Math.pow(2, retryCount - 1); // 指数退避
          await this.sleep(delay);
          continue;
        }

        // 不可重试的错误或达到最大重试次数
        return {
          success: false,
          error: lastError,
          retryCount,
          duration: Date.now() - startTime
        };
      }
    }

    return {
      success: false,
      error: lastError,
      retryCount,
      duration: Date.now() - startTime
    };
  }

  /**
   * 执行只读事务
   */
  async executeReadTransaction<T>(
    transactionFn: (session: Session) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>> {
    const startTime = Date.now();
    const mergedOptions = { ...this.defaultOptions, ...options };
    let lastError: Error | undefined;
    let retryCount = 0;

    while (retryCount <= mergedOptions.maxRetries) {
      const session = this.driver.session({
        defaultAccessMode: 'READ',
        maxTransactionRetryTime: mergedOptions.timeout
      });

      try {
        const result = await session.executeRead(async (tx) => {
          return await transactionFn(tx as any);
        });

        await session.close();

        return {
          success: true,
          data: result,
          retryCount,
          duration: Date.now() - startTime
        };
      } catch (error) {
        lastError = error as Error;
        await session.close();

        if (this.isRetryableError(error) && retryCount < mergedOptions.maxRetries) {
          retryCount++;
          const delay = mergedOptions.retryDelay * Math.pow(2, retryCount - 1);
          await this.sleep(delay);
          continue;
        }

        return {
          success: false,
          error: lastError,
          retryCount,
          duration: Date.now() - startTime
        };
      }
    }

    return {
      success: false,
      error: lastError,
      retryCount,
      duration: Date.now() - startTime
    };
  }

  /**
   * 批量执行多个事务
   */
  async executeBatchTransactions<T>(
    transactionFns: Array<(session: Session) => Promise<T>>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>[]> {
    const results: TransactionResult<T>[] = [];

    for (const transactionFn of transactionFns) {
      const result = await this.executeTransaction(transactionFn, options);
      results.push(result);

      // 如果某个事务失败且不是可重试的错误，则停止批量操作
      if (!result.success && !this.isRetryableError(result.error)) {
        break;
      }
    }

    return results;
  }

  /**
   * 并行执行多个只读事务
   */
  async executeParallelReadTransactions<T>(
    transactionFns: Array<(session: Session) => Promise<T>>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T>[]> {
    const promises = transactionFns.map(fn =>
      this.executeReadTransaction(fn, options)
    );

    return Promise.all(promises);
  }

  /**
   * 判断错误是否可重试
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message || '';

    // Neo4j 可重试错误类型
    const retryablePatterns = [
      /Lock/,
      /Deadlock/,
      /Transient/,
      /ServiceUnavailable/,
      /SessionExpired/,
      /Connection/,
      /Timeout/
    ];

    return retryablePatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    const session = this.driver.session();
    try {
      const result = await session.run('RETURN 1 AS num');
      return result.records.length > 0;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    } finally {
      await session.close();
    }
  }

  /**
   * 获取连接池统计信息
   */
  async getPoolStats(): Promise<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
  }> {
    try {
      // Neo4j Driver 4.x+ 提供了连接池统计
      const poolStats = this.driver._pool?._statistics || {};

      return {
        totalConnections: poolStats.totalConnections || 0,
        activeConnections: poolStats.inUseConnections || 0,
        idleConnections: (poolStats.totalConnections || 0) - (poolStats.inUseConnections || 0)
      };
    } catch (error) {
      console.error('Failed to get pool stats:', error);
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0
      };
    }
  }
}

// 单例实例
let transactionManagerInstance: TransactionManager | null = null;

export const getTransactionManager = (): TransactionManager => {
  if (!transactionManagerInstance) {
    transactionManagerInstance = new TransactionManager({
      maxRetries: 3,
      retryDelay: 1000,
      timeout: 30000,
      isolationLevel: 'READ_COMMITTED'
    });
  }
  return transactionManagerInstance;
};

/**
 * 事务装饰器 - 为函数自动添加事务支持
 */
export function withTransaction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: TransactionOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    const manager = getTransactionManager();
    return manager.executeTransaction((session) => fn(session, ...args), options);
  }) as T;
}

/**
 * 只读事务装饰器
 */
export function withReadTransaction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: TransactionOptions = {}
): T {
  return (async (...args: Parameters<T>) => {
    const manager = getTransactionManager();
    return manager.executeReadTransaction((session) => fn(session, ...args), options);
  }) as T;
}

/**
 * 批量操作辅助函数
 */
export async function batchOperation<T>(
  items: T[],
  operation: (item: T, session: Session) => Promise<void>,
  batchSize: number = 100,
  options: TransactionOptions = {}
): Promise<{ success: number; failed: number; errors: Error[] }> {
  const manager = getTransactionManager();
  let success = 0;
  let failed = 0;
  const errors: Error[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    const result = await manager.executeTransaction(async (session) => {
      for (const item of batch) {
        try {
          await operation(item, session);
          success++;
        } catch (error) {
          failed++;
          errors.push(error as Error);
        }
      }
    }, options);

    if (!result.success) {
      errors.push(result.error!);
      failed += batch.length;
      success -= batch.length - failed;
    }
  }

  return { success, failed, errors };
}
