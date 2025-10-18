import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { EventBus } from '@lifeOS/core/events';
import {
  BankTransactionRepository,
  BudgetRepository,
  MonthlySummaryRepository,
  CategoryTotalRepository,
} from '../../../../../modules/finance/src/infrastructure/repositories';
import {
  MonthlySummaryService,
  CategoryTotalService,
} from '../../../../../modules/finance/src/application/services';
import { RefreshDashboardAggregationsUseCase } from '../../../../../modules/finance/src/application/use-cases';

/**
 * Refresh Aggregations Job Data
 */
export interface RefreshAggregationsJobData {
  userId: string;
  month?: string; // ISO date string
  forceRecalculation?: boolean;
}

/**
 * Refresh Aggregations Job Processor
 *
 * Processes background jobs for refreshing dashboard aggregations.
 * Runs nightly at 2 AM or triggered manually.
 */
export class RefreshAggregationsProcessor {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly eventBus: EventBus
  ) {}

  /**
   * Process refresh aggregations job
   */
  async process(job: Job<RefreshAggregationsJobData>): Promise<void> {
    const { userId, month, forceRecalculation } = job.data;

    console.log(`[RefreshAggregations] Processing job for user ${userId}`);

    try {
      // Initialize dependencies
      const transactionRepository = new BankTransactionRepository(this.prisma);
      const budgetRepository = new BudgetRepository(this.prisma);
      const monthlySummaryRepository = new MonthlySummaryRepository(this.prisma);
      const categoryTotalRepository = new CategoryTotalRepository(this.prisma);

      const monthlySummaryService = new MonthlySummaryService();
      const categoryTotalService = new CategoryTotalService();

      const useCase = new RefreshDashboardAggregationsUseCase(
        transactionRepository,
        budgetRepository,
        monthlySummaryRepository,
        categoryTotalRepository,
        monthlySummaryService,
        categoryTotalService,
        this.eventBus
      );

      // Execute use case
      const targetMonth = month ? new Date(month) : undefined;

      const result = await useCase.execute({
        userId,
        month: targetMonth,
        forceRecalculation: forceRecalculation ?? false,
      });

      if (result.isFail()) {
        throw new Error(`Failed to refresh aggregations: ${result.error.message}`);
      }

      console.log(
        `[RefreshAggregations] Successfully processed ${result.value.transactionsProcessed} transactions`
      );

      // Update job progress
      await job.updateProgress(100);
    } catch (error: any) {
      console.error(`[RefreshAggregations] Error processing job:`, error);
      throw error; // Re-throw to mark job as failed
    }
  }

  /**
   * Refresh aggregations for all active users
   */
  async processAllUsers(job: Job): Promise<void> {
    console.log('[RefreshAggregations] Processing aggregations for all users');

    try {
      // Get all users with transactions
      const users = await this.prisma.user.findMany({
        where: {
          bankTransactions: {
            some: {},
          },
        },
        select: {
          id: true,
        },
      });

      console.log(`[RefreshAggregations] Found ${users.length} users to process`);

      // Process each user
      let processed = 0;
      for (const user of users) {
        try {
          await this.process({
            data: {
              userId: user.id,
              forceRecalculation: false,
            },
          } as Job<RefreshAggregationsJobData>);

          processed++;
          await job.updateProgress((processed / users.length) * 100);
        } catch (error: any) {
          console.error(
            `[RefreshAggregations] Failed to process user ${user.id}:`,
            error
          );
          // Continue with other users
        }
      }

      console.log(
        `[RefreshAggregations] Completed. Processed ${processed}/${users.length} users`
      );
    } catch (error: any) {
      console.error('[RefreshAggregations] Error processing all users:', error);
      throw error;
    }
  }
}
