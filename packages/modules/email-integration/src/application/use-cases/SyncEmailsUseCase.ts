import { IEmailAccountRepository } from '../../domain/interfaces/IEmailAccountRepository';
import { IEmailRepository } from '../../domain/interfaces/IEmailRepository';
import { IEmailProvider } from '../../domain/interfaces/IEmailProvider';
import { Email } from '../../domain/entities/Email';
import { EmailAddress } from '../../domain/value-objects/EmailAddress';
import { Result } from '@lifeOS/core/shared/result/Result';
import { BaseError } from '@lifeOS/core/shared/errors/BaseError';
import { NotFoundError } from '@lifeOS/core/shared/errors/NotFoundError';
import { BusinessRuleError } from '@lifeOS/core/shared/errors/BusinessRuleError';
import { IEventPublisher } from '@lifeOS/core/events/IEventPublisher';
import { v4 as uuidv4 } from 'uuid';

/**
 * Email Metadata from Provider
 */
export interface EmailMetadata {
  providerMessageId: string;
  from: string;
  fromName?: string;
  to: string[];
  subject: string;
  snippet: string;
  hasAttachments: boolean;
  timestamp: Date;
  labels?: string[];
}

/**
 * Sync Emails Use Case
 *
 * Synchronizes email metadata from provider to local database.
 *
 * Workflow:
 * 1. Get account from repository
 * 2. Verify account is active
 * 3. Get provider instance (OutlookProvider, GmailProvider, etc.)
 * 4. Fetch email metadata since last sync
 * 5. For each email:
 *    - Create Email domain entity
 *    - Save to repository (skip duplicates)
 *    - Publish EmailReceived event
 * 6. Update account.lastSyncedAt
 *
 * Design Principles:
 * - Non-blocking: Returns quickly, processing in background
 * - Idempotent: Safe to run multiple times
 * - Event-driven: Publishes events for downstream processing
 * - Metadata-only: Does not fetch full email content
 */
export class SyncEmailsUseCase {
  constructor(
    private readonly accountRepository: IEmailAccountRepository,
    private readonly emailRepository: IEmailRepository,
    private readonly providers: Map<string, IEmailProvider>, // provider name → provider instance
    private readonly eventPublisher: IEventPublisher
  ) {}

  /**
   * Execute email sync for an account
   *
   * @param accountId - Account ID to sync
   * @param options - Sync options
   * @returns Number of emails synced or error
   */
  async execute(
    accountId: string,
    options?: {
      limit?: number; // Max emails to sync per batch
      fullSync?: boolean; // Ignore lastSyncedAt and sync all
    }
  ): Promise<Result<number, BaseError>> {
    // 1. Get account from repository
    const accountResult = await this.accountRepository.findById(accountId);
    if (accountResult.isFail()) {
      return Result.fail(accountResult.error);
    }

    const account = accountResult.value;

    // 2. Verify account is active
    if (!account.isActive) {
      return Result.fail(
        new BusinessRuleError(
          'Cannot sync inactive account',
          'ACCOUNT_INACTIVE',
          { accountId }
        )
      );
    }

    // 3. Get provider instance
    const provider = this.providers.get(account.provider);
    if (!provider) {
      return Result.fail(
        new BusinessRuleError(
          `Provider not configured: ${account.provider}`,
          'PROVIDER_NOT_CONFIGURED',
          { provider: account.provider }
        )
      );
    }

    // 4. Determine sync start date
    const since = options?.fullSync ? undefined : account.lastSyncedAt || undefined;

    // 5. Fetch email metadata from provider
    const metadataResult = await provider.listEmails(
      account.encryptedCredentials, // TODO: Decrypt credentials
      since,
      options?.limit || 50
    );

    if (metadataResult.isFail()) {
      return Result.fail(metadataResult.error);
    }

    const emailMetadataList = metadataResult.value;

    // 6. Process each email
    let syncedCount = 0;
    const emailEntities: Email[] = [];

    for (const metadata of emailMetadataList) {
      // Create Email entity
      const emailResult = this.createEmailEntity(account.id, account.provider, metadata);
      if (emailResult.isFail()) {
        // Log error but continue processing
        console.error(`Failed to create email entity: ${emailResult.error.message}`);
        continue;
      }

      emailEntities.push(emailResult.value);
    }

    // 7. Batch save emails (more efficient than individual saves)
    if (emailEntities.length > 0) {
      const saveResult = await this.emailRepository.createMany(emailEntities);
      if (saveResult.isFail()) {
        return Result.fail(saveResult.error);
      }

      syncedCount = saveResult.value.length;

      // 8. Publish EmailReceived events for each email
      for (const email of saveResult.value) {
        await this.publishEmailReceivedEvent(email);
      }
    }

    // 9. Update account.lastSyncedAt
    account.updateLastSyncedAt(new Date());
    const updateResult = await this.accountRepository.update(account);
    if (updateResult.isFail()) {
      // Log warning but don't fail the sync
      console.warn(`Failed to update lastSyncedAt: ${updateResult.error.message}`);
    }

    return Result.ok(syncedCount);
  }

  /**
   * Create Email domain entity from provider metadata
   */
  private createEmailEntity(
    accountId: string,
    provider: string,
    metadata: EmailMetadata
  ): Result<Email, BaseError> {
    try {
      // Parse from address
      const fromResult = EmailAddress.create(metadata.from, metadata.fromName);
      if (fromResult.isFail()) {
        return Result.fail(fromResult.error);
      }

      // Parse to addresses
      const toAddresses: EmailAddress[] = [];
      for (const toEmail of metadata.to) {
        const toResult = EmailAddress.create(toEmail);
        if (toResult.isFail()) {
          return Result.fail(toResult.error);
        }
        toAddresses.push(toResult.value);
      }

      // Create Email entity
      const email = Email.create({
        id: uuidv4(),
        accountId,
        providerMessageId: metadata.providerMessageId,
        provider: provider as any, // EmailProvider enum
        from: fromResult.value,
        to: toAddresses,
        subject: metadata.subject,
        snippet: metadata.snippet,
        hasAttachments: metadata.hasAttachments,
        timestamp: metadata.timestamp,
        labels: metadata.labels || [],
      });

      return Result.ok(email);
    } catch (error) {
      return Result.fail(
        new BusinessRuleError(
          'Failed to create email entity',
          'EMAIL_CREATION_FAILED',
          { metadata, error: error instanceof Error ? error.message : 'Unknown error' }
        )
      );
    }
  }

  /**
   * Publish EmailReceived event to EventBus
   */
  private async publishEmailReceivedEvent(email: Email): Promise<void> {
    try {
      await this.eventPublisher.publish({
        type: 'EmailReceived',
        source: 'email-integration',
        payload: {
          emailId: email.id,
          accountId: email.accountId,
          provider: email.provider,
          from: {
            address: email.from.address,
            name: email.from.name,
          },
          to: email.to.map((addr) => ({
            address: addr.address,
            name: addr.name,
          })),
          subject: email.subject,
          snippet: email.snippet,
          hasAttachments: email.hasAttachmentsFlag,
          timestamp: email.timestamp.toISOString(),
          labels: email.labels,
        },
        metadata: {
          syncedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      // Log error but don't fail the sync
      console.error(`Failed to publish EmailReceived event: ${error}`);
    }
  }
}
