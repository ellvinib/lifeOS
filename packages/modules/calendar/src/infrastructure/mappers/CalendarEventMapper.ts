/**
 * Calendar Event Mapper
 *
 * Maps between Prisma CalendarEvent model and domain CalendarEvent entity.
 * Handles conversion of Prisma types to domain value objects.
 *
 * @module Calendar Infrastructure
 */

import { CalendarEvent as PrismaCalendarEvent } from '@prisma/client';
import { CalendarEvent } from '../../domain/entities/CalendarEvent';
import { TimeSlot, FlexibilityScore, Priority, EventCategory, SyncStatus } from '../../domain/value-objects';

/**
 * Mapper for CalendarEvent entity
 */
export class CalendarEventMapper {
  /**
   * Convert Prisma model to domain entity
   *
   * @param prismaEvent - Prisma CalendarEvent model
   * @returns Domain CalendarEvent entity
   */
  static toDomain(prismaEvent: PrismaCalendarEvent): CalendarEvent {
    return new CalendarEvent({
      id: prismaEvent.id,
      userId: prismaEvent.userId,
      calendarConnectionId: prismaEvent.calendarConnectionId || undefined,
      externalEventId: prismaEvent.externalEventId || undefined,
      title: prismaEvent.title,
      description: prismaEvent.description || undefined,
      location: prismaEvent.location || undefined,
      startTime: prismaEvent.startTime,
      endTime: prismaEvent.endTime,
      isAllDay: prismaEvent.isAllDay,
      timeZone: prismaEvent.timeZone,
      isFlexible: prismaEvent.isFlexible,
      flexibilityScore: new FlexibilityScore(prismaEvent.flexibilityScore),
      priority: prismaEvent.priority as Priority,
      category: prismaEvent.category as EventCategory,
      createdByModule: prismaEvent.createdByModule,
      attendees: prismaEvent.attendees,
      organizerEmail: prismaEvent.organizerEmail || undefined,
      isRecurring: prismaEvent.isRecurring,
      recurrenceRule: prismaEvent.recurrenceRule || undefined,
      recurrenceExceptions: prismaEvent.recurrenceExceptions,
      syncStatus: prismaEvent.syncStatus as SyncStatus,
      lastSyncedAt: prismaEvent.lastSyncedAt || undefined,
      syncError: prismaEvent.syncError || undefined,
      color: prismaEvent.color || undefined,
      tags: prismaEvent.tags,
      metadata: prismaEvent.metadata as Record<string, any>,
      createdAt: prismaEvent.createdAt,
      updatedAt: prismaEvent.updatedAt,
    });
  }

  /**
   * Convert domain entity to Prisma create input
   *
   * @param event - Domain CalendarEvent entity
   * @returns Prisma create input
   */
  static toPrismaCreate(event: CalendarEvent): any {
    return {
      id: event.id,
      userId: event.userId,
      calendarConnectionId: event.calendarConnectionId || null,
      externalEventId: event.externalEventId || null,
      title: event.title,
      description: event.description || null,
      location: event.location || null,
      startTime: event.startTime,
      endTime: event.endTime,
      isAllDay: event.isAllDay,
      timeZone: event.timeZone,
      isFlexible: event.isFlexible,
      flexibilityScore: event.flexibilityScore.value,
      priority: event.priority,
      category: event.category,
      createdByModule: event.createdByModule,
      attendees: event.attendees,
      organizerEmail: event.organizerEmail || null,
      isRecurring: event.isRecurring,
      recurrenceRule: event.recurrenceRule || null,
      recurrenceExceptions: event.recurrenceExceptions,
      syncStatus: event.syncStatus,
      lastSyncedAt: event.lastSyncedAt || null,
      syncError: event.syncError || null,
      color: event.color || null,
      tags: event.tags,
      metadata: event.metadata,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  /**
   * Convert domain entity to Prisma update input
   *
   * @param event - Domain CalendarEvent entity
   * @returns Prisma update input
   */
  static toPrismaUpdate(event: CalendarEvent): any {
    return {
      calendarConnectionId: event.calendarConnectionId || null,
      externalEventId: event.externalEventId || null,
      title: event.title,
      description: event.description || null,
      location: event.location || null,
      startTime: event.startTime,
      endTime: event.endTime,
      isAllDay: event.isAllDay,
      timeZone: event.timeZone,
      isFlexible: event.isFlexible,
      flexibilityScore: event.flexibilityScore.value,
      priority: event.priority,
      category: event.category,
      attendees: event.attendees,
      organizerEmail: event.organizerEmail || null,
      isRecurring: event.isRecurring,
      recurrenceRule: event.recurrenceRule || null,
      recurrenceExceptions: event.recurrenceExceptions,
      syncStatus: event.syncStatus,
      lastSyncedAt: event.lastSyncedAt || null,
      syncError: event.syncError || null,
      color: event.color || null,
      tags: event.tags,
      metadata: event.metadata,
      updatedAt: new Date(),
    };
  }
}
