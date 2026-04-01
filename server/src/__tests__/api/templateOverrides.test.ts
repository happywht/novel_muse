/**
 * 模板覆盖 API 测试
 */

import request from 'supertest';
import express from 'express';
import { prisma } from '../../index';
import { templateOverridesRouter } from '../../routes/templateOverrides';

import { DEFAULT_TEMPLATES } from '../../../config/templates/defaults';

const app = express();
app.use(express.json());
app.use('/api/projects', templateOverridesRouter);

describe('Template Overrides API', () => {
  const testProjectId = 'test-project-overrides';
  const testTemplateId = 'scene_generation';

  beforeAll(async () => {
    // 创建测试项目
    await prisma.project.upsert({
      where: { id: testProjectId },
      update: {},
      create: {
        id: testProjectId,
        title: 'Template Override Test',
        genre: '玄幻',
      },
    });

    // 创建初始模板覆盖
    await prisma.project.update({
      where: { id: testProjectId },
      data: {
        customTemplates: JSON.stringify({
          version: '1.0.0',
          lastModified: new Date().toISOString(),
          templates: {
            [testTemplateId]: {
              templateId: testTemplateId,
              systemInstruction: 'Custom system instruction',
              variableDefaults: {
                targetWordCount: 5000,
              },
            },
          },
        }),
      },
    });
  });

  afterAll(async () => {
    // 删除测试项目
    await prisma.project.delete({
      where: { id: testProjectId },
    }).catch(() => {});
  });

  describe('GET /api/projects/:id/templates', () => {
    it('should return all templates with override status', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/templates`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('projectId');
      expect(response.body.templates).toBeDefined();
      expect(Array.isArray(response.body.templates)).toBe(true);

      const sceneTemplate = response.body.templates.find(
        (t: any) => t.id === testTemplateId
      );
      expect(sceneTemplate).toBeDefined();
      expect(sceneTemplate.hasOverride).toBe(true);
    });
  });

  describe('GET /api/projects/:id/templates/:templateId', () => {
    it('should return merged template with sources', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/templates/${testTemplateId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('template');
      expect(response.body).toHaveProperty('override');
      expect(response.body).toHaveProperty('sources');
      expect(response.body.template.systemTemplate).toBeDefined();
      expect(response.body.template.variables).toBeDefined();
      expect(Array.isArray(response.body.template.sections)).toBe(true);
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/templates/non-existent-template`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/projects/:id/templates/:templateId', () => {
    it('should update override and return merged result', async () => {
      const updateData = {
        systemInstruction: 'Updated system instruction',
        variableDefaults: {
          targetWordCount: 6000,
        },
      };

      const response = await request(app)
        .patch(`/api/projects/${testProjectId}/templates/${testTemplateId}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.override).toBeDefined();
      expect(response.body.override.systemInstruction).toBe('Updated system instruction');
      expect(response.body.override.variableDefaults.targetWordCount).toBe(6000);
      expect(response.body.merged).toBeDefined();
      expect(response.body.sources).toBeDefined();
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .patch(`/api/projects/${testProjectId}/templates/non-existent-template`)
        .send({ systemInstruction: 'Test' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/projects/:id/templates/:templateId', () => {
    it('should delete override and return default template', async () => {
      // 先创建一个覆盖
      await request(app)
        .patch(`/api/projects/${testProjectId}/templates/chapter_outline`)
        .send({ systemInstruction: 'Test override' });

      const response = await request(app)
        .delete(`/api/projects/${testProjectId}/templates/chapter_outline`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.default).toBeDefined();
      expect(response.body.default.id).toBe('chapter_outline');
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .delete(`/api/projects/${testProjectId}/templates/non-existent-template`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/projects/:id/templates/export', () => {
    it('should export template overrides', async () => {
      const response = await request(app)
        .get(`/api/projects/${testProjectId}/templates/export`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('exportedAt');
      expect(response.body).toHaveProperty('templates');
      expect(Array.isArray(response.body.templates)).toBe(true);
      expect(response.body.metadata).toBeDefined();
      expect(response.body.metadata.projectId).toBe(testProjectId);
    });
  });

  describe('POST /api/projects/:id/templates/import', () => {
    it('should import template overrides in merge mode', async () => {
      const importData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        templates: [
          {
            templateId: 'character_card',
            systemInstruction: 'Imported character card instruction',
          },
        ],
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import?mode=merge`)
        .send(importData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.stats.imported).toBe(1);
      expect(response.body.migratedFromVersion).toBe('1.0');
    });

    it('should reject invalid format', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import`)
        .send({ version: '1.0' }); // Missing templates

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid format');
    });

    it('should reject unsupported version', async () => {
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import`)
        .send({ version: '2.0', templates: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid format');
      expect(response.body.message).toContain('不支持的版本号');
    });

    it('should return detailed validation errors', async () => {
      const importData = {
        version: '1.0',
        templates: [
          {
            templateId: 'invalid_template',
            systemInstruction: 'Invalid template',
          },
        ],
      };

      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import`)
        .send(importData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No valid templates');
      expect(response.body.details).toBeDefined();
      expect(response.body.details[0].valid).toBe(false);
      expect(response.body.details[0].error).toContain('不存在');
    });

    it('should import in overwrite mode', async () => {
      // 先创建一些覆盖
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
              systemInstruction: 'Second import',
            },
          ],
        });

      // 然后用 overwrite 模式导入
      const response = await request(app)
        .post(`/api/projects/${testProjectId}/templates/import?mode=overwrite`)
        .send({
          version: '1.0',
          templates: [
            {
              templateId: 'character_card',
              systemInstruction: 'Overwrite import',
            },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.mode).toBe('overwrite');
      expect(response.body.stats.imported).toBe(1);
    });
  });
});
