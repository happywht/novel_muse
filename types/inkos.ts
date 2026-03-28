/**
 * inkos API Types for Frontend
 * Frontend type definitions for Muse-inkos API communication
 */

import type { ProjectState, Character, Chapter, WorldSetting } from './index';

// ============================================
// Request Types
// ============================================

/**
 * Import request: Muse project to inkos
 */
export interface ImportRequest {
  projectId: string;
  project: {
    id: string;
    title: string;
    genre?: string;
    premise?: string;
    theme?: string;
    synopsis?: string;
    wordCountGoal?: number;
    status?: string;
  };
  characters?: Array<{
    id: string;
    name: string;
    role?: string;
    description?: string;
    backstory?: string;
    personality?: string;
    goals?: string;
    relationships?: Array<{
      characterId: string;
      relationship: string;
    }>;
  }>;
  chapters?: Array<{
    id: string;
    title: string;
    synopsis?: string;
    status?: string;
    order: number;
    wordCount?: number;
  }>;
  world?: {
    setting?: string;
    rules?: string;
    timeline?: string;
    locations?: Array<{
      id: string;
      name: string;
      description?: string;
    }>;
  };
}

/**
 * Export request: inkos to Muse
 */
export interface ExportRequest {
  inkosProjectPath: string;
  targetProjectId?: string;
}

/**
 * Write chapter request options
 */
export interface WriteChapterOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  skipValidation?: boolean;
  reviseMode?: 'auto' | 'manual' | 'skip';
}

/**
 * Write chapter request
 */
export interface WriteChapterRequest {
  projectId: string;
  chapterId: string;
  chapterNumber: number;
  options?: WriteChapterOptions;
}

/**
 * Audit request options
 */
export interface AuditOptions {
  checkContinuity?: boolean;
  checkAITells?: boolean;
  checkSensitiveWords?: boolean;
  checkStyle?: boolean;
}

/**
 * Audit request
 */
export interface AuditRequest {
  projectId: string;
  chapterId?: string;
  dimensions?: string[];
  options?: AuditOptions;
}

// ============================================
// Response Types
// ============================================

/**
 * Task status enum
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Task type enum
 */
export type TaskType = 'import' | 'export' | 'write' | 'audit';

/**
 * Task info response
 */
export interface TaskInfo {
  taskId: string;
  type: TaskType;
  status: TaskStatus;
  progress: number; // 0-100
  message?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  result?: ImportResult | ExportResult | WriteChapterResult | AuditResult;
}

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
 * Audit dimension result
 */
export interface AuditDimensionResult {
  id: string;
  name: string;
  score: number;
  issues: Array<{
    type: string;
    message: string;
    location?: string;
    suggestion?: string;
  }>;
}

/**
 * Audit result
 */
export interface AuditResult {
  projectId: string;
  chapterId?: string;
  dimensions: AuditDimensionResult[];
  overallScore: number;
  summary?: string;
  recommendations?: string[];
  auditedAt?: string;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: 'ok' | 'error';
  inkos?: {
    available: boolean;
    path: string;
  };
  timestamp?: string;
  error?: string;
}

/**
 * Genre info
 */
export interface GenreInfo {
  id: string;
  name: string;
  description: string;
}

/**
 * Audit dimension info
 */
export interface AuditDimensionInfo {
  id: string;
  name: string;
  category: string;
}

// ============================================
// API Response Wrappers
// ============================================

/**
 * Task started response
 */
export interface TaskStartedResponse {
  message: string;
  taskId: string;
  statusUrl: string;
  streamUrl?: string;
  chapterId?: string;
  chapterNumber?: number;
  projectId?: string;
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
  timestamp?: string;
}

// ============================================
// SSE Event Types
// ============================================

/**
 * SSE event types for inkos tasks
 */
export interface InkosSSEEvent {
  type: 'progress' | 'log' | 'error' | 'complete';
  taskId: string;
  data: {
    progress?: number;
    message?: string;
    log?: string;
    error?: string;
    result?: unknown;
  };
  timestamp: string;
}
