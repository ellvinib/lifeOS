import { Result } from '@lifeos/core/shared/result';
import { BaseError, ValidationError, BusinessRuleError } from '@lifeos/core/shared/errors';
import { EmailAccount } from '../../domain/entities/EmailAccount';
import { EmailAddress } from '../../domain/value-objects/EmailAddress';
import { EmailProvider } from '../../domain/value-objects/EmailProvider';
import { IEmailAccountRepository } from '../../domain/interfaces/IEmailAccountRepository';
import { IEmailConnectionManager } from '../../domain/interfaces/IEmailConnectionManager';
import { ConnectAccountDTO } from '../dtos/EmailAccountDTO';
import { v4 as uuidv4 } from 'uuid';

/**
 * Connect Account Use Case
 *
 * Connects a new email account to LifeOS.
 *
 * Workflow:
 * 1. Validate input (email format, credentials)
 * 2. Check if account already exists for this user
 * 3. Create EmailAccount entity
 * 4. Save to repository
 * 5. Setup provider-specific connection (webhook subscription)
 * 6. Activate account (mark as ready)
 * 7. Trigger initial sync (optional)
 *
 * Clean Architecture:
 * - Use case coordinates domain entities and infrastructure
 * - No direct dependency on external services (uses interfaces)
 * - Returns Result<T, E> for functional error handling
 */
export class ConnectAccountUseCase {
  constructor(
    private readonly accountRepository: IEmailAccountRepository,
    private readonly connectionManagers: {
      outlook?: IEmailConnectionManager;
      gmail?: IEmailConnectionManager;
      smtp?: IEmailConnectionManager;
    },
    private readonly triggerInitialSync?: (accountId: string) => Promise<void>
  ) {}

  /**
   * Execute use case
   *
   * @param dto - Connection parameters
   * @returns Result containing created EmailAccount or error
   */
  async execute(dto: ConnectAccountDTO): Promise<Result<EmailAccount, BaseError>> {
    console.log(`[ConnectAccountUseCase] Connecting ${dto.provider} account: ${dto.email}`);

    // Step 1: Validate input
    const validationResult = this.validateInput(dto);
    if (validationResult.isFail()) {
      return Result.fail(validationResult.error);
    }

    // Step 2: Check if account already exists
    const existsResult = await this.checkAccountExists(dto.userId, dto.email);
    if (existsResult.isFail()) {
      return Result.fail(existsResult.error);
    }

    // Step 3: Create EmailAddress value object
    const emailAddressResult = EmailAddress.create(dto.email, dto.emailName);
    if (emailAddressResult.isFail()) {
      return Result.fail(emailAddressResult.error);
    }

    // Step 4: Encrypt credentials
    const encryptedCredentials = this.encryptCredentials(dto.credentials);

    // Step 5: Create EmailAccount entity
    const account = EmailAccount.create({
      id: uuidv4(),
      userId: dto.userId,
      provider: dto.provider,
      emailAddress: emailAddressResult.value,
      encryptedCredentials,
    });

    // Step 6: Save to repository
    const saveResult = await this.accountRepository.create(account);
    if (saveResult.isFail()) {
      console.error(`[ConnectAccountUseCase] Failed to save account:`, saveResult.error);
      return Result.fail(saveResult.error);
    }

    console.log(`✓ Account saved: ${account.id}`);

    // Step 7: Setup provider-specific connection
    const connectionResult = await this.setupConnection(account);
    if (connectionResult.isFail()) {
      console.error(`[ConnectAccountUseCase] Connection setup failed:`, connectionResult.error);

      // Rollback: Delete account from repository
      await this.accountRepository.delete(account.id);

      return Result.fail(connectionResult.error);
    }

    console.log(`✓ Connection established for ${dto.provider}`);

    // Step 8: Activate account
    account.activate();
    const updateResult = await this.accountRepository.update(account);
    if (updateResult.isFail()) {
      console.error(`[ConnectAccountUseCase] Failed to activate account:`, updateResult.error);
      return Result.fail(updateResult.error);
    }

    console.log(`✓ Account activated: ${account.email}`);

    // Step 9: Trigger initial sync (optional)
    if (this.triggerInitialSync) {
      try {
        await this.triggerInitialSync(account.id);
        console.log(`✓ Initial sync triggered for ${account.email}`);
      } catch (error: any) {
        console.warn(`Initial sync failed (non-critical):`, error.message);
        // Don't fail the entire use case if sync fails
      }
    }

    console.log(`[ConnectAccountUseCase] ✅ Successfully connected ${account.email}`);

    return Result.ok(account);
  }

