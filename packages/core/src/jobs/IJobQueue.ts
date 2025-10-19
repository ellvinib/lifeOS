import { Result } from '../shared/result';
import { BaseError } from '../shared/errors';

/**
 * Job Queue Interface
 *
 * Abstract interface for background job processing.
 * Implementations: BullMQ (Redis-backed), In-Memory (testing)
 *
 * Design Principles:
 * - Queue abstraction: Hide implementation details
 * - Type-safe job data
 * - Retry logic and error handling
 * - Priority queues
 * - Scheduled/delayed jobs
 */
export interface IJobQueue {
  /**
   * Add a job to the queue
   *
   * @param queueName Queue name (e.g., "finance", "email")
   * @param jobName Job type (e.g., "process-invoice-email")
   * @param data Job data (must be JSON-serializable)
   * @param options Job options (priority, delay, retries)
   * @returns Job instance or error
   */
  add<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobOptions
  ): Promise<Result<Job<T>, BaseError>>;

  /**
   * Process jobs from a queue
   *
   * @param queueName Queue name
   * @param jobName Job type to process
   * @param handler Job handler function
   * @returns Result with success or error
   */
  process<T = any>(
    queueName: string,
    jobName: string,
    handler: JobHandler<T>
  ): Promise<Result<void, BaseError>>;

  /**
   * Get job by ID
   *
   * @param queueName Queue name
   * @param jobId Job ID
   * @returns Job instance or error
   */
  getJob<T = any>(
    queueName: string,
    jobId: string
  ): Promise<Result<Job<T>, BaseError>>;

  /**
   * Remove job from queue
   *
   * @param queueName Queue name
   * @param jobId Job ID
   * @returns Result with success or error
   */
  removeJob(queueName: string, jobId: string): Promise<Result<void, BaseError>>;

  /**
   * Retry failed job
   *
   * @param queueName Queue name
   * @param jobId Job ID
   * @returns Result with success or error
   */
  retryJob(queueName: string, jobId: string): Promise<Result<void, BaseError>>;

  /**
   * Get queue statistics
   *
   * @param queueName Queue name
   * @returns Queue statistics or error
   */
  getQueueStats(queueName: string): Promise<Result<QueueStats, BaseError>>;

  /**
   * Pause queue processing
   *
   * @param queueName Queue name
   * @returns Result with success or error
   */
  pauseQueue(queueName: string): Promise<Result<void, BaseError>>;

  /**
   * Resume queue processing
   *
   * @param queueName Queue name
   * @returns Result with success or error
   */
  resumeQueue(queueName: string): Promise<Result<void, BaseError>>;

  /**
   * Close all queues and connections
   *
   * @returns Result with success or error
   */
  close(): Promise<Result<void, BaseError>>;
}

/**
 * Job Instance
 *
 * Represents a job in the queue
 */
export interface Job<T = any> {
  /**
   * Unique job ID
   */
  id: string;

  /**
   * Queue name
   */
  queue: string;

  /**
   * Job type/name
   */
  name: string;

  /**
   * Job data
   */
  data: T;

  /**
   * Job state
   */
  state: JobState;

  /**
   * Progress (0-100)
   */
  progress: number;

  /**
   * Attempt number (starts at 1)
   */
  attemptsMade: number;

  /**
   * Maximum attempts
   */
  attemptsMax: number;

  /**
   * Job timestamps
   */
  timestamps: {
    created: Date;
    processed?: Date;
    completed?: Date;
    failed?: Date;
  };

  /**
   * Error from failed attempt
   */
  failedReason?: string;

  /**
   * Stack trace from error
   */
  stacktrace?: string[];

  /**
   * Update job progress
   *
   * @param progress Progress percentage (0-100)
   */
  updateProgress(progress: number): Promise<void>;

  /**
   * Log message to job
   *
   * @param message Log message
   */
  log(message: string): void;
}

/**
 * Job Options
 *
 * Configuration for job processing
 */
export interface JobOptions {
  /**
   * Job priority (higher = processed first)
   * Default: 0
   */
  priority?: number;

  /**
   * Delay before processing (milliseconds)
   * Default: 0
   */
  delay?: number;

  /**
   * Maximum retry attempts
   * Default: 3
   */
  attempts?: number;

  /**
   * Backoff strategy for retries
   * Default: 'exponential'
   */
  backoff?: {
    type: 'fixed' | 'exponential';
    delay: number;
  };

  /**
   * Job timeout (milliseconds)
   * Default: 300000 (5 minutes)
   */
  timeout?: number;

  /**
   * Remove job on completion
   * Default: false
   */
  removeOnComplete?: boolean;

  /**
   * Remove job on failure
   * Default: false
   */
  removeOnFail?: boolean;

  /**
   * Job expiration time (milliseconds)
   * Default: null (never expires)
   */
  ttl?: number;
}

/**
 * Job Handler Function
 *
 * Processes a job from the queue
 */
export type JobHandler<T = any> = (job: Job<T>) => Promise<void>;

/**
 * Job State
 */
export type JobState =
  | 'waiting' // Waiting to be processed
  | 'active' // Currently being processed
  | 'completed' // Successfully completed
  | 'failed' // Failed after all attempts
  | 'delayed' // Delayed for future processing
  | 'paused'; // Queue is paused

/**
 * Queue Statistics
 */
export interface QueueStats {
  /**
   * Queue name
   */
  name: string;

  /**
   * Job counts by state
   */
  counts: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: number;
  };

  /**
   * Processing metrics
   */
  metrics: {
    throughput: number; // Jobs/second
    avgProcessingTime: number; // Milliseconds
    failureRate: number; // Percentage
  };

  /**
   * Queue status
   */
  status: 'active' | 'paused' | 'error';
}
