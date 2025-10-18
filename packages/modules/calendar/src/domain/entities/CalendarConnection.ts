/**
 * CalendarConnection Entity
 *
 * Represents a user's connection to an external calendar provider.
 *
 * @module Calendar
 */

import { CalendarProvider, SyncStatus } from '../value-objects/CalendarEnums';

export interface CalendarConnectionProps {
  id: string;
  userId: string;
  provider: CalendarProvider;
  externalCalendarId: string;
  encryptedCredentials: string;
  syncStatus: SyncStatus;
  lastSyncedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class CalendarConnection {
  private readonly _id: string;
  private readonly _userId: string;
  private readonly _provider: CalendarProvider;
  private _externalCalendarId: string;
  private _encryptedCredentials: string;
  private _syncStatus: SyncStatus;
  private _lastSyncedAt?: Date;
  private _isActive: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: CalendarConnectionProps) {
    if (!props.externalCalendarId) {
      throw new Error('External calendar ID is required');
    }
    if (!props.encryptedCredentials) {
      throw new Error('Encrypted credentials are required');
    }

    this._id = props.id;
    this._userId = props.userId;
    this._provider = props.provider;
    this._externalCalendarId = props.externalCalendarId;
    this._encryptedCredentials = props.encryptedCredentials;
    this._syncStatus = props.syncStatus;
    this._lastSyncedAt = props.lastSyncedAt;
    this._isActive = props.isActive;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // Getters
  get id(): string { return this._id; }
  get userId(): string { return this._userId; }
  get provider(): CalendarProvider { return this._provider; }
  get externalCalendarId(): string { return this._externalCalendarId; }
  get encryptedCredentials(): string { return this._encryptedCredentials; }
  get syncStatus(): SyncStatus { return this._syncStatus; }
  get lastSyncedAt(): Date | undefined { return this._lastSyncedAt; }
  get isActive(): boolean { return this._isActive; }
  get createdAt(): Date { return this._createdAt; }
  get updatedAt(): Date { return this._updatedAt; }

  /**
   * Business Logic Methods
   */

  connect(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  disconnect(): void {
    this._isActive = false;
    this._syncStatus = SyncStatus.IDLE;
    this._updatedAt = new Date();
  }

  startSync(): void {
    if (!this._isActive) {
      throw new Error('Cannot sync inactive connection');
    }
    this._syncStatus = SyncStatus.SYNCING;
    this._updatedAt = new Date();
  }

  completeSyn

c(): void {
    this._syncStatus = SyncStatus.COMPLETED;
    this._lastSyncedAt = new Date();
    this._updatedAt = new Date();
  }

  failSync(): void {
    this._syncStatus = SyncStatus.FAILED;
    this._updatedAt = new Date();
  }

  updateCredentials(encryptedCredentials: string): void {
    this._encryptedCredentials = encryptedCredentials;
    this._updatedAt = new Date();
  }

  isHealthy(): boolean {
    return this._isActive && this._syncStatus !== SyncStatus.FAILED;
  }

  needsSync(): boolean {
    if (!this._isActive) return false;
    if (this._syncStatus === SyncStatus.SYNCING) return false;
    if (!this._lastSyncedAt) return true;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return this._lastSyncedAt < fiveMinutesAgo;
  }
}
