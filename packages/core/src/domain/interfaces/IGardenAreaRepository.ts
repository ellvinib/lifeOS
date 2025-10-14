/**
 * GardenArea Repository Interface
 *
 * Domain layer contract for garden area data access.
 *
 * Design principles:
 * - Interface Segregation: Focused on GardenArea operations only
 * - Dependency Inversion: Domain defines contract, infrastructure implements
 * - Returns Result type: No exceptions thrown
 * - Pure abstraction: No implementation details
 */

import type { Result } from '../../shared/result/Result';
import type { BaseError } from '../../shared/errors/BaseError';
import type { GardenArea } from '../entities/GardenArea';
import type { GardenAreaType } from '../entities/GardenArea';

/**
 * Garden area query options for filtering and pagination.
 */
export interface GardenAreaQueryOptions {
  name?: string;
  type?: GardenAreaType;
  isActive?: boolean;
  needsMaintenance?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'type' | 'lastMaintained' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Garden area repository interface.
 *
 * All methods return Result<T, E> for explicit error handling.
 */
export interface IGardenAreaRepository {
  /**
   * Find garden area by ID.
   */
  findById(id: string): Promise<Result<GardenArea, BaseError>>;

  /**
   * Find multiple garden areas with optional filtering.
   */
  findMany(options?: GardenAreaQueryOptions): Promise<Result<GardenArea[], BaseError>>;

  /**
   * Find areas that need maintenance.
   */
  findNeedingMaintenance(): Promise<Result<GardenArea[], BaseError>>;

  /**
   * Find areas by type.
   */
  findByType(type: GardenAreaType): Promise<Result<GardenArea[], BaseError>>;

  /**
   * Count garden areas matching query options.
   */
  count(options?: GardenAreaQueryOptions): Promise<Result<number, BaseError>>;

  /**
   * Create new garden area.
   */
  create(area: GardenArea): Promise<Result<GardenArea, BaseError>>;

  /**
   * Update existing garden area.
   */
  update(area: GardenArea): Promise<Result<GardenArea, BaseError>>;

  /**
   * Delete garden area by ID.
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Check if garden area exists by ID.
   */
  exists(id: string): Promise<Result<boolean, BaseError>>;
}
