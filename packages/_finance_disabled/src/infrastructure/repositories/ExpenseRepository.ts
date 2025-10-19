import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeOS/core/shared/errors';
import {
  IExpenseRepository,
  ExpenseQueryOptions,
} from '../../domain/interfaces';
import { Expense, ExpenseCategory } from '../../domain/entities';
import { ExpenseMapper } from '../mappers/ExpenseMapper';

/**
 * Expense Repository Implementation with Prisma
 *
 * Implements expense persistence using Prisma ORM.
 * All operations return Result<T, E> for functional error handling.
 */
export class ExpenseRepository implements IExpenseRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find expense by ID
   */
  async findById(id: string): Promise<Result<Expense, BaseError>> {
    try {
      const expense = await this.prisma.financeExpense.findUnique({
        where: { id },
      });

      if (!expense) {
        return Result.fail(new NotFoundError('Expense', id));
      }

      return Result.ok(ExpenseMapper.toDomain(expense));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find expense', error)
      );
    }
  }

  /**
   * Find all expenses with optional filters
   */
  async findAll(options?: ExpenseQueryOptions): Promise<Result<Expense[], BaseError>> {
    try {
      const where: any = {};

      // IMPORTANT: Filter by userId for user-specific data
      if (options?.userId) {
        where.userId = options.userId;
      }

      if (options?.category) {
        where.category = options.category;
      }

      if (options?.startDate || options?.endDate) {
        where.date = {};
        if (options.startDate) where.date.gte = options.startDate;
        if (options.endDate) where.date.lte = options.endDate;
      }

      if (options?.merchantName) {
        where.merchantName = {
          contains: options.merchantName,
          mode: 'insensitive',
        };
      }

      if (options?.tags && options.tags.length > 0) {
        where.tags = {
          hasSome: options.tags,
        };
      }

      if (options?.isRecurring !== undefined) {
        where.isRecurring = options.isRecurring;
      }

      if (options?.minAmount !== undefined || options?.maxAmount !== undefined) {
        where.amount = {};
        if (options.minAmount !== undefined) where.amount.gte = options.minAmount;
        if (options.maxAmount !== undefined) where.amount.lte = options.maxAmount;
      }

      if (options?.paymentMethod) {
        where.paymentMethod = options.paymentMethod;
      }

      const skip = options?.page && options?.limit
        ? (options.page - 1) * options.limit
        : undefined;

      const expenses = await this.prisma.financeExpense.findMany({
        where,
        orderBy: { date: 'desc' },
        take: options?.limit,
        skip,
      });

      return Result.ok(expenses.map(ExpenseMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find expenses', error)
      );
    }
  }

  /**
   * Find expenses by category
   */
  async findByCategory(category: ExpenseCategory): Promise<Result<Expense[], BaseError>> {
    return this.findAll({ category });
  }

  /**
   * Find expenses in date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<Result<Expense[], BaseError>> {
    return this.findAll({ startDate, endDate });
  }

  /**
   * Find recurring expenses
   */
  async findRecurring(): Promise<Result<Expense[], BaseError>> {
    return this.findAll({ isRecurring: true });
  }

  /**
   * Find expenses by merchant
   */
  async findByMerchant(merchantName: string): Promise<Result<Expense[], BaseError>> {
    return this.findAll({ merchantName });
  }

  /**
   * Find expenses by tag
   */
  async findByTag(tag: string): Promise<Result<Expense[], BaseError>> {
    return this.findAll({ tags: [tag] });
  }

  /**
   * Create a new expense
   */
  async create(expense: Expense, userId: string): Promise<Result<Expense, BaseError>> {
    try {
      const data = ExpenseMapper.toCreateData(expense, userId);

      const created = await this.prisma.financeExpense.create({
        data,
      });

      return Result.ok(ExpenseMapper.toDomain(created));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to create expense', error)
      );
    }
  }

  /**
   * Update an existing expense
   */
  async update(expense: Expense): Promise<Result<Expense, BaseError>> {
    try {
      const data = ExpenseMapper.toUpdateData(expense);

      const updated = await this.prisma.financeExpense.update({
        where: { id: expense.id },
        data,
      });

      return Result.ok(ExpenseMapper.toDomain(updated));
    } catch (error: any) {
      if (error.code === 'P2025') {
        return Result.fail(new NotFoundError('Expense', expense.id));
      }

      return Result.fail(
        new DatabaseError('Failed to update expense', error)
      );
    }
  }

  /**
   * Delete an expense
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.financeExpense.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return Result.fail(new NotFoundError('Expense', id));
      }

      return Result.fail(
        new DatabaseError('Failed to delete expense', error)
      );
    }
  }

  /**
   * Get total spending by category for a period
   */
  async getTotalByCategory(
    category: ExpenseCategory,
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<Result<number, BaseError>> {
    try {
      const where: any = {
        category,
        date: {
          gte: startDate,
          lte: endDate,
        },
      };

      // Filter by userId if provided
      if (userId) {
        where.userId = userId;
      }

      const result = await this.prisma.financeExpense.aggregate({
        where,
        _sum: {
          amount: true,
        },
      });

      return Result.ok(result._sum.amount || 0);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to calculate total by category', error)
      );
    }
  }

  /**
   * Get total spending for a period
   */
  async getTotalForPeriod(startDate: Date, endDate: Date, userId?: string): Promise<Result<number, BaseError>> {
    try {
      const where: any = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };

      // Filter by userId if provided
      if (userId) {
        where.userId = userId;
      }

      const result = await this.prisma.financeExpense.aggregate({
        where,
        _sum: {
          amount: true,
        },
      });

      return Result.ok(result._sum.amount || 0);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to calculate total for period', error)
      );
    }
  }

  /**
   * Count expenses matching criteria
   */
  async count(options?: ExpenseQueryOptions): Promise<Result<number, BaseError>> {
    try {
      const where: any = {};

      // Filter by userId if provided
      if (options?.userId) {
        where.userId = options.userId;
      }

      if (options?.category) {
        where.category = options.category;
      }

      if (options?.startDate || options?.endDate) {
        where.date = {};
        if (options.startDate) where.date.gte = options.startDate;
        if (options.endDate) where.date.lte = options.endDate;
      }

      if (options?.merchantName) {
        where.merchantName = {
          contains: options.merchantName,
          mode: 'insensitive',
        };
      }

      if (options?.tags && options.tags.length > 0) {
        where.tags = {
          hasSome: options.tags,
        };
      }

      if (options?.isRecurring !== undefined) {
        where.isRecurring = options.isRecurring;
      }

      if (options?.paymentMethod) {
        where.paymentMethod = options.paymentMethod;
      }

      const count = await this.prisma.financeExpense.count({ where });

      return Result.ok(count);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to count expenses', error)
      );
    }
  }
}
