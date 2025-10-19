import { BaseError } from './BaseError';
import { ErrorCode } from './ErrorCode';

/**
 * Error thrown when module operations fail.
 * Used by the module system for loading, initialization, and lifecycle errors.
 *
 * Example usage:
 * ```typescript
 * if (!module) {
 *   throw new ModuleError('Module failed to load', 'MODULE_LOAD_FAILED');
 * }
 * ```
 */
export class ModuleError extends BaseError {
  public readonly moduleName?: string;
  public readonly operation?: string;

  constructor(
    message: string,
    code: string = 'MODULE_ERROR',
    httpStatus: number = 500,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, code as ErrorCode, httpStatus, {
      context,
      cause,
      shouldLog: true,
      shouldReport: true,
    });

    this.moduleName = context?.moduleName as string | undefined;
    this.operation = context?.operation as string | undefined;
  }

  /**
   * Create a module load error
   */
  static loadFailed(moduleName: string, cause: Error): ModuleError {
    return new ModuleError(
      `Failed to load module '${moduleName}'`,
      'MODULE_LOAD_ERROR',
      500,
      {
        moduleName,
        operation: 'load',
      },
      cause
    );
  }

  /**
   * Create a module initialization error
   */
  static initializationFailed(moduleName: string, cause: Error): ModuleError {
    return new ModuleError(
      `Failed to initialize module '${moduleName}'`,
      'MODULE_INIT_ERROR',
      500,
      {
        moduleName,
        operation: 'initialize',
      },
      cause
    );
  }

  /**
   * Create a module registration error
   */
  static registrationFailed(moduleName: string, reason: string): ModuleError {
    return new ModuleError(
      `Failed to register module '${moduleName}': ${reason}`,
      'MODULE_REGISTRATION_ERROR',
      500,
      {
        moduleName,
        operation: 'register',
        reason,
      }
    );
  }
}
