/**
 * AI续写功能单元测试
 */

import { ContextExtractor, ContinuationPromptBuilder, ContentValidator } from '../../routes/writing';

describe('ContextExtractor', () => {
  const sampleContent = `第一章 开始

这是第一章的开头内容。

这是第二段内容，包含一些描述。

这是第三段内容，需要更多的细节。

光标在这里。后面还有内容。

这是光标后的内容。`;

  describe('extractBefore', () => {
    it('应该正确提取光标前的内容', () => {
      const cursorPosition = sampleContent.indexOf('光标在这里');
      const result = ContextExtractor.extractBefore(sampleContent, cursorPosition, 100);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toContain('...');
    });

    it('应该在段落边界智能截断', () => {
      const cursorPosition = sampleContent.indexOf('光标在这里');
      const result = ContextExtractor.extractBefore(sampleContent, cursorPosition, 200);

      // 应该包含完整的段落
      const paragraphs = result.split('\n\n');
      expect(paragraphs.length).toBeGreaterThan(0);
    });

    it('应该在上下文很长时添加省略号', () => {
      const longContent = 'A'.repeat(1000) + '光标位置';
      const cursorPosition = longContent.indexOf('光标位置');
      const result = ContextExtractor.extractBefore(longContent, cursorPosition, 100);

      expect(result).toContain('...');
    });

    it('应该处理光标在开头的情况', () => {
      const result = ContextExtractor.extractBefore(sampleContent, 0, 100);

      expect(result).toBe('');
    });

    it('应该处理光标在结尾的情况', () => {
      const cursorPosition = sampleContent.length;
      const result = ContextExtractor.extractBefore(sampleContent, cursorPosition, 100);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('extractAfter', () => {
    it('应该正确提取光标后的内容', () => {
      const cursorPosition = sampleContent.indexOf('光标在这里');
      const result = ContextExtractor.extractAfter(sampleContent, cursorPosition, 100);

      expect(result).toBeDefined();
      expect(result).toContain('后面还有内容');
    });

    it('应该在句子边界截断', () => {
      const cursorPosition = sampleContent.indexOf('光标在这里');
      const result = ContextExtractor.extractAfter(sampleContent, cursorPosition, 50);

      // 应该在句号处截断
      const firstSentenceEnd = result.indexOf('。');
      expect(firstSentenceEnd).toBeGreaterThan(0);
      expect(firstSentenceEnd).toBeLessThan(result.length - 1);
    });

    it('应该处理光标在结尾的情况', () => {
      const cursorPosition = sampleContent.length;
      const result = ContextExtractor.extractAfter(sampleContent, cursorPosition, 100);

      expect(result).toBe('...');
    });

    it('应该处理光标在开头的情况', () => {
      const result = ContextExtractor.extractAfter(sampleContent, 0, 100);

      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('extractCursorContext', () => {
    it('应该提取光标周围的上下文', () => {
      const cursorPosition = sampleContent.indexOf('光标在这里');
      const result = ContextExtractor.extractCursorContext(sampleContent, cursorPosition, 20);

      expect(result).toContain('光标在这里');
      expect(result.length).toBeGreaterThan(20);
    });

    it('应该在开头添加省略号', () => {
      const cursorPosition = sampleContent.indexOf('光标在这里');
      const result = ContextExtractor.extractCursorContext(sampleContent, cursorPosition, 10);

      expect(result.startsWith('...')).toBe(true);
    });

    it('应该在结尾添加省略号', () => {
      const cursorPosition = sampleContent.indexOf('光标在这里');
      const result = ContextExtractor.extractCursorContext(sampleContent, cursorPosition, 100);

      expect(result.endsWith('...')).toBe(true);
    });
  });
});

describe('ContinuationPromptBuilder', () => {
  describe('buildPrompt', () => {
    it('应该构建完整的系统指令', () => {
      const { systemInstruction } = ContinuationPromptBuilder.buildPrompt({
        chapterSummary: '测试章节摘要',
        plotBeat: '测试情节',
        povCharacter: '主角',
        characterStates: [
          { name: '主角', status: '状态良好' }
        ],
        contextBefore: '前文内容...',
        cursorContext: '...光标上下文...',
        options: {
          targetWordCount: 400,
          style: 'consistent'
        }
      });

      expect(systemInstruction).toContain('小说续写助手');
      expect(systemInstruction).toContain('风格一致性');
      expect(systemInstruction).toContain('情节推进');
    });

    it('应该构建包含所有上下文的用户Prompt', () => {
      const { userPrompt } = ContinuationPromptBuilder.buildPrompt({
        chapterSummary: '测试章节摘要',
        plotBeat: '测试情节',
        povCharacter: '主角',
        characterStates: [
          { name: '主角', status: '状态良好' },
          { name: '配角', status: '状态不佳' }
        ],
        contextBefore: '前文内容...',
        cursorContext: '...光标上下文...',
        options: {
          targetWordCount: 400,
          style: 'consistent'
        }
      });

      expect(userPrompt).toContain('【章节上下文】');
      expect(userPrompt).toContain('【人物状态】');
      expect(userPrompt).toContain('【前文】');
      expect(userPrompt).toContain('【续写起点】');
      expect(userPrompt).toContain('【续写要求】');
      expect(userPrompt).toContain('测试章节摘要');
      expect(userPrompt).toContain('主角');
      expect(userPrompt).toContain('前文内容...');
    });

    it('应该根据选项调整续写要求', () => {
      const advancePlotPrompt = ContinuationPromptBuilder.buildPrompt({
        chapterSummary: '测试摘要',
        characterStates: [],
        contextBefore: '前文',
        cursorContext: '上下文',
        options: {
          targetWordCount: 500,
          style: 'consistent',
          advancePlot: true
        }
      });

      expect(advancePlotPrompt.userPrompt).toContain('推进情节发展');

      const noAdvancePlotPrompt = ContinuationPromptBuilder.buildPrompt({
        chapterSummary: '测试摘要',
        characterStates: [],
        contextBefore: '前文',
        cursorContext: '上下文',
        options: {
          targetWordCount: 300,
          style: 'consistent',
          advancePlot: false
        }
      });

      expect(noAdvancePlotPrompt.userPrompt).toContain('深化当前场景');
    });

    it('应该处理可选参数缺失', () => {
      const { systemInstruction, userPrompt } = ContinuationPromptBuilder.buildPrompt({
        chapterSummary: '',
        characterStates: [],
        contextBefore: '前文',
        cursorContext: '上下文',
        options: {}
      });

      expect(systemInstruction).toBeDefined();
      expect(userPrompt).toBeDefined();
      expect(userPrompt).toContain('【前文】');
    });
  });
});

describe('ContentValidator', () => {
  describe('validate', () => {
    it('应该验证正常长度的内容', () => {
      const result = ContentValidator.validate('A'.repeat(400), {
        targetLength: 400,
        originalContent: 'B'.repeat(100)
      });

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('应该检测过短的内容', () => {
      const result = ContentValidator.validate('A'.repeat(50), {
        targetLength: 400,
        originalContent: 'B'.repeat(100)
      });

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('过短'))).toBe(true);
    });

    it('应该检测过长的内容', () => {
      const result = ContentValidator.validate('A'.repeat(1000), {
        targetLength: 400,
        originalContent: 'B'.repeat(100)
      });

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('过长'))).toBe(true);
    });

    it('应该检测Markdown格式标记', () => {
      const result = ContentValidator.validate('```content```', {
        targetLength: 400,
        originalContent: 'B'.repeat(100)
      });

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('Markdown'))).toBe(true);
    });

    it('应该检测AI生成标记', () => {
      const result = ContentValidator.validate('**以下是续写内容**', {
        targetLength: 400,
        originalContent: 'B'.repeat(100)
      });

      expect(result.valid).toBe(false);
      expect(result.issues.some(i => i.includes('Markdown'))).toBe(true);
    });
  });

  describe('clean', () => {
    it('应该移除Markdown代码块', () => {
      const result = ContentValidator.clean('```text\n内容\n```');

      expect(result).not.toContain('```');
      expect(result).toContain('内容');
    });

    it('应该移除AI生成标记', () => {
      const result = ContentValidator.clean('**以下是续写内容**\n实际内容');

      expect(result).not.toContain('**');
      expect(result).not.toContain('以下是');
      expect(result).toContain('实际内容');
    });

    it('应该移除换行符和空白', () => {
      const result = ContentValidator.clean('  \n  内容  \n  ');

      expect(result).toBe('内容');
    });

    it('应该处理复杂的混合标记', () => {
      const input = '```text\n**以下是续写内容**\n实际内容\n```';
      const result = ContentValidator.clean(input);

      expect(result).not.toContain('```');
      expect(result).not.toContain('**');
      expect(result).toContain('实际内容');
    });
  });
});
