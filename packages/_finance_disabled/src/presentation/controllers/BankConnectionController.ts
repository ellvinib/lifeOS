/**
 * BankConnectionController
 *
 * Thin controller for bank connection management (OAuth flows).
 * Coordinates HTTP ↔ Use Cases.
 *
 * Pattern:
 * 1. Parse request
 * 2. Call use case
 * 3. Map result to DTO
 * 4. Return response (or pass error to error handler)
 */

import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import {
  ConnectBankUseCase,
  SyncBankDataUseCase,
  DisconnectBankUseCase,
} from '../../application/use-cases';
import {
  BankConnectionDTOMapper,
  GetAuthUrlRequestDTO,
  CompleteConnectionRequestDTO,
} from '../../application/dtos';

/**
 * Bank Connection Controller
 *
 * Handles OAuth flow and connection management.
 */
export class BankConnectionController {
  constructor(
    private readonly connectBankUseCase: ConnectBankUseCase,
    private readonly syncBankDataUseCase: SyncBankDataUseCase,
    private readonly disconnectBankUseCase: DisconnectBankUseCase
  ) {}

  /**
   * Get authorization URL to initiate OAuth flow
   * POST /api/finance/bank/auth-url
   *
   * Request body: { provider: 'ponto' | 'isabel' }
   * Response: { authUrl: string, state: string }
   */
  async getAuthorizationUrl(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: GetAuthUrlRequestDTO = req.body;

      // Generate CSRF token
      const state = randomBytes(32).toString('hex');

      // Get authorization URL
      const result = this.connectBankUseCase.getAuthorizationUrl({
        provider: dto.provider,
        state,
      });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      // Store state in session for CSRF validation
      // TODO: Implement session storage
      // req.session.oauthState = state;

      res.status(200).json({
        success: true,
        data: {
          authUrl: result.value,
          state,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Complete OAuth connection after callback
   * POST /api/finance/bank/connect
   *
   * Request body: { provider: string, authCode: string }
   * Response: { connection: BankConnectionResponseDTO }
   */
  async completeConnection(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: CompleteConnectionRequestDTO = req.body;

      // TODO: Get userId from auth middleware
      const userId = 'user-123'; // Placeholder

      // TODO: Validate CSRF state
      // if (req.session.oauthState !== req.body.state) {
      //   return next(new ValidationError('Invalid state token'));
      // }

      // Complete connection
      const result = await this.connectBankUseCase.completeConnection({
        userId,
        provider: dto.provider,
        authCode: dto.authCode,
      });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      // Map to response DTO
      const responseDTO = BankConnectionDTOMapper.toResponseDTO(result.value);

      res.status(201).json({
        success: true,
        data: responseDTO,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all connections for current user
   * GET /api/finance/bank/connections
   *
   * Response: { connections: BankConnectionResponseDTO[] }
   */
  async getConnections(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // TODO: Get userId from auth middleware
      const userId = 'user-123'; // Placeholder

      // TODO: Implement GetConnectionsUseCase or query repository directly
      res.status(501).json({
        success: false,
        error: 'Not implemented yet',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get connection by ID
   * GET /api/finance/bank/connections/:id
   *
   * Response: { connection: BankConnectionResponseDTO }
   */
  async getConnectionById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      // TODO: Implement GetConnectionByIdUseCase or query repository directly
      res.status(501).json({
        success: false,
        error: 'Not implemented yet',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Sync bank data (accounts and transactions)
   * POST /api/finance/bank/connections/:id/sync
   *
   * Response: { accountsSynced: number, transactionsSynced: number, syncedAt: string }
   */
  async syncBankData(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      // Execute sync use case
      const result = await this.syncBankDataUseCase.execute({
        connectionId: id,
        syncTransactionsDays: 90, // Default to 90 days
      });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          accountsSynced: result.value.accountsSynced,
          transactionsSynced: result.value.transactionsSynced,
          syncedAt: result.value.syncedAt.toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Disconnect bank connection (revoke OAuth)
   * DELETE /api/finance/bank/connections/:id
   *
   * Response: { success: true }
   */
  async disconnectBank(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      // TODO: Get userId from auth middleware
      const userId = 'user-123'; // Placeholder

      // Execute disconnect use case
      const result = await this.disconnectBankUseCase.execute({
        connectionId: id,
        userId,
      });

      if (result.isFail()) {
        next(result.error);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Bank connection disconnected successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
