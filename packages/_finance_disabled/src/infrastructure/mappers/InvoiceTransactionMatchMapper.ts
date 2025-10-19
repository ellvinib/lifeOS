import { FinanceInvoiceTransactionMatch as PrismaMatch } from '@prisma/client';
import { InvoiceTransactionMatch } from '../../domain/entities';
import { MatchConfidence } from '../../domain/value-objects/InvoiceEnums';

/**
 * InvoiceTransactionMatch Mapper
 *
 * Maps between Prisma FinanceInvoiceTransactionMatch model and domain InvoiceTransactionMatch entity.
 * Handles type conversions and data transformations.
 */
export class InvoiceTransactionMatchMapper {
  /**
   * Convert Prisma model to domain entity
   */
  public static toDomain(prisma: PrismaMatch): InvoiceTransactionMatch {
    return InvoiceTransactionMatch.reconstitute({
      id: prisma.id,
      invoiceId: prisma.invoiceId,
      transactionId: prisma.transactionId,
      matchConfidence: prisma.matchConfidence as MatchConfidence,
      matchScore: prisma.matchScore,
      matchedBy: prisma.matchedBy as 'system' | 'user',
      matchedByUserId: prisma.matchedByUserId || undefined,
      notes: prisma.notes || undefined,
      metadata: (prisma.metadata as Record<string, unknown>) || undefined,
      matchedAt: prisma.matchedAt,
      createdAt: prisma.createdAt,
    });
  }

  /**
   * Convert domain entity to Prisma model data
   */
  public static toPrisma(
    match: InvoiceTransactionMatch
  ): Omit<PrismaMatch, 'id' | 'createdAt' | 'matchedAt'> {
    return {
      invoiceId: match.invoiceId,
      transactionId: match.transactionId,
      matchConfidence: match.matchConfidence,
      matchScore: match.matchScore,
      matchedBy: match.matchedBy,
      matchedByUserId: match.matchedByUserId || null,
      notes: match.notes || null,
      metadata: (match.metadata as any) || {},
    };
  }

  /**
   * Convert domain entity to Prisma create data
   */
  public static toCreateData(match: InvoiceTransactionMatch) {
    return {
      id: match.id,
      ...this.toPrisma(match),
      matchedAt: match.matchedAt,
      createdAt: match.createdAt,
    };
  }

  /**
   * Convert domain entity to Prisma update data
   */
  public static toUpdateData(match: InvoiceTransactionMatch) {
    return {
      ...this.toPrisma(match),
      // Note: matchedAt is immutable, so we don't update it
    };
  }
}
