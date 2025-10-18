/**
 * Get Calendar Events Use Case
 *
 * Retrieves calendar events within a specified time range.
 *
 * Business Rules:
 * - Time range is required
 * - End date must be after start date
 * - Only returns events owned by the user
 *
 * @module Calendar Application
 */

import { Result } from '@lifeos/core/shared/result';
import { BaseError, ValidationError } from '@lifeos/core/shared/errors';
import { ICalendarEventRepository, TimeRange } from '../../domain/interfaces/ICalendarEventRepository';
import { CalendarEvent } from '../../domain/entities/CalendarEvent';

/**
 * Get Events Input
 */
export interface GetEventsInput {
  startDate: Date;
  endDate: Date;
}

/**
 * Get Calendar Events Use Case
 */
export class GetEventsUseCase {
  constructor(private readonly eventRepository: ICalendarEventRepository) {}

  async execute(
    input: GetEventsInput,
    userId: string
  ): Promise<Result<CalendarEvent[], BaseError>> {
    // Validate input
    const validationResult = this.validateInput(input);
    if (validationResult.isFail()) {
      return validationResult;
    }

    // Fetch events within time range
    const timeRange: TimeRange = {
      startDate: input.startDate,
      endDate: input.endDate,
    };

    return await this.eventRepository.findByUserId(userId, timeRange);
  }

  /**
   * Validate input data
   */
  private validateInput(input: GetEventsInput): Result<void, BaseError> {
    const errors: Array<{ field: string; message: string }> = [];

    if (!input.startDate) {
      errors.push({ field: 'startDate', message: 'Start date is required' });
    }

    if (!input.endDate) {
      errors.push({ field: 'endDate', message: 'End date is required' });
    }

    if (input.startDate && input.endDate && input.endDate <= input.startDate) {
      errors.push({ field: 'endDate', message: 'End date must be after start date' });
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError('Invalid date range', errors));
    }

    return Result.ok(undefined);
  }
}
