import { apiClient } from './client';
import { API_BASE } from '../apiService';

/**
 * 系统健康检查 API
 */
export const systemApi = {
  /**
   * 检查后端服务是否可用
   */
  checkHealth: async (timeout: number = 2000): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(`${API_BASE}/health`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  },
};
