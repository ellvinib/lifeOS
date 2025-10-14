import type { Result } from '../../shared/result';
import type { BaseError } from '../../shared/errors';
import type { Task, TaskStatus, TaskPriority } from '../entities/Task';

/**
 * Query options for finding tasks
 */
export interface TaskQueryOptions {
  /**
   * Filter by module source
   */
  moduleSource?: string;

  /**
   * Filter by status
   */
  status?: TaskStatus;

  /**
   * Filter by priority
   */
  priority?: TaskPriority;

  /**
   * Filter by tags (task must have all specified tags)
   */
  tags?: string[];

  /**
   * Filter by due date range
   */
  dueDateFrom?: Date;
  dueDateTo?: Date;

  /**
   * Only get overdue tasks
   */
  overdue?: boolean;

  /**
   * Pagination
   */
  limit?: number;
  offset?: number;

  /**
   * Sorting
   */
  orderBy?: 'dueDate' | 'priority' | 'createdAt' | 'updatedAt';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Task repository interface.
 * Defines data access operations for Task entity.
 *
 * Following Repository Pattern:
 * - Pure interface (no implementation)
 * - Returns domain entities (not database models)
 * - Uses Result<T, E> for error handling
 * - No business logic (that belongs in use cases)
 *
 * Implementation will use ORM (Prisma) but that's hidden from domain layer.
 * This follows Dependency Inversion Principle - domain depends on abstraction.
 */
export interface ITaskRepository {
  /**
   * Find task by ID
   *
   * @param id - Task ID
   * @returns Result with Task or NotFoundError
   */
  findById(id: string): Promise<Result<Task, BaseError>>;

  /**
   * Find all tasks matching query
   *
   * @param options - Query options
   * @returns Result with array of Tasks
   */
  findMany(options?: TaskQueryOptions): Promise<Result<Task[], BaseError>>;

  /**
   * Find tasks by module source
   *
   * @param moduleSource - Module name
   * @returns Result with array of Tasks
   */
  findByModule(moduleSource: string): Promise<Result<Task[], BaseError>>;

  /**
   * Find overdue tasks
   *
   * @returns Result with array of overdue Tasks
   */
  findOverdue(): Promise<Result<Task[], BaseError>>;

  /**
   * Create a new task
   *
   * @param task - Task entity to create
   * @returns Result with created Task
   */
  create(task: Task): Promise<Result<Task, BaseError>>;

  /**
   * Update an existing task
   *
   * @param task - Task entity to update
   * @returns Result with updated Task
   */
  update(task: Task): Promise<Result<Task, BaseError>>;

  /**
   * Delete a task by ID
   *
   * @param id - Task ID
   * @returns Result with void or error
   */
  delete(id: string): Promise<Result<void, BaseError>>;

  /**
   * Check if task exists
   *
   * @param id - Task ID
   * @returns Result with boolean
   */
  exists(id: string): Promise<Result<boolean, BaseError>>;

  /**
   * Count tasks matching query
   *
   * @param options - Query options
   * @returns Result with count
   */
  count(options?: TaskQueryOptions): Promise<Result<number, BaseError>>;

  /**
   * Begin a transaction
   * Returns a new repository instance that uses the transaction
   */
  beginTransaction(): Promise<ITaskRepository>;

  /**
   * Commit transaction
   */
  commit(): Promise<Result<void, BaseError>>;

  /**
   * Rollback transaction
   */
  rollback(): Promise<Result<void, BaseError>>;
}
