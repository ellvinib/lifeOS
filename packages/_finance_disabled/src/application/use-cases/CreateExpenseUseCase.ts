import { Result } from '@lifeOS/core/shared/result';
import { BaseError, ValidationError, BusinessRuleError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { IExpenseRepository } from '../../domain/interfaces';
import { Expense, ExpenseCategory, PaymentMethod } from '../../domain/entities';

/**
 * Create Expense Input
 */
export interface CreateExpenseInput {
  description: string;
  amount: number;
  category: ExpenseCategory;
  date: Date;
  paymentMethod: PaymentMethod;
  isRecurring?: boolean;
  recurrenceIntervalDays?: number;
  merchantName?: string;
  notes?: string;
  tags?: string[];
  receiptUrl?: string;
}

/**
 * Create Expense Use Case
 *
 * Creates a new expense and publishes domain event.
 *
 * Business Rules:
 * - Amount must be positive
 * - Date cannot be in future (for actual expenses)
 * - Recurring expenses must have interval
 * - Tags are automatically normalized
 *
 * Use Case Pattern (6 steps):
 * 1. Validate input
 * 2. Create domain entity
 * 3. Validate business rules
 * 4. Persist to repository
 * 5. Publish domain event
 * 6. Return result
 */
export class CreateExpenseUseCase {
  constructor(
    private readonly expenseRepository: IExpenseRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(input: CreateExpenseInput, userId: string): Promise<Result<Expense, BaseError>> {
    // Step 1: Validate input
    const validationResult = this.validateInput(input);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // Step 2 & 3: Create domain entity (validates business rules internally)
    let expense: Expense;
    try {
      expense = Expense.create(
        input.description,
        input.amount,
        input.category,
        input.date,
        input.paymentMethod,
        {
          isRecurring: input.isRecurring,
          recurrenceIntervalDays: input.recurrenceIntervalDays,
          merchantName: input.merchantName,
          notes: input.notes,
          tags: input.tags,
          receiptUrl: input.receiptUrl,
        }
      );
    } catch (error: any) {
      return Result.fail(
        new BusinessRuleError(error.message, 'EXPENSE_CREATION_FAILED')
      );
    }

    // Additional business rule: Date cannot be in future for actual expenses
    const now = new Date();
    if (input.date > now) {
      return Result.fail(
        new BusinessRuleError(
          'Expense date cannot be in the future',
          'EXPENSE_FUTURE_DATE'
        )
      );
    }

    // Step 4: Persist to repository with userId
    const createResult = await this.expenseRepository.create(expense, userId);
    if (createResult.isFail()) {
      return createResult;
    }

    // Step 5: Publish domain event
    await this.eventBus.publish({
      type: 'ExpenseCreated',
      source: 'finance',
      payload: {
        expenseId: expense.id,
        amount: expense.amount,
        category: expense.category,
        date: expense.date,
        merchantName: expense.merchantName,
      },
      metadata: {
        userId, // Use actual userId from auth context
        timestamp: new Date(),
      },
    });

    // Step 6: Return result
    return Result.ok(createResult.value);
  }

  /**
   * Validate input data
   */
  private validateInput(input: CreateExpenseInput): Result<void, BaseError> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!input.description || input.description.trim().length === 0) {
      errors.push({ field: 'description', message: 'Description is required' });
    }

    if (input.description && input.description.length > 500) {
      errors.push({ field: 'description', message: 'Description must be less than 500 characters' });
    }

    if (input.amount <= 0) {
      errors.push({ field: 'amount', message: 'Amount must be positive' });
    }

    if (!input.category) {
      errors.push({ field: 'category', message: 'Category is required' });
    }

    if (!input.date) {
      errors.push({ field: 'date', message: 'Date is required' });
    }

    if (!input.paymentMethod) {
      errors.push({ field: 'paymentMethod', message: 'Payment method is required' });
    }

    if (input.isRecurring && !input.recurrenceIntervalDays) {
      errors.push({
        field: 'recurrenceIntervalDays',
        message: 'Recurrence interval is required for recurring expenses',
      });
    }

    if (input.recurrenceIntervalDays && input.recurrenceIntervalDays < 1) {
      errors.push({
        field: 'recurrenceIntervalDays',
        message: 'Recurrence interval must be at least 1 day',
      });
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError('Invalid expense data', errors));
    }

    return Result.ok(undefined);
  }
}
