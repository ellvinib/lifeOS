import { Result } from '@lifeOS/core/shared/result';
import { BaseError, BusinessRuleError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { Invoice, InvoiceStatus } from '../../domain/entities';
import { TransactionCategory } from '../../domain/value-objects/InvoiceEnums';
import { IInvoiceRepository } from '../../domain/interfaces';

/**
 * Update Invoice Use Case
 *
 * Updates invoice entity with new data.
 *
 * Business Rules:
 * - Invoice must exist
 * - Cannot update paid invoices (immutable after payment)
 * - Amounts must be validated (subtotal + VAT = total)
 * - Status transitions must be valid
 * - Vendor can be changed if not matched
 *
 * Process:
 * 1. Get invoice entity
 * 2. Validate update is allowed
 * 3. Apply updates to entity
 * 4. Validate business rules
 * 5. Save to repository
 * 6. Publish InvoiceUpdated event
 * 7. Return updated invoice
 */
export class UpdateInvoiceUseCase {
  constructor(
    private readonly invoiceRepository: IInvoiceRepository,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Execute invoice update
   *
   * @param invoiceId Invoice ID
   * @param updates Fields to update
   * @returns Updated invoice
   */
  async execute(
    invoiceId: string,
    updates: {
      invoiceNumber?: string;
      issueDate?: Date;
      dueDate?: Date;
      vendorId?: string;
      subtotal?: number;
      vatAmount?: number;
      total?: number;
      vatRate?: number;
      currency?: string;
      category?: TransactionCategory;
      paymentReference?: string;
      bankAccount?: string;
      notes?: string;
      tags?: string[];
      status?: InvoiceStatus;
    }
  ): Promise<Result<Invoice, BaseError>> {
    // Step 1: Get invoice entity
    const invoiceResult = await this.invoiceRepository.findById(invoiceId);
    if (invoiceResult.isFail()) {
      return Result.fail(invoiceResult.error);
    }

    const invoice = invoiceResult.value;

    // Step 2: Validate update is allowed
    const validationResult = this.validateUpdate(invoice, updates);
    if (validationResult.isFail()) {
      return Result.fail(validationResult.error);
    }

    // Step 3: Apply updates to entity
    if (updates.invoiceNumber !== undefined) {
      invoice.setInvoiceNumber(updates.invoiceNumber);
    }

    if (updates.issueDate !== undefined) {
      invoice.setIssueDate(updates.issueDate);
    }

    if (updates.dueDate !== undefined) {
      invoice.setDueDate(updates.dueDate);
    }

    if (updates.vendorId !== undefined) {
      invoice.assignVendor(updates.vendorId);
    }

    if (updates.subtotal !== undefined || updates.vatAmount !== undefined) {
      const subtotal = updates.subtotal ?? invoice.subtotal;
      const vatAmount = updates.vatAmount ?? invoice.vatAmount;
      invoice.updateAmounts(subtotal, vatAmount);
    }

    if (updates.vatRate !== undefined) {
      invoice.setVATRate(updates.vatRate);
    }

    if (updates.currency !== undefined) {
      invoice.setCurrency(updates.currency);
    }

    if (updates.category !== undefined) {
      invoice.setCategory(updates.category);
    }

    if (updates.paymentReference !== undefined) {
      invoice.setPaymentReference(updates.paymentReference);
    }

    if (updates.bankAccount !== undefined) {
      invoice.setBankAccount(updates.bankAccount);
    }

    if (updates.notes !== undefined) {
      invoice.updateNotes(updates.notes);
    }

    if (updates.tags !== undefined) {
      invoice.setTags(updates.tags);
    }

    // Handle status transitions
    if (updates.status !== undefined && updates.status !== invoice.status) {
      const transitionResult = this.transitionStatus(invoice, updates.status);
      if (transitionResult.isFail()) {
        return Result.fail(transitionResult.error);
      }
    }

    // Step 4: Save to repository
    const saveResult = await this.invoiceRepository.update(invoice);
    if (saveResult.isFail()) {
      return Result.fail(saveResult.error);
    }

    const updatedInvoice = saveResult.value;

    // Step 5: Publish InvoiceUpdated event
    await this.eventBus.publish({
      type: 'InvoiceUpdated',
      source: 'finance',
      payload: {
        invoiceId: updatedInvoice.id,
        updates,
        status: updatedInvoice.status,
      },
      timestamp: new Date(),
    });

    return Result.ok(updatedInvoice);
  }

  /**
   * Validate update is allowed
   */
  private validateUpdate(
    invoice: Invoice,
    updates: Record<string, any>
  ): Result<void, BaseError> {
    // Cannot update paid invoices (they are immutable)
    if (invoice.status === InvoiceStatus.PAID) {
      return Result.fail(
        new BusinessRuleError(
          'Cannot update paid invoices. Invoices are immutable after payment.',
          'PAID_INVOICE_IMMUTABLE'
        )
      );
    }

    // Cannot update cancelled invoices
    if (invoice.status === InvoiceStatus.CANCELLED) {
      return Result.fail(
        new BusinessRuleError(
          'Cannot update cancelled invoices',
          'CANCELLED_INVOICE_IMMUTABLE'
        )
      );
    }

    // Validate amount updates
    if (updates.subtotal !== undefined || updates.vatAmount !== undefined) {
      const subtotal = updates.subtotal ?? invoice.subtotal;
      const vatAmount = updates.vatAmount ?? invoice.vatAmount;
      const total = updates.total ?? invoice.total;

      if (subtotal < 0 || vatAmount < 0 || total < 0) {
        return Result.fail(
          new BusinessRuleError('Amounts cannot be negative', 'NEGATIVE_AMOUNT')
        );
      }
    }

    return Result.ok(undefined);
  }

  /**
   * Transition invoice status
   */
  private transitionStatus(
    invoice: Invoice,
    newStatus: InvoiceStatus
  ): Result<void, BaseError> {
    switch (newStatus) {
      case InvoiceStatus.PENDING:
        invoice.markPending();
        break;
      case InvoiceStatus.PAID:
        invoice.markPaid();
        break;
      case InvoiceStatus.OVERDUE:
        invoice.markOverdue();
        break;
      case InvoiceStatus.CANCELLED:
        invoice.cancel();
        break;
      case InvoiceStatus.DRAFT:
        // Cannot revert to draft from other statuses
        return Result.fail(
          new BusinessRuleError('Cannot revert invoice to draft status', 'INVALID_STATUS')
        );
      default:
        return Result.fail(
          new BusinessRuleError(`Invalid invoice status: ${newStatus}`, 'INVALID_STATUS')
        );
    }

    return Result.ok(undefined);
  }
}
