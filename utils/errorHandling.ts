/**
 * 错误处理工具函数
 *
 * 提供类型安全的错误处理，避免使用any类型
 */

/**
 * 未知错误类型
 */
export type UnknownError = unknown;

/**
 * 错误消息提取器
 * 从各种错误类型中安全提取错误消息
 */
export function getErrorMessage(error: UnknownError): string {
  if (typeof error === 'string') {
    return error;
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  // 处理Error对象
  if (error instanceof Error) {
    return error.message;
  }

  // 处理网络响应错误
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error &&
    typeof error.data === 'object' &&
    error.data !== null &&
    'message' in error.data &&
    typeof error.data.message === 'string'
  ) {
    return error.data.message;
  }

  return '发生未知错误';
}

/**
 * 错误类型守卫 - 检查是否为Error对象
 */
export function isError(error: UnknownError): error is Error {
  return error instanceof Error;
}

/**
 * 错误类型守卫 - 检查是否为网络错误
 */
export interface NetworkError extends Error {
  status?: number;
  code?: string;
  data?: unknown;
}

export function isNetworkError(error: UnknownError): error is NetworkError {
  return (
    isError(error) &&
    ('status' in error || 'code' in error || 'data' in error)
  );
}

/**
 * 安全的错误日志记录
 */
export function logError(context: string, error: UnknownError): void {
  const message = getErrorMessage(error);
  console.error(`[${context}]`, message, error);
}

/**
 * 创建类型安全的错误处理器
 */
export function createErrorHandler(context: string) {
  return {
    /**
     * 处理错误并返回用户友好的错误消息
     */
    handle: (error: UnknownError, fallbackMessage?: string): string => {
      const message = getErrorMessage(error);
      logError(context, error);
      return fallbackMessage || message;
    },

    /**
     * 处理错误并抛出标准化错误
     */
    throw: (error: UnknownError, fallbackMessage?: string): never => {
      const message = getErrorMessage(error);
      logError(context, error);
      throw new Error(fallbackMessage || message);
    },

    /**
     * 处理异步错误
     */
    async: async <T>(
      fn: () => Promise<T>,
      fallbackMessage?: string
    ): Promise<{ data?: T; error?: string }> => {
      try {
        const data = await fn();
        return { data };
      } catch (error) {
        const message = getErrorMessage(error);
        logError(context, error);
        return { error: fallbackMessage || message };
      }
    },
  };
}

/**
 * 常用错误上下文的处理器
 */
export const errorHandlers = {
  api: createErrorHandler('API'),
  graph: createErrorHandler('Graph'),
  character: createErrorHandler('Character'),
  project: createErrorHandler('Project'),
  chapter: createErrorHandler('Chapter'),
};

/**
 * 通用try-catch包装器
 */
export async function safeTry<T>(
  fn: () => Promise<T>,
  context: string
): Promise<{ data?: T; error?: string }> {
  try {
    const data = await fn();
    return { data };
  } catch (error) {
    const message = getErrorMessage(error);
    logError(context, error);
    return { error: message };
  }
}

/**
 * 同步版本的try-catch包装器
 */
export function safeTrySync<T>(
  fn: () => T,
  context: string
): { data?: T; error?: string } {
  try {
    const data = fn();
    return { data };
  } catch (error) {
    const message = getErrorMessage(error);
    logError(context, error);
    return { error: message };
  }
}
