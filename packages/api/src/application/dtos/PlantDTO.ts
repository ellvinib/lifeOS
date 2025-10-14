/**
 * Plant DTOs
 *
 * Data Transfer Objects for Plant API.
 *
 * Design principles:
 * - Separation: DTOs separate API contract from domain model
 * - Type-safe: Strong TypeScript typing
 * - Immutable: Readonly properties
 * - Documentation: Clear JSDoc comments
 */

/**
 * Plant response DTO.
 * What the API returns to clients.
 */
export interface PlantResponseDTO {
  id: string;
  name: string;
  scientificName?: string;
  type: string;
  variety?: string;
  location: string;
  areaId?: string;
  plantedDate: string; // ISO 8601
  growthStage: string;
  sunExposure: string;
  wateringFrequency: string;
  lastWatered?: string; // ISO 8601
  lastFertilized?: string; // ISO 8601
  lastPruned?: string; // ISO 8601
  notes?: string;
  imageUrl?: string;
  isActive: boolean;
  harvestDate?: string; // ISO 8601
  expectedHarvestDate?: string; // ISO 8601
  age: number; // Days since planted
  needsWatering: boolean; // Computed property
  metadata?: Record<string, unknown>;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Create plant request DTO.
 * What clients send when creating a plant.
 */
export interface CreatePlantRequestDTO {
  name: string;
  scientificName?: string;
  type: string;
  variety?: string;
  location: string;
  areaId?: string;
  plantedDate?: string; // ISO 8601, defaults to now
  growthStage?: string; // Default: 'seed'
  sunExposure: string;
  wateringFrequency: string;
  expectedHarvestDate?: string; // ISO 8601
  notes?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Update plant request DTO.
 * What clients send when updating a plant.
 */
export interface UpdatePlantRequestDTO {
  name?: string;
  scientificName?: string;
  type?: string;
  variety?: string;
  location?: string;
  areaId?: string;
  growthStage?: string;
  sunExposure?: string;
  wateringFrequency?: string;
  expectedHarvestDate?: string; // ISO 8601
  notes?: string;
  imageUrl?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Plant query parameters.
 * What clients send when filtering plants.
 */
export interface PlantQueryRequestDTO {
  name?: string;
  type?: string;
  areaId?: string;
  growthStage?: string;
  wateringFrequency?: string;
  isActive?: boolean;
  needsWatering?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'plantedDate' | 'lastWatered' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Plant list response DTO.
 * What the API returns for list queries.
 */
export interface PlantListResponseDTO {
  data: PlantResponseDTO[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Record watering action DTO.
 */
export interface RecordWateringDTO {
  plantId: string;
  wateredDate?: string; // ISO 8601, defaults to now
}

/**
 * Record fertilizing action DTO.
 */
export interface RecordFertilizingDTO {
  plantId: string;
  fertilizedDate?: string; // ISO 8601, defaults to now
}

/**
 * Record pruning action DTO.
 */
export interface RecordPruningDTO {
  plantId: string;
  prunedDate?: string; // ISO 8601, defaults to now
}

/**
 * Record harvest action DTO.
 */
export interface RecordHarvestDTO {
  plantId: string;
  harvestDate?: string; // ISO 8601, defaults to now
}
