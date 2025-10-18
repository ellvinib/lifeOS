import { PrismaClient } from '@prisma/client';
import { IEmailRepository } from '../../domain/interfaces/IEmailRepository';
import { Email } from '../../domain/entities/Email';
import { Result } from '@lifeOS/core/shared/result/Result';
import { BaseError } from '@lifeOS/core/shared/errors/BaseError';
import { NotFoundError } from '@lifeOS/core/shared/errors/NotFoundError';
import { DatabaseError } from '@lifeOS/core/shared/errors/DatabaseError';
import { EmailPrismaMapper } from '../mappers/EmailPrismaMapper';

/**
 * Email Repository Implementation
 *
 * Implements IEmailRepository using Prisma ORM.
 *
 * Design Principles:
 * - All database operations wrapped in Result<T, E>
 * - Prisma errors converted to domain errors
 * - Uses EmailPrismaMapper for Prisma ↔ Domain translation
 * - Pagination support for large email lists
 * - Batch operations for efficient sync
 *
 * Performance Considerations:
 * - Uses proper indexes (accountId, providerMessageId, timestamp, from)
 * - Batch creates for sync operations
 * - Pagination to prevent memory issues
 */
export class EmailRepository implements IEmailRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find email by ID
   */
  async findById(id: string): Promise<Result<Email, BaseError>> {
    try {
      const prismaEmail = await this.prisma.email.findUnique({
        where: { id },
      });

      if (!prismaEmail) {
        return Result.fail(new NotFoundError('Email', id));
      }

      return EmailPrismaMapper.toDomain(prismaEmail);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find email by ID', error, { id }));
    }
  }

  /**
   * Find email by provider message ID
   */
  async findByProviderMessageId(
    accountId: string,
    providerMessageId: string
  ): Promise<Result<Email, BaseError>> {
    try {
      const prismaEmail = await this.prisma.email.findUnique({
        where: {
          accountId_providerMessageId: {
            accountId,
            providerMessageId,
          },
        },
      });

      if (!prismaEmail) {
        return Result.fail(
          new NotFoundError('Email', `${accountId}/${providerMessageId}`)
        );
      }

      return EmailPrismaMapper.toDomain(prismaEmail);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find email by provider message ID', error, {
          accountId,
          providerMessageId,
        })
      );
    }
  }

  /**
   * Find all emails for an account
   */
  async findByAccount(
    accountId: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: 'timestamp' | 'createdAt';
      order?: 'asc' | 'desc';
      since?: Date;
    }
  ): Promise<Result<Email[], BaseError>> {
    try {
      const where: any = { accountId };

      if (options?.since) {
        where.timestamp = { gte: options.since };
      }

      const prismaEmails = await this.prisma.email.findMany({
        where,
        orderBy: {
          [options?.orderBy || 'timestamp']: options?.order || 'desc',
        },
        take: options?.limit,
        skip: options?.offset,
      });

      return EmailPrismaMapper.toDomainList(prismaEmails);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find emails by account', error, {
          accountId,
          options,
        })
      );
    }
  }

  /**
   * Search emails by filters
   */
  async searchByFilters(
    accountId: string,
    filters: {
      from?: string;
      subject?: string;
      hasAttachments?: boolean;
      labels?: string[];
      since?: Date;
      until?: Date;
    },
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Result<Email[], BaseError>> {
    try {
      const where: any = { accountId };

      if (filters.from) {
        where.from = { contains: filters.from, mode: 'insensitive' };
      }

      if (filters.subject) {
        where.subject = { contains: filters.subject, mode: 'insensitive' };
      }

      if (filters.hasAttachments !== undefined) {
        where.hasAttachments = filters.hasAttachments;
      }

      if (filters.labels && filters.labels.length > 0) {
        where.labels = { hasSome: filters.labels };
      }

      // Date range filter
      if (filters.since || filters.until) {
        where.timestamp = {};
        if (filters.since) {
          where.timestamp.gte = filters.since;
        }
        if (filters.until) {
          where.timestamp.lte = filters.until;
        }
      }

      const prismaEmails = await this.prisma.email.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      });

      return EmailPrismaMapper.toDomainList(prismaEmails);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to search emails', error, { accountId, filters })
      );
    }
  }

  /**
   * Create new email record
   */
  async create(email: Email): Promise<Result<Email, BaseError>> {
    try {
      const prismaData = EmailPrismaMapper.toPersistence(email);

      const createdEmail = await this.prisma.email.create({
        data: prismaData,
      });

      return EmailPrismaMapper.toDomain(createdEmail);
    } catch (error) {
      // Check for unique constraint violation
      if ((error as any).code === 'P2002') {
        return Result.fail(
          new DatabaseError(
            'Email already exists',
            error,
            { emailId: email.id },
            'DUPLICATE_EMAIL'
          )
        );
      }

      return Result.fail(
        new DatabaseError('Failed to create email', error, { emailId: email.id })
      );
    }
  }

  /**
   * Batch create multiple emails (for sync operations)
   */
  async createMany(emails: Email[]): Promise<Result<Email[], BaseError>> {
    try {
      if (emails.length === 0) {
        return Result.ok([]);
      }

      const prismaData = emails.map((email) => EmailPrismaMapper.toPersistence(email));

      // Use skipDuplicates to avoid errors on re-sync
      await this.prisma.email.createMany({
        data: prismaData,
        skipDuplicates: true,
      });

      // Fetch created emails to return domain entities
      const providerMessageIds = emails.map((e) => e.providerMessageId);
      const accountId = emails[0].accountId;

      const createdEmails = await this.prisma.email.findMany({
        where: {
          accountId,
          providerMessageId: { in: providerMessageIds },
        },
      });

      return EmailPrismaMapper.toDomainList(createdEmails);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to batch create emails', error, {
          count: emails.length,
        })
      );
    }
  }

  /**
   * Update existing email
   */
  async update(email: Email): Promise<Result<Email, BaseError>> {
    try {
      const prismaData = EmailPrismaMapper.toPersistence(email);

      const updatedEmail = await this.prisma.email.update({
        where: { id: email.id },
        data: {
          ...prismaData,
          updatedAt: new Date(),
        },
      });

      return EmailPrismaMapper.toDomain(updatedEmail);
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return Result.fail(new NotFoundError('Email', email.id));
      }

      return Result.fail(
        new DatabaseError('Failed to update email', error, { emailId: email.id })
      );
    }
  }

  /**
   * Delete email by ID
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.email.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error) {
      if ((error as any).code === 'P2025') {
        return Result.fail(new NotFoundError('Email', id));
      }

      return Result.fail(new DatabaseError('Failed to delete email', error, { id }));
    }
  }

  /**
   * Delete all emails for an account
   */
  async deleteByAccount(accountId: string): Promise<Result<number, BaseError>> {
    try {
      const result = await this.prisma.email.deleteMany({
        where: { accountId },
      });

      return Result.ok(result.count);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to delete emails by account', error, { accountId })
      );
    }
  }

  /**
   * Count emails for an account
   */
  async count(
    accountId: string,
    filters?: {
      from?: string;
      subject?: string;
      hasAttachments?: boolean;
      labels?: string[];
      since?: Date;
      until?: Date;
    }
  ): Promise<Result<number, BaseError>> {
    try {
      const where: any = { accountId };

      if (filters) {
        if (filters.from) {
          where.from = { contains: filters.from, mode: 'insensitive' };
        }
        if (filters.subject) {
          where.subject = { contains: filters.subject, mode: 'insensitive' };
        }
        if (filters.hasAttachments !== undefined) {
          where.hasAttachments = filters.hasAttachments;
        }
        if (filters.labels && filters.labels.length > 0) {
          where.labels = { hasSome: filters.labels };
        }
        if (filters.since || filters.until) {
          where.timestamp = {};
          if (filters.since) where.timestamp.gte = filters.since;
          if (filters.until) where.timestamp.lte = filters.until;
        }
      }

      const count = await this.prisma.email.count({ where });
      return Result.ok(count);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to count emails', error, { accountId, filters })
      );
    }
  }

  /**
   * Check if email exists
   */
  async exists(
    accountId: string,
    providerMessageId: string
  ): Promise<Result<boolean, BaseError>> {
    try {
      const count = await this.prisma.email.count({
        where: {
          accountId,
          providerMessageId,
        },
      });

      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to check if email exists', error, {
          accountId,
          providerMessageId,
        })
      );
    }
  }
}
