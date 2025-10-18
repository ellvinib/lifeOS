import { z } from 'zod';
import { ReconciliationStatus } from '../../domain/value-objects/BankEnums';
import { ExpenseCategory } from '../../domain/value-objects/ExpenseCategory';

/**
 * Transaction Validation Schemas
 *
 * Zod schemas for all transaction API endpoints.
 * Provides runtime validation with clear error messages.
 */

/**
 * GET /transactions/:id - Get single transaction
 */
export const getTransactionSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid transaction ID format' }),
  }),
});

/**
 * GET /transactions - List transactions with filters
 */
export const listTransactionsSchema = z.object({
  query: z.object({
    bankAccountId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
    reconciliationStatus: z
      .enum([
        ReconciliationStatus.PENDING,
        ReconciliationStatus.RECONCILED,
        ReconciliationStatus.IGNORED,
      ])
      .optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive().max(200))
      .optional(),
  }),
});

/**
 * GET /transactions/unreconciled - Get unreconciled transactions
 */
export const getUnreconciledTransactionsSchema = z.object({
  query: z.object({
    userId: z.string().uuid({ message: 'User ID is required' }),
  }),
});

/**
 * GET /transactions/by-status - Get transactions by reconciliation status
 */
export const getTransactionsByStatusSchema = z.object({
  query: z.object({
    bankAccountId: z.string().uuid({ message: 'Bank account ID is required' }),
    status: z.enum([
      ReconciliationStatus.PENDING,
      ReconciliationStatus.RECONCILED,
      ReconciliationStatus.IGNORED,
    ]),
  }),
});

/**
 * GET /transactions/potential-matches - Get potential matches for amount and date
 */
export const getPotentialMatchesSchema = z.object({
  query: z.object({
    userId: z.string().uuid({ message: 'User ID is required' }),
    amount: z
      .string()
      .transform((val) => parseFloat(val))
      .pipe(z.number()),
    date: z.string().datetime(),
    toleranceDays: z
      .string()
      .transform((val) => parseInt(val, 10))
      .pipe(z.number().int().positive().max(30))
      .optional(),
  }),
});

/**
 * PATCH /transactions/:id - Update transaction
 */
export const updateTransactionSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid transaction ID format' }),
  }),
  body: z
    .object({
      suggestedCategory: z.nativeEnum(ExpenseCategory).optional(),
      confidenceScore: z.number().min(0).max(100).optional(),
    })
    .refine(
      (data) => {
        // If one is provided, both must be provided
        if (data.suggestedCategory !== undefined || data.confidenceScore !== undefined) {
          return data.suggestedCategory !== undefined && data.confidenceScore !== undefined;
        }
        return true;
      },
      {
        message: 'Both suggestedCategory and confidenceScore must be provided together',
      }
    ),
});

/**
 * POST /transactions/:id/ignore - Mark transaction as ignored
 */
export const ignoreTransactionSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid transaction ID format' }),
  }),
});

/**
 * POST /transactions/:id/unignore - Unignore transaction
 */
export const unignoreTransactionSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid transaction ID format' }),
  }),
});

/**
 * DELETE /transactions/:id - Delete transaction
 */
export const deleteTransactionSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid transaction ID format' }),
  }),
  query: z.object({
    force: z
      .string()
      .transform((val) => val === 'true')
      .optional(),
  }),
});

/**
 * POST /transactions/:id/soft-delete - Soft delete transaction (mark as ignored)
 */
export const softDeleteTransactionSchema = z.object({
  params: z.object({
    id: z.string().uuid({ message: 'Invalid transaction ID format' }),
  }),
});

/**
 * POST /transactions/batch/update-category - Batch update category
 */
export const batchUpdateCategorySchema = z.object({
  body: z.object({
    transactionIds: z
      .array(z.string().uuid())
      .min(1, { message: 'At least one transaction ID is required' })
      .max(100, { message: 'Maximum 100 transactions can be updated at once' }),
    category: z.nativeEnum(ExpenseCategory),
    confidence: z.number().min(0).max(100),
  }),
});

/**
 * POST /transactions/batch/delete - Batch delete transactions
 */
export const batchDeleteTransactionsSchema = z.object({
  body: z.object({
    transactionIds: z
      .array(z.string().uuid())
      .min(1, { message: 'At least one transaction ID is required' })
      .max(100, { message: 'Maximum 100 transactions can be deleted at once' }),
    force: z.boolean().optional(),
  }),
});

/**
 * POST /transactions/import - Import transactions from CSV
 */
export const importTransactionsSchema = z.object({
  body: z.object({
    bankAccountId: z.string().uuid({ message: 'Bank account ID is required' }),
    userId: z.string().uuid().optional(),
    encoding: z
      .enum(['utf-8', 'windows-1252', 'latin1'])
      .optional()
      .default('utf-8'),
    skipDuplicates: z.boolean().optional().default(true),
    updateExisting: z.boolean().optional().default(false),
  }),
});

/**
 * POST /transactions/import/preview - Preview CSV import
 */
export const previewImportSchema = z.object({
  body: z.object({
    encoding: z
      .enum(['utf-8', 'windows-1252', 'latin1'])
      .optional()
      .default('utf-8'),
  }),
});
