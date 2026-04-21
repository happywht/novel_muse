/**
 * Performance Monitoring Middleware
 *
 * Express 中间件，用于监控 HTTP 请求的性能
 * 自动记录响应时间、错误率、并发请求数等指标
 */

import { Request, Response, NextFunction } from 'express';
import { getGlobalMonitor } from '../services/performance';

interface PerformanceRequestData {
  requestId: string;
  method: string;
  path: string;
  query: any;
  body: any;
  ip: string;
  userAgent: string;
  startTime: number;
  timestamp: number;
}

interface PerformanceResponseData extends PerformanceRequestData {
  statusCode: number;
  duration: number;
  responseSize: number;
}

/**
 * 扩展 Express Request 类型以包含性能数据
 */
declare global {
  namespace Express {
    interface Request {
      performanceData?: PerformanceRequestData;
    }
  }
}

/**
 * 生成唯一请求 ID
 */
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 计算响应大小（估算）
 */
const calculateResponseSize = (res: Response): number => {
  const contentLength = res.getHeader('content-length');
  if (typeof contentLength === 'number') {
    return contentLength;
  }
  if (typeof contentLength === 'string') {
    return parseInt(contentLength, 10) || 0;
  }
  return 0;
};

/**
 * 性能监控中间件
 *
 * 自动记录每个请求的性能指标
 */
export const performanceMiddleware = (options: {
  excludePaths?: string[];
  excludeMethods?: string[];
  enableHeaders?: boolean;
  enableLogging?: boolean;
} = {}) => {
  const {
    excludePaths = ['/health', '/api/health'],
    excludeMethods = [],
    enableHeaders = true,
    enableLogging = true
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // 检查是否应该排除此请求
    if (excludePaths.includes(req.path) || excludeMethods.includes(req.method)) {
      return next();
    }

    const requestId = generateRequestId();
    const startTime = Date.now();

    // 记录请求数据
    const performanceData: PerformanceRequestData = {
      requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      ip: req.ip,
      userAgent: req.get('user-agent') || 'unknown',
      startTime,
      timestamp: startTime
    };

    req.performanceData = performanceData;

    // 记录请求开始
    const monitor = getGlobalMonitor();
    monitor.startRequest(requestId);

    // 记录并发请求数
    const activeRequests = monitor.getActiveRequestCount();
    monitor.recordSystemMetric('concurrentRequests', activeRequests, {
      endpoint: req.path,
      method: req.method
    });

    // 添加性能相关的响应头
    if (enableHeaders) {
      res.setHeader('X-Request-ID', requestId);
      res.setHeader('X-Process-Start', startTime.toString());
    }

    // 拦截响应结束
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    const originalEnd = res.end.bind(res);

    let responseLogged = false;

    const logResponse = () => {
      if (responseLogged) return;
      responseLogged = true;

      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const responseSize = calculateResponseSize(res);

      // 记录到性能监控器
      monitor.recordApiRequest(
        req.path,
        duration,
        statusCode,
        {
          method: req.method,
          query: req.query,
          ip: req.ip,
          userAgent: req.get('user-agent'),
          responseSize,
          requestId
        }
      );

      // 记录请求结束
      monitor.endRequest(requestId);

      // 记录并发请求数（请求完成后）
      const finalActiveRequests = monitor.getActiveRequestCount();
      monitor.recordSystemMetric('concurrentRequests', finalActiveRequests);

      // 添加性能相关的响应头
      if (enableHeaders) {
        res.setHeader('X-Response-Time', `${duration}ms`);
        res.setHeader('X-Process-Duration', duration.toString());
      }

      // 日志输出
      if (enableLogging) {
        const statusEmoji = statusCode >= 500 ? '🔴' : statusCode >= 400 ? '🟡' : '🟢';
        console.log(
          `${statusEmoji} ${req.method} ${req.path} ${statusCode} ${duration}ms`
        );
      }
    };

    // 重写 res.json
    res.json = function(data: any) {
      logResponse();
      return originalJson(data);
    };

    // 重写 res.send
    res.send = function(data: any) {
      logResponse();
      return originalSend(data);
    };

    // 重写 res.end
    res.end = function(data?: any) {
      logResponse();
      return originalEnd(data);
    };

    // 处理错误
    res.on('error', (err) => {
      logResponse();
      console.error('Response error:', err);
    });

    next();
  };
};

/**
 * 超时检测中间件
 *
 * 检测请求是否超过指定时间
 */
export const timeoutMiddleware = (timeout: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeoutTimer = setTimeout(() => {
      if (!res.headersSent) {
        console.warn(`⏰ 请求超时: ${req.method} ${req.path}`);
        res.status(504).json({
          error: 'Gateway Timeout',
          message: `Request exceeded ${timeout}ms timeout`,
          path: req.path,
          method: req.method
        });
      }
    }, timeout);

    // 清理定时器
    res.on('finish', () => {
      clearTimeout(timeoutTimer);
    });

    res.on('close', () => {
      clearTimeout(timeoutTimer);
    });

    next();
  };
};

