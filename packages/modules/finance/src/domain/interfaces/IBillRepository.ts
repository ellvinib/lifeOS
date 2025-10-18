import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { Bill, BillType, BillStatus } from '../entities';

/**
 * Bill query options
 */
export interface BillQueryOptions {
  type?: BillType;
  status?: BillStatus;
  provider?: string;
  isPredicted?: boolean;
  isRecurring?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Bill Repository Interface
 */
export interface IBillRepository {
  /**
   * Find bill by ID
   */
  findById(id: string): Promise<Result<Bill, BaseError>>;

  /**
   * Find all bills with optional filters
   */
  findAll(options?: BillQueryOptions): Promise<Result<Bill[], BaseError>>;

  /**
   * Find bills by type
   */
  findByType(type: BillType): Promise<Result<Bill[], BaseError>>;

  /**
   * Find bills by status
   */
  findByStatus(status: BillStatus): Promise<Result<Bill[], BaseError>>;

  /**
   * Find upcoming bills
   */
  findUpcoming(): Promise<Result<Bill[], BaseError>>;

  /**
   * Find overdue bills
   */
  findOverdue(): Promise<Result<Bill[], BaseError>>;

  /**
   * Find bills due soon
   */
  findDueSoon(daysAhead?: number): Promise<Result<Bill[], BaseError>>;

  /**
   * Find bills due in date range
   */
  findByDueDateRange(startDate: Date, endDate: Date): Promise<Result<Bill[], BaseError>>;

  /**
   * Find predicted bills
   */
  findPredicted(): Promise<Result<Bill[], BaseError>>;

  /**
   * Find recurring bills
   */
  findRecurring(): Promise<Result<Bill[], BaseError>>;

  /**
   * Find utility bills
   */
  findUtilityBills(): Promise<Result<Bill[], BaseError>>;

  /**
   * Create a new bill
   */
  create(bill: Bill): Promise<Result<Bill, BaseError>>;

  /**
   * Update an existing bill
   */
  update(bill: Bill): Promise<Result<Bill, BaseError>>;

  /**
   * Delete a bill
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Get total bills due in period
   */
  getTotalDueInPeriod(startDate: Date, endDate: Date): Promise<Result<number, BaseError>>;

  /**
   * Count bills matching criteria
   */
  count(options?: BillQueryOptions): Promise<Result<number, BaseError>>;
}
