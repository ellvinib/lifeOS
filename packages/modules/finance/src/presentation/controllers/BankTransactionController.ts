/**
 * BankTransactionController
 *
 * Thin controller for bank transaction and reconciliation management.
 */

import { Request, Response, NextFunction } from 'express';
import {
  ReconcileTransactionUseCase,
} from '../../application/use-cases';
import {
  BankTransactionDTOMapper,
  ReconcileTransactionRequestDTO,
} from '../../application/dtos';

/**
 * Bank Transaction Controller
 *
 * Handles transaction viewing and reconciliation.
 */
export class BankTransactionController {
  constructor(
    private readonly reconcileTransactionUseCase: ReconcileTransactionUseCase
  ) {}

  /**
   * Get all transactions for current user
   * GET /api/finance/bank/transactions
   *
   * Query params: startDate, endDate, reconciliationStatus, limit
   */
  async getTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // TODO: Get userId from auth middleware
      const userId = 'user-123'; // Placeholder

      // TODO: Implement - query transactions from repository
      res.status(501).json({
        success: false,
        error: 'Not implemented yet - use GetTransactionsUseCase',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unreconciled transactions
   * GET /api/finance/bank/transactions/unreconciled
   */
  async getUnreconciledTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // TODO: Get userId from auth middleware
      const userId = 'user-123'; // Placeholder

      // TODO: Implement - query unreconciled transactions from repository
      res.status(501).json({
        success: false,
        error: 'Not implemented yet - query repository.findUnreconciled()',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transaction by ID
   * GET /api/finance/bank/transactions/:id
   */
  async getTransactionById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      // TODO: Implement - query transaction from repository
      res.status(501).json({
        success: false,
        error: 'Not implemented yet - use GetTransactionByIdUseCase',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get potential matches for an expense
   * GET /api/finance/bank/transactions/matches
   *
   * Query params: amount, date, toleranceDays
   */
  async getPotentialMatches(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // TODO: Get userId from auth middleware
      const userId = 'user-123'; // Placeholder

      const amount = parseFloat(req.query.amount as string);
      const date = new Date(req.query.date as string);
      const toleranceDays = req.query.toleranceDays
        ? parseInt(req.query.toleranceDays as string)
        : 3;

      // TODO: Implement - use repository.findPotentialMatches()
      res.status(501).json({
        success: false,
        error: 'Not implemented yet - query repository.findPotentialMatches()',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reconcile transaction with expense
   * POST /api/finance/bank/transactions/:id/reconcile
   *
   * Request body: { expenseId: string }
   */
  async reconcileTransaction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const dto: ReconcileTransactionRequestDTO = req.body;

      // TODO: Get userId from auth middleware
      const userId = 'user-123'; // Placeholder

      // Execute reconcile use case
      const result = await this.reconcileTransactionUseCase.reconcile({
        transactionId: id,
        expenseId: dto.expenseId,
        userId,
      });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      // Map to response DTO
      const responseDTO = BankTransactionDTOMapper.toResponseDTO(result.value);

      res.status(200).json({
        success: true,
        data: responseDTO,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Ignore transaction
   * POST /api/finance/bank/transactions/:id/ignore
   */
  async ignoreTransaction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      // TODO: Get userId from auth middleware
      const userId = 'user-123'; // Placeholder

      // Execute ignore use case
      const result = await this.reconcileTransactionUseCase.ignore({
        transactionId: id,
        userId,
      });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      // Map to response DTO
      const responseDTO = BankTransactionDTOMapper.toResponseDTO(result.value);

      res.status(200).json({
        success: true,
        data: responseDTO,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unreconcile transaction
   * POST /api/finance/bank/transactions/:id/unreconcile
   */
  async unreconcileTransaction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      // TODO: Get userId from auth middleware
      const userId = 'user-123'; // Placeholder

      // Execute unreconcile use case
      const result = await this.reconcileTransactionUseCase.unreconcile({
        transactionId: id,
        userId,
      });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      // Map to response DTO
      const responseDTO = BankTransactionDTOMapper.toResponseDTO(result.value);

      res.status(200).json({
        success: true,
        data: responseDTO,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transaction statistics
   * GET /api/finance/bank/transactions/statistics
   *
   * Query params: startDate, endDate
   */
  async getStatistics(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // TODO: Get userId from auth middleware
      const userId = 'user-123'; // Placeholder

      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      // TODO: Implement - use repository.getStatistics()
      res.status(501).json({
        success: false,
        error: 'Not implemented yet - query repository.getStatistics()',
      });
    } catch (error) {
      next(error);
    }
  }
}
