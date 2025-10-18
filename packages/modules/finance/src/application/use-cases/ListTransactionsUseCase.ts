import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { BankTransaction } from '../../domain/entities/BankTransaction';
import { ReconciliationStatus } from '../../domain/value-objects/BankEnums';
import { IBankTransactionRepository } from '../../domain/interfaces/IBankTransactionRepository';

/**
 * List Transactions Use Case
 *
 * Retrieves bank transactions with optional filtering, sorting, and pagination.
 *
 * Business Rules:
 * - Supports filtering by bank account, date range, reconciliation status
 * - Supports pagination (page, limit)
 * - Supports sorting by date
 * - Returns empty array if no matches
 *
 * Process:
 * 1. Build query options from input
 * 2. Query repository with filters
 * 3. Return list of transactions
 */
export class ListTransactionsUseCase {
  private static readonly DEFAULT_LIMIT = 50;
  private static readonly MAX_LIMIT = 200;

  constructor(private readonly transactionRepository: IBankTransactionRepository) {}

  /**
   * Execute list transactions
   *
   * @param filters Query filters
   * @returns List of transactions
   */
  async execute(filters?: {
    bankAccountId?: string;
    userId?: string;
    reconciliationStatus?: ReconciliationStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<Result<BankTransaction[], BaseError>> {
    const limit = this.validateLimit(filters?.limit);

    // If bankAccountId is provided, use findByBankAccountId
    if (filters?.bankAccountId) {
      return await this.transactionRepository.findByBankAccountId(
        filters.bankAccountId,
        {
          startDate: filters.startDate,
          endDate: filters.endDate,
          limit,
        }
      );
    }

    // If userId is provided, use findByUserId
    if (filters?.userId) {
      return await this.transactionRepository.findByUserId(filters.userId, {
        startDate: filters.startDate,
        endDate: filters.endDate,
        limit,
      });
    }

    // Default: return empty array (require either bankAccountId or userId)
    return Result.ok([]);
  }

  /**
   * Get unreconciled transactions
   */
  async getUnreconciled(userId: string): Promise<Result<BankTransaction[], BaseError>> {
    return await this.transactionRepository.findUnreconciled(userId);
  }

  /**
   * Get transactions by reconciliation status
   */
  async getByReconciliationStatus(
    bankAccountId: string,
    status: ReconciliationStatus
  ): Promise<Result<BankTransaction[], BaseError>> {
    return await this.transactionRepository.findByReconciliationStatus(
      bankAccountId,
      status
    );
  }

  /**
   * Get potential matches for an amount and date
   */
  async getPotentialMatches(
    userId: string,
    amount: number,
    date: Date,
    toleranceDays: number = 3
  ): Promise<Result<BankTransaction[], BaseError>> {
    return await this.transactionRepository.findPotentialMatches(
      userId,
      amount,
      date,
      toleranceDays
    );
  }

  /**
   * Validate and normalize limit parameter
   */
  private validateLimit(limit?: number): number {
    if (!limit || limit < 1) {
      return ListTransactionsUseCase.DEFAULT_LIMIT;
    }

    if (limit > ListTransactionsUseCase.MAX_LIMIT) {
      return ListTransactionsUseCase.MAX_LIMIT;
    }

    return limit;
  }
}
