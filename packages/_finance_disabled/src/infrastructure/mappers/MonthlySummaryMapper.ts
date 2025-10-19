import { MonthlySummary } from '../../domain/entities/MonthlySummary';
import { Prisma } from '@prisma/client';

type PrismaMonthlySummary = {
  id: string;
  userId: string;
  month: Date;
  totalIncome: number;
  totalExpenses: number;
  netCashFlow: number;
  transactionCount: number;
  averageTransactionSize: number;
  largestExpense: number;
  largestIncome: number;
  categoryCounts: Prisma.JsonValue;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Monthly Summary Mapper
 *
 * Maps between Prisma model and Domain entity.
 */
export class MonthlySummaryMapper {
  /**
   * Map from Prisma model to Domain entity
   */
  public static toDomain(prisma: PrismaMonthlySummary): MonthlySummary {
    const categoryCounts = this.parseCategoryCounts(prisma.categoryCounts);

    return MonthlySummary.reconstitute(
      prisma.id,
      prisma.userId,
      prisma.month,
      prisma.totalIncome,
      prisma.totalExpenses,
      prisma.netCashFlow,
      prisma.transactionCount,
      prisma.averageTransactionSize,
      prisma.largestExpense,
      prisma.largestIncome,
      categoryCounts,
      prisma.calculatedAt,
      prisma.createdAt,
      prisma.updatedAt
    );
  }

  /**
   * Map from Domain entity to Prisma create data
   */
  public static toCreateData(
    entity: MonthlySummary
  ): Prisma.MonthlySummaryCreateInput {
    return {
      id: entity.id,
      user: {
        connect: { id: entity.userId },
      },
      month: entity.month,
      totalIncome: entity.totalIncome,
      totalExpenses: entity.totalExpenses,
      netCashFlow: entity.netCashFlow,
      transactionCount: entity.transactionCount,
      averageTransactionSize: entity.averageTransactionSize,
      largestExpense: entity.largestExpense,
      largestIncome: entity.largestIncome,
      categoryCounts: entity.categoryCounts as Prisma.InputJsonValue,
      calculatedAt: entity.calculatedAt,
    };
  }

  /**
   * Map from Domain entity to Prisma update data
   */
  public static toUpdateData(
    entity: MonthlySummary
  ): Prisma.MonthlySummaryUpdateInput {
    return {
      month: entity.month,
      totalIncome: entity.totalIncome,
      totalExpenses: entity.totalExpenses,
      netCashFlow: entity.netCashFlow,
      transactionCount: entity.transactionCount,
      averageTransactionSize: entity.averageTransactionSize,
      largestExpense: entity.largestExpense,
      largestIncome: entity.largestIncome,
      categoryCounts: entity.categoryCounts as Prisma.InputJsonValue,
      calculatedAt: entity.calculatedAt,
    };
  }

  /**
   * Parse category counts from Prisma JSON
   */
  private static parseCategoryCounts(json: Prisma.JsonValue): Record<string, number> {
    if (typeof json === 'object' && json !== null && !Array.isArray(json)) {
      return json as Record<string, number>;
    }
    return {};
  }
}
