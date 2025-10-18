import Redis from 'ioredis';

/**
 * Redis Connection for BullMQ
 *
 * Shared Redis connection for job queues and caching.
 */
export const createRedisConnection = (): Redis => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required for BullMQ
    enableReadyCheck: false,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redis.on('error', (error) => {
    console.error('Redis connection error:', error);
  });

  redis.on('connect', () => {
    console.log('Redis connected successfully');
  });

  return redis;
};

/**
 * Get Redis connection options for BullMQ
 */
export const getRedisConnectionOptions = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  return {
    host: new URL(redisUrl).hostname,
    port: parseInt(new URL(redisUrl).port || '6379'),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
};
