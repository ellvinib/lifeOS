/**
 * Plant entity
 *
 * Represents a plant in the garden with its lifecycle and care requirements.
 *
 * Design principles:
 * - Rich domain model (business logic inside entity)
 * - Immutability for value objects
 * - Self-validating
 * - No database concerns
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Plant type enumeration.
 */
export enum PlantType {
  TREE = 'tree',
  SHRUB = 'shrub',
  PERENNIAL = 'perennial',
  ANNUAL = 'annual',
  VEGETABLE = 'vegetable',
  HERB = 'herb',
  GRASS = 'grass',
  BULB = 'bulb',
}

/**
 * Growth stage of the plant.
 */
export enum GrowthStage {
  SEED = 'seed',
  SEEDLING = 'seedling',
  VEGETATIVE = 'vegetative',
  FLOWERING = 'flowering',
  FRUITING = 'fruiting',
  MATURE = 'mature',
  DORMANT = 'dormant',
}

/**
 * Watering frequency.
 */
export enum WateringFrequency {
  DAILY = 'daily',
  EVERY_OTHER_DAY = 'every_other_day',
  TWICE_WEEKLY = 'twice_weekly',
  WEEKLY = 'weekly',
  BI_WEEKLY = 'bi_weekly',
  MONTHLY = 'monthly',
  SEASONAL = 'seasonal',
}

/**
 * Sun exposure requirements.
 */
export enum SunExposure {
  FULL_SUN = 'full_sun',
  PARTIAL_SUN = 'partial_sun',
  PARTIAL_SHADE = 'partial_shade',
  FULL_SHADE = 'full_shade',
}

/**
 * Plant entity properties.
 */
