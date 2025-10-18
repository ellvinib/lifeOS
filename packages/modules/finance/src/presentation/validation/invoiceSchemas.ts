import { z } from 'zod';
import {
  InvoiceStatus,
  ExtractionStatus,
  InvoiceSource,
  TransactionCategory,
} from '../../domain/value-objects/InvoiceEnums';

/**
 * Zod Validation Schemas for Invoice API Endpoints
 *
 * Provides runtime validation for all invoice-related API requests.
 * Ensures type safety and data integrity at the API boundary.
 */

/**
 * Upload Invoice Schema
 * POST /api/finance/invoices/upload
 */
export const uploadInvoiceSchema = z.object({
  body: z.object({
    vendorId: z.string().uuid().optional(),
    category: z.nativeEnum(TransactionCategory).optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().max(2000).optional(),
    autoExtract: z.boolean().optional().default(true),
    source: z.nativeEnum(InvoiceSource).optional().default(InvoiceSource.MANUAL_UPLOAD),
  }),
  // File validation happens in controller via multer middleware
});

/**
 * Get Invoice Schema
 * GET /api/finance/invoices/:id
 */
export const getInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID format' }),
  }),
});

/**
 * List Invoices Schema
 * GET /api/finance/invoices
 */
export const listInvoicesSchema = z.object({
  query: z.object({
    vendorId: z.string().uuid().optional(),
    status: z.nativeEnum(InvoiceStatus).optional(),
    extractionStatus: z.nativeEnum(ExtractionStatus).optional(),
    source: z.nativeEnum(InvoiceSource).optional(),
    category: z.nativeEnum(TransactionCategory).optional(),
    currency: z.string().length(3).optional(), // ISO 4217 currency code
    issueDateFrom: z.string().datetime().optional(),
    issueDateTo: z.string().datetime().optional(),
    dueDateFrom: z.string().datetime().optional(),
    dueDateTo: z.string().datetime().optional(),
    minAmount: z.coerce.number().min(0).optional(),
    maxAmount: z.coerce.number().min(0).optional(),
    searchTerm: z.string().max(200).optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
    sortBy: z.enum(['issueDate', 'dueDate', 'total', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

/**
 * Update Invoice Schema
 * PUT /api/finance/invoices/:id
 */
export const updateInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID format' }),
  }),
  body: z
    .object({
      invoiceNumber: z.string().min(1).max(100).optional(),
      issueDate: z.string().datetime().optional(),
      dueDate: z.string().datetime().optional(),
      vendorId: z.string().uuid().optional(),
      subtotal: z.number().min(0).optional(),
      vatAmount: z.number().min(0).optional(),
      total: z.number().min(0).optional(),
      vatRate: z.number().min(0).max(100).optional(),
      currency: z.string().length(3).optional(),
      category: z.nativeEnum(TransactionCategory).optional(),
      paymentReference: z.string().max(100).optional(),
      bankAccount: z.string().max(50).optional(),
      notes: z.string().max(2000).optional(),
      tags: z.array(z.string()).optional(),
      status: z.nativeEnum(InvoiceStatus).optional(),
    })
    .refine(
      (data) => {
        // If amounts are provided, validate arithmetic
        if (
          data.subtotal !== undefined &&
          data.vatAmount !== undefined &&
          data.total !== undefined
        ) {
          const calculatedTotal = data.subtotal + data.vatAmount;
          const difference = Math.abs(calculatedTotal - data.total);
          return difference < 0.02; // 2 cents tolerance
        }
        return true;
      },
      {
        message: 'Total must equal subtotal + VAT (within 2 cent tolerance)',
      }
    )
    .refine(
      (data) => {
        // Validate dates: due date >= issue date
        if (data.issueDate && data.dueDate) {
          return new Date(data.dueDate) >= new Date(data.issueDate);
        }
        return true;
      },
      {
        message: 'Due date must be on or after issue date',
      }
    ),
});

/**
 * Delete Invoice Schema
 * DELETE /api/finance/invoices/:id
 */
export const deleteInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID format' }),
  }),
  query: z.object({
    force: z.coerce.boolean().optional().default(false),
    keepFile: z.coerce.boolean().optional().default(false),
  }),
});

/**
 * Extract Invoice Data Schema
 * POST /api/finance/invoices/:id/extract
 */
export const extractInvoiceDataSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID format' }),
  }),
  body: z.object({
    forceReExtract: z.boolean().optional().default(false),
    manualVendorId: z.string().uuid().optional(),
  }),
});

/**
 * Download Invoice PDF Schema
 * GET /api/finance/invoices/:id/download
 */
export const downloadInvoiceSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid invoice ID format' }),
  }),
});

/**
 * Batch Upload Invoices Schema
 * POST /api/finance/invoices/batch-upload
 */
export const batchUploadInvoicesSchema = z.object({
  body: z.object({
    invoices: z
      .array(
        z.object({
          vendorId: z.string().uuid().optional(),
          category: z.nativeEnum(TransactionCategory).optional(),
          tags: z.array(z.string()).optional(),
          notes: z.string().max(2000).optional(),
          autoExtract: z.boolean().optional().default(true),
        })
      )
      .min(1)
      .max(50), // Max 50 invoices per batch
  }),
  // Files validation happens in controller
});

/**
 * Get Invoice Statistics Schema
 * GET /api/finance/invoices/statistics
 */
export const getInvoiceStatisticsSchema = z.object({
  query: z.object({
    vendorId: z.string().uuid().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  }),
});

/**
 * Batch Delete Invoices Schema
 * POST /api/finance/invoices/batch-delete
 */
export const batchDeleteInvoicesSchema = z.object({
  body: z.object({
    invoiceIds: z.array(z.string().uuid()).min(1).max(100),
    force: z.boolean().optional().default(false),
    keepFile: z.boolean().optional().default(false),
  }),
});

/**
 * Batch Extract Invoices Schema
 * POST /api/finance/invoices/batch-extract
 */
export const batchExtractInvoicesSchema = z.object({
  body: z.object({
    invoiceIds: z.array(z.string().uuid()).min(1).max(20), // Limit batch size for AI extraction
    forceReExtract: z.boolean().optional().default(false),
  }),
});

/**
 * Get Unmatched Invoices Schema
 * GET /api/finance/invoices/unmatched
 */
export const getUnmatchedInvoicesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  }),
});

/**
 * Get Pending Invoices Schema
 * GET /api/finance/invoices/pending
 */
export const getPendingInvoicesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  }),
});

/**
 * Get Overdue Invoices Schema
 * GET /api/finance/invoices/overdue
 */
export const getOverdueInvoicesSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  }),
});

/**
 * Get Invoices Needing Extraction Schema
 * GET /api/finance/invoices/needs-extraction
 */
export const getNeedsExtractionSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  }),
});
