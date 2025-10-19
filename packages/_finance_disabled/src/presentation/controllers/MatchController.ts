import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { EventBus } from '@lifeOS/core/events';
import {
  SuggestInvoiceMatchesUseCase,
  ConfirmMatchUseCase,
  UnmatchUseCase,
  MatchDTOMapper,
} from '../../application';
import {
  InvoiceRepository,
  InvoiceTransactionMatchRepository,
  BankTransactionRepository,
} from '../../infrastructure';

/**
 * Match Controller
 *
 * Handles HTTP requests for invoice-transaction matching operations.
 * Thin controller that delegates to use cases.
 *
 * Endpoints:
 * - GET    /matches/suggest/:invoiceId       - Suggest matches for invoice
 * - GET    /matches/suggest/all              - Suggest matches for all unmatched invoices
 * - GET    /matches/best/:invoiceId          - Get best match for invoice
 * - GET    /matches/auto-matchable           - Get auto-matchable suggestions
 * - POST   /matches/confirm                  - Confirm manual match
 * - POST   /matches/auto-confirm             - Confirm auto match
 * - POST   /matches/batch-confirm            - Batch confirm matches
 * - POST   /matches/unmatch                  - Unmatch invoice and transaction
 * - POST   /matches/batch-unmatch            - Batch unmatch
 * - DELETE /matches/:matchId                 - Unmatch by match ID
 * - DELETE /matches/invoice/:invoiceId       - Unmatch all for invoice
 * - DELETE /matches/transaction/:transactionId - Unmatch all for transaction
 * - GET    /matches/:matchId                 - Get single match
 * - GET    /matches                          - List matches with filters
 * - GET    /matches/statistics               - Get match statistics
 * - GET    /matches/needs-review             - Get matches needing review
 */
