import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { BankTransaction } from '../../domain/entities/BankTransaction';
import { IBankTransactionRepository } from '../../domain/interfaces/IBankTransactionRepository';

/**
 * Get Transaction Use Case
 *
 * Retrieves a single bank transaction by ID.
 *
 * Business Rules:
 * - Transaction must exist
 * - Returns complete transaction entity with all fields
 *
 * Process:
 * 1. Query repository by ID
 * 2. Return transaction if found
 * 3. Return NotFoundError if not found
 */
export class GetTransactionUseCase {
  constructor(private readonly transactionRepository: IBankTransactionRepository) {}

  /**
   * Execute get transaction
   *
   * @param transactionId Transaction ID
   * @returns Transaction entity
   */
  async execute(transactionId: string): Promise<Result<BankTransaction, BaseError>> {
    const result = await this.transactionRepository.findById(transactionId);
    return result;
  }
}
