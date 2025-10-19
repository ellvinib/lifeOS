import { Result } from '@lifeOS/core/shared/result';
import { BaseError, BusinessRuleError, NotFoundError } from '@lifeOS/core/shared/errors';
import { IMonthlySummaryRepository } from '../../domain/interfaces/IMonthlySummaryRepository';
import { ICategoryTotalRepository } from '../../domain/interfaces/ICategoryTotalRepository';
import { MonthlySummary } from '../../domain/entities/MonthlySummary';
import { CategoryTotal } from '../../domain/entities/CategoryTotal';
import { MonthlySummaryService } from '../services/MonthlySummaryService';
import { CategoryTotalService } from '../services/CategoryTotalService';

/**
 * Get Dashboard Data Input
 */
export interface GetDashboardDataInput {
  userId: string;
  month?: Date; // If not provided, gets current month
  includeComparison?: boolean; // Include previous month comparison
  includeTrends?: boolean; // Include 6-month trends
}

/**
 * Dashboard Data Output
 */
export interface DashboardDataOutput {
  currentMonth: {
    summary: MonthlySummary;
    categoryTotals: CategoryTotal[];
    topCategories: CategoryTotal[];
    overBudgetCategories: CategoryTotal[];
  };
  comparison?: {
    previousMonth: MonthlySummary;
    incomeDelta: number;
    expensesDelta: number;
    incomePercentChange: number;
    expensesPercentChange: number;
    savingsRateDelta: number;
  };
  trends?: {
    summaries: MonthlySummary[];
    averageIncome: number;
    averageExpenses: number;
    incomeGrowthRate: number;
    expensesGrowthRate: number;
  };
}

/**
 * Get Dashboard Data Use Case
 *
 * Retrieves pre-calculated dashboard data for a user.
 * Includes monthly summary, category breakdowns, comparisons, and trends.
 *
 * Use Case Pattern:
 * 1. Validate input
 * 2. Fetch monthly summary
 * 3. Fetch category totals
 * 4. Calculate top categories and alerts
 * 5. Optionally fetch previous month for comparison
 * 6. Optionally fetch trends
 * 7. Return aggregated data
 */
export class GetDashboardDataUseCase {
  constructor(
    private readonly monthlySummaryRepository: IMonthlySummaryRepository,
    private readonly categoryTotalRepository: ICategoryTotalRepository,
    private readonly monthlySummaryService: MonthlySummaryService,
    private readonly categoryTotalService: CategoryTotalService
  ) {}

  async execute(
    input: GetDashboardDataInput
  ): Promise<Result<DashboardDataOutput, BaseError>> {
    // Step 1: Validate input
    const validationResult = this.validateInput(input);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // Determine target month
    const targetMonth = input.month ?? new Date();
    const monthStart = this.monthlySummaryService.getMonthStart(targetMonth);

    // Step 2: Fetch monthly summary
    const summaryResult = await this.monthlySummaryRepository.findByUserAndMonth(
      input.userId,
      monthStart
    );

    if (summaryResult.isFail()) {
      return Result.fail(summaryResult.error);
    }

    if (!summaryResult.value) {
      return Result.fail(
        new NotFoundError(
          'Monthly summary',
          `No data found for ${monthStart.toISOString()}`
        )
      );
    }

    const currentSummary = summaryResult.value;

    // Step 3: Fetch category totals
    const categoryTotalsResult = await this.categoryTotalRepository.findByUserAndMonth(
      input.userId,
      monthStart
    );

    if (categoryTotalsResult.isFail()) {
      return Result.fail(categoryTotalsResult.error);
    }

    const categoryTotals = categoryTotalsResult.value;

    // Step 4: Calculate top categories and alerts
    const topCategories = this.categoryTotalService.getTopCategories(categoryTotals, 5);
    const overBudgetCategories =
      this.categoryTotalService.getOverBudgetCategories(categoryTotals);

    // Build base output
    const output: DashboardDataOutput = {
      currentMonth: {
        summary: currentSummary,
        categoryTotals,
        topCategories,
        overBudgetCategories,
      },
    };

    // Step 5: Optionally include comparison with previous month
    if (input.includeComparison) {
      const previousMonth = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth() - 1,
        1
      );

      const previousSummaryResult = await this.monthlySummaryRepository.findByUserAndMonth(
        input.userId,
        previousMonth
      );

      if (previousSummaryResult.isOk() && previousSummaryResult.value) {
        const comparison = this.monthlySummaryService.compareSummaries(
          currentSummary,
          previousSummaryResult.value
        );

        output.comparison = {
          previousMonth: previousSummaryResult.value,
          ...comparison,
        };
      }
    }

    // Step 6: Optionally include 6-month trends
    if (input.includeTrends) {
      const sixMonthsAgo = this.monthlySummaryService.getMonthsAgo(6);
      const now = new Date();

      const trendsResult = await this.monthlySummaryRepository.findByUserIdAndDateRange(
        input.userId,
        sixMonthsAgo,
        now
      );

      if (trendsResult.isOk()) {
        const summaries = trendsResult.value;
        const trendData = this.monthlySummaryService.calculateTrend(summaries);

        output.trends = {
          summaries,
          averageIncome: trendData.averageIncome,
          averageExpenses: trendData.averageExpenses,
          incomeGrowthRate: trendData.incomeGrowthRate,
          expensesGrowthRate: trendData.expensesGrowthRate,
        };
      }
    }

    // Step 7: Return result
    return Result.ok(output);
  }

  /**
   * Validate input data
   */
  private validateInput(input: GetDashboardDataInput): Result<void, BaseError> {
    if (!input.userId || input.userId.trim().length === 0) {
      return Result.fail(
        new BusinessRuleError('User ID is required', 'INVALID_USER_ID')
      );
    }

    return Result.ok(undefined);
  }
}
