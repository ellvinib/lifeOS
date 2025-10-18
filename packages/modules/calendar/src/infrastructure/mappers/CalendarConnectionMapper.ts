/**
 * Calendar Connection Mapper
 *
 * Maps between Prisma CalendarConnection model and domain CalendarConnection entity.
 * Handles conversion of Prisma types to domain value objects.
 *
 * @module Calendar Infrastructure
 */

import { CalendarConnection as PrismaCalendarConnection } from '@prisma/client';
import { CalendarConnection } from '../../domain/entities/CalendarConnection';
import { CalendarProvider, SyncStatus } from '../../domain/value-objects';

/**
 * Mapper for CalendarConnection entity
 */
export class CalendarConnectionMapper {
  /**
   * Convert Prisma model to domain entity
   *
   * @param prismaConnection - Prisma CalendarConnection model
   * @returns Domain CalendarConnection entity
   */
  static toDomain(prismaConnection: PrismaCalendarConnection): CalendarConnection {
    return new CalendarConnection({
      id: prismaConnection.id,
      userId: prismaConnection.userId,
      provider: prismaConnection.provider as CalendarProvider,
      externalCalendarId: prismaConnection.externalCalendarId,
      encryptedAccessToken: prismaConnection.encryptedAccessToken,
      encryptedRefreshToken: prismaConnection.encryptedRefreshToken || undefined,
      tokenExpiresAt: prismaConnection.tokenExpiresAt || undefined,
      syncStatus: prismaConnection.syncStatus as SyncStatus,
      lastSyncedAt: prismaConnection.lastSyncedAt || undefined,
      lastSyncError: prismaConnection.lastSyncError || undefined,
      syncErrorCount: prismaConnection.syncErrorCount,
      isActive: prismaConnection.isActive,
      calendarName: prismaConnection.calendarName || undefined,
      calendarColor: prismaConnection.calendarColor || undefined,
      timeZone: prismaConnection.timeZone || undefined,
      metadata: prismaConnection.metadata as Record<string, any>,
      createdAt: prismaConnection.createdAt,
      updatedAt: prismaConnection.updatedAt,
    });
  }

  /**
   * Convert domain entity to Prisma create input
   *
   * @param connection - Domain CalendarConnection entity
   * @returns Prisma create input
   */
  static toPrismaCreate(connection: CalendarConnection): any {
    return {
      id: connection.id,
      userId: connection.userId,
      provider: connection.provider,
      externalCalendarId: connection.externalCalendarId,
      encryptedAccessToken: connection.encryptedAccessToken,
      encryptedRefreshToken: connection.encryptedRefreshToken || null,
      tokenExpiresAt: connection.tokenExpiresAt || null,
      syncStatus: connection.syncStatus,
      lastSyncedAt: connection.lastSyncedAt || null,
      lastSyncError: connection.lastSyncError || null,
      syncErrorCount: connection.syncErrorCount,
      isActive: connection.isActive,
      calendarName: connection.calendarName || null,
      calendarColor: connection.calendarColor || null,
      timeZone: connection.timeZone || null,
      metadata: connection.metadata,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  /**
   * Convert domain entity to Prisma update input
   *
   * @param connection - Domain CalendarConnection entity
   * @returns Prisma update input
   */
  static toPrismaUpdate(connection: CalendarConnection): any {
    return {
      encryptedAccessToken: connection.encryptedAccessToken,
      encryptedRefreshToken: connection.encryptedRefreshToken || null,
      tokenExpiresAt: connection.tokenExpiresAt || null,
      syncStatus: connection.syncStatus,
      lastSyncedAt: connection.lastSyncedAt || null,
      lastSyncError: connection.lastSyncError || null,
      syncErrorCount: connection.syncErrorCount,
      isActive: connection.isActive,
      calendarName: connection.calendarName || null,
      calendarColor: connection.calendarColor || null,
      timeZone: connection.timeZone || null,
      metadata: connection.metadata,
      updatedAt: new Date(),
    };
  }
}
