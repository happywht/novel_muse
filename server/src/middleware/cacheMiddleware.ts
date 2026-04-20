import { Request, Response, NextFunction } from 'express';
import { getGlobalCache, MemoryCacheService } from '../services/cache';

/**
 * Cache configuration for specific endpoints
 */
interface CacheConfig {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  enabled?: boolean; // Enable/disable caching (default: true)
  keyGenerator?: (req: Request) => string; // Custom cache key generator
  invalidateOnWrite?: boolean; // Invalidate cache on write operations (default: false)
}

/**
 * Generate cache key from request
 */
const generateCacheKey = (req: Request): string => {
  const parts = [
    req.method,
    req.path,
    req.originalUrl,
    // Sort query parameters for consistent key generation
    Object.keys(req.query)
      .sort()
      .map(key => `${key}=${req.query[key]}`)
      .join('&')
  ];

  // Include request body for POST/PUT/PATCH (only for idempotent operations)
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const bodyKeys = Object.keys(req.body)
      .sort()
      .filter(key => typeof req.body[key] !== 'object' && req.body[key] !== undefined)
      .map(key => `${key}=${req.body[key]}`)
      .join('&');
    parts.push(bodyKeys);
  }

  return parts.join(':');
};

/**
 * Check if request should be cached
 */
const shouldCacheRequest = (req: Request): boolean => {
  // Only cache GET requests
  if (req.method !== 'GET') return false;

  // Don't cache if there's an authorization header (user-specific data)
  if (req.headers.authorization) return false;

  // Don't cache if there's a session cookie
  if (req.headers.cookie && req.headers.cookie.includes('session')) return false;

  return true;
};

/**
 * Parse cache duration string (e.g., "5m", "1h", "30s")
 */
const parseDuration = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 5 * 60 * 1000; // Default 5 minutes

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default: return 5 * 60 * 1000;
  }
};

/**
 * Cache middleware for Express routes
 */
export const cacheMiddleware = (config: CacheConfig = {}) => {
  const cache = getGlobalCache();
  const ttl = config.ttl || 5 * 60 * 1000; // Default 5 minutes
  const enabled = config.enabled !== false; // Default enabled

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip if caching is disabled
    if (!enabled) {
      return next();
    }

    // Check if request should be cached
    if (!shouldCacheRequest(req)) {
      return next();
    }

    // Generate cache key
    const cacheKey = config.keyGenerator
      ? config.keyGenerator(req)
      : generateCacheKey(req);

    // Check cache
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      console.log(`✅ Cache HIT: ${req.method} ${req.path}`);
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }

    console.log(`❌ Cache MISS: ${req.method} ${req.path}`);
    res.setHeader('X-Cache', 'MISS');

    // Intercept response.json to cache the result
    const originalJson = res.json.bind(res);

    res.json = function(data: any) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          cache.set(cacheKey, data, ttl);
          console.log(`💾 Cached response for: ${req.method} ${req.path}`);
        } catch (error) {
          console.error('Failed to cache response:', error);
        }
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Invalidate cache for specific pattern
 */
export const invalidateCache = (pattern: RegExp | string) => {
  const cache = getGlobalCache();

  if (typeof pattern === 'string') {
    cache.delete(pattern);
  } else {
    const keys = cache.keys(pattern);
    cache.deleteMany(keys);
    console.log(`🗑️ Invalidated ${keys.length} cache entries matching pattern: ${pattern}`);
  }
};

/**
 * Decorator for caching async functions
 */
export const cached = (config: CacheConfig = {}) => {
  const cache = getGlobalCache();
  const ttl = config.ttl || 5 * 60 * 1000;

  return (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      // Generate cache key from function arguments
      const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;

      // Check cache
      const cachedResult = cache.get(cacheKey);
      if (cachedResult !== undefined) {
        console.log(`✅ Cache HIT: ${target.constructor.name}.${propertyKey}`);
        return cachedResult;
      }

      console.log(`❌ Cache MISS: ${target.constructor.name}.${propertyKey}`);

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Cache result
      try {
        cache.set(cacheKey, result, ttl);
        console.log(`💾 Cached result for: ${target.constructor.name}.${propertyKey}`);
      } catch (error) {
        console.error('Failed to cache function result:', error);
      }

      return result;
    };

    return descriptor;
  };
};

/**
 * Cache statistics endpoint
 */
export const getCacheStats = (req: Request, res: Response) => {
  const cache = getGlobalCache();
  const stats = cache.getStats();

  res.json({
    success: true,
    data: {
      ...stats,
      hitRate: `${((stats.hitRate || 0) * 100).toFixed(2)}%`,
      efficiency: stats.hits > 0
        ? `${((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(2)}%`
        : 'N/A'
    }
  });
};

/**
 * Clear all cache
 */
export const clearAllCache = (req: Request, res: Response) => {
  const cache = getGlobalCache();
  cache.clear();

  res.json({
    success: true,
    message: 'All cache cleared'
  });
};

/**
 * Cache invalidation middleware for write operations
 */
export const invalidateOnWrite = (pattern: string | RegExp) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Intercept response after successful write
    const originalJson = res.json.bind(res);

    res.json = function(data: any) {
      // Invalidate cache on successful write (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidateCache(pattern);
      }

      return originalJson(data);
    };

    next();
  };
};

/**
 * Predefined cache configurations for common scenarios
 */
export const CachePresets = {
  // Short-lived cache for frequently changing data (1 minute)
  SHORT: { ttl: 1 * 60 * 1000 },

  // Medium cache for moderately changing data (5 minutes)
  MEDIUM: { ttl: 5 * 60 * 1000 },

  // Long cache for rarely changing data (30 minutes)
  LONG: { ttl: 30 * 60 * 1000 },

  // Very long cache for static data (1 hour)
  VERY_LONG: { ttl: 60 * 60 * 1000 },

  // No caching (disabled)
  DISABLED: { enabled: false }
};

// Re-export getGlobalCache for convenience
export { getGlobalCache, type MemoryCacheService } from '../services/cache';
