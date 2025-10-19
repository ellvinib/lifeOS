import { OutlookConnectionManager } from '../connections/OutlookConnectionManager';
import { GmailConnectionManager } from '../connections/GmailConnectionManager';
import { EmailAccount } from '../../domain/entities/EmailAccount';
import { EmailProvider } from '../../domain/value-objects/EmailProvider';

/**
 * Subscription Renewal Job
 *
 * Periodically renews email provider subscriptions before they expire.
 *
 * Subscription expiration times:
 * - Gmail: 7 days
 * - Outlook: 3 days (maximum)
 * - SMTP: N/A (persistent connection managed separately)
 *
 * This job should run daily to check for subscriptions expiring soon.
 * Renews subscriptions that expire within 24 hours.
 */
export class SubscriptionRenewalJob {
  constructor(
    private readonly findAllActiveAccounts: () => Promise<EmailAccount[]>,
    private readonly outlookConnectionManager: OutlookConnectionManager,
    private readonly gmailConnectionManager: GmailConnectionManager,
    private readonly updateAccount: (account: EmailAccount) => Promise<void>
  ) {}

  /**
   * Execute subscription renewal job
   *
   * Checks all active email accounts and renews subscriptions that are expiring soon.
   */
  async execute(): Promise<void> {
    console.log('[SubscriptionRenewalJob] Starting subscription renewal check...');

    try {
      // Get all active email accounts
      const accounts = await this.findAllActiveAccounts();

      if (accounts.length === 0) {
        console.log('[SubscriptionRenewalJob] No active accounts found');
        return;
      }

      console.log(`[SubscriptionRenewalJob] Checking ${accounts.length} account(s)...`);

      let renewedCount = 0;
      let failedCount = 0;

      // Check each account
      for (const account of accounts) {
        try {
          const renewed = await this.renewAccountIfNeeded(account);
          if (renewed) {
            renewedCount++;
            // Update account in database
            await this.updateAccount(account);
          }
        } catch (error: any) {
          console.error(
            `[SubscriptionRenewalJob] Failed to renew ${account.email}:`,
            error.message
          );
          failedCount++;
        }
      }

      console.log(
        `[SubscriptionRenewalJob] Renewal complete: ${renewedCount} renewed, ${failedCount} failed`
      );
    } catch (error: any) {
      console.error('[SubscriptionRenewalJob] Job execution failed:', error);
    }
  }

  /**
   * Renew account subscription if it's expiring soon
   *
   * @param account - Email account to check
   * @returns True if renewal was performed
   */
  private async renewAccountIfNeeded(account: EmailAccount): Promise<boolean> {
    // Only process webhook-supported providers
    if (!EmailProviderHelper.isWebhookSupported(account.provider)) {
      return false;
    }

    switch (account.provider) {
      case EmailProvider.OUTLOOK:
        return await this.renewOutlookIfNeeded(account);

      case EmailProvider.GMAIL:
        return await this.renewGmailIfNeeded(account);

      default:
        return false;
    }
  }

  /**
   * Renew Outlook subscription if expiring soon
   */
  private async renewOutlookIfNeeded(account: EmailAccount): Promise<boolean> {
    if (!account.outlookSubscriptionNeedsRenewal()) {
      console.log(`[SubscriptionRenewalJob] Outlook subscription for ${account.email} is still valid`);
      return false;
    }

    console.log(`[SubscriptionRenewalJob] Renewing Outlook subscription for ${account.email}...`);

    const result = await this.outlookConnectionManager.renew(account);

    if (result.isFail()) {
      throw new Error(`Renewal failed: ${result.error.message}`);
    }

    console.log(`[SubscriptionRenewalJob] ✓ Outlook subscription renewed for ${account.email}`);
    return true;
  }

  /**
   * Renew Gmail watch if expiring soon
   */
  private async renewGmailIfNeeded(account: EmailAccount): Promise<boolean> {
    if (!account.gmailWatchNeedsRenewal()) {
      console.log(`[SubscriptionRenewalJob] Gmail watch for ${account.email} is still valid`);
      return false;
    }

    console.log(`[SubscriptionRenewalJob] Renewing Gmail watch for ${account.email}...`);

    const result = await this.gmailConnectionManager.renew(account);

    if (result.isFail()) {
      throw new Error(`Renewal failed: ${result.error.message}`);
    }

    console.log(`[SubscriptionRenewalJob] ✓ Gmail watch renewed for ${account.email}`);
    return true;
  }
}

// Helper import (would need to be moved to a shared location)
import { EmailProviderHelper } from '../../domain/value-objects/EmailProvider';
