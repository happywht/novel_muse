/**
 * InkosService 后端服务测试
 *
 * 测试任务管理、CLI命令执行、数据转换等
 */

import { InkosService, taskStore } from '../inkosService';
import type {
  ImportRequest,
  ExportRequest,
  WriteChapterRequest,
  AuditRequest,
} from '../../types/inkos';

// ============================================
// Mocks
// ============================================

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
  readFile: jest.fn(),
  readdir: jest.fn(),
  rm: jest.fn(),
  access: jest.fn(),
}));

// Mock path
jest.mock('path', () => ({
  resolve: (...args: any[]) => args.join('/'),
  join: (...args: any[]) => args.join('/'),
  dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
}));

// Mock uuid to return sequential values
jest.mock('uuid', () => ({
  v4: jest.fn()
    .mockReturnValueOnce('test-uuid-001')
    .mockReturnValueOnce('test-uuid-002')
    .mockReturnValueOnce('test-uuid-003')
    .mockReturnValueOnce('test-uuid-004')
    .mockReturnValueOnce('test-uuid-005'),
}));

// Mock SSE middleware
jest.mock('../../middleware/sse', () => ({
  sendTaskProgress: jest.fn(),
  sendWriteChunk: jest.fn(),
  sendAuditDimension: jest.fn(),
}));

// ============================================
// Mock References
// ============================================

const mockSpawn = require('child_process').spawn;
const mockFs = require('fs/promises');

// ============================================
// Fixtures
// ============================================

const createMockImportRequest = (): ImportRequest => ({
  projectId: 'project-001',
  project: {
    id: 'test-project-id',
    title: '测试小说',
    genre: '玄幻',
    wordCountGoal: 300000,
    premise: '一个少年的修行之路',
    theme: '成长',
    synopsis: '主角从平凡走向强大的故事',
  },
  chapters: [
    {
      id: 'ch-001',
      title: '第一章 入门',
      order: 1,
      synopsis: '主角初次登场',
    },
    {
      id: 'ch-002',
      title: '第二章 测试',
      order: 2,
      synopsis: '通过入门测试',
    },
  ],
  characters: [
    {
      id: 'char-001',
      name: '李青云',
      role: 'protagonist',
      description: '天才少年',
      backstory: '出身平凡',
      personality: '坚毅',
      goals: '成为最强者',
      relationships: [],
    },
  ],
  world: {
    setting: '青云宗',
    rules: '灵气体系',
  },
});

const createMockExportRequest = (): ExportRequest => ({
  inkosProjectPath: '/workspace/inkos/project-001',
  targetProjectId: 'target-001',
});

const createMockWriteRequest = (): WriteChapterRequest => ({
  projectId: 'project-001',
  chapterNumber: 5,
  chapterId: 'chapter-005',
  options: {
    model: 'gpt-4',
  },
});

const createMockAuditRequest = (): AuditRequest => ({
  projectId: 'project-001',
  chapterId: 'chapter-005',
});

const createMockChildProcess = (
  options: {
    stdout?: string[];
    stderr?: string[];
    exitCode?: number;
    error?: Error;
  } = {}
) => {
  const { stdout = [], stderr = [], exitCode = 0, error } = options;

  const listeners: Map<string, Function[]> = new Map();

  return {
    stdout: {
      on: (event: string, callback: Function) => {
        if (event === 'data') {
          listeners.set('stdout', [...(listeners.get('stdout') || []), callback]);
          stdout.forEach((data) => callback(Buffer.from(data)));
        }
      },
    },
    stderr: {
      on: (event: string, callback: Function) => {
        if (event === 'data') {
          listeners.set('stderr', [...(listeners.get('stderr') || []), callback]);
          stderr.forEach((data) => callback(Buffer.from(data)));
        }
      },
    },
    on: (event: string, callback: Function) => {
      listeners.set(event, [...(listeners.get(event) || []), callback]);
      if (event === 'close') {
        setTimeout(() => callback(exitCode), 10);
      }
      if (event === 'error' && error) {
        setTimeout(() => callback(error), 10);
      }
    },
  };
};

