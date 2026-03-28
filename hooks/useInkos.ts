/**
 * useInkos Hook
 * React hook for inkos integration
 */

import { useState, useCallback, useEffect } from 'react';

// Types
interface InkosTask {
  taskId: string;
  status: 'pending' | 'running' | 'complete' | 'error' | 'cancelled';
  progress: number;
  message?: string;
  result?: any;
  error?: string;
  startedAt: string;
  completedAt?: string;
}

interface WriteProgress {
  phase: 'thinking' | 'writing' | 'auditing' | 'revising';
  percentage: number;
  message: string;
  chapterNumber?: number;
}

interface ImportRequest {
  projectId: string;
  options?: {
    includeChapters?: boolean;
    includeCharacters?: boolean;
    includeWorldSettings?: boolean;
  };
}

interface ExportRequest {
  projectId: string;
  targetProjectId?: string;
}

interface WriteRequest {
  projectId: string;
  chapterNumber: number;
  chapterId?: string;
  options?: {
    model?: string;
    styleGuide?: string;
  };
}

interface AuditRequest {
  projectId: string;
  chapterId?: string;
  dimensions?: string[];
  options?: {
    checkContinuity?: boolean;
    checkAITells?: boolean;
    checkSensitiveWords?: boolean;
    checkStyle?: boolean;
  };
}

interface UseInkosReturn {
  currentTask: InkosTask | null;
  progress: WriteProgress | null;
  isRunning: boolean;
  importProject: (request: ImportRequest) => Promise<{ taskId: string }>;
  exportProject: (request: ExportRequest) => Promise<{ taskId: string }>;
  writeChapter: (request: WriteRequest) => Promise<{ taskId: string }>;
  runAudit: (request: AuditRequest) => Promise<{ taskId: string }>;
  cancelTask: () => Promise<boolean>;
  getTaskStatus: (taskId: string) => Promise<InkosTask>;
  subscribeToTask: (taskId: string, projectId: string) => void;
  unsubscribeFromTask: () => void;
  error: string | null;
  clearError: () => void;
}

const API_BASE = '/api/inkos';

export function useInkos(): UseInkosReturn {
  const [currentTask, setCurrentTask] = useState<InkosTask | null>(null);
  const [progress, setProgress] = useState<WriteProgress | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Start task helper
  const startTask = useCallback(async (
    endpoint: string,
    body: any
  ): Promise<{ taskId: string }> => {
    try {
      setError(null);
      setIsRunning(true);

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setCurrentTask({
        taskId: data.taskId,
        status: 'pending',
        progress: 0,
        startedAt: new Date().toISOString(),
      });

      return { taskId: data.taskId };
    } catch (err) {
      setIsRunning(false);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Import project
  const importProject = useCallback(async (request: ImportRequest) => {
    return startTask('/import', request);
  }, [startTask]);

  // Export project
  const exportProject = useCallback(async (request: ExportRequest) => {
    return startTask('/export', request);
  }, [startTask]);

  // Write chapter
  const writeChapter = useCallback(async (request: WriteRequest) => {
    return startTask('/write', request);
  }, [startTask]);

  // Run audit
  const runAudit = useCallback(async (request: AuditRequest) => {
    try {
      setError(null);
      setIsRunning(true);

      const params = new URLSearchParams({
        projectId: request.projectId,
        ...(request.chapterId && { chapterId: request.chapterId }),
      });

      const response = await fetch(`${API_BASE}/audit?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setCurrentTask({
        taskId: data.taskId,
        status: 'pending',
        progress: 0,
        startedAt: new Date().toISOString(),
      });

      return { taskId: data.taskId };
    } catch (err) {
      setIsRunning(false);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  }, []);

  // Cancel task
  const cancelTask = useCallback(async (): Promise<boolean> => {
    if (!currentTask) return false;

    try {
      const response = await fetch(`${API_BASE}/status/${currentTask.taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel task');
      }

      setIsRunning(false);
      setProgress(null);
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      setCurrentTask({
        ...currentTask,
        status: 'cancelled',
      });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel task';
      setError(errorMessage);
      return false;
    }
  }, [currentTask, eventSource]);

  // Get task status
  const getTaskStatus = useCallback(async (taskId: string): Promise<InkosTask> => {
    const response = await fetch(`${API_BASE}/status/${taskId}`);

    if (!response.ok) {
      throw new Error('Failed to get task status');
    }

    return response.json();
  }, []);

  // Subscribe to task via SSE
  const subscribeToTask = useCallback((taskId: string, projectId: string) => {
    // Close existing connection
    if (eventSource) {
      eventSource.close();
    }

    const newEventSource = new EventSource(
      `${API_BASE}/stream/${taskId}?projectId=${projectId}`
    );

    newEventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'progress') {
          setProgress({
            phase: data.phase || 'writing',
            percentage: data.percentage || 0,
            message: data.message || '',
            chapterNumber: data.chapterNumber,
          });

          if (currentTask) {
            setCurrentTask({
              ...currentTask,
              progress: data.percentage || 0,
              message: data.message,
            });
          }
        } else if (data.type === 'complete') {
          setIsRunning(false);
          setProgress(null);
          if (currentTask) {
            setCurrentTask({
              ...currentTask,
              status: 'complete',
              result: data.result,
              completedAt: new Date().toISOString(),
            });
          }
          newEventSource.close();
          setEventSource(null);
        } else if (data.type === 'error') {
          setIsRunning(false);
          setError(data.message || 'Task failed');
          if (currentTask) {
            setCurrentTask({
              ...currentTask,
              status: 'error',
              error: data.message,
            });
          }
          newEventSource.close();
          setEventSource(null);
        }
      } catch (err) {
        console.error('Failed to parse SSE data:', err);
      }
    };

    newEventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      setError('Connection to task stream failed');
      newEventSource.close();
      setEventSource(null);
    };

    setEventSource(newEventSource);
  }, [currentTask, eventSource]);

  // Unsubscribe from task
  const unsubscribeFromTask = useCallback(() => {
    if (eventSource) {
      eventSource.close();
      setEventSource(null);
    }
  }, [eventSource]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [eventSource]);

  return {
    currentTask,
    progress,
    isRunning,
    importProject,
    exportProject,
    writeChapter,
    runAudit,
    cancelTask,
    getTaskStatus,
    subscribeToTask,
    unsubscribeFromTask,
    error,
    clearError,
  };
}
