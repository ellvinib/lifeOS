/**
 * Calendar Module Enumerations
 *
 * Type-safe enums for calendar domain.
 *
 * @module Calendar
 */

/**
 * Supported calendar providers
 */
export enum CalendarProvider {
  GOOGLE = 'google',
  OUTLOOK = 'outlook',
  ICLOUD = 'icloud'
}

/**
 * Event categories for classification
 */
export enum EventCategory {
  WORK = 'work',
  PERSONAL = 'personal',
  GARDEN_TASK = 'garden_task',
  FINANCE_MEETING = 'finance_meeting',
  FOCUS_TIME = 'focus_time',
  BREAK = 'break',
  MEETING = 'meeting',
  APPOINTMENT = 'appointment'
}

/**
 * Event priority levels
 */
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Sync status for connections and events
 */
export enum SyncStatus {
  IDLE = 'idle',
  SYNCING = 'syncing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CONFLICT_DETECTED = 'conflict_detected',
  RESOLVING = 'resolving'
}

/**
 * Scheduling request status
 */
export enum RequestStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled'
}

/**
 * Conflict resolution strategies
 */
export enum ConflictResolution {
  KEEP_LOCAL = 'keep_local',
  KEEP_EXTERNAL = 'keep_external',
  KEEP_BOTH = 'keep_both',
  MANUAL = 'manual'
}
