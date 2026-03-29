/**
 * inkos API Types for Frontend
 * Frontend type definitions for Muse-inkos API communication
 */

import type { ProjectState, Character, Chapter, WorldSetting } from '../types';

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
 * Error codes for API responses
 */
export enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 'BAD_REQUEST',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR',
}

/**
 * Standard API error response format
 * All API errors follow this structure for consistency
 */
export interface ApiErrorResponse {
  error: {
    code: string; // Machine-readable error code (e.g., "INVALID_INPUT", "NOT_FOUND")
    message: string; // Human-readable error message
    details?: unknown[]; // Additional error details (e.g., validation errors)
  };
  requestId: string; // Unique request identifier for debugging
  timestamp: string; // ISO 8601 timestamp
}

/**
 * Legacy error response format (deprecated)
 * @deprecated Use ApiErrorResponse instead
 */
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
  timestamp?: string;
}

/**
 * Standard success response wrapper
 */
export interface ApiSuccessResponse<T> {
  data: T;
  requestId: string;
  timestamp: string;
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
