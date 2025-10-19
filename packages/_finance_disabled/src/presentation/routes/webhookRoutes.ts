import { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { IEventBus } from '@lifeos/core/events';
import { WebhookController } from '../controllers/WebhookController';
import { InvoiceRepository } from '../../infrastructure/repositories/InvoiceRepository';
import { LocalFileStorage } from '../../infrastructure/storage/LocalFileStorage';
import { GeminiFlashService } from '../../infrastructure/services/GeminiFlashService';

/**
 * Webhook Routes
 *
 * External webhook endpoints for service integrations.
 *
 * Endpoints:
 * - POST /mailgun - Receive invoice emails from Mailgun
 * - GET  /mailgun - Verify Mailgun webhook (route verification)
 */

/**
 * Create webhook routes
 *
 * @param prisma Prisma client
 * @param eventBus Event bus
 * @param geminiApiKey Gemini API key for extraction
 * @param fileStorageBasePath Base path for file storage
 * @param mailgunSigningKey Mailgun signing key for verification
 * @returns Express router
 */
export const createWebhookRoutes = (
  prisma: PrismaClient,
  eventBus: IEventBus,
  geminiApiKey?: string,
  fileStorageBasePath?: string,
  mailgunSigningKey?: string
): Router => {
  const router = Router();

  // Configure multer for email attachments
  // Mailgun sends attachments as multipart/form-data
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 25 * 1024 * 1024, // 25MB (Mailgun limit)
      files: 20, // Max attachments per email
    },
  });

  // Initialize dependencies
  const invoiceRepository = new InvoiceRepository(prisma);
  const fileStorage = new LocalFileStorage(fileStorageBasePath || './data');
  const geminiService = new GeminiFlashService(geminiApiKey);

  // Initialize controller
  const controller = new WebhookController(
    invoiceRepository,
    fileStorage,
    geminiService,
    eventBus,
    mailgunSigningKey
  );

  /**
   * POST /mailgun - Receive invoice email webhook
   *
   * Mailgun forwards emails to this endpoint.
   * Processes PDF attachments and creates invoices.
   */
  router.post(
    '/mailgun',
    upload.any(), // Accept all attachments
    controller.handleMailgunWebhook.bind(controller)
  );

  /**
   * GET /mailgun - Verify webhook endpoint
   *
   * Mailgun sends GET request to verify the route exists.
   */
  router.get(
    '/mailgun',
    controller.verifyMailgunWebhook.bind(controller)
  );

  return router;
};
