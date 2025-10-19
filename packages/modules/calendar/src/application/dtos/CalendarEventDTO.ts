/**
 * Calendar Event DTOs
 *
 * Data Transfer Objects for calendar events API.
 * Converts between domain entities and API request/response formats.
 *
 * @module Calendar Application
 */

import { CalendarEvent } from '../../domain/entities/CalendarEvent';
import { Priority, EventCategory } from '../../domain/value-objects';

/**
 * Calendar Event Request DTO
 *
 * Used for creating and updating events via API
 */
export interface CalendarEventRequestDTO {
  title: string;
  description?: string;
  location?: string;
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
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
 * Calendar Event Response DTO
 *
 * Used for returning event data via API
 */
export interface CalendarEventResponseDTO {
  id: string;
  userId: string;
  calendarConnectionId?: string;
  externalEventId?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  isAllDay: boolean;
  timeZone: string;
  isFlexible: boolean;
  flexibilityScore: number;
  priority: Priority;
  category: EventCategory;
  createdByModule: string;
  attendees: string[];
  organizerEmail?: string;
  isRecurring: boolean;
  recurrenceRule?: string;
  recurrenceExceptions: string[]; // ISO 8601 dates
  syncStatus: string;
  lastSyncedAt?: string; // ISO 8601 format
  syncError?: string;
  color?: string;
  tags: string[];
  metadata: Record<string, any>;
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

/**
 * Calendar Event Update Request DTO
 */
export interface CalendarEventUpdateDTO {
  title?: string;
  description?: string;
  location?: string;
  startTime?: string; // ISO 8601 format
  endTime?: string; // ISO 8601 format
  isAllDay?: boolean;
  priority?: Priority;
  category?: EventCategory;
  color?: string;
  tags?: string[];
}

/**
 * Calendar Event Query Parameters
 */
export interface CalendarEventQueryDTO {
  startDate?: string; // ISO 8601 format
  endDate?: string; // ISO 8601 format
  category?: EventCategory;
  priority?: Priority;
  isFlexible?: boolean;
  createdByModule?: string;
  page?: number;
  limit?: number;
}

/**
 * Calendar Event DTO Mapper
 *
 * Maps between domain entities and DTOs
 */
export class CalendarEventDTOMapper {
  /**
   * Convert domain entity to response DTO
   */
  public static toResponseDTO(event: CalendarEvent): CalendarEventResponseDTO {
    const metadata = event.metadata || {};

    return {
      id: event.id,
      userId: event.userId,
      calendarConnectionId: event.calendarConnectionId,
      externalEventId: event.externalEventId,
      title: event.title,
      description: event.description,
      location: event.location,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      isAllDay: event.isAllDay,
      timeZone: event.timezone,
      isFlexible: event.isFlexible,
      flexibilityScore: event.flexibilityScore.value,
      priority: event.priority,
      category: event.category,
      createdByModule: event.createdByModule,
      attendees: event.attendees,
      organizerEmail: metadata.organizerEmail,
      isRecurring: metadata.isRecurring || false,
      recurrenceRule: metadata.recurrenceRule,
      recurrenceExceptions: metadata.recurrenceExceptions?.map((d: Date) => d.toISOString()) || [],
      syncStatus: event.syncStatus,
      lastSyncedAt: event.lastSyncedAt?.toISOString(),
      syncError: metadata.syncError,
      color: metadata.color,
      tags: metadata.tags || [],
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
    };
  }

  /**
   * Convert request DTO to use case input
   */
  public static fromRequestDTO(dto: CalendarEventRequestDTO) {
    return {
      title: dto.title,
      description: dto.description,
      location: dto.location,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      isAllDay: dto.isAllDay,
      timeZone: dto.timeZone,
      isFlexible: dto.isFlexible,
      flexibilityScore: dto.flexibilityScore,
      priority: dto.priority,
      category: dto.category,
      attendees: dto.attendees,
      organizerEmail: dto.organizerEmail,
      isRecurring: dto.isRecurring,
      recurrenceRule: dto.recurrenceRule,
      color: dto.color,
      tags: dto.tags,
    };
  }

  /**
   * Convert update DTO to use case input
   */
  public static fromUpdateDTO(dto: CalendarEventUpdateDTO) {
    return {
      title: dto.title,
      description: dto.description,
      location: dto.location,
      startTime: dto.startTime ? new Date(dto.startTime) : undefined,
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      isAllDay: dto.isAllDay,
      priority: dto.priority,
      category: dto.category,
      color: dto.color,
      tags: dto.tags,
    };
  }
}
