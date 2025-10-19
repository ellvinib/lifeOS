import { FinanceBudget as PrismaBudget, FinanceBudgetCategory as PrismaBudgetCategory } from '@prisma/client';
import { Budget, BudgetCategory, ExpenseCategory } from '../../domain/entities';

type PrismaBudgetWithCategories = PrismaBudget & {
  categories: PrismaBudgetCategory[];
};

/**
 * Budget Mapper
 *
 * Maps between Prisma FinanceBudget model and domain Budget entity.
 * Handles nested categories and data transformations.
 */
export class BudgetMapper {
  /**
   * Convert Prisma model to domain entity
   */
  public static toDomain(prisma: PrismaBudgetWithCategories): Budget {
    const categories: BudgetCategory[] = prisma.categories.map(cat => ({
      category: cat.category as ExpenseCategory,
      plannedAmount: cat.plannedAmount,
      spentAmount: cat.spentAmount,
    }));

    return Budget.reconstitute({
      id: prisma.id,
      name: prisma.name,
      month: prisma.month,
      totalIncome: prisma.totalIncome,
      categories,
      savingsGoal: prisma.savingsGoal || undefined,
      metadata: (prisma.metadata as Record<string, unknown>) || undefined,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    });
  }

  /**
   * Convert domain entity to Prisma model data (without categories)
   */
  public static toPrisma(budget: Budget): Omit<PrismaBudget, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: budget.name,
      month: budget.month,
      totalIncome: budget.totalIncome,
      savingsGoal: budget.savingsGoal || null,
      metadata: (budget.metadata as any) || {},
    };
  }

  /**
   * Convert domain entity to Prisma create data with nested categories
   */
  public static toCreateData(budget: Budget, userId: string) {
    const categories = budget.getAllCategories().map(cat => ({
      category: cat.category,
      plannedAmount: cat.plannedAmount,
      spentAmount: cat.spentAmount,
    }));

    return {
      id: budget.id,
      userId, // Add userId from auth context
      ...this.toPrisma(budget),
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
      categories: {
        create: categories,
      },
    };
  }

  /**
   * Convert domain entity to Prisma update data
   * Categories are handled separately
   */
  public static toUpdateData(budget: Budget) {
    return {
      ...this.toPrisma(budget),
      updatedAt: budget.updatedAt,
    };
  }

  /**
   * Get category create/update data
   */
  public static getCategoryData(categories: BudgetCategory[]) {
    return categories.map(cat => ({
      category: cat.category,
      plannedAmount: cat.plannedAmount,
      spentAmount: cat.spentAmount,
    }));
  }
}
