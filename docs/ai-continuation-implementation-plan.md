# AI续写功能后端实现方案

## 🎯 功能概述

AI续写功能是基于现有AI服务架构的智能写作辅助功能，能够根据光标位置和上下文，智能生成与正文风格一致的续写内容。

## 📋 核心架构

### 1. 系统组件

```
┌─────────────────────────────────────────────────────────────┐
│                        前端界面                              │
│  - 光标位置检测                                              │
│  - 续写触发按钮                                              │
│  - 实时预览与编辑                                            │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP API
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    后端API层                                  │
│  POST /api/writing/continue                                 │
│  POST /api/writing/continue-stream                          │
│  POST /api/writing/analyze-context                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  业务逻辑层 (routes/writing.ts)              │
│  - ContextExtractor: 智能上下文提取                           │
│  - ContinuationPromptBuilder: Prompt构建器                   │
│  - ContentValidator: 质量验证器                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  数据访问层 (Prisma)                          │
│  - 章节内容读取                                              │
│  - 项目元数据查询                                            │
│  - 角色状态聚合                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI服务层 (services/gemini/)                 │
│  - executeModelTask: 统一AI调用接口                          │
│  - 模板系统: 结构化Prompt渲染                                │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 技术实现细节

### 1. 上下文提取策略

#### 1.1 ContextExtractor 类

**设计目标**: 在保证上下文完整性的同时，避免超出Token限制

**实现原理**:

```typescript
class ContextExtractor {
  // 前文提取（智能截断）
  static extractBefore(content: string, cursorPosition: number, maxLength: number = 800): string {
    const rawBefore = content.substring(Math.max(0, cursorPosition - maxLength), cursorPosition);

    // 优先级1: 段落边界截断
    const paragraphs = rawBefore.split(/\n\n+/);
    if (paragraphs.length > 1) {
      // 保留最后2-3个完整段落
      let result = '';
      for (let i = Math.max(0, paragraphs.length - 3); i < paragraphs.length; i++) {
        result += (result ? '\n\n' : '') + paragraphs[i];
      }
      if (result.length > maxLength * 0.6 && result.length < maxLength) {
        return result;
      }
    }

    // 优先级2: 句子边界截断
    const sentenceEnds = [...rawBefore.matchAll(/[。！？\.!?]/g)];
    if (sentenceEnds.length > 2) {
      const lastSentenceEnd = sentenceEnds[sentenceEnds.length - 2];
      const truncated = rawBefore.substring(lastSentenceEnd.index + 1);
      if (truncated.length > maxLength * 0.5) {
        return truncated;
      }
    }

    // 优先级3: 直接截断 + 省略号
    return '...' + rawBefore;
  }

  // 后文提取（连贯性检查）
  static extractAfter(content: string, cursorPosition: number, maxLength: number = 200): string {
    const rawAfter = content.substring(cursorPosition, Math.min(content.length, cursorPosition + maxLength));

    // 在第一个句子结束处截断
    const sentenceEnds = [...rawAfter.matchAll(/[。！？\.!?]/g)];
    if (sentenceEnds.length > 0) {
      return rawAfter.substring(0, sentenceEnds[0].index + 1);
    }

    return rawAfter + '...';
  }

  // 光标上下文（续写起点）
  static extractCursorContext(content: string, cursorPosition: number, length: number = 50): string {
    const start = Math.max(0, cursorPosition - length);
    const end = Math.min(content.length, cursorPosition + length / 2);
    let context = content.substring(start, end);

    if (start > 0) context = '...' + context;
    if (end < content.length) context = context + '...';

    return context;
  }
}
```

**智能截断的优势**:
- 保持语义完整性，避免在句子中间截断
- 优先保留完整的段落结构
- 自动添加省略号标记边界

#### 1.2 上下文长度配置

```typescript
interface ContextLengthConfig {
  before: number;  // 前文长度（默认800字）
  after: number;   // 后文长度（默认200字）
  cursor: number;  // 光标上下文（默认50字）
}
```

**推荐配置**:
- **短场景** (<1000字): before=400, after=100
- **标准场景** (1000-3000字): before=800, after=200
- **长场景** (>3000字): before=1200, after=300

### 2. Prompt工程

#### 2.1 续写Prompt模板

```typescript
class ContinuationPromptBuilder {
  static buildPrompt(data: {
    chapterSummary: string;
    plotBeat?: string;
    povCharacter?: string;
    characterStates: Array<{ name: string; status: string }>;
    contextBefore: string;
    cursorContext: string;
    options: ContinuationRequest['options'];
  }): { systemInstruction: string; userPrompt: string } {
    // 构建结构化Prompt
  }
}
```

#### 2.2 系统指令设计

```
你是一位专业的小说续写助手，擅长根据前文内容自然地续写故事。

