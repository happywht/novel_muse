/**
 * Writing Continuation API Client
 *
 * AI续写功能的API客户端实现
 * 支持流式和非流式响应
 */

import type {
  ContinueWritingRequest,
  ContinueWritingResponse,
  ContinueWritingOptions,
  StreamingCallbacks,
  ContinuationMetadata,
  ErrorResponse,
  AIHealthCheckResponse,
  WritingContinuationAPIClientConfig,
  SSEEvent,
  SSEEventType,
} from '../../types/writing-continuation';
import {
  isSuccessResponse,
  isErrorResponse,
  CONTEXT_LENGTH_LIMITS,
  TARGET_LENGTH_LIMITS,
  CREATIVITY_RANGE,
  MAX_STYLE_HINTS,
  MAX_PLOT_CONTEXT_LENGTH,
} from '../../types/writing-continuation';

/**
 * API客户端类
 */
export class WritingContinuationAPIClient {
  private config: WritingContinuationAPIClientConfig;

  constructor(config: WritingContinuationAPIClientConfig) {
    this.config = {
      timeout: 30000,
      retryEnabled: true,
      maxRetries: 3,
      ...config,
    };
  }

  // ============================================================
  // Private Helper Methods
  // ============================================================

  /**
   * 获取完整的API URL
   */
  private getURL(endpoint: string): string {
    return `${this.config.baseURL}${endpoint}`;
  }

