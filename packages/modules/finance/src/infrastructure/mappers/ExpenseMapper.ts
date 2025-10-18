import { FinanceExpense as PrismaExpense } from '@prisma/client';
import { Expense, ExpenseCategory, PaymentMethod } from '../../domain/entities';

/**
 * Expense Mapper
 *
 * Maps between Prisma FinanceExpense model and domain Expense entity.
 * Handles type conversions and data transformations.
 */
export class ExpenseMapper {
  /**
   * Convert Prisma model to domain entity
   */
  public static toDomain(prisma: PrismaExpense): Expense {
    return Expense.reconstitute({
      id: prisma.id,
      description: prisma.description,
      amount: prisma.amount,
      category: prisma.category as ExpenseCategory,
      date: prisma.date,
      paymentMethod: prisma.paymentMethod as PaymentMethod,
      isRecurring: prisma.isRecurring,
      recurrenceIntervalDays: prisma.recurrenceIntervalDays || undefined,
      merchantName: prisma.merchantName || undefined,
      notes: prisma.notes || undefined,
      tags: prisma.tags,
      receiptUrl: prisma.receiptUrl || undefined,
      metadata: (prisma.metadata as Record<string, unknown>) || undefined,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    });
  }

  /**
   * Convert domain entity to Prisma model data
   */
  public static toPrisma(expense: Expense): Omit<PrismaExpense, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      paymentMethod: expense.paymentMethod,
      isRecurring: expense.isRecurring,
      recurrenceIntervalDays: expense.recurrenceIntervalDays || null,
      merchantName: expense.merchantName || null,
      notes: expense.notes || null,
      tags: expense.tags,
      receiptUrl: expense.receiptUrl || null,
      metadata: (expense.metadata as any) || {},
    };
  }

  /**
   * Convert domain entity to Prisma create data
   */
  public static toCreateData(expense: Expense, userId: string) {
    return {
      id: expense.id,
      userId, // Add userId from auth context
      ...this.toPrisma(expense),
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  }

  /**
   * Convert domain entity to Prisma update data
   */
  public static toUpdateData(expense: Expense) {
    return {
      ...this.toPrisma(expense),
      updatedAt: expense.updatedAt,
    };
  }
}
