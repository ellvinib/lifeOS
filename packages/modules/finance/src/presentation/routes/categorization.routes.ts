import { Router } from 'express';
import { CategorizationController } from '../controllers/CategorizationController';

/**
 * Create Categorization Routes
 *
 * Routes for auto-categorization functionality
 */
export const createCategorizationRoutes = (
  categorizationController: CategorizationController
): Router => {
  const router = Router();

  /**
   * POST /api/finance/categorization/suggest
   * Suggest category for a transaction
   *
   * Request body: { transactionId: string }
   * Response: { category, confidence, reason, source }
   */
  router.post(
    '/suggest',
    categorizationController.suggestCategory.bind(categorizationController)
  );

  /**
   * POST /api/finance/categorization/feedback
   * Provide feedback on categorization suggestion
   *
   * Request body: {
   *   transactionId: string,
   *   suggestedCategory?: string,
   *   actualCategory: string,
   *   confidence?: number
   * }
   */
  router.post(
    '/feedback',
    categorizationController.provideFeedback.bind(categorizationController)
  );

  /**
   * POST /api/finance/categorization/rules
   * Create a new categorization rule
   *
   * Request body: {
   *   pattern: string,
   *   patternType: 'exact' | 'contains' | 'regex' | 'iban',
   *   category: string,
   *   confidence?: number,
   *   priority?: number
   * }
   */
  router.post(
    '/rules',
    categorizationController.createRule.bind(categorizationController)
  );

  return router;
};
