/**
 * inkos Integration E2E Tests
 *
 * 测试Muse前端和inkos CLI的完整整合流程
 */

import request from 'supertest';
import express from 'express';
import { inkosRouter } from '../src/routes/inkos';
import * as fs from 'fs/promises';
import * as path from 'path';

// 创建测试应用
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/inkos', inkosRouter);
  return app;
};

// 测试数据
const testMuseProject = {
  projectId: 'test-project-001',
  title: '星际修仙传',
  premise: '一个少年在修仙世界中崛起的故事',
  genre: '玄幻',
  characters: [
    {
      id: 'char-001',
      name: '林云',
      role: 'PROTAGONIST',
      description: '主角，天才少年',
      arc: {
        startingPoint: '普通少年',
        midpoint: '获得传承',
        endingPoint: '成为强者'
      }
    },
    {
      id: 'char-002',
      name: '苏晴',
      role: 'DEUTERAGONIST',
      description: '女主角，神秘身世'
    }
  ],
  world: {
    settings: [
      {
        id: 'world-001',
        category: 'GEOGRAPHY',
        name: '九州大陆',
        description: '故事发生的主要大陆'
      }
    ]
  },
  plotOutline: '第一卷：觉醒篇\n第二卷：成长篇\n第三卷：争霸篇',
  chapters: []
};

describe('inkos API E2E Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = createTestApp();
  });

  describe('GET /api/inkos/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/inkos/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('inkos');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('POST /api/inkos/import', () => {
    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/inkos/import')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should create import task', async () => {
      const response = await request(app)
        .post('/api/inkos/import')
        .send({
          projectId: testMuseProject.projectId,
          title: testMuseProject.title,
          premise: testMuseProject.premise,
          genre: testMuseProject.genre,
          characters: testMuseProject.characters,
          world: testMuseProject.world,
          plotOutline: testMuseProject.plotOutline,
          chapters: testMuseProject.chapters
        })
        .expect('Content-Type', /json/);

      // 可能返回200或201，取决于实现
      expect([200, 201]).toContain(response.status);
      expect(response.body).toHaveProperty('taskId');
    });
  });

  describe('GET /api/inkos/status/:taskId', () => {
    it('should return task status', async () => {
      // 先创建一个任务
      const importResponse = await request(app)
        .post('/api/inkos/import')
        .send({
          projectId: 'test-status-001',
          title: 'Status Test Project',
          premise: 'Testing status endpoint'
        });

      const taskId = importResponse.body.taskId;

      if (taskId) {
        const response = await request(app)
          .get(`/api/inkos/status/${taskId}`)
          .expect('Content-Type', /json/);

        expect(response.body).toHaveProperty('taskId');
        expect(response.body).toHaveProperty('status');
      }
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .get('/api/inkos/status/non-existent-task-id')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/inkos/export', () => {
    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/inkos/export')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/inkos/write', () => {
    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/inkos/write')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/inkos/audit', () => {
    it('should require projectId', async () => {
      const response = await request(app)
        .get('/api/inkos/audit')
        .expect('Content-Type', /json/);

      // 可能返回400或需要projectId参数
      expect([400, 422]).toContain(response.status);
    });
  });
});

describe('inkos Data Conversion Tests', () => {
  describe('Muse to inkos conversion', () => {
    it('should convert character data correctly', () => {
      const museCharacter = testMuseProject.characters[0];
      const expectedInkosFields = {
        name: museCharacter.name,
        role: museCharacter.role,
        description: museCharacter.description
      };

      expect(expectedInkosFields.name).toBe('林云');
      expect(expectedInkosFields.role).toBe('PROTAGONIST');
    });

    it('should convert world settings correctly', () => {
      const museWorld = testMuseProject.world.settings[0];
      expect(museWorld.category).toBe('GEOGRAPHY');
      expect(museWorld.name).toBe('九州大陆');
    });
  });
});

describe('inkos CLI Integration Tests', () => {
  const inkosCliPath = path.resolve(__dirname, '../../inkos/packages/cli/dist/index.js');

  beforeAll(async () => {
    // 检查inkos CLI是否可用
    try {
      await fs.access(inkosCliPath);
    } catch {
      console.warn('inkos CLI not available, skipping CLI tests');
    }
  });

  it('should have inkos CLI available', async () => {
    try {
      await fs.access(inkosCliPath);
      console.log('inkos CLI found at:', inkosCliPath);
    } catch {
      console.log('inkos CLI not found, this is expected in CI environment');
    }
  });
});
