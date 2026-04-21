import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// ============================================================
// 类型定义
// ============================================================

interface ContinuationRequest {
  projectId: string;
  chapterId: string;
  cursorPosition: number; // 光标位置（字符偏移量）
  contextLength?: {
    before?: number; // 前文提取长度（默认800）
    after?: number;  // 后文提取长度（默认200）
  };
  options?: {
    targetWordCount?: number; // 目标字数（默认300-500）
    style?: 'consistent' | 'creative' | 'minimal'; // 续写风格
    advancePlot?: boolean; // 是否推进情节
    avoidNewCharacters?: boolean; // 是否避免引入新角色
  };
}

interface ContinuationResponse {
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
  error?: string;
}

// ============================================================
// 辅助函数：上下文提取
// ============================================================

/**
 * 智能上下文提取器
 * 按段落/句子边界智能截断，避免在句子中间截断
 */
class ContextExtractor {
  /**
   * 提取光标前的上下文（智能截断）
   */
  static extractBefore(content: string, cursorPosition: number, maxLength: number = 800): string {
    const rawBefore = content.substring(Math.max(0, cursorPosition - maxLength), cursorPosition);

    // 如果rawBefore已经很短，直接返回
    if (rawBefore.length < maxLength * 0.8) {
      return rawBefore;
    }

    // 智能截断：优先在段落边界截断
    const paragraphs = rawBefore.split(/\n\n+/);
    if (paragraphs.length > 1) {
      // 保留最后几个完整段落
      let result = '';
      for (let i = Math.max(0, paragraphs.length - 3); i < paragraphs.length; i++) {
        result += (result ? '\n\n' : '') + paragraphs[i];
      }
      if (result.length > maxLength * 0.6 && result.length < maxLength) {
        return result;
      }
    }

    // 次优：在句子边界截断（中文句号、问号、感叹号）
    const sentenceEnds = [...rawBefore.matchAll(/[。！？\.!?]/g)];
    if (sentenceEnds.length > 2) {
      const lastSentenceEnd = sentenceEnds[sentenceEnds.length - 2];
      const truncated = rawBefore.substring(lastSentenceEnd.index + 1);
      if (truncated.length > maxLength * 0.5) {
        return truncated;
      }
    }

    // 最后回退：直接截断，但添加省略号
    return '...' + rawBefore;
  }

  /**
   * 提取光标后的上下文（用于理解连贯性）
   */
  static extractAfter(content: string, cursorPosition: number, maxLength: number = 200): string {
    const rawAfter = content.substring(cursorPosition, Math.min(content.length, cursorPosition + maxLength));

    // 智能截断：优先在段落边界
    const paragraphs = rawAfter.split(/\n\n+/);
    if (paragraphs.length > 1) {
      return paragraphs[0];
    }

    // 在句子边界截断
    const sentenceEnds = [...rawAfter.matchAll(/[。！？\.!?]/g)];
    if (sentenceEnds.length > 0) {
      const firstSentenceEnd = sentenceEnds[0];
      return rawAfter.substring(0, firstSentenceEnd.index + 1);
    }

    // 直接截断，添加省略号
    return rawAfter + '...';
  }

  /**
   * 提取光标位置的最近上下文（用于续写起点）
   */
  static extractCursorContext(content: string, cursorPosition: number, length: number = 50): string {
    const start = Math.max(0, cursorPosition - length);
    const end = Math.min(content.length, cursorPosition + length / 2);
    let context = content.substring(start, end);

    // 添加省略号标记
    if (start > 0) context = '...' + context;
    if (end < content.length) context = context + '...';

    return context;
  }
}

// ============================================================
// 辅助函数：Prompt构建器
// ============================================================

/**
 * 续写Prompt构建器
 * 基于模板系统构建结构化Prompt
 */
