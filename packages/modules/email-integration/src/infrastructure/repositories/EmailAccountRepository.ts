import { PrismaClient } from '@prisma/client';
import { IEmailAccountRepository } from '../../domain/interfaces/IEmailAccountRepository';
import { EmailAccount } from '../../domain/entities/EmailAccount';
import { EmailProvider } from '../../domain/value-objects/EmailProvider';
import { Result } from '@lifeOS/core/shared/result/Result';
import { BaseError } from '@lifeOS/core/shared/errors/BaseError';
import { NotFoundError } from '@lifeOS/core/shared/errors/NotFoundError';
import { DatabaseError } from '@lifeOS/core/shared/errors/DatabaseError';
import { EmailAccountPrismaMapper } from '../mappers/EmailAccountPrismaMapper';

/**
 * EmailAccount Repository Implementation
 *
 * Implements IEmailAccountRepository using Prisma ORM.
 *
 * Design Principles:
 * - All database operations wrapped in Result<T, E>
 * - Prisma errors converted to domain errors
 * - Uses EmailAccountPrismaMapper for Prisma ↔ Domain translation
 * - Transaction support for complex operations
 *
 * Error Handling:
 * - Prisma errors → DatabaseError
 * - Not found → NotFoundError
 * - Validation errors → ValidationError (via mapper)
 */
export class EmailAccountRepository implements IEmailAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find account by ID
   */
  async findById(id: string): Promise<Result<EmailAccount, BaseError>> {
    try {
      const prismaAccount = await this.prisma.emailAccount.findUnique({
        where: { id },
      });

      if (!prismaAccount) {
        return Result.fail(new NotFoundError('EmailAccount', id));
      }

      return EmailAccountPrismaMapper.toDomain(prismaAccount);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find email account by ID', error, { id })
      );
    }
  }

  /**
   * Find account by email address
   */
  async findByEmail(userId: string, email: string): Promise<Result<EmailAccount, BaseError>> {
    try {
      const prismaAccount = await this.prisma.emailAccount.findUnique({
        where: {
          userId_email: {
            userId,
            email,
          },
        },
      });

      if (!prismaAccount) {
        return Result.fail(new NotFoundError('EmailAccount', `${userId}/${email}`));
      }

      return EmailAccountPrismaMapper.toDomain(prismaAccount);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find email account by email', error, { userId, email })
      );
    }
  }

  /**
   * Find account by Outlook subscription ID
   */
  async findBySubscriptionId(subscriptionId: string): Promise<Result<EmailAccount, BaseError>> {
    try {
      // Query using JSON field (Outlook-specific)
      const prismaAccounts = await this.prisma.emailAccount.findMany({
        where: {
          provider: 'OUTLOOK',
          providerData: {
            path: ['subscriptionId'],
            equals: subscriptionId,
          },
        },
      });

      if (prismaAccounts.length === 0) {
        return Result.fail(new NotFoundError('EmailAccount', `subscription:${subscriptionId}`));
      }

      // Should only be one account per subscription
      return EmailAccountPrismaMapper.toDomain(prismaAccounts[0]);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find account by subscription ID', error, {
          subscriptionId,
        })
      );
    }
  }

  /**
   * Find all accounts for a user
   */
  async findByUser(
    userId: string,
    filters?: {
      provider?: EmailProvider;
      isActive?: boolean;
    }
  ): Promise<Result<EmailAccount[], BaseError>> {
    try {
      const where: any = { userId };

      if (filters?.provider) {
        where.provider = this.mapProviderToString(filters.provider);
      }

      if (filters?.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      const prismaAccounts = await this.prisma.emailAccount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return EmailAccountPrismaMapper.toDomainList(prismaAccounts);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find accounts by user', error, { userId, filters })
      );
    }
  }

  /**
   * Find all active accounts (for background jobs)
   */
  async findAllActive(): Promise<Result<EmailAccount[], BaseError>> {
    try {
      const prismaAccounts = await this.prisma.emailAccount.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });

      return EmailAccountPrismaMapper.toDomainList(prismaAccounts);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find all active accounts', error));
    }
  }

  /**
   * Create new account
   */
  async create(account: EmailAccount): Promise<Result<EmailAccount, BaseError>> {
    try {
      const prismaData = EmailAccountPrismaMapper.toPersistence(account);

      const createdAccount = await this.prisma.emailAccount.create({
        data: prismaData,
      });

      return EmailAccountPrismaMapper.toDomain(createdAccount);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to create email account', error, {
          accountId: account.id,
        })
      );
    }
  }

  /**
   * Update existing account
   */
  async update(account: EmailAccount): Promise<Result<EmailAccount, BaseError>> {
    try {
      const prismaData = EmailAccountPrismaMapper.toPersistence(account);

      const updatedAccount = await this.prisma.emailAccount.update({
        where: { id: account.id },
        data: {
          ...prismaData,
          updatedAt: new Date(), // Ensure updatedAt is current
        },
      });

      return EmailAccountPrismaMapper.toDomain(updatedAccount);
    } catch (error) {
      // Check if not found
      if ((error as any).code === 'P2025') {
        return Result.fail(new NotFoundError('EmailAccount', account.id));
      }

      return Result.fail(
        new DatabaseError('Failed to update email account', error, {
          accountId: account.id,
        })
      );
    }
  }

  /**
   * Delete account by ID
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.emailAccount.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error) {
      // Check if not found
      if ((error as any).code === 'P2025') {
        return Result.fail(new NotFoundError('EmailAccount', id));
      }

      return Result.fail(new DatabaseError('Failed to delete email account', error, { id }));
    }
  }

  /**
   * Check if account exists
   */
  async exists(userId: string, email: string): Promise<Result<boolean, BaseError>> {
    try {
      const count = await this.prisma.emailAccount.count({
        where: {
          userId,
          email,
        },
      });

      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to check if account exists', error, { userId, email })
      );
    }
  }

  /**
   * Helper: Map EmailProvider enum to Prisma string
   */
  private mapProviderToString(provider: EmailProvider): string {
    switch (provider) {
      case EmailProvider.GMAIL:
        return 'GMAIL';
      case EmailProvider.OUTLOOK:
        return 'OUTLOOK';
      case EmailProvider.SMTP:
        return 'SMTP';
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}
