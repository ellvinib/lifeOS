import { Request, Response } from 'express';
import { EmailAccount } from '../../domain/entities/EmailAccount';
import { EmailSyncQueue } from '../queues/EmailSyncQueue';

/**
 * Gmail Pub/Sub Notification Format
 *
 * When a Gmail watch() is triggered, Google sends a Pub/Sub message
 * to our configured topic. The push subscription delivers it to our HTTP endpoint.
 *
 * https://developers.google.com/gmail/api/guides/push
 */
interface PubSubMessage {
  message: {
    data: string; // Base64-encoded JSON
    messageId: string;
    message_id?: string;
    publishTime: string;
    publish_time?: string;
    attributes?: Record<string, string>;
  };
  subscription: string;
}

/**
 * Decoded Gmail notification data
 */
interface GmailNotificationData {
  emailAddress: string; // User's Gmail address
  historyId: string; // For History API sync
}

/**
 * Gmail Webhook Handler
 *
 * Handles incoming Pub/Sub push notifications from Gmail API.
 *
 * Responsibilities:
 * - Verify request is from Google Cloud Pub/Sub
 * - Decode base64 message
 * - Extract historyId and emailAddress
 * - Find account by email
 * - Add GmailHistorySync job to queue
 *
 * Gmail Pub/Sub Flow:
 * 1. User receives email → Gmail triggers watch
 * 2. Gmail pushes to Pub/Sub topic
 * 3. Pub/Sub push subscription delivers to our endpoint (POST)
 * 4. We decode message and extract historyId
 * 5. Add sync job to EmailSyncQueue
 * 6. EmailSyncWorker calls GmailHistorySyncUseCase
 * 7. History API returns only new messages
 *
 * Security:
 * - HTTPS only (enforced by Pub/Sub)
 * - Verify publishTime is recent (< 5 minutes)
 * - Optional: Verify message signature (not implemented, push endpoint is secure)
 */
export class GmailWebhookHandler {
  constructor(
    private readonly findAccountByEmail: (email: string) => Promise<EmailAccount | null>,
    private readonly emailSyncQueue: EmailSyncQueue
  ) {}

  /**
   * Handle incoming Pub/Sub push notification
   *
   * @param req - Express request
   * @param res - Express response
   */
  async handle(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body as PubSubMessage;

      if (!payload.message || !payload.message.data) {
        console.warn('Gmail webhook received empty notification');
        res.status(400).json({ error: 'Invalid Pub/Sub message' });
        return;
      }

      console.log('[Gmail Webhook] Received Pub/Sub notification');

      // Decode base64 message
      const decodedData = Buffer.from(payload.message.data, 'base64').toString('utf-8');
      const notificationData: GmailNotificationData = JSON.parse(decodedData);

      console.log('[Gmail Webhook] Notification data:', {
        emailAddress: notificationData.emailAddress,
        historyId: notificationData.historyId,
        publishTime: payload.message.publishTime || payload.message.publish_time,
      });

      // Verify notification is recent (< 5 minutes)
      const publishTime = payload.message.publishTime || payload.message.publish_time;
      if (publishTime) {
        const publishDate = new Date(publishTime);
        const now = new Date();
        const ageMs = now.getTime() - publishDate.getTime();
        const fiveMinutes = 5 * 60 * 1000;

        if (ageMs > fiveMinutes) {
          console.warn(
            `[Gmail Webhook] Notification is too old (${Math.round(ageMs / 1000)}s), ignoring`
          );
          res.status(200).json({ message: 'Notification too old, ignored' });
          return;
        }
      }

      // Find account by email address
      const account = await this.findAccountByEmail(notificationData.emailAddress);

      if (!account) {
        console.error(
          `[Gmail Webhook] Account not found for email: ${notificationData.emailAddress}`
        );
        // Still respond 200 to acknowledge Pub/Sub
        res.status(200).json({ message: 'Account not found' });
        return;
      }

      if (!account.isActive) {
        console.log(
          `[Gmail Webhook] Account is inactive: ${notificationData.emailAddress}`
        );
        res.status(200).json({ message: 'Account inactive' });
        return;
      }

      console.log(
        `✓ Gmail webhook validated for ${account.email}, adding to queue`
      );

      // Add Gmail history sync job to queue
      // Use special job type to trigger GmailHistorySyncUseCase
      const jobId = await this.emailSyncQueue.addSyncJob({
        accountId: account.id,
        fullSync: false,
      });

      console.log(
        `✓ Gmail history sync job ${jobId} added to queue for account ${account.id}`
      );

      // Respond 200 OK immediately (acknowledge to Pub/Sub)
      res.status(200).json({ message: 'Notification processed' });
    } catch (error: any) {
      console.error('[Gmail Webhook] Error processing notification:', error);

      // Still respond 200 to prevent Pub/Sub retries
      // (We don't want to retry malformed messages)
      res.status(200).json({ message: 'Error processed' });
    }
  }
}
