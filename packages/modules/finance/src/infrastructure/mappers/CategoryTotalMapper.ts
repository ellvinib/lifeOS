import { CategoryTotal } from '../../domain/entities/CategoryTotal';
import { ExpenseCategory } from '../../domain/entities/Expense';
import { Prisma } from '@prisma/client';

type PrismaCategoryTotal = {
  id: string;
  userId: string;
  month: Date;
  category: string;
  totalAmount: number;
  transactionCount: number;
  averageAmount: number;
  percentOfTotal: number;
  largestTransaction: number;
  budgetAmount: number | null;
  budgetUsedPercent: number | null;
  calculatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Category Total Mapper
 *
 * Maps between Prisma model and Domain entity.
 */
export class CategoryTotalMapper {
  /**
   * Map from Prisma model to Domain entity
   */
  public static toDomain(prisma: PrismaCategoryTotal): CategoryTotal {
    return CategoryTotal.reconstitute(
      prisma.id,
      prisma.userId,
      prisma.month,
      prisma.category as ExpenseCategory,
      prisma.totalAmount,
      prisma.transactionCount,
      prisma.averageAmount,
      prisma.percentOfTotal,
      prisma.largestTransaction,
      prisma.budgetAmount,
      prisma.budgetUsedPercent,
      prisma.calculatedAt,
      prisma.createdAt,
      prisma.updatedAt
    );
  }

  /**
   * Map from Domain entity to Prisma create data
   */
  public static toCreateData(entity: CategoryTotal): Prisma.CategoryTotalCreateInput {
    return {
      id: entity.id,
      user: {
        connect: { id: entity.userId },
      },
      month: entity.month,
      category: entity.category,
      totalAmount: entity.totalAmount,
      transactionCount: entity.transactionCount,
      averageAmount: entity.averageAmount,
      percentOfTotal: entity.percentOfTotal,
      largestTransaction: entity.largestTransaction,
      budgetAmount: entity.budgetAmount,
      budgetUsedPercent: entity.budgetUsedPercent,
      calculatedAt: entity.calculatedAt,
    };
  }

  /**
   * Map from Domain entity to Prisma update data
   */
  public static toUpdateData(entity: CategoryTotal): Prisma.CategoryTotalUpdateInput {
    return {
      month: entity.month,
      category: entity.category,
      totalAmount: entity.totalAmount,
      transactionCount: entity.transactionCount,
      averageAmount: entity.averageAmount,
      percentOfTotal: entity.percentOfTotal,
      largestTransaction: entity.largestTransaction,
      budgetAmount: entity.budgetAmount,
      budgetUsedPercent: entity.budgetUsedPercent,
      calculatedAt: entity.calculatedAt,
    };
  }
}
