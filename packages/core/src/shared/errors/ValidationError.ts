import { BaseError } from './BaseError';
import { ErrorCode, ErrorCodeToHttpStatus } from './ErrorCode';

/**
 * Validation error details for a single field
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Error thrown when input validation fails.
 *
 * Example usage:
 * ```typescript
 * throw new ValidationError('Invalid task data', [
 *   { field: 'title', message: 'Title is required' },
 *   { field: 'dueDate', message: 'Due date must be in the future' }
 * ]);
 * ```
 */
export class ValidationError extends BaseError {
  public readonly errors: ValidationErrorDetail[];

  constructor(message: string, errors: ValidationErrorDetail[]) {
    super(message, ErrorCode.VALIDATION_ERROR, ErrorCodeToHttpStatus[ErrorCode.VALIDATION_ERROR], {
      context: { errors },
      shouldLog: false, // Validation errors are user errors, don't log
      shouldReport: false,
    });

    this.errors = errors;
  }

  /**
   * Create validation error from a single field
   */
  static singleField(field: string, message: string, value?: unknown): ValidationError {
    return new ValidationError('Validation failed', [{ field, message, value }]);
  }

  /**
   * Override toJSON to include errors
   */
  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      errors: this.errors,
    };
  }

  /**
   * Override toUserFacing to include validation details
   */
  override toUserFacing(): { message: string; code: string; errors: ValidationErrorDetail[] } {
    return {
      message: this.message,
      code: this.code,
      errors: this.errors,
    };
  }
}
