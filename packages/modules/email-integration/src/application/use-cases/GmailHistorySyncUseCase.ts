import { google } from 'googleapis';
import { IEmailAccountRepository } from '../../domain/interfaces/IEmailAccountRepository';
import { IEmailRepository } from '../../domain/interfaces/IEmailRepository';
import { Email } from '../../domain/entities/Email';
import { EmailAddress } from '../../domain/value-objects/EmailAddress';
import { Result } from '@lifeOS/core/shared/result/Result';
import { BaseError } from '@lifeOS/core/shared/errors/BaseError';
import { BusinessRuleError } from '@lifeOS/core/shared/errors/BusinessRuleError';
import { ExternalServiceError } from '@lifeOS/core/shared/errors/ExternalServiceError';
import { ValidationError } from '@lifeOS/core/shared/errors/ValidationError';
import { IEventPublisher } from '@lifeOS/core/events/IEventPublisher';
import { SyncEmailsUseCase } from './SyncEmailsUseCase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Gmail History Sync Use Case
 *
 * Syncs emails using Gmail's History API for incremental changes.
 *
 * This is more efficient than full sync because it only fetches
 * what changed since the last historyId.
 *
 * Workflow:
 * 1. Get account and verify it's Gmail
 * 2. Get startHistoryId from account.providerData
 * 3. Call History API to get changes
 * 4. Paginate through results (handle nextPageToken)
 * 5. Filter for messagesAdded events
 * 6. Fetch metadata for new messages
 * 7. Create Email entities and save
 * 8. Publish EmailReceived events
 * 9. Update account.historyId
 *
 * Fallback Strategy:
 * - If historyId is too old (404 error), fallback to SyncEmailsUseCase
 * - Google only keeps ~30 days of history
 *
 * Design Principles:
 * - Gmail-specific (doesn't implement IEmailProvider interface)
 * - Highly efficient (delta sync)
 * - Resilient (fallback to full sync)
 * - Event-driven (publishes events)
 */
export class GmailHistorySyncUseCase {
  constructor(
    private readonly accountRepository: IEmailAccountRepository,
    private readonly emailRepository: IEmailRepository,
    private readonly eventPublisher: IEventPublisher,
    private readonly syncEmailsUseCase: SyncEmailsUseCase // Fallback for full sync
  ) {}

  /**
   * Execute Gmail history sync
   *
   * @param accountId - Account ID to sync
   * @returns Number of new emails synced
   */
  async execute(accountId: string): Promise<Result<number, BaseError>> {
    // 1. Get account
    const accountResult = await this.accountRepository.findById(accountId);
    if (accountResult.isFail()) {
      return Result.fail(accountResult.error);
    }

    const account = accountResult.value;

    // 2. Verify account is Gmail
    if (account.provider !== 'gmail') {
      return Result.fail(
        new BusinessRuleError(
          'Account is not a Gmail account',
          'INVALID_PROVIDER',
          { accountId, provider: account.provider }
        )
      );
    }

    // 3. Verify account is active
    if (!account.isActive) {
      return Result.fail(
        new BusinessRuleError(
          'Cannot sync inactive account',
          'ACCOUNT_INACTIVE',
          { accountId }
        )
      );
    }

    // 4. Get historyId from providerData
    const providerData = account.providerData || {};
    const startHistoryId = providerData.historyId;

    if (!startHistoryId) {
      // No historyId yet - fallback to full sync
      console.log(`No historyId for account ${account.email}, falling back to full sync`);
      return await this.syncEmailsUseCase.execute(accountId);
    }

    try {
      // 5. Create OAuth client
      const authResult = this.createAuthClient(account.encryptedCredentials);
      if (authResult.isFail()) {
        return Result.fail(authResult.error);
      }

      const auth = authResult.value;
      const gmail = google.gmail({ version: 'v1', auth });

      // 6. Fetch history changes
      const historyResult = await this.fetchHistoryChanges(gmail, startHistoryId);
      if (historyResult.isFail()) {
        // Check if historyId is too old (fallback to full sync)
        if (historyResult.error.message.includes('404') ||
            historyResult.error.message.includes('historyId')) {
          console.log(`HistoryId too old for account ${account.email}, falling back to full sync`);
          return await this.syncEmailsUseCase.execute(accountId);
        }
        return Result.fail(historyResult.error);
      }

      const { messageIds, newHistoryId } = historyResult.value;

      if (messageIds.length === 0) {
        console.log(`No new messages for account ${account.email}`);

        // Still update historyId
        providerData.historyId = newHistoryId;
        account.updateProviderData(providerData);
        await this.accountRepository.update(account);

        return Result.ok(0);
      }

      // 7. Fetch metadata for new messages
      const emailEntities: Email[] = [];

      for (const messageId of messageIds) {
        try {
          const messageResponse = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date'],
          });

          const message = messageResponse.data;
          const emailResult = this.createEmailEntity(account.id, account.provider, message);

          if (emailResult.isOk()) {
            emailEntities.push(emailResult.value);
          }
        } catch (error) {
          console.error(`Failed to fetch metadata for message ${messageId}:`, error);
          // Continue with other messages
        }
      }

      // 8. Batch save emails
      let syncedCount = 0;

      if (emailEntities.length > 0) {
        const saveResult = await this.emailRepository.createMany(emailEntities);
        if (saveResult.isFail()) {
          return Result.fail(saveResult.error);
        }

        syncedCount = saveResult.value.length;

        // 9. Publish EmailReceived events
        for (const email of saveResult.value) {
          await this.publishEmailReceivedEvent(email);
        }
      }

      // 10. Update historyId
      providerData.historyId = newHistoryId;
      account.updateProviderData(providerData);
      account.updateLastSyncedAt(new Date());

      const updateResult = await this.accountRepository.update(account);
      if (updateResult.isFail()) {
        console.warn(`Failed to update historyId: ${updateResult.error.message}`);
      }

      console.log(`✓ Gmail history sync completed for ${account.email}: ${syncedCount} new emails`);

      return Result.ok(syncedCount);
    } catch (error: any) {
      console.error(`Gmail history sync failed for ${account.email}:`, error);

      return Result.fail(
        new ExternalServiceError(
          'Failed to sync Gmail history',
          error,
          { accountId }
        )
      );
    }
  }

  /**
   * Fetch history changes from Gmail API
   */
  private async fetchHistoryChanges(
    gmail: any,
    startHistoryId: string
  ): Promise<
    Result<
      {
        messageIds: string[];
        newHistoryId: string;
      },
      BaseError
    >
  > {
    try {
      const messageIds: string[] = [];
      let pageToken: string | undefined;
      let latestHistoryId = startHistoryId;

      do {
        const response = await gmail.users.history.list({
          userId: 'me',
          startHistoryId,
          historyTypes: ['messageAdded'], // Only interested in new messages
          pageToken,
        });

        const history = response.data.history || [];
        latestHistoryId = response.data.historyId || latestHistoryId;

        // Extract message IDs from messagesAdded events
        for (const record of history) {
          if (record.messagesAdded) {
            for (const added of record.messagesAdded) {
              if (added.message?.id) {
                messageIds.push(added.message.id);
              }
            }
          }
        }

        pageToken = response.data.nextPageToken;
      } while (pageToken);

      return Result.ok({
        messageIds,
        newHistoryId: latestHistoryId,
      });
    } catch (error: any) {
      return Result.fail(
        new ExternalServiceError(
          'Failed to fetch Gmail history',
          error,
          { startHistoryId }
        )
      );
    }
  }

  /**
   * Create Email entity from Gmail message
   */
  private createEmailEntity(
    accountId: string,
    provider: string,
    message: any
  ): Result<Email, BaseError> {
    try {
      const headers = message.payload?.headers || [];

      // Extract from
      const fromHeader = headers.find((h: any) => h.name?.toLowerCase() === 'from')?.value || 'unknown';
      const fromMatch = fromHeader.match(/<(.+?)>/) || fromHeader.match(/^(.+?)$/);
      const fromAddress = fromMatch ? fromMatch[1] : fromHeader;
      const fromName = fromHeader.replace(/<.*?>/, '').trim() || null;

      const fromResult = EmailAddress.create(fromAddress, fromName);
      if (fromResult.isFail()) {
        return Result.fail(fromResult.error);
      }

      // Extract to
      const toHeader = headers.find((h: any) => h.name?.toLowerCase() === 'to')?.value || '';
      const toAddresses: EmailAddress[] = [];

      for (const toEmail of toHeader.split(',')) {
        const match = toEmail.match(/<(.+?)>/) || toEmail.match(/^(.+?)$/);
        const address = match ? match[1].trim() : toEmail.trim();

        if (address) {
          const toResult = EmailAddress.create(address);
          if (toResult.isOk()) {
            toAddresses.push(toResult.value);
          }
        }
      }

      if (toAddresses.length === 0) {
        // Default recipient
        const defaultResult = EmailAddress.create('unknown@unknown.com');
        if (defaultResult.isOk()) {
          toAddresses.push(defaultResult.value);
        }
      }

      // Extract subject
      const subject = headers.find((h: any) => h.name?.toLowerCase() === 'subject')?.value || '(no subject)';

      // Extract date
      const dateHeader = headers.find((h: any) => h.name?.toLowerCase() === 'date')?.value;
      const timestamp = dateHeader ? new Date(dateHeader) : new Date(parseInt(message.internalDate || '0', 10));

      // Get snippet and labels
      const snippet = message.snippet || '';
      const labels = message.labelIds || [];
      const hasAttachments = labels.includes('HAS_ATTACHMENT') || false;

      // Create Email entity
      const email = Email.create({
        id: uuidv4(),
        accountId,
        providerMessageId: message.id,
        provider: provider as any,
        from: fromResult.value,
        to: toAddresses,
        subject,
        snippet: snippet.substring(0, 500), // Limit snippet
        hasAttachments,
        timestamp,
        labels,
      });

      return Result.ok(email);
    } catch (error) {
      return Result.fail(
        new ValidationError('Failed to create email entity', [
          {
            field: 'message',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ])
      );
    }
  }

  /**
   * Create OAuth client from credentials
   */
  private createAuthClient(credentials: string): Result<any, ValidationError> {
    try {
      const parsed = JSON.parse(credentials);

      if (!parsed.accessToken || !parsed.refreshToken) {
        return Result.fail(
          new ValidationError('Invalid Gmail credentials', [
            { field: 'credentials', message: 'Missing accessToken or refreshToken' },
          ])
        );
      }

      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: parsed.accessToken,
        refresh_token: parsed.refreshToken,
        expiry_date: parsed.expiresAt ? new Date(parsed.expiresAt).getTime() : undefined,
      });

      return Result.ok(oauth2Client);
    } catch (error) {
      return Result.fail(
        new ValidationError('Failed to parse credentials', [
          { field: 'credentials', message: 'Invalid JSON format' },
        ])
      );
    }
  }

  /**
   * Publish EmailReceived event
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
          syncMethod: 'gmail-history-api',
        },
      });
    } catch (error) {
      console.error(`Failed to publish EmailReceived event: ${error}`);
    }
  }
}
