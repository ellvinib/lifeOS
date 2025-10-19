import { z } from 'zod';

/**
 * Expense Category Enum
 */
export const ExpenseCategorySchema = z.enum([
  'housing',
  'utilities',
  'groceries',
  'transportation',
  'healthcare',
  'insurance',
  'entertainment',
  'dining',
  'shopping',
  'education',
  'savings',
  'debt_payment',
  'investments',
  'gifts',
  'other',
]);

/**
 * Payment Method Enum
 */
export const PaymentMethodSchema = z.enum([
  'cash',
  'credit_card',
  'debit_card',
  'bank_transfer',
  'mobile_payment',
  'other',
]);

/**
 * Base Expense Schema (without refinement)
 */
const BaseExpenseSchema = z.object({
  description: z
    .string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters')
    .trim(),
  amount: z
    .number()
    .positive('Amount must be positive')
    .finite('Amount must be a valid number'),
  category: ExpenseCategorySchema,
  date: z
    .string()
    .datetime('Invalid date format. Use ISO 8601 format'),
  paymentMethod: PaymentMethodSchema,
  isRecurring: z.boolean().optional().default(false),
  recurrenceIntervalDays: z
    .number()
    .int('Recurrence interval must be an integer')
    .positive('Recurrence interval must be positive')
    .optional(),
  merchantName: z
    .string()
    .max(200, 'Merchant name must be less than 200 characters')
    .trim()
    .optional(),
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .trim()
    .optional(),
  tags: z
    .array(z.string().max(50))
    .max(20, 'Maximum 20 tags allowed')
    .optional(),
  receiptUrl: z
    .string()
    .url('Receipt URL must be a valid URL')
    .optional(),
});

/**
 * Create Expense Request Schema
 */
export const CreateExpenseSchema = BaseExpenseSchema.refine(
  (data) => !data.isRecurring || data.recurrenceIntervalDays !== undefined,
  {
    message: 'Recurrence interval is required for recurring expenses',
    path: ['recurrenceIntervalDays'],
  }
);

/**
 * Update Expense Request Schema
 */
export const UpdateExpenseSchema = BaseExpenseSchema.partial();

/**
 * Expense Query Parameters Schema
 */
export const ExpenseQuerySchema = z.object({
  category: ExpenseCategorySchema.optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  merchantName: z.string().optional(),
  tags: z.string().optional(), // Comma-separated list
  isRecurring: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  minAmount: z.coerce.number().positive().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  paymentMethod: PaymentMethodSchema.optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

/**
 * Expense ID Parameter Schema
 */
export const ExpenseIdSchema = z.object({
  id: z.string().uuid('Invalid expense ID format'),
});
