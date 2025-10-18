import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { EventBus } from '@lifeOS/core/events';
import { MatchController } from '../controllers/MatchController';
import { validateRequest } from '../middleware/validateRequest';
import {
  suggestMatchesForInvoiceSchema,
  suggestMatchesForAllSchema,
  getBestMatchSchema,
  getAutoMatchableSchema,
  confirmManualMatchSchema,
  confirmAutoMatchSchema,
  batchConfirmMatchesSchema,
  unmatchByIdSchema,
  unmatchSchema,
  unmatchAllForInvoiceSchema,
  unmatchAllForTransactionSchema,
  batchUnmatchSchema,
  getMatchSchema,
  listMatchesSchema,
  getMatchStatisticsSchema,
  getNeedsReviewSchema,
} from '../validation/matchSchemas';

/**
 * Match Routes
 *
 * Defines all invoice-transaction matching API endpoints.
 * Routes are mounted at /api/finance/matches
 */
export const createMatchRoutes = (prisma: PrismaClient, eventBus: EventBus): Router => {
  const router = Router();

  // Initialize controller
  const controller = new MatchController(prisma, eventBus);

  // ==================== Suggestion Endpoints ====================

  /**
   * Get auto-matchable suggestions (high confidence)
   * GET /matches/auto-matchable
   */
  router.get(
    '/auto-matchable',
    validateRequest(getAutoMatchableSchema),
    controller.getAutoMatchable.bind(controller)
  );

  /**
   * Suggest matches for all unmatched invoices
   * GET /matches/suggest/all
   */
  router.get(
    '/suggest/all',
    validateRequest(suggestMatchesForAllSchema),
    controller.suggestMatchesForAll.bind(controller)
  );

  /**
   * Get best match for invoice
   * GET /matches/best/:invoiceId
   */
  router.get(
    '/best/:invoiceId',
    validateRequest(getBestMatchSchema),
    controller.getBestMatch.bind(controller)
  );

  /**
   * Suggest matches for a single invoice
   * GET /matches/suggest/:invoiceId
   */
  router.get(
    '/suggest/:invoiceId',
    validateRequest(suggestMatchesForInvoiceSchema),
    controller.suggestMatchesForInvoice.bind(controller)
  );

  // ==================== Confirmation Endpoints ====================

  /**
   * Confirm auto match (system-initiated)
   * POST /matches/auto-confirm
   */
  router.post(
    '/auto-confirm',
    validateRequest(confirmAutoMatchSchema),
    controller.confirmAutoMatch.bind(controller)
  );

  /**
   * Batch confirm matches
   * POST /matches/batch-confirm
   */
  router.post(
    '/batch-confirm',
    validateRequest(batchConfirmMatchesSchema),
    controller.batchConfirmMatches.bind(controller)
  );

  /**
   * Confirm manual match (user-initiated)
   * POST /matches/confirm
   */
  router.post(
    '/confirm',
    validateRequest(confirmManualMatchSchema),
    controller.confirmManualMatch.bind(controller)
  );

  // ==================== Unmatch Endpoints ====================

  /**
   * Unmatch by invoice and transaction IDs
   * POST /matches/unmatch
   */
  router.post(
    '/unmatch',
    validateRequest(unmatchSchema),
    controller.unmatch.bind(controller)
  );

  /**
   * Batch unmatch
   * POST /matches/batch-unmatch
   */
  router.post(
    '/batch-unmatch',
    validateRequest(batchUnmatchSchema),
    controller.batchUnmatch.bind(controller)
  );

  /**
   * Unmatch all for invoice
   * DELETE /matches/invoice/:invoiceId
   */
  router.delete(
    '/invoice/:invoiceId',
    validateRequest(unmatchAllForInvoiceSchema),
    controller.unmatchAllForInvoice.bind(controller)
  );

  /**
   * Unmatch all for transaction
   * DELETE /matches/transaction/:transactionId
   */
  router.delete(
    '/transaction/:transactionId',
    validateRequest(unmatchAllForTransactionSchema),
    controller.unmatchAllForTransaction.bind(controller)
  );

  // ==================== Query Endpoints ====================

  /**
   * Get match statistics
   * GET /matches/statistics
   */
  router.get(
    '/statistics',
    validateRequest(getMatchStatisticsSchema),
    controller.getStatistics.bind(controller)
  );

  /**
   * Get matches needing review (medium/low confidence)
   * GET /matches/needs-review
   */
  router.get(
    '/needs-review',
    validateRequest(getNeedsReviewSchema),
    controller.getNeedsReview.bind(controller)
  );

  /**
   * List matches with filters
   * GET /matches
   */
  router.get(
    '/',
    validateRequest(listMatchesSchema),
    controller.listMatches.bind(controller)
  );

  /**
   * Get single match by ID
   * GET /matches/:matchId
   */
  router.get(
    '/:matchId',
    validateRequest(getMatchSchema),
    controller.getMatch.bind(controller)
  );

  /**
   * Unmatch by match ID
   * DELETE /matches/:matchId
   */
  router.delete(
    '/:matchId',
    validateRequest(unmatchByIdSchema),
    controller.unmatchById.bind(controller)
  );

  return router;
};
