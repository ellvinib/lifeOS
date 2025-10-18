import { Request, Response, NextFunction } from 'express';
import { OutlookWebhookHandler } from '../../infrastructure/webhooks/OutlookWebhookHandler';
import { GmailWebhookHandler } from '../../infrastructure/webhooks/GmailWebhookHandler';

/**
 * Webhook Controller
 *
 * Handles incoming webhooks from email providers (Gmail, Outlook).
 * Routes requests to appropriate webhook handlers.
 *
 * Endpoints:
 * - POST /api/email/webhooks/gmail - Gmail Pub/Sub notifications
 * - POST /api/email/webhooks/outlook - Microsoft Graph notifications
 */
export class WebhookController {
  constructor(
    private readonly outlookWebhookHandler: OutlookWebhookHandler,
    private readonly gmailWebhookHandler: GmailWebhookHandler
  ) {}

  /**
   * Handle Outlook/Office 365 webhook
   *
   * Microsoft Graph sends two types of requests:
   * 1. Validation (GET with validationToken query param)
   * 2. Notification (POST with notification payload)
   */
  handleOutlookWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.outlookWebhookHandler.handle(req, res);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle Gmail webhook (Pub/Sub push)
   *
   * Google Cloud Pub/Sub sends POST requests with notification payload.
   * Handler decodes base64 message, validates timestamp, finds account,
   * and queues a history sync job.
   */
  handleGmailWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      await this.gmailWebhookHandler.handle(req, res);
    } catch (error) {
      next(error);
    }
  };
}
