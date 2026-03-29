/**
 * API Error Handler Middleware
 * Standardizes error responses across all API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// ============================================
// Error Types
// ============================================

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  error: {
    code: string; // Machine-readable error code
    message: string; // Human-readable error message
    details?: unknown[]; // Additional error details
  };
  requestId: string;
  timestamp: string;
}

/**
 * Error codes enum for consistency
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
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number = 500,
    public details?: unknown[]
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /**
   * Create a 400 Bad Request error
   */
  static badRequest(message: string, details?: unknown[]): ApiError {
    return new ApiError(ErrorCode.BAD_REQUEST, message, 400, details);
  }

  /**
   * Create a validation error (for Zod validation failures)
   */
  static validationError(zodError: ZodError): ApiError {
    const details = zodError.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));
    return new ApiError(ErrorCode.VALIDATION_ERROR, 'Validation failed', 400, details);
  }

  /**
   * Create a missing parameter error
   */
  static missingParameter(paramName: string): ApiError {
    return new ApiError(ErrorCode.MISSING_PARAMETER, `Missing required parameter: ${paramName}`, 400, [
      { field: paramName, message: 'This parameter is required' },
    ]);
  }

  /**
   * Create a 404 Not Found error
   */
  static notFound(resource: string, identifier?: string): ApiError {
    const message = identifier ? `${resource} not found: ${identifier}` : `${resource} not found`;
    return new ApiError(ErrorCode.NOT_FOUND, message, 404);
  }

  /**
   * Create a 401 Unauthorized error
   */
  static unauthorized(message: string = 'Authentication required'): ApiError {
    return new ApiError(ErrorCode.UNAUTHORIZED, message, 401);
  }

  /**
   * Create a 403 Forbidden error
   */
  static forbidden(message: string = 'Access denied'): ApiError {
    return new ApiError(ErrorCode.FORBIDDEN, message, 403);
  }

  /**
   * Create a 409 Conflict error
   */
  static conflict(message: string, details?: unknown[]): ApiError {
    return new ApiError(ErrorCode.CONFLICT, message, 409, details);
  }

  /**
   * Create a 500 Internal Server Error
   */
  static internalError(message: string = 'Internal server error'): ApiError {
    return new ApiError(ErrorCode.INTERNAL_ERROR, message, 500);
  }

  /**
   * Create a 503 Service Unavailable error
   */
  static serviceUnavailable(service: string): ApiError {
    return new ApiError(ErrorCode.SERVICE_UNAVAILABLE, `Service unavailable: ${service}`, 503);
  }
}

// ============================================
// Request ID Middleware
// ============================================

/**
 * Generate unique request ID for each request
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use existing request ID from header or generate new one
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
}

// ============================================
// Error Handler Middleware
// ============================================

/**
 * Format error response
 */
function formatErrorResponse(
  error: Error | ApiError | ZodError,
  requestId: string
): { response: ApiErrorResponse; statusCode: number } {
  const timestamp = new Date().toISOString();

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const apiError = ApiError.validationError(error);
    return {
      response: {
        error: {
          code: apiError.code,
          message: apiError.message,
          details: apiError.details,
        },
        requestId,
        timestamp,
      },
      statusCode: apiError.statusCode,
    };
  }

  // Handle custom API errors
  if (error instanceof ApiError) {
    return {
      response: {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        requestId,
        timestamp,
      },
      statusCode: error.statusCode,
    };
  }

  // Handle generic errors
  return {
    response: {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
      },
      requestId,
      timestamp,
    },
    statusCode: 500,
  };
}

/**
 * Global error handler middleware
 */
export function errorHandlerMiddleware(
  err: Error | ApiError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Get request ID from headers (set by requestIdMiddleware or existing)
  const requestId = (req.headers['x-request-id'] as string) || 'unknown';

  // Log error for debugging
  console.error(`[API Error] Request ID: ${requestId}`, {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Format and send response
  const { response, statusCode } = formatErrorResponse(err, requestId);
  res.status(statusCode).json(response);
}

// ============================================
// Not Found Handler
// ============================================

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = ApiError.notFound('Endpoint', req.path);
  next(error);
}

// ============================================
// Async Handler Wrapper
// ============================================

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================
// Success Response Helpers
// ============================================

/**
 * Standard success response wrapper
 */
export interface ApiSuccessResponse<T> {
  data: T;
  requestId: string;
  timestamp: string;
}

/**
 * Create a standardized success response
 */
export function successResponse<T>(req: Request, data: T): ApiSuccessResponse<T> {
  return {
    data,
    requestId: (req.headers['x-request-id'] as string) || 'unknown',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Paginated response wrapper
 */
export interface ApiPaginatedResponse<T> extends ApiSuccessResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  req: Request,
  items: T[],
  page: number,
  limit: number,
  total: number
): ApiPaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data: items,
    requestId: (req.headers['x-request-id'] as string) || 'unknown',
    timestamp: new Date().toISOString(),
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}
