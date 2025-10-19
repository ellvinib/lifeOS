/**
 * CalendarEvent Entity
 *
 * Rich domain model for calendar events.
 * Represents a scheduled event with flexibility for AI rearrangement.
 *
 * @module Calendar
 */

import { randomUUID } from 'crypto';
import { TimeSlot } from '../value-objects/TimeSlot';
import { FlexibilityScore } from '../value-objects/FlexibilityScore';
import { EventCategory, Priority, SyncStatus } from '../value-objects/CalendarEnums';

export interface CalendarEventProps {
  id: string;
  userId: string;
  calendarConnectionId?: string;
  externalEventId?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  isAllDay: boolean;
  isFlexible: boolean;
  flexibilityScore: FlexibilityScore;
  priority: Priority;
  category: EventCategory;
  createdByModule: string;
  attendees: string[];
  metadata: Record<string, any>;
  syncStatus: SyncStatus;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class CalendarEvent {
  private readonly _id: string;
  private readonly _userId: string;
  private _calendarConnectionId?: string;
  private _externalEventId?: string;
  private _title: string;
  private _description?: string;
  private _location?: string;
  private _timeSlot: TimeSlot;
  private _timezone: string;
  private _isAllDay: boolean;
  private _isFlexible: boolean;
  private _flexibilityScore: FlexibilityScore;
  private _priority: Priority;
  private _category: EventCategory;
  private _createdByModule: string;
  private _attendees: string[];
  private _metadata: Record<string, any>;
  private _syncStatus: SyncStatus;
  private _lastSyncedAt?: Date;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: CalendarEventProps) {
    // Validation
    if (!props.title || props.title.trim().length === 0) {
      throw new Error('Event title is required');
    }
    if (props.endTime <= props.startTime) {
      throw new Error('End time must be after start time');
    }

    this._id = props.id;
    this._userId = props.userId;
    this._calendarConnectionId = props.calendarConnectionId;
    this._externalEventId = props.externalEventId;
    this._title = props.title;
    this._description = props.description;
    this._location = props.location;
    this._timeSlot = new TimeSlot(props.startTime, props.endTime);
    this._timezone = props.timezone;
    this._isAllDay = props.isAllDay;
    this._isFlexible = props.isFlexible;
    this._flexibilityScore = props.flexibilityScore;
    this._priority = props.priority;
    this._category = props.category;
    this._createdByModule = props.createdByModule;
    this._attendees = props.attendees || [];
    this._metadata = props.metadata || {};
    this._syncStatus = props.syncStatus;
    this._lastSyncedAt = props.lastSyncedAt;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Factory method to create a new CalendarEvent
   */
  static create(data: {
    userId: string;
    title: string;
    description?: string;
    location?: string;
    startTime: Date;
    endTime: Date;
    timeZone?: string;
    isAllDay?: boolean;
    isFlexible?: boolean;
    flexibilityScore?: FlexibilityScore;
    priority: Priority;
    category: EventCategory;
    createdByModule: string;
    attendees?: string[];
    organizerEmail?: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
    color?: string;
    tags?: string[];
  }): CalendarEvent {
    const now = new Date();

    // Build metadata from optional fields
    const metadata: Record<string, any> = {};
    if (data.organizerEmail) metadata.organizerEmail = data.organizerEmail;
    if (data.isRecurring) metadata.isRecurring = data.isRecurring;
    if (data.recurrenceRule) metadata.recurrenceRule = data.recurrenceRule;
    if (data.color) metadata.color = data.color;
    if (data.tags && data.tags.length > 0) metadata.tags = data.tags;

    return new CalendarEvent({
      id: randomUUID(),
      userId: data.userId,
      title: data.title,
      description: data.description,
      location: data.location,
      startTime: data.startTime,
      endTime: data.endTime,
      timezone: data.timeZone || 'UTC',
      isAllDay: data.isAllDay ?? false,
      isFlexible: data.isFlexible ?? false,
      flexibilityScore: data.flexibilityScore || FlexibilityScore.inflexible(),
      priority: data.priority,
      category: data.category,
      createdByModule: data.createdByModule,
      attendees: data.attendees || [],
      metadata,
      syncStatus: SyncStatus.IDLE,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Getters
  get id(): string { return this._id; }
  get userId(): string { return this._userId; }
  get calendarConnectionId(): string | undefined { return this._calendarConnectionId; }
  get externalEventId(): string | undefined { return this._externalEventId; }
  get title(): string { return this._title; }
  get description(): string | undefined { return this._description; }
  get location(): string | undefined { return this._location; }
  get startTime(): Date { return this._timeSlot.startTime; }
  get endTime(): Date { return this._timeSlot.endTime; }
  get timeSlot(): TimeSlot { return this._timeSlot; }
  get timezone(): string { return this._timezone; }
  get isAllDay(): boolean { return this._isAllDay; }
  get isFlexible(): boolean { return this._isFlexible; }
  get flexibilityScore(): FlexibilityScore { return this._flexibilityScore; }
  get priority(): Priority { return this._priority; }
  get category(): EventCategory { return this._category; }
  get createdByModule(): string { return this._createdByModule; }
  get attendees(): string[] { return [...this._attendees]; }
  get metadata(): Record<string, any> { return { ...this._metadata }; }
  get syncStatus(): SyncStatus { return this._syncStatus; }
  get lastSyncedAt(): Date | undefined { return this._lastSyncedAt; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  /**
   * Business Logic Methods
   */

  duration(): number {
    return this._timeSlot.duration();
  }

  conflictsWith(other: CalendarEvent): boolean {
    return this._timeSlot.overlaps(other._timeSlot);
  }

  canBeMovedTo(newSlot: TimeSlot): boolean {
    if (!this._isFlexible) return false;
    if (this.hasAttendees()) return false;
    if (this._priority === Priority.CRITICAL) return false;
    return this._flexibilityScore.canBeRearranged();
  }

  hasAttendees(): boolean {
    return this._attendees.length > 0;
  }

  isLocalOnly(): boolean {
    return !this._externalEventId;
  }

  isSynced(): boolean {
    return this._syncStatus === SyncStatus.COMPLETED;
  }

  moveTo(newSlot: TimeSlot): void {
    if (!this.canBeMovedTo(newSlot)) {
      throw new Error('Event cannot be moved');
    }
    this._timeSlot = newSlot;
    this._updatedAt = new Date();
    this._syncStatus = SyncStatus.IDLE;
  }

  updateDetails(updates: {
    title?: string;
    description?: string;
    location?: string;
  }): void {
    if (updates.title) this._title = updates.title;
    if (updates.description !== undefined) this._description = updates.description;
    if (updates.location !== undefined) this._location = updates.location;
    this._updatedAt = new Date();
    this._syncStatus = SyncStatus.IDLE;
  }

  markAsSynced(): void {
    this._syncStatus = SyncStatus.COMPLETED;
    this._lastSyncedAt = new Date();
  }

  markSyncFailed(): void {
    this._syncStatus = SyncStatus.FAILED;
  }
}