// ============================================
// Tests
// ============================================

describe('InkosService', () => {
  let service: InkosService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InkosService();
  });

  // ============================================
  // TaskStore Tests
  // ============================================

  describe('TaskStore', () => {
    it('should create task with correct initial state', () => {
      const task = taskStore.create('import', 'project-001');

      expect(task.taskId).toBeDefined();
      expect(task.type).toBe('import');
      expect(task.status).toBe('pending');
      expect(task.progress).toBe(0);
      expect(task.message).toBe('Task created');
    });

    it('should get task by ID', () => {
      const created = taskStore.create('write', 'project-001');
      const retrieved = taskStore.get(created.taskId);

      expect(retrieved).toEqual(created);
    });

    it('should update task', () => {
      const task = taskStore.create('audit', 'project-001');

      const updated = taskStore.update(task.taskId, {
        status: 'running',
        progress: 50,
        message: 'Processing...',
      });

      expect(updated?.status).toBe('running');
      expect(updated?.progress).toBe(50);
      expect(updated?.message).toBe('Processing...');
      expect(updated?.updatedAt).toBeDefined();
    });

    it('should delete task', () => {
      const task = taskStore.create('export', 'project-001');

      const result = taskStore.delete(task.taskId);

      expect(result).toBe(true);
      expect(taskStore.get(task.taskId)).toBeUndefined();
    });

    it('should return false when deleting non-existent task', () => {
      const result = taskStore.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  // ============================================
  // Import Project Tests
  // ============================================

  describe('importProject', () => {
    it('should import project successfully', async () => {
      const request = createMockImportRequest();

      // Mock fs operations
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Mock spawn for inkos init
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: ['inkos initialized'],
          exitCode: 0,
        })
      );

      const result = await service.importProject(request, 'project-001');

      expect(result.taskId).toBeDefined();
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should track import progress', async () => {
      const request = createMockImportRequest();

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockSpawn.mockReturnValue(createMockChildProcess({ exitCode: 0 }));

      const { taskId } = await service.importProject(request, 'project-001');

      const task = taskStore.get(taskId);
      expect(task?.status).toBe('completed');
      expect(task?.progress).toBe(100);
    });

    it('should handle inkos init failure', async () => {
      const request = createMockImportRequest();

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stderr: ['Error: initialization failed'],
          exitCode: 1,
        })
      );

      await expect(service.importProject(request, 'project-001')).rejects.toThrow(
        'inkos init failed'
      );
    });

    it('should handle file system errors', async () => {
      const request = createMockImportRequest();

      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));

      await expect(service.importProject(request, 'project-001')).rejects.toThrow();
    });

    it('should convert Muse project to inkos format', async () => {
      const request = createMockImportRequest();

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockSpawn.mockReturnValue(createMockChildProcess({ exitCode: 0 }));

      await service.importProject(request, 'project-001');

      // Verify YAML file was written
      const yamlWriteCall = mockFs.writeFile.mock.calls.find((call: any[]) =>
        call[0].includes('project.yaml')
      );
      expect(yamlWriteCall).toBeDefined();
      expect(yamlWriteCall[1]).toContain('title: 测试小说');
    });
  });

  // ============================================
  // Export Project Tests
  // ============================================

  describe('exportProject', () => {
    it('should export project successfully', async () => {
      const request = createMockExportRequest();

      // Mock reading inkos project
      mockFs.readFile.mockImplementation(async (path: string) => {
        if (path.includes('project.yaml')) {
          return 'title: Test Novel\ngenre: xuanhuan\n';
        }
        if (path.includes('outline.md')) {
          return '# Test Novel\n\n## Synopsis\n\nTest synopsis\n';
        }
        if (path.includes('characters.json')) {
          return JSON.stringify([{ name: 'Character 1', role: 'protagonist' }]);
        }
        if (path.includes('world.json')) {
          return JSON.stringify({ geography: 'World' });
        }
        return '';
      });

      const result = await service.exportProject(request, 'project-001');

      expect(result.taskId).toBeDefined();
      const task = taskStore.get(result.taskId);
      expect(task?.status).toBe('completed');
    });

    it('should handle missing project files', async () => {
      const request = createMockExportRequest();

      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      // Should not throw, but return partial result
      const result = await service.exportProject(request, 'project-001');

      expect(result.taskId).toBeDefined();
    });

    it('should convert inkos to Muse format', async () => {
      const request = createMockExportRequest();

      mockFs.readFile.mockImplementation(async (path: string) => {
        if (path.includes('project.yaml')) {
          return 'title: Inkos Novel\ngenre: xuanhuan\nwordCountGoal: 300000\n';
        }
        if (path.includes('outline.md')) {
          return '## Synopsis\n\nTest synopsis\n\n### Chapter 1: Start\n\nFirst chapter\n';
        }
        if (path.includes('characters.json')) {
          return JSON.stringify([{ id: '1', name: 'Hero', role: 'protagonist' }]);
        }
        return '{}';
      });

      const result = await service.exportProject(request, 'project-001');

      const task = taskStore.get(result.taskId);
      expect(task?.result).toBeDefined();
    });
  });

  // ============================================
  // Write Chapter Tests
  // ============================================

  describe('writeChapter', () => {
    it('should write chapter successfully', async () => {
      const request = createMockWriteRequest();

      // Mock getProjectPath
      mockFs.readdir.mockResolvedValue(['task-001']);
      mockFs.readFile.mockResolvedValue('projectId: project-001\n');

      // Mock inkos write command
      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: [
            '[progress:50] Writing chapter...',
            '[progress:100] Chapter complete',
            'Generated chapter content...',
          ],
          exitCode: 0,
        })
      );

      const result = await service.writeChapter(request, 'project-001');

      expect(result.taskId).toBeDefined();
      expect(mockSpawn).toHaveBeenCalledWith(
        'node',
        expect.arrayContaining(['write', 'next']),
        expect.any(Object)
      );
    });

    it('should track write progress', async () => {
      const request = createMockWriteRequest();

      mockFs.readdir.mockResolvedValue(['task-001']);
      mockFs.readFile.mockResolvedValue('projectId: project-001\n');

      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: [
            '[progress:10] Initializing...',
            '[progress:30] Thinking...',
            '[progress:60] Writing...',
            '[progress:100] Complete',
          ],
          exitCode: 0,
        })
      );

      const { taskId } = await service.writeChapter(request, 'project-001');

      const task = taskStore.get(taskId);
      expect(task?.status).toBe('completed');
    });

    it('should handle write errors', async () => {
      const request = createMockWriteRequest();

      mockFs.readdir.mockResolvedValue(['task-001']);
      mockFs.readFile.mockResolvedValue('projectId: project-001\n');

      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stderr: ['Error: API rate limit exceeded'],
          exitCode: 1,
        })
      );

      await expect(service.writeChapter(request, 'project-001')).rejects.toThrow(
        'inkos write failed'
      );
    });

    it('should throw error when project not found', async () => {
      const request = createMockWriteRequest();

      mockFs.readdir.mockResolvedValue([]);

      await expect(service.writeChapter(request, 'project-001')).rejects.toThrow(
        'Project not found in workspace'
      );
    });

    it('should pass model option to CLI', async () => {
      const request = createMockWriteRequest();
      request.options = { model: 'claude-3-opus' };

      mockFs.readdir.mockResolvedValue(['task-001']);
      mockFs.readFile.mockResolvedValue('projectId: project-001\n');
      mockSpawn.mockReturnValue(createMockChildProcess({ exitCode: 0 }));

      await service.writeChapter(request, 'project-001');

      expect(mockSpawn).toHaveBeenCalledWith(
        'node',
        expect.arrayContaining(['--model', 'claude-3-opus']),
        expect.any(Object)
      );
    });
  });

  // ============================================
  // Audit Tests
  // ============================================

  describe('runAudit', () => {
    it('should run audit successfully', async () => {
      const request = createMockAuditRequest();

      mockFs.readdir.mockResolvedValue(['task-001']);
      mockFs.readFile.mockResolvedValue('projectId: project-001\n');

      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: [
            '[progress:10] Starting audit...',
            '[progress:50] Checking continuity...',
            '[progress:100] Audit complete',
            JSON.stringify({
              overallScore: 85,
              dimensions: [
                { name: 'continuity', score: 90, issues: [] },
                { name: 'ai-tells', score: 80, issues: ['Some AI patterns'] },
              ],
              summary: 'Good overall quality',
              recommendations: ['Review AI patterns'],
            }),
          ],
          exitCode: 0,
        })
      );

      const result = await service.runAudit(request, 'project-001');

      expect(result.taskId).toBeDefined();
      const task = taskStore.get(result.taskId);
      expect(task?.status).toBe('completed');
      expect(task?.result).toBeDefined();
    });

    it('should handle audit errors gracefully', async () => {
      const request = createMockAuditRequest();

      mockFs.readdir.mockResolvedValue(['task-001']);
      mockFs.readFile.mockResolvedValue('projectId: project-001\n');

      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: ['Non-JSON output'],
          exitCode: 0,
        })
      );

      const result = await service.runAudit(request, 'project-001');

      const task = taskStore.get(result.taskId);
      expect(task?.status).toBe('completed');
      expect(task?.result).toBeDefined();
    });

    it('should pass chapter ID to CLI', async () => {
      const request = createMockAuditRequest();
      request.chapterId = 'chapter-010';

      mockFs.readdir.mockResolvedValue(['task-001']);
      mockFs.readFile.mockResolvedValue('projectId: project-001\n');
      mockSpawn.mockReturnValue(createMockChildProcess({ exitCode: 0 }));

      await service.runAudit(request, 'project-001');

      expect(mockSpawn).toHaveBeenCalledWith(
        'node',
        expect.arrayContaining(['audit', 'chapter-010']),
        expect.any(Object)
      );
    });
  });

  // ============================================
  // Task Management Tests
  // ============================================

  describe('getTaskStatus', () => {
    it('should return task status', () => {
      const task = taskStore.create('import', 'project-001');

      const status = service.getTaskStatus(task.taskId);

      expect(status).toEqual(task);
    });

    it('should return undefined for non-existent task', () => {
      const status = service.getTaskStatus('nonexistent');

      expect(status).toBeUndefined();
    });
  });

  describe('cancelTask', () => {
    it('should cancel running task', async () => {
      const task = taskStore.create('write', 'project-001');
      taskStore.update(task.taskId, { status: 'running' });

      const result = await service.cancelTask(task.taskId);

      expect(result).toBe(true);
      const updated = taskStore.get(task.taskId);
      expect(updated?.status).toBe('cancelled');
    });

    it('should return false for non-running task', async () => {
      const task = taskStore.create('import', 'project-001');
      // Task is in 'pending' state by default

      const result = await service.cancelTask(task.taskId);

      expect(result).toBe(false);
    });

    it('should return false for non-existent task', async () => {
      const result = await service.cancelTask('nonexistent');

      expect(result).toBe(false);
    });
  });

  // ============================================
  // YAML/Markdown Parsing Tests
  // ============================================

  describe('YAML parsing', () => {
    it('should parse simple YAML', async () => {
      const request = createMockImportRequest();

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockSpawn.mockReturnValue(createMockChildProcess({ exitCode: 0 }));

      await service.importProject(request, 'project-001');

      // Check YAML was written
      const yamlCall = mockFs.writeFile.mock.calls.find((call: any[]) => call[0].includes('project.yaml'));
      expect(yamlCall).toBeDefined();
    });

    it('should handle YAML with nested objects', async () => {
      const request = createMockImportRequest();
      request.project.wordCountGoal = 500000;

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockSpawn.mockReturnValue(createMockChildProcess({ exitCode: 0 }));

      await service.importProject(request, 'project-001');

      const yamlCall = mockFs.writeFile.mock.calls.find((call: any[]) => call[0].includes('project.yaml'));
      expect(yamlCall[1]).toContain('wordCountGoal');
    });
  });

  describe('Markdown outline parsing', () => {
    it('should generate markdown outline', async () => {
      const request = createMockImportRequest();

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockSpawn.mockReturnValue(createMockChildProcess({ exitCode: 0 }));

      await service.importProject(request, 'project-001');

      const mdCall = mockFs.writeFile.mock.calls.find((call: any[]) => call[0].includes('outline.md'));
      expect(mdCall).toBeDefined();
      expect(mdCall[1]).toContain('# 测试小说');
      expect(mdCall[1]).toContain('## Premise');
      expect(mdCall[1]).toContain('### Chapter');
    });

    it('should parse markdown outline', async () => {
      const request = createMockExportRequest();

      mockFs.readFile.mockImplementation(async (path: string) => {
        if (path.includes('outline.md')) {
          return `
# Test Novel

## Premise

Test premise

## Theme

Test theme

### Chapter 1: Start

First chapter content

### Chapter 2: Journey

Second chapter content
`;
        }
        return '';
      });

      const result = await service.exportProject(request, 'project-001');

      const task = taskStore.get(result.taskId);
      expect(task?.result).toBeDefined();
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================

  describe('Error handling', () => {
    it('should handle spawn errors gracefully', async () => {
      const request = createMockImportRequest();

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      mockSpawn.mockReturnValue(
        createMockChildProcess({
          error: new Error('spawn ENOENT'),
        })
      );

      // Service should handle errors gracefully and return a task ID
      const result = await service.importProject(request, 'project-001');
      expect(result.taskId).toBeDefined();
    });

    it('should handle disk errors gracefully', async () => {
      const request = createMockImportRequest();

      mockFs.mkdir.mockRejectedValue(new Error('Disk full'));

      // Service throws when disk operations fail (error is logged and task marked as failed)
      await expect(service.importProject(request, 'project-001')).rejects.toThrow('Disk full');
    });

    it('should handle partial file reads', async () => {
      const request = createMockExportRequest();

      mockFs.readFile.mockImplementation(async (path: string) => {
        if (path.includes('project.yaml')) {
          return 'title: Test';
        }
        throw new Error('File not found');
      });

      // Should not throw, return partial data
      const result = await service.exportProject(request, 'project-001');

      expect(result.taskId).toBeDefined();
    });
  });

  // ============================================
  // Streaming Tests
  // ============================================

  describe('Streaming progress', () => {
    it('should parse progress from stdout', async () => {
      const request = createMockWriteRequest();

      mockFs.readdir.mockResolvedValue(['task-001']);
      mockFs.readFile.mockResolvedValue('projectId: project-001\n');

      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: [
            '[progress:25] Thinking about plot...',
            '[progress:50] Writing content...',
            '[progress:75] Revising...',
            '[progress:100] Done',
          ],
          exitCode: 0,
        })
      );

      const result = await service.writeChapter(request, 'project-001');

      expect(result.taskId).toBeDefined();
    });

    it('should parse chunk markers', async () => {
      const request = createMockWriteRequest();

      mockFs.readdir.mockResolvedValue(['task-001']);
      mockFs.readFile.mockResolvedValue('projectId: project-001\n');

      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: [
            '[chunk]First paragraph of text...[/chunk]',
            '[chunk]Second paragraph...[/chunk]',
            '[progress:100] Complete',
          ],
          exitCode: 0,
        })
      );

      const result = await service.writeChapter(request, 'project-001');
      expect(result.taskId).toBeDefined();
    });

    it('should parse dimension results', async () => {
      const request = createMockAuditRequest();

      mockFs.readdir.mockResolvedValue(['task-001']);
      mockFs.readFile.mockResolvedValue('projectId: project-001\n');

      mockSpawn.mockReturnValue(
        createMockChildProcess({
          stdout: [
            '[dimension:continuity]score:90issues:[]',
            '[dimension:ai-tells]score:75issues:["Some patterns"]',
            '[progress:100] Complete',
          ],
          exitCode: 0,
        })
      );

      const result = await service.runAudit(request, 'project-001');
      expect(result.taskId).toBeDefined();
    });
  });
});
