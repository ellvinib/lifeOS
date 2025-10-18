import { Result } from '@lifeOS/core/shared/result';
import { BaseError, BusinessRuleError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { Invoice, InvoiceStatus } from '../../domain/entities';
import {
  IInvoiceRepository,
  IInvoiceTransactionMatchRepository,
  IFileStorage,
} from '../../domain/interfaces';

/**
 * Delete Invoice Use Case
 *
 * Deletes an invoice and its associated resources (PDF file, matches).
 *
 * Business Rules:
 * - Invoice must exist
 * - Cannot delete paid invoices (prevents data loss for tax records)
 * - Must delete all transaction matches first
 * - Must delete PDF file from storage
 * - Creates audit trail event
 *
 * Process:
 * 1. Get invoice entity
 * 2. Validate deletion is allowed
 * 3. Delete all transaction matches
 * 4. Delete PDF file from storage
 * 5. Delete invoice from database
 * 6. Publish InvoiceDeleted event
 * 7. Return success
 */
export class DeleteInvoiceUseCase {
  constructor(
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly matchRepository: IInvoiceTransactionMatchRepository,
    private readonly fileStorage: IFileStorage,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Execute invoice deletion
   *
   * @param invoiceId Invoice ID
   * @param options Deletion options
   * @returns Success result
   */
  async execute(
    invoiceId: string,
    options?: {
      force?: boolean; // Force delete even if paid (dangerous!)
      keepFile?: boolean; // Keep PDF file (for audit purposes)
    }
  ): Promise<Result<void, BaseError>> {
    // Step 1: Get invoice entity
    const invoiceResult = await this.invoiceRepository.findById(invoiceId);
    if (invoiceResult.isFail()) {
      return Result.fail(invoiceResult.error);
    }

    const invoice = invoiceResult.value;

    // Step 2: Validate deletion is allowed
    const validationResult = this.validateDeletion(invoice, options);
    if (validationResult.isFail()) {
      return Result.fail(validationResult.error);
    }

    // Step 3: Delete all transaction matches
    const deleteMatchesResult = await this.matchRepository.deleteByInvoiceId(invoiceId);
    if (deleteMatchesResult.isFail()) {
      return Result.fail(deleteMatchesResult.error);
    }

    // Step 4: Delete PDF file from storage (unless keepFile option is set)
    if (!options?.keepFile && invoice.pdfPath) {
      const deleteFileResult = await this.fileStorage.delete(invoice.pdfPath);
      if (deleteFileResult.isFail()) {
        // Log warning but continue with deletion
        console.warn(
          `Failed to delete PDF file for invoice ${invoiceId}: ${deleteFileResult.error.message}`
        );
      }
    }

    // Step 5: Delete invoice from database
    const deleteResult = await this.invoiceRepository.delete(invoiceId);
    if (deleteResult.isFail()) {
      return Result.fail(deleteResult.error);
    }

    // Step 6: Publish InvoiceDeleted event (audit trail)
    await this.eventBus.publish({
      type: 'InvoiceDeleted',
      source: 'finance',
      payload: {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        vendorId: invoice.vendorId,
        total: invoice.total,
        status: invoice.status,
        deletedAt: new Date(),
        pdfPath: invoice.pdfPath,
        pdfKept: options?.keepFile ?? false,
      },
      timestamp: new Date(),
    });

    return Result.ok(undefined);
  }

  /**
   * Delete multiple invoices in batch
   */
  async executeBatch(
    invoiceIds: string[],
    options?: { force?: boolean; keepFile?: boolean }
  ): Promise<Result<{ deleted: number; failed: number }, BaseError>> {
    let deleted = 0;
    let failed = 0;

    for (const invoiceId of invoiceIds) {
      const result = await this.execute(invoiceId, options);

      if (result.isOk()) {
        deleted++;
      } else {
        failed++;
      }
    }

    return Result.ok({ deleted, failed });
  }

  /**
   * Soft delete (mark as cancelled instead of deleting)
   */
  async softDelete(invoiceId: string): Promise<Result<Invoice, BaseError>> {
    // Get invoice
    const invoiceResult = await this.invoiceRepository.findById(invoiceId);
    if (invoiceResult.isFail()) {
      return Result.fail(invoiceResult.error);
    }

    const invoice = invoiceResult.value;

    // Mark as cancelled
    invoice.cancel();

    // Save
    const saveResult = await this.invoiceRepository.update(invoice);
    if (saveResult.isFail()) {
      return Result.fail(saveResult.error);
    }

    // Publish event
    await this.eventBus.publish({
      type: 'InvoiceCancelled',
      source: 'finance',
      payload: {
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        vendorId: invoice.vendorId,
        total: invoice.total,
        cancelledAt: new Date(),
      },
      timestamp: new Date(),
    });

    return Result.ok(saveResult.value);
  }

  /**
   * Validate deletion is allowed
   */
  private validateDeletion(
    invoice: Invoice,
    options?: { force?: boolean }
  ): Result<void, BaseError> {
    // Cannot delete paid invoices (unless force option is set)
    if (invoice.status === InvoiceStatus.PAID && !options?.force) {
      return Result.fail(
        new BusinessRuleError(
          'Cannot delete paid invoices. Paid invoices should be kept for tax records. ' +
            'Use softDelete() to mark as cancelled instead, or use force option (dangerous).',
          'PAID_INVOICE_DELETE_FORBIDDEN'
        )
      );
    }

    return Result.ok(undefined);
  }
}
