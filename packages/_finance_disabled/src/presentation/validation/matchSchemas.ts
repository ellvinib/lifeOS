import { z } from 'zod';
import { MatchConfidence } from '../../domain/value-objects/InvoiceEnums';

/**
 * Zod Validation Schemas for Matching API Endpoints
 *
 * Provides runtime validation for invoice-transaction matching operations.
 */

/**
 * Suggest Matches for Invoice Schema
 * GET /api/finance/matches/suggest/:invoiceId
 */
export const suggestMatchesForInvoiceSchema = z.object({
  params: z.object({
    invoiceId: z.string().uuid({ message: 'Invalid invoice ID format' }),
  }),
  query: z.object({
    minScore: z.coerce.number().min(0).max(100).optional(),
    maxSuggestions: z.coerce.number().int().min(1).max(50).optional().default(10),
    bankAccountId: z.string().uuid().optional(),
  }),
});

/**
 * Suggest Matches for All Unmatched Invoices Schema
 * GET /api/finance/matches/suggest/all
 */
export const suggestMatchesForAllSchema = z.object({
  query: z.object({
    minScore: z.coerce.number().min(0).max(100).optional(),
    maxSuggestionsPerInvoice: z.coerce.number().int().min(1).max(20).optional().default(5),
    bankAccountId: z.string().uuid().optional(),
  }),
});

/**
 * Get Best Match Schema
 * GET /api/finance/matches/best/:invoiceId
 */
export const getBestMatchSchema = z.object({
  params: z.object({
    invoiceId: z.string().uuid({ message: 'Invalid invoice ID format' }),
  }),
});

/**
 * Get Auto-Matchable Suggestions Schema
 * GET /api/finance/matches/auto-matchable
 */
export const getAutoMatchableSchema = z.object({
  query: z.object({
    bankAccountId: z.string().uuid().optional(),
  }),
});

/**
 * Confirm Manual Match Schema
 * POST /api/finance/matches/confirm
 */
export const confirmManualMatchSchema = z.object({
  body: z.object({
    invoiceId: z.string().uuid({ message: 'Invalid invoice ID format' }),
    transactionId: z.string().uuid({ message: 'Invalid transaction ID format' }),
    notes: z.string().max(1000).optional(),
    userId: z.string().uuid().optional(),
  }),
});

/**
 * Confirm Auto Match Schema
 * POST /api/finance/matches/auto-confirm
 */
export const confirmAutoMatchSchema = z.object({
  body: z.object({
    invoiceId: z.string().uuid({ message: 'Invalid invoice ID format' }),
    transactionId: z.string().uuid({ message: 'Invalid transaction ID format' }),
    matchScore: z.number().min(90).max(100),
  }),
});

/**
 * Batch Confirm Matches Schema
 * POST /api/finance/matches/batch-confirm
 */
export const batchConfirmMatchesSchema = z.object({
  body: z.object({
    matches: z
      .array(
        z.object({
          invoiceId: z.string().uuid(),
          transactionId: z.string().uuid(),
          matchScore: z.number().min(0).max(100),
          matchedBy: z.enum(['system', 'user']),
          userId: z.string().uuid().optional(),
          notes: z.string().max(1000).optional(),
        })
      )
      .min(1)
      .max(100),
  }),
});

/**
 * Unmatch by Match ID Schema
 * DELETE /api/finance/matches/:matchId
 */
export const unmatchByIdSchema = z.object({
  params: z.object({
    matchId: z.string().uuid({ message: 'Invalid match ID format' }),
  }),
});

/**
 * Unmatch by Invoice and Transaction Schema
 * POST /api/finance/matches/unmatch
 */
export const unmatchSchema = z.object({
  body: z.object({
    invoiceId: z.string().uuid({ message: 'Invalid invoice ID format' }),
    transactionId: z.string().uuid({ message: 'Invalid transaction ID format' }),
  }),
});

/**
 * Unmatch All for Invoice Schema
 * DELETE /api/finance/matches/invoice/:invoiceId
 */
export const unmatchAllForInvoiceSchema = z.object({
  params: z.object({
    invoiceId: z.string().uuid({ message: 'Invalid invoice ID format' }),
  }),
});

/**
 * Unmatch All for Transaction Schema
 * DELETE /api/finance/matches/transaction/:transactionId
 */
export const unmatchAllForTransactionSchema = z.object({
  params: z.object({
    transactionId: z.string().uuid({ message: 'Invalid transaction ID format' }),
  }),
});

/**
 * Batch Unmatch Schema
 * POST /api/finance/matches/batch-unmatch
 */
export const batchUnmatchSchema = z.object({
  body: z.object({
    matchIds: z.array(z.string().uuid()).min(1).max(100),
  }),
});

/**
 * Get Match by ID Schema
 * GET /api/finance/matches/:matchId
 */
export const getMatchSchema = z.object({
  params: z.object({
    matchId: z.string().uuid({ message: 'Invalid match ID format' }),
  }),
});

/**
 * List Matches Schema
 * GET /api/finance/matches
 */
export const listMatchesSchema = z.object({
  query: z.object({
    invoiceId: z.string().uuid().optional(),
    transactionId: z.string().uuid().optional(),
    matchConfidence: z.nativeEnum(MatchConfidence).optional(),
    matchedBy: z.enum(['system', 'user']).optional(),
    matchedByUserId: z.string().uuid().optional(),
    minScore: z.coerce.number().min(0).max(100).optional(),
    maxScore: z.coerce.number().min(0).max(100).optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
    sortBy: z.enum(['matchedAt', 'matchScore']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

/**
 * Get Match Statistics Schema
 * GET /api/finance/matches/statistics
 */
export const getMatchStatisticsSchema = z.object({
  query: z.object({
    invoiceId: z.string().uuid().optional(),
    transactionId: z.string().uuid().optional(),
  }),
});

/**
 * Get Matches Needing Review Schema
 * GET /api/finance/matches/needs-review
 */
export const getNeedsReviewSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  }),
});
