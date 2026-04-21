/**
 * Writing Continuation API Types
 *
 * AI续写功能的TypeScript类型定义
 * 与OpenAPI规范保持一致
 */

// ============================================================
// Request Types
// ============================================================

/**
 * 节奏模式
 */
export type PacingMode = 'SLOW_BURN' | 'BALANCED' | 'CLIMAX';

/**
 * 角色状态
 */
export interface CharacterState {
  /** 角色当前位置 */
  location: string;
  /** 角色当前生理/心理状态 */
  state: string;
  /** 角色是否已死亡 */
  isDead: boolean;
}

/**
 * AI续写请求
 */
export interface ContinueWritingRequest {
  /** 章节ID */
  chapterId: string;
  /** 光标在章节内容中的位置（字符数） */
  cursorPosition: number;
  /** 前文提取长度（字符数），默认1500 */
  contextLength?: number;
  /** 目标续写长度（字符数），默认400 */
  targetLength?: number;
  /** 风格提示数组（最多5个） */
  styleHints?: string[];
  /** 角色当前状态字典 */
  characterStates?: Record<string, CharacterState>;
  /** 情节上下文描述（最多500字符） */
  plotContext?: string;
  /** 是否使用流式输出，默认false */
  useStreaming?: boolean;
  /** 节奏模式，默认BALANCED */
  pacingMode?: PacingMode;
  /** 是否包含知识图谱上下文，默认false */
  includeGraphContext?: boolean;
  /** 创造性参数（0.0-1.0），默认0.8 */
  creativity?: number;
}

// ============================================================
// Response Types
// ============================================================

/**
 * 上下文提取结果统计
 */
export interface ContextExtraction {
  /** 检测到的角色数量 */
  charactersDetected: number;
  /** 检测到的设定数量 */
  settingsDetected: number;
  /** 检测到的情节点数量 */
  plotPointsDetected: number;
}

/**
 * 续写元数据
 */
export interface ContinuationMetadata {
  /** 实际生成的字符数 */
  actualLength: number;
  /** 估算的token使用量 */
  estimatedTokens: number;
  /** 使用的AI模型 */
  modelUsed: string;
  /** 生成耗时（秒） */
  generationTime: number;
  /** 上下文提取结果统计 */
  contextExtraction: ContextExtraction;
  /** 风格一致性警告数组 */
  styleWarnings: string[];
}

/**
 * AI续写响应数据
 */
export interface ContinueWritingResponseData {
  /** 生成的续写文本 */
  continuationText: string;
  /** 续写元数据 */
  metadata: ContinuationMetadata;
}

/**
 * AI续写响应
 */
export interface ContinueWritingResponse {
  /** 请求是否成功 */
  success: boolean;
  /** 响应数据 */
  data: ContinueWritingResponseData;
  /** 响应时间戳（毫秒） */
  timestamp: number;
}

// ============================================================
// Error Types
// ============================================================

/**
 * 错误代码枚举
 */
export enum ErrorCode {
  /** 上下文过短 */
  CONTEXT_TOO_SHORT = 'CONTEXT_TOO_SHORT',
  /** 上下文过长 */
  CONTEXT_TOO_LONG = 'CONTEXT_TOO_LONG',
  /** 目标长度无效 */
  INVALID_TARGET_LENGTH = 'INVALID_TARGET_LENGTH',
  /** 未授权（API密钥无效） */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** 请求过于频繁 */
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  /** AI生成失败 */
  GENERATION_FAILED = 'GENERATION_FAILED',
  /** 服务不可用 */
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  /** 系统维护中 */
  SERVICE_MAINTENANCE = 'SERVICE_MAINTENANCE',
}

/**
 * 错误响应详情
 */
export interface ErrorDetails {
  [key: string]: unknown;
}

/**
 * 错误响应
 */
export interface ErrorResponse {
  /** 请求是否成功（错误时为false） */
  success: false;
  /** 错误代码 */
  error: ErrorCode;
  /** 错误消息（人类可读） */
  message: string;
  /** 额外的错误详情（可选） */
  details?: ErrorDetails;
}

// ============================================================
// Streaming Types
// ============================================================

/**
 * SSE事件类型
 */
export enum SSEEventType {
  /** 数据块 */
  CHUNK = 'chunk',
  /** 完成 */
  DONE = 'done',
  /** 错误 */
  ERROR = 'error',
}

/**
 * SSE数据块事件
 */
export interface SSEChunkEvent {
  type: SSEEventType.CHUNK;
  /** 增量文本片段 */
  text: string;
}

/**
 * SSE完成事件
 */
export interface SSEDoneEvent {
  type: SSEEventType.DONE;
  /** 续写元数据 */
  metadata: ContinuationMetadata;
}

/**
 * SSE错误事件
 */
export interface SSEErrorEvent {
  type: SSEEventType.ERROR;
  /** 错误代码 */
  error: ErrorCode;
  /** 错误消息 */
  message: string;
}

/**
 * SSE事件联合类型
 */