class ContinuationPromptBuilder {
  /**
   * 构建续写Prompt
   */
  static buildPrompt(data: {
    chapterSummary: string;
    plotBeat?: string;
    povCharacter?: string;
    characterStates: Array<{ name: string; status: string }>;
    contextBefore: string;
    cursorContext: string;
    options: ContinuationRequest['options'];
  }): { systemInstruction: string; userPrompt: string } {
    const {
      chapterSummary,
      plotBeat,
      povCharacter,
      characterStates,
      contextBefore,
      cursorContext,
      options = {}
    } = data;

    // === 系统指令 ===
    const systemInstruction = `你是一位专业的小说续写助手，擅长根据前文内容自然地续写故事。

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
${options.avoidNewCharacters ? '- 不要引入新角色（除非在原计划中）' : ''}
- 对话要符合角色性格，场景描写要具体生动`;

    // === 用户Prompt ===
    let userPrompt = '';

    // 1. 章节上下文
    userPrompt += `【章节上下文】\n`;
    userPrompt += `- 章节摘要：${chapterSummary || '暂无摘要'}\n`;
    if (plotBeat) {
      userPrompt += `- 当前情节节点：${plotBeat}\n`;
    }
    if (povCharacter) {
      userPrompt += `- POV视角角色：${povCharacter}\n`;
    }
    userPrompt += '\n';

    // 2. 人物状态
    if (characterStates.length > 0) {
      userPrompt += `【人物状态】\n`;
      characterStates.forEach(state => {
        userPrompt += `- ${state.name}：${state.status}\n`;
      });
      userPrompt += '\n';
    }

    // 3. 前文（最近800字）
    userPrompt += `【前文】（最近${contextBefore.length}字）\n`;
    userPrompt += contextBefore + '\n\n';

    // 4. 续写起点（光标位置的最近50字）
    userPrompt += `【续写起点】（光标位置的最近50字）\n`;
    userPrompt += cursorContext + '\n\n';

    // 5. 续写要求
    userPrompt += `【续写要求】\n`;
    const targetWords = options.targetWordCount || 400;
    userPrompt += `- 续写长度：${targetWords * 0.8}-${targetWords * 1.2}字\n`;
    userPrompt += `- 保持与前文的风格一致性\n`;

    if (options.advancePlot) {
      userPrompt += '- 适当推进情节发展，可以引入新的冲突或转折\n';
    } else {
      userPrompt += '- 深化当前场景或角色互动，不需要大的情节推进\n';
    }

    if (options.style === 'creative') {
      userPrompt += '- 可以尝试更富有创意的表达和叙述方式\n';
    } else if (options.style === 'minimal') {
      userPrompt += '- 采用简洁的叙述风格，避免过多描写\n';
    } else {
      userPrompt += '- 保持当前的叙述风格和节奏\n';
    }

    userPrompt += '\n请直接开始续写，不要包含任何说明性文字。';

    return { systemInstruction, userPrompt };
  }
}

// ============================================================
// 辅助函数：AI服务调用
// ============================================================

/**
 * AI续写服务调用
 */
