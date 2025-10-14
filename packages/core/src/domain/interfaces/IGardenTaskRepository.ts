/**
 * GardenTask Repository Interface
 *
 * Domain layer contract for garden task data access.
 *
 * Design principles:
 * - Interface Segregation: Focused on GardenTask operations only
 * - Dependency Inversion: Domain defines contract, infrastructure implements
 * - Returns Result type: No exceptions thrown
 * - Pure abstraction: No implementation details
 */

import type { Result } from '../../shared/result/Result';
import type { BaseError } from '../../shared/errors/BaseError';
import type { GardenTask } from '../entities/GardenTask';
import type { GardenTaskType, Season, WeatherDependency } from '../entities/GardenTask';
import type { TaskStatus, TaskPriority } from '../entities/Task';

/**
 * Garden task query options for filtering and pagination.
 */
export interface GardenTaskQueryOptions {
  title?: string;
  type?: GardenTaskType;
  status?: TaskStatus;
  priority?: TaskPriority;
  areaId?: string;
  plantId?: string;
  weatherDependency?: WeatherDependency;
  idealSeason?: Season;
  isRecurring?: boolean;
  isOverdue?: boolean;
  tags?: string[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'title' | 'dueDate' | 'priority' | 'createdAt' | 'scheduledDate';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Garden task repository interface.
 *
 * All methods return Result<T, E> for explicit error handling.
 */
export interface IGardenTaskRepository {
  /**
   * Find garden task by ID.
   */
  findById(id: string): Promise<Result<GardenTask, BaseError>>;

  /**
   * Find multiple garden tasks with optional filtering.
   */
  findMany(options?: GardenTaskQueryOptions): Promise<Result<GardenTask[], BaseError>>;

  /**
   * Find tasks by garden area.
   */
  findByAreaId(areaId: string): Promise<Result<GardenTask[], BaseError>>;

  /**
   * Find tasks by plant.
   */
  findByPlantId(plantId: string): Promise<Result<GardenTask[], BaseError>>;

  /**
   * Find overdue tasks.
   */
  findOverdue(): Promise<Result<GardenTask[], BaseError>>;

  /**
   * Find tasks due soon (within X days).
   */
  findDueSoon(daysAhead: number): Promise<Result<GardenTask[], BaseError>>;

  /**
   * Find recurring tasks that need to be scheduled.
   */
  findRecurringTasksToSchedule(): Promise<Result<GardenTask[], BaseError>>;

  /**
   * Count garden tasks matching query options.
   */
  count(options?: GardenTaskQueryOptions): Promise<Result<number, BaseError>>;

  /**
   * Create new garden task.
   */
  create(task: GardenTask): Promise<Result<GardenTask, BaseError>>;

  /**
   * Update existing garden task.
   */
  update(task: GardenTask): Promise<Result<GardenTask, BaseError>>;

  /**
   * Delete garden task by ID.
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Check if garden task exists by ID.
   */
  exists(id: string): Promise<Result<boolean, BaseError>>;

  /**
   * Complete task and schedule next occurrence if recurring.
   */
  completeTask(id: string, completedDate?: Date): Promise<Result<GardenTask, BaseError>>;
}
