import { Result } from '@lifeOS/core/shared/result';
import { BaseError } from '@lifeOS/core/shared/errors';
import { EmailAccount } from '../entities/EmailAccount';
import { EmailProvider } from '../value-objects/EmailProvider';

/**
 * Email Account Repository Interface
 *
 * Repository pattern for EmailAccount entity.
 * Abstracts data access layer from domain logic.
 *
 * All methods return Result<T, E> for functional error handling.
 */
export interface IEmailAccountRepository {
  /**
   * Find account by ID
   *
   * @param id - Account ID
   * @returns Result containing account or error
   */
  findById(id: string): Promise<Result<EmailAccount, BaseError>>;

  /**
   * Find account by email address
   *
   * @param email - Email address
   * @returns Result containing account or error
   */
  findByEmail(email: string): Promise<Result<EmailAccount, BaseError>>;

  /**
   * Find account by user ID and email
   *
   * @param userId - User ID
   * @param email - Email address
   * @returns Result containing account or error
   */
  findByUserAndEmail(
    userId: string,
    email: string
  ): Promise<Result<EmailAccount, BaseError>>;

  /**
   * Find account by Outlook subscription ID
   *
   * @param subscriptionId - Microsoft Graph subscription ID
   * @returns Result containing account or null if not found
   */
  findBySubscriptionId(subscriptionId: string): Promise<EmailAccount | null>;

  /**
   * Find all accounts for a user
   *
   * @param userId - User ID
   * @param filters - Optional filters (provider, isActive)
   * @returns Result containing array of accounts
   */
  findByUser(
    userId: string,
    filters?: {
      provider?: EmailProvider;
      isActive?: boolean;
    }
  ): Promise<Result<EmailAccount[], BaseError>>;

  /**
   * Find all active accounts
   *
   * @param filters - Optional filters
   * @returns Array of active accounts
   */
  findAllActive(filters?: {
    provider?: EmailProvider;
  }): Promise<EmailAccount[]>;

  /**
   * Create new email account
   *
   * @param account - Email account to create
   * @returns Result containing created account or error
   */
  create(account: EmailAccount): Promise<Result<EmailAccount, BaseError>>;

  /**
   * Update existing email account
   *
   * @param account - Email account to update
   * @returns Result containing updated account or error
   */
  update(account: EmailAccount): Promise<Result<EmailAccount, BaseError>>;

  /**
   * Delete email account
   *
   * @param id - Account ID
   * @returns Result containing success or error
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Check if user already has account with this email
   *
   * @param userId - User ID
   * @param email - Email address
   * @returns True if account exists
   */
  exists(userId: string, email: string): Promise<boolean>;
}
