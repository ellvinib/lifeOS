import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeOS/core/shared/errors';
import { IMonthlySummaryRepository } from '../../domain/interfaces/IMonthlySummaryRepository';
import { MonthlySummary } from '../../domain/entities/MonthlySummary';
import { MonthlySummaryMapper } from '../mappers/MonthlySummaryMapper';

/**
 * Monthly Summary Repository Implementation
 *
 * Implements IMonthlySummaryRepository using Prisma ORM.
 */
export class MonthlySummaryRepository implements IMonthlySummaryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find summary by ID
   */
  async findById(id: string): Promise<Result<MonthlySummary, BaseError>> {
    try {
      const summary = await this.prisma.monthlySummary.findUnique({
        where: { id },
      });

      if (!summary) {
        return Result.fail(new NotFoundError('MonthlySummary', id));
      }

      return Result.ok(MonthlySummaryMapper.toDomain(summary));
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to find monthly summary by ID', error)
      );
    }
  }

  /**
   * Find summary for specific user and month
   */
  async findByUserAndMonth(
    userId: string,
    month: Date
  ): Promise<Result<MonthlySummary | null, BaseError>> {
    try {
      const summary = await this.prisma.monthlySummary.findUnique({
        where: {
          userId_month: {
            userId,
            month,
          },
        },
      });

      if (!summary) {
        return Result.ok(null);
      }

      return Result.ok(MonthlySummaryMapper.toDomain(summary));
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to find monthly summary by user and month', error)
      );
    }
  }

  /**
   * Find all summaries for a user
   */
  async findByUserId(userId: string): Promise<Result<MonthlySummary[], BaseError>> {
    try {
      const summaries = await this.prisma.monthlySummary.findMany({
        where: { userId },
        orderBy: { month: 'desc' },
      });

      return Result.ok(summaries.map(MonthlySummaryMapper.toDomain));
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to find monthly summaries by user ID', error)
      );
    }
  }

  /**
   * Find summaries for a user within date range
   */
  async findByUserIdAndDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<MonthlySummary[], BaseError>> {
    try {
      const summaries = await this.prisma.monthlySummary.findMany({
        where: {
          userId,
          month: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { month: 'asc' },
      });

      return Result.ok(summaries.map(MonthlySummaryMapper.toDomain));
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to find monthly summaries by date range', error)
      );
    }
  }

  /**
   * Find most recent N summaries for a user
   */
  async findRecentByUserId(
    userId: string,
    limit: number
  ): Promise<Result<MonthlySummary[], BaseError>> {
    try {
      const summaries = await this.prisma.monthlySummary.findMany({
        where: { userId },
        orderBy: { month: 'desc' },
        take: limit,
      });

      return Result.ok(summaries.map(MonthlySummaryMapper.toDomain));
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to find recent monthly summaries', error)
      );
    }
  }

  /**
   * Find stale summaries (need recalculation)
   */
  async findStale(maxAgeHours: number): Promise<Result<MonthlySummary[], BaseError>> {
    try {
      const cutoffDate = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

      const summaries = await this.prisma.monthlySummary.findMany({
        where: {
          calculatedAt: {
            lt: cutoffDate,
          },
        },
        orderBy: { calculatedAt: 'asc' },
      });

      return Result.ok(summaries.map(MonthlySummaryMapper.toDomain));
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to find stale monthly summaries', error)
      );
    }
  }

  /**
   * Create new summary
   */
  async create(summary: MonthlySummary): Promise<Result<MonthlySummary, BaseError>> {
    try {
      const data = MonthlySummaryMapper.toCreateData(summary);

      const created = await this.prisma.monthlySummary.create({
        data,
      });

      return Result.ok(MonthlySummaryMapper.toDomain(created));
    } catch (error: any) {
      return Result.fail(new DatabaseError('Failed to create monthly summary', error));
    }
  }

  /**
   * Update existing summary
   */
  async update(summary: MonthlySummary): Promise<Result<MonthlySummary, BaseError>> {
    try {
      const data = MonthlySummaryMapper.toUpdateData(summary);

      const updated = await this.prisma.monthlySummary.update({
        where: { id: summary.id },
        data,
      });

      return Result.ok(MonthlySummaryMapper.toDomain(updated));
    } catch (error: any) {
      return Result.fail(new DatabaseError('Failed to update monthly summary', error));
    }
  }

  /**
   * Upsert (create or update) summary
   */
  async upsert(summary: MonthlySummary): Promise<Result<MonthlySummary, BaseError>> {
    try {
      const createData = MonthlySummaryMapper.toCreateData(summary);
      const updateData = MonthlySummaryMapper.toUpdateData(summary);

      const upserted = await this.prisma.monthlySummary.upsert({
        where: {
          userId_month: {
            userId: summary.userId,
            month: summary.month,
          },
        },
        create: createData,
        update: updateData,
      });

      return Result.ok(MonthlySummaryMapper.toDomain(upserted));
    } catch (error: any) {
      return Result.fail(new DatabaseError('Failed to upsert monthly summary', error));
    }
  }

  /**
   * Delete summary by ID
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.monthlySummary.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error: any) {
      return Result.fail(new DatabaseError('Failed to delete monthly summary', error));
    }
  }

  /**
   * Delete all summaries for a user
   */
  async deleteByUserId(userId: string): Promise<Result<number, BaseError>> {
    try {
      const result = await this.prisma.monthlySummary.deleteMany({
        where: { userId },
      });

      return Result.ok(result.count);
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to delete monthly summaries by user ID', error)
      );
    }
  }

  /**
   * Check if summary exists for user and month
   */
  async exists(userId: string, month: Date): Promise<Result<boolean, BaseError>> {
    try {
      const count = await this.prisma.monthlySummary.count({
        where: {
          userId,
          month,
        },
      });

      return Result.ok(count > 0);
    } catch (error: any) {
      return Result.fail(
        new DatabaseError('Failed to check if monthly summary exists', error)
      );
    }
  }
}
