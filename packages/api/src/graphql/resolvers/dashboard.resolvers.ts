import { PrismaClient } from '@prisma/client';
import { EventBus } from '@lifeOS/core/events';
import {
  GetDashboardDataUseCase,
  RefreshDashboardAggregationsUseCase,
} from '../../../../modules/finance/src/application/use-cases';
import {
  MonthlySummaryRepository,
  CategoryTotalRepository,
  BankTransactionRepository,
  BudgetRepository,
} from '../../../../modules/finance/src/infrastructure/repositories';
import {
  MonthlySummaryService,
  CategoryTotalService,
} from '../../../../modules/finance/src/application/services';
import { GraphQLError } from 'graphql';
import { MonthlySummary } from '../../../../modules/finance/src/domain/entities/MonthlySummary';
import { CategoryTotal } from '../../../../modules/finance/src/domain/entities/CategoryTotal';
import { DashboardCacheService } from '../../infrastructure/cache';

/**
 * Dashboard Resolvers Context
 */
export interface DashboardResolverContext {
  prisma: PrismaClient;
  eventBus: EventBus;
  userId?: string; // From authentication
  dashboardCache?: DashboardCacheService; // Cache service
}

/**
 * Dashboard GraphQL Resolvers
 */
export const dashboardResolvers = {
  Query: {
    /**
     * Get complete dashboard data
     */
    getDashboard: async (
      _parent: any,
      args: {
        userId: string;
        month?: string;
        includeComparison?: boolean;
        includeTrends?: boolean;
      },
      context: DashboardResolverContext
    ) => {
      const { prisma, eventBus, dashboardCache } = context;

      // Try to get from cache first
      if (dashboardCache) {
        const cached = await dashboardCache.getDashboard(args.userId, args.month);
        if (cached) {
          return cached;
        }
      }

      // Initialize dependencies
      const monthlySummaryRepository = new MonthlySummaryRepository(prisma);
      const categoryTotalRepository = new CategoryTotalRepository(prisma);
      const monthlySummaryService = new MonthlySummaryService();
      const categoryTotalService = new CategoryTotalService();

      const useCase = new GetDashboardDataUseCase(
        monthlySummaryRepository,
        categoryTotalRepository,
        monthlySummaryService,
        categoryTotalService
      );

      const result = await useCase.execute({
        userId: args.userId,
        month: args.month ? new Date(args.month) : undefined,
        includeComparison: args.includeComparison ?? false,
        includeTrends: args.includeTrends ?? false,
      });

      if (result.isFail()) {
        throw new GraphQLError(result.error.message, {
          extensions: {
            code: result.error.code,
          },
        });
      }

      // Cache the result
      if (dashboardCache) {
        await dashboardCache.setDashboard(args.userId, args.month, result.value);
      }

      return result.value;
    },

    /**
     * Get monthly summary for a specific month
     */
    getMonthlySummary: async (
      _parent: any,
      args: { userId: string; month: string },
      context: DashboardResolverContext
    ) => {
      const { prisma, dashboardCache } = context;

      // Try to get from cache first
      if (dashboardCache) {
        const cached = await dashboardCache.getMonthlySummary(args.userId, args.month);
        if (cached) {
          return cached;
        }
      }

      const monthlySummaryRepository = new MonthlySummaryRepository(prisma);

      const result = await monthlySummaryRepository.findByUserAndMonth(
        args.userId,
        new Date(args.month)
      );

      if (result.isFail()) {
        throw new GraphQLError(result.error.message);
      }

      // Cache the result
      if (dashboardCache && result.value) {
        await dashboardCache.setMonthlySummary(args.userId, args.month, result.value);
      }

      return result.value;
    },

    /**
     * Get recent monthly summaries
     */
    getRecentMonthlySummaries: async (
      _parent: any,
      args: { userId: string; limit?: number },
      context: DashboardResolverContext
    ) => {
      const { prisma } = context;
      const monthlySummaryRepository = new MonthlySummaryRepository(prisma);

      const result = await monthlySummaryRepository.findRecentByUserId(
        args.userId,
        args.limit ?? 6
      );

      if (result.isFail()) {
        throw new GraphQLError(result.error.message);
      }

      return result.value;
    },

    /**
     * Get category totals for a specific month
     */
    getCategoryTotals: async (
      _parent: any,
      args: { userId: string; month: string },
      context: DashboardResolverContext
    ) => {
      const { prisma, dashboardCache } = context;

      // Try to get from cache first
      if (dashboardCache) {
        const cached = await dashboardCache.getCategoryTotals(args.userId, args.month);
        if (cached) {
          return cached;
        }
      }

      const categoryTotalRepository = new CategoryTotalRepository(prisma);

      const result = await categoryTotalRepository.findByUserAndMonth(
        args.userId,
        new Date(args.month)
      );

      if (result.isFail()) {
        throw new GraphQLError(result.error.message);
      }

      // Cache the result
      if (dashboardCache && result.value) {
        await dashboardCache.setCategoryTotals(args.userId, args.month, result.value);
      }

      return result.value;
    },

    /**
     * Get spending distribution
     */
    getSpendingDistribution: async (
      _parent: any,
      args: { userId: string; month: string },
      context: DashboardResolverContext
    ) => {
      const { prisma, dashboardCache } = context;

      // Try to get from cache first
      if (dashboardCache) {
        const cached = await dashboardCache.getSpendingDistribution(
          args.userId,
          args.month
        );
        if (cached) {
          return cached;
        }
      }

      const categoryTotalRepository = new CategoryTotalRepository(prisma);
      const categoryTotalService = new CategoryTotalService();

      const result = await categoryTotalRepository.findByUserAndMonth(
        args.userId,
        new Date(args.month)
      );

      if (result.isFail()) {
        throw new GraphQLError(result.error.message);
      }

      const distribution = categoryTotalService.getSpendingDistribution(result.value);

      // Cache the result
      if (dashboardCache) {
        await dashboardCache.setSpendingDistribution(
          args.userId,
          args.month,
          distribution
        );
      }

      return distribution;
    },

    /**
     * Get category trend
     */
    getCategoryTrend: async (
      _parent: any,
      args: {
        userId: string;
        category: string;
        startDate: string;
        endDate: string;
      },
      context: DashboardResolverContext
    ) => {
      const { prisma } = context;
      const categoryTotalRepository = new CategoryTotalRepository(prisma);
      const categoryTotalService = new CategoryTotalService();

      const result = await categoryTotalRepository.findByUserIdAndDateRange(
        args.userId,
        new Date(args.startDate),
        new Date(args.endDate)
      );

      if (result.isFail()) {
        throw new GraphQLError(result.error.message);
      }

      return categoryTotalService.calculateCategoryTrend(
        args.category as any,
        result.value
      );
    },

    /**
     * Get over-budget categories
     */
    getOverBudgetCategories: async (
      _parent: any,
      args: { userId: string; month: string },
      context: DashboardResolverContext
    ) => {
      const { prisma } = context;
      const categoryTotalRepository = new CategoryTotalRepository(prisma);

      const result = await categoryTotalRepository.findOverBudget(
        args.userId,
        new Date(args.month)
      );

      if (result.isFail()) {
        throw new GraphQLError(result.error.message);
      }

      return result.value;
    },
  },

  Mutation: {
    /**
     * Manually refresh dashboard aggregations
     */
    refreshDashboard: async (
      _parent: any,
      args: {
        userId: string;
        month?: string;
        forceRecalculation?: boolean;
      },
      context: DashboardResolverContext
    ) => {
      const { prisma, eventBus, dashboardCache } = context;

      // Initialize dependencies
      const transactionRepository = new BankTransactionRepository(prisma);
      const budgetRepository = new BudgetRepository(prisma);
      const monthlySummaryRepository = new MonthlySummaryRepository(prisma);
      const categoryTotalRepository = new CategoryTotalRepository(prisma);
      const monthlySummaryService = new MonthlySummaryService();
      const categoryTotalService = new CategoryTotalService();

      const useCase = new RefreshDashboardAggregationsUseCase(
        transactionRepository,
        budgetRepository,
        monthlySummaryRepository,
        categoryTotalRepository,
        monthlySummaryService,
        categoryTotalService,
        eventBus
      );

      const result = await useCase.execute({
        userId: args.userId,
        month: args.month ? new Date(args.month) : undefined,
        forceRecalculation: args.forceRecalculation ?? false,
      });

      if (result.isFail()) {
        throw new GraphQLError(result.error.message);
      }

      // Invalidate cache after refresh
      if (dashboardCache) {
        await dashboardCache.invalidateDashboardCache(args.userId);
      }

      return {
        success: true,
        ...result.value,
      };
    },
  },

  // Field resolvers for MonthlySummary
  MonthlySummary: {
    month: (parent: MonthlySummary) => parent.month.toISOString(),
    savingsRate: (parent: MonthlySummary) => parent.getSavingsRate(),
    expenseRatio: (parent: MonthlySummary) => parent.getExpenseRatio(),
    calculatedAt: (parent: MonthlySummary) => parent.calculatedAt.toISOString(),
    createdAt: (parent: MonthlySummary) => parent.createdAt.toISOString(),
    updatedAt: (parent: MonthlySummary) => parent.updatedAt.toISOString(),
  },

  // Field resolvers for CategoryTotal
  CategoryTotal: {
    month: (parent: CategoryTotal) => parent.month.toISOString(),
    remainingBudget: (parent: CategoryTotal) => parent.getRemainingBudget(),
    isOverBudget: (parent: CategoryTotal) => parent.isOverBudget(),
    isApproachingBudgetLimit: (parent: CategoryTotal) =>
      parent.isApproachingBudgetLimit(),
    calculatedAt: (parent: CategoryTotal) => parent.calculatedAt.toISOString(),
  },

  // JSON scalar resolver
  JSON: {
    serialize: (value: any) => value,
    parseValue: (value: any) => value,
    parseLiteral: (ast: any) => {
      if (ast.kind === 'ObjectValue' || ast.kind === 'ListValue') {
        return ast;
      }
      return null;
    },
  },
};
