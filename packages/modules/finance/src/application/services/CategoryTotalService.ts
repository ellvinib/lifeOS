import { Result } from '@lifeOS/core/shared/result';
import { BaseError, BusinessRuleError } from '@lifeOS/core/shared/errors';
import { CategoryTotal } from '../../domain/entities/CategoryTotal';
import { BankTransaction } from '../../domain/entities/BankTransaction';
import { ExpenseCategory } from '../../domain/entities/Expense';
import { Budget } from '../../domain/entities/Budget';

/**
 * Category Aggregation Data
 */
export interface CategoryAggregationData {
  category: ExpenseCategory;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  largestTransaction: number;
  budgetAmount: number | null;
}

/**
 * Category Total Service
 *
 * Handles aggregation of transaction data by category.
 * Core business logic for category breakdowns in dashboard.
 */
export class CategoryTotalService {
  /**
   * Calculate category totals for a month
   */
  public calculateCategoryTotals(
    userId: string,
    month: Date,
    transactions: BankTransaction[],
    budgets?: Budget[]
  ): Result<CategoryTotal[], BaseError> {
    try {
      // Filter transactions for the specific month
      const monthTransactions = this.filterTransactionsByMonth(transactions, month);

      if (monthTransactions.length === 0) {
        return Result.ok([]);
      }

      // Group transactions by category
      const categoryGroups = this.groupTransactionsByCategory(monthTransactions);

      // Calculate total expenses for percent calculation
      const totalExpenses = monthTransactions
        .filter((tx) => !tx.isIncome())
        .reduce((sum, tx) => sum + tx.getAbsoluteAmount(), 0);

      // Create category totals
      const categoryTotals: CategoryTotal[] = [];

      for (const [category, txs] of Object.entries(categoryGroups)) {
        const aggregation = this.aggregateCategoryTransactions(txs);

        // Find budget for this category
        const budget = budgets?.find(
          (b) => b.category === category && this.isDateInMonth(b.startDate, month)
        );

        const percentOfTotal =
          totalExpenses > 0 ? (aggregation.totalAmount / totalExpenses) * 100 : 0;

        const categoryTotal = CategoryTotal.create(
          userId,
          month,
          category as ExpenseCategory,
          aggregation.totalAmount,
          aggregation.transactionCount,
          percentOfTotal,
          {
            averageAmount: aggregation.averageAmount,
            largestTransaction: aggregation.largestTransaction,
            budgetAmount: budget?.amount ?? null,
          }
        );

        categoryTotals.push(categoryTotal);
      }

      // Sort by total amount descending
      categoryTotals.sort((a, b) => b.totalAmount - a.totalAmount);

      return Result.ok(categoryTotals);
    } catch (error: any) {
      return Result.fail(
        new BusinessRuleError(
          `Failed to calculate category totals: ${error.message}`,
          'CALCULATION_FAILED'
        )
      );
    }
  }

  /**
   * Recalculate existing category totals
   */
  public recalculateCategoryTotals(
    userId: string,
    month: Date,
    transactions: BankTransaction[],
    budgets?: Budget[]
  ): Result<CategoryTotal[], BaseError> {
    const result = this.calculateCategoryTotals(userId, month, transactions, budgets);

    if (result.isOk()) {
      // Mark all as recalculated
      result.value.forEach((ct) => ct.markAsRecalculated());
    }

    return result;
  }

