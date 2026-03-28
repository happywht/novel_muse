/**
 * inkos API Client
 * Frontend service for communicating with inkos backend API
 */

import { API_BASE } from './apiService';
import type { ProjectState } from '../types';
import type {
  ImportRequest,
  ExportRequest,
  WriteChapterRequest,
  AuditRequest,
  TaskInfo,
  TaskStatus,
  ImportResult,
  ExportResult,
  WriteChapterResult,
  AuditResult,
  HealthCheckResult,
  TaskStartedResponse,
  ErrorResponse,
  GenreInfo,
  AuditDimensionInfo,
  InkosSSEEvent,
} from '../types/inkos';

// ============================================
// Constants
// ============================================

const INKOS_API_BASE = `${API_BASE}/inkos`;

// ============================================
// Error Handling
// ============================================

/**
 * Custom error class for inkos API errors
 */
export class InkosApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'InkosApiError';
  }
}

/**
 * Parse API error response
 */
async function parseErrorResponse(response: Response): Promise<InkosApiError> {
  try {
    const errorData = (await response.json()) as ErrorResponse;
    return new InkosApiError(
      errorData.message || errorData.error || 'Unknown error',
      response.status,
      errorData.details
    );
  } catch {
    return new InkosApiError(
      response.statusText || 'Request failed',
      response.status
    );
  }
}

/**
 * Make API request with error handling
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${INKOS_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  return response.json();
}

// ============================================
// Health Check
// ============================================

/**
 * Check inkos API health status
 */
export async function checkInkosHealth(): Promise<HealthCheckResult> {
  return apiRequest<HealthCheckResult>('/health');
}

/**
 * Check if inkos integration is available
 */
export async function isInkosAvailable(): Promise<boolean> {
  try {
    const health = await checkInkosHealth();
    return health.status === 'ok' && (health.inkos?.available ?? false);
  } catch {
    return false;
  }
}

// ============================================
// Import/Export Operations
// ============================================

/**
 * Build import request from project state
 */
function buildImportRequest(project: ProjectState): ImportRequest {
  return {
    projectId: project.id,
    project: {
      id: project.id,
      title: project.title,
      genre: project.genre,
      premise: project.premise,
      theme: project.creativeSettings?.tone,
      synopsis: undefined, // Could be derived from plotOutline
      wordCountGoal: undefined,
      status: undefined,
    },
    characters: project.characters.map((char) => ({
      id: char.id,
      name: char.name,
      role: char.role,
      description: char.description,
      backstory: undefined,
      personality: char.archetype,
      goals: char.desire,
      relationships: char.structuredRelations?.map((rel) => ({
        characterId: rel.targetCharacterId || rel.targetName || '',
        relationship: rel.description || rel.type || '',
      })),
    })),
    chapters: project.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      synopsis: chapter.summary,
      status: chapter.content ? 'written' : 'planned',
      order: chapter.order,
      wordCount: chapter.content?.length || 0,
    })),
    world: {
      setting: project.worldSettings.find((w) => w.category === 'Geography')?.content,
      rules: project.worldSettings.find((w) => w.category === 'Magic/Tech')?.content,
      timeline: project.worldSettings.find((w) => w.category === 'History')?.content,
      locations: project.worldSettings
        .filter((w) => w.category === 'Geography')
        .map((w) => ({
          id: w.id,
          name: w.title,
          description: w.content,
        })),
    },
  };
}

/**
 * Import Muse project to inkos format
 */
