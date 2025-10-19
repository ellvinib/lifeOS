import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import {
  IJobQueue,
  Job,
  JobOptions,
  JobHandler,
  JobState,
  QueueStats,
} from '@lifeos/core/jobs';
import { Result } from '@lifeos/core/shared/result';
import { BaseError } from '@lifeos/core/shared/errors';

/**
 * BullMQ Adapter
 *
 * Redis-backed job queue implementation using BullMQ.
 * Provides reliable background job processing with retries, priorities, and scheduling.
 *
 * Features:
 * - Redis persistence (jobs survive restarts)
 * - Automatic retries with exponential backoff
 * - Priority queues
 * - Delayed/scheduled jobs
 * - Job progress tracking
 * - Dead letter queue for failed jobs
 */
export class BullMQAdapter implements IJobQueue {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }

  /**
   * Initialize the job queue (test Redis connection)
   */
  async initialize(): Promise<void> {
    try {
      // Test Redis connection
      await this.redis.ping();
      console.log('  ✅ Job queue connected to Redis');
    } catch (error) {
      console.error('  ❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Add job to queue
   */
  async add<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobOptions
  ): Promise<Result<Job<T>, BaseError>> {
    try {
      const queue = this.getOrCreateQueue(queueName);

      const bullJob = await queue.add(jobName, data, {
        priority: options?.priority,
        delay: options?.delay,
        attempts: options?.attempts || 3,
        backoff: options?.backoff
          ? {
              type: options.backoff.type,
              delay: options.backoff.delay,
            }
          : {
              type: 'exponential',
              delay: 5000,
            },
        timeout: options?.timeout || 300000,
        removeOnComplete: options?.removeOnComplete || false,
        removeOnFail: options?.removeOnFail || false,
      });

      const job = await this.mapBullJobToJob<T>(bullJob, queueName);
      return Result.ok(job);
    } catch (error) {
      return Result.fail(
        new BaseError(
          `Failed to add job to queue "${queueName}"`,
          'JOB_ADD_ERROR',
          500,
          {},
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * Process jobs from queue
   */
  async process<T = any>(
    queueName: string,
    jobName: string,
    handler: JobHandler<T>
  ): Promise<Result<void, BaseError>> {
    try {
      const workerKey = `${queueName}:${jobName}`;

      // Check if worker already exists
      if (this.workers.has(workerKey)) {
        return Result.ok(undefined);
      }

      // Create worker
      const worker = new Worker(
        queueName,
        async (bullJob) => {
          // Only process jobs with matching name
          if (bullJob.name !== jobName) {
            return;
          }

          const job = await this.mapBullJobToJob<T>(bullJob, queueName);
          await handler(job);
        },
        {
          connection: this.redis,
          concurrency: 5,
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 1000 },
        }
      );

      // Error handling
      worker.on('failed', (job, err) => {
        console.error(`Job ${job?.id} in queue ${queueName} failed:`, err);
      });

      worker.on('error', (err) => {
        console.error(`Worker error in queue ${queueName}:`, err);
      });

      this.workers.set(workerKey, worker);

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new BaseError(
          `Failed to process queue "${queueName}"`,
          'JOB_PROCESS_ERROR',
          500,
          {},
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * Get job by ID
   */
  async getJob<T = any>(
    queueName: string,
    jobId: string
  ): Promise<Result<Job<T>, BaseError>> {
    try {
      const queue = this.getOrCreateQueue(queueName);
      const bullJob = await queue.getJob(jobId);

      if (!bullJob) {
        return Result.fail(
          new BaseError(`Job ${jobId} not found in queue ${queueName}`, 'JOB_NOT_FOUND', 404)
        );
      }

      const job = await this.mapBullJobToJob<T>(bullJob, queueName);
      return Result.ok(job);
    } catch (error) {
      return Result.fail(
        new BaseError(
          `Failed to get job ${jobId}`,
          'JOB_GET_ERROR',
          500,
          {},
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * Remove job from queue
   */
  async removeJob(queueName: string, jobId: string): Promise<Result<void, BaseError>> {
    try {
      const queue = this.getOrCreateQueue(queueName);
      const bullJob = await queue.getJob(jobId);

      if (bullJob) {
        await bullJob.remove();
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new BaseError(
          `Failed to remove job ${jobId}`,
          'JOB_REMOVE_ERROR',
          500,
          {},
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * Retry failed job
   */
  async retryJob(queueName: string, jobId: string): Promise<Result<void, BaseError>> {
    try {
      const queue = this.getOrCreateQueue(queueName);
      const bullJob = await queue.getJob(jobId);

      if (!bullJob) {
        return Result.fail(
          new BaseError(`Job ${jobId} not found`, 'JOB_NOT_FOUND', 404)
        );
      }

      await bullJob.retry();
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new BaseError(
          `Failed to retry job ${jobId}`,
          'JOB_RETRY_ERROR',
          500,
          {},
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<Result<QueueStats, BaseError>> {
    try {
      const queue = this.getOrCreateQueue(queueName);

      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.getPausedCount(),
      ]);

      const stats: QueueStats = {
        name: queueName,
        counts: {
          waiting,
          active,
          completed,
          failed,
          delayed,
          paused,
        },
        metrics: {
          throughput: 0, // TODO: Calculate from completed jobs
          avgProcessingTime: 0, // TODO: Calculate from job metrics
          failureRate: failed / (completed + failed || 1),
        },
        status: paused > 0 ? 'paused' : 'active',
      };

      return Result.ok(stats);
    } catch (error) {
      return Result.fail(
        new BaseError(
          `Failed to get queue stats for ${queueName}`,
          'QUEUE_STATS_ERROR',
          500,
          {},
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(queueName: string): Promise<Result<void, BaseError>> {
    try {
      const queue = this.getOrCreateQueue(queueName);
      await queue.pause();
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new BaseError(
          `Failed to pause queue ${queueName}`,
          'QUEUE_PAUSE_ERROR',
          500,
          {},
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(queueName: string): Promise<Result<void, BaseError>> {
    try {
      const queue = this.getOrCreateQueue(queueName);
      await queue.resume();
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new BaseError(
          `Failed to resume queue ${queueName}`,
          'QUEUE_RESUME_ERROR',
          500,
          {},
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * Close all queues and connections
   */
  async close(): Promise<Result<void, BaseError>> {
    try {
      // Close all workers
      await Promise.all(
        Array.from(this.workers.values()).map((worker) => worker.close())
      );

      // Close all queues
      await Promise.all(
        Array.from(this.queues.values()).map((queue) => queue.close())
      );

      // Close all queue events
      await Promise.all(
        Array.from(this.queueEvents.values()).map((qe) => qe.close())
      );

      // Close Redis connection
      await this.redis.quit();

      // Clear maps
      this.workers.clear();
      this.queues.clear();
      this.queueEvents.clear();

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new BaseError(
          'Failed to close job queue',
          'QUEUE_CLOSE_ERROR',
          500,
          {},
          error instanceof Error ? error : undefined
        )
      );
    }
  }

  /**
   * Get or create queue instance
   */
  private getOrCreateQueue(queueName: string): Queue {
    let queue = this.queues.get(queueName);

    if (!queue) {
      queue = new Queue(queueName, {
        connection: this.redis,
        defaultJobOptions: {
          removeOnComplete: false,
          removeOnFail: false,
        },
      });

      this.queues.set(queueName, queue);

      // Create queue events listener
      const queueEvents = new QueueEvents(queueName, {
        connection: this.redis,
      });
      this.queueEvents.set(queueName, queueEvents);
    }

    return queue;
  }

  /**
   * Map BullMQ job to our Job interface
   */
  private async mapBullJobToJob<T>(bullJob: any, queueName: string): Promise<Job<T>> {
    const state = await this.getJobState(bullJob);

    return {
      id: bullJob.id!,
      queue: queueName,
      name: bullJob.name,
      data: bullJob.data as T,
      state,
      progress: bullJob.progress || 0,
      attemptsMade: bullJob.attemptsMade || 0,
      attemptsMax: bullJob.opts.attempts || 3,
      timestamps: {
        created: new Date(bullJob.timestamp),
        processed: bullJob.processedOn ? new Date(bullJob.processedOn) : undefined,
        completed: bullJob.finishedOn ? new Date(bullJob.finishedOn) : undefined,
        failed: bullJob.failedReason ? new Date(bullJob.finishedOn || Date.now()) : undefined,
      },
      failedReason: bullJob.failedReason,
      stacktrace: bullJob.stacktrace,
      updateProgress: async (progress: number) => {
        await bullJob.updateProgress(progress);
      },
      log: (message: string) => {
        bullJob.log(message);
      },
    };
  }

  /**
   * Get job state from BullMQ job
   */
  private async getJobState(bullJob: any): Promise<JobState> {
    const state = await bullJob.getState();

    switch (state) {
      case 'waiting':
        return 'waiting';
      case 'active':
        return 'active';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'delayed':
        return 'delayed';
      case 'paused':
        return 'paused';
      default:
        return 'waiting';
    }
  }
}
