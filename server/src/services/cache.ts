/**
 * Memory Cache Service
 *
 * 高性能内存缓存实现，支持TTL、LRU驱逐、统计监控
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccessedAt: number;
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  currentSize: number;
  currentEntries: number;
  hitRate?: number; // Cache hit rate (0-1)
}

interface CacheConfig {
  maxSize?: number; // Maximum cache size in bytes (default: 50MB)
  maxEntries?: number; // Maximum number of entries (default: 1000)
  defaultTTL?: number; // Default TTL in milliseconds (default: 5 minutes)
  cleanupInterval?: number; // Cleanup interval in milliseconds (default: 1 minute)
}

export class MemoryCacheService {
  private cache: Map<string, CacheEntry<any>>;
  private stats: CacheStats;
  private config: Required<CacheConfig>;
  private cleanupTimer: NodeJS.Timeout | null;

  constructor(config: CacheConfig = {}) {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      currentSize: 0,
      currentEntries: 0
    };
    this.config = {
      maxSize: config.maxSize || 50 * 1024 * 1024, // 50MB
      maxEntries: config.maxEntries || 1000,
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes
      cleanupInterval: config.cleanupInterval || 60 * 1000 // 1 minute
    };

    // Start periodic cleanup
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return undefined;
    }

    // Update access stats (LRU)
    entry.accessCount++;
    entry.lastAccessedAt = Date.now();

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set value in cache with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    // Calculate entry size (rough estimation)
    const size = this.calculateSize(value);

    // Check if we need to evict entries
    this.ensureCapacity(size);

    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + (ttl || this.config.defaultTTL),
      accessCount: 0,
      lastAccessedAt: Date.now(),
      size
    };

    // Remove old entry if exists
    const oldEntry = this.cache.get(key);
    if (oldEntry) {
      this.stats.currentSize -= oldEntry.size;
    }

    this.cache.set(key, entry);
    this.stats.currentSize += size;
    this.stats.currentEntries = this.cache.size;
    this.stats.sets++;

    return true;
  }

  /**
   * Delete entry from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    this.stats.currentSize -= entry.size;
    this.cache.delete(key);
    this.stats.currentEntries = this.cache.size;
    this.stats.deletes++;

    return true;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const oldSize = this.stats.currentSize;
    this.cache.clear();
    this.stats.currentSize = 0;
    this.stats.currentEntries = 0;
    this.stats.deletes += oldSize > 0 ? 1 : 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    } as CacheStats & { hitRate: number };
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let evictedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.delete(key);
        evictedCount++;
      }
    }

    if (evictedCount > 0) {
      this.stats.evictions += evictedCount;
    }
  }

  /**
   * Ensure cache has enough capacity, evict LRU entries if needed
   */
  private ensureCapacity(requiredSize: number): void {
    // Check size limit
    while (this.stats.currentSize + requiredSize > this.config.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    // Check entries limit
    while (this.cache.size >= this.config.maxEntries && this.cache.size > 0) {
      this.evictLRU();
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessedAt < lruTime) {
        lruTime = entry.lastAccessedAt;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.delete(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * Calculate approximate size of a value in bytes
   */
  private calculateSize(value: any): number {
    if (value === null || value === undefined) return 0;

    try {
      // Rough estimation: JSON string length * 2 (UTF-16)
      const str = JSON.stringify(value);
      return str.length * 2;
    } catch {
      // Fallback estimation
      return 100;
    }
  }

  /**
   * Destroy cache service
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }

  /**
   * Get cache keys matching a pattern
   */
  keys(pattern?: RegExp): string[] {
    const allKeys = Array.from(this.cache.keys());
    if (!pattern) return allKeys;
    return allKeys.filter(key => pattern.test(key));
  }

  /**
   * Get multiple entries at once
   */
  getMany<T>(keys: string[]): Map<string, T> {
    const result = new Map<string, T>();
    for (const key of keys) {
      const value = this.get<T>(key);
      if (value !== undefined) {
        result.set(key, value);
      }
    }
    return result;
  }

  /**
   * Set multiple entries at once
   */
  setMany<T>(entries: Map<string, T>, ttl?: number): void {
    for (const [key, value] of entries.entries()) {
      this.set(key, value, ttl);
    }
  }

  /**
   * Delete multiple entries at once
   */
  deleteMany(keys: string[]): number {
    let deleted = 0;
    for (const key of keys) {
      if (this.delete(key)) {
        deleted++;
      }
    }
    return deleted;
  }
}

// Global cache instance
let globalCache: MemoryCacheService | null = null;

export const getGlobalCache = (): MemoryCacheService => {
  if (!globalCache) {
    globalCache = new MemoryCacheService();
  }
  return globalCache;
};

export const destroyGlobalCache = (): void => {
  if (globalCache) {
    globalCache.destroy();
    globalCache = null;
  }
};
