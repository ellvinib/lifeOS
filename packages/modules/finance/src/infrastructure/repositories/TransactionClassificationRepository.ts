import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeOS/core/shared/errors';
import {
  ITransactionClassificationRepository,
  TransactionClassificationQueryOptions,
} from '../../domain/interfaces/ITransactionClassificationRepository';
import { TransactionClassification, FeedbackType } from '../../domain/entities/TransactionClassification';
import { ExpenseCategory } from '../../domain/entities/Expense';
import { TransactionClassificationMapper } from '../mappers/TransactionClassificationMapper';

/**
 * Transaction Classification Repository Implementation with Prisma
 */
export class TransactionClassificationRepository implements ITransactionClassificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Result<TransactionClassification, BaseError>> {
    try {
      const classification = await this.prisma.transactionClassification.findUnique({
        where: { id },
      });

      if (!classification) {
        return Result.fail(new NotFoundError('TransactionClassification', id));
      }

      return Result.ok(TransactionClassificationMapper.toDomain(classification));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find transaction classification', error)
      );
    }
  }

  async findByUserId(userId: string, limit?: number): Promise<Result<TransactionClassification[], BaseError>> {
    try {
      const classifications = await this.prisma.transactionClassification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return Result.ok(classifications.map(TransactionClassificationMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find classifications by user ID', error)
      );
    }
  }

  async findByTransactionId(transactionId: string): Promise<Result<TransactionClassification[], BaseError>> {
    try {
      const classifications = await this.prisma.transactionClassification.findMany({
        where: { transactionId },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(classifications.map(TransactionClassificationMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find classifications by transaction ID', error)
      );
    }
  }

  async findByFeedbackType(userId: string, feedbackType: FeedbackType): Promise<Result<TransactionClassification[], BaseError>> {
    return this.findAll({ userId, feedbackType });
  }

  async findHighValueTrainingData(userId: string, limit?: number): Promise<Result<TransactionClassification[], BaseError>> {
    return this.findAll({ userId, highValueOnly: true, limit });
  }

  async findAll(options?: TransactionClassificationQueryOptions): Promise<Result<TransactionClassification[], BaseError>> {
    try {
      const where: any = {};

      if (options?.userId) {
        where.userId = options.userId;
      }

      if (options?.transactionId) {
        where.transactionId = options.transactionId;
      }

      if (options?.actualCategory) {
        where.actualCategory = options.actualCategory;
      }

      if (options?.feedbackType) {
        where.feedbackType = options.feedbackType;
      }

      if (options?.minConfidence !== undefined) {
        where.confidence = { gte: options.minConfidence };
      }

      const skip = options?.page && options?.limit
        ? (options.page - 1) * options.limit
        : undefined;

      let classifications = await this.prisma.transactionClassification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: options?.limit,
        skip,
      });

      // Apply high-value filter if requested (in-memory filter)
      if (options?.highValueOnly) {
        const domainClassifications = classifications.map(TransactionClassificationMapper.toDomain);
        const highValue = domainClassifications.filter(c => c.isHighValueTrainingData());
        return Result.ok(highValue);
      }

      return Result.ok(classifications.map(TransactionClassificationMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find transaction classifications', error)
      );
    }
  }

  async create(classification: TransactionClassification): Promise<Result<TransactionClassification, BaseError>> {
    try {
      const data = TransactionClassificationMapper.toCreateData(classification);

      const created = await this.prisma.transactionClassification.create({
        data,
      });

      return Result.ok(TransactionClassificationMapper.toDomain(created));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to create transaction classification', error)
      );
    }
  }

  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.transactionClassification.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return Result.fail(new NotFoundError('TransactionClassification', id));
      }

      return Result.fail(
        new DatabaseError('Failed to delete transaction classification', error)
      );
    }
  }

  async getAccuracyStats(userId: string): Promise<Result<{
    total: number;
    confirmed: number;
    corrected: number;
    rejected: number;
    accuracyRate: number;
  }, BaseError>> {
    try {
      const [total, confirmed, corrected, rejected] = await Promise.all([
        this.prisma.transactionClassification.count({ where: { userId } }),
        this.prisma.transactionClassification.count({ where: { userId, feedbackType: 'confirmed' } }),
        this.prisma.transactionClassification.count({ where: { userId, feedbackType: 'corrected' } }),
        this.prisma.transactionClassification.count({ where: { userId, feedbackType: 'rejected' } }),
      ]);

      const accuracyRate = total > 0 ? confirmed / total : 0;

      return Result.ok({
        total,
        confirmed,
        corrected,
        rejected,
        accuracyRate,
      });
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to get accuracy stats', error)
      );
    }
  }

  async count(options?: TransactionClassificationQueryOptions): Promise<Result<number, BaseError>> {
    try {
      const where: any = {};

      if (options?.userId) {
        where.userId = options.userId;
      }

      if (options?.transactionId) {
        where.transactionId = options.transactionId;
      }

      if (options?.actualCategory) {
        where.actualCategory = options.actualCategory;
      }

      if (options?.feedbackType) {
        where.feedbackType = options.feedbackType;
      }

      if (options?.minConfidence !== undefined) {
        where.confidence = { gte: options.minConfidence };
      }

      const count = await this.prisma.transactionClassification.count({ where });

      return Result.ok(count);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to count transaction classifications', error)
      );
    }
  }
}
