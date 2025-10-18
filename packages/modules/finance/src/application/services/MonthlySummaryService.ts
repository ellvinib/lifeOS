import { Result } from '@lifeOS/core/shared/result';
import { BaseError, BusinessRuleError } from '@lifeOS/core/shared/errors';
import { MonthlySummary } from '../../domain/entities/MonthlySummary';
import { BankTransaction } from '../../domain/entities/BankTransaction';

/**
 * Monthly Summary Aggregation Data
 */
export interface MonthlyAggregationData {
  totalIncome: number;
  totalExpenses: number;
  transactionCount: number;
  averageTransactionSize: number;
  largestExpense: number;
  largestIncome: number;
  categoryCounts: Record<string, number>;
}

/**
 * Monthly Summary Service
 *
 * Handles aggregation of transaction data into monthly summaries.
 * Core business logic for dashboard statistics.
 */
export class MonthlySummaryService {
  /**
   * Calculate monthly summary from transactions
   */
  public calculateMonthlySummary(
    userId: string,
    month: Date,
    transactions: BankTransaction[]
  ): Result<MonthlySummary, BaseError> {
    try {
      // Filter transactions for the specific month
      const monthTransactions = this.filterTransactionsByMonth(transactions, month);

      if (monthTransactions.length === 0) {
        // Return zero summary for month with no transactions
        return Result.ok(
          MonthlySummary.create(userId, month, 0, 0, 0, {})
        );
      }

      // Calculate aggregations
      const aggregation = this.aggregateTransactions(monthTransactions);

      // Create monthly summary entity
      const summary = MonthlySummary.create(
        userId,
        month,
        aggregation.totalIncome,
        aggregation.totalExpenses,
        aggregation.transactionCount,
        aggregation.categoryCounts,
        {
          averageTransactionSize: aggregation.averageTransactionSize,
          largestExpense: aggregation.largestExpense,
          largestIncome: aggregation.largestIncome,
        }
      );

      return Result.ok(summary);
    } catch (error: any) {
      return Result.fail(
        new BusinessRuleError(
          `Failed to calculate monthly summary: ${error.message}`,
          'CALCULATION_FAILED'
        )
      );
    }
  }

  /**
   * Recalculate existing monthly summary
   */
  public recalculateMonthlySummary(
    summary: MonthlySummary,
    transactions: BankTransaction[]
  ): Result<MonthlySummary, BaseError> {
    // Recalculate from scratch
    const result = this.calculateMonthlySummary(
      summary.userId,
      summary.month,
      transactions
    );

    if (result.isOk()) {
      // Mark as recalculated
      result.value.markAsRecalculated();
    }

    return result;
  }

  /**
   * Compare two monthly summaries
   */
  public compareSummaries(
    current: MonthlySummary,
    previous: MonthlySummary
  ): {
    incomeDelta: number;
    expensesDelta: number;
    netCashFlowDelta: number;
    incomePercentChange: number;
    expensesPercentChange: number;
    savingsRateDelta: number;
  } {
    const comparison = current.compareTo(previous);
    const savingsRateDelta = current.getSavingsRate() - previous.getSavingsRate();

    return {
      ...comparison,
      savingsRateDelta,
    };
  }

  /**
   * Calculate trend across multiple months
   */
  public calculateTrend(summaries: MonthlySummary[]): {
    averageIncome: number;
    averageExpenses: number;
    averageNetCashFlow: number;
    totalIncome: number;
    totalExpenses: number;
    totalNetCashFlow: number;
    averageSavingsRate: number;
    incomeGrowthRate: number;
    expensesGrowthRate: number;
  } {
    if (summaries.length === 0) {
      return {
        averageIncome: 0,
        averageExpenses: 0,
        averageNetCashFlow: 0,
        totalIncome: 0,
        totalExpenses: 0,
        totalNetCashFlow: 0,
        averageSavingsRate: 0,
        incomeGrowthRate: 0,
        expensesGrowthRate: 0,
      };
    }

    // Sort by month (oldest first)
    const sortedSummaries = [...summaries].sort(
      (a, b) => a.month.getTime() - b.month.getTime()
    );

    // Calculate totals
    const totalIncome = sortedSummaries.reduce((sum, s) => sum + s.totalIncome, 0);
    const totalExpenses = sortedSummaries.reduce((sum, s) => sum + s.totalExpenses, 0);
    const totalNetCashFlow = sortedSummaries.reduce((sum, s) => sum + s.netCashFlow, 0);

    // Calculate averages
    const count = sortedSummaries.length;
    const averageIncome = totalIncome / count;
    const averageExpenses = totalExpenses / count;
    const averageNetCashFlow = totalNetCashFlow / count;

    // Calculate average savings rate
    const totalSavingsRate = sortedSummaries.reduce(
      (sum, s) => sum + s.getSavingsRate(),
      0
    );
    const averageSavingsRate = totalSavingsRate / count;

    // Calculate growth rates (simple linear)
    let incomeGrowthRate = 0;
    let expensesGrowthRate = 0;

    if (count >= 2) {
      const firstMonth = sortedSummaries[0];
      const lastMonth = sortedSummaries[count - 1];

      if (firstMonth.totalIncome > 0) {
        incomeGrowthRate =
          ((lastMonth.totalIncome - firstMonth.totalIncome) / firstMonth.totalIncome) * 100;
      }

      if (firstMonth.totalExpenses > 0) {
        expensesGrowthRate =
          ((lastMonth.totalExpenses - firstMonth.totalExpenses) /
            firstMonth.totalExpenses) *
          100;
      }
    }

    return {
      averageIncome,
      averageExpenses,
      averageNetCashFlow,
      totalIncome,
      totalExpenses,
      totalNetCashFlow,
      averageSavingsRate,
      incomeGrowthRate,
      expensesGrowthRate,
    };
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
   * Aggregate transaction data
   */
  private aggregateTransactions(
    transactions: BankTransaction[]
  ): MonthlyAggregationData {
    let totalIncome = 0;
    let totalExpenses = 0;
    let largestExpense = 0;
    let largestIncome = 0;
    const categoryCounts: Record<string, number> = {};

    for (const tx of transactions) {
      const amount = tx.getAbsoluteAmount();

      // Income vs Expense
      if (tx.isIncome()) {
        totalIncome += amount;
        largestIncome = Math.max(largestIncome, amount);
      } else {
        totalExpenses += amount;
        largestExpense = Math.max(largestExpense, amount);
      }

      // Category counts
      if (tx.category) {
        categoryCounts[tx.category] = (categoryCounts[tx.category] || 0) + 1;
      }
    }

    const transactionCount = transactions.length;
    const averageTransactionSize =
      transactionCount > 0 ? (totalIncome + totalExpenses) / transactionCount : 0;

    return {
      totalIncome,
      totalExpenses,
      transactionCount,
      averageTransactionSize,
      largestExpense,
      largestIncome,
      categoryCounts,
    };
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

  /**
   * Get N months ago
   */
  public getMonthsAgo(months: number): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() - months, 1);
  }
}
