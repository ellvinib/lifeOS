/**
 * Scheduling Request Repository Interface
 *
 * Defines contract for persisting and retrieving scheduling requests
 * from other modules (Garden, Finance, etc.) that want to schedule events.
 *
 * @module Calendar Domain
 */

import { Result } from '@lifeos/core/shared/result';
import { BaseError } from '@lifeos/core/shared/errors';
import { SchedulingRequest } from '../entities/SchedulingRequest';
import { RequestStatus } from '../value-objects/CalendarEnums';

/**
 * Repository interface for scheduling request persistence
 *
 * @interface ISchedulingRequestRepository
 */
export interface ISchedulingRequestRepository {
  /**
   * Find a single request by ID
   *
   * @param id - Unique request identifier
   * @returns Result containing SchedulingRequest or NotFoundError
   */
  findById(id: string): Promise<Result<SchedulingRequest, BaseError>>;

  /**
   * Find all requests for a user
   *
   * @param userId - User identifier
   * @returns Result containing array of SchedulingRequests
   */
  findByUserId(userId: string): Promise<Result<SchedulingRequest[], BaseError>>;

  /**
   * Find pending requests awaiting scheduling
   *
   * @param userId - User identifier
   * @returns Result containing array of pending SchedulingRequests
   */
  findPending(userId: string): Promise<Result<SchedulingRequest[], BaseError>>;

  /**
   * Find requests by status
   *
   * @param userId - User identifier
   * @param status - Request status filter
   * @returns Result containing array of SchedulingRequests
   */
  findByStatus(
    userId: string,
    status: RequestStatus
  ): Promise<Result<SchedulingRequest[], BaseError>>;

  /**
   * Find requests by requesting module
   *
   * @param userId - User identifier
   * @param requestingModule - Module name (e.g., 'garden', 'finance')
   * @returns Result containing array of SchedulingRequests
   */
  findByModule(
    userId: string,
    requestingModule: string
  ): Promise<Result<SchedulingRequest[], BaseError>>;

  /**
   * Find requests that resulted in a specific scheduled event
   *
   * @param scheduledEventId - Calendar event identifier
   * @returns Result containing SchedulingRequest or NotFoundError
   */
  findByScheduledEvent(
    scheduledEventId: string
  ): Promise<Result<SchedulingRequest, BaseError>>;

  /**
   * Create a new scheduling request
   *
   * @param request - SchedulingRequest entity to persist
   * @returns Result containing persisted SchedulingRequest
   */
  create(request: SchedulingRequest): Promise<Result<SchedulingRequest, BaseError>>;

  /**
   * Update an existing scheduling request
   *
   * @param request - SchedulingRequest entity with updated data
   * @returns Result containing updated SchedulingRequest
   */
  update(request: SchedulingRequest): Promise<Result<SchedulingRequest, BaseError>>;

  /**
   * Delete a scheduling request
   *
   * @param id - Unique request identifier
   * @returns Result indicating success or failure
   */
  delete(id: string): Promise<Result<void, BaseError>>;
}
