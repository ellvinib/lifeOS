/**
 * SchedulingRequest Entity
 *
 * Represents a request from another module to schedule an event.
 *
 * @module Calendar
 */

import { FlexibilityScore } from '../value-objects/FlexibilityScore';
import { Priority, RequestStatus } from '../value-objects/CalendarEnums';

export interface SchedulingRequestProps {
  id: string;
  userId: string;
  requestingModule: string;
  title: string;
  description?: string;
  desiredStartTime?: Date;
  desiredEndTime?: Date;
  requiredDuration: number;
  flexibilityScore: FlexibilityScore;
  priority: Priority;
  status: RequestStatus;
  scheduledEventId?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SchedulingRequest {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _requestingModule: string;
  private _title: string;
  private _description?: string;
  private _desiredStartTime?: Date;
  private _desiredEndTime?: Date;
  private readonly _requiredDuration: number;
  private readonly _flexibilityScore: FlexibilityScore;
  private readonly _priority: Priority;
  private _status: RequestStatus;
  private _scheduledEventId?: string;
  private _rejectionReason?: string;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: SchedulingRequestProps) {
    if (!props.title || props.title.trim().length === 0) {
      throw new Error('Request title is required');
    }
    if (props.requiredDuration <= 0) {
      throw new Error('Required duration must be positive');
    }
    if (!props.requestingModule) {
      throw new Error('Requesting module is required');
    }

    this._id = props.id;
    this._userId = props.userId;
    this._requestingModule = props.requestingModule;
    this._title = props.title;
    this._description = props.description;
    this._desiredStartTime = props.desiredStartTime;
    this._desiredEndTime = props.desiredEndTime;
    this._requiredDuration = props.requiredDuration;
    this._flexibilityScore = props.flexibilityScore;
    this._priority = props.priority;
    this._status = props.status;
    this._scheduledEventId = props.scheduledEventId;
    this._rejectionReason = props.rejectionReason;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // Getters
  get id(): string { return this._id; }
  get userId(): string { return this._userId; }
  get requestingModule(): string { return this._requestingModule; }
  get title(): string { return this._title; }
  get description(): string | undefined { return this._description; }
  get desiredStartTime(): Date | undefined { return this._desiredStartTime; }
  get desiredEndTime(): Date | undefined { return this._desiredEndTime; }
  get requiredDuration(): number { return this._requiredDuration; }
  get flexibilityScore(): FlexibilityScore { return this._flexibilityScore; }
  get priority(): Priority { return this._priority; }
  get status(): RequestStatus { return this._status; }
  get scheduledEventId(): string | undefined { return this._scheduledEventId; }
  get rejectionReason(): string | undefined { return this._rejectionReason; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  /**
   * Business Logic Methods
   */

  isPending(): boolean {
    return this._status === RequestStatus.PENDING;
  }

  isScheduled(): boolean {
    return this._status === RequestStatus.SCHEDULED;
  }

  isRejected(): boolean {
    return this._status === RequestStatus.REJECTED;
  }

  approve(scheduledEventId: string): void {
    if (!this.isPending()) {
      throw new Error('Can only approve pending requests');
    }
    this._status = RequestStatus.SCHEDULED;
    this._scheduledEventId = scheduledEventId;
    this._updatedAt = new Date();
  }

  reject(reason: string): void {
    if (!this.isPending()) {
      throw new Error('Can only reject pending requests');
    }
    this._status = RequestStatus.REJECTED;
    this._rejectionReason = reason;
    this._updatedAt = new Date();
  }

  cancel(): void {
    if (this.isScheduled()) {
      throw new Error('Cannot cancel scheduled request - delete the event instead');
    }
    this._status = RequestStatus.CANCELLED;
    this._updatedAt = new Date();
  }

  hasTimePreference(): boolean {
    return !!this._desiredStartTime && !!this._desiredEndTime;
  }
}
