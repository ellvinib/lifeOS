/**
 * Calendar Event Repository Implementation
 *
 * Implements calendar event persistence using Prisma ORM.
 * All operations return Result<T, E> for functional error handling.
 *
 * @module Calendar Infrastructure
 */

import { PrismaClient } from '@prisma/client';
import { Result } from '@lifeos/core/shared/result';
import { BaseError, NotFoundError, DatabaseError } from '@lifeos/core/shared/errors';
import { ICalendarEventRepository, TimeRange } from '../../domain/interfaces/ICalendarEventRepository';
import { CalendarEvent } from '../../domain/entities/CalendarEvent';
import { TimeSlot } from '../../domain/value-objects/TimeSlot';
import { CalendarEventMapper } from '../mappers/CalendarEventMapper';

/**
 * Calendar Event Repository with Prisma
 *
 * Handles all database operations for calendar events.
 */
export class CalendarEventRepository implements ICalendarEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Find a single event by ID
   */
  async findById(id: string): Promise<Result<CalendarEvent, BaseError>> {
    try {
      const event = await this.prisma.calendarEvent.findUnique({
        where: { id },
      });

      if (!event) {
        return Result.fail(new NotFoundError('CalendarEvent', id));
      }

      return Result.ok(CalendarEventMapper.toDomain(event));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find calendar event', error));
    }
  }

  /**
   * Find all events for a user within a time range
   */
  async findByUserId(
    userId: string,
    timeRange: TimeRange
  ): Promise<Result<CalendarEvent[], BaseError>> {
    try {
      const events = await this.prisma.calendarEvent.findMany({
        where: {
          userId,
          startTime: {
            gte: timeRange.startDate,
            lte: timeRange.endDate,
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      return Result.ok(events.map(CalendarEventMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find events by user', error));
    }
  }

  /**
   * Find events that conflict with a given time slot
   */
  async findConflicts(
    userId: string,
    timeSlot: TimeSlot
  ): Promise<Result<CalendarEvent[], BaseError>> {
    try {
      // Find events that overlap with the time slot
      const events = await this.prisma.calendarEvent.findMany({
        where: {
          userId,
          AND: [
            {
              startTime: {
                lt: timeSlot.endTime,
              },
            },
            {
              endTime: {
                gt: timeSlot.startTime,
              },
            },
          ],
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      return Result.ok(events.map(CalendarEventMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find conflicting events', error));
    }
  }

  /**
   * Find all flexible events that can be rearranged by AI
   */
  async findFlexibleEvents(userId: string): Promise<Result<CalendarEvent[], BaseError>> {
    try {
      const events = await this.prisma.calendarEvent.findMany({
        where: {
          userId,
          isFlexible: true,
          flexibilityScore: {
            gt: 50, // Only events with flexibility score > 50
          },
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      return Result.ok(events.map(CalendarEventMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find flexible events', error));
    }
  }

  /**
   * Find events by calendar connection (external provider)
   */
  async findByConnection(
    calendarConnectionId: string
  ): Promise<Result<CalendarEvent[], BaseError>> {
    try {
      const events = await this.prisma.calendarEvent.findMany({
        where: {
          calendarConnectionId,
        },
        orderBy: {
          startTime: 'asc',
        },
      });

      return Result.ok(events.map(CalendarEventMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find events by connection', error));
    }
  }

  /**
   * Find events that need syncing to external providers
   */
  async findPendingSync(userId: string): Promise<Result<CalendarEvent[], BaseError>> {
    try {
      const events = await this.prisma.calendarEvent.findMany({
        where: {
          userId,
          calendarConnectionId: {
            not: null,
          },
          syncStatus: 'idle',
        },
        orderBy: {
          updatedAt: 'asc',
        },
      });

      return Result.ok(events.map(CalendarEventMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to find pending sync events', error));
    }
  }

  /**
   * Create a new calendar event
   */
  async create(event: CalendarEvent): Promise<Result<CalendarEvent, BaseError>> {
    try {
      const prismaEvent = await this.prisma.calendarEvent.create({
        data: CalendarEventMapper.toPrismaCreate(event),
      });

      return Result.ok(CalendarEventMapper.toDomain(prismaEvent));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to create calendar event', error));
    }
  }

  /**
   * Update an existing calendar event
   */
  async update(event: CalendarEvent): Promise<Result<CalendarEvent, BaseError>> {
    try {
      const prismaEvent = await this.prisma.calendarEvent.update({
        where: { id: event.id },
        data: CalendarEventMapper.toPrismaUpdate(event),
      });

      return Result.ok(CalendarEventMapper.toDomain(prismaEvent));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to update calendar event', error));
    }
  }

  /**
   * Delete a calendar event
   */
  async delete(id: string): Promise<Result<void, BaseError>> {
    try {
      await this.prisma.calendarEvent.delete({
        where: { id },
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to delete calendar event', error));
    }
  }

  /**
   * Bulk update multiple events (used by AI scheduling)
   */
  async bulkUpdate(events: CalendarEvent[]): Promise<Result<CalendarEvent[], BaseError>> {
    try {
      // Use transaction to ensure all updates succeed or fail together
      const updatedEvents = await this.prisma.$transaction(
        events.map((event) =>
          this.prisma.calendarEvent.update({
            where: { id: event.id },
            data: CalendarEventMapper.toPrismaUpdate(event),
          })
        )
      );

      return Result.ok(updatedEvents.map(CalendarEventMapper.toDomain));
    } catch (error) {
      return Result.fail(new DatabaseError('Failed to bulk update events', error));
    }
  }
}
