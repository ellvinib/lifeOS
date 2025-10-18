import { TransactionClassification as PrismaTransactionClassification } from '@prisma/client';
import { TransactionClassification, FeedbackType } from '../../domain/entities/TransactionClassification';
import { ExpenseCategory } from '../../domain/entities/Expense';

/**
 * Transaction Classification Mapper
 *
 * Maps between Prisma TransactionClassification model and domain TransactionClassification entity.
 */
export class TransactionClassificationMapper {
  /**
   * Convert Prisma model to domain entity
   */
  public static toDomain(prisma: PrismaTransactionClassification): TransactionClassification {
    return TransactionClassification.reconstitute({
      id: prisma.id,
      userId: prisma.userId,
      transactionId: prisma.transactionId,
      suggestedCategory: prisma.suggestedCategory as ExpenseCategory | undefined,
      actualCategory: prisma.actualCategory as ExpenseCategory,
      confidence: prisma.confidence || undefined,
      feedbackType: prisma.feedbackType as FeedbackType,
      createdAt: prisma.createdAt,
    });
  }

  /**
   * Convert domain entity to Prisma model data
   */
  public static toPrisma(classification: TransactionClassification): Omit<PrismaTransactionClassification, 'id' | 'createdAt'> {
    return {
      userId: classification.userId,
      transactionId: classification.transactionId,
      suggestedCategory: classification.suggestedCategory || null,
      actualCategory: classification.actualCategory,
      confidence: classification.confidence || null,
      feedbackType: classification.feedbackType,
    };
  }

  /**
   * Convert domain entity to Prisma create data
   */
  public static toCreateData(classification: TransactionClassification) {
    return {
      id: classification.id,
      ...this.toPrisma(classification),
      createdAt: classification.createdAt,
    };
  }
}
