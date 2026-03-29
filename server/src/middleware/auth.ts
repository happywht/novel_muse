/**
 * Authentication Middleware
 * Supports JWT and API Key dual authentication modes
 *
 * @module middleware/auth
 * @security Provides flexible authentication for API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

// ============================================
// Type Definitions
// ============================================

/**
 * Authentication configuration interface
 */
export interface AuthConfig {
  /** Enable or disable authentication */
  enabled: boolean;
  /** Authentication mode: 'jwt' | 'api-key' | 'both' */
  mode: 'jwt' | 'api-key' | 'both';
  /** JWT secret key (required for jwt mode) */
  jwtSecret?: string;
  /** JWT issuer validation */
  jwtIssuer?: string;
  /** JWT audience validation */
  jwtAudience?: string;
  /** JWT expiration time (for token generation) */
  jwtExpiresIn?: string;
  /** List of valid API keys (required for api-key mode) */
  apiKeys?: string[];
  /** API key header name (default: 'x-api-key') */
  apiKeyHeader?: string;
}

/**
 * JWT payload interface
 */
export interface JwtPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

/**
 * Extended user info stored in request
 */
export interface AuthUser {
  id: string;
  role: string;
  authMethod: 'jwt' | 'api-key';
}

// ============================================
// Default Configuration
// ============================================

/**
 * Load configuration from environment variables
 */
const loadConfigFromEnv = (): AuthConfig => {
  const mode = (process.env.AUTH_MODE || 'api-key') as AuthConfig['mode'];
  const enabled = process.env.AUTH_ENABLED !== 'false'; // Default: true

  return {
    enabled,
    mode,
    jwtSecret: process.env.JWT_SECRET,
    jwtIssuer: process.env.JWT_ISSUER,
    jwtAudience: process.env.JWT_AUDIENCE,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    apiKeys: (process.env.API_KEYS || '')
      .split(',')
      .map((key) => key.trim())
      .filter(Boolean),
    apiKeyHeader: process.env.API_KEY_HEADER || 'x-api-key',
  };
};

// Default configuration instance
let authConfig: AuthConfig = loadConfigFromEnv();

// ============================================
// Public Routes Whitelist
// ============================================

/**
 * Public routes that don't require authentication
 * Note: Since middleware is mounted on /api, req.path doesn't include /api prefix
 */
export const PUBLIC_ROUTES = [
  '/health', // Health check endpoint (relative path)
  '/api/health', // Full path compatibility
  '/inkos/health', // inkos health check
  '/inkos/genres', // inkos genre list (read-only)
  '/inkos/dimensions', // inkos audit dimensions (read-only)
  '/inkos/connections', // inkos connection info (read-only)
];

/**
 * Check if path matches a public route
 */
const isPublicRoute = (path: string): boolean => {
  return PUBLIC_ROUTES.some((route) => path === route || path.startsWith(route + '/'));
};

// ============================================
// JWT Utilities
// ============================================

/**
 * Simple JWT verification without external library dependency
 * For production, consider using 'jsonwebtoken' library for full JWT support
 */
class JwtHandler {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }

  /**
   * Verify JWT signature
   */
  private verifySignature(token: string): boolean {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const [headerB64, payloadB64, signatureB64] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', this.secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64url');

      // Use timing-safe comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signatureB64),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  /**
   * Decode and verify JWT token
   */
  verify(token: string): JwtPayload | null {
    try {
      if (!this.verifySignature(token)) {
        return null;
      }

      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payloadB64 = parts[1];
      const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const payload = JSON.parse(payloadStr) as JwtPayload;

      // Check expiration
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Generate JWT token (for testing/utility purposes)
   */
  sign(payload: Omit<JwtPayload, 'iat' | 'exp'>, expiresIn: string = '24h'): string {
    const now = Math.floor(Date.now() / 1000);
    const expiresInSeconds = this.parseExpiresIn(expiresIn);

    const fullPayload: JwtPayload = {
      ...payload,
      iat: now,
      exp: now + expiresInSeconds,
    };

    const header = { alg: 'HS256', typ: 'JWT' };
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64url');

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  /**
   * Parse expiresIn string to seconds
   */
  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd]?)$/);
    if (!match) return 86400; // Default: 24 hours

    const value = parseInt(match[1], 10);
    const unit = match[2] || 's';

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return value;
    }
  }
}

// ============================================
// Rate Limiting for Authentication
// ============================================

