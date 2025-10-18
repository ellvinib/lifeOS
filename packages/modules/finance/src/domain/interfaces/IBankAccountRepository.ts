/**
 * IBankAccountRepository
 *
 * Repository interface for BankAccount entity.
 * Follows repository pattern with Result types for error handling.
 */

import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { BankAccount } from '../entities/BankAccount';

export interface IBankAccountRepository {
  /**
   * Find account by ID
   */
  findById(id: string): Promise<Result<BankAccount, BaseError>>;

  /**
   * Find account by external ID (Ibanity ID)
   */
  findByExternalId(
    connectionId: string,
    externalId: string
  ): Promise<Result<BankAccount | null, BaseError>>;

  /**
   * Find all accounts for a connection
   */
  findByConnectionId(connectionId: string): Promise<Result<BankAccount[], BaseError>>;

  /**
   * Find all accounts for a user (across all connections)
   */
  findByUserId(userId: string): Promise<Result<BankAccount[], BaseError>>;

  /**
   * Find accounts that have sync enabled
   */
  findSyncEnabledAccounts(connectionId: string): Promise<Result<BankAccount[], BaseError>>;

  /**
   * Save (create or update) account
   */
  save(account: BankAccount): Promise<Result<BankAccount, BaseError>>;

  /**
   * Save multiple accounts (bulk insert/update)
   */
  saveMany(accounts: BankAccount[]): Promise<Result<BankAccount[], BaseError>>;

  /**
   * Delete account
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Count accounts by connection
   */
  countByConnection(connectionId: string): Promise<Result<number, BaseError>>;
}
