/**
 * 导入功能增强测试
 * 测试版本迁移、验证和错误反馈
 */

import request from 'supertest';
import app from '../testApp';
import { prisma } from '../../index';

describe('Import Enhancements', () => {
  const testProjectId = 'test-import-project';

  beforeAll(async () => {
    // 创建测试项目
    await prisma.project.upsert({
      where: { id: testProjectId },
      update: {},
      create: {
        id: testProjectId,
        title: 'Import Test Project',
      },
    });
  });

  afterAll(async () => {
    // 清理测试数据
    await prisma.project.delete({
      where: { id: testProjectId },
    }).catch(() => {});
  });

  describe('版本迁移', () => {
    it('应该接受 v1.0 版本并迁移到 v1.0.0', async () => {
      const importData = {
        version: '1.0',
        exportedAt: '2026-03-31T10:00:00Z',
        templates: [
          {
            templateId: 'scene_generation',
            systemInstruction: 'Test system instruction',
          },
        ],
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import`)
        .send(importData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.migratedFromVersion).toBe('1.0');
      expect(response.body.warnings).toContain('配置已从版本 1.0 迁移到 1.0.0');
      expect(response.body.stats.imported).toBe(1);
    });

    it('应该接受 v1.0.0 版本（无需迁移）', async () => {
      const importData = {
        version: '1.0.0',
        exportedAt: '2026-03-31T10:00:00Z',
        templates: [
          {
            templateId: 'scene_generation',
            systemInstruction: 'Direct v1.0.0 import',
          },
        ],
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import`)
        .send(importData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.migratedFromVersion).toBeUndefined();
    });

    it('应该拒绝不支持的版本', async () => {
      const importData = {
        version: '2.0',
        templates: [],
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import`)
        .send(importData)
        .expect(400);

      expect(response.body.error).toBe('Invalid format');
      expect(response.body.message).toContain('不支持的版本号');
    });
  });

  describe('数据格式验证', () => {
    it('应该拒绝空数据', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import`)
        .send(null)
        .expect(400);

      expect(response.body.error).toBe('Invalid format');
      expect(response.body.message).toBe('导入数据为空');
    });

    it('应该拒绝缺少 version 字段的数据', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import`)
        .send({ templates: [] })
        .expect(400);

      expect(response.body.error).toBe('Invalid format');
      expect(response.body.message).toBe('缺少 version 字段');
    });

    it('应该拒绝缺少 templates 字段的数据', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import`)
        .send({ version: '1.0' })
        .expect(400);

      expect(response.body.error).toBe('Invalid format');
      expect(response.body.message).toBe('缺少 templates 字段');
    });

    it('应该拒绝 templates 不是数组的数据', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import`)
        .send({ version: '1.0', templates: {} })
        .expect(400);

      expect(response.body.error).toBe('Invalid format');
      expect(response.body.message).toBe('templates 字段必须为数组');
    });
  });

  describe('模板ID验证', () => {
    it('应该拒绝无效的模板ID', async () => {
      const importData = {
        version: '1.0',
        templates: [
          {
            templateId: 'invalid_template_id',
            systemInstruction: 'Test',
          },
        ],
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import`)
        .send(importData)
        .expect(400);

      expect(response.body.error).toBe('No valid templates');
      expect(response.body.details[0].valid).toBe(false);
      expect(response.body.details[0].error).toContain('不存在');
    });

    it('应该拒绝缺少 templateId 的配置', async () => {
      const importData = {
        version: '1.0',
        templates: [
          {
            systemInstruction: 'Missing templateId',
          },
        ],
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import`)
        .send(importData)
        .expect(400);

      expect(response.body.error).toBe('No valid templates');
      expect(response.body.details[0].error).toBe('缺少 templateId 字段');
    });
  });

  describe('错误反馈', () => {
    it('应该返回详细的导入统计', async () => {
      const importData = {
        version: '1.0',
        templates: [
          {
            templateId: 'scene_generation',
            systemInstruction: 'Valid template',
          },
          {
            templateId: 'invalid_template',
            systemInstruction: 'Invalid template',
          },
          {
            templateId: 'chapter_outline',
            systemInstruction: 'Another valid template',
          },
        ],
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import`)
        .send(importData)
        .expect(200);

      expect(response.body.stats).toEqual({
        total: 3,
        imported: 2,
        skipped: 1,
        errors: 1,
        warnings: 0,
      });

      expect(response.body.details).toHaveLength(3);
    });

    it('应该包含跳过原因', async () => {
      const importData = {
        version: '1.0',
        templates: [
          {
            templateId: 'invalid_template',
            systemInstruction: 'Should be skipped',
          },
        ],
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import`)
        .send(importData)
        .expect(400);

      expect(response.body.details[0].skipped).toBe(true);
      expect(response.body.details[0].skipReason).toContain('不存在');
    });

    it('应该收集并返回警告信息', async () => {
      const importData = {
        version: '1.0',
        exportedAt: 12345, // 错误类型
        templates: [
          {
            templateId: 'scene_generation',
            systemInstruction: 'Valid',
          },
        ],
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import`)
        .send(importData)
        .expect(200);

      expect(response.body.warnings).toContain('exportedAt 字段应为字符串格式');
    });
  });

  describe('合并模式', () => {
    beforeEach(async () => {
      // 重置项目模板配置
      await prisma.project.update({
        where: { id: testProjectId },
        data: { customTemplates: null },
      });
    });

    it('应该在 merge 模式下合并配置', async () => {
      // 第一次导入
      await request(app)
        .post(`/api/projects/${testProjectId}/templates/import?mode=merge`)
        .send({
          version: '1.0',
          templates: [
            {
              templateId: 'scene_generation',
              systemInstruction: 'First import',
            },
          ],
        })
        .expect(200);

      // 第二次导入（合并）
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import?mode=merge`)
        .send({
          version: '1.0',
          templates: [
            {
              templateId: 'chapter_outline',
              systemInstruction: 'Second import',
            },
          ],
        })
        .expect(200);

      expect(response.body.mode).toBe('merge');
      expect(response.body.stats.imported).toBe(1);

      // 验证两个模板都存在
      const listResponse = await request(app)
        .get(`/api/projects/${testProjectId}/templates`)
        .expect(200);

      const withOverrides = listResponse.body.templates.filter((t: any) => t.hasOverride);
      expect(withOverrides.length).toBe(2);
    });

    it('应该在 overwrite 模式下覆盖配置', async () => {
      // 第一次导入
      await request(app)
        .post(`/api/projects/${testProjectId}/templates/import`)
        .send({
          version: '1.0',
          templates: [
            {
              templateId: 'scene_generation',
              systemInstruction: 'First import',
            },
            {
              templateId: 'chapter_outline',
              systemInstruction: 'First import',
            },
          ],
        })
        .expect(200);

      // 第二次导入（覆盖）
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import?mode=overwrite`)
        .send({
          version: '1.0',
          templates: [
            {
              templateId: 'scene_generation',
              systemInstruction: 'Overwrite import',
            },
          ],
        })
        .expect(200);

      expect(response.body.mode).toBe('overwrite');
      expect(response.body.stats.imported).toBe(1);

      // 验证只有一个模板存在
      const listResponse = await request(app)
        .get(`/api/projects/${testProjectId}/templates`)
        .expect(200);

      const withOverrides = listResponse.body.templates.filter((t: any) => t.hasOverride);
      expect(withOverrides.length).toBe(1);
      expect(withOverrides[0].id).toBe('scene_generation');
    });
  });
});
