import { v4 as uuidv4 } from 'uuid';

import type { RecurrencePattern } from '../value-objects/RecurrencePattern';

/**
 * Task status
 */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Task priority
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Universal task entity shared across all modules.
 * Following DDD principles - entity with identity.
 *
 * This is the core aggregate root that all modules extend.
 * Module-specific data is stored in the metadata field.
 */
export class Task {
  private _id: string;
  private _title: string;
  private _description: string;
  private _type: string;
  private _status: TaskStatus;
  private _priority: TaskPriority;
  private _dueDate?: Date;
  private _completedAt?: Date;
  private _recurrence?: RecurrencePattern;
  private _moduleSource: string;
  private _metadata: Record<string, unknown>;
  private _tags: string[];
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(params: {
    id?: string;
    title: string;
    description: string;
    type: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    dueDate?: Date;
    completedAt?: Date;
    recurrence?: RecurrencePattern;
    moduleSource: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    // Validate required fields
    if (!params.title || params.title.trim().length === 0) {
      throw new Error('Task title is required');
    }
    if (!params.moduleSource) {
      throw new Error('Module source is required');
    }

    this._id = params.id ?? uuidv4();
    this._title = params.title.trim();
    this._description = params.description;
    this._type = params.type;
    this._status = params.status ?? TaskStatus.PENDING;
    this._priority = params.priority ?? TaskPriority.MEDIUM;
    this._dueDate = params.dueDate;
    this._completedAt = params.completedAt;
    this._recurrence = params.recurrence;
    this._moduleSource = params.moduleSource;
    this._metadata = params.metadata ?? {};
    this._tags = params.tags ?? [];
    this._createdAt = params.createdAt ?? new Date();
    this._updatedAt = params.updatedAt ?? new Date();
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get title(): string {
    return this._title;
  }

  get description(): string {
    return this._description;
  }

  get type(): string {
    return this._type;
  }

  get status(): TaskStatus {
    return this._status;
  }

  get priority(): TaskPriority {
    return this._priority;
  }

  get dueDate(): Date | undefined {
    return this._dueDate;
  }

  get completedAt(): Date | undefined {
    return this._completedAt;
  }

  get recurrence(): RecurrencePattern | undefined {
    return this._recurrence;
  }

  get moduleSource(): string {
    return this._moduleSource;
  }

  get metadata(): Record<string, unknown> {
    return { ...this._metadata };
  }

  get tags(): string[] {
    return [...this._tags];
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  // Business logic methods

  /**
   * Update task title
   */
  updateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }
    this._title = title.trim();
    this.touch();
  }

  /**
   * Update task description
   */
  updateDescription(description: string): void {
    this._description = description;
    this.touch();
  }

  /**
   * Change task status
   */
  changeStatus(status: TaskStatus): void {
    this._status = status;
    if (status === TaskStatus.COMPLETED) {
      this._completedAt = new Date();
    }
    this.touch();
  }

  /**
   * Mark task as completed
   */
  complete(): void {
    this.changeStatus(TaskStatus.COMPLETED);
  }

  /**
   * Mark task as cancelled
   */
  cancel(): void {
    this.changeStatus(TaskStatus.CANCELLED);
  }

  /**
   * Start working on task
   */
  start(): void {
    if (this._status === TaskStatus.COMPLETED) {
      throw new Error('Cannot start a completed task');
    }
    this.changeStatus(TaskStatus.IN_PROGRESS);
  }

  /**
   * Change task priority
   */
  changePriority(priority: TaskPriority): void {
    this._priority = priority;
    this.touch();
  }

  /**
   * Set or update due date
   */
  setDueDate(dueDate: Date): void {
    this._dueDate = dueDate;
    this.touch();
  }

  /**
   * Add a tag
   */
  addTag(tag: string): void {
    const normalizedTag = tag.trim().toLowerCase();
    if (!this._tags.includes(normalizedTag)) {
      this._tags.push(normalizedTag);
      this.touch();
    }
  }

  /**
   * Remove a tag
   */
  removeTag(tag: string): void {
    const normalizedTag = tag.trim().toLowerCase();
    const index = this._tags.indexOf(normalizedTag);
    if (index !== -1) {
      this._tags.splice(index, 1);
      this.touch();
    }
  }

  /**
   * Update module-specific metadata
   */
  updateMetadata(metadata: Record<string, unknown>): void {
    this._metadata = { ...this._metadata, ...metadata };
    this.touch();
  }

  /**
   * Set recurrence pattern
   */
  setRecurrence(pattern: RecurrencePattern): void {
    this._recurrence = pattern;
    this.touch();
  }

  /**
   * Check if task is overdue
   */
  isOverdue(): boolean {
    if (!this._dueDate) return false;
    if (this._status === TaskStatus.COMPLETED) return false;
    return new Date() > this._dueDate;
  }

  /**
   * Check if task is due soon (within specified hours)
   */
  isDueSoon(hours: number = 24): boolean {
    if (!this._dueDate) return false;
    if (this._status === TaskStatus.COMPLETED) return false;

    const now = new Date();
    const soonThreshold = new Date(now.getTime() + hours * 60 * 60 * 1000);

    return this._dueDate <= soonThreshold && this._dueDate >= now;
  }

  /**
   * Check if task is recurring
   */
  isRecurring(): boolean {
    return this._recurrence !== undefined && this._recurrence.type !== 'once';
  }

  /**
   * Clone this task (useful for creating next occurrence)
   */
  clone(overrides?: Partial<Task>): Task {
    return new Task({
      title: this._title,
      description: this._description,
      type: this._type,
      status: TaskStatus.PENDING,
      priority: this._priority,
      dueDate: this._dueDate,
      recurrence: this._recurrence,
      moduleSource: this._moduleSource,
      metadata: { ...this._metadata },
      tags: [...this._tags],
      ...overrides,
    });
  }

  /**
   * Update the updatedAt timestamp
   */
  private touch(): void {
    this._updatedAt = new Date();
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      title: this._title,
      description: this._description,
      type: this._type,
      status: this._status,
      priority: this._priority,
      dueDate: this._dueDate?.toISOString(),
      completedAt: this._completedAt?.toISOString(),
      recurrence: this._recurrence?.toJSON(),
      moduleSource: this._moduleSource,
      metadata: this._metadata,
      tags: this._tags,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  /**
   * Create Task from plain object
   */
  static fromJSON(json: Record<string, unknown>): Task {
    return new Task({
      id: json.id as string,
      title: json.title as string,
      description: json.description as string,
      type: json.type as string,
      status: json.status as TaskStatus,
      priority: json.priority as TaskPriority,
      dueDate: json.dueDate ? new Date(json.dueDate as string) : undefined,
      completedAt: json.completedAt ? new Date(json.completedAt as string) : undefined,
      moduleSource: json.moduleSource as string,
      metadata: json.metadata as Record<string, unknown>,
      tags: json.tags as string[],
      createdAt: json.createdAt ? new Date(json.createdAt as string) : undefined,
      updatedAt: json.updatedAt ? new Date(json.updatedAt as string) : undefined,
    });
  }
}
