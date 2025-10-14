import { BaseError } from './BaseError';
import { ErrorCode, ErrorCodeToHttpStatus } from './ErrorCode';

/**
 * Error thrown when database operations fail.
 * Wraps ORM/database errors with additional context.
 *
 * Example usage:
 * ```typescript
 * try {
 *   await prisma.task.create({ data });
 * } catch (error) {
 *   throw new DatabaseError('Failed to create task', error as Error, {
 *     operation: 'create',
 *     entity: 'Task'
 *   });
 * }
 * ```
 */
export class DatabaseError extends BaseError {
  public readonly operation?: string;

  constructor(message: string, cause: Error, context?: Record<string, unknown>) {
    super(message, ErrorCode.DATABASE_ERROR, ErrorCodeToHttpStatus[ErrorCode.DATABASE_ERROR], {
      context,
      cause,
      shouldLog: true, // Database errors should always be logged
      shouldReport: true, // And reported
    });

    this.operation = context?.operation as string | undefined;
  }

  /**
   * Create a database connection error
   */
  static connectionFailed(cause: Error): DatabaseError {
    return new DatabaseError('Database connection failed', cause, {
      operation: 'connect',
    });
  }

  /**
   * Create a transaction error
   */
  static transactionFailed(cause: Error, context?: Record<string, unknown>): DatabaseError {
    return new DatabaseError('Database transaction failed', cause, {
      operation: 'transaction',
      ...context,
    });
  }
}