核心能力：
1. 风格一致性：完美匹配前文的写作风格、语调和叙述视角
2. 情节推进：在现有情节基础上自然推进，避免突兀转折
3. 角色塑造：保持角色行为和对话的一致性
4. 节奏把控：根据场景需要调整叙事节奏

续写原则：
- 不要总结或重复前文内容
- 不要在句子中间开始续写
- 不要结束当前场景（除非明确要求）
- 保持叙事视角的一致性（第一人称/第三人称）
- 不要引入新角色（除非在原计划中）
- 对话要符合角色性格，场景描写要具体生动
```

#### 2.3 用户Prompt结构

```
【章节上下文】
- 章节摘要：{summary}
- 当前情节节点：{plotBeat}
- POV视角角色：{povCharacter}

【人物状态】
- {character1}: {status}
- {character2}: {status}

【前文】（最近800字）
{contextBefore}

【续写起点】（光标位置的最近50字）
{cursorContext}

【续写要求】
- 续写长度：300-500字
- 保持与前文的风格一致性
- 深化当前场景或角色互动
- 保持当前的叙述风格和节奏

请直接开始续写，不要包含任何说明性文字。
```

### 3. 流式生成实现

#### 3.1 Server-Sent Events (SSE) 架构

**优势**:
- 单向流式传输，适合AI生成场景
- 自动重连机制
- 低延迟，实时性好

**实现方案**:

```typescript
// 后端
router.post('/continue-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // 发送开始事件
  res.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);

  // 调用Gemini流式API
  const streamingResult = await callGeminiStreamAPI(prompt);

  for await (const chunk of streamingResult) {
    res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
  }

  // 发送完成事件
  res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
  res.end();
});
```

```typescript
// 前端
async function streamContinuation(request: ContinuationRequest) {
  const response = await fetch('/api/writing/continue-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.type === 'chunk') {
          // 实时更新UI
          updatePreview(data.content);
        }
      }
    }
  }
}
```

#### 3.2 中断和恢复机制

```typescript
class StreamingManager {
  private activeStreams = new Map<string, AbortController>();

  startStream(requestId: string, signal: AbortSignal) {
    const controller = new AbortController();
    this.activeStreams.set(requestId, controller);

    // 监听中断信号
    signal.addEventListener('abort', () => {
      this.cancelStream(requestId);
    });
  }

  cancelStream(requestId: string) {
    const controller = this.activeStreams.get(requestId);
    if (controller) {
      controller.abort();
      this.activeStreams.delete(requestId);
    }
  }
}
```

### 4. 性能优化

#### 4.1 上下文缓存策略

```typescript
class ContextCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5分钟过期

  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }
}
```

**缓存Key设计**:
```typescript
const cacheKey = `context_${chapterId}_${cursorPosition}`;
```

#### 4.2 Token计算和预算

```typescript
function estimateTokenUsage(request: ContinuationRequest): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
} {
  const { contextLength = {}, options = {} } = request;

  // 输入Token
  const inputTokens =
    (contextLength.before || 800) * 1.5 + // 中文Token估算
    (contextLength.after || 200) * 1.5 +
    500 + // 系统指令
    300;  // 用户Prompt模板

  // 输出Token
  const outputTokens = (options.targetWordCount || 400) * 2;

  return {
    inputTokens: Math.ceil(inputTokens),
    outputTokens: Math.ceil(outputTokens),
    totalTokens: Math.ceil(inputTokens + outputTokens)
  };
}
```

**预算管理**:
```typescript
const BUDGET_LIMITS = {
  daily: 100000,    // 每日Token限制
  perRequest: 2000  // 单次请求限制
};

function checkBudget(usage: { totalTokens: number }): boolean {
  // 检查是否超出预算
  return usage.totalTokens <= BUDGET_LIMITS.perRequest;
}
```

#### 4.3 并发控制

```typescript
class ConcurrencyManager {
  private activeRequests = new Map<string, Promise<any>>();
  private maxConcurrent = 3;

  async execute<T>(
    key: string,
    fn: () => Promise<T>
  ): Promise<T> {
    // 等待相同key的请求完成
    while (this.activeRequests.has(key)) {
      await this.activeRequests.get(key);
    }

    // 检查并发限制
    if (this.activeRequests.size >= this.maxConcurrent) {
      throw new Error('Too many concurrent requests');
    }

    const promise = fn().finally(() => {
      this.activeRequests.delete(key);
    });

    this.activeRequests.set(key, promise);
    return promise;
  }
}
```

### 5. 质量保障

#### 5.1 生成后验证

```typescript
class ContentValidator {
  static validate(generated: string, context: {
    targetLength: number;
    originalContent: string;
  }): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // 1. 长度检查
    const lengthRatio = generated.length / context.targetLength;
    if (lengthRatio < 0.3) {
      issues.push(`生成内容过短（${generated.length}字）`);
    } else if (lengthRatio > 2.0) {
      issues.push(`生成内容过长（${generated.length}字）`);
    }

