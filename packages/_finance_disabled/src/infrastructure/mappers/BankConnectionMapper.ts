/**
 * BankConnectionMapper
 *
 * Maps between BankConnection domain entity and Prisma database model.
 * Handles conversion of enums and date types.
 */

import { BankConnection as PrismaBankConnection } from '@prisma/client';
import { BankConnection } from '../../domain/entities/BankConnection';
import { BankProvider, ConnectionStatus } from '../../domain/value-objects/BankEnums';

export class BankConnectionMapper {
  /**
   * Convert Prisma model to Domain entity
   */
  static toDomain(prisma: PrismaBankConnection): BankConnection {
    return BankConnection.fromPersistence({
      id: prisma.id,
      userId: prisma.userId,
      provider: prisma.provider as BankProvider,
      encryptedAccessToken: prisma.encryptedAccessToken,
      encryptedRefreshToken: prisma.encryptedRefreshToken,
      tokenExpiresAt: prisma.tokenExpiresAt,
      accountInformationConsentId: prisma.accountInformationConsentId ?? undefined,
      status: prisma.status as ConnectionStatus,
      lastSyncAt: prisma.lastSyncAt ?? undefined,
      createdAt: prisma.createdAt,
      updatedAt: prisma.updatedAt,
    });
  }

  /**
   * Convert Domain entity to Prisma create data
   */
  static toCreateData(connection: BankConnection) {
    return {
      id: connection.id,
      userId: connection.userId,
      provider: connection.provider,
      encryptedAccessToken: connection.encryptedAccessToken,
      encryptedRefreshToken: connection.encryptedRefreshToken,
      tokenExpiresAt: connection.tokenExpiresAt,
      accountInformationConsentId: connection.accountInformationConsentId,
      status: connection.status,
      lastSyncAt: connection.lastSyncAt,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  /**
   * Convert Domain entity to Prisma update data
   */
  static toUpdateData(connection: BankConnection) {
    return {
      encryptedAccessToken: connection.encryptedAccessToken,
      encryptedRefreshToken: connection.encryptedRefreshToken,
      tokenExpiresAt: connection.tokenExpiresAt,
      accountInformationConsentId: connection.accountInformationConsentId,
      status: connection.status,
      lastSyncAt: connection.lastSyncAt,
      updatedAt: connection.updatedAt,
    };
  }
}
