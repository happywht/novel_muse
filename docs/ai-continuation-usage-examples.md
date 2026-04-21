# AI续写功能使用指南

## 快速开始

### 基本用法

```typescript
import { writingApi, continuationPresets } from '@/services/api';

// 1. 标准续写
const result = await writingApi.continue({
  projectId: 'project-123',
  chapterId: 'chapter-456',
  cursorPosition: 1200, // 光标位置（字符偏移）
  options: continuationPresets.standard
});

if (result.success) {
  console.log('生成内容:', result.continuation);
  console.log('元数据:', result.metadata);
}
```

### 前端集成示例

```typescript
import React, { useState } from 'react';
import { writingApi, continuationPresets } from '@/services/api';

export function AIContinuationButton({
  projectId,
  chapterId,
  content,
  cursorPosition,
  onInsert
}: {
  projectId: string;
  chapterId: string;
  content: string;
  cursorPosition: number;
  onInsert: (text: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');

  const handleContinue = async () => {
    setLoading(true);
    try {
      const result = await writingApi.continue({
        projectId,
        chapterId,
        cursorPosition,
        options: continuationPresets.standard
      });

      if (result.success && result.continuation) {
        setPreview(result.continuation);
      }
    } catch (error) {
      console.error('续写失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = () => {
    if (preview) {
      onInsert(preview);
      setPreview('');
    }
  };

  return (
    <div>
      <button
        onClick={handleContinue}
        disabled={loading}
      >
        {loading ? '生成中...' : 'AI续写'}
      </button>

      {preview && (
        <div className="continuation-preview">
          <h3>生成内容预览</h3>
          <p>{preview}</p>
          <div className="actions">
            <button onClick={handleInsert}>接受</button>
            <button onClick={() => setPreview('')}>拒绝</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 高级配置

```typescript
// 自定义续写选项
const customResult = await writingApi.continue({
  projectId: 'project-123',
  chapterId: 'chapter-456',
  cursorPosition: 1200,
  contextLength: {
    before: 1200, // 前文1200字
    after: 300    // 后文300字
  },
  options: {
    targetWordCount: 600,           // 目标600字
    style: 'creative',              // 创意风格
    advancePlot: true,              // 推进情节
    avoidNewCharacters: false       // 允许新角色
  }
});
```

### 流式续写（实验性）

```typescript
// 流式续写提供更好的实时反馈
const [streamingContent, setStreamingContent] = useState('');

await writingApi.continueStream(
  {
    projectId: 'project-123',
    chapterId: 'chapter-456',
    cursorPosition: 1200,
    options: continuationPresets.standard
  },
  // onChunk: 实时接收生成的内容
  (chunk: string) => {
    setStreamingContent(prev => prev + chunk);
  },
  // onComplete: 生成完成
  () => {
    console.log('续写完成');
  },
  // onError: 错误处理
  (error: string) => {
    console.error('流式续写错误:', error);
  }
);
```

### 上下文分析

```typescript
// 分析当前上下文（用于调试和优化）
const analysis = await writingApi.analyzeContext({
  projectId: 'project-123',
  chapterId: 'chapter-456',
  cursorPosition: 1200,
  contextLength: {
    before: 800,
    after: 200
  }
});

console.log('前文:', analysis.contextBefore.text);
console.log('前文实际长度:', analysis.contextBefore.actualLength);
console.log('后文:', analysis.contextAfter.text);
console.log('光标上下文:', analysis.cursorContext);
```

### 自适应续写

```typescript
import {
  writingApi,
  adaptiveContinuationOptions,
  estimateTokenUsage
} from '@/services/api';

// 根据章节进度自动调整续写策略
const options = adaptiveContinuationOptions(
  chapterContent,    // 完整章节内容
  cursorPosition     // 当前光标位置
);

// 估算Token使用
const tokenEstimate = estimateTokenUsage({
  projectId: 'project-123',
  chapterId: 'chapter-456',
  cursorPosition: 1200,
  options
});

console.log('预计Token使用:', tokenEstimate.totalTokens);

// 使用自适应选项进行续写
const result = await writingApi.continue({
  projectId: 'project-123',
  chapterId: 'chapter-456',
  cursorPosition: 1200,
  options
});
```

## 续写选项详解

### 风格选项

```typescript
enum ContinuationStyle {
  // 一致风格：保持与前文相同的写作风格
  consistent = 'consistent',

  // 创意风格：允许更多创意表达
  creative = 'creative',

