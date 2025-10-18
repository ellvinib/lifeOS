/**
 * Cache Service Interface
 *
 * Defines the contract for caching operations
 */

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /**
   * Time-to-live in seconds
   */
  ttl?: number;

  /**
   * Cache key prefix
   */
  prefix?: string;

  /**
   * Whether to serialize/deserialize JSON
   */
  json?: boolean;
}

/**
 * Cache Service Interface
 *
 * Provides abstraction over caching implementation (Redis, Memcached, etc.)
 */
export interface ICacheService {
  /**
   * Get a value from cache
   *
   * @param key - Cache key
   * @returns The cached value or null if not found
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * Set a value in cache
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options (TTL, etc.)
   */
  set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>;

  /**
   * Delete a value from cache
   *
   * @param key - Cache key
   */
  delete(key: string): Promise<void>;

  /**
   * Delete multiple keys matching a pattern
   *
   * @param pattern - Key pattern (supports wildcards)
   */
  deletePattern(pattern: string): Promise<void>;

  /**
   * Check if a key exists in cache
   *
   * @param key - Cache key
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get or set a value (cache-aside pattern)
   *
   * If the key exists, return the cached value.
   * If not, execute the factory function, cache the result, and return it.
   *
   * @param key - Cache key
   * @param factory - Function to generate the value if not cached
   * @param options - Cache options (TTL, etc.)
   */
  getOrSet<T = any>(
    key: string,
    factory: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T>;

  /**
   * Increment a numeric value
   *
   * @param key - Cache key
   * @param amount - Amount to increment by (default: 1)
   */
  increment(key: string, amount?: number): Promise<number>;

  /**
   * Get remaining time-to-live for a key
   *
   * @param key - Cache key
   * @returns TTL in seconds, or -1 if key doesn't exist, -2 if no expiry
   */
  ttl(key: string): Promise<number>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Close the cache connection
   */
  disconnect(): Promise<void>;
}
