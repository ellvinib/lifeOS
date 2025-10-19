import { EmailAccount as PrismaEmailAccount, EmailProvider as PrismaEmailProvider } from '@prisma/client';
import { EmailAccount } from '../../domain/entities/EmailAccount';
import { EmailProvider } from '../../domain/value-objects/EmailProvider';
import { Result } from '@lifeos/core/shared/result';
import { ValidationError } from '@lifeos/core/shared/errors';

/**
 * EmailAccount Prisma Mapper
 *
 * Maps between Prisma database models and Domain entities.
 *
 * Design Pattern: Data Mapper
 * - Separates domain logic from persistence
 * - Handles JSON serialization for providerData
 * - Ensures domain entities remain pure
 */
export class EmailAccountPrismaMapper {
  /**
   * Map Prisma model to Domain entity
   * @param prismaAccount - Prisma EmailAccount model
   * @returns Domain EmailAccount entity or ValidationError
   */
  static toDomain(prismaAccount: PrismaEmailAccount): Result<EmailAccount, ValidationError> {
    try {
      // Map provider enum
      const provider = this.mapProviderToDomain(prismaAccount.provider);

      // Parse providerData JSON
      const providerData =
        typeof prismaAccount.providerData === 'string'
          ? JSON.parse(prismaAccount.providerData)
          : prismaAccount.providerData;

      // Reconstruct domain entity from persistence
      const account = EmailAccount.fromPersistence({
        id: prismaAccount.id,
        userId: prismaAccount.userId,
        provider,
        email: prismaAccount.email,
        emailName: prismaAccount.emailName,
        isActive: prismaAccount.isActive,
        lastSyncedAt: prismaAccount.lastSyncedAt,
        providerData,
        encryptedCredentials: prismaAccount.encryptedCredentials,
        createdAt: prismaAccount.createdAt,
        updatedAt: prismaAccount.updatedAt,
      });

      return Result.ok(account);
    } catch (error) {
      return Result.fail(
        new ValidationError('Failed to map EmailAccount from Prisma', [
          {
            field: 'emailAccount',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ])
      );
    }
  }

  /**
   * Map Domain entity to Prisma model
   * @param account - Domain EmailAccount entity
   * @returns Prisma EmailAccount model data
   */
  static toPersistence(account: EmailAccount): {
    id: string;
    userId: string;
    provider: PrismaEmailProvider;
    email: string;
    emailName: string | null;
    isActive: boolean;
    lastSyncedAt: Date | null;
    providerData: any; // JSON field
    encryptedCredentials: string;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: account.id,
      userId: account.userId,
      provider: this.mapProviderToPrisma(account.provider),
      email: account.emailAddress.address,
      emailName: account.emailAddress.name || null,
      isActive: account.isActive,
      lastSyncedAt: account.lastSyncedAt || null,
      providerData: account.providerData, // Prisma handles JSON serialization
      encryptedCredentials: account.encryptedCredentials,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  /**
   * Map Prisma provider enum to Domain provider enum
   */
  private static mapProviderToDomain(prismaProvider: PrismaEmailProvider): EmailProvider {
    switch (prismaProvider) {
      case 'GMAIL':
        return EmailProvider.GMAIL;
      case 'OUTLOOK':
        return EmailProvider.OUTLOOK;
      case 'SMTP':
        return EmailProvider.SMTP;
      default:
        throw new Error(`Unknown provider: ${prismaProvider}`);
    }
  }

  /**
   * Map Domain provider enum to Prisma provider enum
   */
  private static mapProviderToPrisma(provider: EmailProvider): PrismaEmailProvider {
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

  /**
   * Map array of Prisma models to Domain entities
   * @param prismaAccounts - Array of Prisma models
   * @returns Array of Domain entities (filters out mapping failures)
   */
  static toDomainList(
    prismaAccounts: PrismaEmailAccount[]
  ): Result<EmailAccount[], ValidationError> {
    const results = prismaAccounts.map((prismaAccount) => this.toDomain(prismaAccount));

    // Check if any mapping failed
    const failures = results.filter((r) => r.isFail());
    if (failures.length > 0) {
      return Result.fail(
        new ValidationError('Failed to map some EmailAccounts', [
          {
            field: 'emailAccounts',
            message: `${failures.length} account(s) failed to map`,
          },
        ])
      );
    }

    // All mappings succeeded
    const accounts = results.map((r) => r.value!);
    return Result.ok(accounts);
  }
}
