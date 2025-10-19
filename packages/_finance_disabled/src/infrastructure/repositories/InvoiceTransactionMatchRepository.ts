import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeOS/core/shared/errors';
import {
  IInvoiceTransactionMatchRepository,
  MatchQueryOptions,
} from '../../domain/interfaces';
import { InvoiceTransactionMatch } from '../../domain/entities';
import { MatchConfidence } from '../../domain/value-objects/InvoiceEnums';
import { InvoiceTransactionMatchMapper } from '../mappers/InvoiceTransactionMatchMapper';

/**
 * InvoiceTransactionMatch Repository Implementation with Prisma
 *
 * Implements invoice-transaction match persistence using Prisma ORM.
 * All operations return Result<T, E> for functional error handling.
 */
export class InvoiceTransactionMatchRepository
  implements IInvoiceTransactionMatchRepository
{
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find match by ID
   */
  async findById(id: string): Promise<Result<InvoiceTransactionMatch, BaseError>> {
    try {
      const match = await this.prisma.financeInvoiceTransactionMatch.findUnique({
        where: { id },
      });

      if (!match) {
        return Result.fail(new NotFoundError('InvoiceTransactionMatch', id));
      }

      return Result.ok(InvoiceTransactionMatchMapper.toDomain(match));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find match', error));
    }
  }

  /**
   * Find all matches with optional filters
   */
  async findAll(
    options?: MatchQueryOptions
  ): Promise<Result<InvoiceTransactionMatch[], BaseError>> {
    try {
      const where: any = {};

      if (options?.invoiceId) {
        where.invoiceId = options.invoiceId;
      }

      if (options?.transactionId) {
        where.transactionId = options.transactionId;
      }

      if (options?.matchConfidence) {
        where.matchConfidence = options.matchConfidence;
      }

      if (options?.matchedBy) {
        where.matchedBy = options.matchedBy;
      }

      if (options?.matchedByUserId) {
        where.matchedByUserId = options.matchedByUserId;
      }

      if (options?.minScore !== undefined || options?.maxScore !== undefined) {
        where.matchScore = {};
        if (options.minScore !== undefined) where.matchScore.gte = options.minScore;
        if (options.maxScore !== undefined) where.matchScore.lte = options.maxScore;
      }

      if (options?.dateFrom || options?.dateTo) {
        where.matchedAt = {};
        if (options.dateFrom) where.matchedAt.gte = options.dateFrom;
        if (options.dateTo) where.matchedAt.lte = options.dateTo;
      }

      const skip =
        options?.page && options?.limit ? (options.page - 1) * options.limit : undefined;

      const orderBy: any = {};
      if (options?.sortBy) {
        orderBy[options.sortBy] = options.sortOrder || 'desc';
      } else {
        orderBy.matchedAt = 'desc'; // Default sort
      }

      const matches = await this.prisma.financeInvoiceTransactionMatch.findMany({
        where,
        orderBy,
        take: options?.limit,
        skip,
      });

      return Result.ok(matches.map(InvoiceTransactionMatchMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find matches', error));
    }
  }

  /**
   * Find matches by invoice ID
   */
  async findByInvoiceId(
    invoiceId: string
  ): Promise<Result<InvoiceTransactionMatch[], BaseError>> {
    try {
      const matches = await this.prisma.financeInvoiceTransactionMatch.findMany({
        where: { invoiceId },
        orderBy: { matchedAt: 'desc' },
      });

      return Result.ok(matches.map(InvoiceTransactionMatchMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find matches by invoice', error));
    }
  }

  /**
   * Find matches by transaction ID
   */
  async findByTransactionId(
    transactionId: string
  ): Promise<Result<InvoiceTransactionMatch[], BaseError>> {
    try {
      const matches = await this.prisma.financeInvoiceTransactionMatch.findMany({
        where: { transactionId },
        orderBy: { matchedAt: 'desc' },
      });

      return Result.ok(matches.map(InvoiceTransactionMatchMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find matches by transaction', error));
    }
  }

  /**
   * Find match by invoice and transaction
   */
  async findByInvoiceAndTransaction(
    invoiceId: string,
    transactionId: string
  ): Promise<Result<InvoiceTransactionMatch, BaseError>> {
    try {
      const match = await this.prisma.financeInvoiceTransactionMatch.findUnique({
        where: {
          invoiceId_transactionId: {
            invoiceId,
            transactionId,
          },
        },
      });

      if (!match) {
        return Result.fail(
          new NotFoundError(
            'InvoiceTransactionMatch',
            `invoice: ${invoiceId}, transaction: ${transactionId}`
          )
        );
      }

      return Result.ok(InvoiceTransactionMatchMapper.toDomain(match));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find match', error));
    }
  }

  /**
   * Find matches by confidence level
   */
  async findByConfidence(
    confidence: MatchConfidence
  ): Promise<Result<InvoiceTransactionMatch[], BaseError>> {
    try {
      const matches = await this.prisma.financeInvoiceTransactionMatch.findMany({
        where: { matchConfidence: confidence },
        orderBy: { matchScore: 'desc' },
      });

      return Result.ok(matches.map(InvoiceTransactionMatchMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find matches by confidence', error));
    }
  }

  /**
   * Find auto-matches (system generated)
   */
  async findAutoMatches(): Promise<Result<InvoiceTransactionMatch[], BaseError>> {
    try {
      const matches = await this.prisma.financeInvoiceTransactionMatch.findMany({
        where: { matchedBy: 'system' },
        orderBy: { matchedAt: 'desc' },
      });

      return Result.ok(matches.map(InvoiceTransactionMatchMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find auto-matches', error));
    }
  }

  /**
   * Find manual matches (user created)
   */
  async findManualMatches(): Promise<Result<InvoiceTransactionMatch[], BaseError>> {
    try {
      const matches = await this.prisma.financeInvoiceTransactionMatch.findMany({
        where: { matchedBy: 'user' },
        orderBy: { matchedAt: 'desc' },
      });

      return Result.ok(matches.map(InvoiceTransactionMatchMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find manual matches', error));
    }
  }

  /**
   * Find matches needing review (medium/low confidence)
   */
  async findNeedingReview(): Promise<Result<InvoiceTransactionMatch[], BaseError>> {
    try {
      const matches = await this.prisma.financeInvoiceTransactionMatch.findMany({
        where: {
          matchConfidence: {
            in: [MatchConfidence.MEDIUM, MatchConfidence.LOW],
          },
        },
        orderBy: { matchScore: 'desc' },
      });

      return Result.ok(matches.map(InvoiceTransactionMatchMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find matches needing review', error));
    }
  }

  /**
   * Find matches by user
   */
  async findByUser(userId: string): Promise<Result<InvoiceTransactionMatch[], BaseError>> {
    try {
      const matches = await this.prisma.financeInvoiceTransactionMatch.findMany({
        where: {
          matchedBy: 'user',
          matchedByUserId: userId,
        },
        orderBy: { matchedAt: 'desc' },
      });

      return Result.ok(matches.map(InvoiceTransactionMatchMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find matches by user', error));
    }
  }

  /**
   * Find high confidence matches
   */
  async findHighConfidence(): Promise<Result<InvoiceTransactionMatch[], BaseError>> {
    try {
      const matches = await this.prisma.financeInvoiceTransactionMatch.findMany({
        where: {
          matchConfidence: {
            in: [MatchConfidence.HIGH, MatchConfidence.MANUAL],
          },
        },
        orderBy: { matchedAt: 'desc' },
      });

      return Result.ok(matches.map(InvoiceTransactionMatchMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find high confidence matches', error));
    }
  }

  /**
   * Create a new match
   */
  async create(
    match: InvoiceTransactionMatch
  ): Promise<Result<InvoiceTransactionMatch, BaseError>> {
    try {
      const created = await this.prisma.financeInvoiceTransactionMatch.create({
        data: InvoiceTransactionMatchMapper.toCreateData(match),
      });

      return Result.ok(InvoiceTransactionMatchMapper.toDomain(created));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to create match', error));
    }
  }

  /**
   * Update an existing match
   */
  async update(
    match: InvoiceTransactionMatch
  ): Promise<Result<InvoiceTransactionMatch, BaseError>> {
    try {
      const updated = await this.prisma.financeInvoiceTransactionMatch.update({
        where: { id: match.id },
        data: InvoiceTransactionMatchMapper.toUpdateData(match),
      });

      return Result.ok(InvoiceTransactionMatchMapper.toDomain(updated));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to update match', error));
    }
  }

  /**
   * Delete a match (unmatch)
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.financeInvoiceTransactionMatch.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to delete match', error));
    }
  }

  /**
   * Delete matches by invoice ID
   */
  async deleteByInvoiceId(invoiceId: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.financeInvoiceTransactionMatch.deleteMany({
        where: { invoiceId },
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to delete matches by invoice', error));
    }
  }

  /**
   * Delete matches by transaction ID
   */
  async deleteByTransactionId(transactionId: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.financeInvoiceTransactionMatch.deleteMany({
        where: { transactionId },
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to delete matches by transaction', error)
      );
    }
  }

  /**
   * Check if invoice is matched
   */
  async isInvoiceMatched(invoiceId: string): Promise<Result<boolean, BaseError>> {
    try {
      const count = await this.prisma.financeInvoiceTransactionMatch.count({
        where: { invoiceId },
      });

      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to check if invoice is matched', error));
    }
  }

  /**
   * Check if transaction is matched
   */
  async isTransactionMatched(transactionId: string): Promise<Result<boolean, BaseError>> {
    try {
      const count = await this.prisma.financeInvoiceTransactionMatch.count({
        where: { transactionId },
      });

      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to check if transaction is matched', error)
      );
    }
  }

  /**
   * Check if match exists
   */
  async exists(invoiceId: string, transactionId: string): Promise<Result<boolean, BaseError>> {
    try {
      const match = await this.prisma.financeInvoiceTransactionMatch.findUnique({
        where: {
          invoiceId_transactionId: {
            invoiceId,
            transactionId,
          },
        },
        select: { id: true },
      });

      return Result.ok(match !== null);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to check if match exists', error));
    }
  }

  /**
   * Get match count by confidence level
   */
  async getCountByConfidence(
    confidence: MatchConfidence
  ): Promise<Result<number, BaseError>> {
    try {
      const count = await this.prisma.financeInvoiceTransactionMatch.count({
        where: { matchConfidence: confidence },
      });

      return Result.ok(count);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to get match count by confidence', error)
      );
    }
  }

  /**
   * Get match statistics
   */
  async getStatistics(): Promise<
    Result<
      {
        totalMatches: number;
        autoMatches: number;
        manualMatches: number;
        highConfidence: number;
        mediumConfidence: number;
        lowConfidence: number;
        needingReview: number;
      },
      BaseError
    >
  > {
    try {
      const [
        totalMatches,
        autoMatches,
        manualMatches,
        highConfidence,
        mediumConfidence,
        lowConfidence,
      ] = await Promise.all([
        this.prisma.financeInvoiceTransactionMatch.count(),
        this.prisma.financeInvoiceTransactionMatch.count({
          where: { matchedBy: 'system' },
        }),
        this.prisma.financeInvoiceTransactionMatch.count({
          where: { matchedBy: 'user' },
        }),
        this.prisma.financeInvoiceTransactionMatch.count({
          where: {
            matchConfidence: {
              in: [MatchConfidence.HIGH, MatchConfidence.MANUAL],
            },
          },
        }),
        this.prisma.financeInvoiceTransactionMatch.count({
          where: { matchConfidence: MatchConfidence.MEDIUM },
        }),
        this.prisma.financeInvoiceTransactionMatch.count({
          where: { matchConfidence: MatchConfidence.LOW },
        }),
      ]);

      const needingReview = mediumConfidence + lowConfidence;

      return Result.ok({
        totalMatches,
        autoMatches,
        manualMatches,
        highConfidence,
        mediumConfidence,
        lowConfidence,
        needingReview,
      });
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to get match statistics', error));
    }
  }

  /**
   * Count matches matching criteria
   */
  async count(options?: MatchQueryOptions): Promise<Result<number, BaseError>> {
    try {
      const where: any = {};

      if (options?.invoiceId) {
        where.invoiceId = options.invoiceId;
      }

      if (options?.transactionId) {
        where.transactionId = options.transactionId;
      }

      if (options?.matchConfidence) {
        where.matchConfidence = options.matchConfidence;
      }

      if (options?.matchedBy) {
        where.matchedBy = options.matchedBy;
      }

      if (options?.minScore !== undefined || options?.maxScore !== undefined) {
        where.matchScore = {};
        if (options.minScore !== undefined) where.matchScore.gte = options.minScore;
        if (options.maxScore !== undefined) where.matchScore.lte = options.maxScore;
      }

      const count = await this.prisma.financeInvoiceTransactionMatch.count({ where });

      return Result.ok(count);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to count matches', error));
    }
  }
}
