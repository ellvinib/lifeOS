/**
 * Data Transfer Objects (DTOs) for Task entity.
 *
 * DTOs are used for API communication (request/response).
 * They are NOT the same as domain entities.
 *
 * Benefits:
 * - Separate API contract from domain model
 * - Can evolve independently
 * - Hide internal implementation details
 * - Explicit about what data is sent/received
 *
 * Design principles:
 * - Plain objects (no methods)
 * - Serializable (JSON-friendly)
 * - Versioned (can have v1, v2, etc.)
 */

/**
 * Task response DTO.
 * What we send to clients.
 */
export interface TaskResponseDTO {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  dueDate: string | null; // ISO 8601 string
  completedAt: string | null;
  recurrence: RecurrenceDTO | null;
  moduleSource: string;
  metadata: Record<string, unknown>;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Recurrence pattern DTO.
 */
export interface RecurrenceDTO {
  type: string;
  interval: number;
  endDate: string | null;
  customRule: string | null;
  daysOfWeek: string[] | null;
}

/**
 * Create task request DTO.
 * What we receive from clients when creating a task.
 */
export interface CreateTaskRequestDTO {
  title: string;
  description?: string;
  type: string;
  status?: string;
  priority?: string;
  dueDate?: string; // ISO 8601 string
  recurrence?: RecurrenceDTO;
  moduleSource: string;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Update task request DTO.
 * What we receive from clients when updating a task.
 * All fields are optional (partial update).
 */
export interface UpdateTaskRequestDTO {
  title?: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  recurrence?: RecurrenceDTO | null;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Task query request DTO.
 * Parameters for filtering/sorting tasks.
 */
export interface TaskQueryRequestDTO {
  moduleSource?: string;
  status?: string;
  priority?: string;
  tags?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  overdue?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: 'dueDate' | 'priority' | 'createdAt' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Paginated task response.
 * For list endpoints.
 */
export interface TaskListResponseDTO {
  data: TaskResponseDTO[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}
