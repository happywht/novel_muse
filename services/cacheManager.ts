/**
 * Cache Manager Service
 * 
 * Provides configurable in-memory caching with TTL support.
 * Respects global configuration for cache.enabled and cache.ttl.
 */

import { getGlobalConfig } from './gemini/core';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
    key: string;
}

interface CacheStats {
    hits: number;
    misses: number;
    size: number;
    enabled: boolean;
}

/**
 * Generate a hash key from parameters for caching
 */
export const generateCacheKey = (...parts: (string | number | object | undefined | null)[]): string => {
    const normalized = parts
        .filter(p => p !== undefined && p !== null)
        .map(p => {
            if (typeof p === 'object') {
                try {
                    // Sort object keys for consistent hashing
                    return JSON.stringify(p, Object.keys(p).sort());
                } catch {
                    return String(p);
                }
            }
            return String(p);
        })
        .join('|');
    
    // Simple hash function for consistent keys
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
        const char = normalized.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return `cache_${Math.abs(hash).toString(36)}`;
};

/**
 * Cache Manager Class
 * 
 * Manages in-memory cache with TTL and configuration support.
 */
class CacheManager {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        size: 0,
        enabled: true
    };

    /**
     * Get a value from cache if it exists and is valid
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            const config = await getGlobalConfig();
            
            // Check if cache is disabled
            if (!config.performance.cache.enabled) {
                this.stats.enabled = false;
                return null;
            }
            
            this.stats.enabled = true;
            const cached = this.cache.get(key);
            
            if (!cached) {
                this.stats.misses++;
                return null;
            }
            
            // Check TTL expiration
            const age = Date.now() - cached.timestamp;
            if (age > config.performance.cache.ttl) {
                this.cache.delete(key);
                this.stats.size = this.cache.size;
                this.stats.misses++;
                return null;
            }
            
            this.stats.hits++;
            return cached.data as T;
        } catch (error) {
            console.warn('Cache get error:', error);
            return null;
        }
    }

    /**
     * Set a value in cache
     */
    async set<T>(key: string, data: T): Promise<void> {
        try {
            const config = await getGlobalConfig();
            
            // Don't cache if disabled
            if (!config.performance.cache.enabled) {
                return;
            }
            
            this.cache.set(key, {
                data,
                timestamp: Date.now(),
                key
            });
            
            this.stats.size = this.cache.size;
        } catch (error) {
            console.warn('Cache set error:', error);
        }
    }

    /**
     * Get or compute - returns cached value if exists, otherwise computes and caches
     */
    async getOrCompute<T>(
        key: string,
        computeFn: () => Promise<T>
    ): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }
        
        const result = await computeFn();
        await this.set(key, result);
        return result;
    }

    /**
     * Delete a specific cache entry
     */
    delete(key: string): boolean {
        const result = this.cache.delete(key);
        this.stats.size = this.cache.size;
        return result;
    }

    /**
     * Clear all cache entries
     */
    clear(): void {
        this.cache.clear();
        this.stats.size = 0;
    }

    /**
     * Clear expired entries (cleanup)
     */
    async clearExpired(): Promise<number> {
        try {
            const config = await getGlobalConfig();
            const ttl = config.performance.cache.ttl;
            const now = Date.now();
            let cleared = 0;
            
            for (const [key, entry] of this.cache.entries()) {
                if (now - entry.timestamp > ttl) {
                    this.cache.delete(key);
                    cleared++;
                }
            }
            
            this.stats.size = this.cache.size;
            return cleared;
        } catch (error) {
            console.warn('Cache cleanup error:', error);
            return 0;
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): CacheStats {
        return { ...this.stats };
    }

    /**
     * Check if caching is enabled
     */
    async isEnabled(): Promise<boolean> {
        try {
            const config = await getGlobalConfig();
            return config.performance.cache.enabled;
        } catch {
            return false;
        }
    }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Export for testing
export { CacheManager };
