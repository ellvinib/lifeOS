import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { Expense, ExpenseCategory } from '../entities';

/**
 * Expense query options
 */
export interface ExpenseQueryOptions {
  userId?: string;
  category?: ExpenseCategory;
  startDate?: Date;
  endDate?: Date;
  merchantName?: string;
  tags?: string[];
  isRecurring?: boolean;
  minAmount?: number;
  maxAmount?: number;
  paymentMethod?: string;
  page?: number;
  limit?: number;
}

/**
 * Expense Repository Interface
 *
 * Defines the contract for expense data access.
 * Follows Repository Pattern for clean separation of concerns.
 */
export interface IExpenseRepository {
  /**
   * Find expense by ID
   */
  findById(id: string): Promise<Result<Expense, BaseError>>;

  /**
   * Find all expenses with optional filters
   */
  findAll(options?: ExpenseQueryOptions): Promise<Result<Expense[], BaseError>>;

  /**
   * Find expenses by category
   */
  findByCategory(category: ExpenseCategory): Promise<Result<Expense[], BaseError>>;

  /**
   * Find expenses in date range
   */
  findByDateRange(startDate: Date, endDate: Date): Promise<Result<Expense[], BaseError>>;

  /**
   * Find recurring expenses
   */
  findRecurring(): Promise<Result<Expense[], BaseError>>;

  /**
   * Find expenses by merchant
   */
  findByMerchant(merchantName: string): Promise<Result<Expense[], BaseError>>;

  /**
   * Find expenses by tag
   */
  findByTag(tag: string): Promise<Result<Expense[], BaseError>>;

  /**
   * Create a new expense
   */
  create(expense: Expense, userId: string): Promise<Result<Expense, BaseError>>;

  /**
   * Update an existing expense
   */
  update(expense: Expense): Promise<Result<Expense, BaseError>>;

  /**
   * Delete an expense
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Get total spending by category for a period
   */
  getTotalByCategory(
    category: ExpenseCategory,
    startDate: Date,
    endDate: Date
  ): Promise<Result<number, BaseError>>;

  /**
   * Get total spending for a period
   */
  getTotalForPeriod(startDate: Date, endDate: Date): Promise<Result<number, BaseError>>;

  /**
   * Count expenses matching criteria
   */
  count(options?: ExpenseQueryOptions): Promise<Result<number, BaseError>>;
}
