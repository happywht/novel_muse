/**
 * TemplateRegistry 持久化功能测试
 */

import { templateRegistry, getMergedTemplate, invalidateCache, clearAllTemplateCache } from '../templateRegistry';
import { TemplateOverride } from '../../types/templateOverride';

describe('TemplateRegistry Persistence', () => {
  beforeEach(() => {
    // 清除所有缓存
    clearAllTemplateCache();
  });

  describe('缓存机制', () => {
    it('应该正确生成缓存键', () => {
      const key1 = (templateRegistry as any).getCacheKey('scene_generation', 'project-123');
      expect(key1).toBe('scene_generation:project-123');

      const key2 = (templateRegistry as any).getCacheKey('scene_generation');
      expect(key2).toBe('scene_generation:default');
    });

    it('应该正确清除单个模板的缓存', () => {
      const templateId = 'scene_generation';
      const projectId = 'project-123';

      // 清除特定缓存
      invalidateCache(templateId, projectId);

      // 验证缓存已被清除
      const stats = (templateRegistry as any).getCacheStats();
      expect(stats.templateCacheSize).toBe(0);
    });

    it('应该正确清除项目的所有缓存', () => {
      const projectId = 'project-123';

      // 清除项目缓存
      (templateRegistry as any).invalidateProjectCache(projectId);

      // 验证缓存已被清除
      const stats = (templateRegistry as any).getCacheStats();
      expect(stats.projectOverridesCacheSize).toBe(0);
    });
  });

  describe('异步加载', () => {
    it('应该加载默认模板(无覆盖)', async () => {
        const result = await getMergedTemplate('scene_generation');

        expect(result).not.toBeNull();
        expect(result?.template).toBeDefined();
        expect(result?.template.id).toBe('scene_generation');
        expect(result?.sources.systemInstruction).toBe('default');
    });

    it('应该从缓存返回模板', async () => {
        const templateId = 'scene_generation';

        // 第一次调用 - 应该从数据库加载
        const result1 = await getMergedTemplate(templateId);
        expect(result1).not.toBeNull();

        // 第二次调用 - 应该从缓存返回
        const result2 = await getMergedTemplate(templateId);
        expect(result2).toBe(result1); // 同一引用

        // 验证缓存统计
        const stats = (templateRegistry as any).getCacheStats();
        expect(stats.templateCacheSize).toBeGreaterThan(0);
    });

    it('应该支持跳过缓存', async () => {
        const templateId = 'scene_generation';

        // 第一次调用 - 加载到缓存
        const result1 = await getMergedTemplate(templateId);

        // 第二次调用 - 跳过缓存
        const result2 = await getMergedTemplate(templateId, { skipCache: true });
        expect(result2).not.toBe(result1); // 不同引用

        // 验证缓存已更新
        const stats = (templateRegistry as any).getCacheStats();
        expect(stats.templateCacheSize).toBeGreaterThan(0);
    });
  });

  describe('缓存失效', () => {
    it('应该在模板更新时清除缓存', async () => {
        const templateId = 'scene_generation';
        const projectId = 'project-123';

        // 加载到缓存
        await getMergedTemplate(templateId, { projectId });

        // 清除缓存
        invalidateCache(templateId, projectId);

        // 验证缓存已被清除
        const stats = (templateRegistry as any).getCacheStats();
        expect(stats.templateCacheSize).toBe(0);
    });
  });

  describe('统计信息', () => {
    it('应该返回正确的统计信息', () => {
        const stats = templateRegistry.getStats();

        expect(stats).toHaveProperty('default');
        expect(stats).toHaveProperty('project');
        expect(stats).toHaveProperty('user');
        expect(stats).toHaveProperty('total');
        expect(stats.default).toBeGreaterThan(0);
    });

    it('应该返回缓存统计信息', () => {
        const stats = (templateRegistry as any).getCacheStats();

        expect(stats).toHaveProperty('templateCacheSize');
        expect(stats).toHaveProperty('projectOverridesCacheSize');
    });
  });
});
