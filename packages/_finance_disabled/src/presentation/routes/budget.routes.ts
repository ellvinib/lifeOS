import { Router } from 'express';
import { BudgetController } from '../controllers';
import { validateBody } from '../middleware/validation.middleware';
import { AffordabilityCheckSchema } from '../validation';

/**
 * Budget Routes
 *
 * GET  /api/finance/budget/today                - Get today's budget status
 * POST /api/finance/budget/check-affordability  - Check if purchase is affordable
 * GET  /api/finance/budget/envelopes            - Get all budget envelopes
 * POST /api/finance/budget                      - Create budget
 * PUT  /api/finance/budget/:id                  - Update budget
 */
export const createBudgetRoutes = (controller: BudgetController): Router => {
  const router = Router();

  // Get today's budget status (TODAY view)
  router.get(
    '/today',
    controller.getTodayBudget.bind(controller)
  );

  // Check affordability (Pre-Purchase Check widget)
  router.post(
    '/check-affordability',
    validateBody(AffordabilityCheckSchema),
    controller.checkAffordability.bind(controller)
  );

  // Get all budget envelopes
  router.get(
    '/envelopes',
    controller.getEnvelopes.bind(controller)
  );

  // Create budget
  router.post(
    '/',
    // validateBody(CreateBudgetSchema), // TODO: Uncomment when use case is implemented
    controller.createBudget.bind(controller)
  );

  // Update budget
  router.put(
    '/:id',
    // validateParams(BudgetIdSchema), // TODO: Uncomment when use case is implemented
    // validateBody(UpdateBudgetSchema),
    controller.updateBudget.bind(controller)
  );

  return router;
};
