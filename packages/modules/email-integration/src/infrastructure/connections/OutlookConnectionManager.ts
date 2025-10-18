import { Client } from '@microsoft/microsoft-graph-client';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, ExternalServiceError } from '@lifeOS/core/shared/errors';
import { IEmailConnectionManager } from '../../domain/interfaces/IEmailConnectionManager';
import { EmailAccount } from '../../domain/entities/EmailAccount';
import * as crypto from 'crypto';

/**
 * Outlook Connection Manager
 *
 * Manages Microsoft Graph API webhook subscriptions for Outlook/Office 365 accounts.
 *
 * How it works:
 * 1. Creates subscription for /me/mailFolders/inbox/messages
 * 2. Microsoft sends webhook notifications when new emails arrive
 * 3. Subscription expires after max 3 days (renewable)
 * 4. Uses clientState secret for webhook verification
 *
 * Microsoft Graph Subscription API:
 * https://docs.microsoft.com/en-us/graph/api/subscription-post-subscriptions
 */
export class OutlookConnectionManager implements IEmailConnectionManager {
  private readonly MAX_SUBSCRIPTION_DAYS = 3;

  constructor(
    private readonly graphClientFactory: (accessToken: string) => Client,
    private readonly webhookBaseUrl: string
  ) {}

  /**
   * Setup Outlook webhook subscription
   *
   * Creates a Microsoft Graph subscription that sends notifications
   * when new emails arrive in the inbox.
   */
  async setup(account: EmailAccount): Promise<Result<void, BaseError>> {
    try {
      // 1. Decrypt credentials to get access token
      const accessToken = this.decryptAccessToken(account.encryptedCredentials);

      // 2. Create Graph API client
      const client = this.graphClientFactory(accessToken);

      // 3. Generate unique secret for webhook verification
      const webhookSecret = this.generateWebhookSecret();

      // 4. Calculate expiration date (max 3 days from now)
      const expirationDateTime = this.getExpirationDate(this.MAX_SUBSCRIPTION_DAYS);

      // 5. Create subscription
      const subscription = await client.api('/subscriptions').post({
        changeType: 'created', // Notify only on new emails
        notificationUrl: `${this.webhookBaseUrl}/api/email/webhooks/outlook`,
        resource: '/me/mailFolders/inbox/messages', // Watch inbox
        expirationDateTime,
        clientState: webhookSecret, // Secret for verification
      });

      // 6. Store subscription info in account
      account.setProviderData({
        subscriptionId: subscription.id,
        subscriptionExpiration: subscription.expirationDateTime,
        webhookSecret,
      });

      console.log(`✓ Outlook subscription created for ${account.email}`, {
        subscriptionId: subscription.id,
        expiresAt: subscription.expirationDateTime,
      });

      return Result.ok(undefined);
    } catch (error: any) {
      console.error(`✗ Failed to setup Outlook subscription for ${account.email}:`, error);

      return Result.fail(
        new ExternalServiceError(
          'Failed to create Outlook webhook subscription',
          error,
          {
            accountId: account.id,
            email: account.email,
            provider: 'outlook',
          }
        )
      );
    }
  }

