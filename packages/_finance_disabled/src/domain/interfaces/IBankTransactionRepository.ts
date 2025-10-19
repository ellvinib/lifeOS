/**
 * IBankTransactionRepository
 *
 * Repository interface for BankTransaction entity.
 * Follows repository pattern with Result types for error handling.
 */

import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { BankTransaction } from '../entities/BankTransaction';
import { ReconciliationStatus } from '../value-objects/BankEnums';

export interface IBankTransactionRepository {
  /**
   * Find transaction by ID
   */
  findById(id: string): Promise<Result<BankTransaction, BaseError>>;

  /**
   * Find transaction by external ID (Ibanity ID)
   */
  findByExternalId(
    bankAccountId: string,
    externalId: string
  ): Promise<Result<BankTransaction | null, BaseError>>;

  /**
   * Find all transactions for a bank account
   */
  findByBankAccountId(
    bankAccountId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<Result<BankTransaction[], BaseError>>;

  /**
   * Find all transactions for a user (across all accounts)
   */
  findByUserId(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<Result<BankTransaction[], BaseError>>;

  /**
   * Find unreconciled transactions for a user
   */
  findUnreconciled(userId: string): Promise<Result<BankTransaction[], BaseError>>;

  /**
   * Find transactions by reconciliation status
   */
  findByReconciliationStatus(
    bankAccountId: string,
    status: ReconciliationStatus
  ): Promise<Result<BankTransaction[], BaseError>>;

  /**
   * Find potential matches for an expense (for auto-matching)
   */
  findPotentialMatches(
    userId: string,
    amount: number,
    date: Date,
    toleranceDays?: number
  ): Promise<Result<BankTransaction[], BaseError>>;

  /**
   * Save (create or update) transaction
   */
  save(transaction: BankTransaction): Promise<Result<BankTransaction, BaseError>>;

  /**
   * Save multiple transactions (bulk insert/update)
   */
  saveMany(transactions: BankTransaction[]): Promise<Result<BankTransaction[], BaseError>>;

  /**
   * Delete transaction
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Count unreconciled transactions for user
   */
  countUnreconciled(userId: string): Promise<Result<number, BaseError>>;

  /**
   * Get transaction statistics
   */
  getStatistics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<{
    total: number;
    pending: number;
    matched: number;
    ignored: number;
    totalExpenses: number;
    totalIncome: number;
  }, BaseError>>;
}