export interface PlantProps {
  id?: string;
  name: string;
  scientificName?: string;
  type: PlantType;
  variety?: string;
  location: string;
  areaId?: string;
  plantedDate: Date;
  growthStage: GrowthStage;
  sunExposure: SunExposure;
  wateringFrequency: WateringFrequency;
  lastWatered?: Date;
  lastFertilized?: Date;
  lastPruned?: Date;
  notes?: string;
  imageUrl?: string;
  isActive: boolean;
  harvestDate?: Date;
  expectedHarvestDate?: Date;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Plant entity.
 *
 * Encapsulates all plant-related business logic.
 */
export class Plant {
  private _id: string;
  private _name: string;
  private _scientificName?: string;
  private _type: PlantType;
  private _variety?: string;
  private _location: string;
  private _areaId?: string;
  private _plantedDate: Date;
  private _growthStage: GrowthStage;
  private _sunExposure: SunExposure;
  private _wateringFrequency: WateringFrequency;
  private _lastWatered?: Date;
  private _lastFertilized?: Date;
  private _lastPruned?: Date;
  private _notes?: string;
  private _imageUrl?: string;
  private _isActive: boolean;
  private _harvestDate?: Date;
  private _expectedHarvestDate?: Date;
  private _metadata?: Record<string, unknown>;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: PlantProps) {
    this._id = props.id ?? uuidv4();
    this._name = props.name;
    this._scientificName = props.scientificName;
    this._type = props.type;
    this._variety = props.variety;
    this._location = props.location;
    this._areaId = props.areaId;
    this._plantedDate = props.plantedDate;
    this._growthStage = props.growthStage;
    this._sunExposure = props.sunExposure;
    this._wateringFrequency = props.wateringFrequency;
    this._lastWatered = props.lastWatered;
    this._lastFertilized = props.lastFertilized;
    this._lastPruned = props.lastPruned;
    this._notes = props.notes;
    this._imageUrl = props.imageUrl;
    this._isActive = props.isActive ?? true;
    this._harvestDate = props.harvestDate;
    this._expectedHarvestDate = props.expectedHarvestDate;
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

  get scientificName(): string | undefined {
    return this._scientificName;
  }

  get type(): PlantType {
    return this._type;
  }

  get variety(): string | undefined {
    return this._variety;
  }

  get location(): string {
    return this._location;
  }

  get areaId(): string | undefined {
    return this._areaId;
  }

  get plantedDate(): Date {
    return this._plantedDate;
  }

  get growthStage(): GrowthStage {
    return this._growthStage;
  }

  get sunExposure(): SunExposure {
    return this._sunExposure;
  }

  get wateringFrequency(): WateringFrequency {
    return this._wateringFrequency;
  }

  get lastWatered(): Date | undefined {
    return this._lastWatered;
  }

  get lastFertilized(): Date | undefined {
    return this._lastFertilized;
  }

  get lastPruned(): Date | undefined {
    return this._lastPruned;
  }

  get notes(): string | undefined {
    return this._notes;
  }

  get imageUrl(): string | undefined {
    return this._imageUrl;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get harvestDate(): Date | undefined {
    return this._harvestDate;
  }

  get expectedHarvestDate(): Date | undefined {
    return this._expectedHarvestDate;
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

  get age(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this._plantedDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Days
  }

  // ========== Business Logic Methods ==========

  /**
   * Record watering event.
   */
  recordWatering(date: Date = new Date()): void {
    this._lastWatered = date;
    this._updatedAt = new Date();
  }

  /**
   * Record fertilizing event.
   */
  recordFertilizing(date: Date = new Date()): void {
    this._lastFertilized = date;
    this._updatedAt = new Date();
  }

  /**
   * Record pruning event.
   */
  recordPruning(date: Date = new Date()): void {
    this._lastPruned = date;
    this._updatedAt = new Date();
  }

  /**
   * Advance growth stage.
   */
  advanceGrowthStage(newStage: GrowthStage): void {
    this._growthStage = newStage;
    this._updatedAt = new Date();
  }

  /**
   * Record harvest.
   */
  recordHarvest(date: Date = new Date()): void {
    this._harvestDate = date;
    this._updatedAt = new Date();
  }

  /**
   * Mark plant as inactive (removed/died).
   */
  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  /**
   * Check if plant needs watering based on frequency.
   */
  needsWatering(): boolean {
    if (!this._lastWatered) return true;
    if (!this._isActive) return false;

    const now = new Date();
    const daysSinceWatered = Math.floor(
      (now.getTime() - this._lastWatered.getTime()) / (1000 * 60 * 60 * 24)
    );

    switch (this._wateringFrequency) {
      case WateringFrequency.DAILY:
        return daysSinceWatered >= 1;
      case WateringFrequency.EVERY_OTHER_DAY:
        return daysSinceWatered >= 2;
      case WateringFrequency.TWICE_WEEKLY:
        return daysSinceWatered >= 3;
      case WateringFrequency.WEEKLY:
        return daysSinceWatered >= 7;
      case WateringFrequency.BI_WEEKLY:
        return daysSinceWatered >= 14;
      case WateringFrequency.MONTHLY:
        return daysSinceWatered >= 30;
      case WateringFrequency.SEASONAL:
        return daysSinceWatered >= 90;
      default:
        return false;
    }
  }

  /**
   * Check if plant is overdue for watering (double the normal frequency).
   */
  isOverdueForWatering(): boolean {
    if (!this._lastWatered) return true;
    if (!this._isActive) return false;

    const now = new Date();
    const daysSinceWatered = Math.floor(
      (now.getTime() - this._lastWatered.getTime()) / (1000 * 60 * 60 * 24)
    );

    switch (this._wateringFrequency) {
      case WateringFrequency.DAILY:
        return daysSinceWatered >= 2;
      case WateringFrequency.EVERY_OTHER_DAY:
        return daysSinceWatered >= 4;
      case WateringFrequency.TWICE_WEEKLY:
        return daysSinceWatered >= 6;
      case WateringFrequency.WEEKLY:
        return daysSinceWatered >= 14;
      case WateringFrequency.BI_WEEKLY:
        return daysSinceWatered >= 28;
      case WateringFrequency.MONTHLY:
        return daysSinceWatered >= 60;
      default:
        return false;
    }
  }

  /**
   * Update plant properties.
   */
  update(props: Partial<PlantProps>): void {
    if (props.name !== undefined) this._name = props.name;
    if (props.scientificName !== undefined) this._scientificName = props.scientificName;
    if (props.type !== undefined) this._type = props.type;
    if (props.variety !== undefined) this._variety = props.variety;
    if (props.location !== undefined) this._location = props.location;
    if (props.areaId !== undefined) this._areaId = props.areaId;
    if (props.growthStage !== undefined) this._growthStage = props.growthStage;
    if (props.sunExposure !== undefined) this._sunExposure = props.sunExposure;
    if (props.wateringFrequency !== undefined) this._wateringFrequency = props.wateringFrequency;
    if (props.notes !== undefined) this._notes = props.notes;
    if (props.imageUrl !== undefined) this._imageUrl = props.imageUrl;
    if (props.expectedHarvestDate !== undefined) this._expectedHarvestDate = props.expectedHarvestDate;
    if (props.metadata !== undefined) this._metadata = props.metadata;

    this._updatedAt = new Date();
    this.validate();
  }

  /**
   * Validate plant data.
   */
  private validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new Error('Plant name is required');
    }

    if (this._name.length > 200) {
      throw new Error('Plant name must not exceed 200 characters');
    }

    if (!this._location || this._location.trim().length === 0) {
      throw new Error('Plant location is required');
    }
  }

  /**
   * Convert to plain object.
   */
  toObject(): PlantProps {
    return {
      id: this._id,
      name: this._name,
      scientificName: this._scientificName,
      type: this._type,
      variety: this._variety,
      location: this._location,
      areaId: this._areaId,
      plantedDate: this._plantedDate,
      growthStage: this._growthStage,
      sunExposure: this._sunExposure,
      wateringFrequency: this._wateringFrequency,
      lastWatered: this._lastWatered,
      lastFertilized: this._lastFertilized,
      lastPruned: this._lastPruned,
      notes: this._notes,
      imageUrl: this._imageUrl,
      isActive: this._isActive,
      harvestDate: this._harvestDate,
      expectedHarvestDate: this._expectedHarvestDate,
      metadata: this._metadata,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
