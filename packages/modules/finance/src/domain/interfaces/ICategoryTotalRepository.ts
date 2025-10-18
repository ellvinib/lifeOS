import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { CategoryTotal } from '../entities/CategoryTotal';
import { ExpenseCategory } from '../entities/Expense';

/**
 * Category Total Repository Interface
 *
 * Defines data access operations for category totals.
 * Follows Repository Pattern with Result types for error handling.
 */
export interface ICategoryTotalRepository {
  /**
   * Find category total by ID
   */
  findById(id: string): Promise<Result<CategoryTotal, BaseError>>;

  /**
   * Find category total for specific user, month, and category
   */
  findByUserMonthAndCategory(
    userId: string,
    month: Date,
    category: ExpenseCategory
  ): Promise<Result<CategoryTotal | null, BaseError>>;

  /**
   * Find all category totals for a user and month
   */
  findByUserAndMonth(
    userId: string,
    month: Date
  ): Promise<Result<CategoryTotal[], BaseError>>;

  /**
   * Find all category totals for a user
   */
  findByUserId(userId: string): Promise<Result<CategoryTotal[], BaseError>>;

  /**
   * Find category totals within date range
   */
  findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<CategoryTotal[], BaseError>>;

  /**
   * Find totals for a specific category across months
   */
  findByCategoryAndDateRange(
    userId: string,
    category: ExpenseCategory,
    startDate: Date,
    endDate: Date
  ): Promise<Result<CategoryTotal[], BaseError>>;

  /**
   * Find over-budget categories for a user and month
   */
  findOverBudget(
    userId: string,
    month: Date
  ): Promise<Result<CategoryTotal[], BaseError>>;

  /**
   * Find top N categories by spending for a user and month
   */
  findTopCategories(
    userId: string,
    month: Date,
    limit: number
  ): Promise<Result<CategoryTotal[], BaseError>>;

  /**
   * Find stale category totals (need recalculation)
   */
  findStale(maxAgeHours: number): Promise<Result<CategoryTotal[], BaseError>>;

  /**
   * Create new category total
   */
  create(categoryTotal: CategoryTotal): Promise<Result<CategoryTotal, BaseError>>;

  /**
   * Update existing category total
   */
  update(categoryTotal: CategoryTotal): Promise<Result<CategoryTotal, BaseError>>;

  /**
   * Upsert (create or update) category total
   */
  upsert(categoryTotal: CategoryTotal): Promise<Result<CategoryTotal, BaseError>>;

  /**
   * Bulk upsert category totals
   */
  bulkUpsert(categoryTotals: CategoryTotal[]): Promise<Result<CategoryTotal[], BaseError>>;

  /**
   * Delete category total by ID
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Delete all category totals for a user and month
   */
  deleteByUserAndMonth(userId: string, month: Date): Promise<Result<number, BaseError>>;

  /**
   * Delete all category totals for a user
   */
  deleteByUserId(userId: string): Promise<Result<number, BaseError>>;
}
