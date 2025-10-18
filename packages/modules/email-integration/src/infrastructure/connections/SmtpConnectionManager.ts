import { EmailAccount } from '../../domain/entities/EmailAccount';
import { IEmailConnectionManager } from '../../domain/interfaces/IEmailConnectionManager';
import { Result } from '@lifeOS/core/shared/result/Result';
import { BaseError } from '@lifeOS/core/shared/errors/BaseError';
import { ExternalServiceError } from '@lifeOS/core/shared/errors/ExternalServiceError';
import { ValidationError } from '@lifeOS/core/shared/errors/ValidationError';
import { ImapFlow } from 'imapflow';

/**
 * SMTP Connection Manager
 *
 * Manages IMAP connections for SMTP/IMAP email accounts.
 *
 * Design Differences from Outlook/Gmail:
 * - No webhook subscriptions (IMAP doesn't support webhooks)
 * - Uses IMAP IDLE for pseudo-push notifications
 * - Fallback to polling if IDLE not supported
 * - Connection lifecycle: Connect → IDLE → Disconnect
 *
 * IMAP IDLE:
 * - RFC 2177 extension for push-like notifications
 * - Server notifies client of new messages
 * - Connection stays open for ~29 minutes (RFC recommends < 30min)
 * - Auto-reconnect on timeout
 *
 * Setup Workflow:
 * 1. Test connection to IMAP server
 * 2. Store connection details in providerData
 * 3. Return success (IDLE monitoring started separately)
 *
 * Teardown Workflow:
 * 1. Stop IDLE monitoring
 * 2. Close IMAP connection
 * 3. Clear providerData
 */
export class SmtpConnectionManager implements IEmailConnectionManager {
  /**
   * Setup SMTP/IMAP connection
   *
   * Tests the connection and stores configuration.
   * IDLE monitoring is started by a separate background service.
   *
   * @param account - Email account entity
   * @returns Success or error
   */
  async setup(account: EmailAccount): Promise<Result<void, BaseError>> {
    try {
      // Parse credentials from encrypted field
      // TODO: Decrypt credentials properly
      const credentials = JSON.parse(account.encryptedCredentials);

      // Validate SMTP credentials
      if (
        !credentials.username ||
        !credentials.password ||
        !credentials.imapHost ||
        !credentials.imapPort
      ) {
        return Result.fail(
          new ValidationError('Invalid SMTP credentials', [
            {
              field: 'credentials',
              message: 'Missing required fields: username, password, imapHost, imapPort',
            },
          ])
        );
      }

      // Test connection to IMAP server
      const testResult = await this.testConnection(
        credentials.imapHost,
        credentials.imapPort,
        credentials.username,
        credentials.password
      );

      if (testResult.isFail()) {
        return Result.fail(testResult.error);
      }

      // Store IMAP configuration in providerData
      const providerData = {
        imapHost: credentials.imapHost,
        imapPort: credentials.imapPort,
        supportsIdle: testResult.value.supportsIdle,
        pollingInterval: testResult.value.supportsIdle ? null : 300000, // 5 minutes if no IDLE
        connectionTested: new Date().toISOString(),
      };

      account.updateProviderData(providerData);

      console.log(`✓ SMTP connection tested successfully for ${account.email}`, {
        supportsIdle: testResult.value.supportsIdle,
      });

      return Result.ok(undefined);
    } catch (error: any) {
      console.error(`Failed to setup SMTP connection for ${account.email}:`, error);

      return Result.fail(
        new ExternalServiceError(
          'Failed to setup SMTP/IMAP connection',
          error,
          { accountId: account.id }
        )
      );
    }
  }

