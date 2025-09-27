import { getEnv } from '../../utils/helpers.js';
import { logger } from '../../utils/logger.js';

// Define cache entry interface
interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

/**
 * Simple in-memory cache implementation
 */
export class Cache {
  private cache: Map<string, CacheEntry>;
  private defaultTtl: number; // Default TTL in milliseconds

  constructor() {
    this.cache = new Map<string, CacheEntry>();
    this.defaultTtl = this.parseTtlFromEnv(getEnv('WEB_SEARCH_CACHE_TTL') || '30'); // Default 30 minutes
    this.startCleanupInterval();
  }

  /**
   * Get value from cache
   * @param key Cache key
   * @returns Cached value or null if not found or expired
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set value in cache
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (optional, defaults to defaultTtl)
   */
  set(key: string, data: any, ttl?: number): void {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl
    };

    this.cache.set(key, entry);
    logger.debug('Cache entry set', { key, ttl: ttl || this.defaultTtl });
  }

  /**
   * Delete value from cache
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
    logger.debug('Cache entry deleted', { key });
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   * @returns Object with cache statistics
   */
  getStats(): { size: number; defaultTtl: number } {
    return {
      size: this.cache.size,
      defaultTtl: this.defaultTtl
    };
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      let expiredCount = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          this.cache.delete(key);
          expiredCount++;
        }
      }

      if (expiredCount > 0) {
        logger.debug('Cache cleanup completed', { expiredCount });
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Parse TTL from environment variable string
   * @param ttlStr TTL string in minutes
   * @returns TTL in milliseconds
   */
  private parseTtlFromEnv(ttlStr: string): number {
    try {
      const minutes = parseInt(ttlStr, 10);
      if (isNaN(minutes) || minutes <= 0) {
        return 30 * 60 * 1000; // Default to 30 minutes
      }
      return minutes * 60 * 1000; // Convert minutes to milliseconds
    } catch (error) {
      logger.warn('Error parsing cache TTL from environment, using default', { error });
      return 30 * 60 * 1000; // Default to 30 minutes
    }
  }
}