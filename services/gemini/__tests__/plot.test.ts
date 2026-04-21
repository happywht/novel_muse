/**
 * Unit tests for plot.ts
 * 测试plot.ts中的函数，特别是beat ID生成
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies
vi.mock('../core', () => ({
  getAIClient: vi.fn(),
  executeModelTask: vi.fn(),
  getInstructionWithSettings: vi.fn((key) => `instruction_${key}`),
  getModelName: vi.fn((model) => `model_${model}`)
}));

vi.mock('../../schemas', () => {
  const mockSafeParseAiJson = vi.fn((json, schema, operation) => {
    if (operation === 'Chapter Fission') {
      return [
        {
          title: '测试章节1',
          summary: '这是第一章的摘要',
          expectedPOV: '张三',
          beats: [
            { type: 'CONTENT', description: '开篇描写' },
            { type: 'ACTION', description: '主角行动' },
            { type: 'DIALOGUE', description: '关键对话' }
          ]
        },
        {
          title: '测试章节2',
          summary: '这是第二章的摘要',
          expectedPOV: '李四',
          beats: [
            { type: 'TWIST', description: '情节转折' },
            { type: 'ACTION', description: '新的行动' }
          ]
        }
      ];
    }
    if (operation === 'Chapter Regeneration') {
      return [
        {
          title: '重写的章节',
          summary: '这是重写后的摘要',
          expectedPOV: '王五',
          beats: [
            { type: 'CONTENT', description: '重写的内容' },
            { type: 'DIALOGUE', description: '重写的对话' }
          ]
        }
      ];
    }
    return [];
  });

  return {
    safeParseAiJson: mockSafeParseAiJson,
    AiPlotNodeArraySchema: {},
    AiPlotRhythmArraySchema: {},
    AiChapterOutlineArraySchema: {}
  };
});

vi.mock('./helpers', () => ({
  formatContext: vi.fn(() => 'Mock context'),
  filterRelevantSettings: vi.fn((settings) => settings.slice(0, 3)),
  formatEntityLookupTable: vi.fn(() => 'Mock lookup table')
}));

import {
  splitPlotNodeIntoChapters,
  regenerateChapterOutline
} from '../plot';

describe('Plot Service - Beat ID Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('splitPlotNodeIntoChapters', () => {
    it('should generate unique UUID for each beat', async () => {
      // Arrange
      const mockGenre = '玄幻';
      const mockSummary = '测试剧情概览';
      const mockTargetNode = {
        id: 'node-1',
        title: '测试节点',
        content: '测试内容',
        order: 1
      };
      const mockCharacters: any[] = [];
      const mockWorldSettings: any[] = [];

      // Act
      const result = await splitPlotNodeIntoChapters(
        mockGenre,
        mockSummary,
        mockTargetNode,
        mockCharacters,
        mockWorldSettings
      );

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(result[0].beats).toHaveLength(3);
      expect(result[1].beats).toHaveLength(2);

      // 验证每个beat都有id字段
      const allBeats = [
        ...result[0].beats!,
        ...result[1].beats!
      ];

      allBeats.forEach(beat => {
        expect(beat.id).toBeDefined();
        expect(typeof beat.id).toBe('string');
        // 验证UUID格式 (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
        expect(beat.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      });

      // 验证ID唯一性
      const beatIds = allBeats.map(b => b.id);
      const uniqueIds = new Set(beatIds);
      expect(uniqueIds.size).toBe(beatIds.length);
    });

    it('should set isCompleted to false for all beats', async () => {
      // Arrange
      const mockGenre = '玄幻';
      const mockSummary = '测试剧情概览';
      const mockTargetNode = {
        id: 'node-1',
        title: '测试节点',
        content: '测试内容',
        order: 1
      };
      const mockCharacters: any[] = [];
      const mockWorldSettings: any[] = [];

      // Act
      const result = await splitPlotNodeIntoChapters(
        mockGenre,
        mockSummary,
        mockTargetNode,
        mockCharacters,
        mockWorldSettings
      );

      // Assert
      const allBeats = [
        ...result[0].beats!,
        ...result[1].beats!
      ];

      allBeats.forEach(beat => {
        expect(beat.isCompleted).toBeDefined();
        expect(beat.isCompleted).toBe(false);
      });
    });

    it('should preserve original beat properties', async () => {
      // Arrange
      const mockGenre = '玄幻';
      const mockSummary = '测试剧情概览';
      const mockTargetNode = {
        id: 'node-1',
        title: '测试节点',
        content: '测试内容',
        order: 1
      };
      const mockCharacters: any[] = [];
      const mockWorldSettings: any[] = [];

      // Act
      const result = await splitPlotNodeIntoChapters(
        mockGenre,
        mockSummary,
        mockTargetNode,
        mockCharacters,
        mockWorldSettings
      );

      // Assert
      expect(result[0].beats![0]).toMatchObject({
        type: 'CONTENT',
        description: '开篇描写'
      });
      expect(result[0].beats![1]).toMatchObject({
        type: 'ACTION',
        description: '主角行动'
      });
    });

    it('should handle empty beats array', async () => {
      // Arrange - Mock返回空beats
      const { safeParseAiJson } = await import('../../schemas');
      vi.mocked(safeParseAiJson).mockReturnValueOnce([
        {
          title: '空章节',
          summary: '没有beats的章节',
          expectedPOV: '测试',
          beats: []
        }
      ]);

      const mockGenre = '玄幻';
      const mockSummary = '测试剧情概览';
      const mockTargetNode = {
        id: 'node-1',
        title: '测试节点',
        content: '测试内容',
        order: 1
      };
      const mockCharacters: any[] = [];
      const mockWorldSettings: any[] = [];

      // Act
      const result = await splitPlotNodeIntoChapters(
        mockGenre,
        mockSummary,
        mockTargetNode,
        mockCharacters,
        mockWorldSettings
      );

      // Assert
      expect(result[0].beats).toBeDefined();
      expect(result[0].beats).toHaveLength(0);
    });
  });

  describe('regenerateChapterOutline', () => {
    it('should generate unique UUID for regenerated chapter beats', async () => {
      // Arrange
      const mockGenre = '玄幻';
      const mockSummary = '测试剧情概览';
      const mockTargetNode = {
        id: 'node-1',
        title: '测试节点',
        content: '测试内容',
        order: 1
      };
      const mockChapterToRewrite: any = {
        id: 'chapter-1',
        title: '原章节',
        summary: '原摘要',
        expectedPOV: '原视角'
      };
      const mockCharacters: any[] = [];
      const mockWorldSettings: any[] = [];

      // Act
      const result = await regenerateChapterOutline(
        mockGenre,
        mockSummary,
        mockTargetNode,
        mockChapterToRewrite,
        null,
        null,
        mockCharacters,
        mockWorldSettings
      );

      // Assert
      expect(result).toBeDefined();
      expect(result!.beats).toHaveLength(2);

      result!.beats!.forEach(beat => {
        expect(beat.id).toBeDefined();
        expect(typeof beat.id).toBe('string');
        // 验证UUID格式
        expect(beat.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        expect(beat.isCompleted).toBe(false);
      });

      // 验证ID唯一性
      const beatIds = result!.beats!.map(b => b.id);
      const uniqueIds = new Set(beatIds);
      expect(uniqueIds.size).toBe(beatIds.length);
    });

    it('should return null when regeneration fails', async () => {
      // Arrange - Mock返回空数组（失败情况）
      const { safeParseAiJson } = await import('../../schemas');
      vi.mocked(safeParseAiJson).mockReturnValueOnce([]);

      const mockGenre = '玄幻';
      const mockSummary = '测试剧情概览';
      const mockTargetNode = {
        id: 'node-1',
        title: '测试节点',
        content: '测试内容',
        order: 1
      };
      const mockChapterToRewrite: any = {
        id: 'chapter-1',
        title: '原章节',
        summary: '原摘要',
        expectedPOV: '原视角'
      };
      const mockCharacters: any[] = [];
      const mockWorldSettings: any[] = [];

      // Act
      const result = await regenerateChapterOutline(
        mockGenre,
        mockSummary,
        mockTargetNode,
        mockChapterToRewrite,
        null,
        null,
        mockCharacters,
        mockWorldSettings
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('UUID Format Validation', () => {
    it('should generate valid UUIDs that can be used as React keys', async () => {
      // Arrange
      const mockGenre = '玄幻';
      const mockSummary = '测试剧情概览';
      const mockTargetNode = {
        id: 'node-1',
        title: '测试节点',
        content: '测试内容',
        order: 1
      };
      const mockCharacters: any[] = [];
      const mockWorldSettings: any[] = [];

      // Act
      const result = await splitPlotNodeIntoChapters(
        mockGenre,
        mockSummary,
        mockTargetNode,
        mockCharacters,
        mockWorldSettings
      );

      // Assert - 验证ID适合作为React key
      const allBeats = [
        ...result[0].beats!,
        ...result[1].beats!
      ];

      allBeats.forEach(beat => {
        // React key要求：字符串且不为undefined
        expect(beat.id).toBeTruthy();
        expect(typeof beat.id).toBe('string');
        // 不包含React的非法key字符
        expect(beat.id).not.toContain('=');
        expect(beat.id).not.toContain(':');
      });
    });
  });
});