  /**
   * Validate input data
   */
  private validateInput(dto: ConnectAccountDTO): Result<void, ValidationError> {
    const errors: Array<{ field: string; message: string }> = [];

    // Validate user ID
    if (!dto.userId || dto.userId.trim().length === 0) {
      errors.push({ field: 'userId', message: 'User ID is required' });
    }

    // Validate email
    if (!dto.email || dto.email.trim().length === 0) {
      errors.push({ field: 'email', message: 'Email address is required' });
    }

    // Validate provider
    if (!Object.values(EmailProvider).includes(dto.provider)) {
      errors.push({
        field: 'provider',
        message: `Invalid provider. Must be one of: ${Object.values(EmailProvider).join(', ')}`,
      });
    }

    // Validate credentials based on provider
    const credentialsError = this.validateCredentials(dto.provider, dto.credentials);
    if (credentialsError) {
      errors.push(credentialsError);
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError('Invalid account connection data', errors));
    }

    return Result.ok(undefined);
  }

  /**
   * Validate provider-specific credentials
   */
  private validateCredentials(
    provider: EmailProvider,
    credentials: any
  ): { field: string; message: string } | null {
    switch (provider) {
      case EmailProvider.OUTLOOK:
      case EmailProvider.GMAIL:
        // OAuth credentials
        if (!credentials.accessToken) {
          return { field: 'credentials.accessToken', message: 'Access token is required' };
        }
        if (!credentials.refreshToken) {
          return { field: 'credentials.refreshToken', message: 'Refresh token is required' };
        }
        break;

      case EmailProvider.SMTP:
        // Username/password credentials
        if (!credentials.username) {
          return { field: 'credentials.username', message: 'Username is required' };
        }
        if (!credentials.password) {
          return { field: 'credentials.password', message: 'Password is required' };
        }
        if (!credentials.imapHost) {
          return { field: 'credentials.imapHost', message: 'IMAP host is required' };
        }
        break;
    }

    return null;
  }

  /**
   * Check if account already exists for this user
   */
  private async checkAccountExists(
    userId: string,
    email: string
  ): Promise<Result<void, BusinessRuleError>> {
    const exists = await this.accountRepository.exists(userId, email);

    if (exists) {
      return Result.fail(
        new BusinessRuleError(
          'Account already exists',
          'ACCOUNT_ALREADY_EXISTS',
          {
            userId,
            email,
          }
        )
      );
    }

    return Result.ok(undefined);
  }

  /**
   * Setup provider-specific connection
   *
   * Outlook: Create webhook subscription
   * Gmail: Setup Cloud Pub/Sub watch
   * SMTP: Establish IMAP IDLE connection
   */
  private async setupConnection(account: EmailAccount): Promise<Result<void, BaseError>> {
    const manager = this.getConnectionManager(account.provider);

    if (!manager) {
      return Result.fail(
        new BusinessRuleError(
          `Connection manager not available for ${account.provider}`,
          'CONNECTION_MANAGER_NOT_FOUND',
          { provider: account.provider }
        )
      );
    }

    return await manager.setup(account);
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

  /**
   * Encrypt credentials for storage
   *
   * SECURITY: In production, use proper encryption (KMS, vault, etc.)
   * For now, this is a placeholder that stores as JSON string.
   *
   * TODO: Implement proper encryption
   */
  private encryptCredentials(credentials: any): string {
    // PLACEHOLDER: In production, encrypt with KMS or similar
    return JSON.stringify(credentials);
  }
}
