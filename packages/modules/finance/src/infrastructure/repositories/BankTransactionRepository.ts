/**
 * BankTransactionRepository
 *
 * Prisma implementation of IBankTransactionRepository.
 * Manages bank transaction persistence and reconciliation.
 */

import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeOS/core/shared/errors';
import { IBankTransactionRepository } from '../../domain/interfaces/IBankTransactionRepository';
import { BankTransaction } from '../../domain/entities/BankTransaction';
import { ReconciliationStatus } from '../../domain/value-objects/BankEnums';
import { BankTransactionMapper } from '../mappers/BankTransactionMapper';

/**
 * Bank Transaction Repository Implementation with Prisma
 *
 * All operations return Result<T, E> for functional error handling.
 */
export class BankTransactionRepository implements IBankTransactionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find transaction by ID
   */
  async findById(id: string): Promise<Result<BankTransaction, BaseError>> {
    try {
      const transaction = await this.prisma.bankTransaction.findUnique({
        where: { id },
      });

      if (!transaction) {
        return Result.fail(new NotFoundError('BankTransaction', id));
      }

      return Result.ok(BankTransactionMapper.toDomain(transaction));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find bank transaction', error)
      );
    }
  }

  /**
   * Find transaction by external ID (Ibanity ID)
   */
  async findByExternalId(
    bankAccountId: string,
    externalId: string
  ): Promise<Result<BankTransaction | null, BaseError>> {
    try {
      const transaction = await this.prisma.bankTransaction.findUnique({
        where: {
          bankAccountId_externalId: {
            bankAccountId,
            externalId,
          },
        },
      });

      if (!transaction) {
        return Result.ok(null);
      }

      return Result.ok(BankTransactionMapper.toDomain(transaction));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find bank transaction by external ID', error)
      );
    }
  }

  /**
   * Find all transactions for a bank account
   */
  async findByBankAccountId(
    bankAccountId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<Result<BankTransaction[], BaseError>> {
    try {
      const where: any = { bankAccountId };

      if (options?.startDate || options?.endDate) {
        where.executionDate = {};
        if (options.startDate) where.executionDate.gte = options.startDate;
        if (options.endDate) where.executionDate.lte = options.endDate;
      }

      const transactions = await this.prisma.bankTransaction.findMany({
        where,
        orderBy: { executionDate: 'desc' },
        take: options?.limit,
      });

      return Result.ok(transactions.map(BankTransactionMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find bank transactions by account', error)
      );
    }
  }

  /**
   * Find all transactions for a user (across all accounts)
   */
  async findByUserId(
    userId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    }
  ): Promise<Result<BankTransaction[], BaseError>> {
    try {
      const where: any = {
        bankAccount: {
          connection: {
            userId,
          },
        },
      };

      if (options?.startDate || options?.endDate) {
        where.executionDate = {};
        if (options.startDate) where.executionDate.gte = options.startDate;
        if (options.endDate) where.executionDate.lte = options.endDate;
      }

      const transactions = await this.prisma.bankTransaction.findMany({
        where,
        orderBy: { executionDate: 'desc' },
        take: options?.limit,
      });

      return Result.ok(transactions.map(BankTransactionMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find bank transactions by user', error)
      );
    }
  }

  /**
   * Find unreconciled transactions for a user
   */
  async findUnreconciled(userId: string): Promise<Result<BankTransaction[], BaseError>> {
    try {
      const transactions = await this.prisma.bankTransaction.findMany({
        where: {
          bankAccount: {
            connection: {
              userId,
            },
          },
          reconciliationStatus: ReconciliationStatus.PENDING,
        },
        orderBy: { executionDate: 'desc' },
      });

      return Result.ok(transactions.map(BankTransactionMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find unreconciled transactions', error)
      );
    }
  }

  /**
   * Find transactions by reconciliation status
   */
  async findByReconciliationStatus(
    bankAccountId: string,
    status: ReconciliationStatus
  ): Promise<Result<BankTransaction[], BaseError>> {
    try {
      const transactions = await this.prisma.bankTransaction.findMany({
        where: {
          bankAccountId,
          reconciliationStatus: status,
        },
        orderBy: { executionDate: 'desc' },
      });

      return Result.ok(transactions.map(BankTransactionMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find transactions by status', error)
      );
    }
  }

  /**
   * Find potential matches for an expense (for auto-matching)
   */
  async findPotentialMatches(
    userId: string,
    amount: number,
    date: Date,
    toleranceDays: number = 3
  ): Promise<Result<BankTransaction[], BaseError>> {
    try {
      const startDate = new Date(date);
      startDate.setDate(startDate.getDate() - toleranceDays);

      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + toleranceDays);

      // Find negative transactions (expenses) within date range and amount tolerance
      const transactions = await this.prisma.bankTransaction.findMany({
        where: {
          bankAccount: {
            connection: {
              userId,
            },
          },
          reconciliationStatus: ReconciliationStatus.PENDING,
          amount: {
            lt: 0, // Negative amounts are expenses
            gte: -(amount + 1), // Amount tolerance ±€1
            lte: -(amount - 1),
          },
          executionDate: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { executionDate: 'desc' },
        take: 10, // Return top 10 matches
      });

      return Result.ok(transactions.map(BankTransactionMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find potential matches', error)
      );
    }
  }

  /**
   * Save (create or update) transaction
   */
  async save(transaction: BankTransaction): Promise<Result<BankTransaction, BaseError>> {
    try {
      // Check if transaction exists
      const existing = await this.prisma.bankTransaction.findUnique({
        where: { id: transaction.id },
      });

      let saved;
      if (existing) {
        // Update existing
        const data = BankTransactionMapper.toUpdateData(transaction);
        saved = await this.prisma.bankTransaction.update({
          where: { id: transaction.id },
          data,
        });
      } else {
        // Create new
        const data = BankTransactionMapper.toCreateData(transaction);
        saved = await this.prisma.bankTransaction.create({
          data,
        });
      }

      return Result.ok(BankTransactionMapper.toDomain(saved));
    } catch (error: any) {
      if (error.code === 'P2025') {
        return Result.fail(new NotFoundError('BankTransaction', transaction.id));
      }

      return Result.fail(
        new DatabaseError('Failed to save bank transaction', error)
      );
    }
  }

  /**
   * Save multiple transactions (bulk insert/update for sync)
   */
  async saveMany(transactions: BankTransaction[]): Promise<Result<BankTransaction[], BaseError>> {
    try {
      const saved: BankTransaction[] = [];

      // Use transaction for atomicity
      await this.prisma.$transaction(async (tx) => {
        for (const transaction of transactions) {
          // Check if transaction exists
          const existing = await tx.bankTransaction.findUnique({
            where: { id: transaction.id },
          });

          let savedTransaction;
          if (existing) {
            // Update existing
            const data = BankTransactionMapper.toUpdateData(transaction);
            savedTransaction = await tx.bankTransaction.update({
              where: { id: transaction.id },
              data,
            });
          } else {
            // Create new
            const data = BankTransactionMapper.toCreateData(transaction);
            savedTransaction = await tx.bankTransaction.create({
              data,
            });
          }

          saved.push(BankTransactionMapper.toDomain(savedTransaction));
        }
      });

      return Result.ok(saved);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to save bank transactions', error)
      );
    }
  }

  /**
   * Delete transaction
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.bankTransaction.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return Result.fail(new NotFoundError('BankTransaction', id));
      }

      return Result.fail(
        new DatabaseError('Failed to delete bank transaction', error)
      );
    }
  }

  /**
   * Count unreconciled transactions for user
   */
  async countUnreconciled(userId: string): Promise<Result<number, BaseError>> {
    try {
      const count = await this.prisma.bankTransaction.count({
        where: {
          bankAccount: {
            connection: {
              userId,
            },
          },
          reconciliationStatus: ReconciliationStatus.PENDING,
        },
      });

      return Result.ok(count);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to count unreconciled transactions', error)
      );
    }
  }

  /**
   * Get transaction statistics
   */
  async getStatistics(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<{
    total: number;
    pending: number;
    matched: number;
    ignored: number;
    totalExpenses: number;
    totalIncome: number;
  }, BaseError>> {
    try {
      const where = {
        bankAccount: {
          connection: {
            userId,
          },
        },
        executionDate: {
          gte: startDate,
          lte: endDate,
        },
      };

      // Get counts by status
      const [total, pending, matched, ignored] = await Promise.all([
        this.prisma.bankTransaction.count({ where }),
        this.prisma.bankTransaction.count({
          where: { ...where, reconciliationStatus: ReconciliationStatus.PENDING },
        }),
        this.prisma.bankTransaction.count({
          where: { ...where, reconciliationStatus: ReconciliationStatus.MATCHED },
        }),
        this.prisma.bankTransaction.count({
          where: { ...where, reconciliationStatus: ReconciliationStatus.IGNORED },
        }),
      ]);

      // Get sum of expenses (negative) and income (positive)
      const [expenseSum, incomeSum] = await Promise.all([
        this.prisma.bankTransaction.aggregate({
          where: { ...where, amount: { lt: 0 } },
          _sum: { amount: true },
        }),
        this.prisma.bankTransaction.aggregate({
          where: { ...where, amount: { gt: 0 } },
          _sum: { amount: true },
        }),
      ]);

      return Result.ok({
        total,
        pending,
        matched,
        ignored,
        totalExpenses: Math.abs(expenseSum._sum.amount || 0),
        totalIncome: incomeSum._sum.amount || 0,
      });
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to get transaction statistics', error)
      );
    }
  }
}
