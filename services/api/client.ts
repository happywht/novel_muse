/**
 * API基础URL配置
 */
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

/**
 * HTTP 客户端封装类
 * 提供统一的 HTTP 请求方法和错误处理
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string, signal?: AbortSignal): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      signal,
    });
    if (!response.ok) {
      throw new Error(`GET ${endpoint} failed: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  async post<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`POST ${endpoint} failed: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  async put<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`PUT ${endpoint} failed: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  async patch<T>(endpoint: string, data: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`PATCH ${endpoint} failed: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`DELETE ${endpoint} failed: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }
}

// 单例实例
export const apiClient = new ApiClient();
