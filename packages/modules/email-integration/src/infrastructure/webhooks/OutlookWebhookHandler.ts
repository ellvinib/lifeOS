import { Request, Response } from 'express';
import { EmailAccount } from '../../domain/entities/EmailAccount';

/**
 * Microsoft Graph Notification Format
 *
 * When a subscription is triggered, Microsoft sends a POST request with this structure:
 * https://docs.microsoft.com/en-us/graph/webhooks
 */
interface GraphNotification {
  subscriptionId: string;
  subscriptionExpirationDateTime: string;
  clientState: string;
  changeType: 'created' | 'updated' | 'deleted';
  resource: string; // e.g., "Users/{userId}/Messages/{messageId}"
  resourceData: {
    '@odata.type': string;
    '@odata.id': string;
    id: string; // Message ID
  };
}

interface GraphWebhookPayload {
  value: GraphNotification[];
}

/**
 * Outlook Webhook Handler
 *
 * Handles incoming webhook notifications from Microsoft Graph API.
 *
 * Responsibilities:
 * - Validate Microsoft's webhook verification request
 * - Verify clientState secret for security
 * - Extract message IDs from notifications
 * - Trigger email sync for affected accounts
 *
 * Microsoft Graph webhook flow:
 * 1. Subscription created → Microsoft sends validation request (GET with validationToken query param)
 * 2. We respond with the validationToken to confirm
 * 3. When email arrives → Microsoft sends POST with notification
 * 4. We verify clientState and trigger sync
 */
export class OutlookWebhookHandler {
  constructor(
    private readonly findAccountBySubscriptionId: (
      subscriptionId: string
    ) => Promise<EmailAccount | null>,
    private readonly triggerEmailSync: (
      accountId: string,
      messageId?: string
    ) => Promise<void>
  ) {}

  /**
   * Handle incoming webhook from Microsoft Graph
   *
   * Handles both validation requests and notification requests.
   */
  async handle(req: Request, res: Response): Promise<void> {
    try {
      // Step 1: Handle Microsoft's validation request
      // When creating a subscription, Microsoft sends a validation token
      if (req.query.validationToken) {
        await this.handleValidationRequest(req, res);
        return;
      }

      // Step 2: Handle notification request
      await this.handleNotificationRequest(req, res);
    } catch (error: any) {
      console.error('Outlook webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle Microsoft's subscription validation request
   *
   * When creating a subscription, Microsoft sends:
   * POST /webhooks/outlook?validationToken=abc123...
   *
   * We must respond with the validationToken in plain text.
   */
  private async handleValidationRequest(req: Request, res: Response): Promise<void> {
    const validationToken = req.query.validationToken as string;

    console.log('Outlook webhook validation request received');

    // Respond with validation token (required by Microsoft)
    res.status(200).contentType('text/plain').send(validationToken);
  }

  /**
   * Handle notification from Microsoft Graph
   *
   * Microsoft sends:
   * POST /webhooks/outlook
   * Body: { value: [ { subscriptionId, resource, clientState, ... } ] }
   */
  private async handleNotificationRequest(req: Request, res: Response): Promise<void> {
    const payload = req.body as GraphWebhookPayload;

    if (!payload.value || payload.value.length === 0) {
      console.warn('Outlook webhook received empty notification');
      res.status(200).json({ message: 'OK' });
      return;
    }

    console.log(`Outlook webhook received ${payload.value.length} notification(s)`);

    // Process each notification
    const promises = payload.value.map((notification) =>
      this.processNotification(notification)
    );

    await Promise.all(promises);

    // Respond immediately (don't block Microsoft's webhook)
    res.status(202).json({ message: 'Accepted' });
  }

  /**
   * Process a single notification
   */
  private async processNotification(notification: GraphNotification): Promise<void> {
    try {
      console.log('Processing Outlook notification:', {
        subscriptionId: notification.subscriptionId,
        changeType: notification.changeType,
        resource: notification.resource,
      });

      // 1. Find account by subscription ID
      const account = await this.findAccountBySubscriptionId(notification.subscriptionId);

      if (!account) {
        console.error(`Account not found for subscription ${notification.subscriptionId}`);
        return;
      }

      // 2. Verify clientState for security
      const expectedSecret = account.getOutlookWebhookSecret();

      if (notification.clientState !== expectedSecret) {
        console.error(`Invalid clientState for account ${account.email}`, {
          subscriptionId: notification.subscriptionId,
          received: notification.clientState,
          expected: expectedSecret,
        });
        return;
      }

      // 3. Extract message ID from resource path
      // Resource format: "Users/{userId}/Messages/{messageId}"
      const messageId = this.extractMessageId(notification.resource);

      if (!messageId) {
        console.error(`Failed to extract message ID from resource: ${notification.resource}`);
        return;
      }

      console.log(`✓ Outlook webhook validated for ${account.email}, triggering sync`, {
        messageId,
      });

      // 4. Trigger email sync (non-blocking, added to queue)
      await this.triggerEmailSync(account.id, messageId);
    } catch (error: any) {
      console.error('Failed to process Outlook notification:', error);
      // Don't throw - we already responded to Microsoft
    }
  }

  /**
   * Extract message ID from Microsoft Graph resource path
   *
   * @param resource - Resource path like "Users/{userId}/Messages/{messageId}"
   * @returns Message ID or null if extraction fails
   */
  private extractMessageId(resource: string): string | null {
    try {
      // Resource format: "Users/{userId}/Messages/{messageId}"
      // or: "/users/{userId}/messages/{messageId}"
      const parts = resource.split('/');
      const messageIndex = parts.findIndex((p) =>
        p.toLowerCase() === 'messages'
      );

      if (messageIndex === -1 || messageIndex === parts.length - 1) {
        return null;
      }

      return parts[messageIndex + 1];
    } catch (error) {
      console.error('Error extracting message ID:', error);
      return null;
    }
  }
}
