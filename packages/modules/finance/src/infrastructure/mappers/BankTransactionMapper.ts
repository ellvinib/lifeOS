/**
 * BankTransactionMapper
 *
 * Maps between BankTransaction domain entity and Prisma database model.
 * Handles reconciliation status and metadata fields.
 */

import { BankTransaction as PrismaBankTransaction } from '@prisma/client';
import { BankTransaction } from '../../domain/entities/BankTransaction';
import { ReconciliationStatus } from '../../domain/value-objects/BankEnums';

export class BankTransactionMapper {
  /**
   * Convert Prisma model to Domain entity
   */
  static toDomain(prisma: PrismaBankTransaction): BankTransaction {
    return BankTransaction.fromPersistence({
      id: prisma.id,
      bankAccountId: prisma.bankAccountId,
      externalId: prisma.externalId,
      amount: prisma.amount,
      currency: prisma.currency,
      description: prisma.description,
      counterPartyName: prisma.counterPartyName ?? undefined,
      counterPartyIban: prisma.counterPartyIban ?? undefined,
      executionDate: prisma.executionDate,
      valueDate: prisma.valueDate ?? undefined,
      reconciliationStatus: prisma.reconciliationStatus as ReconciliationStatus,
      reconciledExpenseId: prisma.reconciledExpenseId ?? undefined,
      suggestedCategory: prisma.suggestedCategory ?? undefined,
      confidenceScore: prisma.confidenceScore ?? undefined,
      createdAt: prisma.createdAt,
    });
  }

  /**
   * Convert Domain entity to Prisma create data
   */
  static toCreateData(transaction: BankTransaction) {
    return {
      id: transaction.id,
      bankAccountId: transaction.bankAccountId,
      externalId: transaction.externalId,
      amount: transaction.amount,
      currency: transaction.currency,
      description: transaction.description,
      counterPartyName: transaction.counterPartyName,
      counterPartyIban: transaction.counterPartyIban,
      executionDate: transaction.executionDate,
      valueDate: transaction.valueDate,
      reconciliationStatus: transaction.reconciliationStatus,
      reconciledExpenseId: transaction.reconciledExpenseId,
      suggestedCategory: transaction.suggestedCategory,
      confidenceScore: transaction.confidenceScore,
      createdAt: transaction.createdAt,
    };
  }

  /**
   * Convert Domain entity to Prisma update data
   */
  static toUpdateData(transaction: BankTransaction) {
    return {
      reconciliationStatus: transaction.reconciliationStatus,
      reconciledExpenseId: transaction.reconciledExpenseId,
      suggestedCategory: transaction.suggestedCategory,
      confidenceScore: transaction.confidenceScore,
    };
  }
}