  /**
   * Renew Outlook subscription before expiration
   *
   * Outlook subscriptions expire after max 3 days.
   * This extends the expiration date.
   */
  async renew(account: EmailAccount): Promise<Result<void, BaseError>> {
    try {
      const providerData = account.getProviderData();
      const subscriptionId = providerData.subscriptionId;

      if (!subscriptionId) {
        // No existing subscription, create new one
        console.warn(`No subscription ID found for ${account.email}, creating new subscription`);
        return this.setup(account);
      }

      // 1. Decrypt credentials
      const accessToken = this.decryptAccessToken(account.encryptedCredentials);
      const client = this.graphClientFactory(accessToken);

      // 2. Extend subscription expiration
      const newExpiration = this.getExpirationDate(this.MAX_SUBSCRIPTION_DAYS);

      try {
        const updatedSubscription = await client
          .api(`/subscriptions/${subscriptionId}`)
          .patch({
            expirationDateTime: newExpiration,
          });

        // 3. Update account data
        account.setProviderData({
          ...providerData,
          subscriptionExpiration: updatedSubscription.expirationDateTime,
        });

        console.log(`✓ Outlook subscription renewed for ${account.email}`, {
          subscriptionId,
          newExpiration: updatedSubscription.expirationDateTime,
        });

        return Result.ok(undefined);
      } catch (patchError: any) {
        // Subscription might have been deleted, recreate it
        if (patchError.statusCode === 404) {
          console.warn(`Subscription ${subscriptionId} not found, creating new one`);
          return this.setup(account);
        }
        throw patchError;
      }
    } catch (error: any) {
      console.error(`✗ Failed to renew Outlook subscription for ${account.email}:`, error);

      return Result.fail(
        new ExternalServiceError(
          'Failed to renew Outlook webhook subscription',
          error,
          {
            accountId: account.id,
            email: account.email,
          }
        )
      );
    }
  }

  /**
   * Delete Outlook subscription when account is disconnected
   */
  async teardown(account: EmailAccount): Promise<Result<void, BaseError>> {
    try {
      const { subscriptionId } = account.getProviderData();

      if (!subscriptionId) {
        console.warn(`No subscription ID for ${account.email}, nothing to teardown`);
        return Result.ok(undefined);
      }

      // 1. Decrypt credentials
      const accessToken = this.decryptAccessToken(account.encryptedCredentials);
      const client = this.graphClientFactory(accessToken);

      // 2. Delete subscription
      try {
        await client.api(`/subscriptions/${subscriptionId}`).delete();
        console.log(`✓ Outlook subscription deleted for ${account.email}`, { subscriptionId });
      } catch (deleteError: any) {
        // Subscription might already be deleted or expired
        if (deleteError.statusCode === 404) {
          console.warn(`Subscription ${subscriptionId} already deleted or expired`);
        } else {
          throw deleteError;
        }
      }

      return Result.ok(undefined);
    } catch (error: any) {
      console.error(`✗ Failed to teardown Outlook subscription for ${account.email}:`, error);

      return Result.fail(
        new ExternalServiceError(
          'Failed to delete Outlook webhook subscription',
          error,
          {
            accountId: account.id,
            email: account.email,
          }
        )
      );
    }
  }

  /**
   * Check if Outlook subscription is healthy
   */
  async isHealthy(account: EmailAccount): Promise<boolean> {
    try {
      const { subscriptionId } = account.getProviderData();

      if (!subscriptionId) {
        return false; // No subscription
      }

      // 1. Check if subscription exists
      const accessToken = this.decryptAccessToken(account.encryptedCredentials);
      const client = this.graphClientFactory(accessToken);

      const subscription = await client.api(`/subscriptions/${subscriptionId}`).get();

      // 2. Check if subscription is still valid (not expired)
      const expiration = new Date(subscription.expirationDateTime);
      const now = new Date();

      return expiration > now;
    } catch (error: any) {
      console.error(`Health check failed for ${account.email}:`, error.message);
      return false;
    }
  }

  /**
   * Generate secure random webhook secret for verification
   */
  private generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calculate subscription expiration date
   *
   * @param days - Number of days from now (max 3 for Outlook)
   * @returns ISO 8601 date string
   */
  private getExpirationDate(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(date.getHours() - 1); // 1 hour buffer to ensure renewal happens before expiry
    return date.toISOString();
  }

  /**
   * Decrypt access token from encrypted credentials
   *
   * TODO: Implement proper encryption/decryption using KMS or similar
   * For now, this is a placeholder.
   */
  private decryptAccessToken(encryptedCredentials: string): string {
    // SECURITY: In production, use proper encryption
    // For now, assuming credentials are stored as JSON with accessToken field
    try {
      const credentials = JSON.parse(encryptedCredentials);
      return credentials.accessToken;
    } catch (error) {
      throw new Error('Failed to decrypt access token');
    }
  }
}
