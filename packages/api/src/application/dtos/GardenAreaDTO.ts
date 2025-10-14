/**
 * GardenArea DTOs
 *
 * Data Transfer Objects for GardenArea API.
 *
 * Design principles:
 * - Separation: DTOs separate API contract from domain model
 * - Type-safe: Strong TypeScript typing
 * - Immutable: Readonly properties
 * - Documentation: Clear JSDoc comments
 */

/**
 * Garden area response DTO.
 * What the API returns to clients.
 */
export interface GardenAreaResponseDTO {
  id: string;
  name: string;
  type: string;
  description?: string;
  sizeSquareMeters?: number;
  location: string;
  soilType?: string;
  sunExposureHours?: number;
  irrigationSystem?: string;
  lastMaintained?: string; // ISO 8601
  maintenanceFrequencyDays?: number;
  isActive: boolean;
  notes?: string;
  imageUrl?: string;
  needsMaintenance: boolean; // Computed property
  daysUntilNextMaintenance?: number | null; // Computed property
  metadata?: Record<string, unknown>;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Create garden area request DTO.
 * What clients send when creating a garden area.
 */
export interface CreateGardenAreaRequestDTO {
  name: string;
  type: string;
  description?: string;
  sizeSquareMeters?: number;
  location: string;
  soilType?: string;
  sunExposureHours?: number;
  irrigationSystem?: string;
  maintenanceFrequencyDays?: number;
  notes?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Update garden area request DTO.
 * What clients send when updating a garden area.
 */
export interface UpdateGardenAreaRequestDTO {
  name?: string;
  type?: string;
  description?: string;
  sizeSquareMeters?: number;
  location?: string;
  soilType?: string;
  sunExposureHours?: number;
  irrigationSystem?: string;
  maintenanceFrequencyDays?: number;
  isActive?: boolean;
  notes?: string;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Garden area query parameters.
 * What clients send when filtering areas.
 */
export interface GardenAreaQueryRequestDTO {
  name?: string;
  type?: string;
  isActive?: boolean;
  needsMaintenance?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'name' | 'type' | 'lastMaintained' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Garden area list response DTO.
 * What the API returns for list queries.
 */
export interface GardenAreaListResponseDTO {
  data: GardenAreaResponseDTO[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

/**
 * Record maintenance action DTO.
 */
export interface RecordMaintenanceDTO {
  areaId: string;
  maintenedDate?: string; // ISO 8601, defaults to now
}
