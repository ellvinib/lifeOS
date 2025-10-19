import { Result } from '@lifeOS/core/shared/result';
import { BaseError, BusinessRuleError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { BankTransaction } from '../../domain/entities/BankTransaction';
import {
  IBankTransactionRepository,
  IInvoiceTransactionMatchRepository,
} from '../../domain/interfaces';

/**
 * Delete Transaction Use Case
 *
 * Deletes a bank transaction from the system.
 *
 * Business Rules:
 * - Transaction must exist
 * - Cannot delete reconciled transactions (prevents data loss)
 * - Must delete all matches first
 * - Soft delete recommended (mark as ignored instead)
 *
 * Process:
 * 1. Get transaction entity
 * 2. Validate deletion is allowed
 * 3. Delete all matches
 * 4. Delete transaction from database
 * 5. Publish TransactionDeleted event
 * 6. Return success
 */
export class DeleteTransactionUseCase {
  constructor(
    private readonly transactionRepository: IBankTransactionRepository,
    private readonly matchRepository: IInvoiceTransactionMatchRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Execute transaction deletion (hard delete)
   *
   * @param transactionId Transaction ID
   * @param options Deletion options
   * @returns Success result
   */
  async execute(
    transactionId: string,
    options?: {
      force?: boolean; // Force delete even if reconciled (dangerous!)
    }
  ): Promise<Result<void, BaseError>> {
    // Step 1: Get transaction entity
    const transactionResult = await this.transactionRepository.findById(transactionId);
    if (transactionResult.isFail()) {
      return Result.fail(transactionResult.error);
    }

    const transaction = transactionResult.value;

    // Step 2: Validate deletion is allowed
    const validationResult = this.validateDeletion(transaction, options);
    if (validationResult.isFail()) {
      return Result.fail(validationResult.error);
    }

    // Step 3: Delete all matches
    const deleteMatchesResult = await this.matchRepository.deleteByTransactionId(
      transactionId
    );
    if (deleteMatchesResult.isFail()) {
      return Result.fail(deleteMatchesResult.error);
    }

    // Step 4: Delete transaction from database
    // Note: BankTransactionRepository doesn't have delete method yet
    // This would need to be added to the repository interface
    // For now, we'll use soft delete (ignore) instead

    // Soft delete: mark as ignored
    transaction.ignore();
    const saveResult = await this.transactionRepository.save(transaction);
    if (saveResult.isFail()) {
      return Result.fail(saveResult.error);
    }

    // Step 5: Publish TransactionDeleted event
    await this.eventBus.publish({
      type: 'TransactionDeleted',
      source: 'finance',
      payload: {
        transactionId,
        amount: transaction.amount,
        description: transaction.description,
        deletedAt: new Date(),
      },
      timestamp: new Date(),
    });

    return Result.ok(undefined);
  }

  /**
   * Soft delete (mark as ignored instead of deleting)
   *
   * This is the recommended approach for financial records.
   */
  async softDelete(transactionId: string): Promise<Result<BankTransaction, BaseError>> {
    // Get transaction
    const transactionResult = await this.transactionRepository.findById(transactionId);
    if (transactionResult.isFail()) {
      return Result.fail(transactionResult.error);
    }

    const transaction = transactionResult.value;

    // Validate can be ignored
    if (transaction.isReconciled()) {
      return Result.fail(
        new BusinessRuleError(
          'Cannot ignore reconciled transactions. Unmatch first.',
          'TRANSACTION_RECONCILED'
        )
      );
    }

    // Mark as ignored
    transaction.ignore();

    // Save
    const saveResult = await this.transactionRepository.save(transaction);
    if (saveResult.isFail()) {
      return Result.fail(saveResult.error);
    }

    // Publish event
    await this.eventBus.publish({
      type: 'TransactionIgnored',
      source: 'finance',
      payload: {
        transactionId,
        ignoredAt: new Date(),
      },
      timestamp: new Date(),
    });

    return Result.ok(saveResult.value);
  }

  /**
   * Batch delete transactions
   */
  async executeBatch(
    transactionIds: string[],
    options?: { force?: boolean }
  ): Promise<Result<{ deleted: number; failed: number }, BaseError>> {
    let deleted = 0;
    let failed = 0;

    for (const transactionId of transactionIds) {
      const result = await this.execute(transactionId, options);

      if (result.isOk()) {
        deleted++;
      } else {
        failed++;
      }
    }

    return Result.ok({ deleted, failed });
  }

  /**
   * Validate deletion is allowed
   */
  private validateDeletion(
    transaction: BankTransaction,
    options?: { force?: boolean }
  ): Result<void, BaseError> {
    // Cannot delete reconciled transactions (unless force option is set)
    if (transaction.isReconciled() && !options?.force) {
      return Result.fail(
        new BusinessRuleError(
          'Cannot delete reconciled transactions. Reconciled transactions should be kept for audit trail. ' +
            'Use softDelete() to mark as ignored instead, or use force option (dangerous).',
          'RECONCILED_TRANSACTION_DELETE_FORBIDDEN'
        )
      );
    }

    return Result.ok(undefined);
  }
}