  /**
   * Renew SMTP connection
   *
   * For SMTP, there's no subscription to renew.
   * This method tests the connection to ensure credentials are still valid.
   *
   * @param account - Email account entity
   * @returns Success or error
   */
  async renew(account: EmailAccount): Promise<Result<void, BaseError>> {
    try {
      // Parse credentials
      const credentials = JSON.parse(account.encryptedCredentials);

      // Test connection
      const testResult = await this.testConnection(
        credentials.imapHost,
        credentials.imapPort,
        credentials.username,
        credentials.password
      );

      if (testResult.isFail()) {
        return Result.fail(testResult.error);
      }

      // Update providerData with renewal timestamp
      const providerData = account.providerData || {};
      providerData.lastRenewed = new Date().toISOString();
      account.updateProviderData(providerData);

      console.log(`✓ SMTP connection renewed for ${account.email}`);

      return Result.ok(undefined);
    } catch (error: any) {
      console.error(`Failed to renew SMTP connection for ${account.email}:`, error);

      return Result.fail(
        new ExternalServiceError(
          'Failed to renew SMTP/IMAP connection',
          error,
          { accountId: account.id }
        )
      );
    }
  }

  /**
   * Teardown SMTP connection
   *
   * Cleanup when account is disconnected.
   *
   * @param account - Email account entity
   * @returns Success or error
   */
  async teardown(account: EmailAccount): Promise<Result<void, BaseError>> {
    try {
      // For SMTP, there's no subscription to delete
      // Just clear providerData
      account.updateProviderData({});

      console.log(`✓ SMTP connection torn down for ${account.email}`);

      return Result.ok(undefined);
    } catch (error: any) {
      console.error(`Failed to teardown SMTP connection for ${account.email}:`, error);

      return Result.fail(
        new ExternalServiceError(
          'Failed to teardown SMTP/IMAP connection',
          error,
          { accountId: account.id }
        )
      );
    }
  }

  /**
   * Check SMTP connection health
   *
   * Tests if IMAP server is reachable and credentials are valid.
   *
   * @param account - Email account entity
   * @returns True if healthy, false otherwise
   */
  async isHealthy(account: EmailAccount): Promise<boolean> {
    try {
      const credentials = JSON.parse(account.encryptedCredentials);

      const testResult = await this.testConnection(
        credentials.imapHost,
        credentials.imapPort,
        credentials.username,
        credentials.password
      );

      return testResult.isOk();
    } catch (error) {
      console.error(`Health check failed for SMTP account ${account.email}:`, error);
      return false;
    }
  }

  /**
   * Test IMAP connection
   *
   * Attempts to connect and authenticate to IMAP server.
   * Also checks if server supports IDLE extension.
   *
   * @param host - IMAP host
   * @param port - IMAP port
   * @param username - Username
   * @param password - Password
   * @returns Connection info or error
   */
  private async testConnection(
    host: string,
    port: number,
    username: string,
    password: string
  ): Promise<
    Result<
      {
        supportsIdle: boolean;
        capabilities: string[];
      },
      BaseError
    >
  > {
    let client: ImapFlow | null = null;

    try {
      // Create IMAP client
      client = new ImapFlow({
        host,
        port,
        secure: port === 993, // SSL/TLS for port 993
        auth: {
          user: username,
          pass: password,
        },
        logger: false,
      });

      // Connect and authenticate
      await client.connect();

      // Get server capabilities
      const capabilities = Array.from(client.enabled || []);
      const supportsIdle = capabilities.includes('IDLE');

      console.log(`✓ IMAP connection successful to ${host}:${port}`, {
        supportsIdle,
        capabilities: capabilities.slice(0, 5), // Log first 5 capabilities
      });

      return Result.ok({
        supportsIdle,
        capabilities,
      });
    } catch (error: any) {
      console.error(`Failed to connect to IMAP server ${host}:${port}:`, error);

      // Provide helpful error messages
      let message = 'Failed to connect to IMAP server';
      if (error.code === 'ENOTFOUND') {
        message = `IMAP server not found: ${host}`;
      } else if (error.code === 'ECONNREFUSED') {
        message = `Connection refused: ${host}:${port}`;
      } else if (error.code === 'ETIMEDOUT') {
        message = `Connection timeout: ${host}:${port}`;
      } else if (error.message?.includes('Invalid credentials')) {
        message = 'Invalid username or password';
      }

      return Result.fail(
        new ExternalServiceError(message, error, {
          host,
          port,
          username,
        })
      );
    } finally {
      // Close connection
      if (client) {
        try {
          await client.logout();
        } catch (err) {
          // Ignore logout errors
        }
      }
    }
  }
}
