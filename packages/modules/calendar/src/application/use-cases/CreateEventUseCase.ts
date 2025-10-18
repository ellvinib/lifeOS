/**
 * Create Calendar Event Use Case
 *
 * Creates a new calendar event and publishes domain event.
 *
 * Business Rules:
 * - Title is required
 * - End time must be after start time
 * - Flexibility score must be 0-100
 * - Cannot create events in the past (for manually created events)
 * - Cannot create conflicting events unless both are flexible
 *
 * Use Case Pattern (6 steps):
 * 1. Validate input
 * 2. Check for conflicts
 * 3. Create domain entity
 * 4. Persist to repository
 * 5. Publish domain event
 * 6. Return result
 *
 * @module Calendar Application
 */

import { Result } from '@lifeos/core/shared/result';
import { BaseError, ValidationError, BusinessRuleError } from '@lifeos/core/shared/errors';
import { IEventBus } from '@lifeos/core/events';
import { ICalendarEventRepository } from '../../domain/interfaces/ICalendarEventRepository';
import { CalendarEvent } from '../../domain/entities/CalendarEvent';
import { FlexibilityScore, TimeSlot, Priority, EventCategory } from '../../domain/value-objects';

/**
 * Create Event Input
 */
export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  isAllDay?: boolean;
  timeZone?: string;
  isFlexible?: boolean;
  flexibilityScore?: number;
  priority: Priority;
  category: EventCategory;
  attendees?: string[];
  organizerEmail?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
  color?: string;
  tags?: string[];
}

/**
 * Create Calendar Event Use Case
 */
export class CreateEventUseCase {
  constructor(
    private readonly eventRepository: ICalendarEventRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(input: CreateEventInput, userId: string): Promise<Result<CalendarEvent, BaseError>> {
    // Step 1: Validate input
    const validationResult = this.validateInput(input);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // Additional business rule: Cannot create events in the past
    const now = new Date();
    if (input.startTime < now) {
      return Result.fail(
        new BusinessRuleError(
          'Cannot create events in the past',
          'EVENT_IN_PAST'
        )
      );
    }

    // Step 2: Check for conflicts
    const timeSlot = new TimeSlot(input.startTime, input.endTime);
    const conflictsResult = await this.eventRepository.findConflicts(userId, timeSlot);
    if (conflictsResult.isFail()) {
      return Result.fail(conflictsResult.error);
    }

    // Business rule: Cannot have conflicting events unless both are flexible
    const conflicts = conflictsResult.value;
    const hasHardConflicts = conflicts.some(
      (conflict) => !conflict.isFlexible || !(input.isFlexible ?? false)
    );

    if (hasHardConflicts) {
      return Result.fail(
        new BusinessRuleError(
          'Event conflicts with existing non-flexible event',
          'EVENT_CONFLICT'
        )
      );
    }

    // Step 3: Create domain entity
    let event: CalendarEvent;
    try {
      event = CalendarEvent.create({
        userId,
        title: input.title,
        description: input.description,
        location: input.location,
        startTime: input.startTime,
        endTime: input.endTime,
        isAllDay: input.isAllDay ?? false,
        timeZone: input.timeZone ?? 'UTC',
        isFlexible: input.isFlexible ?? false,
        flexibilityScore: input.flexibilityScore
          ? new FlexibilityScore(input.flexibilityScore)
          : FlexibilityScore.inflexible(),
        priority: input.priority,
        category: input.category,
        createdByModule: 'calendar',
        attendees: input.attendees ?? [],
        organizerEmail: input.organizerEmail,
        isRecurring: input.isRecurring ?? false,
        recurrenceRule: input.recurrenceRule,
        color: input.color,
        tags: input.tags ?? [],
      });
    } catch (error: any) {
      return Result.fail(
        new BusinessRuleError(error.message, 'EVENT_CREATION_FAILED')
      );
    }

    // Step 4: Persist to repository
    const createResult = await this.eventRepository.create(event);
    if (createResult.isFail()) {
      return createResult;
    }

    // Step 5: Publish domain event
    await this.eventBus.publish({
      type: 'CalendarEventCreated',
      source: 'calendar',
      payload: {
        eventId: event.id,
        userId,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        category: event.category,
        priority: event.priority,
        isFlexible: event.isFlexible,
      },
      metadata: {
        userId,
        timestamp: new Date(),
      },
    });

    // Step 6: Return result
    return Result.ok(createResult.value);
  }

  /**
   * Validate input data
   */
  private validateInput(input: CreateEventInput): Result<void, BaseError> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!input.title || input.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title is required' });
    }

    if (input.title && input.title.length > 200) {
      errors.push({ field: 'title', message: 'Title must be less than 200 characters' });
    }

    if (input.description && input.description.length > 2000) {
      errors.push({ field: 'description', message: 'Description must be less than 2000 characters' });
    }

    if (!input.startTime) {
      errors.push({ field: 'startTime', message: 'Start time is required' });
    }

    if (!input.endTime) {
      errors.push({ field: 'endTime', message: 'End time is required' });
    }

    if (input.startTime && input.endTime && input.endTime <= input.startTime) {
      errors.push({ field: 'endTime', message: 'End time must be after start time' });
    }

    if (input.flexibilityScore !== undefined && (input.flexibilityScore < 0 || input.flexibilityScore > 100)) {
      errors.push({ field: 'flexibilityScore', message: 'Flexibility score must be between 0 and 100' });
    }

    if (!input.priority) {
      errors.push({ field: 'priority', message: 'Priority is required' });
    }

    if (!input.category) {
      errors.push({ field: 'category', message: 'Category is required' });
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError('Invalid event input', errors));
    }

    return Result.ok(undefined);
  }
}
