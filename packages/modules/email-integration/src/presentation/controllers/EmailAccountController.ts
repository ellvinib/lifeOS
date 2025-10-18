import { Request, Response, NextFunction } from 'express';
import { ConnectAccountUseCase } from '../../application/use-cases/ConnectAccountUseCase';
import { DisconnectAccountUseCase } from '../../application/use-cases/DisconnectAccountUseCase';
import { IEmailAccountRepository } from '../../domain/interfaces/IEmailAccountRepository';
import {
  ConnectAccountDTO,
  EmailAccountMapper,
} from '../../application/dtos/EmailAccountDTO';
import { EmailProvider } from '../../domain/value-objects/EmailProvider';

/**
 * Email Account Controller
 *
 * Handles HTTP requests for email account management.
 * Thin controller - delegates to use cases.
 *
 * Endpoints:
 * - POST /accounts/connect - Connect new email account
 * - GET /accounts - List user's connected accounts
 * - DELETE /accounts/:id - Disconnect account
 */
export class EmailAccountController {
  constructor(
    private readonly connectAccountUseCase: ConnectAccountUseCase,
    private readonly disconnectAccountUseCase: DisconnectAccountUseCase,
    private readonly accountRepository: IEmailAccountRepository
  ) {}

  /**
   * Connect new email account
   *
   * POST /api/email/accounts/connect
   *
   * Body:
   * {
   *   "provider": "outlook" | "gmail" | "smtp",
   *   "email": "user@example.com",
   *   "emailName": "John Doe" (optional),
   *   "credentials": { ... }
   * }
   *
   * Credentials format depends on provider:
   * - Outlook/Gmail: { accessToken, refreshToken, expiresAt }
   * - SMTP: { username, password, imapHost, imapPort, ... }
   */
  connect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // TODO: Get userId from authenticated session
      // For now, use from request body (INSECURE - fix in production)
      const userId = req.body.userId || 'user-123';

      // Validate request body
      const dto: ConnectAccountDTO = {
        userId,
        provider: this.parseProvider(req.body.provider),
        email: req.body.email,
        emailName: req.body.emailName,
        credentials: req.body.credentials,
      };

      // Execute use case
      const result = await this.connectAccountUseCase.execute(dto);

      if (result.isFail()) {
        // Handle different error types
        const error = result.error;
        const statusCode = this.getStatusCodeForError(error);

        res.status(statusCode).json({
          error: error.message,
          code: (error as any).code || 'UNKNOWN_ERROR',
          details: (error as any).context,
        });
        return;
      }

      // Success
      const account = result.value;
      const responseDto = EmailAccountMapper.toResponseDTO(account);

      res.status(201).json({
        message: 'Email account connected successfully',
        account: responseDto,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * List user's connected email accounts
   *
   * GET /api/email/accounts
   *
   * Query params:
   * - provider: Filter by provider (optional)
   * - isActive: Filter by active status (optional)
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // TODO: Get userId from authenticated session
      const userId = req.query.userId as string || 'user-123';

      // Parse filters
      const filters: any = {};
      if (req.query.provider) {
        filters.provider = this.parseProvider(req.query.provider as string);
      }
      if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === 'true';
      }

      // Fetch accounts
      const result = await this.accountRepository.findByUser(userId, filters);

      if (result.isFail()) {
        res.status(500).json({
          error: 'Failed to fetch accounts',
          details: result.error.message,
        });
        return;
      }

      // Map to response DTOs
      const accounts = result.value;
      const responseDtos = EmailAccountMapper.toResponseDTOList(accounts);

      res.status(200).json({
        accounts: responseDtos,
        count: responseDtos.length,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Disconnect email account
   *
   * DELETE /api/email/accounts/:id
   */
  disconnect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accountId = req.params.id;

      // TODO: Get userId from authenticated session
      const userId = req.body.userId || 'user-123';

      // Execute use case
      const result = await this.disconnectAccountUseCase.execute(accountId, userId);

      if (result.isFail()) {
        const error = result.error;
        const statusCode = this.getStatusCodeForError(error);

        res.status(statusCode).json({
          error: error.message,
          code: (error as any).code || 'UNKNOWN_ERROR',
        });
        return;
      }

      // Success
      res.status(200).json({
        message: 'Email account disconnected successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Parse provider string to enum
   */
  private parseProvider(provider: string): EmailProvider {
    const normalized = provider.toLowerCase();

    if (normalized === 'outlook') return EmailProvider.OUTLOOK;
    if (normalized === 'gmail') return EmailProvider.GMAIL;
    if (normalized === 'smtp') return EmailProvider.SMTP;

    throw new Error(`Invalid provider: ${provider}`);
  }

  /**
   * Map error type to HTTP status code
   */
  private getStatusCodeForError(error: any): number {
    if (error.constructor.name === 'ValidationError') return 400;
    if (error.constructor.name === 'NotFoundError') return 404;
    if (error.constructor.name === 'BusinessRuleError') {
      if (error.code === 'UNAUTHORIZED') return 403;
      if (error.code === 'ACCOUNT_ALREADY_EXISTS') return 409;
      return 400;
    }
    if (error.constructor.name === 'ExternalServiceError') return 502;

    return 500; // Internal server error
  }
}
