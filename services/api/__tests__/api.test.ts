/**
 * API 服务层测试
 *
 * 验证转换器、验证器和服务的基本功能
 */

import { describe, it, expect } from 'vitest';
import { projectTransformer } from '../transformers/ProjectTransformer';
import { validateCreateProject, safeValidateCreateProject } from '../validators/ProjectValidator';
import { createSuccessResponse, createErrorResponse, validateApiResponse, ApiError } from '../ApiResponse';
import type { ProjectState } from '@/types';
import type { ProjectDTO } from '@/types/api';

describe('API 服务层测试', () => {
  describe('ProjectTransformer', () => {
    const mockDTO: ProjectDTO = {
      id: 'test-project',
      title: '测试项目',
      genre: '玄幻',
      premise: '这是一个测试项目',
      creativeSettings: {
        tone: '严肃',
        theme: '成长'
      },
      characters: [],
      worldSettings: [],
      plotNodes: [],
      chapters: [],
      drafts: [],
      echoes: [],
      timeline: [],
      createdAt: 1234567890,
      lastModified: 1234567890,
    };

    it('应该正确转换 DTO 为前端模型', () => {
      const state = projectTransformer.transform(mockDTO);
      expect(state.id).toBe(mockDTO.id);
      expect(state.title).toBe(mockDTO.title);
      expect(state.genre).toBe(mockDTO.genre);
      expect(state.creativeSettings).toEqual(mockDTO.creativeSettings);
    });

    it('应该正确转换前端模型为 DTO', () => {
      const state: ProjectState = mockDTO as ProjectState;
      const dto = projectTransformer.transformReverse(state);
      expect(dto.id).toBe(state.id);
      expect(dto.title).toBe(state.title);
      expect(dto.genre).toBe(state.genre);
    });

    it('应该处理缺失的默认值', () => {
      const incompleteDTO = {
        id: 'test',
        title: '',
        genre: '',
        premise: '',
      } as ProjectDTO;

      const state = projectTransformer.transform(incompleteDTO);
      expect(state.title).toBe('未命名项目');
      expect(state.characters).toEqual([]);
      expect(state.worldSettings).toEqual([]);
    });
  });

  describe('ProjectValidator', () => {
    it('应该验证有效的项目数据', () => {
      const validData = {
        title: '新项目',
        genre: '玄幻',
        premise: '这是一个新项目',
      };

      const result = validateCreateProject(validData);
      expect(result.title).toBe(validData.title);
      expect(result.genre).toBe(validData.genre);
    });

    it('应该拒绝无效的项目数据', () => {
      const invalidData = {
        title: '', // 空标题
        genre: 'a'.repeat(200), // 超长类型
      };

      expect(() => validateCreateProject(invalidData)).toThrow();
    });

    it('应该安全验证而不抛出错误', () => {
      const validData = {
        title: '测试项目',
        genre: '玄幻',
      };

      const result = safeValidateCreateProject(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(validData.title);
      }
    });

    it('应该返回验证失败信息', () => {
      const invalidData = {
        title: '',
        genre: '',
      };

      const result = safeValidateCreateProject(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('标题不能为空');
      }
    });
  });

  describe('ApiResponse', () => {
    it('应该创建成功响应', () => {
      const data = { id: 'test', name: '测试' };
      const response = createSuccessResponse(data, '操作成功');

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBe('操作成功');
      expect(response.timestamp).toBeDefined();
    });

    it('应该创建错误响应', () => {
      const response = createErrorResponse('操作失败', 'TEST_ERROR');

      expect(response.success).toBe(false);
      expect(response.error).toContain('TEST_ERROR');
      expect(response.error).toContain('操作失败');
      expect(response.timestamp).toBeDefined();
    });

    it('应该验证有效的 API 响应', () => {
      const validResponse = {
        success: true,
        data: { id: 'test' },
        timestamp: Date.now(),
      };

      const result = validateApiResponse(validResponse);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 'test' });
    });

    it('应该拒绝无效的 API 响应', () => {
      const invalidResponse = {
        success: 'not-a-boolean', // 无效类型
        data: { id: 'test' },
      };

      expect(() => validateApiResponse(invalidResponse)).toThrow();
    });
  });

  describe('ApiError', () => {
    it('应该创建带错误代码的错误', () => {
      const error = new ApiError('测试错误', 'TEST_ERROR', 400);

      expect(error.message).toBe('测试错误');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ApiError');
    });

    it('应该创建不带错误代码的错误', () => {
      const error = new ApiError('简单错误');

      expect(error.message).toBe('简单错误');
      expect(error.code).toBeUndefined();
      expect(error.statusCode).toBeUndefined();
    });
  });
});
