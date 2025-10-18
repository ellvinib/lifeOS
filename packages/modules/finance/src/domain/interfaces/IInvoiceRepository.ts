import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { Invoice } from '../entities';
import {
  InvoiceStatus,
  ExtractionStatus,
  InvoiceSource,
  TransactionCategory,
} from '../value-objects/InvoiceEnums';

/**
 * Invoice query options
 */
export interface InvoiceQueryOptions {
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
  searchTerm?: string; // Search in invoice number, vendor name, description
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'issueDate' | 'dueDate' | 'total' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Invoice Repository Interface
 */
export interface IInvoiceRepository {
  /**
   * Find invoice by ID
   */
  findById(id: string): Promise<Result<Invoice, BaseError>>;

  /**
   * Find all invoices with optional filters
   */
  findAll(options?: InvoiceQueryOptions): Promise<Result<Invoice[], BaseError>>;

  /**
   * Find invoices by vendor
   */
  findByVendor(vendorId: string): Promise<Result<Invoice[], BaseError>>;

  /**
   * Find invoices by status
   */
  findByStatus(status: InvoiceStatus): Promise<Result<Invoice[], BaseError>>;

  /**
   * Find pending invoices (awaiting payment)
   */
  findPending(): Promise<Result<Invoice[], BaseError>>;

  /**
   * Find paid invoices
   */
  findPaid(): Promise<Result<Invoice[], BaseError>>;

  /**
   * Find overdue invoices
   */
  findOverdue(): Promise<Result<Invoice[], BaseError>>;

  /**
   * Find invoices due soon (within specified days)
   */
  findDueSoon(daysAhead?: number): Promise<Result<Invoice[], BaseError>>;

  /**
   * Find invoices by due date range
   */
  findByDueDateRange(startDate: Date, endDate: Date): Promise<Result<Invoice[], BaseError>>;

  /**
   * Find invoices by issue date range
   */
  findByIssueDateRange(startDate: Date, endDate: Date): Promise<Result<Invoice[], BaseError>>;

  /**
   * Find invoices needing extraction (pending extraction)
   */
  findNeedingExtraction(): Promise<Result<Invoice[], BaseError>>;

  /**
   * Find invoices by extraction status
   */
  findByExtractionStatus(status: ExtractionStatus): Promise<Result<Invoice[], BaseError>>;

  /**
   * Find invoices by invoice number (exact match)
   */
  findByInvoiceNumber(invoiceNumber: string): Promise<Result<Invoice, BaseError>>;

  /**
   * Find invoices by category
   */
  findByCategory(category: TransactionCategory): Promise<Result<Invoice[], BaseError>>;

  /**
   * Find invoices by source
   */
  findBySource(source: InvoiceSource): Promise<Result<Invoice[], BaseError>>;

  /**
   * Find invoices by tags
   */
  findByTags(tags: string[]): Promise<Result<Invoice[], BaseError>>;

  /**
   * Search invoices by text (invoice number, vendor name, notes)
   */
  search(searchTerm: string): Promise<Result<Invoice[], BaseError>>;

  /**
   * Find unmatched invoices (no transaction match)
   */
  findUnmatched(): Promise<Result<Invoice[], BaseError>>;

  /**
   * Find invoices without vendor assignment
   */
  findWithoutVendor(): Promise<Result<Invoice[], BaseError>>;

  /**
   * Create a new invoice
   */
  create(invoice: Invoice): Promise<Result<Invoice, BaseError>>;

  /**
   * Update an existing invoice
   */
  update(invoice: Invoice): Promise<Result<Invoice, BaseError>>;

  /**
   * Delete an invoice
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Get total invoice amount for period
   */
  getTotalAmountForPeriod(startDate: Date, endDate: Date): Promise<Result<number, BaseError>>;

  /**
   * Get total pending amount
   */
  getTotalPendingAmount(): Promise<Result<number, BaseError>>;

  /**
   * Get total overdue amount
   */
  getTotalOverdueAmount(): Promise<Result<number, BaseError>>;

  /**
   * Get invoice count by status
   */
  getCountByStatus(status: InvoiceStatus): Promise<Result<number, BaseError>>;

  /**
   * Get invoice statistics for dashboard
   */
  getStatistics(): Promise<Result<{
    totalInvoices: number;
    pendingCount: number;
    paidCount: number;
    overdueCount: number;
    totalPending: number;
    totalPaid: number;
    totalOverdue: number;
  }, BaseError>>;

  /**
   * Count invoices matching criteria
   */
  count(options?: InvoiceQueryOptions): Promise<Result<number, BaseError>>;
}
