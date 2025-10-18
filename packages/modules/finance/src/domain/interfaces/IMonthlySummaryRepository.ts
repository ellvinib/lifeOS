import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { MonthlySummary } from '../entities/MonthlySummary';

/**
 * Monthly Summary Repository Interface
 *
 * Defines data access operations for monthly summaries.
 * Follows Repository Pattern with Result types for error handling.
 */
export interface IMonthlySummaryRepository {
  /**
   * Find summary by ID
   */
  findById(id: string): Promise<Result<MonthlySummary, BaseError>>;

  /**
   * Find summary for specific user and month
   */
  findByUserAndMonth(
    userId: string,
    month: Date
  ): Promise<Result<MonthlySummary | null, BaseError>>;

  /**
   * Find all summaries for a user
   */
  findByUserId(userId: string): Promise<Result<MonthlySummary[], BaseError>>;

  /**
   * Find summaries for a user within date range
   */
  findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<MonthlySummary[], BaseError>>;

  /**
   * Find most recent N summaries for a user
   */
  findRecentByUserId(
    userId: string,
    limit: number
  ): Promise<Result<MonthlySummary[], BaseError>>;

  /**
   * Find stale summaries (need recalculation)
   */
  findStale(maxAgeHours: number): Promise<Result<MonthlySummary[], BaseError>>;

  /**
   * Create new summary
   */
  create(summary: MonthlySummary): Promise<Result<MonthlySummary, BaseError>>;

  /**
   * Update existing summary
   */
  update(summary: MonthlySummary): Promise<Result<MonthlySummary, BaseError>>;

  /**
   * Upsert (create or update) summary
   */
  upsert(summary: MonthlySummary): Promise<Result<MonthlySummary, BaseError>>;

  /**
   * Delete summary by ID
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Delete all summaries for a user
   */
  deleteByUserId(userId: string): Promise<Result<number, BaseError>>;

  /**
   * Check if summary exists for user and month
   */
  exists(userId: string, month: Date): Promise<Result<boolean, BaseError>>;
}
