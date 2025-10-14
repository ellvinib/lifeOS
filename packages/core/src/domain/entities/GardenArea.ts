/**
 * GardenArea entity
 *
 * Represents a specific area in the garden (e.g., front yard, vegetable patch, flower bed).
 *
 * Design principles:
 * - Rich domain model
 * - Self-validating
 * - Aggregates plant and maintenance information
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Garden area type.
 */
export enum GardenAreaType {
  LAWN = 'lawn',
  FLOWER_BED = 'flower_bed',
  VEGETABLE_PATCH = 'vegetable_patch',
  HERB_GARDEN = 'herb_garden',
  HEDGE = 'hedge',
  TREE_AREA = 'tree_area',
  PATIO = 'patio',
  PATHWAY = 'pathway',
  POND = 'pond',
  GREENHOUSE = 'greenhouse',
  COMPOST = 'compost',
  OTHER = 'other',
}

/**
 * Garden area properties.
 */
export interface GardenAreaProps {
  id?: string;
  name: string;
  type: GardenAreaType;
  description?: string;
  sizeSquareMeters?: number;
  location: string;
  soilType?: string;
  sunExposureHours?: number;
  irrigationSystem?: string;
  lastMaintained?: Date;
  maintenanceFrequencyDays?: number;
  isActive: boolean;
  notes?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * GardenArea entity.
 *
 * Encapsulates area-specific logic and maintenance tracking.
 */
export class GardenArea {
  private _id: string;
  private _name: string;
  private _type: GardenAreaType;
  private _description?: string;
  private _sizeSquareMeters?: number;
  private _location: string;
  private _soilType?: string;
  private _sunExposureHours?: number;
  private _irrigationSystem?: string;
  private _lastMaintained?: Date;
  private _maintenanceFrequencyDays?: number;
  private _isActive: boolean;
  private _notes?: string;
  private _imageUrl?: string;
  private _metadata?: Record<string, unknown>;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: GardenAreaProps) {
    this._id = props.id ?? uuidv4();
    this._name = props.name;
    this._type = props.type;
    this._description = props.description;
    this._sizeSquareMeters = props.sizeSquareMeters;
    this._location = props.location;
    this._soilType = props.soilType;
    this._sunExposureHours = props.sunExposureHours;
    this._irrigationSystem = props.irrigationSystem;
    this._lastMaintained = props.lastMaintained;
    this._maintenanceFrequencyDays = props.maintenanceFrequencyDays;
    this._isActive = props.isActive ?? true;
    this._notes = props.notes;
    this._imageUrl = props.imageUrl;
    this._metadata = props.metadata;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();

    this.validate();
  }

  // ========== Getters ==========

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get type(): GardenAreaType {
    return this._type;
  }

  get description(): string | undefined {
    return this._description;
  }

  get sizeSquareMeters(): number | undefined {
    return this._sizeSquareMeters;
  }

  get location(): string {
    return this._location;
  }

  get soilType(): string | undefined {
    return this._soilType;
  }

  get sunExposureHours(): number | undefined {
    return this._sunExposureHours;
  }

  get irrigationSystem(): string | undefined {
    return this._irrigationSystem;
  }

  get lastMaintained(): Date | undefined {
    return this._lastMaintained;
  }

  get maintenanceFrequencyDays(): number | undefined {
    return this._maintenanceFrequencyDays;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get notes(): string | undefined {
    return this._notes;
  }

  get imageUrl(): string | undefined {
    return this._imageUrl;
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
   * Record maintenance event.
   */
  recordMaintenance(date: Date = new Date()): void {
    this._lastMaintained = date;
    this._updatedAt = new Date();
  }

  /**
   * Check if area needs maintenance based on frequency.
   */
  needsMaintenance(): boolean {
    if (!this._maintenanceFrequencyDays || !this._isActive) {
      return false;
    }

    if (!this._lastMaintained) {
      return true;
    }

    const now = new Date();
    const daysSinceMaintenance = Math.floor(
      (now.getTime() - this._lastMaintained.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceMaintenance >= this._maintenanceFrequencyDays;
  }

  /**
   * Check if area is overdue for maintenance (1.5x normal frequency).
   */
  isOverdueForMaintenance(): boolean {
    if (!this._maintenanceFrequencyDays || !this._isActive) {
      return false;
    }

    if (!this._lastMaintained) {
      return true;
    }

    const now = new Date();
    const daysSinceMaintenance = Math.floor(
      (now.getTime() - this._lastMaintained.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceMaintenance >= this._maintenanceFrequencyDays * 1.5;
  }

  /**
   * Calculate days until next maintenance.
   */
  daysUntilNextMaintenance(): number | null {
    if (!this._maintenanceFrequencyDays || !this._lastMaintained || !this._isActive) {
      return null;
    }

    const now = new Date();
    const daysSinceMaintenance = Math.floor(
      (now.getTime() - this._lastMaintained.getTime()) / (1000 * 60 * 60 * 24)
    );

    return Math.max(0, this._maintenanceFrequencyDays - daysSinceMaintenance);
  }

  /**
   * Deactivate area.
   */
  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  /**
   * Activate area.
   */
  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  /**
   * Update area properties.
   */
  update(props: Partial<GardenAreaProps>): void {
    if (props.name !== undefined) this._name = props.name;
    if (props.type !== undefined) this._type = props.type;
    if (props.description !== undefined) this._description = props.description;
    if (props.sizeSquareMeters !== undefined) this._sizeSquareMeters = props.sizeSquareMeters;
    if (props.location !== undefined) this._location = props.location;
    if (props.soilType !== undefined) this._soilType = props.soilType;
    if (props.sunExposureHours !== undefined) this._sunExposureHours = props.sunExposureHours;
    if (props.irrigationSystem !== undefined) this._irrigationSystem = props.irrigationSystem;
    if (props.maintenanceFrequencyDays !== undefined) {
      this._maintenanceFrequencyDays = props.maintenanceFrequencyDays;
    }
    if (props.notes !== undefined) this._notes = props.notes;
    if (props.imageUrl !== undefined) this._imageUrl = props.imageUrl;
    if (props.metadata !== undefined) this._metadata = props.metadata;

    this._updatedAt = new Date();
    this.validate();
  }

  /**
   * Validate area data.
   */
  private validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new Error('Garden area name is required');
    }

    if (this._name.length > 200) {
      throw new Error('Garden area name must not exceed 200 characters');
    }

    if (!this._location || this._location.trim().length === 0) {
      throw new Error('Garden area location is required');
    }

    if (this._sizeSquareMeters !== undefined && this._sizeSquareMeters < 0) {
      throw new Error('Size must be positive');
    }

    if (this._sunExposureHours !== undefined && (this._sunExposureHours < 0 || this._sunExposureHours > 24)) {
      throw new Error('Sun exposure hours must be between 0 and 24');
    }

    if (this._maintenanceFrequencyDays !== undefined && this._maintenanceFrequencyDays < 1) {
      throw new Error('Maintenance frequency must be at least 1 day');
    }
  }

  /**
   * Convert to plain object.
   */
  toObject(): GardenAreaProps {
    return {
      id: this._id,
      name: this._name,
      type: this._type,
      description: this._description,
      sizeSquareMeters: this._sizeSquareMeters,
      location: this._location,
      soilType: this._soilType,
      sunExposureHours: this._sunExposureHours,
      irrigationSystem: this._irrigationSystem,
      lastMaintained: this._lastMaintained,
      maintenanceFrequencyDays: this._maintenanceFrequencyDays,
      isActive: this._isActive,
      notes: this._notes,
      imageUrl: this._imageUrl,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
