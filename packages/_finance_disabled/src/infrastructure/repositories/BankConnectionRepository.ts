/**
 * BankConnectionRepository
 *
 * Prisma implementation of IBankConnectionRepository.
 * Manages bank connection persistence with encrypted OAuth tokens.
 */

import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeOS/core/shared/errors';
import { IBankConnectionRepository } from '../../domain/interfaces/IBankConnectionRepository';
import { BankConnection } from '../../domain/entities/BankConnection';
import { ConnectionStatus } from '../../domain/value-objects/BankEnums';
import { BankConnectionMapper } from '../mappers/BankConnectionMapper';

/**
 * Bank Connection Repository Implementation with Prisma
 *
 * All operations return Result<T, E> for functional error handling.
 */
export class BankConnectionRepository implements IBankConnectionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find connection by ID
   */
  async findById(id: string): Promise<Result<BankConnection, BaseError>> {
    try {
      const connection = await this.prisma.bankConnection.findUnique({
        where: { id },
      });

      if (!connection) {
        return Result.fail(new NotFoundError('BankConnection', id));
      }

      return Result.ok(BankConnectionMapper.toDomain(connection));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find bank connection', error)
      );
    }
  }

  /**
   * Find connection by user and provider
   */
  async findByUserAndProvider(
    userId: string,
    provider: string
  ): Promise<Result<BankConnection | null, BaseError>> {
    try {
      const connection = await this.prisma.bankConnection.findFirst({
        where: {
          userId,
          provider,
        },
      });

      if (!connection) {
        return Result.ok(null);
      }

      return Result.ok(BankConnectionMapper.toDomain(connection));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find bank connection by user and provider', error)
      );
    }
  }

  /**
   * Find all connections for a user
   */
  async findByUserId(userId: string): Promise<Result<BankConnection[], BaseError>> {
    try {
      const connections = await this.prisma.bankConnection.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(connections.map(BankConnectionMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find bank connections by user', error)
      );
    }
  }

  /**
   * Find all connections with specific status
   */
  async findByStatus(status: ConnectionStatus): Promise<Result<BankConnection[], BaseError>> {
    try {
      const connections = await this.prisma.bankConnection.findMany({
        where: { status },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(connections.map(BankConnectionMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find bank connections by status', error)
      );
    }
  }

  /**
   * Find all active connections that need token refresh
   *
   * Returns connections that are active and tokens expire within next 5 minutes
   */
  async findNeedingRefresh(): Promise<Result<BankConnection[], BaseError>> {
    try {
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

      const connections = await this.prisma.bankConnection.findMany({
        where: {
          status: ConnectionStatus.ACTIVE,
          tokenExpiresAt: {
            lte: fiveMinutesFromNow,
          },
        },
      });

      return Result.ok(connections.map(BankConnectionMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find connections needing refresh', error)
      );
    }
  }

  /**
   * Find all active connections (for scheduled sync)
   */
  async findActiveConnections(): Promise<Result<BankConnection[], BaseError>> {
    try {
      const connections = await this.prisma.bankConnection.findMany({
        where: {
          status: ConnectionStatus.ACTIVE,
          tokenExpiresAt: {
            gt: new Date(), // Token not expired
          },
        },
        orderBy: { lastSyncAt: 'asc' }, // Oldest sync first
      });

      return Result.ok(connections.map(BankConnectionMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find active connections', error)
      );
    }
  }

  /**
   * Save (create or update) connection
   */
  async save(connection: BankConnection): Promise<Result<BankConnection, BaseError>> {
    try {
      // Check if connection exists
      const existing = await this.prisma.bankConnection.findUnique({
        where: { id: connection.id },
      });

      let saved;
      if (existing) {
        // Update existing
        const data = BankConnectionMapper.toUpdateData(connection);
        saved = await this.prisma.bankConnection.update({
          where: { id: connection.id },
          data,
        });
      } else {
        // Create new
        const data = BankConnectionMapper.toCreateData(connection);
        saved = await this.prisma.bankConnection.create({
          data,
        });
      }

      return Result.ok(BankConnectionMapper.toDomain(saved));
    } catch (error: any) {
      if (error.code === 'P2025') {
        return Result.fail(new NotFoundError('BankConnection', connection.id));
      }

      return Result.fail(
        new DatabaseError('Failed to save bank connection', error)
      );
    }
  }

  /**
   * Delete connection
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.bankConnection.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return Result.fail(new NotFoundError('BankConnection', id));
      }

      return Result.fail(
        new DatabaseError('Failed to delete bank connection', error)
      );
    }
  }

  /**
   * Update last sync timestamp
   */
  async updateLastSync(id: string, syncTime: Date): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.bankConnection.update({
        where: { id },
        data: {
          lastSyncAt: syncTime,
          updatedAt: new Date(),
        },
      });

      return Result.ok(undefined);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return Result.fail(new NotFoundError('BankConnection', id));
      }

      return Result.fail(
        new DatabaseError('Failed to update last sync time', error)
      );
    }
  }
}
