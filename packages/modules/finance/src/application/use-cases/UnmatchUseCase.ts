import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError, BusinessRuleError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import {
  IInvoiceRepository,
  IInvoiceTransactionMatchRepository,
} from '../../domain/interfaces';
import { IBankTransactionRepository } from '../../domain/interfaces/IBankTransactionRepository';

/**
 * Unmatch Use Case
 *
 * Removes a match between an invoice and a bank transaction.
 * Reverses the reconciliation and returns entities to pending state.
 *
 * Business Rules:
 * - Match must exist
 * - Invoice reverts to PENDING status
 * - Transaction reverts to PENDING reconciliation status
 * - Match record is deleted from database
 * - All changes must be atomic (transaction)
 *
 * Process:
 * 1. Validate match exists
 * 2. Get related invoice and transaction
 * 3. Update invoice status to PENDING
 * 4. Update transaction to unreconciled
 * 5. Delete match record
 * 6. Publish InvoiceUnmatched event
 * 7. Return success
 */
export class UnmatchUseCase {
  constructor(
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly transactionRepository: IBankTransactionRepository,
    private readonly matchRepository: IInvoiceTransactionMatchRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Unmatch an invoice from a transaction by match ID
   *
   * @param matchId Match ID
   * @returns Success result
   */
  async unmatchById(matchId: string): Promise<Result<void, BaseError>> {
    // Step 1: Get match
    const matchResult = await this.matchRepository.findById(matchId);
    if (matchResult.isFail()) {
      return Result.fail(matchResult.error);
    }

    const match = matchResult.value;

    return await this.unmatch(match.invoiceId, match.transactionId);
  }

  /**
   * Unmatch an invoice from a transaction by IDs
   *
   * @param invoiceId Invoice ID
   * @param transactionId Transaction ID
   * @returns Success result
   */
  async unmatch(invoiceId: string, transactionId: string): Promise<Result<void, BaseError>> {
    // Step 1: Verify match exists
    const matchResult = await this.matchRepository.findByInvoiceAndTransaction(
      invoiceId,
      transactionId
    );

    if (matchResult.isFail()) {
      return Result.fail(matchResult.error);
    }

    const match = matchResult.value;

    // Step 2: Get invoice
    const invoiceResult = await this.invoiceRepository.findById(invoiceId);
    if (invoiceResult.isFail()) {
      return Result.fail(invoiceResult.error);
    }

    const invoice = invoiceResult.value;

    // Step 3: Get transaction
    const transactionResult = await this.transactionRepository.findById(transactionId);
    if (transactionResult.isFail()) {
      return Result.fail(transactionResult.error);
    }

    const transaction = transactionResult.value;

    // Step 4: Update invoice status to PENDING
    invoice.markPending();
    const updateInvoiceResult = await this.invoiceRepository.update(invoice);
    if (updateInvoiceResult.isFail()) {
      return Result.fail(updateInvoiceResult.error);
    }

    // Step 5: Update transaction to unreconciled
    transaction.unreconcile();
    const updateTransactionResult = await this.transactionRepository.save(transaction);
    if (updateTransactionResult.isFail()) {
      // Rollback invoice change
      invoice.markPaid();
      await this.invoiceRepository.update(invoice);

      return Result.fail(updateTransactionResult.error);
    }

    // Step 6: Delete match record
    const deleteResult = await this.matchRepository.delete(match.id);
    if (deleteResult.isFail()) {
      // Rollback changes
      invoice.markPaid();
      await this.invoiceRepository.update(invoice);
      transaction.reconcileWith(invoiceId);
      await this.transactionRepository.save(transaction);

      return Result.fail(deleteResult.error);
    }

    // Step 7: Publish event
    await this.eventBus.publish({
      type: 'InvoiceUnmatched',
      source: 'finance',
      payload: {
        invoiceId,
        transactionId,
        matchId: match.id,
        unmatchedAt: new Date(),
      },
      timestamp: new Date(),
    });

    return Result.ok(undefined);
  }

  /**
   * Unmatch all transactions from an invoice
   *
   * @param invoiceId Invoice ID
   * @returns Number of matches removed
   */
  async unmatchAllForInvoice(invoiceId: string): Promise<Result<number, BaseError>> {
    // Get all matches for invoice
    const matchesResult = await this.matchRepository.findByInvoiceId(invoiceId);
    if (matchesResult.isFail()) {
      return Result.fail(matchesResult.error);
    }

    const matches = matchesResult.value;

    let unmatchedCount = 0;

    for (const match of matches) {
      const result = await this.unmatch(match.invoiceId, match.transactionId);
      if (result.isOk()) {
        unmatchedCount++;
      } else {
        console.error(`Failed to unmatch:`, result.error.message, match);
      }
    }

    return Result.ok(unmatchedCount);
  }

  /**
   * Unmatch all invoices from a transaction
   *
   * @param transactionId Transaction ID
   * @returns Number of matches removed
   */
  async unmatchAllForTransaction(
    transactionId: string
  ): Promise<Result<number, BaseError>> {
    // Get all matches for transaction
    const matchesResult = await this.matchRepository.findByTransactionId(transactionId);
    if (matchesResult.isFail()) {
      return Result.fail(matchesResult.error);
    }

    const matches = matchesResult.value;

    let unmatchedCount = 0;

    for (const match of matches) {
      const result = await this.unmatch(match.invoiceId, match.transactionId);
      if (result.isOk()) {
        unmatchedCount++;
      } else {
        console.error(`Failed to unmatch:`, result.error.message, match);
      }
    }

    return Result.ok(unmatchedCount);
  }

  /**
   * Batch unmatch multiple matches
   *
   * @param matchIds Array of match IDs
   * @returns Results for each unmatch
   */
  async unmatchBatch(
    matchIds: string[]
  ): Promise<Result<{ succeeded: number; failed: number }, BaseError>> {
    let succeeded = 0;
    let failed = 0;

    for (const matchId of matchIds) {
      const result = await this.unmatchById(matchId);

      if (result.isOk()) {
        succeeded++;
      } else {
        failed++;
        console.error(`Failed to unmatch:`, result.error.message, matchId);
      }
    }

    return Result.ok({ succeeded, failed });
  }
}
