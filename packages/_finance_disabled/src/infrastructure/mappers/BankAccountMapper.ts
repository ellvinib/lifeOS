/**
 * BankAccountMapper
 *
 * Maps between BankAccount domain entity and Prisma database model.
 * Handles conversion of nullable fields.
 */

import { BankAccount as PrismaBankAccount } from '@prisma/client';
import { BankAccount } from '../../domain/entities/BankAccount';

export class BankAccountMapper {
  /**
   * Convert Prisma model to Domain entity
   */
  static toDomain(prisma: PrismaBankAccount): BankAccount {
    return BankAccount.fromPersistence({
      id: prisma.id,
      connectionId: prisma.connectionId,
      externalId: prisma.externalId,
      iban: prisma.iban ?? undefined,
      accountHolderName: prisma.accountHolderName ?? undefined,
      accountName: prisma.accountName ?? undefined,
      currency: prisma.currency,
      currentBalance: prisma.currentBalance ?? undefined,
      availableBalance: prisma.availableBalance ?? undefined,
      institutionName: prisma.institutionName ?? undefined,
      syncEnabled: prisma.syncEnabled,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    });
  }

  /**
   * Convert Domain entity to Prisma create data
   */
  static toCreateData(account: BankAccount) {
    return {
      id: account.id,
      connectionId: account.connectionId,
      externalId: account.externalId,
      iban: account.iban,
      accountHolderName: account.accountHolderName,
      accountName: account.accountName,
      currency: account.currency,
      currentBalance: account.currentBalance,
      availableBalance: account.availableBalance,
      institutionName: account.institutionName,
      syncEnabled: account.syncEnabled,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  /**
   * Convert Domain entity to Prisma update data
   */
  static toUpdateData(account: BankAccount) {
    return {
      accountName: account.accountName,
      currentBalance: account.currentBalance,
      availableBalance: account.availableBalance,
      syncEnabled: account.syncEnabled,
      updatedAt: account.updatedAt,
    };
  }
}
