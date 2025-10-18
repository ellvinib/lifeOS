import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeOS/core/shared/errors';
import { ICategoryTotalRepository } from '../../domain/interfaces/ICategoryTotalRepository';
import { CategoryTotal } from '../../domain/entities/CategoryTotal';
import { ExpenseCategory } from '../../domain/entities/Expense';
import { CategoryTotalMapper } from '../mappers/CategoryTotalMapper';

/**
 * Category Total Repository Implementation
 *
 * Implements ICategoryTotalRepository using Prisma ORM.
 */
export class CategoryTotalRepository implements ICategoryTotalRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find category total by ID
   */
  async findById(id: string): Promise<Result<CategoryTotal, BaseError>> {
    try {
      const categoryTotal = await this.prisma.categoryTotal.findUnique({
        where: { id },
      });

      if (!categoryTotal) {
        return Result.fail(new NotFoundError('CategoryTotal', id));
      }

      return Result.ok(CategoryTotalMapper.toDomain(categoryTotal));
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to find category total by ID', error)
      );
    }
  }

  /**
   * Find category total for specific user, month, and category
   */
  async findByUserMonthAndCategory(
    userId: string,
    month: Date,
    category: ExpenseCategory
  ): Promise<Result<CategoryTotal | null, BaseError>> {
    try {
      const categoryTotal = await this.prisma.categoryTotal.findUnique({
        where: {
          userId_month_category: {
            userId,
            month,
            category,
          },
        },
      });

      if (!categoryTotal) {
        return Result.ok(null);
      }

      return Result.ok(CategoryTotalMapper.toDomain(categoryTotal));
    } catch (error: any) {
      return Result.fail(
        new DatabaseError(
          'Failed to find category total by user, month, and category',
          error
        )
      );
    }
  }

  /**
   * Find all category totals for a user and month
   */
  async findByUserAndMonth(
    userId: string,
    month: Date
  ): Promise<Result<CategoryTotal[], BaseError>> {
    try {
      const categoryTotals = await this.prisma.categoryTotal.findMany({
        where: {
          userId,
          month,
        },
        orderBy: { totalAmount: 'desc' },
      });

      return Result.ok(categoryTotals.map(CategoryTotalMapper.toDomain));
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to find category totals by user and month', error)
      );
    }
  }

  /**
   * Find all category totals for a user
   */
  async findByUserId(userId: string): Promise<Result<CategoryTotal[], BaseError>> {
    try {
      const categoryTotals = await this.prisma.categoryTotal.findMany({
        where: { userId },
        orderBy: [{ month: 'desc' }, { totalAmount: 'desc' }],
      });

      return Result.ok(categoryTotals.map(CategoryTotalMapper.toDomain));
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to find category totals by user ID', error)
      );
    }
  }

  /**
   * Find category totals within date range
   */
  async findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<CategoryTotal[], BaseError>> {
    try {
      const categoryTotals = await this.prisma.categoryTotal.findMany({
        where: {
          userId,
          month: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: [{ month: 'asc' }, { totalAmount: 'desc' }],
      });

      return Result.ok(categoryTotals.map(CategoryTotalMapper.toDomain));
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to find category totals by date range', error)
      );
    }
  }

  /**
   * Find totals for a specific category across months
   */
  async findByCategoryAndDateRange(
    userId: string,
    category: ExpenseCategory,
    startDate: Date,
    endDate: Date
  ): Promise<Result<CategoryTotal[], BaseError>> {
    try {
      const categoryTotals = await this.prisma.categoryTotal.findMany({
        where: {
          userId,
          category,
          month: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { month: 'asc' },
      });

      return Result.ok(categoryTotals.map(CategoryTotalMapper.toDomain));
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to find category totals by category and date range', error)
      );
    }
  }

  /**
   * Find over-budget categories for a user and month
   */
  async findOverBudget(
    userId: string,
    month: Date
  ): Promise<Result<CategoryTotal[], BaseError>> {
    try {
      const categoryTotals = await this.prisma.categoryTotal.findMany({
        where: {
          userId,
          month,
          budgetAmount: { not: null },
          // Note: Prisma doesn't support comparing fields directly in where clause
          // We'll filter in-memory
        },
        orderBy: { totalAmount: 'desc' },
      });

      // Filter over-budget in memory
      const overBudget = categoryTotals
        .map(CategoryTotalMapper.toDomain)
        .filter((ct) => ct.isOverBudget());

      return Result.ok(overBudget);
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to find over-budget category totals', error)
      );
    }
  }

  /**
   * Find top N categories by spending for a user and month
   */
  async findTopCategories(
    userId: string,
    month: Date,
    limit: number
  ): Promise<Result<CategoryTotal[], BaseError>> {
    try {
      const categoryTotals = await this.prisma.categoryTotal.findMany({
        where: {
          userId,
          month,
        },
        orderBy: { totalAmount: 'desc' },
        take: limit,
      });

      return Result.ok(categoryTotals.map(CategoryTotalMapper.toDomain));
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to find top category totals', error)
      );
    }
  }

  /**
   * Find stale category totals (need recalculation)
   */
  async findStale(maxAgeHours: number): Promise<Result<CategoryTotal[], BaseError>> {
    try {
      const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

      const categoryTotals = await this.prisma.categoryTotal.findMany({
        where: {
          calculatedAt: {
            lt: cutoffDate,
          },
        },
        orderBy: { calculatedAt: 'asc' },
      });

      return Result.ok(categoryTotals.map(CategoryTotalMapper.toDomain));
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to find stale category totals', error)
      );
    }
  }

  /**
   * Create new category total
   */
  async create(categoryTotal: CategoryTotal): Promise<Result<CategoryTotal, BaseError>> {
    try {
      const data = CategoryTotalMapper.toCreateData(categoryTotal);

      const created = await this.prisma.categoryTotal.create({
        data,
      });

      return Result.ok(CategoryTotalMapper.toDomain(created));
    } catch (error: any) {
      return Result.fail(new DatabaseError('Failed to create category total', error));
    }
  }

  /**
   * Update existing category total
   */
  async update(categoryTotal: CategoryTotal): Promise<Result<CategoryTotal, BaseError>> {
    try {
      const data = CategoryTotalMapper.toUpdateData(categoryTotal);

      const updated = await this.prisma.categoryTotal.update({
        where: { id: categoryTotal.id },
        data,
      });

      return Result.ok(CategoryTotalMapper.toDomain(updated));
    } catch (error: any) {
      return Result.fail(new DatabaseError('Failed to update category total', error));
    }
  }

  /**
   * Upsert (create or update) category total
   */
  async upsert(categoryTotal: CategoryTotal): Promise<Result<CategoryTotal, BaseError>> {
    try {
      const createData = CategoryTotalMapper.toCreateData(categoryTotal);
      const updateData = CategoryTotalMapper.toUpdateData(categoryTotal);

      const upserted = await this.prisma.categoryTotal.upsert({
        where: {
          userId_month_category: {
            userId: categoryTotal.userId,
            month: categoryTotal.month,
            category: categoryTotal.category,
          },
        },
        create: createData,
        update: updateData,
      });

      return Result.ok(CategoryTotalMapper.toDomain(upserted));
    } catch (error: any) {
      return Result.fail(new DatabaseError('Failed to upsert category total', error));
    }
  }

  /**
   * Bulk upsert category totals
   */
  async bulkUpsert(
    categoryTotals: CategoryTotal[]
  ): Promise<Result<CategoryTotal[], BaseError>> {
    try {
      // Prisma doesn't have native bulk upsert, so we'll do it with a transaction
      const upserted = await this.prisma.$transaction(
        categoryTotals.map((ct) => {
          const createData = CategoryTotalMapper.toCreateData(ct);
          const updateData = CategoryTotalMapper.toUpdateData(ct);

          return this.prisma.categoryTotal.upsert({
            where: {
              userId_month_category: {
                userId: ct.userId,
                month: ct.month,
                category: ct.category,
              },
            },
            create: createData,
            update: updateData,
          });
        })
      );

      return Result.ok(upserted.map(CategoryTotalMapper.toDomain));
    } catch (error: any) {
      return Result.fail(new DatabaseError('Failed to bulk upsert category totals', error));
    }
  }

  /**
   * Delete category total by ID
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.categoryTotal.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error: any) {
      return Result.fail(new DatabaseError('Failed to delete category total', error));
    }
  }

  /**
   * Delete all category totals for a user and month
   */
  async deleteByUserAndMonth(
    userId: string,
    month: Date
  ): Promise<Result<number, BaseError>> {
    try {
      const result = await this.prisma.categoryTotal.deleteMany({
        where: {
          userId,
          month,
        },
      });

      return Result.ok(result.count);
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to delete category totals by user and month', error)
      );
    }
  }

  /**
   * Delete all category totals for a user
   */
  async deleteByUserId(userId: string): Promise<Result<number, BaseError>> {
    try {
      const result = await this.prisma.categoryTotal.deleteMany({
        where: { userId },
      });

      return Result.ok(result.count);
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to delete category totals by user ID', error)
      );
    }
  }
}
