import {
  Invoice,
  InvoiceStatus,
  ExtractionStatus,
  InvoiceSource,
  ExtractedInvoiceData,
  InvoiceLineItem,
} from '../../domain/entities';
import { TransactionCategory } from '../../domain/value-objects/InvoiceEnums';

/**
 * Invoice DTO (Data Transfer Object)
 *
 * Represents invoice data for API responses.
 * Contains all invoice fields in serialized format.
 */
export interface InvoiceDTO {
  id: string;
  vendorId?: string;
  invoiceNumber?: string;
  issueDate?: string; // ISO 8601 date string
  dueDate?: string; // ISO 8601 date string
  subtotal: number;
  vatAmount: number;
  total: number;
  vatRate?: number;
  currency: string;
  status: InvoiceStatus;
  category?: TransactionCategory;
  paymentReference?: string;
  bankAccount?: string;
  pdfPath: string;
  pdfUrl?: string; // Generated download URL
  source: InvoiceSource;
  extractionStatus: ExtractionStatus;
  extractedData?: ExtractedInvoiceData;
  lineItems?: InvoiceLineItem[];
  tags?: string[];
  notes?: string;
  createdAt: string; // ISO 8601 datetime string
  updatedAt: string; // ISO 8601 datetime string
}

/**
 * Create Invoice DTO
 *
 * Minimal fields required to create an invoice via upload.
 * Most fields will be populated by AI extraction.
 */
export interface CreateInvoiceDTO {
  vendorId?: string;
  category?: TransactionCategory;
  tags?: string[];
  notes?: string;
  autoExtract?: boolean; // Whether to trigger AI extraction (default: true)
  source?: InvoiceSource; // Default: MANUAL_UPLOAD
}

/**
 * Update Invoice DTO
 *
 * Fields that can be updated after invoice creation.
 */
export interface UpdateInvoiceDTO {
  invoiceNumber?: string;
  issueDate?: string; // ISO 8601 date string
  dueDate?: string; // ISO 8601 date string
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

/**
 * Invoice List DTO
 *
 * Paginated list of invoices with metadata.
 */
export interface InvoiceListDTO {
  invoices: InvoiceDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Invoice Statistics DTO
 *
 * Aggregated invoice statistics for dashboard.
 */
export interface InvoiceStatisticsDTO {
  totalInvoices: number;
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
  totalPending: number;
  totalPaid: number;
  totalOverdue: number;
  averageInvoiceAmount: number;
  currency: string;
}

/**
 * Invoice Filter DTO
 *
 * Query filters for listing invoices.
 */
export interface InvoiceFilterDTO {
  vendorId?: string;
  status?: InvoiceStatus;
  extractionStatus?: ExtractionStatus;
  source?: InvoiceSource;
  category?: TransactionCategory;
  currency?: string;
  issueDateFrom?: string; // ISO 8601 date string
  issueDateTo?: string;
  dueDateFrom?: string;
  dueDateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string; // Search in invoice number, notes
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: 'issueDate' | 'dueDate' | 'total' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Invoice DTO Mapper
 *
 * Maps between domain Invoice entity and DTOs.
 */
export class InvoiceDTOMapper {
  /**
   * Map domain entity to DTO
   */
  public static toDTO(invoice: Invoice, pdfUrl?: string): InvoiceDTO {
    return {
      id: invoice.id,
      vendorId: invoice.vendorId,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate?.toISOString(),
      dueDate: invoice.dueDate?.toISOString(),
      subtotal: invoice.subtotal,
      vatAmount: invoice.vatAmount,
      total: invoice.total,
      vatRate: invoice.vatRate,
      currency: invoice.currency,
      status: invoice.status,
      category: invoice.category,
      paymentReference: invoice.paymentReference,
      bankAccount: invoice.bankAccount,
      pdfPath: invoice.pdfPath,
      pdfUrl,
      source: invoice.source,
      extractionStatus: invoice.extractionStatus,
      extractedData: invoice.extractedData,
      lineItems: invoice.lineItems,
      tags: invoice.tags,
      notes: invoice.notes,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
    };
  }

  /**
   * Map array of domain entities to DTOs
   */
  public static toDTOArray(invoices: Invoice[]): InvoiceDTO[] {
    return invoices.map((invoice) => this.toDTO(invoice));
  }

  /**
   * Create paginated list DTO
   */
  public static toListDTO(
    invoices: Invoice[],
    page: number,
    limit: number,
    total: number
  ): InvoiceListDTO {
    return {
      invoices: this.toDTOArray(invoices),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Parse date string to Date object
   */
  public static parseDate(dateString?: string): Date | undefined {
    if (!dateString) return undefined;
    return new Date(dateString);
  }

  /**
   * Map UpdateInvoiceDTO to domain update parameters
   */
  public static fromUpdateDTO(dto: UpdateInvoiceDTO): {
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
  } {
    return {
      invoiceNumber: dto.invoiceNumber,
      issueDate: this.parseDate(dto.issueDate),
      dueDate: this.parseDate(dto.dueDate),
      vendorId: dto.vendorId,
      subtotal: dto.subtotal,
      vatAmount: dto.vatAmount,
      total: dto.total,
      vatRate: dto.vatRate,
      currency: dto.currency,
      category: dto.category,
      paymentReference: dto.paymentReference,
      bankAccount: dto.bankAccount,
      notes: dto.notes,
      tags: dto.tags,
      status: dto.status,
    };
  }

  /**
   * Map InvoiceFilterDTO to domain query options
   */
  public static fromFilterDTO(dto: InvoiceFilterDTO) {
    return {
      vendorId: dto.vendorId,
      status: dto.status,
      extractionStatus: dto.extractionStatus,
      source: dto.source,
      category: dto.category,
      currency: dto.currency,
      issueDateFrom: this.parseDate(dto.issueDateFrom),
      issueDateTo: this.parseDate(dto.issueDateTo),
      dueDateFrom: this.parseDate(dto.dueDateFrom),
      dueDateTo: this.parseDate(dto.dueDateTo),
      minAmount: dto.minAmount,
      maxAmount: dto.maxAmount,
      searchTerm: dto.searchTerm,
      tags: dto.tags,
      page: dto.page,
      limit: dto.limit,
      sortBy: dto.sortBy,
      sortOrder: dto.sortOrder,
    };
  }
}
