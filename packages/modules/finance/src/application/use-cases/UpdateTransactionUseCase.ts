import { Result } from '@lifeOS/core/shared/result';
import { BaseError, BusinessRuleError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { BankTransaction } from '../../domain/entities/BankTransaction';
import { ExpenseCategory } from '../../domain/value-objects/ExpenseCategory';
import { IBankTransactionRepository } from '../../domain/interfaces/IBankTransactionRepository';

/**
 * Update Transaction Use Case
 *
 * Updates bank transaction entity with new data.
 *
 * Business Rules:
 * - Transaction must exist
 * - Cannot update reconciled transactions (must unmatch first)
 * - Can update suggested category and confidence
 * - Can mark as ignored or unignore
 *
 * Process:
 * 1. Get transaction entity
 * 2. Validate update is allowed
 * 3. Apply updates to entity
 * 4. Validate business rules
 * 5. Save to repository
 * 6. Publish TransactionUpdated event
 * 7. Return updated transaction
 */
export class UpdateTransactionUseCase {
  constructor(
    private readonly transactionRepository: IBankTransactionRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Execute transaction update
   *
   * @param transactionId Transaction ID
   * @param updates Fields to update
   * @returns Updated transaction
   */
  async execute(
    transactionId: string,
    updates: {
      suggestedCategory?: ExpenseCategory;
      confidenceScore?: number;
    }
  ): Promise<Result<BankTransaction, BaseError>> {
    // Step 1: Get transaction entity
    const transactionResult = await this.transactionRepository.findById(transactionId);
    if (transactionResult.isFail()) {
      return Result.fail(transactionResult.error);
    }

    const transaction = transactionResult.value;

    // Step 2: Validate update is allowed
    if (transaction.isReconciled()) {
      return Result.fail(
        new BusinessRuleError(
          'Cannot update reconciled transactions. Unmatch first.',
          'TRANSACTION_RECONCILED'
        )
      );
    }

    // Step 3: Apply updates to entity
    if (updates.suggestedCategory !== undefined && updates.confidenceScore !== undefined) {
      transaction.setSuggestedCategory(updates.suggestedCategory, updates.confidenceScore);
    }

    // Step 4: Save to repository
    const saveResult = await this.transactionRepository.save(transaction);
    if (saveResult.isFail()) {
      return Result.fail(saveResult.error);
    }

    const updatedTransaction = saveResult.value;

    // Step 5: Publish TransactionUpdated event
    await this.eventBus.publish({
      type: 'TransactionUpdated',
      source: 'finance',
      payload: {
        transactionId: updatedTransaction.id,
        updates,
      },
      timestamp: new Date(),
    });

    return Result.ok(updatedTransaction);
  }

  /**
   * Mark transaction as ignored
   *
   * @param transactionId Transaction ID
   * @returns Updated transaction
   */
  async ignore(transactionId: string): Promise<Result<BankTransaction, BaseError>> {
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
          'Cannot ignore reconciled transactions',
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
        transactionId: transaction.id,
        ignoredAt: new Date(),
      },
      timestamp: new Date(),
    });

    return Result.ok(saveResult.value);
  }

  /**
   * Unignore transaction (back to pending)
   *
   * @param transactionId Transaction ID
   * @returns Updated transaction
   */
  async unignore(transactionId: string): Promise<Result<BankTransaction, BaseError>> {
    // Get transaction
    const transactionResult = await this.transactionRepository.findById(transactionId);
    if (transactionResult.isFail()) {
      return Result.fail(transactionResult.error);
    }

    const transaction = transactionResult.value;

    // Unignore
    transaction.unignore();

    // Save
    const saveResult = await this.transactionRepository.save(transaction);
    if (saveResult.isFail()) {
      return Result.fail(saveResult.error);
    }

    // Publish event
    await this.eventBus.publish({
      type: 'TransactionUnignored',
      source: 'finance',
      payload: {
        transactionId: transaction.id,
        unignoredAt: new Date(),
      },
      timestamp: new Date(),
    });

    return Result.ok(saveResult.value);
  }

  /**
   * Batch update category for multiple transactions
   *
   * @param transactionIds Array of transaction IDs
   * @param category Category to apply
   * @param confidence Confidence score
   * @returns Update statistics
   */
  async batchUpdateCategory(
    transactionIds: string[],
    category: ExpenseCategory,
    confidence: number
  ): Promise<Result<{ updated: number; failed: number }, BaseError>> {
    let updated = 0;
    let failed = 0;

    for (const transactionId of transactionIds) {
      const result = await this.execute(transactionId, {
        suggestedCategory: category,
        confidenceScore: confidence,
      });

      if (result.isOk()) {
        updated++;
      } else {
        failed++;
      }
    }

    return Result.ok({ updated, failed });
  }
}
