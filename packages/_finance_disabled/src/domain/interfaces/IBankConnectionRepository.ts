/**
 * IBankConnectionRepository
 *
 * Repository interface for BankConnection entity.
 * Follows repository pattern with Result types for error handling.
 */

import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { BankConnection } from '../entities/BankConnection';
import { ConnectionStatus } from '../value-objects/BankEnums';

export interface IBankConnectionRepository {
  /**
   * Find connection by ID
   */
  findById(id: string): Promise<Result<BankConnection, BaseError>>;

  /**
   * Find connection by user ID and provider
   */
  findByUserAndProvider(
    userId: string,
    provider: string
  ): Promise<Result<BankConnection | null, BaseError>>;

  /**
   * Find all connections for a user
   */
  findByUserId(userId: string): Promise<Result<BankConnection[], BaseError>>;

  /**
   * Find connections by status
   */
  findByStatus(status: ConnectionStatus): Promise<Result<BankConnection[], BaseError>>;

  /**
   * Find active connections (for background sync)
   */
  findActiveConnections(): Promise<Result<BankConnection[], BaseError>>;

  /**
   * Save (create or update) connection
   */
  save(connection: BankConnection): Promise<Result<BankConnection, BaseError>>;

  /**
   * Delete connection
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Count connections by user
   */
  countByUser(userId: string): Promise<Result<number, BaseError>>;
}
