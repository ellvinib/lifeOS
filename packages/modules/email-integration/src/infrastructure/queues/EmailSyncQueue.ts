import { Queue, QueueOptions, JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';

/**
 * Email Sync Job Data
 *
 * Payload for email sync jobs in the queue
 */
export interface EmailSyncJobData {
  accountId: string;
  messageId?: string; // Optional: specific message to sync
  fullSync?: boolean; // If true, sync all emails (ignore lastSyncedAt)
}

/**
 * Email Sync Queue Configuration
 *
 * BullMQ queue for processing email sync jobs.
 *
 * Design Principles:
 * - Non-blocking: Webhook returns HTTP 202, job processes in background
 * - Concurrent: Multiple workers can process jobs in parallel
 * - Reliable: Failed jobs retried with exponential backoff
 * - Durable: Jobs persisted in Redis
 *
 * Performance:
 * - Concurrency: 5 workers per instance
 * - Max retries: 3
 * - Backoff: Exponential (1s, 2s, 4s)
 * - Job timeout: 60 seconds
 */
export class EmailSyncQueue {
  private readonly queue: Queue<EmailSyncJobData>;
  private readonly redis: Redis;

  constructor(
    redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379'
  ) {
    // Create Redis connection
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: false,
    });

    // Queue configuration
    const queueOptions: QueueOptions = {
      connection: this.redis,
      defaultJobOptions: this.getDefaultJobOptions(),
    };

    // Create queue
    this.queue = new Queue<EmailSyncJobData>('email-sync', queueOptions);

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Add email sync job to queue
   *
   * @param data - Job data
   * @param options - Job-specific options (override defaults)
   * @returns Job ID
   */
  async addSyncJob(
    data: EmailSyncJobData,
    options?: JobsOptions
  ): Promise<string> {
    const job = await this.queue.add('sync', data, options);
    return job.id!;
  }

  /**
   * Get default job options
   */
  private getDefaultJobOptions(): JobsOptions {
    return {
      // Retry configuration
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000, // 1s, 2s, 4s
      },

      // Timeout configuration
      timeout: 60000, // 60 seconds

      // Remove completed jobs after 1 hour (keep for debugging)
      removeOnComplete: {
        age: 3600, // 1 hour
        count: 1000, // Keep max 1000 completed jobs
      },

      // Keep failed jobs for 24 hours (for debugging)
      removeOnFail: {
        age: 86400, // 24 hours
      },
    };
  }

  /**
   * Setup event listeners for monitoring
   */
  private setupEventListeners(): void {
    this.queue.on('error', (error) => {
      console.error('[EmailSyncQueue] Queue error:', error);
    });

    this.queue.on('waiting', (job) => {
      console.log(`[EmailSyncQueue] Job ${job.id} waiting`);
    });

    this.queue.on('active', (job) => {
      console.log(`[EmailSyncQueue] Job ${job.id} started`);
    });

    this.queue.on('completed', (job) => {
      console.log(`[EmailSyncQueue] Job ${job.id} completed`);
    });

    this.queue.on('failed', (job, error) => {
      console.error(`[EmailSyncQueue] Job ${job?.id} failed:`, error);
    });
  }

  /**
   * Get queue instance (for worker)
   */
  getQueue(): Queue<EmailSyncJobData> {
    return this.queue;
  }

  /**
   * Close queue and Redis connection
   */
  async close(): Promise<void> {
    await this.queue.close();
    await this.redis.quit();
  }

  /**
   * Get queue stats
   */
  async getStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}
