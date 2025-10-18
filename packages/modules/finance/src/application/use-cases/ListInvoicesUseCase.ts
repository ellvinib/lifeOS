import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { Invoice, InvoiceStatus, ExtractionStatus, InvoiceSource } from '../../domain/entities';
import { TransactionCategory } from '../../domain/value-objects/InvoiceEnums';
import { IInvoiceRepository, InvoiceQueryOptions } from '../../domain/interfaces';

/**
 * List Invoices Use Case
 *
 * Retrieves multiple invoices with optional filtering, sorting, and pagination.
 *
 * Business Rules:
 * - Supports comprehensive filtering (status, vendor, dates, amounts, etc.)
 * - Supports pagination (page, limit)
 * - Supports sorting by multiple fields
 * - Returns empty array if no matches
 *
 * Process:
 * 1. Build query options from input
 * 2. Query repository with filters
 * 3. Return list of invoices
 */
export class ListInvoicesUseCase {
  private static readonly DEFAULT_LIMIT = 50;
  private static readonly MAX_LIMIT = 200;

  constructor(private readonly invoiceRepository: IInvoiceRepository) {}

  /**
   * Execute list invoices
   *
   * @param filters Query filters
   * @returns List of invoices
   */
  async execute(filters?: {
    vendorId?: string;
    status?: InvoiceStatus;
    extractionStatus?: ExtractionStatus;
    source?: InvoiceSource;
    category?: TransactionCategory;
    currency?: string;
    issueDateFrom?: Date;
    issueDateTo?: Date;
    dueDateFrom?: Date;
    dueDateTo?: Date;
    minAmount?: number;
    maxAmount?: number;
    searchTerm?: string;
    tags?: string[];
    page?: number;
    limit?: number;
    sortBy?: 'issueDate' | 'dueDate' | 'total' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Result<Invoice[], BaseError>> {
    // Build query options
    const queryOptions: InvoiceQueryOptions = {
      ...filters,
      limit: this.validateLimit(filters?.limit),
      page: filters?.page || 1,
      sortBy: filters?.sortBy || 'createdAt',
      sortOrder: filters?.sortOrder || 'desc',
    };

    // Query repository
    const result = await this.invoiceRepository.findAll(queryOptions);
    return result;
  }

  /**
   * Get unmatched invoices (no transaction matches)
   */
  async getUnmatched(): Promise<Result<Invoice[], BaseError>> {
    return await this.invoiceRepository.findUnmatched();
  }

  /**
   * Get pending invoices (awaiting payment)
   */
  async getPending(): Promise<Result<Invoice[], BaseError>> {
    return await this.invoiceRepository.findByStatus(InvoiceStatus.PENDING);
  }

  /**
   * Get overdue invoices
   */
  async getOverdue(): Promise<Result<Invoice[], BaseError>> {
    return await this.invoiceRepository.findByStatus(InvoiceStatus.OVERDUE);
  }

  /**
   * Get invoices needing AI extraction
   */
  async getNeedingExtraction(): Promise<Result<Invoice[], BaseError>> {
    return await this.invoiceRepository.findByExtractionStatus(ExtractionStatus.PENDING);
  }

  /**
   * Get invoices without vendor assigned
   */
  async getWithoutVendor(): Promise<Result<Invoice[], BaseError>> {
    return await this.invoiceRepository.findWithoutVendor();
  }

  /**
   * Count invoices matching filters
   */
  async count(filters?: InvoiceQueryOptions): Promise<Result<number, BaseError>> {
    return await this.invoiceRepository.count(filters);
  }

  /**
   * Get invoice statistics
   */
  async getStatistics(): Promise<
    Result<
      {
        totalInvoices: number;
        pendingCount: number;
        paidCount: number;
        overdueCount: number;
        totalPending: number;
        totalPaid: number;
        totalOverdue: number;
      },
      BaseError
    >
  > {
    return await this.invoiceRepository.getStatistics();
  }

  /**
   * Validate and normalize limit parameter
   */
  private validateLimit(limit?: number): number {
    if (!limit || limit < 1) {
      return ListInvoicesUseCase.DEFAULT_LIMIT;
    }

    if (limit > ListInvoicesUseCase.MAX_LIMIT) {
      return ListInvoicesUseCase.MAX_LIMIT;
    }

    return limit;
  }
}
