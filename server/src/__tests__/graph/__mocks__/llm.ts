/**
 * LLM Mock for Unit Testing
 * 模拟 LLM 服务以进行单元测试
 */

import { jest } from '@jest/globals';

// 模拟 LLM 响应
interface MockLLMResponse {
  content: string;
  triples?: any[];
  confidence?: number;
}

let mockResponse: MockLLMResponse | null = null;
let shouldFail: boolean = false;
let failureError: Error | null = null;

/**
 * 设置模拟 LLM 响应
 */
export const setMockLLMResponse = (response: MockLLMResponse): void => {
  mockResponse = response;
};

/**
 * 设置模拟 LLM 失败
 */
export const setMockLLMFailure = (error: Error): void => {
  shouldFail = true;
  failureError = error;
};

/**
 * 重置 LLM 模拟
 */
export const resetMockLLM = (): void => {
  mockResponse = null;
  shouldFail = false;
  failureError = null;
};

/**
 * 模拟 graphLlm 函数
 */
export const graphLlm = {
  extractTriples: jest.fn(async (text: string) => {
    if (shouldFail) {
      throw failureError;
    }
    return mockResponse?.triples || [];
  }),

  analyzeContent: jest.fn(async (content: string) => {
    if (shouldFail) {
      throw failureError;
    }
    return mockResponse?.content || '';
  }),

  generateSuggestions: jest.fn(async (context: any) => {
    if (shouldFail) {
      throw failureError;
    }
    return mockResponse?.content || '';
  }),
};
