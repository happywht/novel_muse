/**
 * Authentication Middleware Tests
 * Tests for JWT and API Key dual authentication mode
 */

import { Request, Response, NextFunction } from 'express';
import {
  createAuthMiddleware,
  AuthConfig,
  JwtPayload,
  generateApiKey,
  generateJwtToken,
  requireRole,
  PUBLIC_ROUTES,
  isPublicRoute,
  JwtHandler,
} from '../middleware/auth';

// Mock Express objects
const mockRequest = (overrides: Partial<Request> = {}): Partial<Request> => ({
  headers: {},
  path: '/test',
  ip: '127.0.0.1',
  ...overrides,
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {
    statusCode: 200,
    json: jest.fn().mockReturnThis(),
    status: jest.fn().mockImplementation(function (this: Response, code: number) {
      this.statusCode = code;
      return this;
    }),
  };
  return res;
};

const mockNext = (): NextFunction => jest.fn();

describe('Authentication Middleware', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.AUTH_ENABLED;
    delete process.env.AUTH_MODE;
    delete process.env.API_KEYS;
    delete process.env.JWT_SECRET;
    delete process.env.SKIP_AUTH;
  });

  describe('createAuthMiddleware', () => {
    it('should skip authentication when disabled', () => {
      const config: AuthConfig = {
        enabled: false,
        mode: 'api-key',
      };

      const middleware = createAuthMiddleware(config);
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user?.id).toBe('anonymous');
    });

    it('should allow public routes', () => {
      const config: AuthConfig = {
        enabled: true,
        mode: 'api-key',
        apiKeys: ['test-key'],
      };

      const middleware = createAuthMiddleware(config);
      const req = mockRequest({ path: '/health' }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('API Key Authentication', () => {
    it('should authenticate with valid API key', () => {
      const config: AuthConfig = {
        enabled: true,
        mode: 'api-key',
        apiKeys: ['valid-api-key'],
      };

      const middleware = createAuthMiddleware(config);
      const req = mockRequest({
        headers: { 'x-api-key': 'valid-api-key' },
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user?.authMethod).toBe('api-key');
    });

    it('should reject invalid API key', () => {
      const config: AuthConfig = {
        enabled: true,
        mode: 'api-key',
        apiKeys: ['valid-api-key'],
      };

      const middleware = createAuthMiddleware(config);
      const req = mockRequest({
        headers: { 'x-api-key': 'invalid-key' },
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should reject missing API key', () => {
      const config: AuthConfig = {
        enabled: true,
        mode: 'api-key',
        apiKeys: ['valid-api-key'],
      };

      const middleware = createAuthMiddleware(config);
      const req = mockRequest() as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('JWT Authentication', () => {
    it('should authenticate with valid JWT token', () => {
      const secret = 'test-jwt-secret';
      const config: AuthConfig = {
        enabled: true,
        mode: 'jwt',
        jwtSecret: secret,
      };

      const middleware = createAuthMiddleware(config);

      // Generate a valid token using the exported JwtHandler
      const handler = new JwtHandler(secret);
      const token = handler.sign({ sub: 'user-123', role: 'admin' });

      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user?.authMethod).toBe('jwt');
      expect(req.user?.id).toBe('user-123');
    });

    it('should reject invalid JWT token', () => {
      const config: AuthConfig = {
        enabled: true,
        mode: 'jwt',
        jwtSecret: 'test-secret',
      };

      const middleware = createAuthMiddleware(config);
      const req = mockRequest({
        headers: { authorization: 'Bearer invalid-token' },
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('Dual Mode (Both)', () => {
    it('should authenticate with API key in dual mode', () => {
      const config: AuthConfig = {
        enabled: true,
        mode: 'both',
        apiKeys: ['test-key'],
        jwtSecret: 'test-secret',
      };

      const middleware = createAuthMiddleware(config);
      const req = mockRequest({
        headers: { 'x-api-key': 'test-key' },
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user?.authMethod).toBe('api-key');
    });

    it('should authenticate with JWT in dual mode', () => {
      const secret = 'test-jwt-secret';
      const config: AuthConfig = {
        enabled: true,
        mode: 'both',
        apiKeys: ['test-key'],
        jwtSecret: secret,
      };

      const middleware = createAuthMiddleware(config);

      // Generate a valid token using the exported JwtHandler
      const handler = new JwtHandler(secret);
      const token = handler.sign({ sub: 'user-456', role: 'user' });

      const req = mockRequest({
        headers: { authorization: `Bearer ${token}` },
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user?.authMethod).toBe('jwt');
    });
  });

  describe('Rate Limiting', () => {
    it('should block after too many failed attempts', () => {
      const config: AuthConfig = {
        enabled: true,
        mode: 'api-key',
        apiKeys: ['valid-key'],
      };

      const middleware = createAuthMiddleware(config);
      const res = mockResponse() as Response;

      // Simulate multiple failed attempts
      for (let i = 0; i < 15; i++) {
        const req = mockRequest({
          headers: { 'x-api-key': 'wrong-key' },
          ip: '10.0.0.1',
        }) as Request;
        const next = mockNext();
        middleware(req, res, next);
      }

      // The 16th attempt should be rate limited
      const req = mockRequest({
        headers: { 'x-api-key': 'valid-key' }, // Even with valid key
        ip: '10.0.0.1',
      }) as Request;
      const next = mockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('Role-Based Access Control', () => {
    it('should allow access with correct role', () => {
      const middleware = requireRole(['admin', 'user']);
      const req = mockRequest({
        user: { id: 'user-1', role: 'admin', authMethod: 'jwt' },
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should deny access with incorrect role', () => {
      const middleware = requireRole(['admin']);
      const req = mockRequest({
        user: { id: 'user-1', role: 'user', authMethod: 'jwt' },
      }) as Request;
      const res = mockResponse() as Response;
      const next = mockNext();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('Utility Functions', () => {
    it('should generate secure API key', () => {
      const key = generateApiKey();
      expect(key).toBeDefined();
      expect(key.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should identify public routes correctly', () => {
      expect(isPublicRoute('/health')).toBe(true);
      expect(isPublicRoute('/api/health')).toBe(true);
      expect(isPublicRoute('/inkos/health')).toBe(true);
      expect(isPublicRoute('/inkos/genres')).toBe(true);
      expect(isPublicRoute('/protected')).toBe(false);
      expect(isPublicRoute('/api/projects')).toBe(false);
    });
  });
});
