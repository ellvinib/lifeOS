import { Router } from 'express';
import { ExpenseController } from '../controllers';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware';
import {
  CreateExpenseSchema,
  UpdateExpenseSchema,
  ExpenseQuerySchema,
  ExpenseIdSchema,
} from '../validation';

/**
 * Expense Routes
 *
 * POST   /api/finance/expenses           - Create expense
 * GET    /api/finance/expenses           - Get all expenses (with filters)
 * GET    /api/finance/expenses/:id       - Get expense by ID
 * PUT    /api/finance/expenses/:id       - Update expense
 * DELETE /api/finance/expenses/:id       - Delete expense
 */
export const createExpenseRoutes = (controller: ExpenseController): Router => {
  const router = Router();

  // Create expense
  router.post(
    '/',
    validateBody(CreateExpenseSchema),
    controller.createExpense.bind(controller)
  );

  // Get all expenses with filters
  router.get(
    '/',
    validateQuery(ExpenseQuerySchema),
    controller.getAllExpenses.bind(controller)
  );

  // Get expense by ID
  router.get(
    '/:id',
    validateParams(ExpenseIdSchema),
    controller.getExpenseById.bind(controller)
  );

  // Update expense
  router.put(
    '/:id',
    validateParams(ExpenseIdSchema),
    validateBody(UpdateExpenseSchema),
    controller.updateExpense.bind(controller)
  );

  // Delete expense
  router.delete(
    '/:id',
    validateParams(ExpenseIdSchema),
    controller.deleteExpense.bind(controller)
  );

  return router;
};
