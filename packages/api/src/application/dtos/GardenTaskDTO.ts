/**
 * GardenTask DTOs
 *
 * Data Transfer Objects for GardenTask API.
 *
 * Design principles:
 * - Separation: DTOs separate API contract from domain model
 * - Type-safe: Strong TypeScript typing
 * - Immutable: Readonly properties
 * - Documentation: Clear JSDoc comments
 */

/**
 * Garden task response DTO.
 * What the API returns to clients.
 */
export interface GardenTaskResponseDTO {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  priority: string;
  areaId?: string;
  plantIds?: string[];
  estimatedDurationMinutes?: number;
  weatherDependency: string;
  idealSeasons?: string[];
  dueDate?: string; // ISO 8601
  scheduledDate?: string; // ISO 8601
  completedDate?: string; // ISO 8601
  notes?: string;
  tools?: string[];
  materials?: string[];
  cost?: number;
  isRecurring: boolean;
  recurrenceIntervalDays?: number;
  nextRecurrenceDate?: string; // ISO 8601
  tags?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Create garden task request DTO.
 * What clients send when creating a task.
 */
export interface CreateGardenTaskRequestDTO {
  title: string;
  description?: string;
  type: string;
  priority?: string; // Default: 'medium'
  areaId?: string;
  plantIds?: string[];
  estimatedDurationMinutes?: number;
  weatherDependency?: string; // Default: 'none'
  idealSeasons?: string[];
  dueDate?: string; // ISO 8601
  scheduledDate?: string; // ISO 8601
  notes?: string;
  tools?: string[];
  materials?: string[];
  cost?: number;
  isRecurring?: boolean; // Default: false
  recurrenceIntervalDays?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Update garden task request DTO.
 * What clients send when updating a task.
 * All fields optional except those that should not be updatable.
 */
export interface UpdateGardenTaskRequestDTO {
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: string;
  areaId?: string;
  plantIds?: string[];
  estimatedDurationMinutes?: number;
  weatherDependency?: string;
  idealSeasons?: string[];
  dueDate?: string; // ISO 8601
  scheduledDate?: string; // ISO 8601
  completedDate?: string; // ISO 8601
  notes?: string;
  tools?: string[];
  materials?: string[];
  cost?: number;
  isRecurring?: boolean;
  recurrenceIntervalDays?: number;
  nextRecurrenceDate?: string; // ISO 8601
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Garden task query parameters.
 * What clients send when filtering tasks.
 */
export interface GardenTaskQueryRequestDTO {
  title?: string;
  type?: string;
  status?: string;
  priority?: string;
  areaId?: string;
  plantId?: string;
  weatherDependency?: string;
  idealSeason?: string;
  isRecurring?: boolean;
  isOverdue?: boolean;
  tags?: string[];
  dueDateFrom?: string; // ISO 8601
  dueDateTo?: string; // ISO 8601
  limit?: number;
  offset?: number;
  sortBy?: 'title' | 'dueDate' | 'priority' | 'createdAt' | 'scheduledDate';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Garden task list response DTO.
 * What the API returns for list queries.
 */
export interface GardenTaskListResponseDTO {
  data: GardenTaskResponseDTO[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
