import { Queue, Worker, JobsOptions } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { EventBus } from '@lifeOS/core/events';
import { getRedisConnectionOptions } from './redis';
import {
  RefreshAggregationsProcessor,
  RefreshAggregationsJobData,
} from './processors/RefreshAggregationsProcessor';
import {
  SyncBankTransactionsProcessor,
  SyncBankTransactionsJobData,
} from './processors/SyncBankTransactionsProcessor';

/**
 * Job Queue Names
 */
export enum JobQueueName {
  REFRESH_AGGREGATIONS = 'refresh-aggregations',
  SYNC_BANK_TRANSACTIONS = 'sync-bank-transactions',
}

/**
 * Job Queue Manager
 *
 * Manages all background job queues and workers.
 * Handles job scheduling, processing, and lifecycle.
 */
export class JobQueueManager {
  private queues: Map<JobQueueName, Queue> = new Map();
  private workers: Map<JobQueueName, Worker> = new Map();

  private refreshAggregationsProcessor: RefreshAggregationsProcessor;
  private syncBankTransactionsProcessor: SyncBankTransactionsProcessor;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus
  ) {
    this.refreshAggregationsProcessor = new RefreshAggregationsProcessor(
      this.prisma,
      this.eventBus
    );
    this.syncBankTransactionsProcessor = new SyncBankTransactionsProcessor(
      this.prisma,
      this.eventBus
    );
  }

  /**
   * Initialize all job queues and workers
   */
  async initialize(): Promise<void> {
    console.log('[JobQueueManager] Initializing job queues...');

    const redisConnection = getRedisConnectionOptions();

    // Create queues
    this.createQueue(JobQueueName.REFRESH_AGGREGATIONS, redisConnection);
    this.createQueue(JobQueueName.SYNC_BANK_TRANSACTIONS, redisConnection);

    // Create workers
    this.createWorker(
      JobQueueName.REFRESH_AGGREGATIONS,
      this.refreshAggregationsProcessor.process.bind(
        this.refreshAggregationsProcessor
      ),
      redisConnection
    );

    this.createWorker(
      JobQueueName.SYNC_BANK_TRANSACTIONS,
      this.syncBankTransactionsProcessor.process.bind(
        this.syncBankTransactionsProcessor
      ),
      redisConnection
    );

    // Schedule recurring jobs (BullMQ v5 handles scheduling automatically)
    await this.scheduleRecurringJobs();

    console.log('[JobQueueManager] Job queues initialized successfully');
  }

  /**
   * Create a queue
   */
  private createQueue(name: JobQueueName, connection: any): void {
    const queue = new Queue(name, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600, // 24 hours
          count: 100,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // 7 days
        },
      },
    });

    this.queues.set(name, queue);
    console.log(`[JobQueueManager] Created queue: ${name}`);
  }

  /**
   * Create a worker
   */
  private createWorker(name: JobQueueName, processor: any, connection: any): void {
    const worker = new Worker(name, processor, {
      connection,
      concurrency: 1, // Process one job at a time
      limiter: {
        max: 10, // Max 10 jobs
        duration: 1000, // Per second
      },
    });

    // Event handlers
    worker.on('completed', (job) => {
      console.log(`[${name}] Job ${job.id} completed`);
    });

    worker.on('failed', (job, error) => {
      console.error(`[${name}] Job ${job?.id} failed:`, error);
    });

    worker.on('error', (error) => {
      console.error(`[${name}] Worker error:`, error);
    });

    this.workers.set(name, worker);
    console.log(`[JobQueueManager] Created worker: ${name}`);
  }

  /**
   * Schedule recurring jobs
   */
  private async scheduleRecurringJobs(): Promise<void> {
    console.log('[JobQueueManager] Scheduling recurring jobs...');

    // Refresh aggregations - Daily at 2 AM
    const refreshQueue = this.queues.get(JobQueueName.REFRESH_AGGREGATIONS);
    if (refreshQueue) {
      await refreshQueue.add(
        'refresh-all-users',
        {},
        {
          repeat: {
            pattern: '0 2 * * *', // Cron: 2 AM daily
          },
          jobId: 'refresh-aggregations-daily',
        }
      );
      console.log('[JobQueueManager] Scheduled daily aggregation refresh at 2 AM');
    }

    // Sync bank transactions - Every 4 hours
    const syncQueue = this.queues.get(JobQueueName.SYNC_BANK_TRANSACTIONS);
    if (syncQueue) {
      await syncQueue.add(
        'sync-all-users',
        {},
        {
          repeat: {
            pattern: '0 */4 * * *', // Cron: Every 4 hours
          },
          jobId: 'sync-bank-transactions-4h',
        }
      );
      console.log('[JobQueueManager] Scheduled bank sync every 4 hours');
    }
  }

  /**
   * Add a refresh aggregations job for a specific user
   */
  async addRefreshAggregationsJob(
    data: RefreshAggregationsJobData,
    options?: JobsOptions
  ): Promise<void> {
    const queue = this.queues.get(JobQueueName.REFRESH_AGGREGATIONS);
    if (!queue) {
      throw new Error('Refresh aggregations queue not initialized');
    }

    await queue.add('refresh-user', data, options);
    console.log(`[JobQueueManager] Added refresh aggregations job for user ${data.userId}`);
  }

  /**
   * Add a sync bank transactions job for a specific user
   */
  async addSyncBankTransactionsJob(
    data: SyncBankTransactionsJobData,
    options?: JobsOptions
  ): Promise<void> {
    const queue = this.queues.get(JobQueueName.SYNC_BANK_TRANSACTIONS);
    if (!queue) {
      throw new Error('Sync bank transactions queue not initialized');
    }

    await queue.add('sync-user', data, options);
    console.log(
      `[JobQueueManager] Added sync bank transactions job for user ${data.userId}`
    );
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: JobQueueName): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
    };
  }

  /**
   * Shutdown all queues and workers
   */
  async shutdown(): Promise<void> {
    console.log('[JobQueueManager] Shutting down...');

    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      console.log(`[JobQueueManager] Closed worker: ${name}`);
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      console.log(`[JobQueueManager] Closed queue: ${name}`);
    }

    console.log('[JobQueueManager] Shutdown complete');
  }
}
