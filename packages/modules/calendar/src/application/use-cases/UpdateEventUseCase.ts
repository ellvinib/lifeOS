/**
 * Update Calendar Event Use Case
 *
 * Updates an existing calendar event and publishes domain event.
 *
 * Business Rules:
 * - Event must exist
 * - End time must be after start time
 * - Cannot move inflexible events if they have attendees
 * - Moving event checks for conflicts
 *
 * Use Case Pattern (6 steps):
 * 1. Validate input
 * 2. Fetch existing event
 * 3. Check if time changed & validate conflicts
 * 4. Update domain entity
 * 5. Persist to repository
 * 6. Publish domain event
 *
 * @module Calendar Application
 */

import { Result } from '@lifeos/core/shared/result';
import { BaseError, ValidationError, BusinessRuleError, NotFoundError } from '@lifeos/core/shared/errors';
import { IEventBus } from '@lifeos/core/events';
import { ICalendarEventRepository } from '../../domain/interfaces/ICalendarEventRepository';
import { CalendarEvent } from '../../domain/entities/CalendarEvent';
import { TimeSlot, Priority, EventCategory } from '../../domain/value-objects';

/**
 * Update Event Input
 */
export interface UpdateEventInput {
  title?: string;
  description?: string;
  location?: string;
  startTime?: Date;
  endTime?: Date;
  isAllDay?: boolean;
  priority?: Priority;
  category?: EventCategory;
  color?: string;
  tags?: string[];
}

/**
 * Update Calendar Event Use Case
 */
export class UpdateEventUseCase {
  constructor(
    private readonly eventRepository: ICalendarEventRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(
    eventId: string,
    input: UpdateEventInput,
    userId: string
  ): Promise<Result<CalendarEvent, BaseError>> {
    // Step 1: Validate input
    const validationResult = this.validateInput(input);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // Step 2: Fetch existing event
    const eventResult = await this.eventRepository.findById(eventId);
    if (eventResult.isFail()) {
      return eventResult;
    }

    const event = eventResult.value;

    // Security check: Ensure user owns the event
    if (event.userId !== userId) {
      return Result.fail(
        new BusinessRuleError(
          'Cannot update event that does not belong to you',
          'EVENT_NOT_OWNED'
        )
      );
    }

    // Step 3: Check if time changed & validate conflicts
    const timeChanged = input.startTime || input.endTime;
    if (timeChanged) {
      const newStartTime = input.startTime ?? event.startTime;
      const newEndTime = input.endTime ?? event.endTime;
      const newTimeSlot = new TimeSlot(newStartTime, newEndTime);

      // Check if event can be moved
      if (!event.canBeMovedTo(newTimeSlot)) {
        return Result.fail(
          new BusinessRuleError(
            'Event cannot be moved (inflexible or has attendees)',
            'EVENT_CANNOT_BE_MOVED'
          )
        );
      }

      // Check for conflicts (excluding current event)
      const conflictsResult = await this.eventRepository.findConflicts(
        userId,
        newTimeSlot
      );
      if (conflictsResult.isFail()) {
        return conflictsResult;
      }

      const conflicts = conflictsResult.value.filter((c) => c.id !== eventId);
      const hasHardConflicts = conflicts.some((c) => !c.isFlexible || !event.isFlexible);

      if (hasHardConflicts) {
        return Result.fail(
          new BusinessRuleError(
            'Updated time conflicts with existing non-flexible event',
            'EVENT_CONFLICT'
          )
        );
      }
    }

    // Step 4: Update domain entity
    try {
      if (input.title || input.description || input.location) {
        event.updateDetails(
          input.title ?? event.title,
          input.description ?? event.description,
          input.location ?? event.location
        );
      }

      if (timeChanged) {
        const newStartTime = input.startTime ?? event.startTime;
        const newEndTime = input.endTime ?? event.endTime;
        event.moveTo(new TimeSlot(newStartTime, newEndTime));
      }

      if (input.priority) event.priority = input.priority;
      if (input.category) event.category = input.category;
      if (input.color !== undefined) event.color = input.color;
      if (input.tags) event.tags = input.tags;
      if (input.isAllDay !== undefined) event.isAllDay = input.isAllDay;
    } catch (error: any) {
      return Result.fail(
        new BusinessRuleError(error.message, 'EVENT_UPDATE_FAILED')
      );
    }

    // Step 5: Persist to repository
    const updateResult = await this.eventRepository.update(event);
    if (updateResult.isFail()) {
      return updateResult;
    }

    // Step 6: Publish domain event
    await this.eventBus.publish({
      type: 'CalendarEventUpdated',
      source: 'calendar',
      payload: {
        eventId: event.id,
        userId,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        wasTimeMoved: timeChanged,
      },
      metadata: {
        userId,
        timestamp: new Date(),
      },
    });

    return Result.ok(updateResult.value);
  }

  /**
   * Validate input data
   */
  private validateInput(input: UpdateEventInput): Result<void, BaseError> {
    const errors: Array<{ field: string; message: string }> = [];

    if (input.title !== undefined && input.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title cannot be empty' });
    }

    if (input.title && input.title.length > 200) {
      errors.push({ field: 'title', message: 'Title must be less than 200 characters' });
    }

    if (input.description && input.description.length > 2000) {
      errors.push({ field: 'description', message: 'Description must be less than 2000 characters' });
    }

    if (input.startTime && input.endTime && input.endTime <= input.startTime) {
      errors.push({ field: 'endTime', message: 'End time must be after start time' });
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError('Invalid update input', errors));
    }

    return Result.ok(undefined);
  }
}
