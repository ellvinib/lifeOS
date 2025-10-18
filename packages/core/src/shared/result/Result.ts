import { BaseError } from '../errors';

/**
 * Result type for functional error handling.
 * Inspired by Rust's Result<T, E> and Railway Oriented Programming.
 *
 * Instead of throwing errors, functions return Result<T, E>:
 * - Success: Result.ok(value)
 * - Failure: Result.fail(error)
 *
 * Benefits:
 * - Explicit error handling
 * - Type-safe error cases
 * - Composable with map/flatMap
 * - No hidden control flow
 *
 * Example usage:
 * ```typescript
 * function divide(a: number, b: number): Result<number, BaseError> {
 *   if (b === 0) {
 *     return Result.fail(new ValidationError('Division by zero'));
 *   }
 *   return Result.ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (result.isOk()) {
 *   console.log(result.value); // 5
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export class Result<T, E extends BaseError = BaseError> {
  private constructor(
    private readonly _isOk: boolean,
    private readonly _value?: T,
    private readonly _error?: E
  ) {}

  /**
   * Create a successful result
   */
  static ok<T, E extends BaseError = BaseError>(value: T): Result<T, E> {
    return new Result<T, E>(true, value, undefined);
  }

  /**
   * Create a failed result
   */
  static fail<T, E extends BaseError = BaseError>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  /**
   * Check if result is successful
   */
  isOk(): this is Result<T, never> {
    return this._isOk;
  }

  /**
   * Check if result is a failure
   */
  isFail(): this is Result<never, E> {
    return !this._isOk;
  }

  /**
   * Get the value (throws if result is a failure)
   * Use this only after checking isOk()
   */
  get value(): T {
    if (!this._isOk) {
      throw new Error('Cannot get value from a failed result. Check isOk() first.');
    }
    return this._value!;
  }

  /**
   * Get the error (throws if result is successful)
   * Use this only after checking isFail()
   */
  get error(): E {
    if (this._isOk) {
      throw new Error('Cannot get error from a successful result. Check isFail() first.');
    }
    return this._error!;
  }

  /**
   * Get value if successful, otherwise return default
   */
  valueOr(defaultValue: T): T {
    return this._isOk ? this._value! : defaultValue;
  }

  /**
   * Get value if successful, otherwise compute default
   */
  valueOrElse(fn: (error: E) => T): T {
    return this._isOk ? this._value! : fn(this._error!);
  }

  /**
   * Transform the value if successful (functor map)
   */
  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this._isOk) {
      return Result.ok(fn(this._value!));
    }
    return Result.fail(this._error!);
  }

  /**
   * Transform the error if failed
   */
  mapError<F extends BaseError>(fn: (error: E) => F): Result<T, F> {
    if (this._isOk) {
      return Result.ok(this._value!);
    }
    return Result.fail(fn(this._error!));
  }

  /**
   * Chain operations that return Results (monadic flatMap/bind)
   */
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this._isOk) {
      return fn(this._value!);
    }
    return Result.fail(this._error!);
  }

  /**
   * Execute side effect if successful
   */
  tap(fn: (value: T) => void): Result<T, E> {
    if (this._isOk) {
      fn(this._value!);
    }
    return this;
  }

  /**
   * Execute side effect if failed
   */
  tapError(fn: (error: E) => void): Result<T, E> {
    if (!this._isOk) {
      fn(this._error!);
    }
    return this;
  }

  /**
   * Match on result (pattern matching)
   */
  match<U>(patterns: { ok: (value: T) => U; fail: (error: E) => U }): U {
    return this._isOk ? patterns.ok(this._value!) : patterns.fail(this._error!);
  }

  /**
   * Convert to Promise
   * - Success: resolves with value
   * - Failure: rejects with error
   */
  toPromise(): Promise<T> {
    return this._isOk ? Promise.resolve(this._value!) : Promise.reject(this._error);
  }

  /**
   * Create Result from a Promise
   * Catches errors and wraps them in Result
   */
  static async fromPromise<T, E extends BaseError = BaseError>(
    promise: Promise<T>,
    errorMapper?: (error: unknown) => E
  ): Promise<Result<T, E>> {
    try {
      const value = await promise;
      return Result.ok(value);
    } catch (error) {
      if (errorMapper) {
        return Result.fail(errorMapper(error));
      }
      // If error is already a BaseError, use it
      if (error instanceof BaseError) {
        return Result.fail(error as E);
      }
      // Otherwise, we can't create a generic BaseError here
      // This is a type limitation - caller must provide errorMapper
      throw new Error('errorMapper is required for non-BaseError exceptions');
    }
  }

  /**
   * Combine multiple Results into one
   * Success only if all are successful
   */
  static combine<T, E extends BaseError>(
    results: Array<Result<T, E>>
  ): Result<T[], E> {
    const values: T[] = [];

    for (const result of results) {
      if (result.isFail()) {
        return Result.fail(result.error);
      }
      values.push(result.value);
    }

    return Result.ok(values);
  }

  /**
   * Combine Results of different types
   */
  static combineMany<T extends readonly unknown[], E extends BaseError>(
    ...results: { [K in keyof T]: Result<T[K], E> }
  ): Result<T, E> {
    const values: unknown[] = [];

    for (const result of results) {
      if (result.isFail()) {
        return Result.fail(result.error);
      }
      values.push(result.value);
    }

    return Result.ok(values as unknown as T);
  }
}
