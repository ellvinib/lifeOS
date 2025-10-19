import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeOS/core/shared/errors';
import {
  IInvoiceRepository,
  InvoiceQueryOptions,
} from '../../domain/interfaces';
import { Invoice } from '../../domain/entities';
import {
  InvoiceStatus,
  ExtractionStatus,
  InvoiceSource,
  TransactionCategory,
} from '../../domain/value-objects/InvoiceEnums';
import { InvoiceMapper } from '../mappers/InvoiceMapper';

/**
 * Invoice Repository Implementation with Prisma
 *
 * Implements invoice persistence using Prisma ORM.
 * All operations return Result<T, E> for functional error handling.
 */
export class InvoiceRepository implements IInvoiceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find invoice by ID
   */
  async findById(id: string): Promise<Result<Invoice, BaseError>> {
    try {
      const invoice = await this.prisma.financeInvoice.findUnique({
        where: { id },
      });

      if (!invoice) {
        return Result.fail(new NotFoundError('Invoice', id));
      }

      return Result.ok(InvoiceMapper.toDomain(invoice));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find invoice', error));
    }
  }

  /**
   * Find all invoices with optional filters
   */
  async findAll(options?: InvoiceQueryOptions): Promise<Result<Invoice[], BaseError>> {
    try {
      const where: any = {};

      if (options?.vendorId) {
        where.vendorId = options.vendorId;
      }

      if (options?.status) {
        where.status = options.status;
      }

      if (options?.extractionStatus) {
        where.extractionStatus = options.extractionStatus;
      }

      if (options?.source) {
        where.source = options.source;
      }

      if (options?.category) {
        where.category = options.category;
      }

      if (options?.currency) {
        where.currency = options.currency;
      }

      // Date range filters
      if (options?.issueDateFrom || options?.issueDateTo) {
        where.issueDate = {};
        if (options.issueDateFrom) where.issueDate.gte = options.issueDateFrom;
        if (options.issueDateTo) where.issueDate.lte = options.issueDateTo;
      }

      if (options?.dueDateFrom || options?.dueDateTo) {
        where.dueDate = {};
        if (options.dueDateFrom) where.dueDate.gte = options.dueDateFrom;
        if (options.dueDateTo) where.dueDate.lte = options.dueDateTo;
      }

      // Amount range filters
      if (options?.minAmount !== undefined || options?.maxAmount !== undefined) {
        where.total = {};
        if (options.minAmount !== undefined) where.total.gte = options.minAmount;
        if (options.maxAmount !== undefined) where.total.lte = options.maxAmount;
      }

      // Search term (invoice number, vendor name, notes)
      if (options?.searchTerm) {
        where.OR = [
          { invoiceNumber: { contains: options.searchTerm, mode: 'insensitive' } },
          { notes: { contains: options.searchTerm, mode: 'insensitive' } },
        ];
      }

      // Tags filter
      if (options?.tags && options.tags.length > 0) {
        where.tags = {
          hasSome: options.tags,
        };
      }

      const skip =
        options?.page && options?.limit ? (options.page - 1) * options.limit : undefined;

      const orderBy: any = {};
      if (options?.sortBy) {
        orderBy[options.sortBy] = options.sortOrder || 'desc';
      } else {
        orderBy.createdAt = 'desc'; // Default sort
      }

      const invoices = await this.prisma.financeInvoice.findMany({
        where,
        orderBy,
        take: options?.limit,
        skip,
      });

      return Result.ok(invoices.map(InvoiceMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find invoices', error));
    }
  }

  /**
   * Find invoices by vendor
   */
  async findByVendor(vendorId: string): Promise<Result<Invoice[], BaseError>> {
    try {
      const invoices = await this.prisma.financeInvoice.findMany({
        where: { vendorId },
        orderBy: { issueDate: 'desc' },
      });

      return Result.ok(invoices.map(InvoiceMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find invoices by vendor', error));
    }
  }

  /**
   * Find invoices by status
   */
  async findByStatus(status: InvoiceStatus): Promise<Result<Invoice[], BaseError>> {
    try {
      const invoices = await this.prisma.financeInvoice.findMany({
        where: { status },
        orderBy: { dueDate: 'asc' },
      });

      return Result.ok(invoices.map(InvoiceMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find invoices by status', error));
    }
  }

  /**
   * Find pending invoices
   */
  async findPending(): Promise<Result<Invoice[], BaseError>> {
    return this.findByStatus(InvoiceStatus.PENDING);
  }

  /**
   * Find paid invoices
   */
  async findPaid(): Promise<Result<Invoice[], BaseError>> {
    return this.findByStatus(InvoiceStatus.PAID);
  }

  /**
   * Find overdue invoices
   */
  async findOverdue(): Promise<Result<Invoice[], BaseError>> {
    return this.findByStatus(InvoiceStatus.OVERDUE);
  }

  /**
   * Find invoices due soon
   */
  async findDueSoon(daysAhead: number = 7): Promise<Result<Invoice[], BaseError>> {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + daysAhead);

      const invoices = await this.prisma.financeInvoice.findMany({
        where: {
          status: InvoiceStatus.PENDING,
          dueDate: {
            gte: today,
            lte: futureDate,
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      return Result.ok(invoices.map(InvoiceMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find invoices due soon', error));
    }
  }

  /**
   * Find invoices by due date range
   */
  async findByDueDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Result<Invoice[], BaseError>> {
    try {
      const invoices = await this.prisma.financeInvoice.findMany({
        where: {
          dueDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      return Result.ok(invoices.map(InvoiceMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find invoices by due date range', error));
    }
  }

  /**
   * Find invoices by issue date range
   */
  async findByIssueDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Result<Invoice[], BaseError>> {
    try {
      const invoices = await this.prisma.financeInvoice.findMany({
        where: {
          issueDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { issueDate: 'desc' },
      });

      return Result.ok(invoices.map(InvoiceMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find invoices by issue date range', error)
      );
    }
  }

  /**
   * Find invoices needing extraction
   */
  async findNeedingExtraction(): Promise<Result<Invoice[], BaseError>> {
    try {
      const invoices = await this.prisma.financeInvoice.findMany({
        where: {
          extractionStatus: ExtractionStatus.PENDING,
        },
        orderBy: { createdAt: 'asc' },
      });

      return Result.ok(invoices.map(InvoiceMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find invoices needing extraction', error)
      );
    }
  }

  /**
   * Find invoices by extraction status
   */
  async findByExtractionStatus(
    status: ExtractionStatus
  ): Promise<Result<Invoice[], BaseError>> {
    try {
      const invoices = await this.prisma.financeInvoice.findMany({
        where: { extractionStatus: status },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(invoices.map(InvoiceMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find invoices by extraction status', error)
      );
    }
  }

  /**
   * Find invoice by invoice number
   */
  async findByInvoiceNumber(invoiceNumber: string): Promise<Result<Invoice, BaseError>> {
    try {
      const invoice = await this.prisma.financeInvoice.findFirst({
        where: { invoiceNumber },
      });

      if (!invoice) {
        return Result.fail(new NotFoundError('Invoice', `number: ${invoiceNumber}`));
      }

      return Result.ok(InvoiceMapper.toDomain(invoice));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find invoice by number', error));
    }
  }

  /**
   * Find invoices by category
   */
  async findByCategory(category: TransactionCategory): Promise<Result<Invoice[], BaseError>> {
    try {
      const invoices = await this.prisma.financeInvoice.findMany({
        where: { category },
        orderBy: { issueDate: 'desc' },
      });

      return Result.ok(invoices.map(InvoiceMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find invoices by category', error));
    }
  }

  /**
   * Find invoices by source
   */
  async findBySource(source: InvoiceSource): Promise<Result<Invoice[], BaseError>> {
    try {
      const invoices = await this.prisma.financeInvoice.findMany({
        where: { source },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(invoices.map(InvoiceMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find invoices by source', error));
    }
  }

  /**
   * Find invoices by tags
   */
  async findByTags(tags: string[]): Promise<Result<Invoice[], BaseError>> {
    try {
      const invoices = await this.prisma.financeInvoice.findMany({
        where: {
          tags: {
            hasSome: tags,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(invoices.map(InvoiceMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find invoices by tags', error));
    }
  }

  /**
   * Search invoices by text
   */
  async search(searchTerm: string): Promise<Result<Invoice[], BaseError>> {
    return this.findAll({ searchTerm });
  }

  /**
   * Find unmatched invoices
   */
  async findUnmatched(): Promise<Result<Invoice[], BaseError>> {
    try {
      const invoices = await this.prisma.financeInvoice.findMany({
        where: {
          status: {
            in: [InvoiceStatus.PENDING, InvoiceStatus.OVERDUE],
          },
          matches: {
            none: {},
          },
        },
        orderBy: { dueDate: 'asc' },
      });

      return Result.ok(invoices.map(InvoiceMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find unmatched invoices', error));
    }
  }

  /**
   * Find invoices without vendor assignment
   */
  async findWithoutVendor(): Promise<Result<Invoice[], BaseError>> {
    try {
      const invoices = await this.prisma.financeInvoice.findMany({
        where: {
          vendorId: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(invoices.map(InvoiceMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find invoices without vendor', error));
    }
  }

  /**
   * Create a new invoice
   */
  async create(invoice: Invoice): Promise<Result<Invoice, BaseError>> {
    try {
      const created = await this.prisma.financeInvoice.create({
        data: InvoiceMapper.toCreateData(invoice),
      });

      return Result.ok(InvoiceMapper.toDomain(created));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to create invoice', error));
    }
  }

  /**
   * Update an existing invoice
   */
  async update(invoice: Invoice): Promise<Result<Invoice, BaseError>> {
    try {
      const updated = await this.prisma.financeInvoice.update({
        where: { id: invoice.id },
        data: InvoiceMapper.toUpdateData(invoice),
      });

      return Result.ok(InvoiceMapper.toDomain(updated));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to update invoice', error));
    }
  }

  /**
   * Delete an invoice
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.financeInvoice.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to delete invoice', error));
    }
  }

  /**
   * Get total invoice amount for period
   */
  async getTotalAmountForPeriod(
    startDate: Date,
    endDate: Date
  ): Promise<Result<number, BaseError>> {
    try {
      const result = await this.prisma.financeInvoice.aggregate({
        where: {
          issueDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: {
          total: true,
        },
      });

      return Result.ok(result._sum.total || 0);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to get total amount for period', error)
      );
    }
  }

  /**
   * Get total pending amount
   */
  async getTotalPendingAmount(): Promise<Result<number, BaseError>> {
    try {
      const result = await this.prisma.financeInvoice.aggregate({
        where: {
          status: InvoiceStatus.PENDING,
        },
        _sum: {
          total: true,
        },
      });

      return Result.ok(result._sum.total || 0);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to get total pending amount', error));
    }
  }

  /**
   * Get total overdue amount
   */
  async getTotalOverdueAmount(): Promise<Result<number, BaseError>> {
    try {
      const result = await this.prisma.financeInvoice.aggregate({
        where: {
          status: InvoiceStatus.OVERDUE,
        },
        _sum: {
          total: true,
        },
      });

      return Result.ok(result._sum.total || 0);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to get total overdue amount', error));
    }
  }

  /**
   * Get invoice count by status
   */
  async getCountByStatus(status: InvoiceStatus): Promise<Result<number, BaseError>> {
    try {
      const count = await this.prisma.financeInvoice.count({
        where: { status },
      });

      return Result.ok(count);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to get invoice count by status', error));
    }
  }

  /**
   * Get invoice statistics for dashboard
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
    try {
      const [
        totalInvoices,
        pendingCount,
        paidCount,
        overdueCount,
        pendingSum,
        paidSum,
        overdueSum,
      ] = await Promise.all([
        this.prisma.financeInvoice.count(),
        this.prisma.financeInvoice.count({ where: { status: InvoiceStatus.PENDING } }),
        this.prisma.financeInvoice.count({ where: { status: InvoiceStatus.PAID } }),
        this.prisma.financeInvoice.count({ where: { status: InvoiceStatus.OVERDUE } }),
        this.prisma.financeInvoice.aggregate({
          where: { status: InvoiceStatus.PENDING },
          _sum: { total: true },
        }),
        this.prisma.financeInvoice.aggregate({
          where: { status: InvoiceStatus.PAID },
          _sum: { total: true },
        }),
        this.prisma.financeInvoice.aggregate({
          where: { status: InvoiceStatus.OVERDUE },
          _sum: { total: true },
        }),
      ]);

      return Result.ok({
        totalInvoices,
        pendingCount,
        paidCount,
        overdueCount,
        totalPending: pendingSum._sum.total || 0,
        totalPaid: paidSum._sum.total || 0,
        totalOverdue: overdueSum._sum.total || 0,
      });
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to get invoice statistics', error));
    }
  }

  /**
   * Count invoices matching criteria
   */
  async count(options?: InvoiceQueryOptions): Promise<Result<number, BaseError>> {
    try {
      const where: any = {};

      if (options?.vendorId) {
        where.vendorId = options.vendorId;
      }

      if (options?.status) {
        where.status = options.status;
      }

      if (options?.extractionStatus) {
        where.extractionStatus = options.extractionStatus;
      }

      if (options?.source) {
        where.source = options.source;
      }

      if (options?.category) {
        where.category = options.category;
      }

      if (options?.issueDateFrom || options?.issueDateTo) {
        where.issueDate = {};
        if (options.issueDateFrom) where.issueDate.gte = options.issueDateFrom;
        if (options.issueDateTo) where.issueDate.lte = options.issueDateTo;
      }

      if (options?.dueDateFrom || options?.dueDateTo) {
        where.dueDate = {};
        if (options.dueDateFrom) where.dueDate.gte = options.dueDateFrom;
        if (options.dueDateTo) where.dueDate.lte = options.dueDateTo;
      }

      if (options?.tags && options.tags.length > 0) {
        where.tags = {
          hasSome: options.tags,
        };
      }

      const count = await this.prisma.financeInvoice.count({ where });

      return Result.ok(count);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to count invoices', error));
    }
  }
}
