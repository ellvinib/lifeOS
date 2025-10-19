import { Result } from '@lifeos/core/shared/result';
import { BaseError, BusinessRuleError } from '@lifeos/core/shared/errors';
import { EmailAccount } from '../../domain/entities/EmailAccount';
import { EmailProvider } from '../../domain/value-objects/EmailProvider';
import { IEmailAccountRepository } from '../../domain/interfaces/IEmailAccountRepository';
import { IEmailConnectionManager } from '../../domain/interfaces/IEmailConnectionManager';

/**
 * Disconnect Account Use Case
 *
 * Disconnects an email account from LifeOS.
 *
 * Workflow:
 * 1. Find account by ID
 * 2. Verify user owns the account
 * 3. Teardown provider-specific connection (delete webhook subscription)
 * 4. Deactivate account
 * 5. Delete account from repository
 *
 * Clean Architecture:
 * - Use case coordinates domain entities and infrastructure
 * - Ensures proper cleanup of external resources
 * - Returns Result<T, E> for functional error handling
 */
export class DisconnectAccountUseCase {
  constructor(
    private readonly accountRepository: IEmailAccountRepository,
    private readonly connectionManagers: {
      outlook?: IEmailConnectionManager;
      gmail?: IEmailConnectionManager;
      smtp?: IEmailConnectionManager;
    }
  ) {}

  /**
   * Execute use case
   *
   * @param accountId - ID of account to disconnect
   * @param userId - ID of user requesting disconnection (for authorization)
   * @returns Result containing success or error
   */
  async execute(accountId: string, userId: string): Promise<Result<void, BaseError>> {
    console.log(`[DisconnectAccountUseCase] Disconnecting account: ${accountId}`);

    // Step 1: Find account
    const accountResult = await this.accountRepository.findById(accountId);
    if (accountResult.isFail()) {
      return Result.fail(accountResult.error);
    }

    const account = accountResult.value;

    // Step 2: Verify user owns the account (authorization)
    if (!account.belongsTo(userId)) {
      return Result.fail(
        new BusinessRuleError(
          'You do not have permission to disconnect this account',
          'UNAUTHORIZED',
          {
            accountId,
            userId,
            accountOwner: account.userId,
          }
        )
      );
    }

    console.log(`✓ Account found: ${account.email}`);

    // Step 3: Teardown connection (delete webhook, stop IMAP, etc.)
    const teardownResult = await this.teardownConnection(account);
    if (teardownResult.isFail()) {
      console.warn(
        `[DisconnectAccountUseCase] Teardown failed (continuing anyway):`,
        teardownResult.error.message
      );
      // Don't fail the entire operation if teardown fails
      // The subscription/connection might already be deleted
    }

    console.log(`✓ Connection teardown complete for ${account.email}`);

    // Step 4: Deactivate account (mark as inactive)
    account.deactivate();
    await this.accountRepository.update(account);

    console.log(`✓ Account deactivated: ${account.email}`);

    // Step 5: Delete account from repository
    const deleteResult = await this.accountRepository.delete(accountId);
    if (deleteResult.isFail()) {
      console.error(
        `[DisconnectAccountUseCase] Failed to delete account:`,
        deleteResult.error
      );
      return Result.fail(deleteResult.error);
    }

    console.log(`[DisconnectAccountUseCase] ✅ Successfully disconnected ${account.email}`);

    return Result.ok(undefined);
  }

  /**
   * Teardown provider-specific connection
   *
   * Outlook: Delete webhook subscription
   * Gmail: Stop Cloud Pub/Sub watch
   * SMTP: Close IMAP connection
   */
  private async teardownConnection(account: EmailAccount): Promise<Result<void, BaseError>> {
    const manager = this.getConnectionManager(account.provider);

    if (!manager) {
      console.warn(`No connection manager found for ${account.provider}`);
      return Result.ok(undefined); // Not critical
    }

    return await manager.teardown(account);
  }

  /**
   * Get connection manager for provider
   */
  private getConnectionManager(provider: EmailProvider): IEmailConnectionManager | null {
    switch (provider) {
      case EmailProvider.OUTLOOK:
        return this.connectionManagers.outlook || null;
      case EmailProvider.GMAIL:
        return this.connectionManagers.gmail || null;
      case EmailProvider.SMTP:
        return this.connectionManagers.smtp || null;
      default:
        return null;
    }
  }
}
