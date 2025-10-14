/**
 * Plant Repository Interface
 *
 * Domain layer contract for plant data access.
 *
 * Design principles:
 * - Interface Segregation: Focused on Plant operations only
 * - Dependency Inversion: Domain defines contract, infrastructure implements
 * - Returns Result type: No exceptions thrown
 * - Pure abstraction: No implementation details
 */

import type { Result } from '../../shared/result/Result';
import type { BaseError } from '../../shared/errors/BaseError';
import type { Plant } from '../entities/Plant';
import type { PlantType, GrowthStage, WateringFrequency } from '../entities/Plant';

/**
 * Plant query options for filtering and pagination.
 */
export interface PlantQueryOptions {
  name?: string;
  type?: PlantType;
  areaId?: string;
  growthStage?: GrowthStage;
  wateringFrequency?: WateringFrequency;
  isActive?: boolean;
  needsWatering?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'plantedDate' | 'lastWatered' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Plant repository interface.
 *
 * All methods return Result<T, E> for explicit error handling.
 */
export interface IPlantRepository {
  /**
   * Find plant by ID.
   */
  findById(id: string): Promise<Result<Plant, BaseError>>;

  /**
   * Find multiple plants with optional filtering.
   */
  findMany(options?: PlantQueryOptions): Promise<Result<Plant[], BaseError>>;

  /**
   * Find plants by garden area.
   */
  findByAreaId(areaId: string): Promise<Result<Plant[], BaseError>>;

  /**
   * Find plants that need watering.
   */
  findNeedingWater(): Promise<Result<Plant[], BaseError>>;

  /**
   * Count plants matching query options.
   */
  count(options?: PlantQueryOptions): Promise<Result<number, BaseError>>;

  /**
   * Create new plant.
   */
  create(plant: Plant): Promise<Result<Plant, BaseError>>;

  /**
   * Update existing plant.
   */
  update(plant: Plant): Promise<Result<Plant, BaseError>>;

  /**
   * Delete plant by ID.
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Check if plant exists by ID.
   */
  exists(id: string): Promise<Result<boolean, BaseError>>;
}
