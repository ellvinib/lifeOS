import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError } from '@lifeOS/core/shared/errors';
import { IExpenseRepository, IBudgetRepository } from '../../domain/interfaces';
import { ExpenseCategory } from '../../domain/entities';

/**
 * Envelope data for UI
 */
export interface EnvelopeOutput {
  category: ExpenseCategory;
  name: string;
  emoji: string;
  planned: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'good' | 'warning' | 'danger';
  recentTransactions: Array<{
    date: Date;
    description: string;
    amount: number;
    merchantName?: string;
  }>;
}

/**
 * Envelopes Summary Output
 */
export interface EnvelopesOutput {
  envelopes: EnvelopeOutput[];
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  month: string;
}

/**
 * Get Envelopes Use Case
 *
 * Returns all budget envelopes (categories) for the current month
 * with spending data, status, and recent transactions.
 *
 * This powers the envelope cards in the UI.
 */
export class GetEnvelopesUseCase {
  // Category display configuration
  private readonly categoryConfig: Record<ExpenseCategory, { name: string; emoji: string }> = {
    housing: { name: 'Wonen', emoji: '🏠' },
    utilities: { name: 'Utilities', emoji: '💡' },
    groceries: { name: 'Boodschappen', emoji: '🛒' },
    transportation: { name: 'Transport', emoji: '🚗' },
    healthcare: { name: 'Zorgkosten', emoji: '🏥' },
    insurance: { name: 'Verzekeringen', emoji: '🛡️' },
    entertainment: { name: 'Vrije tijd', emoji: '🎬' },
    dining: { name: 'Uit eten', emoji: '🍽️' },
    shopping: { name: 'Shopping', emoji: '🛍️' },
    education: { name: 'Educatie', emoji: '📚' },
    savings: { name: 'Sparen', emoji: '💰' },
    debt_payment: { name: 'Schulden', emoji: '💳' },
    investments: { name: 'Beleggen', emoji: '📈' },
    gifts: { name: 'Cadeaus', emoji: '🎁' },
    other: { name: 'Overig', emoji: '📦' },
  };

  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly expenseRepository: IExpenseRepository
  ) {}

  async execute(userId: string): Promise<Result<EnvelopesOutput, BaseError>> {
    // Get current month's budget for this user
    const budgetResult = await this.budgetRepository.getCurrentMonth(userId);
    if (budgetResult.isFail()) {
      return budgetResult;
    }

    const budget = budgetResult.value;
    if (!budget) {
      // Return empty envelopes for new users (not an error!)
      const now = new Date();
      const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      return Result.ok({
        envelopes: [],
        totalBudget: 0,
        totalSpent: 0,
        totalRemaining: 0,
        month,
      });
    }

    // Calculate date range for current month
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startOfMonth = new Date(year, month, 1, 0, 0, 0);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

    // Get all categories from budget
    const categories = budget.getAllCategories();

    // Build envelopes with spending data
    const envelopes: EnvelopeOutput[] = [];
    for (const categoryBudget of categories) {
      // Get spending for this category for this user
      const spendingResult = await this.expenseRepository.getTotalByCategory(
        categoryBudget.category,
        startOfMonth,
        endOfMonth,
        userId
      );

      if (spendingResult.isFail()) {
        return spendingResult;
      }

      const spent = spendingResult.value;
      const remaining = categoryBudget.plannedAmount - spent; // Allow negative values
      const percentage = categoryBudget.plannedAmount > 0
        ? (spent / categoryBudget.plannedAmount) * 100
        : 0;

      // Determine status
      let status: 'good' | 'warning' | 'danger';
      if (percentage >= 100) {
        status = 'danger';
      } else if (percentage >= 85) {
        status = 'warning';
      } else {
        status = 'good';
      }

      // Get recent transactions for this category for this user (last 5)
      const transactionsResult = await this.expenseRepository.findAll({
        userId,
        category: categoryBudget.category,
        startDate: startOfMonth,
        endDate: endOfMonth,
        limit: 5,
      });

      if (transactionsResult.isFail()) {
        return transactionsResult;
      }

      const recentTransactions = transactionsResult.value.map(expense => ({
        date: expense.date,
        description: expense.description,
        amount: expense.amount,
        merchantName: expense.merchantName,
      }));

      const config = this.categoryConfig[categoryBudget.category];

      envelopes.push({
        category: categoryBudget.category,
        name: config.name,
        emoji: config.emoji,
        planned: Math.round(categoryBudget.plannedAmount * 100) / 100,
        spent: Math.round(spent * 100) / 100,
        remaining: Math.round(remaining * 100) / 100,
        percentage: Math.round(percentage),
        status,
        recentTransactions,
      });
    }

    // Sort envelopes by status (danger first) and then by percentage
    envelopes.sort((a, b) => {
      const statusOrder = { danger: 0, warning: 1, good: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return b.percentage - a.percentage;
    });

    // Calculate totals from actual envelope data
    const totalBudget = budget.getTotalPlanned();
    const totalSpent = envelopes.reduce((sum, env) => sum + env.spent, 0);
    const totalRemaining = totalBudget - totalSpent;

    return Result.ok({
      envelopes,
      totalBudget: Math.round(totalBudget * 100) / 100,
      totalSpent: Math.round(totalSpent * 100) / 100,
      totalRemaining: Math.round(totalRemaining * 100) / 100,
      month: budget.month,
    });
  }
}
