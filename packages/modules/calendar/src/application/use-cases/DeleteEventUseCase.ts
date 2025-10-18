/**
 * Delete Calendar Event Use Case
 *
 * Deletes a calendar event and publishes domain event.
 *
 * Business Rules:
 * - Event must exist
 * - User must own the event
 * - Cannot delete synced events without disconnecting first
 *
 * Use Case Pattern:
 * 1. Fetch existing event
 * 2. Validate business rules
 * 3. Delete from repository
 * 4. Publish domain event
 *
 * @module Calendar Application
 */

import { Result } from '@lifeos/core/shared/result';
import { BaseError, BusinessRuleError } from '@lifeos/core/shared/errors';
import { IEventBus } from '@lifeos/core/events';
import { ICalendarEventRepository } from '../../domain/interfaces/ICalendarEventRepository';

/**
 * Delete Calendar Event Use Case
 */
export class DeleteEventUseCase {
  constructor(
    private readonly eventRepository: ICalendarEventRepository,
    private readonly eventBus: IEventBus
  ) {}

  async execute(eventId: string, userId: string): Promise<Result<void, BaseError>> {
    // Step 1: Fetch existing event
    const eventResult = await this.eventRepository.findById(eventId);
    if (eventResult.isFail()) {
      return Result.fail(eventResult.error);
    }

    const event = eventResult.value;

    // Step 2: Validate business rules
    // Security check: Ensure user owns the event
    if (event.userId !== userId) {
      return Result.fail(
        new BusinessRuleError(
          'Cannot delete event that does not belong to you',
          'EVENT_NOT_OWNED'
        )
      );
    }

    // Business rule: Warn about synced events (Phase 2 feature)
    if (event.calendarConnectionId && event.externalEventId) {
      return Result.fail(
        new BusinessRuleError(
          'Cannot delete synced event. Disconnect calendar first.',
          'EVENT_IS_SYNCED'
        )
      );
    }

    // Step 3: Delete from repository
    const deleteResult = await this.eventRepository.delete(eventId);
    if (deleteResult.isFail()) {
      return deleteResult;
    }

    // Step 4: Publish domain event
    await this.eventBus.publish({
      type: 'CalendarEventDeleted',
      source: 'calendar',
      payload: {
        eventId: event.id,
        userId,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
      },
      metadata: {
        userId,
        timestamp: new Date(),
      },
    });

    return Result.ok(undefined);
  }
}