  /**
   * 获取请求头
   */
  private getHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey,
    };
  }

  /**
   * 验证请求参数
   */
  private validateRequest(request: ContinueWritingRequest): void {
    const errors: string[] = [];

    // 验证chapterId
    if (!request.chapterId || typeof request.chapterId !== 'string') {
      errors.push('章节ID必须是非空字符串');
    }

    // 验证cursorPosition
    if (typeof request.cursorPosition !== 'number' || request.cursorPosition < 0) {
      errors.push('光标位置必须是非负整数');
    }

    // 验证contextLength
    const contextLength = request.contextLength ?? CONTEXT_LENGTH_LIMITS.DEFAULT;
    if (
      contextLength < CONTEXT_LENGTH_LIMITS.MIN ||
      contextLength > CONTEXT_LENGTH_LIMITS.MAX
    ) {
      errors.push(
        `前文提取长度必须在${CONTEXT_LENGTH_LIMITS.MIN}-${CONTEXT_LENGTH_LIMITS.MAX}字符之间`
      );
    }

    // 验证targetLength
    const targetLength = request.targetLength ?? TARGET_LENGTH_LIMITS.DEFAULT;
    if (
      targetLength < TARGET_LENGTH_LIMITS.MIN ||
      targetLength > TARGET_LENGTH_LIMITS.MAX
    ) {
      errors.push(
        `目标续写长度必须在${TARGET_LENGTH_LIMITS.MIN}-${TARGET_LENGTH_LIMITS.MAX}字符之间`
      );
    }

    // 验证styleHints
    if (request.styleHints && request.styleHints.length > MAX_STYLE_HINTS) {
      errors.push(`风格提示最多${MAX_STYLE_HINTS}个`);
    }

    // 验证plotContext长度
    if (
      request.plotContext &&
      request.plotContext.length > MAX_PLOT_CONTEXT_LENGTH
    ) {
      errors.push(`情节上下文最多${MAX_PLOT_CONTEXT_LENGTH}字符`);
    }

    // 验证creativity
    if (
      request.creativity !== undefined &&
      (request.creativity < CREATIVITY_RANGE.MIN ||
        request.creativity > CREATIVITY_RANGE.MAX)
    ) {
      errors.push(
        `创造性参数必须在${CREATIVITY_RANGE.MIN}-${CREATIVITY_RANGE.MAX}之间`
      );
    }

    if (errors.length > 0) {
      throw new Error(`请求验证失败：\n${errors.join('\n')}`);
    }
  }

  /**
   * 处理HTTP响应
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'UNKNOWN_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw errorData as ErrorResponse;
    }

    return response.json();
  }

  /**
   * 带重试的fetch请求
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retryCount = 0
  ): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout
      );

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 如果是429错误且有重试机会，则重试
      if (
        response.status === 429 &&
        this.config.retryEnabled &&
        retryCount < (this.config.maxRetries ?? 3)
      ) {
        const retryAfter = parseInt(
          response.headers.get('Retry-After') || '5',
          10
        );
        await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
        return this.fetchWithRetry(url, options, retryCount + 1);
      }

      return response;
    } catch (error) {
      // 网络错误且有重试机会
      if (
        this.config.retryEnabled &&
        retryCount < (this.config.maxRetries ?? 3) &&
        error instanceof Error &&
        error.name === 'AbortError'
      ) {
        console.warn(`请求超时，重试第${retryCount + 1}次...`);
        return this.fetchWithRetry(url, options, retryCount + 1);
      }
      throw error;
    }
  }

  // ============================================================
  // Public API Methods
  // ============================================================

  /**
   * AI续写章节内容（非流式）
   */
  async continueWriting(
    projectId: string,
    options: ContinueWritingOptions
  ): Promise<ContinueWritingResponse> {
    // 构建请求
    const request: ContinueWritingRequest = {
      chapterId: options.chapterId,
      cursorPosition: options.cursorPosition,
      contextLength: options.contextLength ?? CONTEXT_LENGTH_LIMITS.DEFAULT,
      targetLength: options.targetLength ?? TARGET_LENGTH_LIMITS.DEFAULT,
      styleHints: options.styleHints,
      characterStates: options.characterStates,
      plotContext: options.plotContext,
      useStreaming: false,
      pacingMode: options.pacingMode,
      includeGraphContext: options.includeGraphContext,
      creativity: options.creativity ?? CREATIVITY_RANGE.DEFAULT,
    };

    // 验证请求
    this.validateRequest(request);

    // 发送请求
    const url = this.getURL(`/projects/${projectId}/continue-writing`);
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    // 处理响应
    const data = await this.handleResponse<ContinueWritingResponse>(response);

    if (isSuccessResponse(data)) {
      return data;
    } else {
      throw new Error(data.message);
    }
  }

  /**
   * AI续写章节内容（流式）
   *
   * @returns 返回一个函数，调用该函数可以取消流式传输
   */
  continueWritingStream(
    projectId: string,
    options: ContinueWritingOptions,
    callbacks: StreamingCallbacks
  ): () => void {
    const request: ContinueWritingRequest = {
      ...options,
      useStreaming: true,
    };

    // 验证请求
    this.validateRequest(request);

    const url = this.getURL(`/projects/${projectId}/continue-writing/stream`);
    const abortController = new AbortController();

    // 启动流式请求
    this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
      signal: abortController.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: 'UNKNOWN_ERROR',
            message: `HTTP ${response.status}: ${response.statusText}`,
          }));
          callbacks.onError?.(errorData as ErrorResponse);
          return;
        }

        // 处理SSE流
        const reader = response.body?.getReader();
        if (!reader) {
          callbacks.onError?.({
            success: false,
            error: 'STREAM_READ_ERROR' as any,
            message: '无法读取响应流',
          });
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          // 解码并处理数据
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) {
              continue;
            }

            const data = line.slice(6).trim();
            if (!data) {
              continue;
            }

            try {
              const event: SSEEvent = JSON.parse(data);

              if (event.type === 'chunk') {
                callbacks.onChunk?.(event.text);
              } else if (event.type === 'done') {
                callbacks.onDone?.(event.metadata);
              } else if (event.type === 'error') {
                callbacks.onError?.({
                  success: false,
                  error: event.error as any,
                  message: event.message,
                });
              }
            } catch (error) {
              console.error('解析SSE事件失败:', error);
            }
          }
        }
      })
      .catch((error) => {
        callbacks.onError?.({
          success: false,
          error: 'NETWORK_ERROR' as any,
          message: error instanceof Error ? error.message : '网络错误',
        });
      });

    // 返回取消函数
    return () => {
      abortController.abort();
    };
  }

  /**
   * 检查AI服务健康状态
   */
  async checkHealth(): Promise<AIHealthCheckResponse> {
    const url = this.getURL('/health/ai-services');
    const response = await this.fetchWithRetry(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    const data = await this.handleResponse<AIHealthCheckResponse>(response);

    if (isSuccessResponse(data)) {
      return data;
    } else {
      throw new Error(data.message);
    }
  }

  // ============================================================
  // Convenience Methods
  // ============================================================

  /**
   * 快速续写（使用默认配置）
   */
  async quickContinue(
    projectId: string,
    chapterId: string,
    cursorPosition: number,
    targetLength: number = 400
  ): Promise<string> {
    const response = await this.continueWriting(projectId, {
      chapterId,
      cursorPosition,
      targetLength,
    });

    return response.data.continuationText;
  }

  /**
   * 批量续写（为多个位置生成续写）
   */
  async batchContinue(
    projectId: string,
    chapterId: string,
    positions: number[],
    targetLength: number = 400
  ): Promise<Array<{ position: number; text: string; metadata: ContinuationMetadata }>> {
    const results = await Promise.all(
      positions.map(async (position) => {
        try {
          const response = await this.continueWriting(projectId, {
            chapterId,
            cursorPosition: position,
            targetLength,
          });

          return {
            position,
            text: response.data.continuationText,
            metadata: response.data.metadata,
          };
        } catch (error) {
          console.error(`位置${position}续写失败:`, error);
          return {
            position,
            text: '',
            metadata: {
              actualLength: 0,
              estimatedTokens: 0,
              modelUsed: 'error',
              generationTime: 0,
              contextExtraction: {
                charactersDetected: 0,
                settingsDetected: 0,
                plotPointsDetected: 0,
              },
              styleWarnings: [],
            },
          };
        }
      })
    );

    return results;
  }

  /**
   * 智能续写（自动提取上下文）
   *
   * 这个方法会自动从章节内容中提取上下文，
   * 无需手动提供contextLength和characterStates。
   */
  async smartContinue(
    projectId: string,
    chapterId: string,
    chapterContent: string,
    cursorPosition: number,
    options: Omit<ContinueWritingOptions, 'contextLength' | 'characterStates'> = {}
  ): Promise<ContinueWritingResponse> {
    // 自动计算contextLength（提取前文）
    const contextLength = Math.min(
      Math.max(cursorPosition, CONTEXT_LENGTH_LIMITS.DEFAULT),
      CONTEXT_LENGTH_LIMITS.MAX
    );

    // TODO: 在服务端实现自动角色状态提取
    // 这里暂时不提供characterStates，让服务端自动处理

    return this.continueWriting(projectId, {
      ...options,
      chapterId,
      cursorPosition,
      contextLength,
    });
  }
}

