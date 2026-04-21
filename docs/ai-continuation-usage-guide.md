# AI续写功能使用指南

## 目录

1. [快速开始](#快速开始)
2. [基础用法](#基础用法)
3. [高级功能](#高级功能)
4. [流式输出](#流式输出)
5. [错误处理](#错误处理)
6. [最佳实践](#最佳实践)
7. [性能优化](#性能优化)
8. [故障排查](#故障排查)

---

## 快速开始

### 安装依赖

```bash
# API客户端已包含在项目中，无需额外安装
# 只需确保配置了正确的API密钥
```

### 基础配置

```typescript
import { createWritingContinuationAPIClient } from '@/services/api/writingContinuationApi';

// 创建API客户端实例
const client = createWritingContinuationAPIClient({
  baseURL: 'http://localhost:3000/api',
  apiKey: 'your-api-key-here',
  timeout: 30000,
});
```

### 第一个续写请求

```typescript
// 最简单的续写调用
const text = await client.quickContinue(
  'project-123',
  'chapter-456',
  2340,  // 光标位置
  400    // 目标长度
);

console.log('续写结果:', text);
```

---

## 基础用法

### 1. 标准续写

```typescript
import type { ContinueWritingOptions } from '@/types/writing-continuation';

const options: ContinueWritingOptions = {
  chapterId: 'chapter-456',
  cursorPosition: 2340,
  targetLength: 400,
};

const response = await client.continueWriting('project-123', options);

console.log('续写文本:', response.data.continuationText);
console.log('实际长度:', response.data.metadata.actualLength);
console.log('使用模型:', response.data.metadata.modelUsed);
```

### 2. 带风格提示的续写

```typescript
const options: ContinueWritingOptions = {
  chapterId: 'chapter-456',
  cursorPosition: 2340,
  targetLength: 500,
  styleHints: [
    '保持悬疑氛围',
    '突出主角心理活动',
    '注重环境描写',
  ],
};

const response = await client.continueWriting('project-123', options);
```

### 3. 指定角色状态

```typescript
import type { CharacterState } from '@/types/writing-continuation';

const characterStates: Record<string, CharacterState> = {
  'char-789': {
    location: '古堡大厅',
    state: '紧张警惕',
    isDead: false,
  },
  'char-456': {
    location: '未知',
    state: '失踪',
    isDead: false,
  },
};

const options: ContinueWritingOptions = {
  chapterId: 'chapter-456',
  cursorPosition: 2340,
  characterStates,
  plotContext: '主角正在探索古堡秘密，即将发现关键线索',
};

const response = await client.continueWriting('project-123', options);
```

---

## 高级功能

### 1. 调整节奏模式

```typescript
import type { PacingMode } from '@/types/writing-continuation';

const options: ContinueWritingOptions = {
  chapterId: 'chapter-456',
  cursorPosition: 2340,
  pacingMode: 'SLOW_BURN',  // 慢热铺垫
  // pacingMode: 'BALANCED',  // 平衡推进
  // pacingMode: 'CLIMAX',    // 高潮爆发
};

const response = await client.continueWriting('project-123', options);
```

### 2. 调整创造性参数

```typescript
const options: ContinueWritingOptions = {
  chapterId: 'chapter-456',
  cursorPosition: 2340,
  creativity: 0.9,  // 0.0-1.0，越高的创造性越强
};

const response = await client.continueWriting('project-123', options);
```

### 3. 启用知识图谱上下文

```typescript
const options: ContinueWritingOptions = {
  chapterId: 'chapter-456',
  cursorPosition: 2340,
  includeGraphContext: true,  // 从知识图谱提取相关关系和设定
};

const response = await client.continueWriting('project-123', options);
```

### 4. 智能续写（自动上下文提取）

```typescript
const response = await client.smartContinue(
  'project-123',
  'chapter-456',
  chapterContent,  // 完整章节内容
  2340,            // 光标位置
  {
    targetLength: 400,
    styleHints: ['保持悬疑氛围'],
  }
);

console.log('续写文本:', response.data.continuationText);
```

---

## 流式输出

### 基础流式续写

```typescript
const cancel = client.continueWritingStream(
  'project-123',
  {
    chapterId: 'chapter-456',
    cursorPosition: 2340,
    targetLength: 400,
  },
  {
    onChunk: (chunk) => {
      console.log('收到数据块:', chunk);
      // 实时显示生成的文本
      updateEditorContent(chunk);
    },
    onDone: (metadata) => {
      console.log('生成完成:', metadata);
      console.log('实际长度:', metadata.actualLength);
    },
    onError: (error) => {
      console.error('生成失败:', error);
    },
  }
);

// 如果需要取消流式传输
// cancel();
```

### 流式续写 + React集成

```typescript
import { useState } from 'react';

function useStreamingContinuation() {
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [metadata, setMetadata] = useState<ContinuationMetadata | null>(null);

  const startStreaming = async (projectId: string, options: ContinueWritingOptions) => {
    setIsGenerating(true);
    setText('');
    setMetadata(null);

    const cancel = client.continueWritingStream(
      projectId,
      options,
      {
        onChunk: (chunk) => {
          setText(prev => prev + chunk);
        },
        onDone: (meta) => {
          setMetadata(meta);
          setIsGenerating(false);
        },
        onError: (error) => {
          console.error('流式续写失败:', error);
          setIsGenerating(false);
        },
      }
    );

    return cancel;
  };

  return { text, isGenerating, metadata, startStreaming };
}

// 使用示例
function MyEditor() {
  const { text, isGenerating, startStreaming } = useStreamingContinuation();

  const handleContinue = () => {
    startStreaming('project-123', {
      chapterId: 'chapter-456',
      cursorPosition: 2340,
      targetLength: 400,
    });
  };

  return (
    <div>
      <button onClick={handleContinue} disabled={isGenerating}>
        {isGenerating ? '生成中...' : 'AI续写'}
      </button>
      <div>{text}</div>
    </div>
  );
}
```

---

## 错误处理

### 完整的错误处理示例

```typescript
import { ErrorCode } from '@/types/writing-continuation';

try {
  const response = await client.continueWriting('project-123', options);
  console.log('续写成功:', response.data.continuationText);
} catch (error) {
  if (isErrorResponse(error)) {
    switch (error.error) {
      case ErrorCode.CONTEXT_TOO_SHORT:
        console.error('上下文过短:', error.message);
        console.log('建议: 提供更多上下文内容');
        break;

      case ErrorCode.CONTEXT_TOO_LONG:
        console.error('上下文过长:', error.message);
        console.log('建议: 减少上下文长度或分批处理');
        break;

      case ErrorCode.INVALID_TARGET_LENGTH:
        console.error('目标长度无效:', error.message);
        console.log('建议: 调整目标长度在200-1000字之间');
        break;

      case ErrorCode.RATE_LIMIT_EXCEEDED:
        console.error('请求过于频繁:', error.message);
        const retryAfter = (error.details as any)?.retryAfter || 60;
        console.log(`建议: ${retryAfter}秒后重试`);
        break;

      case ErrorCode.GENERATION_FAILED:
        console.error('AI生成失败:', error.message);
        console.log('建议: 检查网络连接或稍后重试');
        break;

      default:
        console.error('未知错误:', error.message);
    }
  } else {
    console.error('网络错误:', error);
  }
}
```

### 重试逻辑

```typescript
async function continueWithRetry(
  projectId: string,
  options: ContinueWritingOptions,
  maxRetries = 3
): Promise<ContinueWritingResponse> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.continueWriting(projectId, options);
    } catch (error) {
      if (isErrorResponse(error)) {
        if (error.error === ErrorCode.RATE_LIMIT_EXCEEDED && i < maxRetries - 1) {
          const retryAfter = (error.details as any)?.retryAfter || 5;
          console.log(`请求被限流，${retryAfter}秒后重试 (${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
      }
      throw error;
    }
  }
  throw new Error('重试次数耗尽');
}
```

---

## 最佳实践

### 1. 上下文长度选择

```typescript
// 根据章节位置动态调整上下文长度
function getOptimalContextLength(chapterContent: string, cursorPosition: number): number {
  const totalLength = chapterContent.length;

  if (totalLength < 500) {
    // 短章节：使用全部内容
    return totalLength;
  } else if (totalLength < 2000) {
    // 中等章节：使用前1000字符
    return Math.min(cursorPosition, 1000);
  } else {
    // 长章节：使用前1500字符（默认）
    return Math.min(cursorPosition, 1500);
  }
}

const contextLength = getOptimalContextLength(chapterContent, cursorPosition);
```

### 2. 目标长度选择

```typescript
// 根据章节位置动态调整目标长度
function getOptimalTargetLength(chapterContent: string, cursorPosition: number): number {
  const remainingLength = chapterContent.length - cursorPosition;

  if (remainingLength < 200) {
    // 接近章节结尾：短续写
    return 250;
  } else if (remainingLength < 1000) {
    // 章节中段：中等续写
    return 400;
  } else {
    // 章节开头：长续写
    return 600;
  }
}

const targetLength = getOptimalTargetLength(chapterContent, cursorPosition);
```

### 3. 风格提示建议

```typescript
// 根据章节类型提供合适的风格提示
function getStyleHintsForChapter(chapterType: string): string[] {
  const hintsMap: Record<string, string[]> = {
    'action': [
      '动作密集',
      '节奏快速',
      '对话简洁',
    ],
    'emotional': [
      '注重心理描写',
      '情感细腻',
      '节奏缓慢',
    ],
    'mystery': [
      '保持悬疑氛围',
      '留下伏笔',
      '逐步揭示信息',
    ],
    'dialogue': [
      '对话驱动',
      '角色个性鲜明',
      '潜台词丰富',
    ],
  };

  return hintsMap[chapterType] || [];
}

const styleHints = getStyleHintsForChapter(chapterType);
```

### 4. 批量续写优化

```typescript
// 为章节的多个关键位置生成续写建议
const keyPositions = [500, 1500, 2500, 3500];

const results = await client.batchContinue(
  'project-123',
  'chapter-456',
  keyPositions,
  300
);

// 分析结果，选择最佳续写
const bestContinuation = results
  .filter(r => r.text.length > 0)
  .sort((a, b) => b.metadata.actualLength - a.metadata.actualLength)[0];

console.log('最佳续写:', bestContinuation);
```

---

## 性能优化

### 1. 缓存策略

```typescript
// 使用缓存避免重复请求
const continuationCache = new Map<string, ContinueWritingResponse>();

async function getCachedContinuation(
  projectId: string,
  chapterId: string,
  cursorPosition: number,
  options: ContinueWritingOptions
): Promise<ContinueWritingResponse> {
  const cacheKey = `${projectId}-${chapterId}-${cursorPosition}-${JSON.stringify(options)}`;

  if (continuationCache.has(cacheKey)) {
    console.log('使用缓存的续写结果');
    return continuationCache.get(cacheKey)!;
  }

  const response = await client.continueWriting(projectId, options);
  continuationCache.set(cacheKey, response);

  return response;
}
```

### 2. 并发控制

```typescript
// 限制并发请求数量
class ConcurrentContinuationLimiter {
  private queue: Array<() => Promise<any>> = [];
  private activeCount = 0;
  private maxConcurrency: number;

  constructor(maxConcurrency: number = 3) {
    this.maxConcurrency = maxConcurrency;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    while (this.activeCount >= this.maxConcurrency) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.activeCount++;
    try {
      return await fn();
    } finally {
      this.activeCount--;
    }
  }
}

const limiter = new ConcurrentContinuationLimiter(3);

// 使用示例
const result = await limiter.execute(() =>
  client.continueWriting('project-123', options)
);
```

### 3. 预加载策略

```typescript
// 在用户浏览章节时预加载可能的续写位置
function preloadContinuations(
  projectId: string,
  chapterId: string,
  chapterContent: string
) {
  const keyPositions = [
    Math.floor(chapterContent.length * 0.25),
    Math.floor(chapterContent.length * 0.5),
    Math.floor(chapterContent.length * 0.75),
  ];

  keyPositions.forEach(position => {
    // 异步预加载，不阻塞主线程
    client.continueWriting(projectId, {
      chapterId,
      cursorPosition: position,
      targetLength: 300,
    }).then(response => {
      console.log(`位置${position}的续写已预加载`);
    }).catch(error => {
      console.warn(`位置${position}的预加载失败:`, error);
    });
  });
}
```

---

## 故障排查

### 问题1: 续写质量不佳

**症状**: 生成的文本与上下文不符或风格不一致

**解决方案**:
```typescript
// 1. 增加上下文长度
options.contextLength = 2000;

// 2. 提供更具体的风格提示
options.styleHints = [
  '保持悬疑氛围',
  '避免使用陈词滥调',
  '注重环境描写',
];

// 3. 启用知识图谱上下文
options.includeGraphContext = true;

// 4. 调整创造性参数
options.creativity = 0.7;  // 降低创造性，提高一致性
```

### 问题2: 请求超时

**症状**: 请求经常超时或响应缓慢

**解决方案**:
```typescript
// 1. 增加超时时间
const client = createWritingContinuationAPIClient({
  baseURL: 'http://localhost:3000/api',
  apiKey: 'your-api-key',
  timeout: 60000,  // 60秒
});

// 2. 减少上下文长度
options.contextLength = 1000;

// 3. 禁用知识图谱上下文
options.includeGraphContext = false;

// 4. 使用流式输出提供即时反馈
options.useStreaming = true;
```

### 问题3: 频率限制

**症状**: 收到429错误（请求过于频繁）

**解决方案**:
```typescript
// 1. 实现指数退避重试
async function continueWithExponentialBackoff(
  projectId: string,
  options: ContinueWritingOptions
): Promise<ContinueWritingResponse> {
  let retryDelay = 1000;  // 初始1秒

  while (true) {
    try {
      return await client.continueWriting(projectId, options);
    } catch (error) {
      if (isErrorResponse(error) && error.error === ErrorCode.RATE_LIMIT_EXCEEDED) {
        console.log(`请求被限流，${retryDelay}ms后重试`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retryDelay *= 2;  // 指数退避
        if (retryDelay > 60000) retryDelay = 60000;  // 最大60秒
      } else {
        throw error;
      }
    }
  }
}

// 2. 批量请求时添加延迟
async function batchContinueWithDelay(
  projectId: string,
  chapterId: string,
  positions: number[]
) {
  const results = [];

  for (const position of positions) {
    const result = await client.continueWriting(projectId, {
      chapterId,
      cursorPosition: position,
    });
    results.push(result);

    // 每个请求之间延迟2秒
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}
```

### 问题4: API密钥无效

**症状**: 收到401错误（未授权）

**解决方案**:
```typescript
// 1. 检查API密钥配置
const client = createWritingContinuationAPIClient({
  baseURL: 'http://localhost:3000/api',
  apiKey: process.env.NEXT_PUBLIC_API_KEY || '',  // 确保密钥已设置
});

// 2. 验证API密钥有效性
async function validateApiKey(): Promise<boolean> {
  try {
    const health = await client.checkHealth();
    return health.data.overallStatus === 'healthy';
  } catch (error) {
    console.error('API密钥验证失败:', error);
    return false;
  }
}

// 3. 在应用启动时检查
if (!await validateApiKey()) {
  console.error('API密钥无效，请检查配置');
}
```

---

## 附录

### A. 完整配置示例

```typescript
// config/writing-continuation.ts
import { createWritingContinuationAPIClient } from '@/services/api/writingContinuationApi';

export const writingContinuationClient = createWritingContinuationAPIClient({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
  apiKey: process.env.NEXT_PUBLIC_API_KEY || '',
  timeout: 30000,
  retryEnabled: true,
  maxRetries: 3,
});

// 默认配置
export const defaultContinuationOptions = {
  contextLength: 1500,
  targetLength: 400,
  pacingMode: 'BALANCED' as const,
  creativity: 0.8,
  includeGraphContext: false,
};
```

### B. React Hook封装

```typescript
// hooks/useWritingContinuation.ts
import { useState, useCallback } from 'react';
import { writingContinuationClient } from '@/config/writing-continuation';
import type { ContinueWritingOptions, ContinueWritingResponse } from '@/types/writing-continuation';

export function useWritingContinuation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<ContinueWritingResponse | null>(null);

  const continueWriting = useCallback(async (
    projectId: string,
    options: ContinueWritingOptions
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await writingContinuationClient.continueWriting(projectId, options);
      setResponse(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { continueWriting, isLoading, error, response };
}
```

---

## 更多资源

- [OpenAPI规范](./api/writing-continuation-api-spec.yaml)
- [TypeScript类型定义](../types/writing-continuation.ts)
- [API客户端实现](../services/api/writingContinuationApi.ts)
