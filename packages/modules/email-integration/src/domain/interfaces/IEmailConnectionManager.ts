import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { EmailAccount } from '../entities/EmailAccount';

/**
 * Email Connection Manager Interface
 *
 * Strategy pattern for provider-specific connection management.
 * Each provider (Gmail, Outlook, SMTP) implements this interface differently.
 *
 * Responsibilities:
 * - Setup webhooks or persistent connections
 * - Renew subscriptions before expiration
 * - Handle connection health monitoring
 * - Teardown connections when account is disconnected
 */
export interface IEmailConnectionManager {
  /**
   * Setup connection for an email account
   *
   * Gmail: Creates watch subscription via Pub/Sub
   * Outlook: Creates webhook subscription via Graph API
   * SMTP: Establishes IMAP IDLE connection
   *
   * @param account - Email account to setup
   * @returns Success or error
   */
  setup(account: EmailAccount): Promise<Result<void, BaseError>>;

  /**
   * Renew connection/subscription before expiration
   *
   * Gmail: Renew watch (expires after 7 days)
   * Outlook: Extend subscription (expires after 3 days max)
   * SMTP: Reconnect if connection dropped
   *
   * @param account - Email account to renew
   * @returns Success or error
   */
  renew(account: EmailAccount): Promise<Result<void, BaseError>>;

  /**
   * Teardown connection when account is disconnected
   *
   * Gmail: Stop watch subscription
   * Outlook: Delete webhook subscription
   * SMTP: Close IMAP connection
   *
   * @param account - Email account to teardown
   * @returns Success or error
   */
  teardown(account: EmailAccount): Promise<Result<void, BaseError>>;

  /**
   * Check if connection is healthy
   *
   * Gmail: Check if watch is active
   * Outlook: Check if subscription exists
   * SMTP: Check if IMAP connection is alive
   *
   * @param account - Email account to check
   * @returns True if connection is healthy
   */
  isHealthy(account: EmailAccount): Promise<boolean>;
}
