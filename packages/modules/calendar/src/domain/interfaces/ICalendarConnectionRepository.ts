/**
 * Calendar Connection Repository Interface
 *
 * Defines contract for persisting and retrieving calendar provider connections.
 * Manages OAuth credentials and sync status for external calendars.
 *
 * @module Calendar Domain
 */

import { Result } from '@lifeos/core/shared/result';
import { BaseError } from '@lifeos/core/shared/errors';
import { CalendarConnection } from '../entities/CalendarConnection';
import { CalendarProvider } from '../value-objects/CalendarEnums';

/**
 * Repository interface for calendar connection persistence
 *
 * @interface ICalendarConnectionRepository
 */
export interface ICalendarConnectionRepository {
  /**
   * Find a single connection by ID
   *
   * @param id - Unique connection identifier
   * @returns Result containing CalendarConnection or NotFoundError
   */
  findById(id: string): Promise<Result<CalendarConnection, BaseError>>;

  /**
   * Find all connections for a user
   *
   * @param userId - User identifier
   * @returns Result containing array of CalendarConnections
   */
  findByUserId(userId: string): Promise<Result<CalendarConnection[], BaseError>>;

  /**
   * Find all active connections for a user
   *
   * @param userId - User identifier
   * @returns Result containing array of active CalendarConnections
   */
  findActiveByUserId(userId: string): Promise<Result<CalendarConnection[], BaseError>>;

  /**
   * Find connections that need syncing
   *
   * @param userId - User identifier
   * @returns Result containing array of CalendarConnections pending sync
   */
  findNeedingSync(userId: string): Promise<Result<CalendarConnection[], BaseError>>;

  /**
   * Find connection by provider and external calendar ID
   *
   * @param userId - User identifier
   * @param provider - Calendar provider (Google, Outlook, iCloud)
   * @param externalCalendarId - External calendar identifier
   * @returns Result containing CalendarConnection or NotFoundError
   */
  findByExternalId(
    userId: string,
    provider: CalendarProvider,
    externalCalendarId: string
  ): Promise<Result<CalendarConnection, BaseError>>;

  /**
   * Check if user has a connection to a specific provider
   *
   * @param userId - User identifier
   * @param provider - Calendar provider to check
   * @returns Result containing boolean
   */
  hasProviderConnection(
    userId: string,
    provider: CalendarProvider
  ): Promise<Result<boolean, BaseError>>;

  /**
   * Create a new calendar connection
   *
   * @param connection - CalendarConnection entity to persist
   * @returns Result containing persisted CalendarConnection
   */
  create(connection: CalendarConnection): Promise<Result<CalendarConnection, BaseError>>;

  /**
   * Update an existing calendar connection
   *
   * @param connection - CalendarConnection entity with updated data
   * @returns Result containing updated CalendarConnection
   */
  update(connection: CalendarConnection): Promise<Result<CalendarConnection, BaseError>>;

  /**
   * Delete a calendar connection
   *
   * @param id - Unique connection identifier
   * @returns Result indicating success or failure
   */
  delete(id: string): Promise<Result<void, BaseError>>;
}