  // 简洁风格：精简叙述，减少描写
  minimal = 'minimal'
}
```

### 预设选项对比

| 预设 | 字数 | 风格 | 推进情节 | 新角色 | 适用场景 |
|------|------|------|----------|--------|----------|
| standard | 400 | consistent | 否 | 是 | 日常续写 |
| creative | 500 | creative | 是 | 否 | 需要灵感 |
| minimal | 300 | minimal | 否 | 是 | 快速推进 |
| plotAdvance | 600 | consistent | 是 | 是 | 情节转折 |

## 错误处理

```typescript
try {
  const result = await writingApi.continue({
    projectId: 'project-123',
    chapterId: 'chapter-456',
    cursorPosition: 1200
  });

  if (!result.success) {
    // 处理业务错误
    if (result.error?.includes('过短')) {
      console.log('生成内容过短，请重试');
    } else if (result.error?.includes('光标位置无效')) {
      console.log('请检查光标位置');
    } else {
      console.log('续写失败:', result.error);
    }
  }

  // 检查质量警告
  if (result.warnings && result.warnings.length > 0) {
    console.log('质量警告:', result.warnings);
    // 可以选择提示用户或自动重试
  }

} catch (error) {
  // 处理网络错误或API错误
  console.error('API调用失败:', error);
}
```

## 最佳实践

### 1. 光标位置检测

```typescript
// 在编辑器中准确获取光标位置
function getCursorPosition(editorContent: string): number {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return 0;

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(editorContent);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  return preCaretRange.toString().length;
}
```

### 2. 内容插入

```typescript
// 在光标位置插入生成内容
function insertAtCursor(
  content: string,
  position: number,
  insertion: string
): string {
  return (
    content.substring(0, position) +
    insertion +
    content.substring(position)
  );
}

// 使用示例
const newContent = insertAtCursor(
  chapterContent,
  cursorPosition,
  result.continuation
);
```

### 3. 批量续写

```typescript
// 章节自动续写到目标字数
async function autoContinueToTarget(
  projectId: string,
  chapterId: string,
  content: string,
  targetLength: number
): Promise<string> {
  let currentPosition = content.length;
  let currentContent = content;

  while (currentPosition < targetLength) {
    const result = await writingApi.continue({
      projectId,
      chapterId,
      cursorPosition: currentPosition,
      options: {
        targetWordCount: Math.min(400, targetLength - currentPosition),
        style: 'consistent'
      }
    });

    if (!result.success || !result.continuation) {
      break;
    }

    const insertion = result.continuation;
    currentContent = insertAtCursor(currentContent, currentPosition, insertion);
    currentPosition += insertion.length;

    // 添加短暂延迟避免API限流
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return currentContent;
}
```

### 4. 质量检查和重试

```typescript
// 智能重试机制
async function continueWithRetry(
  request: ContinuationRequest,
  maxRetries = 3
): Promise<ContinuationResponse> {
  for (let i = 0; i < maxRetries; i++) {
    const result = await writingApi.continue(request);

    if (result.success) {
      // 检查质量警告
      if (!result.warnings || result.warnings.length === 0) {
        return result;
      }

      // 如果只是风格警告，可以接受
      if (result.warnings.every(w => w.includes('风格差异'))) {
        return result;
      }
    }

    // 等待后重试
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }

  throw new Error('续写失败，已达到最大重试次数');
}
```

## 性能优化

### Token预算管理

```typescript
// 设置每日Token预算
const DAILY_TOKEN_BUDGET = 50000;
let dailyTokenUsage = 0;

async function budgetAwareContinue(request: ContinuationRequest) {
  const estimate = estimateTokenUsage(request);

  if (dailyTokenUsage + estimate.totalTokens > DAILY_TOKEN_BUDGET) {
    throw new Error('Token预算不足，请明天再试');
  }

  const result = await writingApi.continue(request);

  if (result.success && result.metadata) {
    // 更新使用量（粗略估算）
    dailyTokenUsage += estimate.totalTokens;
  }

  return result;
}
```

### 缓存策略

```typescript
// 缓存续写结果避免重复调用
const continuationCache = new Map<string, ContinuationResponse>();

async function cachedContinue(
  request: ContinuationRequest
): Promise<ContinuationResponse> {
  const cacheKey = `${request.chapterId}_${request.cursorPosition}_${JSON.stringify(request.options)}`;

  const cached = continuationCache.get(cacheKey);
  if (cached) {
    console.log('使用缓存的续写结果');
    return cached;
  }

  const result = await writingApi.continue(request);

  if (result.success) {
    // 缓存5分钟
    setTimeout(() => {
      continuationCache.delete(cacheKey);
    }, 5 * 60 * 1000);

    continuationCache.set(cacheKey, result);
  }

  return result;
}
```

## 常见问题

### Q: 如何处理生成内容过长或过短？

A: 检查返回的`metadata.generatedLength`，根据需要调整`options.targetWordCount`后重试。

### Q: 如何避免生成重复内容？

A: 增加`contextLength.before`的值，提供更多前文上下文帮助AI理解。

### Q: 流式续写和普通续写如何选择？

A: 流式续写提供更好的实时反馈，适合长文本生成；普通续写更稳定，适合短文本。

### Q: 如何提高生成质量？

A:
1. 提供更详细的章节摘要
2. 确保角色状态信息准确
3. 根据场景选择合适的续写选项
4. 必要时进行手动编辑后再次续写

## 技术支持

如有问题或建议，请查看：
- 实现方案文档：`docs/ai-continuation-implementation-plan.md`
- API文档：`services/api/writingApi.ts`
- 后端实现：`server/src/routes/writing.ts`
