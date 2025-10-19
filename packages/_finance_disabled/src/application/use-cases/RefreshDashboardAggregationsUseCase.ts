import { Result } from '@lifeOS/core/shared/result';
import { BaseError, BusinessRuleError } from '@lifeOS/core/shared/errors';
import { IEventBus } from '@lifeOS/core/events';
import { IBankTransactionRepository } from '../../domain/interfaces/IBankTransactionRepository';
import { IBudgetRepository } from '../../domain/interfaces/IBudgetRepository';
import { IMonthlySummaryRepository } from '../../domain/interfaces/IMonthlySummaryRepository';
import { ICategoryTotalRepository } from '../../domain/interfaces/ICategoryTotalRepository';
import { MonthlySummaryService } from '../services/MonthlySummaryService';
import { CategoryTotalService } from '../services/CategoryTotalService';

/**
 * Refresh Dashboard Aggregations Input
 */
export interface RefreshDashboardAggregationsInput {
  userId: string;
  month?: Date; // If not provided, refreshes current month
  forceRecalculation?: boolean; // Recalculate even if not stale
}

/**
 * Refresh Dashboard Aggregations Output
 */
export interface RefreshDashboardAggregationsOutput {
  monthlySummaryId: string;
  categoryTotalIds: string[];
  transactionsProcessed: number;
  calculatedAt: Date;
}

/**
 * Refresh Dashboard Aggregations Use Case
 *
 * Recalculates monthly summary and category totals for a specific month.
 * Used by background jobs and on-demand refresh triggers.
 *
 * Use Case Pattern:
 * 1. Validate input
 * 2. Fetch transactions for the month
 * 3. Fetch budgets for the month
 * 4. Calculate monthly summary
 * 5. Calculate category totals
 * 6. Persist aggregations
 * 7. Publish events
 * 8. Return result
 */
export class RefreshDashboardAggregationsUseCase {
  constructor(
    private readonly transactionRepository: IBankTransactionRepository,
    private readonly budgetRepository: IBudgetRepository,
    private readonly monthlySummaryRepository: IMonthlySummaryRepository,
    private readonly categoryTotalRepository: ICategoryTotalRepository,
    private readonly monthlySummaryService: MonthlySummaryService,
    private readonly categoryTotalService: CategoryTotalService,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    input: RefreshDashboardAggregationsInput
  ): Promise<Result<RefreshDashboardAggregationsOutput, BaseError>> {
    // Step 1: Validate input
    const validationResult = this.validateInput(input);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // Determine target month
    const targetMonth = input.month ?? new Date();
    const monthStart = this.monthlySummaryService.getMonthStart(targetMonth);
    const monthEnd = this.monthlySummaryService.getMonthEnd(targetMonth);

    // Step 2: Check if recalculation is needed
    if (!input.forceRecalculation) {
      const existingSummaryResult = await this.monthlySummaryRepository.findByUserAndMonth(
        input.userId,
        monthStart
      );

      if (existingSummaryResult.isOk() && existingSummaryResult.value) {
        const summary = existingSummaryResult.value;
        if (!summary.isStale()) {
          // Summary is fresh, no need to recalculate
          return Result.ok({
            monthlySummaryId: summary.id,
            categoryTotalIds: [],
            transactionsProcessed: 0,
            calculatedAt: summary.calculatedAt,
          });
        }
      }
    }

    // Step 3: Fetch transactions for the month
    const transactionsResult = await this.transactionRepository.findByUserIdAndDateRange(
      input.userId,
      monthStart,
      monthEnd
    );

    if (transactionsResult.isFail()) {
      return Result.fail(transactionsResult.error);
    }

    const transactions = transactionsResult.value;

    // Step 4: Fetch budgets for the month
    const budgetsResult = await this.budgetRepository.findActiveByUserId(input.userId);
    const budgets = budgetsResult.isOk() ? budgetsResult.value : [];

    // Step 5: Calculate monthly summary
    const monthlySummaryResult = this.monthlySummaryService.calculateMonthlySummary(
      input.userId,
      monthStart,
      transactions
    );

    if (monthlySummaryResult.isFail()) {
      return Result.fail(monthlySummaryResult.error);
    }

    const monthlySummary = monthlySummaryResult.value;

    // Step 6: Calculate category totals
    const categoryTotalsResult = this.categoryTotalService.calculateCategoryTotals(
      input.userId,
      monthStart,
      transactions,
      budgets
    );

    if (categoryTotalsResult.isFail()) {
      return Result.fail(categoryTotalsResult.error);
    }

    const categoryTotals = categoryTotalsResult.value;

    // Step 7: Persist monthly summary
    const saveSummaryResult = await this.monthlySummaryRepository.upsert(monthlySummary);
    if (saveSummaryResult.isFail()) {
      return Result.fail(saveSummaryResult.error);
    }

    // Step 8: Persist category totals (delete old, insert new)
    const deleteOldResult = await this.categoryTotalRepository.deleteByUserAndMonth(
      input.userId,
      monthStart
    );

    if (deleteOldResult.isFail()) {
      return Result.fail(deleteOldResult.error);
    }

    const saveCategoryTotalsResult = await this.categoryTotalRepository.bulkUpsert(
      categoryTotals
    );

    if (saveCategoryTotalsResult.isFail()) {
      return Result.fail(saveCategoryTotalsResult.error);
    }

    const savedCategoryTotals = saveCategoryTotalsResult.value;

    // Step 9: Publish domain event
    await this.eventBus.publish({
      type: 'DashboardAggregationsRefreshed',
      source: 'finance',
      payload: {
        monthlySummaryId: monthlySummary.id,
        categoryTotalCount: savedCategoryTotals.length,
        month: monthStart.toISOString(),
        transactionsProcessed: transactions.length,
      },
      metadata: {
        userId: input.userId,
        timestamp: new Date(),
      },
    });

    // Step 10: Return result
    return Result.ok({
      monthlySummaryId: monthlySummary.id,
      categoryTotalIds: savedCategoryTotals.map((ct) => ct.id),
      transactionsProcessed: transactions.length,
      calculatedAt: monthlySummary.calculatedAt,
    });
  }

  /**
   * Validate input data
   */
  private validateInput(
    input: RefreshDashboardAggregationsInput
  ): Result<void, BaseError> {
    if (!input.userId || input.userId.trim().length === 0) {
      return Result.fail(
        new BusinessRuleError('User ID is required', 'INVALID_USER_ID')
      );
    }

    return Result.ok(undefined);
  }
}