export type SSEEvent = SSEChunkEvent | SSEDoneEvent | SSEErrorEvent;

// ============================================================
// Health Check Types
// ============================================================

/**
 * 服务状态
 */
export type ServiceStatus = 'healthy' | 'unhealthy' | 'unknown';

/**
 * 整体服务状态
 */
export type OverallStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * AI服务提供商
 */
export type AIProvider = 'gemini' | 'glm';

/**
 * 单个服务健康状态
 */
export interface ServiceHealth {
  /** 服务状态 */
  status: ServiceStatus;
  /** 响应时间（毫秒） */
  responseTime: number;
  /** API密钥是否有效 */
  apiKeyValid: boolean;
  /** 剩余配额数量 */
  quotaRemaining: number;
  /** 最后检查时间戳（毫秒） */
  lastCheckAt: number;
}

/**
 * AI服务健康检查响应数据
 */
export interface AIHealthCheckResponseData {
  /** 各AI服务的健康状态 */
  services: Record<AIProvider, ServiceHealth>;
  /** 整体服务状态 */
  overallStatus: OverallStatus;
  /** 推荐使用的AI服务提供商 */
  recommendedProvider: AIProvider;
}

/**
 * AI服务健康检查响应
 */
export interface AIHealthCheckResponse {
  /** 请求是否成功 */
  success: boolean;
  /** 响应数据 */
  data: AIHealthCheckResponseData;
}

// ============================================================
// API Client Types
// ============================================================

/**
 * API客户端配置
 */
export interface WritingContinuationAPIClientConfig {
  /** API基础URL */
  baseURL: string;
  /** API密钥 */
  apiKey: string;
  /** 请求超时时间（毫秒），默认30000 */
  timeout?: number;
  /** 是否启用重试，默认true */
  retryEnabled?: boolean;
  /** 最大重试次数，默认3 */
  maxRetries?: number;
}

/**
 * 续写选项（简化版，用于API客户端）
 */
export interface ContinueWritingOptions {
  /** 章节ID */
  chapterId: string;
  /** 光标位置 */
  cursorPosition: number;
  /** 前文提取长度 */
  contextLength?: number;
  /** 目标续写长度 */
  targetLength?: number;
  /** 风格提示 */
  styleHints?: string[];
  /** 角色状态 */
  characterStates?: Record<string, CharacterState>;
  /** 情节上下文 */
  plotContext?: string;
  /** 是否流式输出 */
  useStreaming?: boolean;
  /** 节奏模式 */
  pacingMode?: PacingMode;
  /** 是否包含图谱上下文 */
  includeGraphContext?: boolean;
  /** 创造性参数 */
  creativity?: number;
}

/**
 * 流式续写回调
 */
export interface StreamingCallbacks {
  /** 接收到数据块时的回调 */
  onChunk?: (chunk: string) => void;
  /** 完成时的回调 */
  onDone?: (metadata: ContinuationMetadata) => void;
  /** 发生错误时的回调 */
  onError?: (error: ErrorResponse) => void;
}

// ============================================================
// Utility Types
// ============================================================

/**
 * 带类型保护 API响应类型
 */
export type APIResponse<T> =
  | { success: true; data: T; timestamp: number }
  | { success: false; error: ErrorCode; message: string; details?: ErrorDetails };

/**
 * 续写API响应类型
 */
export type ContinueWritingAPIResponse = APIResponse<ContinueWritingResponseData>;

/**
 * 健康检查API响应类型
 */
export type HealthCheckAPIResponse = APIResponse<AIHealthCheckResponseData>;

/**
 * 类型守卫：检查响应是否成功
 */
export function isSuccessResponse<T>(
  response: APIResponse<T>
): response is { success: true; data: T; timestamp: number } {
  return response.success === true;
}

/**
 * 类型守卫：检查响应是否为错误
 */
export function isErrorResponse(
  response: APIResponse<unknown>
): response is { success: false; error: ErrorCode; message: string; details?: ErrorDetails } {
  return response.success === false;
}

// ============================================================
// Validation Types
// ============================================================

/**
 * 请求验证结果
 */
export interface ValidationResult {
  /** 是否通过验证 */
  valid: boolean;
  /** 错误信息（验证失败时） */
  errors?: string[];
}

/**
 * 上下文长度限制
 */
export const CONTEXT_LENGTH_LIMITS = {
  MIN: 50,
  MAX: 10000,
  DEFAULT: 1500,
} as const;

/**
 * 目标长度限制
 */
export const TARGET_LENGTH_LIMITS = {
  MIN: 200,
  MAX: 1000,
  DEFAULT: 400,
} as const;

/**
 * 创造性参数范围
 */
export const CREATIVITY_RANGE = {
  MIN: 0.0,
  MAX: 1.0,
  DEFAULT: 0.8,
} as const;

/**
 * 最大风格提示数量
 */
export const MAX_STYLE_HINTS = 5;

/**
 * 最大情节上下文长度
 */
export const MAX_PLOT_CONTEXT_LENGTH = 500;
