import type { ErrorCode } from './ErrorCode';

/**
 * Base error class for all application errors.
 * Extends native Error and adds structured error information.
 *
 * Following best practices:
 * - Immutable properties
 * - Serializable for logging
 * - Includes context and metadata
 */
export abstract class BaseError extends Error {
  /**
   * Error code for programmatic handling
   */
  public readonly code: ErrorCode;

  /**
   * HTTP status code (if applicable)
   */
  public readonly statusCode: number;

  /**
   * Additional context about the error
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Timestamp when error occurred
   */
  public readonly timestamp: Date;

  /**
   * Whether this error should be logged
   */
  public readonly shouldLog: boolean;

  /**
   * Whether this error should be reported to external service (e.g., Sentry)
   */
  public readonly shouldReport: boolean;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    options?: {
      context?: Record<string, unknown>;
      cause?: Error;
      shouldLog?: boolean;
      shouldReport?: boolean;
    }
  ) {
    super(message);

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    // Set the prototype explicitly (TypeScript requirement)
    Object.setPrototypeOf(this, new.target.prototype);

    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = options?.context;
    this.timestamp = new Date();
    this.shouldLog = options?.shouldLog ?? true;
    this.shouldReport = options?.shouldReport ?? true;

    // Attach cause if provided
    if (options?.cause) {
      this.cause = options.cause;
    }
  }

  /**
   * Convert error to plain object for serialization.
   * Useful for logging and API responses.
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    };
  }

  /**
   * Convert error to user-facing format.
   * Hides sensitive information.
   */
  toUserFacing(): { message: string; code: string } {
    return {
      message: this.message,
      code: this.code,
    };
  }

  /**
   * Check if error is of a specific type
   */
  is(errorClass: typeof BaseError): boolean {
    return this instanceof errorClass;
  }
}
