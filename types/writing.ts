/**
 * AI续写功能类型定义
 */

// ============================================================
// 请求类型
// ============================================================

/**
 * 续写请求参数
 */
export interface ContinuationRequest {
  /** 项目ID */
  projectId: string;
  /** 章节ID */
  chapterId: string;
  /** 光标位置（字符偏移量） */
  cursorPosition: number;
  /** 上下文长度配置 */
  contextLength?: {
    /** 前文提取长度（默认800） */
    before?: number;
    /** 后文提取长度（默认200） */
    after?: number;
  };
  /** 续写选项 */
  options?: ContinuationOptions;
}

/**
 * 续写选项
 */
export interface ContinuationOptions {
  /** 目标字数（默认400） */
  targetWordCount?: number;
  /** 续写风格（默认consistent） */
  style?: ContinuationStyle;
  /** 是否推进情节（默认false） */
  advancePlot?: boolean;
  /** 是否避免引入新角色（默认true） */
  avoidNewCharacters?: boolean;
}

/**
 * 续写风格枚举
 */
export type ContinuationStyle = 'consistent' | 'creative' | 'minimal';

// ============================================================
// 响应类型
// ============================================================

/**
 * 续写响应
 */
export interface ContinuationResponse {
  /** 是否成功 */
  success: boolean;
  /** 生成的内容 */
  continuation?: string;
  /** 元数据 */
  metadata?: ContinuationMetadata;
  /** 质量警告 */
  warnings?: string[];
  /** 错误信息 */
  error?: string;
}

/**
 * 续写元数据
 */
export interface ContinuationMetadata {
  /** 生成内容长度 */
  generatedLength: number;
  /** 使用的上下文 */
  contextUsed: {
    /** 前文长度 */
    beforeLength: number;
    /** 后文长度 */
    afterLength: number;
    /** 光标上下文 */
    cursorContext: string;
  };
  /** 使用的模型 */
  modelUsed: string;
  /** 生成时间戳 */
  timestamp: number;
}

// ============================================================
// 上下文分析类型
// ============================================================

/**
 * 上下文分析请求
 */
export interface ContextAnalysisRequest {
  /** 项目ID */
  projectId: string;
  /** 章节ID */
  chapterId: string;
  /** 光标位置 */
  cursorPosition: number;
  /** 上下文长度配置 */
  contextLength?: {
    before?: number;
    after?: number;
  };
}

/**
 * 上下文分析响应
 */
export interface ContextAnalysisResponse {
  /** 光标位置 */
  cursorPosition: number;
  /** 内容总长度 */
  contentLength: number;
  /** 前文分析 */
  contextBefore: {
    /** 提取的文本 */
    text: string;
    /** 请求的长度 */
    length: number;
    /** 实际提取的长度 */
    actualLength: number;
  };
  /** 后文分析 */
  contextAfter: {
    /** 提取的文本 */
    text: string;
    /** 请求的长度 */
    length: number;
    /** 实际提取的长度 */
    actualLength: number;
  };
  /** 光标上下文 */
  cursorContext: string;
}

// ============================================================
// 流式类型
// ============================================================

/**
 * 流式续写事件
 */
export type StreamEvent =
  | { type: 'start'; message?: string }
  | { type: 'chunk'; content: string }
  | { type: 'complete'; message?: string }
  | { type: 'error'; error: string };

// ============================================================
// 预设类型
// ============================================================

/**
 * 续写预设配置
 */
export interface ContinuationPreset {
  /** 目标字数 */
  targetWordCount: number;
  /** 续写风格 */
  style: ContinuationStyle;
  /** 是否推进情节 */
  advancePlot: boolean;
  /** 是否避免新角色 */
  avoidNewCharacters: boolean;
}

/**
 * 预设类型
 */
export type ContinuationPresetType = 'standard' | 'creative' | 'minimal' | 'plotAdvance';

// ============================================================
// 工具类型
// ============================================================

/**
 * Token使用估算
 */
export interface TokenUsageEstimate {
  /** 输入Token数 */
  inputTokens: number;
  /** 输出Token数 */
  outputTokens: number;
  /** 总Token数 */
  totalTokens: number;
}

/**
 * 续写质量指标
 */
export interface ContinuationQualityMetrics {
  /** 长度是否合适 */
  lengthAppropriate: boolean;
  /** 长度比例 */
  lengthRatio: number;
  /** 风格一致性评分 (0-1) */
  styleConsistency: number;
  /** 相关性评分 (0-1) */
  relevance: number;
  /** 总体评分 (0-1) */
  overallScore: number;
}

// ============================================================
// 错误类型
// ============================================================

/**
 * 续写错误类型
 */
export type ContinuationErrorType =
  | 'INVALID_REQUEST'
  | 'CHAPTER_NOT_FOUND'
  | 'CURSOR_POSITION_INVALID'
  | 'AI_SERVICE_ERROR'
  | 'CONTENT_TOO_SHORT'
  | 'CONTENT_TOO_LONG'
  | 'STYLE_INCONSISTENT'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * 续写错误详情
 */
export interface ContinuationError {
  /** 错误类型 */
  type: ContinuationErrorType;
  /** 错误消息 */
  message: string;
  /** 错误详情 */
  details?: Record<string, unknown>;
  /** 是否可重试 */
  retryable: boolean;
  /** 建议的重试延迟（毫秒） */
  retryDelay?: number;
}

// ============================================================
// 配置类型
// ============================================================

/**
 * 续写功能配置
 */
export interface ContinuationConfig {
  /** 是否启用续写功能 */
  enabled: boolean;
  /** 单次请求最大Token数 */
  maxTokensPerRequest: number;
  /** 每日Token预算 */
  dailyTokenBudget: number;
  /** 最大并发请求数 */
  maxConcurrentRequests: number;
  /** 缓存TTL（毫秒） */
  cacheTTL: number;
  /** 默认续写选项 */
  defaultOptions: ContinuationOptions;
  /** 默认上下文长度 */
  defaultContextLength: {
    before: number;
    after: number;
  };
}

// ============================================================
// 统计类型
// ============================================================

/**
 * 续写使用统计
 */
export interface ContinuationStatistics {
  /** 总请求数 */
  totalRequests: number;
  /** 成功请求数 */
  successfulRequests: number;
  /** 失败请求数 */
  failedRequests: number;
  /** 平均响应时间（毫秒） */
  averageResponseTime: number;
  /** 平均Token使用 */
  averageTokenUsage: number;
  /** 缓存命中率 */
  cacheHitRate: number;
  /** 用户满意度（接受率） */
  userSatisfaction: number;
  /** 按风格分组的统计 */
  byStyle: Record<ContinuationStyle, {
    requests: number;
    acceptances: number;
    averageLength: number;
  }>;
}

// ============================================================
// 导出所有类型
// ============================================================

export type {
  // 核心类型
  ContinuationRequest,
  ContinuationOptions,
  ContinuationStyle,
  ContinuationResponse,
  ContinuationMetadata,

  // 分析类型
  ContextAnalysisRequest,
  ContextAnalysisResponse,

  // 流式类型
  StreamEvent,

  // 工具类型
  ContinuationPreset,
  ContinuationPresetType,
  TokenUsageEstimate,
  ContinuationQualityMetrics,

  // 错误类型
  ContinuationErrorType,
  ContinuationError,

  // 配置类型
  ContinuationConfig,

  // 统计类型
  ContinuationStatistics,
};
