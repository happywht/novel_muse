/**
 * inkos API Types
 * Defines types for Muse-inkos API communication
 */

import { z } from 'zod';

// ============================================
// Request Schemas
// ============================================

/**
 * Import request: Muse project to inkos
 */
export const ImportRequestSchema = z.object({
  projectId: z.string().min(1),
  // Muse project data
  project: z.object({
    id: z.string(),
    title: z.string(),
    genre: z.string().optional(),
    premise: z.string().optional(),
    theme: z.string().optional(),
    synopsis: z.string().optional(),
    wordCountGoal: z.number().optional(),
    status: z.string().optional(),
  }),
  // Characters
  characters: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        role: z.string().optional(),
        description: z.string().optional(),
        backstory: z.string().optional(),
        personality: z.string().optional(),
        goals: z.string().optional(),
        relationships: z
          .array(
            z.object({
              characterId: z.string(),
              relationship: z.string(),
            })
          )
          .optional(),
      })
    )
    .optional(),
  // Outline chapters
  chapters: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        synopsis: z.string().optional(),
        status: z.string().optional(),
        order: z.number(),
        wordCount: z.number().optional(),
      })
    )
    .optional(),
  // World building
  world: z
    .object({
      setting: z.string().optional(),
      rules: z.string().optional(),
      timeline: z.string().optional(),
      locations: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().optional(),
          })
        )
        .optional(),
    })
    .optional(),
});

export type ImportRequest = z.infer<typeof ImportRequestSchema>;

/**
 * Export request: inkos to Muse
 */
export const ExportRequestSchema = z.object({
  inkosProjectPath: z.string().min(1),
  targetProjectId: z.string().optional(),
});

export type ExportRequest = z.infer<typeof ExportRequestSchema>;

/**
 * Write chapter request
 */
export const WriteChapterRequestSchema = z.object({
  projectId: z.string().min(1),
  chapterId: z.string().min(1),
  chapterNumber: z.number().int().positive(),
  options: z
    .object({
      model: z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens: z.number().int().positive().optional(),
      skipValidation: z.boolean().optional(),
      reviseMode: z.enum(['auto', 'manual', 'skip']).optional(),
    })
    .optional(),
});

export type WriteChapterRequest = z.infer<typeof WriteChapterRequestSchema>;

/**
 * Audit request
 */
export const AuditRequestSchema = z.object({
  projectId: z.string().min(1),
  chapterId: z.string().optional(),
  dimensions: z.array(z.string()).optional(),
  options: z
    .object({
      checkContinuity: z.boolean().optional(),
      checkAITells: z.boolean().optional(),
      checkSensitiveWords: z.boolean().optional(),
      checkStyle: z.boolean().optional(),
    })
    .optional(),
});

export type AuditRequest = z.infer<typeof AuditRequestSchema>;

// ============================================
// Response Schemas
// ============================================

/**
 * Task status
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Task info
 */
export interface TaskInfo {
  taskId: string;
  type: 'import' | 'export' | 'write' | 'audit';
  status: TaskStatus;
  progress: number; // 0-100
  message?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  result?: unknown;
}

// ============================================
// Result Types
// ============================================

/**
 * Import result
 */
export interface ImportResult {
  projectId: string;
  inkosProjectPath: string;
  importedAt?: string;
  chaptersWritten: number;
  charactersImported: number;
  worldBuilt: boolean;
  message?: string;
}

/**
 * Export result
 */
export interface ExportResult {
  projectId: string;
  exportedAt?: string;
  chaptersExported: number;
  charactersExported: number;
  worldExported: boolean;
  message?: string;
}

/**
 * Write chapter result
 */
export interface WriteChapterResult {
  chapterId: string;
  chapterNumber: number;
  content?: string;
  wordCount: number;
  completedAt?: string;
  outputPath?: string;
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  revisions?: number;
  validationPassed?: boolean;
}

/**
 * Audit result
 */
export interface AuditResult {
  projectId: string;
  chapterId?: string;
  dimensions: Array<{
    id: string;
    name: string;
    score: number;
    issues: Array<{
      type: string;
      message: string;
      location?: string;
      suggestion?: string;
    }>;
  }>;
  overallScore: number;
  summary?: string;
  recommendations?: string[];
  auditedAt?: string;
}

/**
 * inkos configuration
 */
export interface InkosConfig {
  version: string;
  genre: string;
  platform?: string;
  wordCountGoal?: number;
  [key: string]: unknown;
}

// ============================================
// CLI Execution Types
// ============================================

/**
 * CLI execution options
 */
export interface ExecuteOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

/**
 * CLI execution result
 */
export interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut?: boolean;
}

/**
 * Timeout error class for CLI execution
 */
export class CliTimeoutError extends Error {
  public readonly timeoutMs: number;
  public readonly command: string;

  constructor(timeoutMs: number, command: string = 'inkos') {
    super(`CLI 执行超时: ${command} 命令在 ${timeoutMs / 1000} 秒后未响应，已自动终止。请检查网络连接或减少任务复杂度后重试。`);
    this.name = 'CliTimeoutError';
    this.timeoutMs = timeoutMs;
    this.command = command;
  }
}

/**
 * Default timeout constants (in milliseconds)
 */
export const CLI_TIMEOUT = {
  DEFAULT: 60000, // 60 seconds
  SHORT: 30000, // 30 seconds (for quick operations like init)
  LONG: 120000, // 120 seconds (for write operations)
  AUDIT: 90000, // 90 seconds (for audit operations)
} as const;
