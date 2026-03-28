/**
 * inkos API Routes
 * REST API endpoints for inkos integration
 */

import { Router, Request, Response, NextFunction } from 'express';
import { inkosService, taskStore } from '../services/inkosService';
import { sseHeaders, sseHandler, sseManager } from '../middleware/sse';
import {
  ImportRequestSchema,
  ExportRequestSchema,
  WriteChapterRequestSchema,
  AuditRequestSchema,
  type ImportRequest,
  type ExportRequest,
  type WriteChapterRequest,
  type AuditRequest,
} from '../types/inkos';

export const inkosRouter = Router();

// ============================================
// Health Check
// ============================================

/**
 * GET /api/inkos/health
 * Health check for inkos integration
 */
inkosRouter.get('/health', async (_req: Request, res: Response) => {
  try {
    // Check if inkos CLI is available
    const inkosPath = require('path').resolve(__dirname, '../../../inkos');
    const fs = require('fs').promises;
    let inkosAvailable = false;

    try {
      await fs.access(inkosPath);
      inkosAvailable = true;
    } catch {
      inkosAvailable = false;
    }

    res.json({
      status: 'ok',
      inkos: {
        available: inkosAvailable,
        path: inkosPath,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============================================
// Import/Export Operations
// ============================================

/**
 * POST /api/inkos/import
 * Import Muse project to inkos format
 */
inkosRouter.post(
  '/import',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request
      const parseResult = ImportRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: parseResult.error.issues,
        });
      }

      const request = parseResult.data as ImportRequest;

      // Start import task
      const { taskId } = await inkosService.importProject(request, request.projectId);

      res.status(202).json({
        message: 'Import task started',
        taskId,
        statusUrl: `/api/inkos/status/${taskId}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/inkos/export
 * Export inkos project to Muse format
 */
inkosRouter.post(
  '/export',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request
      const parseResult = ExportRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: parseResult.error.issues,
        });
      }

      const request = parseResult.data as ExportRequest;

      // Start export task
      const projectId = request.targetProjectId || 'default';
      const { taskId } = await inkosService.exportProject(request, projectId);

      res.status(202).json({
        message: 'Export task started',
        taskId,
        statusUrl: `/api/inkos/status/${taskId}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Write Operations
// ============================================

/**
 * POST /api/inkos/write
 * Trigger chapter writing
 */
inkosRouter.post(
  '/write',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request
      const parseResult = WriteChapterRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: parseResult.error.issues,
        });
      }

      const request = parseResult.data as WriteChapterRequest;

      // Start write task
      const { taskId } = await inkosService.writeChapter(request, request.projectId);

      res.status(202).json({
        message: 'Write task started',
        taskId,
        chapterId: request.chapterId,
        chapterNumber: request.chapterNumber,
        statusUrl: `/api/inkos/status/${taskId}`,
        streamUrl: `/api/inkos/stream/${taskId}?projectId=${request.projectId}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Audit Operations
// ============================================

/**
 * GET /api/inkos/audit
 * Trigger 33-dimension audit
 */
inkosRouter.get(
  '/audit',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Build audit request from query params
      const request: AuditRequest = {
        projectId: req.query.projectId as string,
        chapterId: req.query.chapterId as string | undefined,
        dimensions: req.query.dimensions
          ? (req.query.dimensions as string).split(',')
          : undefined,
        options: {
          checkContinuity: req.query.checkContinuity !== 'false',
          checkAITells: req.query.checkAITells !== 'false',
          checkSensitiveWords: req.query.checkSensitiveWords !== 'false',
          checkStyle: req.query.checkStyle !== 'false',
        },
      };

      if (!request.projectId) {
        return res.status(400).json({
          error: 'Missing projectId',
        });
      }

      // Start audit task
      const { taskId } = await inkosService.runAudit(request, request.projectId);

      res.status(202).json({
        message: 'Audit task started',
        taskId,
        projectId: request.projectId,
        statusUrl: `/api/inkos/status/${taskId}`,
        streamUrl: `/api/inkos/stream/${taskId}?projectId=${request.projectId}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/inkos/audit
 * Trigger 33-dimension audit (POST version for complex options)
 */
inkosRouter.post(
  '/audit',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request
      const parseResult = AuditRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          error: 'Invalid request',
          details: parseResult.error.issues,
        });
      }

      const request = parseResult.data as AuditRequest;

      // Start audit task
      const { taskId } = await inkosService.runAudit(request, request.projectId);

      res.status(202).json({
        message: 'Audit task started',
        taskId,
        projectId: request.projectId,
        statusUrl: `/api/inkos/status/${taskId}`,
        streamUrl: `/api/inkos/stream/${taskId}?projectId=${request.projectId}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// Task Status
// ============================================

/**
 * GET /api/inkos/status/:taskId
 * Get task status
 */
inkosRouter.get('/status/:taskId', (req: Request, res: Response) => {
  const taskId = req.params.taskId as string;
  const task = taskStore.get(taskId);

  if (!task) {
    return res.status(404).json({
      error: 'Task not found',
      taskId,
    });
  }

  res.json(task);
});

/**
 * DELETE /api/inkos/status/:taskId
 * Cancel a running task
 */
inkosRouter.delete('/status/:taskId', async (req: Request, res: Response) => {
  const taskId = req.params.taskId as string;
  const cancelled = await inkosService.cancelTask(taskId);

  if (!cancelled) {
    return res.status(400).json({
      error: 'Cannot cancel task',
      taskId,
    });
  }

  res.json({
    message: 'Task cancelled',
    taskId,
  });
});

/**
 * GET /api/inkos/tasks
 * List all tasks (optional: filter by project)
 */
inkosRouter.get('/tasks', (req: Request, res: Response) => {
  // This would need a proper implementation with taskStore.list()
  // For now, return a placeholder
  res.json({
    message: 'Task listing not implemented',
    hint: 'Use individual task status endpoints',
  });
});

// ============================================
// SSE Streaming
// ============================================

/**
 * GET /api/inkos/stream/:taskId
 * SSE endpoint for real-time task progress
 */
inkosRouter.get(
  '/stream/:taskId',
  sseHeaders,
  sseHandler
);

/**
 * GET /api/inkos/stream
 * General SSE endpoint for project-wide events
 */
inkosRouter.get(
  '/stream',
  sseHeaders,
  sseHandler
);

// ============================================
// Utility Endpoints
// ============================================

/**
 * GET /api/inkos/genres
 * List available genres from inkos
 */
inkosRouter.get('/genres', async (_req: Request, res: Response) => {
  try {
    // This would call inkos to get available genres
    // For now, return common genres
    const genres = [
      { id: 'xuanhuan', name: '玄幻', description: '东方玄幻小说' },
      { id: 'qihuan', name: '奇幻', description: '西方奇幻小说' },
      { id: 'wuxia', name: '武侠', description: '传统武侠小说' },
      { id: 'xianxia', name: '仙侠', description: '仙侠修真小说' },
      { id: 'dushi', name: '都市', description: '都市生活小说' },
      { id: 'lishi', name: '历史', description: '历史穿越小说' },
      { id: 'junshi', name: '军事', description: '军事战争小说' },
      { id: 'kehuan', name: '科幻', description: '科幻小说' },
      { id: 'lingyi', name: '灵异', description: '灵异悬疑小说' },
      { id: 'youxi', name: '游戏', description: '游戏竞技小说' },
      { id: 'nvpin', name: '女频', description: '女性向小说' },
      { id: 'ertong', name: '儿童', description: '儿童文学' },
    ];

    res.json({
      genres,
      count: genres.length,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to list genres',
    });
  }
});

/**
 * GET /api/inkos/dimensions
 * List 33 audit dimensions
 */
inkosRouter.get('/dimensions', (_req: Request, res: Response) => {
  const dimensions = [
    // Plot dimensions
    { id: 'plot_structure', name: '情节结构', category: 'plot' },
    { id: 'plot_pacing', name: '节奏把控', category: 'plot' },
    { id: 'plot_tension', name: '张力营造', category: 'plot' },
    { id: 'plot_twist', name: '转折设计', category: 'plot' },
    { id: 'plot_resolution', name: '冲突解决', category: 'plot' },

    // Character dimensions
    { id: 'char_depth', name: '人物深度', category: 'character' },
    { id: 'char_growth', name: '人物成长', category: 'character' },
    { id: 'char_dialogue', name: '对话质量', category: 'character' },
    { id: 'char_voice', name: '人物声音', category: 'character' },
    { id: 'char_relation', name: '人物关系', category: 'character' },

    // World dimensions
    { id: 'world_consistency', name: '世界观一致性', category: 'world' },
    { id: 'world_detail', name: '细节描写', category: 'world' },
    { id: 'world_atmosphere', name: '氛围营造', category: 'world' },
    { id: 'world_logic', name: '设定逻辑', category: 'world' },

    // Style dimensions
    { id: 'style_flow', name: '行文流畅', category: 'style' },
    { id: 'style_metaphor', name: '比喻运用', category: 'style' },
    { id: 'style_sensory', name: '感官描写', category: 'style' },
    { id: 'style_show_dont_tell', name: '展示而非讲述', category: 'style' },

    // Technical dimensions
    { id: 'tech_grammar', name: '语法正确', category: 'technical' },
    { id: 'tech_vocabulary', name: '词汇丰富', category: 'technical' },
    { id: 'tech_sentence', name: '句式变化', category: 'technical' },
    { id: 'tech_paragraph', name: '段落结构', category: 'technical' },

    // Quality dimensions
    { id: 'quality_originality', name: '原创性', category: 'quality' },
    { id: 'quality_engagement', name: '吸引力', category: 'quality' },
    { id: 'quality_emotion', name: '情感共鸣', category: 'quality' },
    { id: 'quality_clarity', name: '清晰度', category: 'quality' },

    // AI detection dimensions
    { id: 'ai_tells', name: 'AI痕迹检测', category: 'ai' },
    { id: 'ai_repetition', name: '重复模式', category: 'ai' },
    { id: 'ai_cliché', name: '陈词滥调', category: 'ai' },
    { id: 'ai_unnatural', name: '不自然表达', category: 'ai' },

    // Sensitive content
    { id: 'sensitive_words', name: '敏感词检测', category: 'content' },
    { id: 'sensitive_topics', name: '敏感话题', category: 'content' },
  ];

  res.json({
    dimensions,
    count: dimensions.length,
    categories: ['plot', 'character', 'world', 'style', 'technical', 'quality', 'ai', 'content'],
  });
});

/**
 * GET /api/inkos/connections
 * Get active SSE connections count
 */
inkosRouter.get('/connections', (_req: Request, res: Response) => {
  res.json({
    activeConnections: sseManager.getConnectionCount(),
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// Error Handler
// ============================================

inkosRouter.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[inkos API Error]', err);

  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
    timestamp: new Date().toISOString(),
  });
});
