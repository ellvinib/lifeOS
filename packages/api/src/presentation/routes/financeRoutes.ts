/**
 * Finance Routes
 *
 * Master route file that combines all finance-related routes.
 *
 * Design principles:
 * - Modular: Separate routes by resource type
 * - Composable: Combine routes into single router
 * - Dependency injection: Pass repositories to sub-routers
 */

import { Router } from 'express';
import type { IExpenseRepository, IBudgetRepository } from '../../../../modules/finance/src/domain/interfaces';

import { createBudgetRoutes } from './budgetRoutes';

/**
 * Create all finance routes with dependency injection.
 *
 * Structure:
 * - /api/finance/budget → Budget operations
 * - /api/finance/expenses → Expense operations (future)
 * - /api/finance/bank → Bank integration (future)
 */
export function createFinanceRoutes(
  budgetRepository: IBudgetRepository,
  expenseRepository: IExpenseRepository
): Router {
  const router = Router();

  // Register sub-routes
  router.use('/budget', createBudgetRoutes(budgetRepository, expenseRepository));

  // Future routes:
  // router.use('/expenses', createExpenseRoutes(expenseRepository, eventBus));
  // router.use('/bank', createBankRoutes(bankRepository, eventBus));

  return router;
}
