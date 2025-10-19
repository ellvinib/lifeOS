/**
 * ConnectBankUseCase
 *
 * Handles the bank connection OAuth flow.
 * Step 1: Generate authorization URL
 * Step 2: Exchange auth code for tokens
 * Step 3: Encrypt and store tokens
 *
 * Use Case Pattern (6 steps):
 * 1. Validate input
 * 2. Exchange code for tokens
 * 3. Encrypt tokens
 * 4. Create domain entity
 * 5. Persist to repository
 * 6. Publish domain event
 */

import { Result } from '@lifeOS/core/shared/result';
import { BaseError, ValidationError, BusinessRuleError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { IBankConnectionRepository } from '../../domain/interfaces/IBankConnectionRepository';
import { IIbanityService } from '../../domain/interfaces/IIbanityService';
import { IEncryptionService } from '../../domain/interfaces/IEncryptionService';
import { BankConnection } from '../../domain/entities/BankConnection';
import { BankProvider } from '../../domain/value-objects/BankEnums';

/**
 * Get Authorization URL Input
 */
export interface GetAuthUrlInput {
  provider: BankProvider;
  state: string; // CSRF token
}

/**
 * Complete Connection Input
 */
export interface CompleteConnectionInput {
  userId: string;
  provider: BankProvider;
  authCode: string;
}

/**
 * Connect Bank Use Case
 *
 * Manages the OAuth flow for connecting a bank account.
 *
 * Business Rules:
 * - User can only have one active connection per provider
 * - OAuth state must be validated (CSRF protection)
 * - Tokens must be encrypted before storage
 * - Connection must be marked as active after successful token exchange
 */
export class ConnectBankUseCase {
  constructor(
    private readonly bankConnectionRepository: IBankConnectionRepository,
    private readonly ibanityService: IIbanityService,
    private readonly encryptionService: IEncryptionService,
    private readonly eventBus: IEventBus
  ) {}

  /**
   * Step 1: Get authorization URL to redirect user
   */
  getAuthorizationUrl(input: GetAuthUrlInput): Result<string, BaseError> {
    // Validate input
    if (!input.provider) {
      return Result.fail(
        new ValidationError('Provider is required', [
          { field: 'provider', message: 'Bank provider is required' },
        ])
      );
    }

    if (!input.state || input.state.length < 32) {
      return Result.fail(
        new ValidationError('Invalid state token', [
          { field: 'state', message: 'State token must be at least 32 characters for security' },
        ])
      );
    }

    // Generate authorization URL
    const authUrl = this.ibanityService.getAuthorizationUrl(input.provider, input.state);

    return Result.ok(authUrl);
  }

  /**
   * Step 2: Complete connection after OAuth callback
   */
  async completeConnection(
    input: CompleteConnectionInput
  ): Promise<Result<BankConnection, BaseError>> {
    // Step 1: Validate input
    const validationResult = this.validateInput(input);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // Check if user already has connection for this provider
    const existingResult = await this.bankConnectionRepository.findByUserAndProvider(
      input.userId,
      input.provider
    );

    if (existingResult.isFail()) {
      return existingResult;
    }

    if (existingResult.value !== null) {
      return Result.fail(
        new BusinessRuleError(
          `You already have a connection to ${input.provider}`,
          'CONNECTION_ALREADY_EXISTS'
        )
      );
    }

    // Step 2: Exchange auth code for tokens
    const tokenResult = await this.ibanityService.exchangeCodeForTokens(
      input.authCode,
      input.provider
    );

    if (tokenResult.isFail()) {
      return Result.fail(tokenResult.error);
    }

    const tokens = tokenResult.value;

    // Step 3: Encrypt tokens
    let encryptedAccessToken: string;
    let encryptedRefreshToken: string;

    try {
      encryptedAccessToken = this.encryptionService.encrypt(tokens.accessToken);
      encryptedRefreshToken = this.encryptionService.encrypt(tokens.refreshToken);
    } catch (error) {
      return Result.fail(
        new BaseError(
          'ENCRYPTION_FAILED',
          `Failed to encrypt tokens: ${error instanceof Error ? error.message : 'Unknown error'}`,
          500
        )
      );
    }

    // Step 4: Create domain entity
    let connection: BankConnection;
    try {
      connection = BankConnection.create(
        input.userId,
        input.provider,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokens.expiresAt
      );
    } catch (error: any) {
      return Result.fail(
        new BusinessRuleError(error.message, 'CONNECTION_CREATION_FAILED')
      );
    }

    // Step 5: Persist to repository
    const saveResult = await this.bankConnectionRepository.save(connection);
    if (saveResult.isFail()) {
      return saveResult;
    }

    // Step 6: Publish domain event
    await this.eventBus.publish({
      type: 'BankConnected',
      source: 'finance',
      payload: {
        connectionId: connection.id,
        userId: connection.userId,
        provider: connection.provider,
        connectedAt: connection.createdAt,
      },
      metadata: {
        userId: input.userId,
        timestamp: new Date(),
      },
    });

    return Result.ok(saveResult.value);
  }

  /**
   * Validate input data
   */
  private validateInput(input: CompleteConnectionInput): Result<void, BaseError> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!input.userId || input.userId.trim().length === 0) {
      errors.push({ field: 'userId', message: 'User ID is required' });
    }

    if (!input.provider) {
      errors.push({ field: 'provider', message: 'Bank provider is required' });
    }

    if (!input.authCode || input.authCode.trim().length === 0) {
      errors.push({ field: 'authCode', message: 'Authorization code is required' });
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError('Invalid connection input', errors));
    }

    return Result.ok(undefined);
  }
}