    // 2. 相关性检查
    const originalSample = context.originalContent.slice(-100);
    const originalUniqueChars = new Set(originalSample.split('')).size;
    const generatedUniqueChars = new Set(generated.slice(0, 100).split('')).size;

    if (Math.abs(originalUniqueChars - generatedUniqueChars) > 20) {
      issues.push('风格差异较大');
    }

    // 3. 格式检查
    if (generated.includes('```') || generated.includes('以下是')) {
      issues.push('包含Markdown格式标记');
    }

    return { valid: issues.length === 0, issues };
  }

  static clean(generated: string): string {
    let cleaned = generated.trim();

    // 移除AI生成标记
    cleaned = cleaned.replace(/^```[a-z]*\n?/gm, '');
    cleaned = cleaned.replace(/```$/gm, '');
    cleaned = cleaned.replace(/^\*\*.*?\*\*\s*/gm, '');
    cleaned = cleaned.replace(/^(以下是|续写如下：).*?\n/gm, '');

    return cleaned;
  }
}
```

#### 5.2 失败重试策略

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));

      console.warn(`Retry ${attempt}/${maxRetries} after ${delay}ms`);
    }
  }

  throw new Error('All retries failed');
}
```

## 📊 性能指标

### 1. 预期性能

| 指标 | 目标值 | 说明 |
|------|--------|------|
| 响应时间 | <3秒 | 标准续写请求 |
| 首字延迟 | <1秒 | 流式模式首字返回 |
| Token使用 | <2000 | 单次续写请求 |
| 准确率 | >85% | 生成内容可用率 |
| 风格一致性 | >80% | 与前文风格匹配度 |

### 2. 监控指标

```typescript
interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  averageTokenUsage: number;
  errorRate: number;
  cacheHitRate: number;
  userSatisfaction: number; // 用户接受率
}
```

## 🚀 部署方案

### 1. 环境变量配置

```bash
# .env
AI_CONTINUATION_ENABLED=true
AI_CONTINUATION_MAX_TOKENS=2000
AI_CONTINUATION_CACHE_TTL=300000
AI_CONTINUATION_MAX_CONCURRENT=3
```

### 2. 数据库迁移

**无需额外迁移**，复用现有数据库结构。

### 3. API测试

```bash
# 测试续写接口
curl -X POST http://localhost:3001/api/writing/continue \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "xxx",
    "chapterId": "xxx",
    "cursorPosition": 1000,
    "options": {
      "targetWordCount": 400,
      "style": "consistent"
    }
  }'
```

## 🔮 未来扩展

### 1. 高级特性

- **上下文感知**: 根据章节位置自动调整续写策略
- **多角色续写**: 支持多个角色的续写版本生成
- **风格迁移**: 将续写内容转换为不同风格
- **情节预测**: 基于前文预测后续情节发展

### 2. 智能优化

- **学习用户偏好**: 根据用户编辑历史优化续写风格
- **自动摘要**: 自动生成章节摘要用于上下文
- **冲突检测**: 检测续写内容与已有设定的冲突

### 3. 协作增强

- **多人协作**: 多作者同时续写不同章节
- **版本控制**: 续写内容的版本管理和回滚
- **评论反馈**: 对续写内容的评论和迭代

## 📝 开发检查清单

### Phase 1: 核心功能
- [x] 创建后端路由和API端点
- [x] 实现上下文提取器
- [x] 实现Prompt构建器
- [x] 实现质量验证器
- [x] 创建前端API客户端
- [x] 更新服务器路由注册
- [x] 添加类型定义

### Phase 2: 集成测试
- [ ] 单元测试：上下文提取逻辑
- [ ] 单元测试：Prompt构建逻辑
- [ ] 单元测试：质量验证逻辑
- [ ] 集成测试：完整续写流程
- [ ] 性能测试：响应时间和Token使用

### Phase 3: 前端集成
- [ ] 创建续写UI组件
- [ ] 实现光标位置检测
- [ ] 实现实时预览
- [ ] 添加错误处理和重试
- [ ] 添加用户反馈收集

### Phase 4: 优化和监控
- [ ] 实现上下文缓存
- [ ] 实现Token预算管理
- [ ] 实现性能监控
- [ ] 添加使用统计
- [ ] 优化Prompt模板

## 🎓 总结

本方案提供了一个完整的AI续写功能后端实现，包括：

1. **智能上下文提取**: 按段落/句子边界智能截断
2. **结构化Prompt工程**: 基于模板的Prompt构建
3. **流式生成支持**: SSE实现实时生成
4. **性能优化**: 缓存、Token预算、并发控制
5. **质量保障**: 多维度验证和自动清理

该方案与现有AI服务架构完全兼容，复用了`executeModelTask`、模板系统和缓存机制，确保了代码的一致性和可维护性。
