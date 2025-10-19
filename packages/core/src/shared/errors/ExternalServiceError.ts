import { BaseError } from './BaseError';
import { ErrorCode } from './ErrorCode';

/**
 * External Service Error
 *
 * Thrown when communication with an external service fails.
 * Examples: API calls, database queries, third-party services.
 *
 * Use Cases:
 * - Microsoft Graph API failures
 * - Gmail API failures
 * - IMAP/SMTP connection errors
 * - Database connection errors
 * - Network timeouts
 */
export class ExternalServiceError extends BaseError {
  constructor(
    message: string,
    public readonly cause?: Error,
    context?: Record<string, any>
  ) {
    super(
      message,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      503, // Service Unavailable
      context
    );

    this.name = 'ExternalServiceError';

    // Preserve original error stack if available
    if (cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}