export async function importToInkos(
  project: ProjectState
): Promise<TaskStartedResponse> {
  const request = buildImportRequest(project);
  return apiRequest<TaskStartedResponse>('/import', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/**
 * Export inkos project to Muse format
 */
export async function exportFromInkos(
  inkosProjectPath: string,
  targetProjectId?: string
): Promise<TaskStartedResponse> {
  const request: ExportRequest = {
    inkosProjectPath,
    targetProjectId,
  };
  return apiRequest<TaskStartedResponse>('/export', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============================================
// Write Operations
// ============================================

/**
 * Trigger chapter writing
 */
export async function writeChapter(
  projectId: string,
  chapterId: string,
  chapterNumber: number,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    skipValidation?: boolean;
    reviseMode?: 'auto' | 'manual' | 'skip';
  }
): Promise<TaskStartedResponse> {
  const request: WriteChapterRequest = {
    projectId,
    chapterId,
    chapterNumber,
    options,
  };
  return apiRequest<TaskStartedResponse>('/write', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============================================
// Audit Operations
// ============================================

/**
 * Run 33-dimension audit
 */
export async function runAudit(
  projectId: string,
  options?: {
    chapterId?: string;
    dimensions?: string[];
    checkContinuity?: boolean;
    checkAITells?: boolean;
    checkSensitiveWords?: boolean;
    checkStyle?: boolean;
  }
): Promise<TaskStartedResponse> {
  const params = new URLSearchParams();
  params.set('projectId', projectId);

  if (options?.chapterId) {
    params.set('chapterId', options.chapterId);
  }
  if (options?.dimensions && options.dimensions.length > 0) {
    params.set('dimensions', options.dimensions.join(','));
  }
  if (options?.checkContinuity !== undefined) {
    params.set('checkContinuity', String(options.checkContinuity));
  }
  if (options?.checkAITells !== undefined) {
    params.set('checkAITells', String(options.checkAITells));
  }
  if (options?.checkSensitiveWords !== undefined) {
    params.set('checkSensitiveWords', String(options.checkSensitiveWords));
  }
  if (options?.checkStyle !== undefined) {
    params.set('checkStyle', String(options.checkStyle));
  }

  return apiRequest<TaskStartedResponse>(`/audit?${params.toString()}`);
}

/**
 * Run audit with POST request (for complex options)
 */
export async function runAuditPost(
  request: AuditRequest
): Promise<TaskStartedResponse> {
  return apiRequest<TaskStartedResponse>('/audit', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ============================================
// Task Status
// ============================================

/**
 * Get task status
 */
export async function getTaskStatus(taskId: string): Promise<TaskInfo> {
  return apiRequest<TaskInfo>(`/status/${taskId}`);
}

/**
 * Cancel a running task
 */
export async function cancelTask(taskId: string): Promise<{ message: string; taskId: string }> {
  return apiRequest<{ message: string; taskId: string }>(`/status/${taskId}`, {
    method: 'DELETE',
  });
}

/**
 * Poll task status until completion
 */
export async function pollTaskStatus(
  taskId: string,
  options?: {
    intervalMs?: number;
    timeoutMs?: number;
    onProgress?: (task: TaskInfo) => void;
  }
): Promise<TaskInfo> {
  const intervalMs = options?.intervalMs || 2000;
  const timeoutMs = options?.timeoutMs || 600000; // 10 minutes default
  const startTime = Date.now();

  while (true) {
    const task = await getTaskStatus(taskId);

    // Notify progress
    if (options?.onProgress) {
      options.onProgress(task);
    }

    // Check if completed
    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      return task;
    }

    // Check timeout
    if (Date.now() - startTime > timeoutMs) {
      throw new InkosApiError('Task polling timeout', 408);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

// ============================================
// SSE Streaming
// ============================================

/**
 * Create SSE connection for task progress
 */
export function createTaskStream(
  taskId: string,
  projectId: string,
  onEvent: (event: InkosSSEEvent) => void,
  onError?: (error: Error) => void
): () => void {
  const url = `${INKOS_API_BASE}/stream/${taskId}?projectId=${projectId}`;
  const eventSource = new EventSource(url);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as InkosSSEEvent;
      onEvent(data);
    } catch (err) {
      console.error('Failed to parse SSE event:', err);
    }
  };

  eventSource.onerror = (err) => {
    console.error('SSE connection error:', err);
    if (onError) {
      onError(new Error('SSE connection failed'));
    }
    eventSource.close();
  };

  // Return cleanup function
  return () => {
    eventSource.close();
  };
}

// ============================================
// Utility Endpoints
// ============================================

/**
 * Get available genres
 */
export async function getGenres(): Promise<{ genres: GenreInfo[]; count: number }> {
  return apiRequest<{ genres: GenreInfo[]; count: number }>('/genres');
}

/**
 * Get available audit dimensions
 */
export async function getAuditDimensions(): Promise<{
  dimensions: AuditDimensionInfo[];
  count: number;
  categories: string[];
}> {
  return apiRequest<{
    dimensions: AuditDimensionInfo[];
    count: number;
    categories: string[];
  }>('/dimensions');
}

/**
 * Get active SSE connections count
 */
export async function getActiveConnections(): Promise<{
  activeConnections: number;
  timestamp: string;
}> {
  return apiRequest<{ activeConnections: number; timestamp: string }>('/connections');
}

// ============================================
// Convenience Methods
// ============================================

/**
 * Import project and wait for completion
 */
export async function importProjectAndWait(
  project: ProjectState,
  onProgress?: (task: TaskInfo) => void
): Promise<ImportResult> {
  const { taskId } = await importToInkos(project);
  const task = await pollTaskStatus(taskId, { onProgress });

  if (task.status === 'failed') {
    throw new InkosApiError(task.error || 'Import failed', 500);
  }

  return task.result as ImportResult;
}

/**
 * Write chapter and wait for completion
 */
export async function writeChapterAndWait(
  projectId: string,
  chapterId: string,
  chapterNumber: number,
  options?: Parameters<typeof writeChapter>[3],
  onProgress?: (task: TaskInfo) => void
): Promise<WriteChapterResult> {
  const { taskId } = await writeChapter(projectId, chapterId, chapterNumber, options);
  const task = await pollTaskStatus(taskId, { onProgress });

  if (task.status === 'failed') {
    throw new InkosApiError(task.error || 'Write failed', 500);
  }

  return task.result as WriteChapterResult;
}

/**
 * Run audit and wait for completion
 */
export async function runAuditAndWait(
  projectId: string,
  options?: Parameters<typeof runAudit>[1],
  onProgress?: (task: TaskInfo) => void
): Promise<AuditResult> {
  const { taskId } = await runAudit(projectId, options);
  const task = await pollTaskStatus(taskId, { onProgress });

  if (task.status === 'failed') {
    throw new InkosApiError(task.error || 'Audit failed', 500);
  }

  return task.result as AuditResult;
}

// ============================================
// Export all
// ============================================

export const inkosApiClient = {
  // Health
  checkInkosHealth,
  isInkosAvailable,

  // Import/Export
  importToInkos,
  exportFromInkos,

  // Write
  writeChapter,

  // Audit
  runAudit,
  runAuditPost,

  // Task Management
  getTaskStatus,
  cancelTask,
  pollTaskStatus,

  // Streaming
  createTaskStream,

  // Utilities
  getGenres,
  getAuditDimensions,
  getActiveConnections,

  // Convenience
  importProjectAndWait,
  writeChapterAndWait,
  runAuditAndWait,
};

export default inkosApiClient;