interface RateLimitEntry {
  count: number;
  resetTime: number;
  blocked: boolean;
}

class AuthRateLimiter {
  private attempts = new Map<string, RateLimitEntry>();
  private windowMs: number;
  private maxAttempts: number;
  private blockDurationMs: number;

  constructor(windowMs: number = 15 * 60 * 1000, maxAttempts: number = 10, blockDurationMs: number = 30 * 60 * 1000) {
    this.windowMs = windowMs;
    this.maxAttempts = maxAttempts;
    this.blockDurationMs = blockDurationMs;

    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  check(clientId: string): { allowed: boolean; retryAfter?: number } {
    const now = Date.now();
    const entry = this.attempts.get(clientId);

    if (entry) {
      // Check if currently blocked
      if (entry.blocked && now < entry.resetTime) {
        return {
          allowed: false,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        };
      }

      // Check if window has expired
      if (now > entry.resetTime) {
        this.attempts.set(clientId, { count: 1, resetTime: now + this.windowMs, blocked: false });
        return { allowed: true };
      }

      // Check if max attempts exceeded
      if (entry.count >= this.maxAttempts) {
        entry.blocked = true;
        entry.resetTime = now + this.blockDurationMs;
        return {
          allowed: false,
          retryAfter: Math.ceil(this.blockDurationMs / 1000),
        };
      }

      entry.count++;
    } else {
      this.attempts.set(clientId, { count: 1, resetTime: now + this.windowMs, blocked: false });
    }

    return { allowed: true };
  }

  reset(clientId: string): void {
    this.attempts.delete(clientId);
  }

  private cleanup(): void {
    const now = Date.now();
    this.attempts.forEach((entry, key) => {
      if (now > entry.resetTime) {
        this.attempts.delete(key);
      }
    });
  }
}

const rateLimiter = new AuthRateLimiter();

// ============================================
// Authentication Middleware Factory
// ============================================

/**
 * Create authentication middleware with custom configuration
 */
export const createAuthMiddleware = (config: AuthConfig) => {
  // Update global config
  authConfig = config;

  // Initialize JWT handler if needed
  let jwtHandler: JwtHandler | null = null;
  if ((config.mode === 'jwt' || config.mode === 'both') && config.jwtSecret) {
    jwtHandler = new JwtHandler(config.jwtSecret);
  }

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip if authentication is disabled
    if (!config.enabled) {
      req.user = { id: 'anonymous', role: 'user', authMethod: 'api-key' };
      return next();
    }

    // Check if public route
    if (isPublicRoute(req.path)) {
      return next();
    }

    // Development mode bypass
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      req.user = { id: 'dev-user', role: 'admin', authMethod: 'api-key' };
      return next();
    }

