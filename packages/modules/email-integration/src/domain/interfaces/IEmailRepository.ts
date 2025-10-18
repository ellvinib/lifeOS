import { Result } from '@lifeOS/core/shared/result/Result';
import { BaseError } from '@lifeOS/core/shared/errors/BaseError';
import { Email } from '../entities/Email';

/**
 * Email Repository Interface
 *
 * Repository pattern for Email entity data access.
 * Following Domain-Driven Design principles.
 *
 * Design Principles:
 * - Pure interface - no implementation details
 * - Result<T, E> for functional error handling
 * - Domain entities, not database models
 * - All methods are async (database I/O)
 *
 * Implementation Notes:
 * - Implementations must handle Prisma ↔ Domain mapping
 * - All errors wrapped in Result type
 * - Transaction support via Unit of Work pattern
 */
export interface IEmailRepository {
  /**
   * Find email by ID
   * @param id - Email ID (UUID)
   * @returns Email entity or NotFoundError
   */
  findById(id: string): Promise<Result<Email, BaseError>>;

  /**
   * Find email by provider message ID
   * Useful for checking if email already synced
   * @param accountId - Account ID
   * @param providerMessageId - Provider's message ID
   * @returns Email entity or NotFoundError
   */
  findByProviderMessageId(
    accountId: string,
    providerMessageId: string
  ): Promise<Result<Email, BaseError>>;

  /**
   * Find all emails for a specific account
   * @param accountId - Account ID
   * @param options - Query options (pagination, sorting)
   * @returns Array of emails (empty if none found)
   */
  findByAccount(
    accountId: string,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: 'timestamp' | 'createdAt';
      order?: 'asc' | 'desc';
      since?: Date; // Only emails after this timestamp
    }
  ): Promise<Result<Email[], BaseError>>;

  /**
   * Search emails by filters
   * @param accountId - Account ID
   * @param filters - Search filters
   * @returns Array of matching emails
   */
  searchByFilters(
    accountId: string,
    filters: {
      from?: string; // Email address or domain
      subject?: string; // Keyword in subject
      hasAttachments?: boolean;
      labels?: string[];
      since?: Date;
      until?: Date;
    },
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Result<Email[], BaseError>>;

  /**
   * Create new email record
   * @param email - Email entity to create
   * @returns Created email or DatabaseError
   */
  create(email: Email): Promise<Result<Email, BaseError>>;

  /**
   * Batch create multiple emails (for sync operations)
   * More efficient than individual creates
   * @param emails - Array of email entities
   * @returns Created emails or DatabaseError
   */
  createMany(emails: Email[]): Promise<Result<Email[], BaseError>>;

  /**
   * Update existing email
   * Note: Email metadata is usually immutable
   * This is mainly for updating labels or flags
   * @param email - Email entity to update
   * @returns Updated email or NotFoundError/DatabaseError
   */
  update(email: Email): Promise<Result<Email, BaseError>>;

  /**
   * Delete email by ID
   * @param id - Email ID
   * @returns Success or NotFoundError/DatabaseError
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Delete all emails for an account
   * Used when disconnecting account
   * @param accountId - Account ID
   * @returns Number of deleted emails
   */
  deleteByAccount(accountId: string): Promise<Result<number, BaseError>>;

  /**
   * Count emails for an account
   * @param accountId - Account ID
   * @param filters - Optional filters (same as searchByFilters)
   * @returns Count of emails
   */
  count(
    accountId: string,
    filters?: {
      from?: string;
      subject?: string;
      hasAttachments?: boolean;
      labels?: string[];
      since?: Date;
      until?: Date;
    }
  ): Promise<Result<number, BaseError>>;

  /**
   * Check if email exists
   * @param accountId - Account ID
   * @param providerMessageId - Provider's message ID
   * @returns True if exists, false otherwise
   */
  exists(accountId: string, providerMessageId: string): Promise<Result<boolean, BaseError>>;
}
