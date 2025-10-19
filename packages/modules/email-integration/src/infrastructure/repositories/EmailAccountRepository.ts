import { PrismaClient } from '@prisma/client';
import { IEmailAccountRepository } from '../../domain/interfaces/IEmailAccountRepository';
import { EmailAccount } from '../../domain/entities/EmailAccount';
import { EmailProvider } from '../../domain/value-objects/EmailProvider';
import { Result } from '@lifeos/core/shared/result';
import { BaseError } from '@lifeos/core/shared/errors';
import { NotFoundError } from '@lifeos/core/shared/errors';
import { DatabaseError } from '@lifeos/core/shared/errors';
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
        new DatabaseError('Failed to find email account by ID', error as Error, { id })
      );
    }
  }

  /**
   * Find account by email address (any user)
   */
  async findByEmail(email: string): Promise<Result<EmailAccount, BaseError>> {
    try {
      const prismaAccount = await this.prisma.emailAccount.findFirst({
        where: { email },
      });

      if (!prismaAccount) {
        return Result.fail(new NotFoundError('EmailAccount', email));
      }

      return EmailAccountPrismaMapper.toDomain(prismaAccount);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find email account by email', error as Error, { email })
      );
    }
  }

  /**
   * Find account by user ID and email
   */
  async findByUserAndEmail(userId: string, email: string): Promise<Result<EmailAccount, BaseError>> {
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
        new DatabaseError('Failed to find email account by user and email', error as Error, { userId, email })
      );
    }
  }

  /**
   * Find account by Outlook subscription ID
   * Returns null if not found (used in webhook handlers)
   */
  async findBySubscriptionId(subscriptionId: string): Promise<EmailAccount | null> {
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
        return null;
      }

      // Should only be one account per subscription
      const result = EmailAccountPrismaMapper.toDomain(prismaAccounts[0]);
      return result.isOk() ? result.value : null;
    } catch (error) {
      console.error('Failed to find account by subscription ID:', error);
      return null;
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
        new DatabaseError('Failed to find accounts by user', error as Error, { userId, filters })
      );
    }
  }

  /**
   * Find all active accounts (for background jobs)
   * Returns empty array if error occurs
   */
  async findAllActive(filters?: { provider?: EmailProvider }): Promise<EmailAccount[]> {
    try {
      const where: any = { isActive: true };

      if (filters?.provider) {
        where.provider = this.mapProviderToString(filters.provider);
      }

      const prismaAccounts = await this.prisma.emailAccount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      const result = EmailAccountPrismaMapper.toDomainList(prismaAccounts);
      return result.isOk() ? result.value : [];
    } catch (error) {
      console.error('Failed to find all active accounts:', error);
      return [];
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
        new DatabaseError('Failed to create email account', error as Error, {
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
        new DatabaseError('Failed to update email account', error as Error, {
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

      return Result.fail(new DatabaseError('Failed to delete email account', error as Error, { id }));
    }
  }

  /**
   * Check if account exists
   * Returns false if error occurs
   */
  async exists(userId: string, email: string): Promise<boolean> {
    try {
      const count = await this.prisma.emailAccount.count({
        where: {
          userId,
          email,
        },
      });

      return count > 0;
    } catch (error) {
      console.error('Failed to check if account exists:', error);
      return false;
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
