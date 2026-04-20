/**
 * 自定义错误类
 *
 * 为 API 调用和应用程序错误提供类型安全的错误处理
 */

// ============================================================
// API 错误
// ============================================================

/**
 * API 错误类
 *
 * 用于封装 API 调用失败时的错误信息
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';

    // 维护正确的原型链
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * 判断是否为网络错误
   */
  isNetworkError(): boolean {
    return this.status === 0 || this.status >= 500;
  }

  /**
   * 判断是否为客户端错误
   */
  isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }

  /**
   * 判断是否为未授权错误
   */
  isUnauthorized(): boolean {
    return this.status === 401;
  }

  /**
   * 判断是否为资源未找到错误
   */
  isNotFound(): boolean {
    return this.status === 404;
  }
}

// ============================================================
// 网络错误
// ============================================================

/**
 * 网络连接错误
 *
 * 当无法连接到后端服务器时抛出
 */
export class NetworkError extends Error {
  constructor(message: string = '无法连接到服务器') {
    super(message);
    this.name = 'NetworkError';

    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

// ============================================================
// 数据验证错误
// ============================================================

/**
 * 数据验证错误
 *
 * 当数据不符合预期格式时抛出
 */
export class ValidationError extends Error {
  constructor(
    public field: string,
    message: string
  ) {
    super(`Validation failed for field '${field}': ${message}`);
    this.name = 'ValidationError';

    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// ============================================================
// 同步错误
// ============================================================

/**
 * 数据同步错误
 *
 * 当数据同步失败时抛出
 */
export class SyncError extends Error {
  constructor(
    public operation: 'upload' | 'download' | 'merge',
    message: string,
    public originalError?: Error
  ) {
    super(`Sync ${operation} failed: ${message}`);
    this.name = 'SyncError';

    Object.setPrototypeOf(this, SyncError.prototype);
  }
}

// ============================================================
// 缓存错误
// ============================================================

/**
 * 缓存操作错误
 *
 * 当缓存读写失败时抛出
 */
export class CacheError extends Error {
  constructor(
    message: string,
    public originalError?: Error
  ) {
    super(`Cache error: ${message}`);
    this.name = 'CacheError';

    Object.setPrototypeOf(this, CacheError.prototype);
  }
}

// ============================================================
// 辅助函数
// ============================================================

/**
 * 判断错误是否为已知错误类型
 */
export function isKnownError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isNetworkError()) {
      return '网络连接失败，请检查网络设置';
    }
    if (error.isUnauthorized()) {
      return '未授权访问，请重新登录';
    }
    if (error.isNotFound()) {
      return '请求的资源不存在';
    }
    return error.message;
  }

  if (error instanceof NetworkError) {
    return error.message;
  }

  if (error instanceof ValidationError) {
    return `数据验证失败：${error.message}`;
  }

  if (error instanceof SyncError) {
    return `数据同步失败：${error.message}`;
  }

  if (error instanceof CacheError) {
    return `缓存错误：${error.message}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '未知错误';
}

/**
 * 从 fetch Response 创建 ApiError
 */
export function createApiErrorFromResponse(response: Response): ApiError {
  return new ApiError(
    response.status,
    `API request failed: ${response.statusText}`
  );
}
