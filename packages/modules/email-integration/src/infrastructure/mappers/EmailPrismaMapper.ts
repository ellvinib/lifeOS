import { Email as PrismaEmail, EmailProvider as PrismaEmailProvider } from '@prisma/client';
import { Email } from '../../domain/entities/Email';
import { EmailProvider } from '../../domain/value-objects/EmailProvider';
import { EmailAddress } from '../../domain/value-objects/EmailAddress';
import { Result } from '@lifeOS/core/shared/result/Result';
import { ValidationError } from '@lifeOS/core/shared/errors/ValidationError';

/**
 * Email Prisma Mapper
 *
 * Maps between Prisma database models and Domain entities for Email.
 *
 * Design Pattern: Data Mapper
 * - Handles array field serialization (to[], labels[])
 * - Maps EmailAddress value objects
 * - Ensures domain entities remain pure
 */
export class EmailPrismaMapper {
  /**
   * Map Prisma model to Domain entity
   * @param prismaEmail - Prisma Email model
   * @returns Domain Email entity or ValidationError
   */
  static toDomain(prismaEmail: PrismaEmail): Result<Email, ValidationError> {
    try {
      // Parse from address
      const fromResult = EmailAddress.create(prismaEmail.from, prismaEmail.fromName);
      if (fromResult.isFail()) {
        return Result.fail(fromResult.error);
      }

      // Parse to addresses (array)
      const toAddresses: EmailAddress[] = [];
      for (const toEmail of prismaEmail.to) {
        const toResult = EmailAddress.create(toEmail);
        if (toResult.isFail()) {
          return Result.fail(toResult.error);
        }
        toAddresses.push(toResult.value);
      }

      // Map provider enum
      const provider = this.mapProviderToDomain(prismaEmail.provider);

      // Create domain entity
      const email = Email.create({
        id: prismaEmail.id,
        accountId: prismaEmail.accountId,
        providerMessageId: prismaEmail.providerMessageId,
        provider,
        from: fromResult.value,
        to: toAddresses,
        subject: prismaEmail.subject,
        snippet: prismaEmail.snippet,
        hasAttachments: prismaEmail.hasAttachments,
        timestamp: prismaEmail.timestamp,
        labels: prismaEmail.labels || [],
        createdAt: prismaEmail.createdAt,
        updatedAt: prismaEmail.updatedAt,
      });

      return Result.ok(email);
    } catch (error) {
      return Result.fail(
        new ValidationError('Failed to map Email from Prisma', [
          {
            field: 'email',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ])
      );
    }
  }

  /**
   * Map Domain entity to Prisma model
   * @param email - Domain Email entity
   * @returns Prisma Email model data
   */
  static toPersistence(email: Email): {
    id: string;
    accountId: string;
    providerMessageId: string;
    provider: PrismaEmailProvider;
    from: string;
    fromName: string | null;
    to: string[];
    subject: string;
    snippet: string;
    hasAttachments: boolean;
    timestamp: Date;
    labels: string[];
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: email.id,
      accountId: email.accountId,
      providerMessageId: email.providerMessageId,
      provider: this.mapProviderToPrisma(email.provider),
      from: email.from.address,
      fromName: email.from.name || null,
      to: email.to.map((addr) => addr.address),
      subject: email.subject,
      snippet: email.snippet,
      hasAttachments: email.hasAttachmentsFlag,
      timestamp: email.timestamp,
      labels: email.labels,
      createdAt: email.createdAt,
      updatedAt: email.updatedAt,
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
   * @param prismaEmails - Array of Prisma models
   * @returns Array of Domain entities or ValidationError
   */
  static toDomainList(prismaEmails: PrismaEmail[]): Result<Email[], ValidationError> {
    const results = prismaEmails.map((prismaEmail) => this.toDomain(prismaEmail));

    // Check if any mapping failed
    const failures = results.filter((r) => r.isFail());
    if (failures.length > 0) {
      return Result.fail(
        new ValidationError('Failed to map some Emails', [
          {
            field: 'emails',
            message: `${failures.length} email(s) failed to map`,
          },
        ])
      );
    }

    // All mappings succeeded
    const emails = results.map((r) => r.value!);
    return Result.ok(emails);
  }
}