// ============================================================
// Factory Function
// ============================================================

/**
 * 创建API客户端实例
 */
export function createWritingContinuationAPIClient(
  config: WritingContinuationAPIClientConfig
): WritingContinuationAPIClient {
  return new WritingContinuationAPIClient(config);
}

// ============================================================
// Default Client Instance
// ============================================================

/**
 * 默认的API客户端实例（使用环境变量配置）
 */
export const defaultWritingContinuationAPIClient =
  createWritingContinuationAPIClient({
    baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api',
    apiKey: process.env.API_KEY || '',
  });

// ============================================================
// Convenience Exports
// ============================================================

/**
 * 快续写（使用默认客户端）
 */
export async function quickContinue(
  projectId: string,
  chapterId: string,
  cursorPosition: number,
  targetLength?: number
): Promise<string> {
  return defaultWritingContinuationAPIClient.quickContinue(
    projectId,
    chapterId,
    cursorPosition,
    targetLength
  );
}

/**
 * 智能续写（使用默认客户端）
 */
export async function smartContinue(
  projectId: string,
  chapterId: string,
  chapterContent: string,
  cursorPosition: number,
  options?: Omit<ContinueWritingOptions, 'contextLength' | 'characterStates'>
): Promise<ContinueWritingResponse> {
  return defaultWritingContinuationAPIClient.smartContinue(
    projectId,
    chapterId,
    chapterContent,
    cursorPosition,
    options
  );
}
