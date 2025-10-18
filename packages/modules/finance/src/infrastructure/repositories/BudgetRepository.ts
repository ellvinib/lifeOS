import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeOS/core/shared/errors';
import {
  IBudgetRepository,
  BudgetQueryOptions,
} from '../../domain/interfaces';
import { Budget } from '../../domain/entities';
import { BudgetMapper } from '../mappers/BudgetMapper';

/**
 * Budget Repository Implementation with Prisma
 *
 * Implements budget persistence using Prisma ORM.
 * Handles nested categories with proper transaction management.
 */
export class BudgetRepository implements IBudgetRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find budget by ID
   */
  async findById(id: string): Promise<Result<Budget, BaseError>> {
    try {
      const budget = await this.prisma.financeBudget.findUnique({
        where: { id },
        include: {
          categories: true,
        },
      });

      if (!budget) {
        return Result.fail(new NotFoundError('Budget', id));
      }

      return Result.ok(BudgetMapper.toDomain(budget));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find budget', error)
      );
    }
  }

  /**
   * Find all budgets with optional filters
   */
  async findAll(options?: BudgetQueryOptions): Promise<Result<Budget[], BaseError>> {
    try {
      const where: any = {};

      // IMPORTANT: Filter by userId for user-specific data
      if (options?.userId) {
        where.userId = options.userId;
      }

      if (options?.year) {
        where.month = {
          startsWith: `${options.year}-`,
        };
      }

      const skip = options?.page && options?.limit
        ? (options.page - 1) * options.limit
        : undefined;

      const budgets = await this.prisma.financeBudget.findMany({
        where,
        include: {
          categories: true,
        },
        orderBy: { month: 'desc' },
        take: options?.limit,
        skip,
      });

      return Result.ok(budgets.map(BudgetMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find budgets', error)
      );
    }
  }

  /**
   * Find budget by month (YYYY-MM format)
   */
  async findByMonth(month: string, userId?: string): Promise<Result<Budget | null, BaseError>> {
    try {
      let budget;

      if (userId) {
        // Use compound unique key (userId + month)
        budget = await this.prisma.financeBudget.findUnique({
          where: {
            userId_month: {
              userId,
              month
            }
          },
          include: {
            categories: true,
          },
        });
      } else {
        // Fallback to month-only query (for backward compatibility)
        budget = await this.prisma.financeBudget.findFirst({
          where: { month },
          include: {
            categories: true,
          },
        });
      }

      if (!budget) {
        return Result.ok(null);
      }

      return Result.ok(BudgetMapper.toDomain(budget));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find budget by month', error)
      );
    }
  }

  /**
   * Find budgets for a specific year
   */
  async findByYear(year: number): Promise<Result<Budget[], BaseError>> {
    return this.findAll({ year });
  }

  /**
   * Get current month's budget
   */
  async getCurrentMonth(userId?: string): Promise<Result<Budget | null, BaseError>> {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return this.findByMonth(month, userId);
  }

  /**
   * Get previous month's budget
   */
  async getPreviousMonth(userId?: string): Promise<Result<Budget | null, BaseError>> {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
    return this.findByMonth(month, userId);
  }

  /**
   * Create a new budget
   */
  async create(budget: Budget, userId: string): Promise<Result<Budget, BaseError>> {
    try {
      const data = BudgetMapper.toCreateData(budget, userId);

      const created = await this.prisma.financeBudget.create({
        data,
        include: {
          categories: true,
        },
      });

      return Result.ok(BudgetMapper.toDomain(created));
    } catch (error: any) {
      if (error.code === 'P2002') {
        return Result.fail(
          new DatabaseError(`Budget for month ${budget.month} already exists`, error)
        );
      }

      return Result.fail(
        new DatabaseError('Failed to create budget', error)
      );
    }
  }

  /**
   * Update an existing budget
   */
  async update(budget: Budget): Promise<Result<Budget, BaseError>> {
    try {
      const data = BudgetMapper.toUpdateData(budget);
      const categoryData = BudgetMapper.getCategoryData(budget.getAllCategories());

      // Use transaction to update budget and categories atomically
      const updated = await this.prisma.$transaction(async (tx) => {
        // Update main budget
        const updatedBudget = await tx.financeBudget.update({
          where: { id: budget.id },
          data,
        });

        // Delete all existing categories
        await tx.financeBudgetCategory.deleteMany({
          where: { budgetId: budget.id },
        });

        // Create new categories
        await tx.financeBudgetCategory.createMany({
          data: categoryData.map(cat => ({
            ...cat,
            budgetId: budget.id,
          })),
        });

        // Fetch complete budget with categories
        return await tx.financeBudget.findUnique({
          where: { id: budget.id },
          include: {
            categories: true,
          },
        });
      });

      if (!updated) {
        return Result.fail(new NotFoundError('Budget', budget.id));
      }

      return Result.ok(BudgetMapper.toDomain(updated));
    } catch (error: any) {
      if (error.code === 'P2025') {
        return Result.fail(new NotFoundError('Budget', budget.id));
      }

      return Result.fail(
        new DatabaseError('Failed to update budget', error)
      );
    }
  }

  /**
   * Delete a budget
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      // Categories will be deleted automatically due to cascade
      await this.prisma.financeBudget.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return Result.fail(new NotFoundError('Budget', id));
      }

      return Result.fail(
        new DatabaseError('Failed to delete budget', error)
      );
    }
  }

  /**
   * Check if budget exists for month
   */
  async existsForMonth(month: string, userId?: string): Promise<Result<boolean, BaseError>> {
    try {
      const where: any = { month };

      // Filter by userId if provided
      if (userId) {
        where.userId = userId;
      }

      const count = await this.prisma.financeBudget.count({
        where,
      });

      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to check budget existence', error)
      );
    }
  }

  /**
   * Count budgets matching criteria
   */
  async count(options?: BudgetQueryOptions): Promise<Result<number, BaseError>> {
    try {
      const where: any = {};

      // Filter by userId if provided
      if (options?.userId) {
        where.userId = options.userId;
      }

      if (options?.year) {
        where.month = {
          startsWith: `${options.year}-`,
        };
      }

      const count = await this.prisma.financeBudget.count({ where });

      return Result.ok(count);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to count budgets', error)
      );
    }
  }
}
