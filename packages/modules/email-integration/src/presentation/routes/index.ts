import { Router } from 'express';
import { ModuleContext } from '@lifeos/core/module-system';
import { Client } from '@microsoft/microsoft-graph-client';
import { WebhookController } from '../controllers/WebhookController';
import { EmailAccountController } from '../controllers/EmailAccountController';
import { OAuthController } from '../controllers/OAuthController';
import { EmailAccountRepository } from '../../infrastructure/repositories/EmailAccountRepository';
import { OutlookConnectionManager } from '../../infrastructure/connections/OutlookConnectionManager';
import { GmailConnectionManager } from '../../infrastructure/connections/GmailConnectionManager';
import { SmtpConnectionManager } from '../../infrastructure/connections/SmtpConnectionManager';
import { ConnectAccountUseCase } from '../../application/use-cases/ConnectAccountUseCase';
import { DisconnectAccountUseCase } from '../../application/use-cases/DisconnectAccountUseCase';
import { OutlookWebhookHandler } from '../../infrastructure/webhooks/OutlookWebhookHandler';
import { GmailWebhookHandler } from '../../infrastructure/webhooks/GmailWebhookHandler';
import { EmailSyncQueue } from '../../infrastructure/queues/EmailSyncQueue';

/**
 * Create Microsoft Graph Client factory
 */
function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

/**
 * Create email integration routes from module context
 *
 * @param context - Module context with dependencies
 * @returns Express router with all email integration routes
 */
export function routes(context: ModuleContext): Router {
  const router = Router();

  // Initialize repositories
  const accountRepository = new EmailAccountRepository(context.prisma);

  // Initialize connection managers
  const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:3000';
  const outlookConnectionManager = new OutlookConnectionManager(
    createGraphClient,
    webhookBaseUrl
  );
  const gmailConnectionManager = new GmailConnectionManager();
  const smtpConnectionManager = new SmtpConnectionManager();

  // Initialize use cases
  const connectAccountUseCase = new ConnectAccountUseCase(
    accountRepository,
    {
      outlook: outlookConnectionManager,
      gmail: gmailConnectionManager,
      smtp: smtpConnectionManager,
    }
  );

  const disconnectAccountUseCase = new DisconnectAccountUseCase(
    accountRepository,
    {
      outlook: outlookConnectionManager,
      gmail: gmailConnectionManager,
      smtp: smtpConnectionManager,
    }
  );

  // Initialize email sync queue
  const emailSyncQueue = new EmailSyncQueue(context.config.redisUrl || process.env.REDIS_URL);

  // Initialize webhook handlers
  const outlookWebhookHandler = new OutlookWebhookHandler(
    (subscriptionId: string) => accountRepository.findBySubscriptionId(subscriptionId),
    emailSyncQueue
  );
  const gmailWebhookHandler = new GmailWebhookHandler(
    (email: string) => accountRepository.findByEmail(email).then(r => r.isOk() ? r.value : null),
    emailSyncQueue
  );

  // Initialize controllers
  const webhookController = new WebhookController(outlookWebhookHandler, gmailWebhookHandler);
  const accountController = new EmailAccountController(
    connectAccountUseCase,
    disconnectAccountUseCase,
    accountRepository
  );
  const oauthController = new OAuthController();

  // ========================================
  // Webhook Routes (Public Endpoints)
  // ========================================

  /**
   * Outlook webhook endpoint
   * Receives notifications from Microsoft Graph when emails arrive
   */
  router.post('/webhooks/outlook', (req, res, next) =>
    webhookController.handleOutlookWebhook(req, res, next)
  );

  /**
   * Gmail webhook endpoint
   * Receives notifications from Google Cloud Pub/Sub when emails arrive
   */
  router.post('/webhooks/gmail', (req, res, next) =>
    webhookController.handleGmailWebhook(req, res, next)
  );

  // ========================================
  // OAuth Routes
  // ========================================

  /**
   * Exchange OAuth authorization code for tokens
   * POST /oauth/token
   */
  router.post('/oauth/token', (req, res, next) =>
    oauthController.exchangeToken(req, res, next)
  );

  // ========================================
  // Account Management Routes
  // ========================================

  /**
   * Connect new email account
   * POST /accounts/connect
   */
  router.post('/accounts/connect', (req, res, next) =>
    accountController.connect(req, res, next)
  );

  /**
   * List connected accounts
   * GET /accounts?provider=outlook&isActive=true
   */
  router.get('/accounts', (req, res, next) =>
    accountController.list(req, res, next)
  );

  /**
   * Disconnect account
   * DELETE /accounts/:id
   */
  router.delete('/accounts/:id', (req, res, next) =>
    accountController.disconnect(req, res, next)
  );

  return router;
}