  /**
   * Get top N categories by spending
   */
  public getTopCategories(
    categoryTotals: CategoryTotal[],
    limit: number
  ): CategoryTotal[] {
    return [...categoryTotals]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, limit);
  }

  /**
   * Get over-budget categories
   */
  public getOverBudgetCategories(categoryTotals: CategoryTotal[]): CategoryTotal[] {
    return categoryTotals.filter((ct) => ct.isOverBudget());
  }

  /**
   * Get categories approaching budget limit (>80%)
   */
  public getApproachingBudgetCategories(categoryTotals: CategoryTotal[]): CategoryTotal[] {
    return categoryTotals.filter((ct) => ct.isApproachingBudgetLimit());
  }

  /**
   * Compare category totals across months
   */
  public compareCategoryAcrossMonths(
    current: CategoryTotal,
    previous: CategoryTotal
  ): {
    amountDelta: number;
    countDelta: number;
    percentChange: number;
    budgetDelta: number | null;
  } {
    const comparison = current.compareTo(previous);

    let budgetDelta: number | null = null;
    if (current.budgetAmount && previous.budgetAmount) {
      budgetDelta = current.budgetAmount - previous.budgetAmount;
    }

    return {
      ...comparison,
      budgetDelta,
    };
  }

  /**
   * Calculate category trends over multiple months
   */
  public calculateCategoryTrend(
    category: ExpenseCategory,
    categoryTotals: CategoryTotal[]
  ): {
    averageSpending: number;
    totalSpending: number;
    averageTransactionCount: number;
    growthRate: number;
    isIncreasing: boolean;
  } {
    const categoryData = categoryTotals.filter((ct) => ct.category === category);

    if (categoryData.length === 0) {
      return {
        averageSpending: 0,
        totalSpending: 0,
        averageTransactionCount: 0,
        growthRate: 0,
        isIncreasing: false,
      };
    }

    // Sort by month (oldest first)
    const sortedData = [...categoryData].sort(
      (a, b) => a.month.getTime() - b.month.getTime()
    );

    // Calculate totals and averages
    const totalSpending = sortedData.reduce((sum, ct) => sum + ct.totalAmount, 0);
    const averageSpending = totalSpending / sortedData.length;

    const totalTransactions = sortedData.reduce((sum, ct) => sum + ct.transactionCount, 0);
    const averageTransactionCount = totalTransactions / sortedData.length;

    // Calculate growth rate
    let growthRate = 0;
    let isIncreasing = false;

    if (sortedData.length >= 2) {
      const firstMonth = sortedData[0];
      const lastMonth = sortedData[sortedData.length - 1];

      if (firstMonth.totalAmount > 0) {
        growthRate =
          ((lastMonth.totalAmount - firstMonth.totalAmount) / firstMonth.totalAmount) * 100;
        isIncreasing = growthRate > 0;
      }
    }

    return {
      averageSpending,
      totalSpending,
      averageTransactionCount,
      growthRate,
      isIncreasing,
    };
  }

  /**
   * Get spending distribution (categories as percent of total)
   */
  public getSpendingDistribution(
    categoryTotals: CategoryTotal[]
  ): Array<{
    category: ExpenseCategory;
    amount: number;
    percentage: number;
  }> {
    const totalAmount = categoryTotals.reduce((sum, ct) => sum + ct.totalAmount, 0);

    return categoryTotals.map((ct) => ({
      category: ct.category,
      amount: ct.totalAmount,
      percentage: totalAmount > 0 ? (ct.totalAmount / totalAmount) * 100 : 0,
    }));
  }

  /**
   * Filter transactions for a specific month
   */
  private filterTransactionsByMonth(
    transactions: BankTransaction[],
    month: Date
  ): BankTransaction[] {
    const targetYear = month.getFullYear();
    const targetMonth = month.getMonth();

    return transactions.filter((tx) => {
      const txDate = tx.executionDate;
      return txDate.getFullYear() === targetYear && txDate.getMonth() === targetMonth;
    });
  }

  /**
   * Group transactions by category
   */
  private groupTransactionsByCategory(
    transactions: BankTransaction[]
  ): Record<string, BankTransaction[]> {
    const groups: Record<string, BankTransaction[]> = {};

    for (const tx of transactions) {
      // Skip income transactions
      if (tx.isIncome()) continue;

      const category = tx.category || 'uncategorized';

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(tx);
    }

    return groups;
  }

  /**
   * Aggregate transactions for a category
   */
  private aggregateCategoryTransactions(
    transactions: BankTransaction[]
  ): {
    totalAmount: number;
    transactionCount: number;
    averageAmount: number;
    largestTransaction: number;
  } {
    let totalAmount = 0;
    let largestTransaction = 0;

    for (const tx of transactions) {
      const amount = tx.getAbsoluteAmount();
      totalAmount += amount;
      largestTransaction = Math.max(largestTransaction, amount);
    }

    const transactionCount = transactions.length;
    const averageAmount = transactionCount > 0 ? totalAmount / transactionCount : 0;

    return {
      totalAmount,
      transactionCount,
      averageAmount,
      largestTransaction,
    };
  }

  /**
   * Check if a date falls within a month
   */
  private isDateInMonth(date: Date, month: Date): boolean {
    return (
      date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth()
    );
  }

  /**
   * Get month start date
   */
  public getMonthStart(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  /**
   * Get month end date
   */
  public getMonthEnd(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }
}
