import { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { EventBus } from '@lifeOS/core/events';
import { InvoiceController } from '../controllers/InvoiceController';
import { validateRequest, parseTagsMiddleware } from '../middleware/validateRequest';
import {
  uploadInvoiceSchema,
  getInvoiceSchema,
  listInvoicesSchema,
  updateInvoiceSchema,
  deleteInvoiceSchema,
  extractInvoiceDataSchema,
  downloadInvoiceSchema,
  batchUploadInvoicesSchema,
  getInvoiceStatisticsSchema,
  batchDeleteInvoicesSchema,
  batchExtractInvoicesSchema,
  getUnmatchedInvoicesSchema,
  getPendingInvoicesSchema,
  getOverdueInvoicesSchema,
  getNeedsExtractionSchema,
} from '../validation/invoiceSchemas';

/**
 * Invoice Routes
 *
 * Defines all invoice-related API endpoints.
 * Routes are mounted at /api/finance/invoices
 */
export const createInvoiceRoutes = (
  prisma: PrismaClient,
  eventBus: EventBus,
  geminiApiKey: string,
  fileStorageBasePath?: string
): Router => {
  const router = Router();

  // Initialize controller
  const controller = new InvoiceController(prisma, eventBus, geminiApiKey, fileStorageBasePath);

  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(), // Store in memory as buffer
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max
      files: 50, // Max 50 files in batch
    },
    fileFilter: (req, file, cb) => {
      // Only accept PDF files
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    },
  });

  // ==================== Upload Endpoints ====================

  /**
   * Upload single invoice PDF
   * POST /invoices/upload
   */
  router.post(
    '/upload',
    upload.single('file'),
    validateRequest(uploadInvoiceSchema),
    controller.uploadInvoice.bind(controller)
  );

  /**
   * Batch upload invoices
   * POST /invoices/batch-upload
   */
  router.post(
    '/batch-upload',
    upload.array('files', 50),
    validateRequest(batchUploadInvoicesSchema),
    controller.batchUpload.bind(controller)
  );

  // ==================== Extraction Endpoints ====================

  /**
   * Extract invoice data with AI
   * POST /invoices/:id/extract
   */
  router.post(
    '/:id/extract',
    validateRequest(extractInvoiceDataSchema),
    controller.extractInvoiceData.bind(controller)
  );

  /**
   * Batch extract invoices
   * POST /invoices/batch-extract
   */
  router.post(
    '/batch-extract',
    validateRequest(batchExtractInvoicesSchema),
    controller.batchExtract.bind(controller)
  );

  // ==================== Query Endpoints ====================

  /**
   * Get invoice statistics
   * GET /invoices/statistics
   */
  router.get(
    '/statistics',
    validateRequest(getInvoiceStatisticsSchema),
    controller.getStatistics.bind(controller)
  );

  /**
   * Get unmatched invoices
   * GET /invoices/unmatched
   */
  router.get(
    '/unmatched',
    validateRequest(getUnmatchedInvoicesSchema),
    controller.getUnmatched.bind(controller)
  );

  /**
   * Get pending invoices
   * GET /invoices/pending
   */
  router.get(
    '/pending',
    validateRequest(getPendingInvoicesSchema),
    controller.getPending.bind(controller)
  );

  /**
   * Get overdue invoices
   * GET /invoices/overdue
   */
  router.get(
    '/overdue',
    validateRequest(getOverdueInvoicesSchema),
    controller.getOverdue.bind(controller)
  );

  /**
   * Get invoices needing extraction
   * GET /invoices/needs-extraction
   */
  router.get(
    '/needs-extraction',
    validateRequest(getNeedsExtractionSchema),
    controller.getNeedsExtraction.bind(controller)
  );

  /**
   * List invoices with filters
   * GET /invoices
   */
  router.get(
    '/',
    parseTagsMiddleware,
    validateRequest(listInvoicesSchema),
    controller.listInvoices.bind(controller)
  );

  /**
   * Get single invoice
   * GET /invoices/:id
   */
  router.get('/:id', validateRequest(getInvoiceSchema), controller.getInvoice.bind(controller));

  /**
   * Download invoice PDF
   * GET /invoices/:id/download
   */
  router.get(
    '/:id/download',
    validateRequest(downloadInvoiceSchema),
    controller.downloadInvoice.bind(controller)
  );

  // ==================== Modification Endpoints ====================

  /**
   * Update invoice
   * PUT /invoices/:id
   */
  router.put(
    '/:id',
    validateRequest(updateInvoiceSchema),
    controller.updateInvoice.bind(controller)
  );

  /**
   * Delete invoice
   * DELETE /invoices/:id
   */
  router.delete(
    '/:id',
    validateRequest(deleteInvoiceSchema),
    controller.deleteInvoice.bind(controller)
  );

  /**
   * Batch delete invoices
   * POST /invoices/batch-delete
   */
  router.post(
    '/batch-delete',
    validateRequest(batchDeleteInvoicesSchema),
    controller.batchDelete.bind(controller)
  );

  return router;
};
