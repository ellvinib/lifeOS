import { Request, Response, NextFunction } from 'express';
import { OutlookWebhookHandler } from '../../infrastructure/webhooks/OutlookWebhookHandler';

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
    private readonly outlookWebhookHandler: OutlookWebhookHandler
    // Add Gmail webhook handler later
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
   * TODO: Implement Gmail webhook handler
   */
  handleGmailWebhook = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // TODO: Implement Gmail webhook handling
      res.status(501).json({ error: 'Gmail webhook not yet implemented' });
    } catch (error) {
      next(error);
    }
  };
}
