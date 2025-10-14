import { BaseError } from './BaseError';
import { ErrorCode, ErrorCodeToHttpStatus } from './ErrorCode';

/**
 * Error thrown when a business rule is violated.
 * Use this for domain logic violations.
 *
 * Example usage:
 * ```typescript
 * throw new BusinessRuleError(
 *   'Cannot complete a task that is already cancelled',
 *   'TASK_ALREADY_CANCELLED',
 *   { taskId, currentStatus }
 * );
 * ```
 */
export class BusinessRuleError extends BaseError {
  public readonly ruleCode: string;

  constructor(message: string, ruleCode: string, context?: Record<string, unknown>) {
    super(
      message,
      ErrorCode.BUSINESS_RULE_VIOLATION,
      ErrorCodeToHttpStatus[ErrorCode.BUSINESS_RULE_VIOLATION],
      {
        context: {
          ruleCode,
          ...context,
        },
        shouldLog: true, // Business rule violations should be logged
        shouldReport: false, // But not reported as bugs
      }
    );

    this.ruleCode = ruleCode;
  }

  /**
   * Override toUserFacing to include rule code
   */
  override toUserFacing(): { message: string; code: string; ruleCode: string } {
    return {
      message: this.message,
      code: this.code,
      ruleCode: this.ruleCode,
    };
  }
}
