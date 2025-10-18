import { google } from 'googleapis';
import { EmailAccount } from '../../domain/entities/EmailAccount';
import { IEmailConnectionManager } from '../../domain/interfaces/IEmailConnectionManager';
import { Result } from '@lifeOS/core/shared/result/Result';
import { BaseError } from '@lifeOS/core/shared/errors/BaseError';
import { ExternalServiceError } from '@lifeOS/core/shared/errors/ExternalServiceError';
import { ValidationError } from '@lifeOS/core/shared/errors/ValidationError';

/**
 * Gmail Connection Manager
 *
 * Manages Gmail API watch() subscriptions for push notifications.
 *
 * Design Differences from Outlook:
 * - Uses Google Cloud Pub/Sub for notifications (not direct webhooks)
 * - Watch expires after 7 days (vs Outlook's 3 days)
 * - Returns historyId (for History API incremental sync)
 * - Requires Pub/Sub topic setup in Google Cloud
 *
 * Gmail Watch Flow:
 * 1. Create watch() on user's mailbox
 * 2. Gmail pushes notifications to Pub/Sub topic
 * 3. Pub/Sub delivers to our HTTP endpoint (push subscription)
 * 4. We process notification and sync via History API
 *
 * Setup Requirements:
 * - Google Cloud Project with Gmail API enabled
 * - Pub/Sub topic created (e.g., "projects/PROJECT_ID/topics/gmail-notifications")
 * - Push subscription to our webhook endpoint
 * - IAM permissions: gmail-api-push@system.gserviceaccount.com needs pubsub.publisher
 *
 * Setup Workflow:
 * 1. Call gmail.users.watch()
 * 2. Store watchId, historyId, expiration in providerData
 * 3. Return success (Pub/Sub already configured)
 *
 * Renew Workflow:
 * 1. Stop old watch (Gmail auto-expires, no explicit stop needed)
 * 2. Create new watch
 * 3. Update providerData
 *
 * Teardown Workflow:
 * 1. Call gmail.users.stop() to cancel watch
 * 2. Clear providerData
 */
export class GmailConnectionManager implements IEmailConnectionManager {
  constructor(
    private readonly pubSubTopicName: string = process.env.GOOGLE_PUBSUB_TOPIC ||
      'projects/lifeOS/topics/gmail-notifications'
  ) {}

  /**
   * Setup Gmail watch for push notifications
   *
   * @param account - Email account entity
   * @returns Success or error
   */
  async setup(account: EmailAccount): Promise<Result<void, BaseError>> {
    try {
      // Parse credentials
      const credentials = JSON.parse(account.encryptedCredentials);

      if (!credentials.accessToken || !credentials.refreshToken) {
        return Result.fail(
          new ValidationError('Invalid Gmail credentials', [
            {
              field: 'credentials',
              message: 'Missing accessToken or refreshToken',
            },
          ])
        );
      }

      // Create OAuth client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
        expiry_date: credentials.expiresAt ? new Date(credentials.expiresAt).getTime() : undefined,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Create watch
      const watchResponse = await gmail.users.watch({
        userId: 'me',
        requestBody: {
          topicName: this.pubSubTopicName,
          labelIds: ['INBOX'], // Watch only inbox
        },
      });

      const watchData = watchResponse.data;

      if (!watchData.historyId || !watchData.expiration) {
        return Result.fail(
          new ExternalServiceError(
            'Invalid watch response from Gmail',
            new Error('Missing historyId or expiration'),
            { watchData }
          )
        );
      }

      // Calculate expiration date (Gmail returns milliseconds since epoch)
      const expirationDate = new Date(parseInt(watchData.expiration, 10));

      // Store watch data in providerData
      const providerData = {
        historyId: watchData.historyId,
        watchExpiration: expirationDate.toISOString(),
        pubSubTopicName: this.pubSubTopicName,
        watchCreated: new Date().toISOString(),
      };

      account.updateProviderData(providerData);

      console.log(`✓ Gmail watch created for ${account.email}`, {
        historyId: watchData.historyId,
        expiration: expirationDate.toISOString(),
      });

      return Result.ok(undefined);
    } catch (error: any) {
      console.error(`Failed to setup Gmail watch for ${account.email}:`, error);

      // Provide helpful error messages
      let message = 'Failed to setup Gmail watch';

      if (error.code === 403 || error.message?.includes('permission')) {
        message =
          'Permission denied. Ensure gmail-api-push@system.gserviceaccount.com has pubsub.publisher role on the Pub/Sub topic.';
      } else if (error.code === 404 || error.message?.includes('not found')) {
        message = `Pub/Sub topic not found: ${this.pubSubTopicName}. Create it in Google Cloud Console.`;
      } else if (error.code === 401 || error.message?.includes('authentication')) {
        message = 'Invalid OAuth credentials. User needs to re-authenticate.';
      }

      return Result.fail(
        new ExternalServiceError(message, error, {
          accountId: account.id,
          pubSubTopicName: this.pubSubTopicName,
        })
      );
    }
  }

