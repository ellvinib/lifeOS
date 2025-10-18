/**
 * AdvertisingCampaign Entity
 *
 * Rich domain model for advertising campaigns with business logic.
 *
 * Design Principles:
 * - Rich domain model: Business logic lives in the entity
 * - Immutable ID: Cannot change after creation
 * - Encapsulation: Private fields with controlled access
 * - Self-validating: Validates state transitions
 * - No anemic model: Contains behavior, not just data
 *
 * @module Finance
 */

import { Platform, CampaignStatus } from '../value-objects/AdvertisingEnums';
import { ROIMetrics } from '../value-objects/ROIMetrics';

export interface AdvertisingCampaignProps {
  id: string;
  name: string;
  description?: string;
  platform: Platform;
  status: CampaignStatus;
  startDate: Date;
  endDate?: Date;
  totalBudget?: number;
  currency: string;
  targetAudience?: string;
  objectives: string[];
  tags: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Advertising Campaign aggregate root
 */
export class AdvertisingCampaign {
  private readonly _id: string;
  private _name: string;
  private _description?: string;
  private _platform: Platform;
  private _status: CampaignStatus;
  private _startDate: Date;
  private _endDate?: Date;
  private _totalBudget?: number;
  private _currency: string;
  private _targetAudience?: string;
  private _objectives: string[];
  private _tags: string[];
  private _metadata: Record<string, any>;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: AdvertisingCampaignProps) {
    // Validate required fields
    if (!props.id || props.id.trim().length === 0) {
      throw new Error('Campaign ID is required');
    }
    if (!props.name || props.name.trim().length === 0) {
      throw new Error('Campaign name is required');
    }
    if (!props.platform) {
      throw new Error('Platform is required');
    }
    if (!props.startDate) {
      throw new Error('Start date is required');
    }

    // Validate date logic
    if (props.endDate && props.endDate < props.startDate) {
      throw new Error('End date cannot be before start date');
    }

    // Validate budget
    if (props.totalBudget !== undefined && props.totalBudget < 0) {
      throw new Error('Budget cannot be negative');
    }

    this._id = props.id;
    this._name = props.name;
    this._description = props.description;
    this._platform = props.platform;
    this._status = props.status;
    this._startDate = props.startDate;
    this._endDate = props.endDate;
    this._totalBudget = props.totalBudget;
    this._currency = props.currency || 'EUR';
    this._targetAudience = props.targetAudience;
    this._objectives = props.objectives || [];
    this._tags = props.tags || [];
    this._metadata = props.metadata || {};
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get description(): string | undefined {
    return this._description;
  }

  get platform(): Platform {
    return this._platform;
  }

  get status(): CampaignStatus {
    return this._status;
  }

  get startDate(): Date {
    return this._startDate;
  }

  get endDate(): Date | undefined {
    return this._endDate;
  }

  get totalBudget(): number | undefined {
    return this._totalBudget;
  }

  get currency(): string {
    return this._currency;
  }

  get targetAudience(): string | undefined {
    return this._targetAudience;
  }

  get objectives(): string[] {
    return [...this._objectives]; // Return copy for immutability
  }

  get tags(): string[] {
    return [...this._tags]; // Return copy for immutability
  }

  get metadata(): Record<string, any> {
    return { ...this._metadata }; // Return copy for immutability
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Update campaign details
   */
  update(updates: Partial<{
    name: string;
    description: string;
    platform: Platform;
    startDate: Date;
    endDate: Date;
    totalBudget: number;
    targetAudience: string;
    objectives: string[];
    tags: string[];
  }>): void {
    if (updates.name !== undefined) {
      if (updates.name.trim().length === 0) {
        throw new Error('Campaign name cannot be empty');
      }
      this._name = updates.name;
    }

    if (updates.description !== undefined) {
      this._description = updates.description;
    }

    if (updates.platform !== undefined) {
      this._platform = updates.platform;
    }

    if (updates.startDate !== undefined) {
      if (this._endDate && updates.startDate > this._endDate) {
        throw new Error('Start date cannot be after end date');
      }
      this._startDate = updates.startDate;
    }

    if (updates.endDate !== undefined) {
      if (updates.endDate < this._startDate) {
        throw new Error('End date cannot be before start date');
      }
      this._endDate = updates.endDate;
    }

    if (updates.totalBudget !== undefined) {
      if (updates.totalBudget < 0) {
        throw new Error('Budget cannot be negative');
      }
      this._totalBudget = updates.totalBudget;
    }

    if (updates.targetAudience !== undefined) {
      this._targetAudience = updates.targetAudience;
    }

    if (updates.objectives !== undefined) {
      this._objectives = updates.objectives;
    }

    if (updates.tags !== undefined) {
      this._tags = updates.tags;
    }

    this._updatedAt = new Date();
  }

  /**
   * Start the campaign
   */
  start(): void {
    if (this._status !== CampaignStatus.DRAFT && this._status !== CampaignStatus.SCHEDULED) {
      throw new Error(`Cannot start campaign with status: ${this._status}`);
    }

    const now = new Date();
    if (this._startDate > now) {
      throw new Error('Cannot start campaign before start date');
    }

    this._status = CampaignStatus.ACTIVE;
    this._updatedAt = new Date();
  }

  /**
   * Pause the campaign
   */
  pause(): void {
    if (this._status !== CampaignStatus.ACTIVE) {
      throw new Error(`Cannot pause campaign with status: ${this._status}`);
    }

    this._status = CampaignStatus.PAUSED;
    this._updatedAt = new Date();
  }

  /**
   * Resume a paused campaign
   */
  resume(): void {
    if (this._status !== CampaignStatus.PAUSED) {
      throw new Error(`Cannot resume campaign with status: ${this._status}`);
    }

    this._status = CampaignStatus.ACTIVE;
    this._updatedAt = new Date();
  }

  /**
   * Complete the campaign
   */
  complete(): void {
    if (this._status === CampaignStatus.COMPLETED || this._status === CampaignStatus.CANCELLED) {
      throw new Error(`Campaign already ${this._status}`);
    }

    this._status = CampaignStatus.COMPLETED;
    this._endDate = this._endDate || new Date();
    this._updatedAt = new Date();
  }

  /**
   * Cancel the campaign
   */
  cancel(): void {
    if (this._status === CampaignStatus.COMPLETED) {
      throw new Error('Cannot cancel completed campaign');
    }
    if (this._status === CampaignStatus.CANCELLED) {
      throw new Error('Campaign already cancelled');
    }

    this._status = CampaignStatus.CANCELLED;
    this._updatedAt = new Date();
  }

  /**
   * Check if campaign is currently active
   */
  get isActive(): boolean {
    return this._status === CampaignStatus.ACTIVE;
  }

  /**
   * Check if campaign is completed
   */
  get isCompleted(): boolean {
    return this._status === CampaignStatus.COMPLETED;
  }

  /**
   * Check if campaign is running (active or paused)
   */
  get isRunning(): boolean {
    const now = new Date();
    return (
      (this._status === CampaignStatus.ACTIVE || this._status === CampaignStatus.PAUSED) &&
      this._startDate <= now &&
      (!this._endDate || this._endDate >= now)
    );
  }

  /**
   * Check if campaign has ended
   */
  get hasEnded(): boolean {
    if (!this._endDate) return false;
    return new Date() > this._endDate;
  }

  /**
   * Get campaign duration in days
   */
  get durationDays(): number | null {
    if (!this._endDate) return null;
    const diff = this._endDate.getTime() - this._startDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Get days remaining in campaign
   */
  get daysRemaining(): number | null {
    if (!this._endDate) return null;
    const now = new Date();
    if (now > this._endDate) return 0;
    const diff = this._endDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Get days elapsed since campaign start
   */
  get daysElapsed(): number {
    const now = new Date();
    const start = this._startDate > now ? now : this._startDate;
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if budget is set
   */
  get hasBudget(): boolean {
    return this._totalBudget !== undefined && this._totalBudget > 0;
  }

  /**
   * Add an objective
   */
  addObjective(objective: string): void {
    if (!objective || objective.trim().length === 0) {
      throw new Error('Objective cannot be empty');
    }
    if (this._objectives.includes(objective)) {
      throw new Error('Objective already exists');
    }
    this._objectives.push(objective);
    this._updatedAt = new Date();
  }

  /**
   * Remove an objective
   */
  removeObjective(objective: string): void {
    const index = this._objectives.indexOf(objective);
    if (index === -1) {
      throw new Error('Objective not found');
    }
    this._objectives.splice(index, 1);
    this._updatedAt = new Date();
  }

  /**
   * Add a tag
   */
  addTag(tag: string): void {
    if (!tag || tag.trim().length === 0) {
      throw new Error('Tag cannot be empty');
    }
    if (this._tags.includes(tag)) {
      return; // Silently ignore duplicate tags
    }
    this._tags.push(tag);
    this._updatedAt = new Date();
  }

  /**
   * Remove a tag
   */
  removeTag(tag: string): void {
    const index = this._tags.indexOf(tag);
    if (index !== -1) {
      this._tags.splice(index, 1);
      this._updatedAt = new Date();
    }
  }

  /**
   * Update metadata
   */
  updateMetadata(key: string, value: any): void {
    this._metadata[key] = value;
    this._updatedAt = new Date();
  }

  /**
   * Convert to plain object
   */
  toJSON(): AdvertisingCampaignProps {
    return {
      id: this._id,
      name: this._name,
      description: this._description,
      platform: this._platform,
      status: this._status,
      startDate: this._startDate,
      endDate: this._endDate,
      totalBudget: this._totalBudget,
      currency: this._currency,
      targetAudience: this._targetAudience,
      objectives: [...this._objectives],
      tags: [...this._tags],
      metadata: { ...this._metadata },
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
