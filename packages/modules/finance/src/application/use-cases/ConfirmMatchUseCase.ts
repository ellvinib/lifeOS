import { Result } from '@lifeOS/core/shared/result';
import { BaseError, BusinessRuleError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { InvoiceTransactionMatch, Invoice } from '../../domain/entities';
import {
  IInvoiceRepository,
  IInvoiceTransactionMatchRepository,
} from '../../domain/interfaces';
import { IBankTransactionRepository } from '../../domain/interfaces/IBankTransactionRepository';

/**
 * Confirm Match Use Case
 *
 * Creates a match between an invoice and a bank transaction.
 * Can be initiated manually by user or automatically by system.
 *
 * Business Rules:
 * - Both invoice and transaction must exist
 * - Invoice must not be cancelled
 * - Transaction must be unmatched (not reconciled)
 * - Cannot create duplicate matches (same invoice + transaction)
 * - Match score determines confidence level
 * - Creating match marks invoice as PAID if amounts match
 *
 * Process:
 * 1. Validate invoice and transaction exist
 * 2. Check for existing match
 * 3. Validate business rules
 * 4. Create InvoiceTransactionMatch entity
 * 5. Update invoice status to PAID
 * 6. Update transaction reconciliation status
 * 7. Save match to database
 * 8. Publish InvoiceMatched event
 * 9. Return created match
 */
export class ConfirmMatchUseCase {
  constructor(
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly transactionRepository: IBankTransactionRepository,
    private readonly matchRepository: IInvoiceTransactionMatchRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Confirm a manual match (user-initiated)
   *
   * @param invoiceId Invoice ID
   * @param transactionId Transaction ID
   * @param notes Optional notes from user
   * @param userId User who created the match
   * @returns Created match
   */
  async confirmManualMatch(
    invoiceId: string,
    transactionId: string,
    notes?: string,
    userId?: string
  ): Promise<Result<InvoiceTransactionMatch, BaseError>> {
    // Step 1: Validate entities exist
    const validationResult = await this.validateMatch(invoiceId, transactionId);
    if (validationResult.isFail()) {
      return Result.fail(validationResult.error);
    }

    const { invoice, transaction } = validationResult.value;

    // Step 2: Check for existing match
    const existsResult = await this.matchRepository.exists(invoiceId, transactionId);
    if (existsResult.isFail()) {
      return Result.fail(existsResult.error);
    }

    if (existsResult.value) {
      return Result.fail(
        new BusinessRuleError(
          'Match already exists between this invoice and transaction',
          'DUPLICATE_MATCH'
        )
      );
    }

    // Step 3: Create manual match
    const match = InvoiceTransactionMatch.createManualMatch(
      invoiceId,
      transactionId,
      userId,
      notes
    );

    // Step 4: Save match
    const saveResult = await this.matchRepository.create(match);
    if (saveResult.isFail()) {
      return Result.fail(saveResult.error);
    }

    const createdMatch = saveResult.value;

    // Step 5: Update invoice status to PAID
    invoice.markPaid();
    await this.invoiceRepository.update(invoice);

    // Step 6: Update transaction reconciliation status
    transaction.reconcileWith(invoiceId);
    await this.transactionRepository.save(transaction);

    // Step 7: Publish event
    await this.eventBus.publish({
      type: 'InvoiceMatched',
      source: 'finance',
      payload: {
        matchId: createdMatch.id,
        invoiceId,
        transactionId,
        matchedBy: 'user',
        matchedByUserId: userId,
        confidence: createdMatch.matchConfidence,
        score: createdMatch.matchScore,
      },
      timestamp: new Date(),
    });

    return Result.ok(createdMatch);
  }

  /**
   * Confirm an automatic match (system-initiated)
   *
   * @param invoiceId Invoice ID
   * @param transactionId Transaction ID
   * @param matchScore Calculated match score (0-100)
   * @returns Created match
   */
  async confirmAutoMatch(
    invoiceId: string,
    transactionId: string,
    matchScore: number
  ): Promise<Result<InvoiceTransactionMatch, BaseError>> {
    // Validate score for auto-match
    if (matchScore < 90) {
      return Result.fail(
        new BusinessRuleError(
          'Match score must be >= 90 for automatic matching',
          'LOW_CONFIDENCE_SCORE'
        )
      );
    }

    // Step 1: Validate entities exist
    const validationResult = await this.validateMatch(invoiceId, transactionId);
    if (validationResult.isFail()) {
      return Result.fail(validationResult.error);
    }

    const { invoice, transaction } = validationResult.value;

    // Step 2: Check for existing match
    const existsResult = await this.matchRepository.exists(invoiceId, transactionId);
    if (existsResult.isFail()) {
      return Result.fail(existsResult.error);
    }

    if (existsResult.value) {
      return Result.fail(
        new BusinessRuleError(
          'Match already exists between this invoice and transaction',
          'DUPLICATE_MATCH'
        )
      );
    }

    // Step 3: Create auto match
    const match = InvoiceTransactionMatch.createAutoMatch(
      invoiceId,
      transactionId,
      matchScore
    );

    // Step 4: Save match
    const saveResult = await this.matchRepository.create(match);
    if (saveResult.isFail()) {
      return Result.fail(saveResult.error);
    }

    const createdMatch = saveResult.value;

    // Step 5: Update invoice status to PAID
    invoice.markPaid();
    await this.invoiceRepository.update(invoice);

    // Step 6: Update transaction reconciliation status
    transaction.reconcileWith(invoiceId);
    await this.transactionRepository.save(transaction);

    // Step 7: Publish event
    await this.eventBus.publish({
      type: 'InvoiceAutoMatched',
      source: 'finance',
      payload: {
        matchId: createdMatch.id,
        invoiceId,
        transactionId,
        matchedBy: 'system',
        confidence: createdMatch.matchConfidence,
        score: createdMatch.matchScore,
      },
      timestamp: new Date(),
    });

    return Result.ok(createdMatch);
  }

  /**
   * Batch confirm multiple matches
   *
   * @param matches Array of invoice-transaction pairs with scores
   * @returns Results for each match
   */
  async confirmBatch(
    matches: Array<{
      invoiceId: string;
      transactionId: string;
      matchScore: number;
      matchedBy: 'system' | 'user';
      userId?: string;
      notes?: string;
    }>
  ): Promise<Result<{ succeeded: number; failed: number }, BaseError>> {
    let succeeded = 0;
    let failed = 0;

    for (const match of matches) {
      const result =
        match.matchedBy === 'system'
          ? await this.confirmAutoMatch(match.invoiceId, match.transactionId, match.matchScore)
          : await this.confirmManualMatch(
              match.invoiceId,
              match.transactionId,
              match.notes,
              match.userId
            );

      if (result.isOk()) {
        succeeded++;
      } else {
        failed++;
        console.error(`Failed to confirm match:`, result.error.message, match);
      }
    }

    return Result.ok({ succeeded, failed });
  }

  // ==================== Private Helper Methods ====================

  /**
   * Validate that invoice and transaction exist and can be matched
   */
  private async validateMatch(
    invoiceId: string,
    transactionId: string
  ): Promise<Result<{ invoice: Invoice; transaction: any }, BaseError>> {
    // Get invoice
    const invoiceResult = await this.invoiceRepository.findById(invoiceId);
    if (invoiceResult.isFail()) {
      return Result.fail(invoiceResult.error);
    }

    const invoice = invoiceResult.value;

    // Validate invoice is matchable
    if (invoice.status === 'cancelled') {
      return Result.fail(
        new BusinessRuleError('Cannot match cancelled invoices', 'INVOICE_CANCELLED')
      );
    }

    // Get transaction
    const transactionResult = await this.transactionRepository.findById(transactionId);
    if (transactionResult.isFail()) {
      return Result.fail(transactionResult.error);
    }

    const transaction = transactionResult.value;

    // Validate transaction is not already matched
    if (transaction.isReconciled()) {
      return Result.fail(
        new BusinessRuleError(
          'Transaction is already matched with another invoice',
          'TRANSACTION_ALREADY_MATCHED'
        )
      );
    }

    return Result.ok({ invoice, transaction });
  }
}
