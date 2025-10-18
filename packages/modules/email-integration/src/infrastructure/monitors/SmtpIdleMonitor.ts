import { ImapFlow } from 'imapflow';
import { EmailAccount } from '../../domain/entities/EmailAccount';
import { EmailSyncQueue } from '../queues/EmailSyncQueue';

/**
 * IMAP IDLE Monitor
 *
 * Maintains IMAP IDLE connections for SMTP accounts to receive pseudo-push notifications.
 *
 * Design Principles:
 * - One IDLE connection per account
 * - Auto-reconnect on disconnect
 * - Fallback to polling if IDLE not supported
 * - Graceful shutdown
 *
 * IMAP IDLE (RFC 2177):
 * - Server-push extension for IMAP
 * - Connection stays open, server sends "EXISTS" when new message arrives
 * - Must send NOOP every 29 minutes to keep connection alive
 * - Auto-reconnect on timeout
 *
 * Performance:
 * - Low resource usage (persistent connections)
 * - Near-instant notification (<1s latency)
 * - Fallback to 5-minute polling if IDLE unsupported
 */
export class SmtpIdleMonitor {
  private monitors: Map<
    string,
    {
      client: ImapFlow;
      account: EmailAccount;
      reconnectTimer?: NodeJS.Timeout;
      pollingTimer?: NodeJS.Timeout;
    }
  > = new Map();

  private isShuttingDown = false;

  constructor(private readonly emailSyncQueue: EmailSyncQueue) {}

  /**
   * Start monitoring an account
   *
   * @param account - Email account to monitor
   */
  async startMonitoring(account: EmailAccount): Promise<void> {
    try {
      // Stop existing monitor if any
      await this.stopMonitoring(account.id);

      // Parse credentials
      const credentials = JSON.parse(account.encryptedCredentials);

      // Check if IDLE is supported
      const providerData = account.providerData || {};
      const supportsIdle = providerData.supportsIdle === true;

      if (supportsIdle) {
        // Use IMAP IDLE
        await this.startIdleConnection(account, credentials);
      } else {
        // Fallback to polling
        await this.startPolling(account);
      }

      console.log(
        `✓ Started monitoring SMTP account ${account.email} (${supportsIdle ? 'IDLE' : 'polling'})`
      );
    } catch (error) {
      console.error(`Failed to start monitoring ${account.email}:`, error);
    }
  }

  /**
   * Stop monitoring an account
   *
   * @param accountId - Account ID
   */
  async stopMonitoring(accountId: string): Promise<void> {
    const monitor = this.monitors.get(accountId);
    if (!monitor) {
      return;
    }

    try {
      // Clear timers
      if (monitor.reconnectTimer) {
        clearTimeout(monitor.reconnectTimer);
      }
      if (monitor.pollingTimer) {
        clearInterval(monitor.pollingTimer);
      }

      // Close IMAP connection
      if (monitor.client) {
        await monitor.client.logout();
      }

      this.monitors.delete(accountId);

      console.log(`✓ Stopped monitoring account ${monitor.account.email}`);
    } catch (error) {
      console.error(`Error stopping monitor for account ${accountId}:`, error);
    }
  }

  /**
   * Stop all monitors (for graceful shutdown)
   */
  async stopAll(): Promise<void> {
    this.isShuttingDown = true;

    console.log(`Stopping all SMTP monitors (${this.monitors.size} active)...`);

    const promises = Array.from(this.monitors.keys()).map((accountId) =>
      this.stopMonitoring(accountId)
    );

    await Promise.all(promises);

    console.log('✓ All SMTP monitors stopped');
  }

  /**
   * Start IMAP IDLE connection
   */
  private async startIdleConnection(
    account: EmailAccount,
    credentials: any
  ): Promise<void> {
    try {
      // Create IMAP client
      const client = new ImapFlow({
        host: credentials.imapHost,
        port: credentials.imapPort,
        secure: credentials.imapPort === 993,
        auth: {
          user: credentials.username,
          pass: credentials.password,
        },
        logger: false,
      });

      // Connect
      await client.connect();

      // Select INBOX
      await client.mailboxOpen('INBOX');

      // Setup event handlers
      client.on('exists', async (data) => {
        console.log(`[IDLE] New message detected for ${account.email}:`, data);
        await this.triggerSync(account.id);
      });

      client.on('close', () => {
        console.log(`[IDLE] Connection closed for ${account.email}`);
        this.scheduleReconnect(account);
      });

      client.on('error', (error) => {
        console.error(`[IDLE] Connection error for ${account.email}:`, error);
        this.scheduleReconnect(account);
      });

      // Start IDLE
      await client.idle();

      // Store monitor
      this.monitors.set(account.id, { client, account });

      console.log(`✓ IMAP IDLE started for ${account.email}`);
    } catch (error) {
      console.error(`Failed to start IDLE connection for ${account.email}:`, error);
      this.scheduleReconnect(account);
    }
  }

  /**
   * Start polling (fallback if IDLE not supported)
   */
  private async startPolling(account: EmailAccount): Promise<void> {
    const POLLING_INTERVAL = 300000; // 5 minutes

    // Initial sync
    await this.triggerSync(account.id);

    // Schedule recurring sync
    const pollingTimer = setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.triggerSync(account.id);
      }
    }, POLLING_INTERVAL);

    // Store monitor
    this.monitors.set(account.id, {
      client: null as any, // No IMAP client for polling
      account,
      pollingTimer,
    });

    console.log(`✓ Polling started for ${account.email} (every 5 minutes)`);
  }

  /**
   * Schedule reconnect after disconnect
   */
  private scheduleReconnect(account: EmailAccount): void {
    if (this.isShuttingDown) {
      return;
    }

    const monitor = this.monitors.get(account.id);
    if (monitor && monitor.reconnectTimer) {
      // Already scheduled
      return;
    }

    const RECONNECT_DELAY = 30000; // 30 seconds

    console.log(`Scheduling reconnect for ${account.email} in 30 seconds...`);

    const reconnectTimer = setTimeout(async () => {
      console.log(`Attempting reconnect for ${account.email}...`);
      await this.startMonitoring(account);
    }, RECONNECT_DELAY);

    if (monitor) {
      monitor.reconnectTimer = reconnectTimer;
    }
  }

  /**
   * Trigger email sync via queue
   */
  private async triggerSync(accountId: string): Promise<void> {
    try {
      await this.emailSyncQueue.addSyncJob({
        accountId,
        fullSync: false,
      });

      console.log(`✓ Sync job added for account ${accountId}`);
    } catch (error) {
      console.error(`Failed to trigger sync for account ${accountId}:`, error);
    }
  }

  /**
   * Get monitoring status
   */
  getStatus(): {
    totalMonitors: number;
    idle: number;
    polling: number;
  } {
    let idle = 0;
    let polling = 0;

    for (const monitor of this.monitors.values()) {
      if (monitor.client) {
        idle++;
      } else if (monitor.pollingTimer) {
        polling++;
      }
    }

    return {
      totalMonitors: this.monitors.size,
      idle,
      polling,
    };
  }
}