/**
 * 并发限制中间件
 *
 * 限制同时处理的请求数量
 */
export const rateLimitMiddleware = (options: {
  maxConcurrent?: number;
  message?: string;
} = {}) => {
  const {
    maxConcurrent = 100,
    message = 'Too many concurrent requests'
  } = options;

  let activeRequests = 0;
  const queue: Array<() => void> = [];

  const processQueue = () => {
    if (activeRequests < maxConcurrent && queue.length > 0) {
      const next = queue.shift();
      if (next) {
        activeRequests++;
        next();
      }
    }
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (activeRequests >= maxConcurrent) {
      // 将请求加入队列
      queue.push(() => {
        next();

        // 请求完成后处理队列
        res.on('finish', () => {
          activeRequests--;
          processQueue();
        });

        res.on('close', () => {
          activeRequests--;
          processQueue();
        });
      });

      // 如果队列过长，返回错误
      if (queue.length > maxConcurrent * 2) {
        return res.status(429).json({
          error: 'Too Many Requests',
          message,
          queueLength: queue.length
        });
      }
    } else {
      activeRequests++;
      next();

      // 请求完成后处理队列
      res.on('finish', () => {
        activeRequests--;
        processQueue();
      });

      res.on('close', () => {
        activeRequests--;
        processQueue();
      });
    }
  };
};

/**
 * 性能分析中间件
 *
 * 在开发环境下提供详细的性能分析信息
 */
export const profilingMiddleware = (options: {
  enabled?: boolean;
  threshold?: number; // 仅分析超过此阈值的请求（毫秒）
} = {}) => {
  const {
    enabled = process.env.NODE_ENV === 'development',
    threshold = 1000
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    if (!enabled) {
      return next();
    }

    const startTime = Date.now();
    const startMemory = process.memoryUsage();

    // 收集性能数据
    const profileData: any = {
      path: req.path,
      method: req.method,
      query: req.query,
      startTime,
      startMemory
    };

    // 拦截响应
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      const duration = Date.now() - startTime;
      const endMemory = process.memoryUsage();

      // 仅记录超过阈值的请求
      if (duration > threshold) {
        profileData.duration = duration;
        profileData.endMemory = endMemory;
        profileData.memoryDelta = {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external
        };

        console.log('📊 性能分析数据:', JSON.stringify(profileData, null, 2));
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * 性能报告中间件
 *
 * 在响应头中添加性能摘要信息
 */
export const performanceReportMiddleware = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const monitor = getGlobalMonitor();

    // 获取系统信息
    const systemInfo = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };

    // 拦截响应
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      const duration = Date.now() - startTime;

      // 添加性能信息到响应头
      res.setHeader('X-Response-Time', `${duration}ms`);
      res.setHeader('X-Server-Uptime', systemInfo.uptime.toFixed(2));
      res.setHeader('X-Memory-Usage', `${systemInfo.memory.heapUsed / 1024 / 1024}MB`);

      // 如果是成功响应，添加性能报告
      if (res.statusCode >= 200 && res.statusCode < 300 && typeof data === 'object') {
        const endpointStats = monitor.getEndpointStats(req.path);

        if (endpointStats[req.path]) {
          (data as any)._performance = {
            thisRequest: {
              duration,
              timestamp: startTime
            },
            endpointStats: {
              avgDuration: endpointStats[req.path].avgDuration,
              p95: endpointStats[req.path].p95,
              p99: endpointStats[req.path].p99,
              errorRate: endpointStats[req.path].errorRate
            }
          };
        }
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * 错误追踪中间件
 *
 * 追踪和记录错误信息
 */
export const errorTrackingMiddleware = () => {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    const monitor = getGlobalMonitor();
    const duration = req.performanceData
      ? Date.now() - req.performanceData.startTime
      : 0;

    // 记录错误到性能监控器
    monitor.recordApiRequest(
      req.path,
      duration,
      res.statusCode || 500,
      {
        method: req.method,
        error: err.message,
        stack: err.stack,
        query: req.query,
        body: req.body,
        requestId: req.performanceData?.requestId
      }
    );

    // 记录到控制台
    console.error('❌ Error tracked:', {
      path: req.path,
      method: req.method,
      error: err.message,
      stack: err.stack,
      duration,
      requestId: req.performanceData?.requestId
    });

    next(err);
  };
};

/**
 * 获取性能数据统计
 */
export const getPerformanceStats = () => {
  const monitor = getGlobalMonitor();

  return {
    endpoint: monitor.getEndpointStats(),
    database: monitor.getDatabaseStats(),
    system: monitor.getSystemMetrics(),
    alerts: monitor.getAlerts(false),
    bottlenecks: monitor.detectBottlenecks()
  };
};
