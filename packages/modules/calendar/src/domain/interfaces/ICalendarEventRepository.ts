/**
 * Calendar Event Repository Interface
 *
 * Defines contract for persisting and retrieving calendar events.
 * All methods return Result types for explicit error handling.
 *
 * @module Calendar Domain
 */

import { Result } from '@lifeos/core/shared/result';
import { BaseError } from '@lifeos/core/shared/errors';
import { CalendarEvent } from '../entities/CalendarEvent';
import { TimeSlot } from '../value-objects/TimeSlot';

/**
 * Time range for querying events within a date range
 */
export interface TimeRange {
  readonly startDate: Date;
  readonly endDate: Date;
}

/**
 * Repository interface for calendar event persistence
 *
 * @interface ICalendarEventRepository
 */
export interface ICalendarEventRepository {
  /**
   * Find a single event by ID
   *
   * @param id - Unique event identifier
   * @returns Result containing CalendarEvent or NotFoundError
   */
  findById(id: string): Promise<Result<CalendarEvent, BaseError>>;

  /**
   * Find all events for a user within a time range
   *
   * @param userId - User identifier
   * @param timeRange - Start and end date range
   * @returns Result containing array of CalendarEvents
   */
  findByUserId(
    userId: string,
    timeRange: TimeRange
  ): Promise<Result<CalendarEvent[], BaseError>>;

  /**
   * Find events that conflict with a given time slot
   *
   * @param userId - User identifier
   * @param timeSlot - Time slot to check for conflicts
   * @returns Result containing array of conflicting CalendarEvents
   */
  findConflicts(
    userId: string,
    timeSlot: TimeSlot
  ): Promise<Result<CalendarEvent[], BaseError>>;

  /**
   * Find all flexible events that can be rearranged by AI
   *
   * @param userId - User identifier
   * @returns Result containing array of flexible CalendarEvents
   */
  findFlexibleEvents(userId: string): Promise<Result<CalendarEvent[], BaseError>>;

  /**
   * Find events by calendar connection (external provider)
   *
   * @param calendarConnectionId - Calendar connection identifier
   * @returns Result containing array of CalendarEvents
   */
  findByConnection(
    calendarConnectionId: string
  ): Promise<Result<CalendarEvent[], BaseError>>;

  /**
   * Find events that need syncing to external providers
   *
   * @param userId - User identifier
   * @returns Result containing array of CalendarEvents pending sync
   */
  findPendingSync(userId: string): Promise<Result<CalendarEvent[], BaseError>>;

  /**
   * Create a new calendar event
   *
   * @param event - CalendarEvent entity to persist
   * @returns Result containing persisted CalendarEvent
   */
  create(event: CalendarEvent): Promise<Result<CalendarEvent, BaseError>>;

  /**
   * Update an existing calendar event
   *
   * @param event - CalendarEvent entity with updated data
   * @returns Result containing updated CalendarEvent
   */
  update(event: CalendarEvent): Promise<Result<CalendarEvent, BaseError>>;

  /**
   * Delete a calendar event
   *
   * @param id - Unique event identifier
   * @returns Result indicating success or failure
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Bulk update multiple events (used by AI scheduling)
   *
   * @param events - Array of CalendarEvent entities to update
   * @returns Result containing array of updated CalendarEvents
   */
  bulkUpdate(events: CalendarEvent[]): Promise<Result<CalendarEvent[], BaseError>>;
}
