/**
 * GardenTask entity
 *
 * Represents a garden maintenance task with garden-specific properties.
 *
 * Design principles:
 * - Rich domain model
 * - Extends general Task concept with garden-specific logic
 * - Self-validating
 */

import { v4 as uuidv4 } from 'uuid';
import { TaskStatus, TaskPriority } from './Task';

/**
 * Garden task type.
 */
export enum GardenTaskType {
  MOWING = 'mowing',
  WATERING = 'watering',
  FERTILIZING = 'fertilizing',
  PRUNING = 'pruning',
  WEEDING = 'weeding',
  PLANTING = 'planting',
  HARVESTING = 'harvesting',
  PEST_CONTROL = 'pest_control',
  MULCHING = 'mulching',
  HEDGE_TRIMMING = 'hedge_trimming',
  LEAF_REMOVAL = 'leaf_removal',
  WINTERIZING = 'winterizing',
  COMPOSTING = 'composting',
  SOIL_PREPARATION = 'soil_preparation',
  OTHER = 'other',
}

/**
 * Season enumeration.
 */
export enum Season {
  SPRING = 'spring',
  SUMMER = 'summer',
  FALL = 'fall',
  WINTER = 'winter',
}

/**
 * Weather dependency.
 */
export enum WeatherDependency {
  NONE = 'none',
  DRY_WEATHER = 'dry_weather',
  WET_WEATHER = 'wet_weather',
  MILD_TEMPERATURE = 'mild_temperature',
  NO_FROST = 'no_frost',
}

/**
 * GardenTask properties.
 */
export interface GardenTaskProps {
  id?: string;
  title: string;
  description?: string;
  type: GardenTaskType;
  status: TaskStatus;
  priority: TaskPriority;
  areaId?: string;
  plantIds?: string[];
  estimatedDurationMinutes?: number;
  weatherDependency: WeatherDependency;
  idealSeasons?: Season[];
  dueDate?: Date;
  scheduledDate?: Date;
  completedDate?: Date;
  notes?: string;
  tools?: string[];
  materials?: string[];
  cost?: number;
  isRecurring: boolean;
  recurrenceIntervalDays?: number;
  nextRecurrenceDate?: Date;
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * GardenTask entity.
 *
 * Encapsulates garden task business logic.
 */
export class GardenTask {
  private _id: string;
  private _title: string;
  private _description?: string;
  private _type: GardenTaskType;
  private _status: TaskStatus;
  private _priority: TaskPriority;
  private _areaId?: string;
  private _plantIds?: string[];
  private _estimatedDurationMinutes?: number;
  private _weatherDependency: WeatherDependency;
  private _idealSeasons?: Season[];
  private _dueDate?: Date;
  private _scheduledDate?: Date;
  private _completedDate?: Date;
  private _notes?: string;
  private _tools?: string[];
  private _materials?: string[];
  private _cost?: number;
  private _isRecurring: boolean;
  private _recurrenceIntervalDays?: number;
  private _nextRecurrenceDate?: Date;
  private _tags?: string[];
  private _metadata?: Record<string, unknown>;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: GardenTaskProps) {
    this._id = props.id ?? uuidv4();
    this._title = props.title;
    this._description = props.description;
    this._type = props.type;
    this._status = props.status;
    this._priority = props.priority;
    this._areaId = props.areaId;
    this._plantIds = props.plantIds;
    this._estimatedDurationMinutes = props.estimatedDurationMinutes;
    this._weatherDependency = props.weatherDependency;
    this._idealSeasons = props.idealSeasons;
    this._dueDate = props.dueDate;
    this._scheduledDate = props.scheduledDate;
    this._completedDate = props.completedDate;
    this._notes = props.notes;
    this._tools = props.tools;
    this._materials = props.materials;
    this._cost = props.cost;
    this._isRecurring = props.isRecurring ?? false;
    this._recurrenceIntervalDays = props.recurrenceIntervalDays;
    this._nextRecurrenceDate = props.nextRecurrenceDate;
    this._tags = props.tags ?? [];
    this._metadata = props.metadata;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();

    this.validate();
  }

  // ========== Getters ==========

