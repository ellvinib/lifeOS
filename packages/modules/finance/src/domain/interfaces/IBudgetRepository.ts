import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { Budget } from '../entities';

/**
 * Budget query options
 */
export interface BudgetQueryOptions {
  userId?: string;
  year?: number;
  page?: number;
  limit?: number;
}

/**
 * Budget Repository Interface
 */
export interface IBudgetRepository {
  /**
   * Find budget by ID
   */
  findById(id: string): Promise<Result<Budget, BaseError>>;

  /**
   * Find all budgets with optional filters
   */
  findAll(options?: BudgetQueryOptions): Promise<Result<Budget[], BaseError>>;

  /**
   * Find budget by month (YYYY-MM format)
   */
  findByMonth(month: string): Promise<Result<Budget | null, BaseError>>;

  /**
   * Find budgets for a specific year
   */
  findByYear(year: number): Promise<Result<Budget[], BaseError>>;

  /**
   * Get current month's budget
   */
  getCurrentMonth(): Promise<Result<Budget | null, BaseError>>;

  /**
   * Get previous month's budget
   */
  getPreviousMonth(): Promise<Result<Budget | null, BaseError>>;

  /**
   * Create a new budget
   */
  create(budget: Budget, userId: string): Promise<Result<Budget, BaseError>>;

  /**
   * Update an existing budget
   */
  update(budget: Budget): Promise<Result<Budget, BaseError>>;

  /**
   * Delete a budget
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Check if budget exists for month
   */
  existsForMonth(month: string): Promise<Result<boolean, BaseError>>;

  /**
   * Count budgets matching criteria
   */
  count(options?: BudgetQueryOptions): Promise<Result<number, BaseError>>;
}