async function callAIForContinuation(
  systemInstruction: string,
  userPrompt: string,
  creativity: number = 0.8
): Promise<string> {
  // 这里复用现有的executeModelTask或直接调用Gemini API
  // 为了保持一致性，我们模拟调用现有的AI服务

  try {
    // 动态导入AI服务（避免循环依赖）
    const { generateText } = await import('../../../services/gemini/writing');

    // 使用generateText作为基础，但传入自定义的prompt
    const result = await generateText(userPrompt, 'writing_base', {
      creativity,
      // 其他creative settings...
    });

    if (!result || typeof result !== 'string') {
      throw new Error('AI service returned invalid response');
    }

    return result;
  } catch (error) {
    console.error('AI续写调用失败:', error);
    throw new Error(`AI服务调用失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================
// 辅助函数：质量验证
// ============================================================

/**
 * 生成内容质量验证器
 */
class ContentValidator {
  /**
   * 验证生成内容的质量
   */
  static validate(generated: string, context: {
    targetLength: number;
    originalContent: string;
  }): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // 1. 长度检查
    const lengthRatio = generated.length / context.targetLength;
    if (lengthRatio < 0.3) {
      issues.push(`生成内容过短（${generated.length}字，期望${context.targetLength}字）`);
    } else if (lengthRatio > 2.0) {
      issues.push(`生成内容过长（${generated.length}字，期望${context.targetLength}字）`);
    }

    // 2. 相关性检查（简单启发式）
    if (context.originalContent.length > 100) {
      const originalSample = context.originalContent.slice(-100);
      // 检查是否有某些风格相似性（这里简化为字符多样性）
      const originalUniqueChars = new Set(originalSample.split('')).size;
      const generatedUniqueChars = new Set(generated.slice(0, 100).split('')).size;

      if (Math.abs(originalUniqueChars - generatedUniqueChars) > 20) {
        issues.push('生成内容的字符多样性可能与原文风格差异较大');
      }
    }

    // 3. 格式检查
    if (generated.includes('```') || generated.includes('**') || generated.includes('以下是')) {
      issues.push('生成内容包含Markdown格式标记，需要清理');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  /**
   * 清理生成内容
   */
  static clean(generated: string): string {
    let cleaned = generated.trim();

    // 移除常见的AI生成标记
    cleaned = cleaned.replace(/^```[a-z]*\n?/gm, '');
    cleaned = cleaned.replace(/```$/gm, '');
    cleaned = cleaned.replace(/^\*\*.*?\*\*\s*/gm, '');
    cleaned = cleaned.replace(/^(以下是|以下是续写内容|续写如下：).*?\n/gm, '');

    return cleaned;
  }
}

// ============================================================
// 核心API端点
// ============================================================

/**
 * POST /api/writing/continue
 * AI续写核心接口
 */
router.post('/continue', async (req: Request, res: Response) => {
  const requestId = `continuation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const startTime = Date.now();

  console.log(`[AI续写] ${requestId} - 收到请求`);

  try {
    // 1. 参数验证
    const {
      projectId,
      chapterId,
      cursorPosition,
      contextLength = {},
      options = {}
    } = req.body as ContinuationRequest;

    if (!projectId || !chapterId || typeof cursorPosition !== 'number') {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数：projectId, chapterId, cursorPosition'
      });
    }

    // 2. 获取章节内容
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { content: true, summary: true, expectedPOV: true, plotNodeId: true }
    });

    if (!chapter || chapter.content === null) {
      return res.status(404).json({
        success: false,
        error: '章节不存在或内容为空'
      });
    }

    const content = chapter.content;
    if (cursorPosition < 0 || cursorPosition > content.length) {
      return res.status(400).json({
        success: false,
        error: `光标位置无效（0-${content.length}）`
      });
    }

    // 3. 提取上下文
    const beforeLength = contextLength.before || 800;
    const afterLength = contextLength.after || 200;

    const contextBefore = ContextExtractor.extractBefore(content, cursorPosition, beforeLength);
    const contextAfter = ContextExtractor.extractAfter(content, cursorPosition, afterLength);
    const cursorContext = ContextExtractor.extractCursorContext(content, cursorPosition, 50);

    console.log(`[AI续写] ${requestId} - 上下文提取完成：前文${contextBefore.length}字，后文${contextAfter.length}字`);

    // 4. 获取项目上下文（角色状态、情节节点等）
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        characters: {
          select: { id: true, name: true, description: true, physicalStatus: true }
        },
        plotNodes: {
          where: { id: chapter.plotNodeId || undefined },
          select: { title: true, content: true }
        }
      }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        error: '项目不存在'
      });
    }

    // 构建角色状态信息
    const characterStates = project.characters.map(char => ({
      name: char.name,
      status: char.physicalStatus || char.description?.slice(0, 100) || '状态未知'
    }));

    // 获取当前情节节点
    const plotBeat = chapter.plotNodeId && project.plotNodes[0]
      ? project.plotNodes[0].title
      : undefined;

    // 5. 构建Prompt
    const { systemInstruction, userPrompt } = ContinuationPromptBuilder.buildPrompt({
      chapterSummary: chapter.summary || '',
      plotBeat,
      povCharacter: chapter.expectedPOV || undefined,
      characterStates,
      contextBefore,
      cursorContext,
      options
    });

    console.log(`[AI续写] ${requestId} - Prompt构建完成，调用AI服务...`);

    // 6. 调用AI服务
    const creativity = options.style === 'creative' ? 0.9 : 0.7;
    const rawGenerated = await callAIForContinuation(systemInstruction, userPrompt, creativity);

    // 7. 清理和验证生成内容
    const cleanedGenerated = ContentValidator.clean(rawGenerated);
    const validation = ContentValidator.validate(cleanedGenerated, {
      targetLength: options.targetWordCount || 400,
      originalContent: content
    });

    if (!validation.valid) {
      console.warn(`[AI续写] ${requestId} - 质量验证失败：`, validation.issues);
      // 对于严重问题，可以重试或返回错误
      if (validation.issues.some(issue => issue.includes('过短'))) {
        return res.status(500).json({
          success: false,
          error: 'AI生成内容过短，请重试',
          issues: validation.issues
        });
      }
    }

    // 8. 返回结果
    const duration = Date.now() - startTime;
    console.log(`[AI续写] ${requestId} - 完成，耗时${duration}ms，生成${cleanedGenerated.length}字`);

    const response: ContinuationResponse = {
      success: true,
      continuation: cleanedGenerated,
      metadata: {
        generatedLength: cleanedGenerated.length,
        contextUsed: {
          beforeLength: contextBefore.length,
          afterLength: contextAfter.length,
          cursorContext
        },
        modelUsed: 'gemini-3-flash-preview', // 可以从配置中读取
        timestamp: Date.now()
      }
    };

    // 如果有质量警告，添加到响应中
    if (validation.issues.length > 0) {
      (response as any).warnings = validation.issues;
    }

    res.json(response);

  } catch (error: any) {
    console.error(`[AI续写] ${requestId} - 错误：`, error);
    res.status(500).json({
      success: false,
      error: error.message || 'AI续写服务暂时不可用'
    });
  }
});

/**
 * POST /api/writing/continue-stream
 * 流式续写接口（实验性）
 *
 * 注意：这需要前端支持SSE（Server-Sent Events）或WebSocket
 */
router.post('/continue-stream', async (req: Request, res: Response) => {
  const { projectId, chapterId, cursorPosition, contextLength = {}, options = {} } = req.body;

  // 设置SSE响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // 获取章节内容
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { content: true, summary: true, expectedPOV: true }
    });

    if (!chapter || chapter.content === null) {
      res.write(`data: ${JSON.stringify({ error: '章节不存在或内容为空' })}\n\n`);
      res.end();
      return;
    }

    // 提取上下文
    const contextBefore = ContextExtractor.extractBefore(
      chapter.content,
      cursorPosition,
      contextLength.before || 800
    );

    // 发送开始事件
    res.write(`data: ${JSON.stringify({ type: 'start', message: '开始续写...' })}\n\n`);

    // 这里应该实现流式生成逻辑
    // 由于当前executeModelTask不支持流式，这里先发送完成事件
    // 未来需要集成Gemini的流式API

    res.write(`data: ${JSON.stringify({ type: 'complete', message: '流式续写功能开发中' })}\n\n`);
    res.end();

  } catch (error: any) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/writing/analyze-context
 * 上下文分析接口（用于调试和优化）
 */
router.post('/analyze-context', async (req: Request, res: Response) => {
  const { projectId, chapterId, cursorPosition, contextLength = {} } = req.body;

  try {
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { content: true }
    });

    if (!chapter || chapter.content === null) {
      return res.status(404).json({ error: '章节不存在' });
    }

    const beforeLength = contextLength.before || 800;
    const afterLength = contextLength.after || 200;

    const analysis = {
      cursorPosition,
      contentLength: chapter.content.length,
      contextBefore: {
        text: ContextExtractor.extractBefore(chapter.content, cursorPosition, beforeLength),
        length: beforeLength,
        actualLength: ContextExtractor.extractBefore(chapter.content, cursorPosition, beforeLength).length
      },
      contextAfter: {
        text: ContextExtractor.extractAfter(chapter.content, cursorPosition, afterLength),
        length: afterLength,
        actualLength: ContextExtractor.extractAfter(chapter.content, cursorPosition, afterLength).length
      },
      cursorContext: ContextExtractor.extractCursorContext(chapter.content, cursorPosition, 50)
    };

    res.json(analysis);

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export { router as writingRouter };
