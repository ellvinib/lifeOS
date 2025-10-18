import Redis from 'ioredis';
import { ICacheService, CacheOptions } from './ICacheService';

/**
 * Redis Cache Service
 *
 * Implementation of ICacheService using Redis
 */
export class RedisCacheService implements ICacheService {
  private redis: Redis;
  private defaultTTL: number;
  private keyPrefix: string;

  /**
   * Create a new Redis cache service
   *
   * @param redis - Redis client instance
   * @param defaultTTL - Default TTL in seconds (default: 5 minutes)
   * @param keyPrefix - Default key prefix (default: 'lifeos:')
   */
  constructor(
    redis: Redis,
    defaultTTL: number = 300, // 5 minutes
    keyPrefix: string = 'lifeos:'
  ) {
    this.redis = redis;
    this.defaultTTL = defaultTTL;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Build full cache key with prefix
   */
  private buildKey(key: string, prefix?: string): string {
    const finalPrefix = prefix ?? this.keyPrefix;
    return `${finalPrefix}${key}`;
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const fullKey = this.buildKey(key);
      const value = await this.redis.get(fullKey);

      if (value === null) {
        return null;
      }

      // Try to parse as JSON, fallback to raw string
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    } catch (error) {
      console.error(`[RedisCacheService] Error getting key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const fullKey = this.buildKey(key, options?.prefix);
      const ttl = options?.ttl ?? this.defaultTTL;
      const json = options?.json ?? true;

      const serialized = json ? JSON.stringify(value) : String(value);

      if (ttl > 0) {
        await this.redis.setex(fullKey, ttl, serialized);
      } else {
        await this.redis.set(fullKey, serialized);
      }
    } catch (error) {
      console.error(`[RedisCacheService] Error setting key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.buildKey(key);
      await this.redis.del(fullKey);
    } catch (error) {
      console.error(`[RedisCacheService] Error deleting key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const fullPattern = this.buildKey(pattern);
      const keys = await this.redis.keys(fullPattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error(
        `[RedisCacheService] Error deleting pattern ${pattern}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const fullKey = this.buildKey(key);
      const result = await this.redis.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error(`[RedisCacheService] Error checking existence of key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  async getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    try {
      // Try to get from cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // If not in cache, generate value
      const value = await factory();

      // Cache the generated value
      await this.set(key, value, options);

      return value;
    } catch (error) {
      console.error(`[RedisCacheService] Error in getOrSet for key ${key}:`, error);
      // If cache fails, still return the factory result
      return factory();
    }
  }

  /**
   * Increment a numeric value
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      const fullKey = this.buildKey(key);
      return await this.redis.incrby(fullKey, amount);
    } catch (error) {
      console.error(`[RedisCacheService] Error incrementing key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get remaining time-to-live for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      const fullKey = this.buildKey(key);
      return await this.redis.ttl(fullKey);
    } catch (error) {
      console.error(`[RedisCacheService] Error getting TTL for key ${key}:`, error);
      return -1;
    }
  }

  /**
   * Clear all cache entries with the configured prefix
   */
  async clear(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.keyPrefix}*`);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('[RedisCacheService] Error clearing cache:', error);
      throw error;
    }
  }

  /**
   * Close the cache connection
   */
  async disconnect(): Promise<void> {
    try {
      await this.redis.quit();
    } catch (error) {
      console.error('[RedisCacheService] Error disconnecting:', error);
      throw error;
    }
  }

  /**
   * Get the underlying Redis client
   * (for advanced operations not covered by ICacheService)
   */
  getClient(): Redis {
    return this.redis;
  }
}
