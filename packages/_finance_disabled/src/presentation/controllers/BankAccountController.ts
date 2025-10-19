/**
 * BankAccountController
 *
 * Thin controller for bank account management.
 */

import { Request, Response, NextFunction } from 'express';
import { BankAccountDTOMapper, ToggleSyncRequestDTO } from '../../application/dtos';

/**
 * Bank Account Controller
 *
 * Handles account viewing and sync control.
 */
export class BankAccountController {
  // TODO: Inject required use cases/repositories

  /**
   * Get all bank accounts for current user
   * GET /api/finance/bank/accounts
   */
  async getAccounts(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // TODO: Get userId from auth middleware
      const userId = 'user-123'; // Placeholder

      // TODO: Implement - query accounts from repository
      res.status(501).json({
        success: false,
        error: 'Not implemented yet - use GetAccountsUseCase',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get account by ID
   * GET /api/finance/bank/accounts/:id
   */
  async getAccountById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      // TODO: Implement - query account from repository
      res.status(501).json({
        success: false,
        error: 'Not implemented yet - use GetAccountByIdUseCase',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle sync for account
   * PATCH /api/finance/bank/accounts/:id/sync
   */
  async toggleSync(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const dto: ToggleSyncRequestDTO = req.body;

      // TODO: Implement - use ToggleSyncUseCase
      res.status(501).json({
        success: false,
        error: 'Not implemented yet - use ToggleSyncUseCase',
      });
    } catch (error) {
      next(error);
    }
  }
}
