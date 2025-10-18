/**
 * Calendar Connection Repository Implementation
 *
 * Implements calendar provider connection persistence using Prisma ORM.
 * All operations return Result<T, E> for functional error handling.
 *
 * @module Calendar Infrastructure
 */

import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeos/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeos/core/shared/errors';
import { ICalendarConnectionRepository } from '../../domain/interfaces/ICalendarConnectionRepository';
import { CalendarConnection } from '../../domain/entities/CalendarConnection';
import { CalendarProvider } from '../../domain/value-objects/CalendarEnums';
import { CalendarConnectionMapper } from '../mappers/CalendarConnectionMapper';

/**
 * Calendar Connection Repository with Prisma
 *
 * Handles all database operations for calendar provider connections.
 */
export class CalendarConnectionRepository implements ICalendarConnectionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find a single connection by ID
   */
  async findById(id: string): Promise<Result<CalendarConnection, BaseError>> {
    try {
      const connection = await this.prisma.calendarConnection.findUnique({
        where: { id },
      });

      if (!connection) {
        return Result.fail(new NotFoundError('CalendarConnection', id));
      }

      return Result.ok(CalendarConnectionMapper.toDomain(connection));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find calendar connection', error));
    }
  }

  /**
   * Find all connections for a user
   */
  async findByUserId(userId: string): Promise<Result<CalendarConnection[], BaseError>> {
    try {
      const connections = await this.prisma.calendarConnection.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(connections.map(CalendarConnectionMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find calendar connections by user', error)
      );
    }
  }

  /**
   * Find all active connections for a user
   */
  async findActiveByUserId(userId: string): Promise<Result<CalendarConnection[], BaseError>> {
    try {
      const connections = await this.prisma.calendarConnection.findMany({
        where: {
          userId,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(connections.map(CalendarConnectionMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find active calendar connections', error)
      );
    }
  }

  /**
   * Find connections that need syncing
   */
  async findNeedingSync(userId: string): Promise<Result<CalendarConnection[], BaseError>> {
    try {
      // Find connections that:
      // 1. Are active
      // 2. Haven't been synced in the last 5 minutes
      // 3. Are not currently syncing
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

      const connections = await this.prisma.calendarConnection.findMany({
        where: {
          userId,
          isActive: true,
          syncStatus: {
            not: 'syncing',
          },
          OR: [
            { lastSyncedAt: null },
            { lastSyncedAt: { lt: fiveMinutesAgo } },
          ],
        },
        orderBy: { lastSyncedAt: 'asc' },
      });

      return Result.ok(connections.map(CalendarConnectionMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find connections needing sync', error)
      );
    }
  }

  /**
   * Find connection by provider and external calendar ID
   */
  async findByExternalId(
    userId: string,
    provider: CalendarProvider,
    externalCalendarId: string
  ): Promise<Result<CalendarConnection, BaseError>> {
    try {
      const connection = await this.prisma.calendarConnection.findUnique({
        where: {
          userId_provider_externalCalendarId: {
            userId,
            provider,
            externalCalendarId,
          },
        },
      });

      if (!connection) {
        return Result.fail(
          new NotFoundError(
            'CalendarConnection',
            `${provider}:${externalCalendarId}`
          )
        );
      }

      return Result.ok(CalendarConnectionMapper.toDomain(connection));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find connection by external ID', error)
      );
    }
  }

  /**
   * Check if user has a connection to a specific provider
   */
  async hasProviderConnection(
    userId: string,
    provider: CalendarProvider
  ): Promise<Result<boolean, BaseError>> {
    try {
      const count = await this.prisma.calendarConnection.count({
        where: {
          userId,
          provider,
          isActive: true,
        },
      });

      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to check provider connection', error)
      );
    }
  }

  /**
   * Create a new calendar connection
   */
  async create(connection: CalendarConnection): Promise<Result<CalendarConnection, BaseError>> {
    try {
      const prismaConnection = await this.prisma.calendarConnection.create({
        data: CalendarConnectionMapper.toPrismaCreate(connection),
      });

      return Result.ok(CalendarConnectionMapper.toDomain(prismaConnection));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to create calendar connection', error));
    }
  }

  /**
   * Update an existing calendar connection
   */
  async update(connection: CalendarConnection): Promise<Result<CalendarConnection, BaseError>> {
    try {
      const prismaConnection = await this.prisma.calendarConnection.update({
        where: { id: connection.id },
        data: CalendarConnectionMapper.toPrismaUpdate(connection),
      });

      return Result.ok(CalendarConnectionMapper.toDomain(prismaConnection));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to update calendar connection', error));
    }
  }

  /**
   * Delete a calendar connection
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.calendarConnection.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to delete calendar connection', error));
    }
  }
}
