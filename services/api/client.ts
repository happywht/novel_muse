/**
 * API基础URL配置
 */
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

/**
 * HTTP 客户端封装类
 * 提供统一的 HTTP 请求方法和错误处理
 * 增强的性能优化：AbortController 支持、超时控制、请求去重
 */
export class ApiClient {
  private baseUrl: string;
  private pendingRequests: Map<string, AbortController>;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
    this.pendingRequests = new Map();
  }

  /**
   * 创建请求唯一标识符用于去重
   */
  private getRequestKey(method: string, endpoint: string): string {
    return `${method}:${endpoint}`;
  }

  /**
   * 取消指定请求
   */
  public abortRequest(method: string, endpoint: string): void {
    const key = this.getRequestKey(method, endpoint);
    const controller = this.pendingRequests.get(key);
    if (controller) {
      controller.abort();
      this.pendingRequests.delete(key);
    }
  }

  /**
   * 取消所有pending请求
   */
  public abortAllRequests(): void {
    this.pendingRequests.forEach((controller) => {
      controller.abort();
    });
    this.pendingRequests.clear();
  }

  /**
   * 创建超时信号
   */
  private createTimeoutSignal(timeoutMs: number = 30000): { signal: AbortSignal; cleanup: () => void } {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    return {
      signal: controller.signal,
      cleanup: () => clearTimeout(timeoutId)
    };
  }

  /**
   * 执行HTTP请求的通用方法，包含超时和AbortController支持
   */
  private async request<T>(
    method: string,
    endpoint: string,
    options?: {
      data?: unknown;
      signal?: AbortSignal;
      timeout?: number;
      deduplicate?: boolean;
    }
  ): Promise<T> {
    const { data, signal: externalSignal, timeout = 30000, deduplicate = false } = options || {};

    // 请求去重检查
    const requestKey = this.getRequestKey(method, endpoint);
    if (deduplicate && this.pendingRequests.has(requestKey)) {
      throw new Error(`Duplicate ${method} request to ${endpoint} already in progress`);
    }

    // 创建AbortController
    const controller = new AbortController();
    const { signal: timeoutSignal, cleanup: timeoutCleanup } = this.createTimeoutSignal(timeout);

    // 组合外部signal和超时signal
    const combinedSignal = this.combineSignals([externalSignal, timeoutSignal, controller.signal]);

    if (deduplicate) {
      this.pendingRequests.set(requestKey, controller);
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: data ? JSON.stringify(data) : undefined,
        signal: combinedSignal,
      });

      if (!response.ok) {
        throw new Error(`${method} ${endpoint} failed: ${response.statusText}`);
      }

      return response.json() as Promise<T>;
    } finally {
      timeoutCleanup();
      if (deduplicate) {
        this.pendingRequests.delete(requestKey);
      }
    }
  }

  /**
   * 组合多个AbortSignal
   */
  private combineSignals(signals: (AbortSignal | undefined)[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
      if (signal) {
        signal.addEventListener('abort', () => {
          controller.abort();
        }, { once: true });
      }
    }

    return controller.signal;
  }

  async get<T>(endpoint: string, signal?: AbortSignal, timeout?: number): Promise<T> {
    return this.request<T>('GET', endpoint, { signal, timeout });
  }

  async post<T>(endpoint: string, data: unknown, signal?: AbortSignal, timeout?: number): Promise<T> {
    return this.request<T>('POST', endpoint, { data, signal, timeout });
  }

  async put<T>(endpoint: string, data: unknown, signal?: AbortSignal, timeout?: number): Promise<T> {
    return this.request<T>('PUT', endpoint, { data, signal, timeout });
  }

  async patch<T>(endpoint: string, data: unknown, signal?: AbortSignal, timeout?: number): Promise<T> {
    return this.request<T>('PATCH', endpoint, { data, signal, timeout });
  }

  async delete<T>(endpoint: string, signal?: AbortSignal, timeout?: number): Promise<T> {
    return this.request<T>('DELETE', endpoint, { signal, timeout });
  }
}

// 单例实例
export const apiClient = new ApiClient();
