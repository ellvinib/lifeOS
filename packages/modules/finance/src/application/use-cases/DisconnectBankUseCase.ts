/**
 * DisconnectBankUseCase
 *
 * Disconnect a bank connection and revoke OAuth access.
 *
 * Use Case Pattern (6 steps):
 * 1. Validate input
 * 2. Get connection
 * 3. Revoke access with Ibanity
 * 4. Mark connection as revoked
 * 5. Persist changes
 * 6. Publish domain event
 */

import { Result } from '@lifeOS/core/shared/result';
import { BaseError, ValidationError, BusinessRuleError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { IBankConnectionRepository } from '../../domain/interfaces/IBankConnectionRepository';
import { IIbanityService } from '../../domain/interfaces/IIbanityService';
import { IEncryptionService } from '../../domain/interfaces/IEncryptionService';
import { BankConnection } from '../../domain/entities/BankConnection';
import { ConnectionStatus } from '../../domain/value-objects/BankEnums';

/**
 * Disconnect Bank Input
 */
export interface DisconnectBankInput {
  connectionId: string;
  userId: string; // For validation
}

/**
 * Disconnect Bank Use Case
 *
 * Revokes OAuth access and marks connection as revoked.
 *
 * Business Rules:
 * - Connection must belong to user
 * - Can disconnect even if token is expired
 * - Revocation with Ibanity is best-effort (continue even if fails)
 * - All accounts and transactions remain in database (for audit)
 * - Connection status changes to REVOKED
 */
export class DisconnectBankUseCase {
  constructor(
    private readonly bankConnectionRepository: IBankConnectionRepository,
    private readonly ibanityService: IIbanityService,
    private readonly encryptionService: IEncryptionService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(input: DisconnectBankInput): Promise<Result<void, BaseError>> {
    // Step 1: Validate input
    const validationResult = this.validateInput(input);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // Step 2: Get connection
    const connectionResult = await this.bankConnectionRepository.findById(input.connectionId);
    if (connectionResult.isFail()) {
      return connectionResult;
    }

    const connection = connectionResult.value;

    // Validate ownership
    if (connection.userId !== input.userId) {
      return Result.fail(
        new BusinessRuleError(
          'Connection does not belong to user',
          'UNAUTHORIZED_ACCESS'
        )
      );
    }

    // Check if already revoked
    if (connection.status === ConnectionStatus.REVOKED) {
      return Result.fail(
        new BusinessRuleError(
          'Connection is already disconnected',
          'CONNECTION_ALREADY_REVOKED'
        )
      );
    }

    // Step 3: Revoke access with Ibanity (best-effort)
    try {
      const accessToken = this.encryptionService.decrypt(connection.encryptedAccessToken);

      const revokeResult = await this.ibanityService.revokeAccess(
        accessToken,
        connection.provider
      );

      // Log but don't fail if revocation fails
      if (revokeResult.isFail()) {
        console.warn(
          `Failed to revoke access with Ibanity for connection ${connection.id}:`,
          revokeResult.error
        );
      }
    } catch (error) {
      // Continue even if decryption or revocation fails
      console.warn(`Error during token revocation:`, error);
    }

    // Step 4: Mark connection as revoked
    connection.revoke();

    // Step 5: Persist changes
    const saveResult = await this.bankConnectionRepository.save(connection);
    if (saveResult.isFail()) {
      return saveResult;
    }

    // Step 6: Publish domain event
    await this.eventBus.publish({
      type: 'BankDisconnected',
      source: 'finance',
      payload: {
        connectionId: connection.id,
        userId: connection.userId,
        provider: connection.provider,
        disconnectedAt: new Date(),
      },
      metadata: {
        userId: input.userId,
        timestamp: new Date(),
      },
    });

    return Result.ok(undefined);
  }

  /**
   * Validate input
   */
  private validateInput(input: DisconnectBankInput): Result<void, BaseError> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!input.connectionId) {
      errors.push({ field: 'connectionId', message: 'Connection ID is required' });
    }

    if (!input.userId) {
      errors.push({ field: 'userId', message: 'User ID is required' });
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError('Invalid disconnect input', errors));
    }

    return Result.ok(undefined);
  }
}
