import { Request, Response, NextFunction } from 'express';

// 公开路由白名单（不需要认证的路由）
// 注意：由于中间件挂载在 /api 上，req.path 不包含 /api 前缀
export const PUBLIC_ROUTES = [
  '/health',               // 健康检查端点（相对路径，不含 /api 前缀）
  '/api/health',           // 兼容完整路径
  '/inkos/health',         // inkos 健康检查
  '/inkos/genres',         // inkos 类型列表（只读）
  '/inkos/dimensions',     // inkos 审计维度列表（只读）
];

// 检查路径是否匹配公开路由
const isPublicRoute = (path: string): boolean => {
  return PUBLIC_ROUTES.some(route => path === route || path.startsWith(route + '/'));
};

// API Key 认证中间件
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  // 检查是否为公开路由
  if (isPublicRoute(req.path)) {
    return next();
  }

  // 开发环境可配置跳过认证
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    req.user = { id: 'dev-user', role: 'admin' };
    return next();
  }

  const apiKey = req.headers['x-api-key'] as string | undefined;

  // 从环境变量获取有效的 API Keys
  const validKeys = (process.env.API_KEYS || '')
    .split(',')
    .map(key => key.trim())
    .filter(Boolean);

  // 如果没有配置任何 API Keys
  if (validKeys.length === 0) {
    // 生产环境必须配置 API Keys
    if (process.env.NODE_ENV === 'production') {
      console.error('SECURITY WARNING: No API_KEYS configured in production environment');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    // 开发环境允许通过（但记录警告）
    console.warn('WARNING: No API_KEYS configured. Authentication is disabled.');
    req.user = { id: 'unauthenticated', role: 'user' };
    return next();
  }

  // 验证 API Key
  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized: Missing API key',
      code: 'MISSING_API_KEY'
    });
  }

  if (!validKeys.includes(apiKey)) {
    // 记录失败的认证尝试（安全审计）
    console.warn(`Authentication failed for IP: ${req.ip}, Path: ${req.path}`);
    return res.status(401).json({
      error: 'Unauthorized: Invalid API key',
      code: 'INVALID_API_KEY'
    });
  }

  // 认证成功
  req.user = { id: 'api-user', role: 'admin' };
  next();
};

// 可选：更细粒度的权限控制中间件
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized: Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// 速率限制辅助函数（可选，用于防止暴力破解）
export const authRateLimit = () => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    // 跳过公开路由和已认证的请求
    if (isPublicRoute(req.path)) {
      return next();
    }

    const clientIp = req.ip || 'unknown';
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15分钟窗口
    const maxAttempts = 10;

    const attempt = attempts.get(clientIp);

    if (attempt) {
      if (now > attempt.resetTime) {
        // 重置窗口
        attempts.set(clientIp, { count: 1, resetTime: now + windowMs });
      } else if (attempt.count >= maxAttempts) {
        return res.status(429).json({
          error: 'Too many authentication attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((attempt.resetTime - now) / 1000)
        });
      } else {
        attempt.count++;
      }
    } else {
      attempts.set(clientIp, { count: 1, resetTime: now + windowMs });
    }

    next();
  };
};