export class MatchController {
  private readonly suggestUseCase: SuggestInvoiceMatchesUseCase;
  private readonly confirmUseCase: ConfirmMatchUseCase;
  private readonly unmatchUseCase: UnmatchUseCase;
  private readonly matchRepository: InvoiceTransactionMatchRepository;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus
  ) {
    // Initialize repositories
    const invoiceRepo = new InvoiceRepository(prisma);
    const transactionRepo = new BankTransactionRepository(prisma);
    this.matchRepository = new InvoiceTransactionMatchRepository(prisma);

    // Initialize use cases
    this.suggestUseCase = new SuggestInvoiceMatchesUseCase(
      invoiceRepo,
      transactionRepo,
      this.matchRepository
    );
    this.confirmUseCase = new ConfirmMatchUseCase(
      invoiceRepo,
      transactionRepo,
      this.matchRepository,
      eventBus
    );
    this.unmatchUseCase = new UnmatchUseCase(
      invoiceRepo,
      transactionRepo,
      this.matchRepository,
      eventBus
    );
  }

  // ==================== Suggestion Endpoints ====================

  /**
   * Suggest matches for a single invoice
   * GET /matches/suggest/:invoiceId
   */
  async suggestMatchesForInvoice(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { invoiceId } = req.params;
      const { minScore, maxSuggestions, bankAccountId } = req.query;

      const result = await this.suggestUseCase.suggestForInvoice(invoiceId, {
        minScore: minScore ? Number(minScore) : undefined,
        maxSuggestions: maxSuggestions ? Number(maxSuggestions) : undefined,
        bankAccountId: bankAccountId as string | undefined,
      });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const suggestions = result.value;

      res.status(200).json({
        success: true,
        data: suggestions.map((s) => ({
          invoice: { id: s.invoice.id, invoiceNumber: s.invoice.invoiceNumber },
          transaction: { id: s.transaction.id, description: s.transaction.description },
          matchScore: s.matchScore,
          matchConfidence: s.matchConfidence,
          scoreBreakdown: s.scoreBreakdown,
          suggestedAction: s.suggestedAction,
        })),
        count: suggestions.length,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Suggest matches for all unmatched invoices
   * GET /matches/suggest/all
   */
  async suggestMatchesForAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { minScore, maxSuggestionsPerInvoice, bankAccountId } = req.query;

      const result = await this.suggestUseCase.suggestForAllUnmatched({
        minScore: minScore ? Number(minScore) : undefined,
        maxSuggestionsPerInvoice: maxSuggestionsPerInvoice
          ? Number(maxSuggestionsPerInvoice)
          : undefined,
        bankAccountId: bankAccountId as string | undefined,
      });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const suggestionsByInvoice = result.value;

      // Convert Map to object for JSON response
      const suggestionsObject: Record<string, any> = {};
      for (const [invoiceId, suggestions] of suggestionsByInvoice.entries()) {
        suggestionsObject[invoiceId] = suggestions.map((s) => ({
          transaction: { id: s.transaction.id, description: s.transaction.description },
          matchScore: s.matchScore,
          matchConfidence: s.matchConfidence,
          scoreBreakdown: s.scoreBreakdown,
          suggestedAction: s.suggestedAction,
        }));
      }

      res.status(200).json({
        success: true,
        data: suggestionsObject,
        invoiceCount: suggestionsByInvoice.size,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get best match for invoice
   * GET /matches/best/:invoiceId
   */
  async getBestMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceId } = req.params;

      const result = await this.suggestUseCase.getBestMatch(invoiceId);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const bestMatch = result.value;

      if (!bestMatch) {
        res.status(200).json({
          success: true,
          data: null,
          message: 'No suitable match found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          transaction: { id: bestMatch.transaction.id, description: bestMatch.transaction.description },
          matchScore: bestMatch.matchScore,
          matchConfidence: bestMatch.matchConfidence,
          scoreBreakdown: bestMatch.scoreBreakdown,
          suggestedAction: bestMatch.suggestedAction,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get auto-matchable suggestions
   * GET /matches/auto-matchable
   */
  async getAutoMatchable(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.suggestUseCase.getAutoMatchable();

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const autoMatchable = result.value;

      res.status(200).json({
        success: true,
        data: autoMatchable.map((s) => ({
          invoiceId: s.invoice.id,
          transactionId: s.transaction.id,
          matchScore: s.matchScore,
          matchConfidence: s.matchConfidence,
        })),
        count: autoMatchable.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Confirmation Endpoints ====================

  /**
   * Confirm manual match
   * POST /matches/confirm
   */
  async confirmManualMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceId, transactionId, notes, userId } = req.body;

      const result = await this.confirmUseCase.confirmManualMatch(
        invoiceId,
        transactionId,
        notes,
        userId
      );

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const match = result.value;

      res.status(201).json({
        success: true,
        data: MatchDTOMapper.toDTO(match),
        message: 'Match confirmed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Confirm auto match
   * POST /matches/auto-confirm
   */
  async confirmAutoMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceId, transactionId, matchScore } = req.body;

      const result = await this.confirmUseCase.confirmAutoMatch(
        invoiceId,
        transactionId,
        matchScore
      );

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const match = result.value;

      res.status(201).json({
        success: true,
        data: MatchDTOMapper.toDTO(match),
        message: 'Auto-match confirmed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch confirm matches
   * POST /matches/batch-confirm
   */
  async batchConfirmMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { matches } = req.body;

      const result = await this.confirmUseCase.confirmBatch(matches);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const stats = result.value;

      res.status(200).json({
        success: true,
        data: stats,
        message: `Confirmed ${stats.succeeded} matches, ${stats.failed} failed`,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Unmatch Endpoints ====================

  /**
   * Unmatch by match ID
   * DELETE /matches/:matchId
   */
  async unmatchById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { matchId } = req.params;

      const result = await this.unmatchUseCase.unmatchById(matchId);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Match removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unmatch by invoice and transaction IDs
   * POST /matches/unmatch
   */
  async unmatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceId, transactionId } = req.body;

      const result = await this.unmatchUseCase.unmatch(invoiceId, transactionId);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Match removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unmatch all for invoice
   * DELETE /matches/invoice/:invoiceId
   */
  async unmatchAllForInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { invoiceId } = req.params;

      const result = await this.unmatchUseCase.unmatchAllForInvoice(invoiceId);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const count = result.value;

      res.status(200).json({
        success: true,
        data: { unmatchedCount: count },
        message: `Removed ${count} matches`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unmatch all for transaction
   * DELETE /matches/transaction/:transactionId
   */
  async unmatchAllForTransaction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { transactionId } = req.params;

      const result = await this.unmatchUseCase.unmatchAllForTransaction(transactionId);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const count = result.value;

      res.status(200).json({
        success: true,
        data: { unmatchedCount: count },
        message: `Removed ${count} matches`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Batch unmatch
   * POST /matches/batch-unmatch
   */
  async batchUnmatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { matchIds } = req.body;

      const result = await this.unmatchUseCase.unmatchBatch(matchIds);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const stats = result.value;

      res.status(200).json({
        success: true,
        data: stats,
        message: `Unmatched ${stats.succeeded} matches, ${stats.failed} failed`,
      });
    } catch (error) {
      next(error);
    }
  }

  // ==================== Query Endpoints ====================

  /**
   * Get single match
   * GET /matches/:matchId
   */
  async getMatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { matchId } = req.params;

      const result = await this.matchRepository.findById(matchId);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const match = result.value;

      res.status(200).json({
        success: true,
        data: MatchDTOMapper.toDTO(match),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List matches with filters
   * GET /matches
   */
  async listMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = MatchDTOMapper.fromFilterDTO(req.query as any);

      const result = await this.matchRepository.findAll(filters);

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const matches = result.value;

      // Get count for pagination
      const countResult = await this.matchRepository.count(filters);
      const total = countResult.isOk() ? countResult.value : matches.length;

      res.status(200).json({
        success: true,
        data: MatchDTOMapper.toListDTO(
          matches,
          filters.page || 1,
          filters.limit || 50,
          total
        ),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get match statistics
   * GET /matches/statistics
   */
  async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.matchRepository.getStatistics();

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({
        success: true,
        data: result.value,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get matches needing review
   * GET /matches/needs-review
   */
  async getNeedsReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.matchRepository.findNeedingReview();

      if (result.isFail()) {
        next(result.error);
        return;
      }

      const matches = result.value;

      res.status(200).json({
        success: true,
        data: MatchDTOMapper.toDTOArray(matches),
        count: matches.length,
      });
    } catch (error) {
      next(error);
    }
  }
}
