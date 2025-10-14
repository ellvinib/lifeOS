import { BaseError } from './BaseError';
import { ErrorCode, ErrorCodeToHttpStatus } from './ErrorCode';

/**
 * Error thrown when a requested resource is not found.
 *
 * Example usage:
 * ```typescript
 * throw new NotFoundError('Task', taskId);
 * ```
 */
export class NotFoundError extends BaseError {
  constructor(
    resourceType: string,
    identifier: string | number,
    context?: Record<string, unknown>
  ) {
    super(
      `${resourceType} with identifier '${identifier}' not found`,
      ErrorCode.NOT_FOUND,
      ErrorCodeToHttpStatus[ErrorCode.NOT_FOUND],
      {
        context: {
          resourceType,
          identifier,
          ...context,
        },
        shouldLog: false, // Not found errors are expected, don't spam logs
        shouldReport: false,
      }
    );
  }
}
