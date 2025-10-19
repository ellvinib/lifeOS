import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { Loan, LoanType, LoanStatus } from '../entities';

/**
 * Loan query options
 */
export interface LoanQueryOptions {
  type?: LoanType;
  status?: LoanStatus;
  lender?: string;
  page?: number;
  limit?: number;
}

/**
 * Loan Repository Interface
 */
export interface ILoanRepository {
  /**
   * Find loan by ID
   */
  findById(id: string): Promise<Result<Loan, BaseError>>;

  /**
   * Find all loans with optional filters
   */
  findAll(options?: LoanQueryOptions): Promise<Result<Loan[], BaseError>>;

  /**
   * Find loans by type
   */
  findByType(type: LoanType): Promise<Result<Loan[], BaseError>>;

  /**
   * Find loans by status
   */
  findByStatus(status: LoanStatus): Promise<Result<Loan[], BaseError>>;

  /**
   * Find active loans
   */
  findActive(): Promise<Result<Loan[], BaseError>>;

  /**
   * Find loans with overdue payments
   */
  findOverdue(): Promise<Result<Loan[], BaseError>>;

  /**
   * Find loans with payments due soon
   */
  findDueSoon(daysAhead?: number): Promise<Result<Loan[], BaseError>>;

  /**
   * Create a new loan
   */
  create(loan: Loan): Promise<Result<Loan, BaseError>>;

  /**
   * Update an existing loan
   */
  update(loan: Loan): Promise<Result<Loan, BaseError>>;

  /**
   * Delete a loan
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Get total outstanding balance
   */
  getTotalOutstandingBalance(): Promise<Result<number, BaseError>>;

  /**
   * Get total monthly payments
   */
  getTotalMonthlyPayments(): Promise<Result<number, BaseError>>;

  /**
   * Count loans matching criteria
   */
  count(options?: LoanQueryOptions): Promise<Result<number, BaseError>>;
}