  get id(): string {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  get description(): string | undefined {
    return this._description;
  }

  get type(): GardenTaskType {
    return this._type;
  }

  get status(): TaskStatus {
    return this._status;
  }

  get priority(): TaskPriority {
    return this._priority;
  }

  get areaId(): string | undefined {
    return this._areaId;
  }

  get plantIds(): string[] | undefined {
    return this._plantIds;
  }

  get estimatedDurationMinutes(): number | undefined {
    return this._estimatedDurationMinutes;
  }

  get weatherDependency(): WeatherDependency {
    return this._weatherDependency;
  }

  get idealSeasons(): Season[] | undefined {
    return this._idealSeasons;
  }

  get dueDate(): Date | undefined {
    return this._dueDate;
  }

  get scheduledDate(): Date | undefined {
    return this._scheduledDate;
  }

  get completedDate(): Date | undefined {
    return this._completedDate;
  }

  get notes(): string | undefined {
    return this._notes;
  }

  get tools(): string[] | undefined {
    return this._tools;
  }

  get materials(): string[] | undefined {
    return this._materials;
  }

  get cost(): number | undefined {
    return this._cost;
  }

  get isRecurring(): boolean {
    return this._isRecurring;
  }

  get recurrenceIntervalDays(): number | undefined {
    return this._recurrenceIntervalDays;
  }

  get nextRecurrenceDate(): Date | undefined {
    return this._nextRecurrenceDate;
  }

  get tags(): string[] | undefined {
    return this._tags;
  }

  get metadata(): Record<string, unknown> | undefined {
    return this._metadata;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // ========== Business Logic Methods ==========

  /**
   * Mark task as completed.
   */
  complete(completedDate: Date = new Date()): void {
    this._status = TaskStatus.COMPLETED;
    this._completedDate = completedDate;
    this._updatedAt = new Date();

    // If recurring, schedule next occurrence
    if (this._isRecurring && this._recurrenceIntervalDays) {
      this.scheduleNextRecurrence();
    }
  }

  /**
   * Start task.
   */
  start(): void {
    this._status = TaskStatus.IN_PROGRESS;
    this._updatedAt = new Date();
  }

  /**
   * Cancel task.
   */
  cancel(): void {
    this._status = TaskStatus.CANCELLED;
    this._updatedAt = new Date();
  }

  /**
   * Schedule next recurrence.
   */
  private scheduleNextRecurrence(): void {
    if (!this._recurrenceIntervalDays) return;

    const baseDate = this._completedDate ?? new Date();
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + this._recurrenceIntervalDays);

    this._nextRecurrenceDate = nextDate;
  }

  /**
   * Check if task is overdue.
   */
  isOverdue(): boolean {
    if (!this._dueDate) return false;
    if (this._status === TaskStatus.COMPLETED || this._status === TaskStatus.CANCELLED) {
      return false;
    }
    return new Date() > this._dueDate;
  }

  /**
   * Check if current season is ideal for this task.
   */
  isIdealSeason(): boolean {
    if (!this._idealSeasons || this._idealSeasons.length === 0) {
      return true; // No season restriction
    }

    const currentSeason = this.getCurrentSeason();
    return this._idealSeasons.includes(currentSeason);
  }

  /**
   * Get current season based on month.
   */
  private getCurrentSeason(): Season {
    const month = new Date().getMonth();

    if (month >= 2 && month <= 4) return Season.SPRING;
    if (month >= 5 && month <= 7) return Season.SUMMER;
    if (month >= 8 && month <= 10) return Season.FALL;
    return Season.WINTER;
  }

  /**
   * Check if weather conditions are suitable.
   * This is a placeholder - in production, integrate with weather API.
   */
  hasIdealWeather(): boolean {
    // In production, check actual weather conditions via API
    // For now, return true
    return true;
  }

  /**
   * Reschedule task.
   */
  reschedule(newDate: Date): void {
    this._scheduledDate = newDate;
    this._updatedAt = new Date();
  }

  /**
   * Update task properties.
   */
  update(props: Partial<GardenTaskProps>): void {
    if (props.title !== undefined) this._title = props.title;
    if (props.description !== undefined) this._description = props.description;
    if (props.type !== undefined) this._type = props.type;
    if (props.status !== undefined) this._status = props.status;
    if (props.priority !== undefined) this._priority = props.priority;
    if (props.areaId !== undefined) this._areaId = props.areaId;
    if (props.plantIds !== undefined) this._plantIds = props.plantIds;
    if (props.estimatedDurationMinutes !== undefined) {
      this._estimatedDurationMinutes = props.estimatedDurationMinutes;
    }
    if (props.weatherDependency !== undefined) this._weatherDependency = props.weatherDependency;
    if (props.idealSeasons !== undefined) this._idealSeasons = props.idealSeasons;
    if (props.dueDate !== undefined) this._dueDate = props.dueDate;
    if (props.scheduledDate !== undefined) this._scheduledDate = props.scheduledDate;
    if (props.notes !== undefined) this._notes = props.notes;
    if (props.tools !== undefined) this._tools = props.tools;
    if (props.materials !== undefined) this._materials = props.materials;
    if (props.cost !== undefined) this._cost = props.cost;
    if (props.isRecurring !== undefined) this._isRecurring = props.isRecurring;
    if (props.recurrenceIntervalDays !== undefined) {
      this._recurrenceIntervalDays = props.recurrenceIntervalDays;
    }
    if (props.tags !== undefined) this._tags = props.tags;
    if (props.metadata !== undefined) this._metadata = props.metadata;

    this._updatedAt = new Date();
    this.validate();
  }

  /**
   * Validate task data.
   */
  private validate(): void {
    if (!this._title || this._title.trim().length === 0) {
      throw new Error('Garden task title is required');
    }

    if (this._title.length > 200) {
      throw new Error('Garden task title must not exceed 200 characters');
    }

    if (this._estimatedDurationMinutes !== undefined && this._estimatedDurationMinutes < 0) {
      throw new Error('Estimated duration must be positive');
    }

    if (this._cost !== undefined && this._cost < 0) {
      throw new Error('Cost must be positive');
    }

    if (this._isRecurring && !this._recurrenceIntervalDays) {
      throw new Error('Recurring tasks must have recurrence interval');
    }

    if (this._recurrenceIntervalDays !== undefined && this._recurrenceIntervalDays < 1) {
      throw new Error('Recurrence interval must be at least 1 day');
    }
  }

  /**
   * Convert to plain object.
   */
  toObject(): GardenTaskProps {
    return {
      id: this._id,
      title: this._title,
      description: this._description,
      type: this._type,
      status: this._status,
      priority: this._priority,
      areaId: this._areaId,
      plantIds: this._plantIds,
      estimatedDurationMinutes: this._estimatedDurationMinutes,
      weatherDependency: this._weatherDependency,
      idealSeasons: this._idealSeasons,
      dueDate: this._dueDate,
      scheduledDate: this._scheduledDate,
      completedDate: this._completedDate,
      notes: this._notes,
      tools: this._tools,
      materials: this._materials,
      cost: this._cost,
      isRecurring: this._isRecurring,
      recurrenceIntervalDays: this._recurrenceIntervalDays,
      nextRecurrenceDate: this._nextRecurrenceDate,
      tags: this._tags,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
