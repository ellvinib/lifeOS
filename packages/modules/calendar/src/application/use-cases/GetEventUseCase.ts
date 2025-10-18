/**
 * Get Calendar Event Use Case
 *
 * Retrieves a single calendar event by ID.
 *
 * Business Rules:
 * - Event must exist
 * - User must own the event (security)
 *
 * @module Calendar Application
 */

import { Result } from '@lifeos/core/shared/result';
import { BaseError, BusinessRuleError } from '@lifeos/core/shared/errors';
import { ICalendarEventRepository } from '../../domain/interfaces/ICalendarEventRepository';
import { CalendarEvent } from '../../domain/entities/CalendarEvent';

/**
 * Get Calendar Event Use Case
 */
export class GetEventUseCase {
  constructor(private readonly eventRepository: ICalendarEventRepository) {}

  async execute(eventId: string, userId: string): Promise<Result<CalendarEvent, BaseError>> {
    // Fetch event
    const eventResult = await this.eventRepository.findById(eventId);
    if (eventResult.isFail()) {
      return eventResult;
    }

    const event = eventResult.value;

    // Security check: Ensure user owns the event
    if (event.userId !== userId) {
      return Result.fail(
        new BusinessRuleError(
          'Cannot access event that does not belong to you',
          'EVENT_NOT_OWNED'
        )
      );
    }

    return Result.ok(event);
  }
}
