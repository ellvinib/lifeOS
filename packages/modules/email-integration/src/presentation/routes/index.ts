import { Router } from 'express';
import { WebhookController } from '../controllers/WebhookController';
import { EmailAccountController } from '../controllers/EmailAccountController';

/**
 * Create email integration routes
 *
 * @param webhookController - Webhook controller instance
 * @param accountController - Account management controller instance
 * @returns Express router with all email integration routes
 */
export function createEmailIntegrationRoutes(
  webhookController: WebhookController,
  accountController: EmailAccountController
): Router {
  const router = Router();

  // ========================================
  // Webhook Routes (Public Endpoints)
  // ========================================

  /**
   * Outlook webhook endpoint
   * Receives notifications from Microsoft Graph when emails arrive
   *
   * Microsoft sends both validation requests and notifications to this endpoint
   */
  router.post('/webhooks/outlook', webhookController.handleOutlookWebhook);

  /**
   * Gmail webhook endpoint
   * Receives notifications from Google Cloud Pub/Sub when emails arrive
   *
   * TODO: Implement Gmail webhook handling
   */
  router.post('/webhooks/gmail', webhookController.handleGmailWebhook);

  // ========================================
  // Account Management Routes
  // ========================================

  /**
   * Connect new email account
   * POST /accounts/connect
   *
   * Body:
   * {
   *   "provider": "outlook" | "gmail" | "smtp",
   *   "email": "user@example.com",
   *   "credentials": { ... }
   * }
   */
  router.post('/accounts/connect', accountController.connect);

  /**
   * List connected accounts
   * GET /accounts?provider=outlook&isActive=true
   */
  router.get('/accounts', accountController.list);

  /**
   * Disconnect account
   * DELETE /accounts/:id
   */
  router.delete('/accounts/:id', accountController.disconnect);

  // ========================================
  // Email Operations (TODO)
  // ========================================

  /**
   * Get email by ID (lazy loading)
   * GET /emails/:id
   */
  // router.get('/emails/:id', emailController.getEmail);

  /**
   * Search emails
   * GET /emails?from=...&subject=...
   */
  // router.get('/emails', emailController.searchEmails);

  return router;
}
