/**
 * API Client 单元测试
 *
 * 测试HTTP客户端的核心功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ApiClient } from './client';

// Mock fetch
global.fetch = vi.fn();

describe('ApiClient', () => {
  let client: ApiClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ApiClient('http://test-api.com');
  });

  describe('GET请求', () => {
    it('应该成功发送GET请求', async () => {
      const mockData = { id: 1, name: 'Test' };
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await client.get('/test');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/test',
        expect.objectContaining({
          signal: undefined,
        })
      );
    });

    it('应该处理GET请求错误', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(client.get('/test')).rejects.toThrow();
    });

    it('应该处理网络错误', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(client.get('/test')).rejects.toThrow('Network error');
    });
  });

  describe('POST请求', () => {
    it('应该成功发送POST请求', async () => {
      const mockData = { success: true };
      const requestBody = { name: 'Test' };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await client.post('/test', requestBody);

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('应该处理POST请求错误', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      } as Response);

      await expect(client.post('/test', {})).rejects.toThrow();
    });
  });

  describe('PUT请求', () => {
    it('应该成功发送PUT请求', async () => {
      const mockData = { updated: true };
      const requestBody = { id: 1, name: 'Updated' };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await client.put('/test/1', requestBody);

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/test/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(requestBody),
        })
      );
    });
  });

  describe('DELETE请求', () => {
    it('应该成功发送DELETE请求', async () => {
      const mockData = { deleted: true };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await client.delete('/test/1');

      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/test/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('错误处理', () => {
    it('应该统一处理HTTP错误状态码', async () => {
      const errorCodes = [400, 401, 403, 404, 500];

      for (const code of errorCodes) {
        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: false,
          status: code,
          statusText: `Error ${code}`,
        } as Response);

        await expect(client.get('/test')).rejects.toThrow();
      }
    });

    it('应该处理超时错误', async () => {
      vi.mocked(global.fetch).mockRejectedValueOnce(
        new Error('Request timeout')
      );

      await expect(client.get('/test')).rejects.toThrow('Request timeout');
    });

    it('应该处理JSON解析错误', async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as Response);

      await expect(client.get('/test')).rejects.toThrow('Invalid JSON');
    });
  });

  describe('类型安全', () => {
    it('GET请求应该返回指定类型', async () => {
      interface TestData {
        id: number;
        name: string;
      }

      const mockData: TestData = { id: 1, name: 'Test' };
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
      } as Response);

      const result = await client.get<TestData>('/test');

      expect(result).toEqual(mockData);
      expect(result.id).toBe(1);
      expect(result.name).toBe('Test');
    });

    it('POST请求应该接受指定类型', async () => {
      interface RequestData {
        title: string;
      }
      interface ResponseData {
        success: boolean;
      }

      const requestData: RequestData = { title: 'Test' };
      const mockResponse: ResponseData = { success: true };

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await client.post<RequestData, ResponseData>(
        '/test',
        requestData
      );

      expect(result).toEqual(mockResponse);
    });
  });
});
