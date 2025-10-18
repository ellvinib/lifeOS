/**
 * BankAccountRepository
 *
 * Prisma implementation of IBankAccountRepository.
 * Manages bank account persistence and sync settings.
 */

import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeOS/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeOS/core/shared/errors';
import { IBankAccountRepository } from '../../domain/interfaces/IBankAccountRepository';
import { BankAccount } from '../../domain/entities/BankAccount';
import { BankAccountMapper } from '../mappers/BankAccountMapper';

/**
 * Bank Account Repository Implementation with Prisma
 *
 * All operations return Result<T, E> for functional error handling.
 */
export class BankAccountRepository implements IBankAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find account by ID
   */
  async findById(id: string): Promise<Result<BankAccount, BaseError>> {
    try {
      const account = await this.prisma.bankAccount.findUnique({
        where: { id },
      });

      if (!account) {
        return Result.fail(new NotFoundError('BankAccount', id));
      }

      return Result.ok(BankAccountMapper.toDomain(account));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find bank account', error)
      );
    }
  }

  /**
   * Find account by external ID (Ibanity ID)
   */
  async findByExternalId(
    connectionId: string,
    externalId: string
  ): Promise<Result<BankAccount | null, BaseError>> {
    try {
      const account = await this.prisma.bankAccount.findUnique({
        where: {
          connectionId_externalId: {
            connectionId,
            externalId,
          },
        },
      });

      if (!account) {
        return Result.ok(null);
      }

      return Result.ok(BankAccountMapper.toDomain(account));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find bank account by external ID', error)
      );
    }
  }

  /**
   * Find all accounts for a connection
   */
  async findByConnectionId(connectionId: string): Promise<Result<BankAccount[], BaseError>> {
    try {
      const accounts = await this.prisma.bankAccount.findMany({
        where: { connectionId },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(accounts.map(BankAccountMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find bank accounts by connection', error)
      );
    }
  }

  /**
   * Find accounts by user (across all connections)
   */
  async findByUserId(userId: string): Promise<Result<BankAccount[], BaseError>> {
    try {
      const accounts = await this.prisma.bankAccount.findMany({
        where: {
          connection: {
            userId,
          },
        },
        include: {
          connection: {
            select: {
              provider: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return Result.ok(accounts.map(BankAccountMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find bank accounts by user', error)
      );
    }
  }

  /**
   * Find accounts with sync enabled
   */
  async findSyncEnabledAccounts(connectionId: string): Promise<Result<BankAccount[], BaseError>> {
    try {
      const accounts = await this.prisma.bankAccount.findMany({
        where: {
          connectionId,
          syncEnabled: true,
        },
      });

      return Result.ok(accounts.map(BankAccountMapper.toDomain));
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to find sync-enabled accounts', error)
      );
    }
  }

  /**
   * Save (create or update) account
   */
  async save(account: BankAccount): Promise<Result<BankAccount, BaseError>> {
    try {
      // Check if account exists
      const existing = await this.prisma.bankAccount.findUnique({
        where: { id: account.id },
      });

      let saved;
      if (existing) {
        // Update existing
        const data = BankAccountMapper.toUpdateData(account);
        saved = await this.prisma.bankAccount.update({
          where: { id: account.id },
          data,
        });
      } else {
        // Create new
        const data = BankAccountMapper.toCreateData(account);
        saved = await this.prisma.bankAccount.create({
          data,
        });
      }

      return Result.ok(BankAccountMapper.toDomain(saved));
    } catch (error: any) {
      if (error.code === 'P2025') {
        return Result.fail(new NotFoundError('BankAccount', account.id));
      }

      return Result.fail(
        new DatabaseError('Failed to save bank account', error)
      );
    }
  }

  /**
   * Save multiple accounts (bulk insert/update for sync)
   */
  async saveMany(accounts: BankAccount[]): Promise<Result<BankAccount[], BaseError>> {
    try {
      const saved: BankAccount[] = [];

      // Use transaction for atomicity
      await this.prisma.$transaction(async (tx) => {
        for (const account of accounts) {
          // Check if account exists
          const existing = await tx.bankAccount.findUnique({
            where: { id: account.id },
          });

          let savedAccount;
          if (existing) {
            // Update existing
            const data = BankAccountMapper.toUpdateData(account);
            savedAccount = await tx.bankAccount.update({
              where: { id: account.id },
              data,
            });
          } else {
            // Create new
            const data = BankAccountMapper.toCreateData(account);
            savedAccount = await tx.bankAccount.create({
              data,
            });
          }

          saved.push(BankAccountMapper.toDomain(savedAccount));
        }
      });

      return Result.ok(saved);
    } catch (error) {
      return Result.fail(
        new DatabaseError('Failed to save bank accounts', error)
      );
    }
  }

  /**
   * Delete account
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.bankAccount.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return Result.fail(new NotFoundError('BankAccount', id));
      }

      return Result.fail(
        new DatabaseError('Failed to delete bank account', error)
      );
    }
  }

  /**
   * Toggle sync for account
   */
  async toggleSync(id: string, enabled: boolean): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.bankAccount.update({
        where: { id },
        data: {
          syncEnabled: enabled,
          updatedAt: new Date(),
        },
      });

      return Result.ok(undefined);
    } catch (error: any) {
      if (error.code === 'P2025') {
        return Result.fail(new NotFoundError('BankAccount', id));
      }

      return Result.fail(
        new DatabaseError('Failed to toggle sync', error)
      );
    }
  }
}
