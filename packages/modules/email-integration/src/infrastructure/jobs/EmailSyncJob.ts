import { Worker, Job, WorkerOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { SyncEmailsUseCase } from '../../application/use-cases/SyncEmailsUseCase';
import { EmailSyncJobData } from '../queues/EmailSyncQueue';

/**
 * Email Sync Worker
 *
 * BullMQ worker that processes email sync jobs from the queue.
 *
 * Design Principles:
 * - Concurrent: Multiple instances can run in parallel
 * - Resilient: Automatic retries on failure
 * - Observable: Logs job progress and metrics
 * - Isolated: Each job runs independently
 *
 * Performance:
 * - Concurrency: 5 jobs per worker
 * - Job timeout: 60 seconds
 * - Automatic retries: 3 attempts with exponential backoff
 */
export class EmailSyncWorker {
  private readonly worker: Worker<EmailSyncJobData>;
  private readonly redis: Redis;

  constructor(
    private readonly syncEmailsUseCase: SyncEmailsUseCase,
    redisUrl: string = process.env.REDIS_URL || 'redis://localhost:6379'
  ) {
    // Create Redis connection for worker
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    // Worker configuration
    const workerOptions: WorkerOptions = {
      connection: this.redis,
      concurrency: 5, // Process 5 jobs concurrently
      limiter: {
        max: 100, // Max 100 jobs per duration
        duration: 60000, // 1 minute
      },
    };

    // Create worker
    this.worker = new Worker<EmailSyncJobData>(
      'email-sync',
      async (job) => this.processJob(job),
      workerOptions
    );

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Process email sync job
   *
   * @param job - BullMQ job
   * @returns Job result
   */
  private async processJob(job: Job<EmailSyncJobData>): Promise<{
    syncedCount: number;
    accountId: string;
    duration: number;
  }> {
    const startTime = Date.now();
    const { accountId, messageId: _messageId, fullSync } = job.data; // messageId reserved for future single-message sync

    try {
      console.log(`[EmailSyncWorker] Processing job ${job.id} for account ${accountId}`);

      // Update job progress
      await job.updateProgress(10);

      // Execute sync use case
      const result = await this.syncEmailsUseCase.execute(accountId, {
        fullSync: fullSync || false,
        limit: 50,
      });

      await job.updateProgress(80);

      if (result.isFail()) {
        throw new Error(result.error.message);
      }

      const syncedCount = result.value;
      const duration = Date.now() - startTime;

      await job.updateProgress(100);

      console.log(
        `[EmailSyncWorker] Job ${job.id} completed: synced ${syncedCount} emails in ${duration}ms`
      );

      return {
        syncedCount,
        accountId,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      console.error(
        `[EmailSyncWorker] Job ${job.id} failed after ${duration}ms:`,
        error
      );

      // Throw error to trigger retry
      throw error;
    }
  }

  /**
   * Setup event listeners for monitoring
   */
  private setupEventListeners(): void {
    this.worker.on('active', (job) => {
      console.log(`[EmailSyncWorker] Worker started job ${job.id}`);
    });

    this.worker.on('completed', (job, result) => {
      console.log(
        `[EmailSyncWorker] Job ${job.id} completed with result:`,
        result
      );
    });

    this.worker.on('failed', (job, error) => {
      console.error(
        `[EmailSyncWorker] Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts.attempts}):`,
        error.message
      );
    });

    this.worker.on('error', (error) => {
      console.error('[EmailSyncWorker] Worker error:', error);
    });

    this.worker.on('stalled', (jobId) => {
      console.warn(`[EmailSyncWorker] Job ${jobId} stalled`);
    });
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    console.log('[EmailSyncWorker] Worker started, waiting for jobs...');
  }

  /**
   * Stop the worker gracefully
   */
  async stop(): Promise<void> {
    console.log('[EmailSyncWorker] Stopping worker...');
    await this.worker.close();
    await this.redis.quit();
    console.log('[EmailSyncWorker] Worker stopped');
  }

  /**
   * Pause the worker
   */
  async pause(): Promise<void> {
    await this.worker.pause();
    console.log('[EmailSyncWorker] Worker paused');
  }

  /**
   * Resume the worker
   */
  async resume(): Promise<void> {
    await this.worker.resume();
    console.log('[EmailSyncWorker] Worker resumed');
  }

  /**
   * Check if worker is running
   */
  isRunning(): boolean {
    return this.worker.isRunning();
  }
}
