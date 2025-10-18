/**
 * Budget Routes
 *
 * Route definitions for budget endpoints.
 *
 * Design principles:
 * - Factory pattern: Create routes with dependencies
 * - Declarative: Route definitions are clear
 * - No business logic in routes
 */

import { Router } from 'express';
import type { IExpenseRepository, IBudgetRepository } from '../../../../modules/finance/src/domain/interfaces';

import { BudgetController } from '../controllers/BudgetController';

/**
 * Create budget routes with dependency injection.
 */
export function createBudgetRoutes(
  budgetRepository: IBudgetRepository,
  expenseRepository: IExpenseRepository
): Router {
  const router = Router();
  const controller = new BudgetController(budgetRepository, expenseRepository);

  // GET /api/finance/budget/today
  router.get(
    '/today',
    controller.getToday.bind(controller)
  );

  // GET /api/finance/budget/envelopes
  router.get(
    '/envelopes',
    controller.getEnvelopes.bind(controller)
  );

  return router;
}
