/**
 * Global Error Handling Middleware
 *
 * 提供统一的错误处理机制，捕获和处理应用程序中的所有错误
 * 包括：
 * - 异步路由处理器错误
 * - 数据库连接错误
 * - Neo4j 连接错误
 * - API 调用错误
 * - 验证错误
 */

import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

/**
 * 自定义错误类
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // 维护正确的堆栈跟踪（仅在V8引擎中）
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 验证错误类
 */
export class ValidationError extends AppError {
  public details?: any;

  constructor(message: string, details?: any) {
    super(message, 400);
    this.details = details;
  }
}

/**
 * 数据库错误处理
 */
export class DatabaseError extends AppError {
  public originalError?: any;

  constructor(message: string, originalError?: any) {
    super(message, 500);
    this.originalError = originalError;
  }
}

/**
 * Neo4j 错误处理
 */
export class Neo4jError extends AppError {
  public originalError?: any;

  constructor(message: string, originalError?: any) {
    super(message, 500);
    this.originalError = originalError;
  }
}

/**
 * 异步路由处理器包装器
 * 自动捕获异步函数中的错误并传递给错误处理中间件
 */
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Prisma 错误处理助手
 */
export function handlePrismaError(error: any): AppError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // 唯一约束违反
    if (error.code === 'P2002') {
      return new ValidationError('资源已存在', {
        field: error.meta?.target,
        code: 'P2002'
      });
    }

    // 记录未找到
    if (error.code === 'P2025') {
      return new AppError('请求的资源不存在', 404);
    }

    // 其他已知错误
    return new DatabaseError(`数据库操作失败: ${error.message}`, error);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new ValidationError('请求参数验证失败', error.message);
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return new DatabaseError('数据库连接初始化失败', error);
  }

  // 未知错误
  return new DatabaseError('未知数据库错误', error);
}

/**
 * Neo4j 错误处理助手
 */
export function handleNeo4jError(error: any): AppError {
  // 检查是否是连接错误
  if (error.message && error.message.includes('connect')) {
    return new Neo4jError('Neo4j 连接失败，请检查服务状态', error);
  }

  // 检查是否是查询语法错误
  if (error.message && error.message.includes('query')) {
    return new Neo4jError('Neo4j 查询语法错误', error);
  }

  // 其他 Neo4j 错误
  return new Neo4jError(`Neo4j 操作失败: ${error.message}`, error);
}

/**
 * 全局错误处理中间件
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 默认错误状态码和消息
  let statusCode = 500;
  let message = '服务器内部错误';
  let details: any = undefined;
  let isOperational = false;

  // 处理自定义应用错误
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    isOperational = err.isOperational;

    if (err instanceof ValidationError) {
      details = err.details;
    }
  }
  // 处理 Prisma 错误
  else if (err instanceof Prisma.PrismaClientKnownRequestError ||
           err instanceof Prisma.PrismaClientValidationError ||
           err instanceof Prisma.PrismaClientInitializationError) {
    const prismaError = handlePrismaError(err);
    statusCode = prismaError.statusCode;
    message = prismaError.message;
    if (prismaError instanceof ValidationError) {
      details = prismaError.details;
    }
  }
  // 处理验证错误（如 Zod）
  else if (err.name === 'ZodError') {
    statusCode = 400;
    message = '请求数据验证失败';
    details = err; // Zod 错误包含详细的字段信息
    isOperational = true;
  }
  // 处理语法错误（JSON 解析）
  else if (err instanceof SyntaxError && 'body' in err) {
    statusCode = 400;
    message = '无效的 JSON 格式';
    isOperational = true;
  }

  // 记录错误日志
  if (isOperational) {
    // 操作性错误（预期的错误），记录为警告
    console.warn(`[Operational Error] ${req.method} ${req.path}:`, {
      message,
      statusCode,
      details: details ? JSON.stringify(details).substring(0, 200) : undefined
    });
  } else {
    // 编程错误（非预期的错误），记录为错误
    console.error(`[Unexpected Error] ${req.method} ${req.path}:`, {
      error: err.message,
      stack: err.stack,
      body: req.body ? JSON.stringify(req.body).substring(0, 200) : undefined
    });
  }

  // 构建错误响应
  const errorResponse: any = {
    success: false,
    error: message,
    statusCode
  };

  // 添加详细信息（仅在开发环境或操作性错误时）
  if (details) {
    errorResponse.details = details;
  }

  // 添加堆栈跟踪（仅在开发环境）
  if (process.env.NODE_ENV === 'development' && !isOperational) {
    errorResponse.stack = err.stack;
  }

  // 发送错误响应
  res.status(statusCode).json(errorResponse);
}

/**
 * 404 错误处理中间件
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = new AppError(`路由未找到: ${req.method} ${req.path}`, 404);
  next(error);
}

/**
 * 未处理的 Promise 拒绝处理器
 */
export function setupUnhandledRejectionHandler() {
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('[Unhandled Rejection] 系统检测到未处理的 Promise 拒绝:', {
      reason: reason?.message || reason,
      stack: reason?.stack,
      promise: promise.toString().substring(0, 100)
    });

    // 在生产环境中，可能需要优雅地关闭服务器
    if (process.env.NODE_ENV === 'production') {
      console.error('生产环境中未处理的 Promise 拒绝，将在5秒后关闭服务器');
      setTimeout(() => {
        process.exit(1);
      }, 5000);
    }
  });
}

/**
 * 未捕获的异常处理器
 */
export function setupUncaughtExceptionHandler() {
  process.on('uncaughtException', (error: Error) => {
    console.error('[Uncaught Exception] 系统检测到未捕获的异常:', {
      error: error.message,
      stack: error.stack
    });

    // 在生产环境中，优雅地关闭服务器
    if (process.env.NODE_ENV === 'production') {
      console.error('生产环境中未捕获的异常，将立即关闭服务器');
      process.exit(1);
    }
  });
}

/**
 * 初始化全局错误处理器
 */
export function setupGlobalErrorHandlers() {
  setupUnhandledRejectionHandler();
  setupUncaughtExceptionHandler();
  console.log('✅ 全局错误处理器已初始化');
}