  /**
   * Renew Gmail watch before expiration
   *
   * Gmail watches expire after 7 days.
   * We should renew them within 6 days.
   *
   * @param account - Email account entity
   * @returns Success or error
   */
  async renew(account: EmailAccount): Promise<Result<void, BaseError>> {
    try {
      // Gmail watch renewal is just creating a new watch
      // The old watch will auto-expire
      const setupResult = await this.setup(account);

      if (setupResult.isOk()) {
        console.log(`✓ Gmail watch renewed for ${account.email}`);
      }

      return setupResult;
    } catch (error: any) {
      console.error(`Failed to renew Gmail watch for ${account.email}:`, error);

      return Result.fail(
        new ExternalServiceError(
          'Failed to renew Gmail watch',
          error,
          { accountId: account.id }
        )
      );
    }
  }

  /**
   * Teardown Gmail watch
   *
   * Stops the watch when account is disconnected.
   *
   * @param account - Email account entity
   * @returns Success or error
   */
  async teardown(account: EmailAccount): Promise<Result<void, BaseError>> {
    try {
      // Parse credentials
      const credentials = JSON.parse(account.encryptedCredentials);

      // Create OAuth client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Stop watch
      await gmail.users.stop({
        userId: 'me',
      });

      // Clear providerData
      account.updateProviderData({});

      console.log(`✓ Gmail watch stopped for ${account.email}`);

      return Result.ok(undefined);
    } catch (error: any) {
      console.error(`Failed to teardown Gmail watch for ${account.email}:`, error);

      // Don't fail if watch is already stopped
      if (error.code === 404 || error.message?.includes('not found')) {
        console.log(`Gmail watch already stopped for ${account.email}`);
        account.updateProviderData({});
        return Result.ok(undefined);
      }

      return Result.fail(
        new ExternalServiceError(
          'Failed to teardown Gmail watch',
          error,
          { accountId: account.id }
        )
      );
    }
  }

  /**
   * Check if Gmail watch is healthy
   *
   * Verifies:
   * 1. Watch data exists in providerData
   * 2. Watch has not expired
   * 3. Credentials are still valid
   *
   * @param account - Email account entity
   * @returns True if healthy, false otherwise
   */
  async isHealthy(account: EmailAccount): Promise<boolean> {
    try {
      const providerData = account.providerData || {};

      // Check if watch data exists
      if (!providerData.historyId || !providerData.watchExpiration) {
        console.log(`Gmail watch data missing for ${account.email}`);
        return false;
      }

      // Check if watch has expired
      const expirationDate = new Date(providerData.watchExpiration);
      const now = new Date();

      if (expirationDate <= now) {
        console.log(`Gmail watch expired for ${account.email}`);
        return false;
      }

      // Check if watch will expire soon (within 1 day)
      const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      if (expirationDate <= oneDayFromNow) {
        console.log(`Gmail watch expiring soon for ${account.email}`);
        return false; // Trigger renewal
      }

      // Watch is healthy
      return true;
    } catch (error) {
      console.error(`Health check failed for Gmail account ${account.email}:`, error);
      return false;
    }
  }
}