    // Rate limiting check
    const clientId = req.ip || 'unknown';
    const rateCheck = rateLimiter.check(clientId);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'Too many authentication attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateCheck.retryAfter,
      });
    }

    // Try API Key authentication
    if (config.mode === 'api-key' || config.mode === 'both') {
      const apiKey = req.headers[config.apiKeyHeader || 'x-api-key'] as string | undefined;

      if (apiKey && config.apiKeys && config.apiKeys.length > 0) {
        // Use constant-time comparison for API key validation
        const apiKeyBuffer = Buffer.from(apiKey);
        const isValidKey = config.apiKeys.some((validKey) => {
          const validKeyBuffer = Buffer.from(validKey);
          // timingSafeEqual requires buffers of equal length
          if (apiKeyBuffer.length !== validKeyBuffer.length) {
            return false;
          }
          return crypto.timingSafeEqual(apiKeyBuffer, validKeyBuffer);
        });

        if (isValidKey) {
          rateLimiter.reset(clientId);
          req.user = { id: 'api-user', role: 'admin', authMethod: 'api-key' };
          return next();
        }
      }
    }

    // Try JWT authentication
    if (config.mode === 'jwt' || config.mode === 'both') {
      const authHeader = req.headers.authorization;

      if (authHeader?.startsWith('Bearer ') && jwtHandler) {
        const token = authHeader.slice(7);
        const payload = jwtHandler.verify(token);

        if (payload) {
          // Validate issuer if configured
          if (config.jwtIssuer && payload.iss !== config.jwtIssuer) {
            return res.status(401).json({
              error: 'Unauthorized: Invalid token issuer',
              code: 'INVALID_TOKEN_ISSUER',
            });
          }

          // Validate audience if configured
          if (config.jwtAudience && payload.aud !== config.jwtAudience) {
            return res.status(401).json({
              error: 'Unauthorized: Invalid token audience',
              code: 'INVALID_TOKEN_AUDIENCE',
            });
          }

          rateLimiter.reset(clientId);
          req.user = {
            id: payload.sub,
            role: payload.role,
            authMethod: 'jwt',
          };
          return next();
        }
      }
    }

    // No valid authentication found
    // Log failed attempt for security monitoring
    console.warn(`[AUTH] Failed authentication attempt - IP: ${req.ip}, Path: ${req.path}, Mode: ${config.mode}`);

    // Check if we're in "both" mode and need a more specific error
    if (config.mode === 'both') {
      return res.status(401).json({
        error: 'Unauthorized: Valid API key or JWT token required',
        code: 'AUTHENTICATION_REQUIRED',
        hint: 'Provide either X-API-Key header or Authorization: Bearer <token>',
      });
    }

    if (config.mode === 'api-key') {
      const hasKey = config.apiKeys && config.apiKeys.length > 0;
      if (!hasKey) {
        // No API keys configured
        if (process.env.NODE_ENV === 'production') {
          console.error('[SECURITY] No API_KEYS configured in production environment');
          return res.status(500).json({ error: 'Server configuration error' });
        }
        // Development mode: allow through with warning
        console.warn('[AUTH] WARNING: No API_KEYS configured. Authentication is disabled.');
        req.user = { id: 'unauthenticated', role: 'user', authMethod: 'api-key' };
        return next();
      }

      return res.status(401).json({
        error: 'Unauthorized: Missing or invalid API key',
        code: 'INVALID_API_KEY',
      });
    }

    if (config.mode === 'jwt') {
      if (!config.jwtSecret) {
        console.error('[SECURITY] No JWT_SECRET configured');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      return res.status(401).json({
        error: 'Unauthorized: Missing or invalid JWT token',
        code: 'INVALID_JWT_TOKEN',
      });
    }

    return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  };
};

// ============================================
// Default Middleware Instance
// ============================================

/**
 * Default API Key authentication middleware
 * Uses configuration from environment variables
 */
export const apiKeyAuth = createAuthMiddleware(loadConfigFromEnv());

// ============================================
// Role-Based Access Control
// ============================================

/**
 * Create middleware that requires specific roles
 */
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized: Authentication required',
        code: 'AUTHENTICATION_REQUIRED',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: roles,
        current: req.user.role,
      });
    }

    next();
  };
};

/**
 * Require admin role
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Rate limiting middleware for authentication endpoints
 * @deprecated Use the built-in rate limiting in createAuthMiddleware
 */
export const authRateLimit = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (isPublicRoute(req.path)) {
      return next();
    }

    const clientId = req.ip || 'unknown';
    const rateCheck = rateLimiter.check(clientId);

    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: 'Too many authentication attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: rateCheck.retryAfter,
      });
    }

    next();
  };
};

// ============================================
// Utility Functions
// ============================================

/**
 * Generate a secure API key
 */
export const generateApiKey = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Generate a JWT token (utility function)
 */
export const generateJwtToken = (
  userId: string,
  role: string,
  options?: { issuer?: string; audience?: string; expiresIn?: string }
): string | null => {
  if (!authConfig.jwtSecret) {
    console.error('[AUTH] JWT_SECRET not configured');
    return null;
  }

  const handler = new JwtHandler(authConfig.jwtSecret);
  const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
    sub: userId,
    role,
    iss: options?.issuer || authConfig.jwtIssuer,
    aud: options?.audience || authConfig.jwtAudience,
  };

  return handler.sign(payload, options?.expiresIn || authConfig.jwtExpiresIn || '24h');
};

/**
 * Get current authentication configuration
 */
export const getAuthConfig = (): Readonly<AuthConfig> => {
  return { ...authConfig };
};

/**
 * Update authentication configuration at runtime
 */
export const updateAuthConfig = (newConfig: Partial<AuthConfig>): void => {
  authConfig = { ...authConfig, ...newConfig };
};

/**
 * Export isPublicRoute for testing and external use
 */
export { isPublicRoute };

/**
 * Export JwtHandler for testing purposes
 */
export { JwtHandler };

// ============================================
// Export Types
// ============================================

// Update Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
