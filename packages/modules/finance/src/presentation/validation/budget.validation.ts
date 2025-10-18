import { z } from 'zod';
import { ExpenseCategorySchema } from './expense.validation';

/**
 * Affordability Check Request Schema
 */
export const AffordabilityCheckSchema = z.object({
  amount: z
    .number()
    .positive('Amount must be positive')
    .finite('Amount must be a valid number'),
  category: ExpenseCategorySchema,
});

/**
 * Budget Category Schema
 */
export const BudgetCategorySchema = z.object({
  category: ExpenseCategorySchema,
  plannedAmount: z
    .number()
    .nonnegative('Planned amount cannot be negative')
    .finite('Planned amount must be a valid number'),
});

/**
 * Create Budget Request Schema
 */
export const CreateBudgetSchema = z.object({
  name: z
    .string()
    .min(1, 'Budget name is required')
    .max(200, 'Budget name must be less than 200 characters')
    .trim(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  totalIncome: z
    .number()
    .positive('Total income must be positive')
    .finite('Total income must be a valid number'),
  categories: z
    .array(BudgetCategorySchema)
    .min(1, 'At least one category is required')
    .max(20, 'Maximum 20 categories allowed'),
  savingsGoal: z
    .number()
    .nonnegative('Savings goal cannot be negative')
    .finite('Savings goal must be a valid number')
    .optional(),
});

/**
 * Update Budget Request Schema
 */
export const UpdateBudgetSchema = z.object({
  name: z
    .string()
    .min(1, 'Budget name is required')
    .max(200, 'Budget name must be less than 200 characters')
    .trim()
    .optional(),
  totalIncome: z
    .number()
    .positive('Total income must be positive')
    .finite('Total income must be a valid number')
    .optional(),
  categories: z
    .array(BudgetCategorySchema)
    .min(1, 'At least one category is required')
    .max(20, 'Maximum 20 categories allowed')
    .optional(),
  savingsGoal: z
    .number()
    .nonnegative('Savings goal cannot be negative')
    .finite('Savings goal must be a valid number')
    .optional(),
});

/**
 * Budget ID Parameter Schema
 */
export const BudgetIdSchema = z.object({
  id: z.string().uuid('Invalid budget ID format'),
});

/**
 * Month Parameter Schema
 */
export const MonthSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
});
