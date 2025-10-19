import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError } from '@lifeOS/core/shared/errors';
import { IExpenseRepository, IBudgetRepository } from '../../domain/interfaces';

/**
 * Today Budget Output
 */
export interface TodayBudgetOutput {
  remainingToday: number;
  dailyLimit: number;
  spentToday: number;
  percentUsed: number;
  totalBudget: number;
  spentThisMonth: number;
  daysInMonth: number;
  dayOfMonth: number;
  onTrack: boolean;
  projectedEndOfMonthTotal: number;
}

/**
 * Get Today Budget Use Case
 *
 * Calculates today's spending situation based on:
 * - Current month's budget
 * - Expenses so far this month
 * - Day of month (to calculate daily allowance)
 * - Expenses today
 *
 * Formula:
 * - Total budget = Sum of all category budgets
 * - Days in month = Days in current month
 * - Daily limit = Total budget / Days in month
 * - Spent today = Sum of today's expenses
 * - Remaining today = Daily limit - Spent today
 * - On track = (Spent this month / Day of month) <= Daily limit
 */
export class GetTodayBudgetUseCase {
  constructor(
    private readonly budgetRepository: IBudgetRepository,
    private readonly expenseRepository: IExpenseRepository
  ) {}

  async execute(userId: string): Promise<Result<TodayBudgetOutput, BaseError>> {
    // Get current month's budget for this user
    const budgetResult = await this.budgetRepository.getCurrentMonth(userId);
    if (budgetResult.isFail()) {
      return budgetResult;
    }

    const budget = budgetResult.value;
    if (!budget) {
      // Return empty budget state for new users (not an error!)
      return Result.ok({
        remainingToday: 0,
        dailyLimit: 0,
        spentToday: 0,
        percentUsed: 0,
        totalBudget: 0,
        spentThisMonth: 0,
        daysInMonth: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(),
        dayOfMonth: new Date().getDate(),
        onTrack: true,
        projectedEndOfMonthTotal: 0,
      });
    }

    // Calculate date information
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Get start and end of today
    const startOfToday = new Date(year, month, dayOfMonth, 0, 0, 0);
    const endOfToday = new Date(year, month, dayOfMonth, 23, 59, 59);

    // Get start of month
    const startOfMonth = new Date(year, month, 1, 0, 0, 0);

    // Get today's expenses for this user
    const todayExpensesResult = await this.expenseRepository.findAll({
      userId,
      startDate: startOfToday,
      endDate: endOfToday,
    });
    if (todayExpensesResult.isFail()) {
      return todayExpensesResult;
    }

    const spentToday = todayExpensesResult.value.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    // Get this month's total expenses for this user
    const monthExpensesResult = await this.expenseRepository.getTotalForPeriod(
      startOfMonth,
      now,
      userId
    );
    if (monthExpensesResult.isFail()) {
      return monthExpensesResult;
    }

    const spentThisMonth = monthExpensesResult.value;

    // Calculate daily limit
    const totalBudget = budget.getTotalPlanned();
    const dailyLimit = totalBudget / daysInMonth;

    // Calculate remaining today
    const remainingToday = Math.max(0, dailyLimit - spentToday);

    // Calculate percent used today
    const percentUsed = dailyLimit > 0 ? (spentToday / dailyLimit) * 100 : 0;

    // Check if on track (are we spending within our daily allowance?)
    const expectedSpendingByNow = dailyLimit * dayOfMonth;
    const onTrack = spentThisMonth <= expectedSpendingByNow;

    // Project end of month total
    const daysRemaining = daysInMonth - dayOfMonth;
    const averageDailySpending = spentThisMonth / dayOfMonth;
    const projectedEndOfMonthTotal = spentThisMonth + (averageDailySpending * daysRemaining);

    return Result.ok({
      remainingToday: Math.round(remainingToday * 100) / 100,
      dailyLimit: Math.round(dailyLimit * 100) / 100,
      spentToday: Math.round(spentToday * 100) / 100,
      percentUsed: Math.round(percentUsed),
      totalBudget: Math.round(totalBudget * 100) / 100,
      spentThisMonth: Math.round(spentThisMonth * 100) / 100,
      daysInMonth,
      dayOfMonth,
      onTrack,
      projectedEndOfMonthTotal: Math.round(projectedEndOfMonthTotal * 100) / 100,
    });
  }
}
