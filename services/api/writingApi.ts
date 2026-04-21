/**
 * Writing API - AI写作辅助功能
 *
 * 提供AI续写、上下文分析等功能
 */

import { apiClient } from './client';

// ============================================================
// 类型定义
// ============================================================

export interface ContinuationRequest {
  projectId: string;
  chapterId: string;
  cursorPosition: number;
  contextLength?: {
    before?: number;
    after?: number;
  };
  options?: {
    targetWordCount?: number;
    style?: 'consistent' | 'creative' | 'minimal';
    advancePlot?: boolean;
    avoidNewCharacters?: boolean;
  };
}

export interface ContinuationResponse {
  success: boolean;
  continuation?: string;
  metadata?: {
    generatedLength: number;
    contextUsed: {
      beforeLength: number;
      afterLength: number;
      cursorContext: string;
    };
    modelUsed: string;
    timestamp: number;
  };
  warnings?: string[];
  error?: string;
}

export interface ContextAnalysisRequest {
  projectId: string;
  chapterId: string;
  cursorPosition: number;
  contextLength?: {
    before?: number;
    after?: number;
  };
}

export interface ContextAnalysisResponse {
  cursorPosition: number;
  contentLength: number;
  contextBefore: {
    text: string;
    length: number;
    actualLength: number;
  };
  contextAfter: {
    text: string;
    length: number;
    actualLength: number;
  };
  cursorContext: string;
}

// ============================================================
// Writing API
// ============================================================

export const writingApi = {
  /**
   * AI续写
   *
   * @param request - 续写请求参数
   * @returns 续写结果
   */
  async continue(request: ContinuationRequest): Promise<ContinuationResponse> {
    return apiClient.post<ContinuationResponse>('/writing/continue', request);
  },

  /**
   * 流式续写（实验性）
   *
   * @param request - 续写请求参数
   * @param onChunk - 流式数据回调
   * @param onComplete - 完成回调
   * @param onError - 错误回调
   */
  async continueStream(
    request: ContinuationRequest,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${apiClient['baseUrl']}/writing/continue-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`Stream request failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'chunk') {
                onChunk(data.content);
              } else if (data.type === 'complete') {
                onComplete();
              } else if (data.type === 'error') {
                onError(data.error);
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error');
    }
  },

  /**
   * 上下文分析
   *
   * @param request - 分析请求参数
   * @returns 上下文分析结果
   */
  async analyzeContext(request: ContextAnalysisRequest): Promise<ContextAnalysisResponse> {
    return apiClient.post<ContextAnalysisResponse>('/writing/analyze-context', request);
  }
};

// ============================================================
// 工具函数
// ============================================================

/**
 * 续写选项预设
 */
export const continuationPresets = {
  // 标准续写（推荐）
  standard: {
    targetWordCount: 400,
    style: 'consistent' as const,
    advancePlot: false,
    avoidNewCharacters: true
  },

  // 创意续写
  creative: {
    targetWordCount: 500,
    style: 'creative' as const,
    advancePlot: true,
    avoidNewCharacters: false
  },

  // 简洁续写
  minimal: {
    targetWordCount: 300,
    style: 'minimal' as const,
    advancePlot: false,
    avoidNewCharacters: true
  },

  // 情节推进
  plotAdvance: {
    targetWordCount: 600,
    style: 'consistent' as const,
    advancePlot: true,
    avoidNewCharacters: true
  }
};

/**
 * 根据章节进度自动调整续写选项
 */
export function adaptiveContinuationOptions(
  chapterContent: string,
  currentWordCount: number
): ContinuationRequest['options'] {
  const chapterLength = chapterContent.length;

  // 章节开头：需要更多铺垫
  if (currentWordCount < chapterLength * 0.3) {
    return {
      ...continuationPresets.standard,
      targetWordCount: 500,
      advancePlot: true
    };
  }

  // 章节中段：稳定推进
  if (currentWordCount < chapterLength * 0.7) {
    return continuationPresets.standard;
  }

  // 章节结尾：准备收尾
  return {
    ...continuationPresets.standard,
    targetWordCount: 300,
    advancePlot: false
  };
}

/**
 * 估算Token使用量
 */
export function estimateTokenUsage(request: ContinuationRequest): number {
  const { contextLength = {}, options = {} } = request;

  // 输入Token估算
  const inputTokens =
    (contextLength.before || 800) * 1.5 + // 前文
    (contextLength.after || 200) * 1.5 +  // 后文
    500 + // 系统指令
    300;  // 用户Prompt模板

  // 输出Token估算
  const outputTokens = (options.targetWordCount || 400) * 2;

  return Math.ceil(inputTokens + outputTokens);
}
