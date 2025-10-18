import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { Invoice } from '../../domain/entities';
import { IInvoiceRepository } from '../../domain/interfaces';

/**
 * Get Invoice Use Case
 *
 * Retrieves a single invoice by ID.
 *
 * Business Rules:
 * - Invoice must exist
 * - Returns complete invoice entity with all fields
 *
 * Process:
 * 1. Query repository by ID
 * 2. Return invoice if found
 * 3. Return NotFoundError if not found
 */
export class GetInvoiceUseCase {
  constructor(private readonly invoiceRepository: IInvoiceRepository) {}

  /**
   * Execute get invoice
   *
   * @param invoiceId Invoice ID
   * @returns Invoice entity
   */
  async execute(invoiceId: string): Promise<Result<Invoice, BaseError>> {
    const result = await this.invoiceRepository.findById(invoiceId);
    return result;
  }
}
