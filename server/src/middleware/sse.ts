/**
 * Server-Sent Events (SSE) Middleware
 * Enables real-time progress updates for long-running inkos tasks
 */

import { Request, Response, NextFunction } from 'express';

/**
 * SSE connection manager for tracking active connections
 */
interface SSEConnection {
  id: string;
  res: Response;
  projectId?: string;
  taskId?: string;
  connectedAt: Date;
}

class SSEConnectionManager {
  private connections: Map<string, SSEConnection> = new Map();
  private projectConnections: Map<string, Set<string>> = new Map();

  /**
   * Register a new SSE connection
   */
  register(id: string, res: Response, projectId?: string, taskId?: string): void {
    const connection: SSEConnection = {
      id,
      res,
      projectId,
      taskId,
      connectedAt: new Date(),
    };

    this.connections.set(id, connection);

    // Track by project
    if (projectId) {
      if (!this.projectConnections.has(projectId)) {
        this.projectConnections.set(projectId, new Set());
      }
      this.projectConnections.get(projectId)!.add(id);
    }

    console.log(`[SSE] Connection registered: ${id} (project: ${projectId || 'none'})`);
  }

  /**
   * Unregister an SSE connection
   */
  unregister(id: string): void {
    const connection = this.connections.get(id);
    if (connection) {
      // Remove from project tracking
      if (connection.projectId) {
        this.projectConnections.get(connection.projectId)?.delete(id);
      }
      this.connections.delete(id);
      console.log(`[SSE] Connection unregistered: ${id}`);
    }
  }

  /**
   * Send event to a specific connection
   */
  sendToConnection(connectionId: string, event: string, data: unknown): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return false;
    }

    try {
      connection.res.write(`event: ${event}\n`);
      connection.res.write(`data: ${JSON.stringify(data)}\n\n`);
      return true;
    } catch (error) {
      console.error(`[SSE] Failed to send to ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * Send event to all connections for a project
   */
  sendToProject(projectId: string, event: string, data: unknown): number {
    const connectionIds = this.projectConnections.get(projectId);
    if (!connectionIds) {
      return 0;
    }

    let sent = 0;
    for (const id of connectionIds) {
      if (this.sendToConnection(id, event, data)) {
        sent++;
      }
    }
    return sent;
  }

  /**
   * Broadcast to all connections
   */
  broadcast(event: string, data: unknown): number {
    let sent = 0;
    for (const id of this.connections.keys()) {
      if (this.sendToConnection(id, event, data)) {
        sent++;
      }
    }
    return sent;
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get connections for a project
   */
  getProjectConnections(projectId: string): SSEConnection[] {
    const ids = this.projectConnections.get(projectId);
    if (!ids) {
      return [];
    }
    return Array.from(ids)
      .map((id) => this.connections.get(id))
      .filter((c): c is SSEConnection => c !== undefined);
  }
}

// Singleton instance
export const sseManager = new SSEConnectionManager();

/**
 * SSE Headers Middleware
 * Sets required headers for SSE connections
 */
export const sseHeaders = (_req: Request, res: Response, next: NextFunction): void => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();
  next();
};

/**
 * SSE Connection Handler
 * Handles the lifecycle of an SSE connection
 */
export const sseHandler = (req: Request, res: Response, _next: NextFunction): void => {
  const projectId = req.query.projectId as string | undefined;
  const taskId = req.query.taskId as string | undefined;
  const connectionId = `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Register connection
  sseManager.register(connectionId, res, projectId, taskId);

  // Send initial connection event
  sseManager.sendToConnection(connectionId, 'connected', {
    connectionId,
    projectId,
    taskId,
    timestamp: new Date().toISOString(),
  });

  // Keep-alive heartbeat
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeatInterval);
      sseManager.unregister(connectionId);
    }
  }, 30000); // 30 seconds

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    sseManager.unregister(connectionId);
  });

  // Handle connection errors
  req.on('error', (error) => {
    console.error(`[SSE] Connection error for ${connectionId}:`, error);
    clearInterval(heartbeatInterval);
    sseManager.unregister(connectionId);
  });
};

/**
 * Helper function to send SSE event
 */
export function sendSSEEvent(projectId: string, event: string, data: unknown): number {
  return sseManager.sendToProject(projectId, event, {
    ...(typeof data === 'object' && data !== null ? data : {}),
    timestamp: new Date().toISOString(),
  });
}

/**
 * Helper function to send task progress
 */
export function sendTaskProgress(
  projectId: string,
  taskId: string,
  progress: number,
  message: string,
  extraData?: Record<string, unknown>
): number {
  return sendSSEEvent(projectId, 'task:progress', {
    taskId,
    progress,
    message,
    ...extraData,
  });
}

/**
 * Helper function to send write chunk (real-time writing)
 */
export function sendWriteChunk(
  projectId: string,
  taskId: string,
  chunk: string,
  wordCount: number
): number {
  return sendSSEEvent(projectId, 'write:chunk', {
    taskId,
    chunk,
    wordCount,
  });
}

/**
 * Helper function to send audit dimension result
 */
export function sendAuditDimension(
  projectId: string,
  taskId: string,
  dimension: string,
  score: number,
  issues: unknown[]
): number {
  return sendSSEEvent(projectId, 'audit:dimension', {
    taskId,
    dimension,
    score,
    issues,
  });
}
