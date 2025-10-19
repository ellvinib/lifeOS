import { Router } from 'express';
import multer from 'multer';
import { PrismaClient } from '@prisma/client';
import { IEventBus } from '@lifeOS/core/events';
import { TransactionController } from '../controllers/TransactionController';
import { BankTransactionRepository } from '../../infrastructure/repositories/BankTransactionRepository';
import { validateRequest } from '../middleware/validateRequest';
import {
  getTransactionSchema,
  listTransactionsSchema,
  getUnreconciledTransactionsSchema,
  getTransactionsByStatusSchema,
  getPotentialMatchesSchema,
  updateTransactionSchema,
  ignoreTransactionSchema,
  unignoreTransactionSchema,
  deleteTransactionSchema,
  softDeleteTransactionSchema,
  batchUpdateCategorySchema,
  batchDeleteTransactionsSchema,
  importTransactionsSchema,
  previewImportSchema,
} from '../validation/transactionSchemas';

/**
 * Transaction Routes
 *
 * REST API endpoints for bank transaction management.
 *
 * Endpoints:
 * - GET    /transactions              - List transactions with filters
 * - GET    /transactions/unreconciled - Get unreconciled transactions
 * - GET    /transactions/by-status    - Get transactions by status
 * - GET    /transactions/potential-matches - Get potential matches
 * - GET    /transactions/:id          - Get single transaction
 * - PATCH  /transactions/:id          - Update transaction
 * - DELETE /transactions/:id          - Delete transaction (hard delete)
 * - POST   /transactions/:id/ignore   - Mark as ignored
 * - POST   /transactions/:id/unignore - Unignore transaction
 * - POST   /transactions/:id/soft-delete - Soft delete (recommended)
 * - POST   /transactions/batch/update-category - Batch update category
 * - POST   /transactions/batch/delete - Batch delete
 * - POST   /transactions/import       - Import from CSV
 * - POST   /transactions/import/preview - Preview CSV import
 */

/**
 * Create transaction routes
 *
 * @param prisma Prisma client for database access
 * @param eventBus Event bus for publishing domain events
 * @returns Express router with all transaction endpoints
 */
export const createTransactionRoutes = (prisma: PrismaClient, eventBus: IEventBus): Router => {
  const router = Router();

  // Configure multer for CSV file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max for CSV files
    },
    fileFilter: (req, file, cb) => {
      // Accept CSV files
      if (
        file.mimetype === 'text/csv' ||
        file.mimetype === 'application/csv' ||
        file.originalname.endsWith('.csv')
      ) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV files are allowed'));
      }
    },
  });

  // Initialize repository and controller
  const transactionRepository = new BankTransactionRepository(prisma);
  const controller = new TransactionController(transactionRepository, eventBus);

  /**
   * Import/Preview routes - MUST come before /:id routes
   */

  // POST /transactions/import - Import transactions from CSV
  router.post(
    '/import',
    upload.single('file'),
    validateRequest(importTransactionsSchema),
    controller.importTransactions.bind(controller)
  );

  // POST /transactions/import/preview - Preview CSV import
  router.post(
    '/import/preview',
    upload.single('file'),
    validateRequest(previewImportSchema),
    controller.previewImport.bind(controller)
  );

  /**
   * Batch operation routes - MUST come before /:id routes
   */

  // POST /transactions/batch/update-category - Batch update category
  router.post(
    '/batch/update-category',
    validateRequest(batchUpdateCategorySchema),
    controller.batchUpdateCategory.bind(controller)
  );

  // POST /transactions/batch/delete - Batch delete transactions
  router.post(
    '/batch/delete',
    validateRequest(batchDeleteTransactionsSchema),
    controller.batchDeleteTransactions.bind(controller)
  );

  /**
   * Query routes - MUST come before /:id routes
   */

  // GET /transactions/unreconciled - Get unreconciled transactions
  router.get(
    '/unreconciled',
    validateRequest(getUnreconciledTransactionsSchema),
    controller.getUnreconciledTransactions.bind(controller)
  );

  // GET /transactions/by-status - Get transactions by status
  router.get(
    '/by-status',
    validateRequest(getTransactionsByStatusSchema),
    controller.getTransactionsByStatus.bind(controller)
  );

  // GET /transactions/potential-matches - Get potential matches
  router.get(
    '/potential-matches',
    validateRequest(getPotentialMatchesSchema),
    controller.getPotentialMatches.bind(controller)
  );

  /**
   * List route - MUST come before /:id routes
   */

  // GET /transactions - List transactions with filters
  router.get(
    '/',
    validateRequest(listTransactionsSchema),
    controller.listTransactions.bind(controller)
  );

  /**
   * Action routes with :id parameter - MUST come after specific routes
   */

  // POST /transactions/:id/ignore - Mark as ignored
  router.post(
    '/:id/ignore',
    validateRequest(ignoreTransactionSchema),
    controller.ignoreTransaction.bind(controller)
  );

  // POST /transactions/:id/unignore - Unignore transaction
  router.post(
    '/:id/unignore',
    validateRequest(unignoreTransactionSchema),
    controller.unignoreTransaction.bind(controller)
  );

  // POST /transactions/:id/soft-delete - Soft delete (recommended)
  router.post(
    '/:id/soft-delete',
    validateRequest(softDeleteTransactionSchema),
    controller.softDeleteTransaction.bind(controller)
  );

  /**
   * Standard CRUD routes with :id parameter - MUST come last
   */

  // GET /transactions/:id - Get single transaction
  router.get(
    '/:id',
    validateRequest(getTransactionSchema),
    controller.getTransaction.bind(controller)
  );

  // PATCH /transactions/:id - Update transaction
  router.patch(
    '/:id',
    validateRequest(updateTransactionSchema),
    controller.updateTransaction.bind(controller)
  );

  // DELETE /transactions/:id - Delete transaction (hard delete, not recommended)
  router.delete(
    '/:id',
    validateRequest(deleteTransactionSchema),
    controller.deleteTransaction.bind(controller)
  );

  return router;
};
